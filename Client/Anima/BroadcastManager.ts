import CharacterManager from './CharacterManager.js';
import PromptManager from './PromptManager.js';
import FileManager from './FileManager.js';
import {GoogleGenAIController} from './GenAIController.js';
import EventBus from './EventBus.js';
import { DEBUG } from '../Anima.js';
import SKSEController, { GetPayload } from './SKSEController.js';
import FollowerManager from './FollowerManager.js';
import { BroadcastData, BroadcastSendQueue } from './BroadcastSendQueue.js';
import { NUM_MAX_CHARACTERS, CONV_LENGTH } from '../Anima.js'
import { logToLog } from './LogUtil.js';
import { AudioProcessor } from './AudioProcessor.js';

export default class BroadcastManager {
    private static playerInstance;
    private static n2nInstance;
    private characterManager : CharacterManager;
    private promptManager : PromptManager;
    private fileManager: FileManager;
    private skseController: SKSEController;
    private sendQueue: BroadcastSendQueue;
    public static MAX_SPEAKER_COUNT = 15;
    public names: Array<String>;
    private formIds: Array<String>;
    private voiceTypes: Array<String>;
    private distances: Array<Number>;
    public static currentLocation;
    public static currentDateTime;
    public static cellNames;
    private index: number = 0;
    private profile;
    private stop : boolean = true;
    public static paused;
    private connecting: boolean = false;
    public static N2N_SPEAKER;
    public static N2N_LISTENER;
    private anyResponse : boolean = false;
    private characters : Array<any> = [];
    private lock = { isLocked: false };

    constructor(playerName: string, socket: WebSocket, private audioProcessor: AudioProcessor) {
        this.characterManager = new CharacterManager();
        this.promptManager = new PromptManager();
        this.fileManager = new FileManager();
        this.profile = playerName;
        this.skseController = new SKSEController(socket);
        this.sendQueue = new BroadcastSendQueue();

        EventBus.GetSingleton().removeAllListeners('BROADCAST_STOP');
        EventBus.GetSingleton().on('BROADCAST_STOP', async (character) => {
            let i = this.FindCharacterIndexByName(character.name)
            if(i >= 0) {
                this.StopCharacter(i)
            }
        })

        EventBus.GetSingleton().removeAllListeners('BROADCAST_SAY');
        EventBus.GetSingleton().on("BROADCAST_SAY", async (message, speakerName, speakerFormId) => {
            this.Say(message, speakerName, speakerFormId)
        })

        // EventBus.GetSingleton().removeAllListeners('BROADCAST_CONTINUE');
        // EventBus.GetSingleton().on("BROADCAST_CONTINUE", async (character,listener, message) => {
        //     // console.log("SENDING CONTINUE => " + character.name + ", " + message)
        //     if(!this.stop) {
        //         await this.WaitUntilPauseEnds();
        //         let _character = this.FindCharacterByName(character.name)
        //         if(_character && _character.name) {
        //             await this.Send(_character, null, null, message, listener);
        //         }
        //     }
        // })

        EventBus.GetSingleton().removeAllListeners('FORCE_GREET_MESSAGE');
        EventBus.GetSingleton().on("FORCE_GREET_MESSAGE", (character, message) => {
            this.fileManager.SaveEventLog(character.id, character.formId, message, this.profile);
        })

        EventBus.GetSingleton().removeAllListeners('N2N_END');
        EventBus.GetSingleton().on('N2N_END', async () => {
            console.log("** BroadcastManager ** N2N_END")
            BroadcastManager.N2N_SPEAKER = null;
            BroadcastManager.N2N_LISTENER = null;
            let payload = GetPayload("end", "end", 0, 1, 0);
            this.skseController.Send(payload);
        })
    }

    static GetInstance(type: string, playerName?: string, socket?: WebSocket, audioProcessor?: AudioProcessor) {
        if(type == 'player') {
            if(!BroadcastManager.playerInstance && (!playerName || !socket)) {
                return
            }
            if(!BroadcastManager.playerInstance) BroadcastManager.playerInstance = new BroadcastManager(playerName, socket, audioProcessor)
            return BroadcastManager.playerInstance;
        } else if(type == 'n2n') {
            if(!BroadcastManager.n2nInstance && (!playerName || !socket)) {
                return
            }
            if(!BroadcastManager.n2nInstance) BroadcastManager.n2nInstance = new BroadcastManager(playerName, socket, audioProcessor)
            return BroadcastManager.n2nInstance;
        }
        
    }

    async SetCharacters(names, formIds, voiceTypes, distances, currentDateTime, currentLocation) {
        while (this.lock.isLocked) {
            await new Promise(resolve => setTimeout(resolve, 50));  // Wait and try again
        }
        this.lock.isLocked = true;
        try{
            this.names = [], this.formIds = [], this.voiceTypes = [], this.distances = [];
            for(var i in names) {
                if(voiceTypes[i]) {
                    this.names.push(names[i])
                    this.formIds.push(formIds[i])
                    this.voiceTypes.push(voiceTypes[i])
                    this.distances.push(distances[i])
                }
            }
            BroadcastManager.currentDateTime = currentDateTime;
            BroadcastManager.currentLocation = currentLocation;
        } finally {
            this.lock.isLocked = false;
        }
        if(!this.connecting) {
            await this.ConnectToCharacters()
        }
    }

    async ConnectToCharacters(log? : boolean, source?: string, target?: string) {
        while (this.lock.isLocked) {
            await new Promise(resolve => setTimeout(resolve, 50));  // Wait and try again
        }
        this.lock.isLocked = true;
        try {
            if(!this.names) return
            if(!this.names.includes(source)) {
                this.names.push(source)
            }
            if(!this.names.includes(target)) {
                this.names.push(target)
            }
            if(log) console.log(`** BroadcastManager ** Trying to connect to ${this.names.join(', ')}`);
            this.characters = []
            for(let i in this.names) {
                if(!this.names[i] || !this.profile || this.CheckName(this.names[i]) == this.CheckName(this.profile)) continue;
                if(this.CheckName(this.names[i]) == this.CheckName(this.profile)) continue;
                if(log) (console as any).logToLog(`Trying to connect to ${this.names[i]}`);
                let character = Object.assign({}, this.characterManager.GetCharacter(this.names[i]));
                if (!character) {
                    console.log(`** BroadcastManager ** ${this.names[i]} is not included in DATABASE`);
                    continue
                }
                character.stop = false;
                character.formId = this.formIds[i];
                character.voiceType = this.voiceTypes[i];
                character.distance = this.distances[i];
                character.voicePitch = character.voicePitch ? parseFloat(character.voicePitch) : 0;
                character.awaitingResponse = false;
                character.eventBuffer = this.fileManager.GetEvents(this.names[i], this.formIds[i], this.profile);
                character.thoughtBuffer = this.fileManager.GetThoughts(this.names[i], this.formIds[i], this.profile);
                character.googleController = new GoogleGenAIController(4, 1, character, character.voiceType,  parseInt(i), this.profile, this.skseController, this.audioProcessor);
                if(character.id && character.name) this.characters.push(character);
            }
            // logToLog("** BroadcastManager ** Connected to " + this.characters.map((c) => c.name).join(', '))
        } finally {
            this.lock.isLocked = false;
        }
    }

    AddCharacter(name : string, formId: string, voiceType: string, distance: number) {
        let existingCharacter = this.FindCharacterByName(name);
        if(existingCharacter && existingCharacter.stop) {
            existingCharacter.stop = false;
            return true;
        } else if(existingCharacter) {
            return true;
        } else {
            logToLog("** BroadcastManager ** Adding character " + name)
            let character = Object.assign({}, this.characterManager.GetCharacter(name));
            if(!character) return false;
            character.stop = false;
            character.formId = formId;
            character.voiceType = voiceType;
            character.distance = distance;
            character.voicePitch = character.voicePitch ? parseFloat(character.voicePitch) : 0;
            character.awaitingResponse = false;
            character.eventBuffer = this.fileManager.GetEvents(name, formId, this.profile);
            character.thoughtBuffer = this.fileManager.GetThoughts(name, formId, this.profile);
            character.googleController = new GoogleGenAIController(4, 1, character, character.voiceType,  this.characters.length, this.profile, this.skseController, this.audioProcessor);
            this.characters.push(character);
            return true;
        }
    }

    async Say(message: string, speakerName : string, speakerFormId: string) {
        if(!this.IsRunning()) {
            console.log("** BroadcastManager ** Not running.");
            return;
        }
        
        if(this.characters.length == 0) {
            this.skseController.Send(GetPayload("Nobody heard you.", "notification", 0, 1, 0, 0, ""))
            console.log("** BroadcastManager ** No characters found.");
            return false;
        }

        if(process.env.USING_NFF && speakerName == this.profile) {
            let followerManager = FollowerManager.GetInstance();
            if(followerManager) followerManager.SendFollowerCommand(message);
        }

        if(this.profile == speakerName) {
            BroadcastManager.N2N_SPEAKER = null;
            BroadcastManager.N2N_LISTENER = null;
        }

        let sentCount = 0
        this.anyResponse = false;
        console.log("** BroadcastManager ** Broadcasting ==> " + speakerName + ": \"" + message + "\"");
        if(BroadcastManager.N2N_SPEAKER && this.CheckName(BroadcastManager.N2N_SPEAKER.name) == this.CheckName(speakerName)) {
            sentCount = 2
            console.log("** BroadcastManager ** Broadcasting to " + BroadcastManager.N2N_LISTENER.name)
            this.sendQueue.addData(new BroadcastData(this.index, speakerName == this.profile ? 0 : 1, this.profile, this.characters,  BroadcastManager.N2N_LISTENER, speakerName, speakerFormId, message, "", BroadcastManager.currentLocation, Math.floor(Math.random() * CONV_LENGTH) == 0))
        } else if(BroadcastManager.N2N_LISTENER && this.CheckName(BroadcastManager.N2N_LISTENER.name) == this.CheckName(speakerName)) {
            console.log("** BroadcastManager ** Broadcasting to " + BroadcastManager.N2N_SPEAKER.name)
            this.sendQueue.addData(new BroadcastData(this.index, speakerName == this.profile ? 0 : 1, this.profile, this.characters, BroadcastManager.N2N_SPEAKER, speakerName, speakerFormId, message, "", BroadcastManager.currentLocation, Math.floor(Math.random() * CONV_LENGTH) == 0))
            sentCount = 2
        } else if(BroadcastManager.N2N_SPEAKER && BroadcastManager.N2N_LISTENER){
            console.log("** BroadcastManager ** Broadcasting to " + BroadcastManager.N2N_LISTENER.name)
            console.log("** BroadcastManager ** Broadcasting to " + BroadcastManager.N2N_SPEAKER.name)
            this.sendQueue.addData(new BroadcastData(this.index, speakerName == this.profile ? 0 : 1, this.profile, this.characters, BroadcastManager.N2N_LISTENER, speakerName, speakerFormId, message, "", BroadcastManager.currentLocation, Math.floor(Math.random() * CONV_LENGTH) == 0))
            this.sendQueue.addData(new BroadcastData(this.index, speakerName == this.profile ? 0 : 1, this.profile, this.characters, BroadcastManager.N2N_SPEAKER, speakerName, speakerFormId, message, "", BroadcastManager.currentLocation, Math.floor(Math.random() * CONV_LENGTH) == 0))
            sentCount = 2
        } else {
            sentCount = 0
        }
        for(let i in this.characters) {
            if(sentCount >= NUM_MAX_CHARACTERS) break;
            if((BroadcastManager.N2N_SPEAKER && BroadcastManager.N2N_LISTENER) && (this.CheckName(this.characters[i].name) == this.CheckName(BroadcastManager.N2N_SPEAKER.name) || this.CheckName(this.characters[i].name) == this.CheckName(BroadcastManager.N2N_LISTENER.name))) continue;
            if(this.characters[i].name.toLowerCase() == speakerName.toLowerCase()) continue;
            if(this.characters[i].stop) {
                console.log(`** BroadcastManager ** ${this.characters[i].name} stopped talking. Not sending to him/her.`)
                continue
            }
            console.log("** BroadcastManager ** Broadcasting to " + this.characters[i].name)
            this.sendQueue.addData(new BroadcastData(this.index, speakerName == this.profile ? 0 : 1, this.profile, this.characters, this.characters[i], speakerName, speakerFormId, message, "", BroadcastManager.currentLocation, Math.floor(Math.random() * CONV_LENGTH) == 0))
            sentCount++
        }     
        this.index++
        
        // setTimeout(() => {
        //     if(this.IsRunning() && this.characters.length > 0 && !this.anyResponse) {
        //         console.log("** BroadcastManager ** STOPPING DUE TO NO RESPONSE.")
        //         this.Stop()
        //     }
        // }, 120000)

        return true
    }

    async StartN2N(name : string, formId: string, listenerName: string, listenerFormId: string, location: string, currentDateTime: string) {
        console.log("** BroadcastManager ** Starting N2N between " + name + " and " + listenerName)
        this.characters.forEach((c) => {
            if(this.CheckName(c.name) == this.CheckName(name)) {
                BroadcastManager.N2N_SPEAKER = c
            }
        })
        this.characters.forEach((c) => {
            if(this.CheckName(c.name) == this.CheckName(listenerName)) {
                BroadcastManager.N2N_LISTENER = c
            }
        })
        if(!BroadcastManager.N2N_SPEAKER || !BroadcastManager.N2N_LISTENER) {
            console.log("** BroadcastManager ** Speaker or listener is null. Returning.")
            this.connecting = false;
            this.SendEndSignal()
            return false;
        }
        if(!BroadcastManager.N2N_SPEAKER.voiceType || !BroadcastManager.N2N_LISTENER.voiceType) {
            console.log("** BroadcastManager ** Voice type null. Returning.")
            this.connecting = false;
            this.SendEndSignal();
            return false;
        }

        const initMessage = "You are at " + location + ". It's " + currentDateTime + ". Please keep your answers short if possible.";
        // this.fileManager.SaveEventLog(BroadcastManager.N2N_SPEAKER.id, BroadcastManager.N2N_LISTENER.formId, initMessage, this.profile);

        let topics = await BroadcastManager.N2N_SPEAKER.googleController.SendTopicPrompt(this.profile, BroadcastManager.N2N_SPEAKER, BroadcastManager.N2N_LISTENER, location, this.fileManager.GetEvents(BroadcastManager.N2N_SPEAKER.id, BroadcastManager.N2N_SPEAKER.formId, this.profile))
        this.fileManager.SaveThoughts(BroadcastManager.N2N_SPEAKER.id, BroadcastManager.N2N_SPEAKER.formId, "\n" + topics + "\n", this.profile, true)
        this.connecting = false;
        this.sendQueue.addData(new BroadcastData(this.index, 2, this.profile, this.characters, BroadcastManager.N2N_SPEAKER, name, formId, "", topics, location, Math.floor(Math.random() * CONV_LENGTH) == 0))
        this.Run()
        
        return true;
    }

    async Stop(summarize=true) {
        while (this.lock.isLocked) {
            await new Promise(resolve => setTimeout(resolve, 50));  // Wait and try again
        }
        this.lock.isLocked = true;
        try {    
            this.connecting = false;
            this.stop = true;
            console.log("** BroadcastManager ** Finalizing conversation **.");
            for(let i in this.characters) {
                if(!this.characters[i] || !this.characters[i].id) continue;
                setTimeout(async () => {
                    this.characters[i].stop = true
                    this.StopCharacter(this.characters[i], summarize)
                    this.CheckExistingCharacters();
                }, 0)
            }
        } finally {
            this.lock.isLocked = false;
        }
    }

    SaveMessage(id: string, formId: string, message: string) { 
        this.fileManager.SaveEventLog(id, formId, message, this.profile);
    }

    SetConnecting(b: boolean) {
        this.connecting = b
    }

    async StopCharacter(index, summarize=true) {
        if(!this.characters[index]) return
        // const _events = await this.characters[index].googleController.SummarizeEvents(this.characters[index], this.fileManager.GetEvents(this.characters[index].id, this.characters[index].formId, this.profile));
        // this.fileManager.SaveEventLog(this.characters[index].id, this.characters[index].formId, _events, this.profile, false);
        this.characters[index].googleController.Stop();
        this.characters[index].stop = true;
        this.CheckExistingCharacters()
        console.log("** BroadcastManager ** " + this.characters[index].name + " left conversation.");
    }

    StopForCharacter(name) {
        let character = this.FindCharacterByName(name)
        if(!character) return
        this.StopCharacter(character)
    }

    CheckExistingCharacters() {
        var existingCharacters = this.characters.filter((c) => !c.stop)

        if(existingCharacters.length == 1) {
            this.StopCharacter(this.characters.findIndex((c) => !c.stop))
            EventBus.GetSingleton().emit('N2N_END')
        }
    }

    StopNonExistingCharacters(names) {
        for(let i in this.characters) {
            let found: boolean = false;
            for(let j in names) {
                if(this.characters[i].name && names[j] && this.CheckName(this.characters[i].name) == this.CheckName(names[j])) {
                    found = true;
                    break;
                }
            }
            if(!found && !this.characters[i].stop) {
                console.log(`** BroadcastManager ** CHARACTER(${this.characters[i].name}) NOT EXISTS IN AREA. STOPPING.`)
                this.StopCharacter(this.characters[i])
            }
        }
    }

    CheckName(name) {
        return name.replaceAll("'",'').replaceAll("-", '').toLowerCase()
    }

    CheckCharacterStillInScene(i, character) {
        if(!this.formIds) return false;
        let index = this.formIds.findIndex(id => id == character.formId);
        if(index == -1) {
            this.characters.splice(i, 1);
            return false;
        }
        return !character.stop;
    }

    IsCharactersPresent(names) {
        if(names.length == 0) return false;
        let result = true;
        names.forEach((n) => {
            result = result && this.FindCharacterByName(n) != null
        })
        return result;
    }
    
    SetCellCharacters(names) {
        BroadcastManager.cellNames = names;
    }

    SendVerifyConnection() {
        let verifyConnection = {"message": "connection established", "type": "established", "dial_type": 1};

        console.log("** BroadcastManager ** Sending verify connection (N2N).");
        if(!DEBUG)
            this.skseController.Send(verifyConnection);
    }

    SendEndSignal() {
        console.log("** BroadcastManager ** Sending N2N End Signal.");
        this.skseController.Send(GetPayload("", "end", 0, 1, 0));
    }

    GetCharacters() {
        return this.characters
    }

    FindCharacterByName(name) {
        return this.characters.find((c) => this.CheckName(c.name) == this.CheckName(name));
    }

    FindCharacterIndexByName(name) {
        return this.characters.findIndex((c) => this.CheckName(c.name) == this.CheckName(name));
    }

    Run() {
        this.stop = false;
    }

    Pause() {
        BroadcastManager.paused = true
    }

    Continue() {
        BroadcastManager.paused = false;
    }

    WaitUntilPauseEnds() {
        return new Promise<void>(resolve => {
            const intervalId = setInterval(() => {
                if (!BroadcastManager.paused) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, 100);
        });
    }

    IsRunningAny() {
        let runningAny : boolean = false;
        for(let i in this.characters) {
            runningAny = runningAny || !this.characters[i].stop;
        }
        return runningAny;
    }

    IsAnyAwaitingResponse() {
        let awaitingAny : boolean = false;
        for(let i in this.characters) {
            awaitingAny = awaitingAny || !this.characters[i].awaitingResponse;
        }
        return awaitingAny;
    }

    IsRunning() {
        return (!this.stop) || this.IsAnyAwaitingResponse()
    };

    IsPaused() {
        return BroadcastManager.paused;
    }
}

import CharacterManager from './CharacterManager.js';
import PromptManager from './PromptManager.js';
import FileManager from './FileManager.js';
import {GetPayload, GoogleGenAIController} from './GenAIController.js';
import EventBus from './EventBus.js';
import { DEBUG } from '../Anima.js';
import SKSEController from './SKSEController.js';
import FollowerManager from './FollowerManager.js';
import { BroadcastData, BroadcastSendQueue } from './BroadcastSendQueue.js';

export default class BroadcastManager {
    private static playerInstance;
    private static n2nInstance;
    private characterManager : CharacterManager;
    private promptManager : PromptManager;
    private fileManager: FileManager;
    private skseController: SKSEController;
    private sendQueue: BroadcastSendQueue;
    public static MAX_SPEAKER_COUNT = 15;
    public names;
    private formIds;
    private voiceTypes;
    private distances;
    public static currentLocation;
    public static currentDateTime;
    public static cellNames;
    private index: number = 0;
    private profile;
    private stop : boolean = true;
    public static paused;
    public static N2N_SPEAKER;
    public static N2N_LISTENER;
    private anyResponse : boolean = false;
    private characters = [];
    private lock = { isLocked: false };

    constructor(playerName: string, socket: WebSocket) {
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
            this.fileManager.SaveEventLog(character.id, character.formId, "== DON'T REPEAT THIS ==> " + message + " <== DON'T REPEAT THIS ==", this.profile);
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

    static GetInstance(type: string, playerName?: string, socket?: WebSocket) {
        if(type == 'player') {
            if(!BroadcastManager.playerInstance && (!playerName || !socket)) {
                // console.error("NO BROADCAST INSTANCE FOUND. NEED INIT PARAMETERS.");
                return
            }
            if(!BroadcastManager.playerInstance) BroadcastManager.playerInstance = new BroadcastManager(playerName, socket)
            return BroadcastManager.playerInstance;
        } else if(type == 'n2n') {
            if(!BroadcastManager.n2nInstance && (!playerName || !socket)) {
                // console.error("NO BROADCAST INSTANCE FOUND. NEED INIT PARAMETERS.");
                return
            }
            if(!BroadcastManager.n2nInstance) BroadcastManager.n2nInstance = new BroadcastManager(playerName, socket)
            return BroadcastManager.n2nInstance;
        }
        
    }

    async SetCharacters(names, formIds, voiceTypes, distances, currentDateTime, currentLocation) {
        while (this.lock.isLocked) {
            await new Promise(resolve => setTimeout(resolve, 50));  // Wait and try again
        }
        this.lock.isLocked = true;
        try{
            this.names = names;
            this.formIds = formIds;
            this.voiceTypes = voiceTypes;
            this.distances = distances;
            BroadcastManager.currentDateTime = currentDateTime;
            BroadcastManager.currentLocation = currentLocation;
        } finally {
            this.lock.isLocked = false;
        }
        await this.ConnectToCharacters()
    }

    async ConnectToCharacters(log? : boolean) {
        while (this.lock.isLocked) {
            await new Promise(resolve => setTimeout(resolve, 50));  // Wait and try again
        }
        this.lock.isLocked = true;
        try {
            if(!this.names) return
            if(log) console.log(`Trying to connect to ${this.names.join(', ')}`);
            this.characters = []
            for(let i in this.names) {
                if(!this.names[i] || !this.profile || this.names[i].toLowerCase() == this.profile) continue;
                if(this.names[i].toLowerCase() == this.profile.toLowerCase()) continue;
                if(log) (console as any).logToLog(`Trying to connect to ${this.names[i]}`);
                let character = Object.assign({}, this.characterManager.GetCharacter(this.names[i]));
                if (!character) {
                    console.log(`${this.names[i]} is not included in DATABASE`);
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
                character.googleController = new GoogleGenAIController(4, 1, character, character.voiceType,  parseInt(i), this.profile, this.skseController);
                // console.log("ADDED CHARACTER " + character.name + ", " + character.voiceType);
                if(character.id && character.name) this.characters.push(character);
            }
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
            // console.log("ADDING CHARACTER " + name + ", " + voiceType)
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
            character.googleController = new GoogleGenAIController(4, 1, character, character.voiceType,  this.characters.length, this.profile, this.skseController);
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

        this.anyResponse = false;
        console.log("Broadcasting ==> " + speakerName + ": \"" + message + "\"");
        for(let i in this.characters) {
            if(this.characters[i].name.toLowerCase() == speakerName.toLowerCase()) continue;
            if(this.characters[i].stop) {
                console.log(`** BroadcastManager ** ${this.characters[i].name} stopped talking. Not sending to him/her.`)
                continue
            }
            this.sendQueue.addData(new BroadcastData(this.index, speakerName == this.profile ? 0 : 1, this.profile, this.characters, this.characters[i], speakerName, speakerFormId, message, BroadcastManager.currentLocation))
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
        BroadcastManager.N2N_SPEAKER = this.characters.find(c => c.name && c.name.replaceAll("'","").toLowerCase() == name.replaceAll("'","").toLowerCase() && c.formId + '' == formId);
        BroadcastManager.N2N_LISTENER = this.characters.find(c => c.name && c.name.replaceAll("'","").toLowerCase() == listenerName.replaceAll("'","").toLowerCase() && c.formId + '' == listenerFormId);
        if(!BroadcastManager.N2N_SPEAKER || !BroadcastManager.N2N_LISTENER) {
            return false;
        }
        const initMessage = "You are at " + location + ". It's " + currentDateTime + ". Please keep your answers short if possible.";
        this.fileManager.SaveEventLog(BroadcastManager.N2N_SPEAKER.id, BroadcastManager.N2N_LISTENER.formId, initMessage, this.profile);

        this.sendQueue.addData(new BroadcastData(this.index, 2, this.profile, this.characters, BroadcastManager.N2N_SPEAKER, name, formId, "", location))

        return true;
    }

    async Stop(summarize=true) {
        while (this.lock.isLocked) {
            await new Promise(resolve => setTimeout(resolve, 50));  // Wait and try again
        }
        this.lock.isLocked = true;
        try {    
            this.stop = true;
            console.log("** FINALIZING CONVERSATION **.");
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

    async StopCharacter(index, summarize=true) {
        if(!this.characters[index]) return
        const _events = await this.characters[index].googleController.SummarizeEvents(this.characters[index], this.fileManager.GetEvents(this.characters[index].id, this.characters[index].formId, this.profile));
        this.fileManager.SaveEventLog(this.characters[index].id, this.characters[index].formId, _events, this.profile, false);
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
                if(this.characters[i].name && names[j] && this.characters[i].name.toLowerCase() == names[j].toLowerCase()) {
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

        console.log("SENDING VERIFY CONNECTION (N2N).");
        if(!DEBUG)
            this.skseController.Send(verifyConnection);
    }

    SendEndSignal() {
        if(!BroadcastManager.N2N_SPEAKER) return;
        let speaker = this.FindCharacterByName(BroadcastManager.N2N_SPEAKER)
        if(!speaker) return;
        console.log("SENDING N2N END SIGNAL.");
        speaker.googleController.SendEndSignal(1);
    }

    GetCharacters() {
        return this.characters
    }

    FindCharacterByName(name) {
        return this.characters.find((c) => c.name.replaceAll("'","").toLowerCase() == name.replaceAll("'","").toLowerCase());
    }

    FindCharacterIndexByName(name) {
        return this.characters.findIndex((c) => c.name.replaceAll("'","").toLowerCase() == name.replaceAll("'","").toLowerCase());
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

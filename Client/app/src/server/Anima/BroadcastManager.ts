import CharacterManager from './CharacterManager.js';
import PromptManager from './PromptManager.js';
import FileManager from './FileManager.js';
import {GetPayload, GoogleGenAIController} from './GenAIController.js';
import EventBus from './EventBus.js';
import { DEBUG } from '../Anima.js';
import SKSEController from './SKSEController.js';
import FollowerManager from './FollowerManager.js';

export default class BroadcastManager {
    private static playerInstance;
    private static n2nInstance;
    private characterManager : CharacterManager;
    private promptManager : PromptManager;
    private fileManager: FileManager;
    private skseController: SKSEController;
    public static MAX_SPEAKER_COUNT = 15;
    public names;
    private formIds;
    private voiceTypes;
    private distances;
    public static currentLocation;
    public currentDateTime;
    public static cellNames;
    private profile;
    private stop : boolean = true;
    private paused;
    private N2N_SPEAKER;
    private N2N_LISTENER;
    private anyResponse : boolean = false;
    private characters = [];
    private lock = { isLocked: false };

    constructor(playerName: string, socket: WebSocket) {
        this.characterManager = new CharacterManager();
        this.promptManager = new PromptManager();
        this.fileManager = new FileManager();
        this.profile = playerName;
        this.skseController = new SKSEController(socket);

        EventBus.GetSingleton().removeAllListeners('BROADCAST_RESPONSE')
        EventBus.GetSingleton().on('BROADCAST_RESPONSE', async (character, message, _continue) => {
            let _character = this.FindCharacterByName(character.name)
            if(_character) _character.awaitingResponse = false;
            if(message) {
                this.anyResponse = true;
            }
            if(DEBUG && message) {
                for(let j in this.characters) {
                    this.fileManager.SaveEventLog(this.characters[j].id, this.characters[j].formId, " It's " + this.currentDateTime + ". " + (character.name == this.characters[j].name 
                        ? "You" : character.name) + " said : \"" + message + "\"", this.profile);
                }
            }
            if(process.env.BROADCAST_RECURSIVE && process.env.BROADCAST_RECURSIVE.toLowerCase() == 'true' && message && !_continue) {
                if(!this.IsRunning()){
                    await this.ConnectToCharacters();
                    this.Run();
                }
                await this.WaitUntilPauseEnds();
                await this.Say(message, character.name, character.formId);
            }
            if (!message && ((this.N2N_SPEAKER && character && character.name && character.name.toLowerCase() == this.N2N_SPEAKER.toLowerCase()) || (this.N2N_LISTENER && character && character.name && character.name.toLowerCase() == this.N2N_LISTENER.toLowerCase()))) {
                this.SendEndSignal();
                this.N2N_SPEAKER = null;
                this.N2N_LISTENER = null;
            }
        })

        EventBus.GetSingleton().removeAllListeners('BROADCAST_STOP');
        EventBus.GetSingleton().on('BROADCAST_STOP', async (character) => {
            // console.log("BROADCAST_STOP for " + character.name);
            let i = this.FindCharacterIndexByName(character.name)
            if(i >= 0 &&  this.characters[i]) {
                this.StopCharacter(this.characters[i])
            }
        })

        EventBus.GetSingleton().on("BROADCAST_CONTINUE", async (character, message) => {
            // console.log("SENDING CONTINUE => " + character.name + ", " + message)
            if(!this.stop) {
                await this.WaitUntilPauseEnds();
                let _character = this.FindCharacterByName(character.name)
                if(_character && _character.name) {
                    await this.Send(_character, null, null, message);
                }
            }
        })

        EventBus.GetSingleton().on("FORCE_GREET_MESSAGE", (character, message) => {
            this.fileManager.SaveEventLog(character.id, character.formId, "== DON'T REPEAT THIS ==> " + message + " <== DON'T REPEAT THIS ==", this.profile);
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
            this.currentDateTime = currentDateTime;
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

    // Socket version of connection
    async Say(message: string, speakerName : string, speakerFormId: string) {
        if(!this.IsRunning()) {
            console.log("BROADCAST NOT RUNNING::Stopping");
            return;
        }
        
        if(this.characters.length == 0) {
            console.log("NO CHARACTERS FOUND. RETURNING.");
            return false;
        }

        if(process.env.USING_NFF && speakerName == this.profile) {
            let followerManager = FollowerManager.GetInstance();
            if(followerManager) followerManager.SendFollowerCommand(message);
        }

        this.anyResponse = false;
        console.log("Broadcasting ==> " + speakerName + ": \"" + message + "\"");
        let sent = false;
        for(let i in this.characters) {
            if(!this.characters[i].name || this.characters[i].stop || (speakerName && this.characters[i] && this.characters[i].name && this.characters[i].name.toLowerCase() == speakerName.toLowerCase()) || !this.CheckCharacterStillInScene(i, this.characters[i])) continue;
            sent = true;
            // console.log("SENDING to " + this.characters[i].name + ", " + this.characters[i].voiceType);
            await this.Send(this.characters[i], speakerName, speakerFormId, message)
        }

        setTimeout(() => {
            if(this.IsRunning() && this.characters.length > 0 && !this.anyResponse) {
                console.log("STOPPING DUE TO NO RESPONSE.")
                this.Stop()
            }
        }, 120000)

        if(!sent && speakerName == this.profile) {
            this.skseController.Send(GetPayload("There are no actors near.", "notification", 0, 1, 0));
        }

        return true
    }

   async Send(character, speakerName, speakerFormId, message : string) {
        if(!character || !character.name) {
            console.error("BroadcastManager::Send: CHARACTER OR CHARACER NAME DOESN'T EXIST. RETURNING.");
            return;
        }
        if(character.stop) return
        let messageToSend = this.promptManager.PrepareBroadcastMessage(this.profile, character.name, speakerName, this.characters, character, this.currentDateTime, "== DON'T REPEAT THIS ==> " + message + " <== DON'T REPEAT THIS ==", BroadcastManager.currentLocation, this.fileManager.GetEvents(character.name, character.formId, this.profile), this.fileManager.GetThoughts(character.name, character.formId, this.profile));
        character.awaitingResponse = true;
        character.googleController.Send(messageToSend);
        if(speakerFormId) character.googleController.SendLookAt(speakerFormId);
    }

    SetCellCharacters(names) {
        BroadcastManager.cellNames = names;
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
                // console.log("CHARACTER NOT EXISTS IN AREA. STOPPING.")
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

    IsCharactersPresent(names) {
        if(names.length == 0) return false;
        let result = true;
        names.forEach((n) => {
            result = result && this.FindCharacterByName(n) != null
        })
        return result;
    }

    SendVerifyConnection() {
        let verifyConnection = {"message": "connection established", "type": "established", "dial_type": 1};

        console.log("SENDING VERIFY CONNECTION (N2N).");
        if(!DEBUG)
            this.skseController.Send(verifyConnection);
    }

    async StartN2N(name : string, formId: string, listenerName: string, listenerFormId: string, location: string, currentDateTime: string) {
        let speaker = this.characters.find(c => c.name && c.name.replaceAll("'","").toLowerCase() == name.replaceAll("'","").toLowerCase() && c.formId == formId);
        let listener = this.characters.find(c => c.name && c.name.replaceAll("'","").toLowerCase() == listenerName.replaceAll("'","").toLowerCase() && c.formId == listenerFormId);
        if(!speaker || !listener) {
            return false;
        }
        let speakerIndex = this.characters.findIndex(c =>c.name &&  c.name.toLowerCase() == name.toLowerCase() && c.formId == formId);

        const initMessage = "You are at " + location + ". It's " + currentDateTime + ". Please keep your answers short if possible.";
        this.fileManager.SaveEventLog(speaker.id, speaker.formId, initMessage, this.profile);

        let messageToSend = this.promptManager.PrepareN2NStartMessage(speaker, listener, location, this.fileManager.GetEvents(speaker.id, speaker.formId, this.profile), this.fileManager.GetThoughts(speaker.id, speaker.formId, this.profile));
        speaker.awaitingResponse = true;
        speaker.googleController.Send(messageToSend, 1);

        this.N2N_SPEAKER = name;
        this.N2N_LISTENER = listenerName;

        return true;
    }

    SendEndSignal() {
        if(!this.N2N_SPEAKER) return;
        let speaker = this.FindCharacterByName(this.N2N_SPEAKER)
        if(!speaker) return;
        console.log("SENDING N2N END SIGNAL.");
        speaker.googleController.SendEndSignal(1);
    }

    Pause() {
        this.paused = true
    }

    WaitUntilPauseEnds() {
        return new Promise<void>(resolve => {
            const intervalId = setInterval(() => {
                if (!this.paused) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, 100);
        });
    }

    Continue() {
        this.paused = false;
    }

    async Stop() {
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
                    this.StopCharacter(this.characters[i])
                }, 0)
            }
        } finally {
            this.lock.isLocked = false;
        }
    }

    async StopCharacter(character) {
        const _events = await character.googleController.SummarizeEvents(character, this.fileManager.GetEvents(character.id, character.formId, this.profile));
        this.fileManager.SaveEventLog(character.id, character.formId, _events, this.profile, false);
        character.stop = true;
        character.googleController.Stop();
    }

    StopForCharacter(name) {
        let character = this.FindCharacterByName(name)
        if(!character) return
        // console.log("STOPPING FOR CHARACTER " + name)
        character.stop = true
    }

    Run() {
        this.stop = false;
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
        return this.paused;
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
}

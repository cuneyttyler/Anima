// @ts-check
import CharacterManager from './CharacterManager.js';
import PromptManager from './PromptManager.js';
import FileManager from './FileManager.js';
import {GetPayload, GoogleGenAIController} from './GenAIController.js';
import EventBus from './EventBus.js';
import { DEBUG } from '../Anima.js';
import SKSEController from './SKSEController.js';

export default class BroadcastManager {
    private characterManager : CharacterManager;
    private promptManager : PromptManager;
    private fileManager: FileManager;
    private skseController: SKSEController;
    public static MAX_SPEAKER_COUNT = 5;
    public names;
    private formIds;
    private voiceTypes;
    private distances;
    public static currentLocation;
    private currentDateTime;
    public static cellNames;
    private profile;
    private speaker;
    private listener;
    private stop;
    private N2N_SPEAKER;
    private N2N_LISTENER;
    private googleControllers = [];
    private characters = [];
    private prompts = [];
    private eventBuffers = [];
    private thoughtBuffers = [];

    constructor(playerName: string, socket: WebSocket) {
        this.characterManager = new CharacterManager();
        this.promptManager = new PromptManager();
        this.fileManager = new FileManager();
        this.profile = playerName;
        this.skseController = new SKSEController(socket);

        EventBus.GetSingleton().removeAllListeners('BROADCAST_RESPONSE')
        EventBus.GetSingleton().on('BROADCAST_RESPONSE', async (character, listener, message) => {
            if(DEBUG) {
                for(let j in this.characters) {
                    this.fileManager.SaveEventLog(this.characters[j].id, this.characters[j].formId, " " + (message ? (character.name == this.characters[j].name 
                        ? "You" : character.name) + " said : " + message : (character.name == this.characters[j].name ? "You" : character.name) + " didn't answered."), this.profile)
                }
            }
            if(process.env.BROADCAST_RECURSIVE && process.env.BROADCAST_RECURSIVE.toLowerCase() == 'true' && message) {
                await this.Say(message, character.name, listener)
            }
            if(!message && ((this.N2N_SPEAKER && character.name.toLowerCase() ==this.N2N_SPEAKER.toLowerCase()) || (this.N2N_LISTENER && character == this.N2N_LISTENER.toLowerCase()))) {
                this.SendEndSignal()
                this.N2N_SPEAKER = null
                this.N2N_LISTENER = null
            }
        })
    }

    SetCharacters(names, formIds, voiceTypes, distances, currentDateTime, currentLocation) {
        this.names = names
        this.formIds = formIds
        this.voiceTypes = voiceTypes
        this.distances = distances
        this.currentDateTime = currentDateTime
        BroadcastManager.currentLocation = currentLocation
    }

    SetCellCharacters(names) {
        BroadcastManager.cellNames = names
    }

    async ConnectToCharacters() {
        if(!this.names) return
        this.stop = false
        console.log(`Trying to connect to ${this.names.join(', ')}`);
        this.characters = []
        for(let i in this.names) {
            if(this.names[i].toLowerCase() == this.profile) continue
            if(this.names[i].toLowerCase() == this.profile.toLowerCase()) continue
            (console as any).logToLog(`Trying to connect to ${this.names[i]}`)
            let character = this.characterManager.GetCharacter(this.names[i]);
            if (!character) {
                console.log(`${this.names[i]} is not included in DATABASE`);
                continue
            }
            character.formId = this.formIds[i]
            character.voiceType = this.voiceTypes[i]
            character.distance = this.distances[i]
            character.voicePitch = character.voicePitch ? parseFloat(character.voicePitch) : 0
            this.characters.push(character)
            this.prompts.push(this.promptManager.PrepareCharacterPrompt(character))
            this.eventBuffers.push(this.promptManager.PastEventsPrompt(await this.fileManager.GetEvents(this.names[i], this.formIds[i], this.profile)))
            this.thoughtBuffers.push(this.promptManager.ThoughtsPrompt(await this.fileManager.GetThoughts(this.names[i], this.formIds[i], this.profile)))
            let googleController = new GoogleGenAIController(4, 1, character, null, character.voiceType,  parseInt(i), this.profile, this.skseController);
            this.googleControllers.push(googleController)
        }
    }

    // Socket version of connection
    async Say(message: string, speakerName : string, listenerName: string) {
        if(this.stop) return
        this.speaker = speakerName;
        this.listener = listenerName;
        
        if(this.characters.length == 0) return false;

        console.log("Broadcasting ==> " + speakerName + ": \"" + message + "\"")
        let sent = false
        for(let i in this.characters) {
            if(this.speaker && this.characters[i].name.toLowerCase() == this.speaker.toLowerCase() && this.CheckCharacterStillInScene(i, this.characters[i])) continue
            sent = true
            this.Send(i, message)
        }

        if(!sent && speakerName == this.profile) {
            this.skseController.Send(GetPayload("There are no actors near.", "notification", 0, 1, 0))
        }

        return true
    }  

    async StartN2N(name : string, formId: string, voiceType: string, listenerName: string, listenerFormId, location: string, currentDateTime: string) {
        let speaker = this.characters.find(c => c.name.toLowerCase() == name.toLowerCase() && c.formId == formId)
        let listener = this.characters.find(c => c.name.toLowerCase() == listenerName.toLowerCase() && c.formId == listenerFormId)
        if(!speaker || !listener) {
            return false
        }
        let speakerIndex = this.characters.findIndex(c => c.name.toLowerCase() == name.toLowerCase() && c.formId == formId)

        const initMessage = "You are at " + location + ". It's " + currentDateTime + ". Please keep your answers short if possible."
        this.fileManager.SaveEventLog(speaker.id, speaker.formId, initMessage, this.profile)

        let messageToSend = this.promptManager.PrepareN2NStartMessage(speaker, listener, location, this.fileManager.GetEvents(speaker.id, speaker.formId, this.profile), this.fileManager.GetThoughts(speaker.id, speaker.formId, this.profile))
        this.googleControllers[speakerIndex].Send(messageToSend, 1)

        this.N2N_SPEAKER = name
        this.N2N_LISTENER = listenerName

        return true
    }

   Send(i, message : string) {
        let messageToSend = this.promptManager.PrepareBroadcastMessage(this.profile, this.speaker, this.listener, this.characters, this.characters[i], this.currentDateTime, message, BroadcastManager.currentLocation, this.eventBuffers[i], this.thoughtBuffers[i])
        this.googleControllers[i].Send(messageToSend)
        if(DEBUG)
            this.fileManager.SaveEventLog(this.characters[i].id, this.characters[i].formId, this.promptManager.BroadcastEventMessage(this.speaker, this.listener, message), this.profile)
    }

    CheckCharacterStillInScene(i, character) {
        let index = this.formIds.findIndex(id => id == character.formId)
        if(index == -1) {
            this.characters.splice(i, 1)
            return false
        }
        return true
    }

    async Stop() {
        this.stop = true
        console.log("** FINALIZING CONVERSATION **.")
        for(let i in this.characters) {
            if(!this.characters[i]) continue
            const _events = await this.googleControllers[i].SummarizeEvents(this.fileManager.GetEvents(this.characters[i].id, this.characters[i].formId, this.profile))
            this.fileManager.SaveEventLog(this.characters[i].id, this.characters[i].formId, _events, this.profile, false)
        }
    }

    SendEndSignal() {
        if(this.googleControllers.length > 0) {
            this.googleControllers[0].SendEndSignal(1)
        }
    }
}

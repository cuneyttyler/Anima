// @ts-check
import CharacterManager from './CharacterManager.js';
import PromptManager from './PromptManager.js';
import FileManager from './FileManager.js';
import BroadcastManager from './BroadcastManager.js';
import {GoogleGenAIController, GetPayload} from './GenAIController.js';
import EventBus from './EventBus.js'
import { DEBUG } from '../Anima.js'
import SKSEController from './SKSEController.js';

export default class DialogueManager {
    private managerId: number;
    private characterManager : CharacterManager;
    private promptManager : PromptManager;
    private fileManager: FileManager;
    private googleController : GoogleGenAIController;
    private character;
    private id;
    private formId;
    private profile;
    private listener;
    private voiceType;
    private eventBuffer = "";
    private thoughtBuffer = "";
    private conversationOngoing;
    private isInteractionOngoing;
    private isEnding = false;
    public static currentCellActors;

    currentCapabilities = {
        audio: true,
        emotions: true,
        narratedActions: true
    }

    constructor() {
        this.characterManager = new CharacterManager();
        this.promptManager = new PromptManager();
        this.fileManager = new FileManager();
        this.managerId = 0;
        this.InitEvents()
    }

    InitEvents() {
        EventBus.GetSingleton().on('TARGET_RESPONSE', (msg) => {
            this.eventBuffer += "You said \"" + msg + "\"."
            if(this.isEnding) {
                setTimeout(() => {
                    EventBus.GetSingleton().emit('END')
                }, 5000)
            }
        });

        EventBus.GetSingleton().on('INTERACTION_ONGOING', (val) => {
            this.isInteractionOngoing = val;
        });

        EventBus.GetSingleton().on('END', async (msg) => {
            if(!this.id) return;

            await this.Finalize()
            this.SendEndSignal()
            this.conversationOngoing = false;
            this.profile = null;
            this.id = null;
            this.formId = null;
        });
    }

    async InititializeSession(initString) {
        if(!this.id) return
        this.SendNarratedAction(initString);
        let events = await this.fileManager.GetEvents(this.id, this.formId, this.profile)
        if(events && events != "") {
            console.log("Sending event log for " + this.id);
            this.SendNarratedAction(events);
        }
    }

    // Socket version of connection
    async ConnectToCharacter(characterId : string, formId: string, voiceType: string, listener : string, playerName : string, socket : WebSocket) {
        console.log(`Trying to connect to ${characterId}`);
        this.listener = listener;
        let character = this.characterManager.GetCharacter(characterId);
        (console as any).logToLog(`Trying to connect to ${characterId}`)
        if (!character) {
            console.log(`${characterId} is not included in DATABASE`);
            let returnDoesNotExist = GetPayload("NPC is not in database.", "doesntexist", 0, 0, 0);
            if(!DEBUG)
                socket.send(JSON.stringify(returnDoesNotExist));
            return false
        }
        
        character.voicePitch = character.voicePitch ? parseFloat(character.voicePitch) : 0
        this.character = character
        this.id = characterId;
        this.formId = formId;
        this.profile = playerName;
        this.voiceType = voiceType;
        this.isEnding = false;
        this.googleController = new GoogleGenAIController(this.managerId, 0, this.character, this.listener, this.voiceType, 0, this.profile, new SKSEController(socket));

        this.conversationOngoing = true;
        this.eventBuffer = this.promptManager.PastEventsPrompt(await this.fileManager.GetEvents(characterId, formId, playerName))
        this.thoughtBuffer = this.promptManager.PastEventsPrompt(await this.fileManager.GetThoughts(characterId, formId, playerName))

        this.googleController.SendVerifyConnection()      
        
        return true
    }

    Stop() {
        if(!this.isInteractionOngoing) {
            EventBus.GetSingleton().emit('END')
        }   
    }

    StopImmediately() {
        console.log("HARDRESET")
        this.character = null
        this.id = null;
        this.formId = null;
        this.profile = null;
        this.voiceType = null;
        this.googleController = null
        this.conversationOngoing = false
    }

    async Finalize() {
        let events = await this.googleController.SummarizeEvents(this.eventBuffer)
        this.fileManager.SaveEventLog(this.id, this.formId, events, this.profile, true)
        this.conversationOngoing = false;
        this.profile = null;
        this.id = null;
        this.formId = null;
    }

   Say(message : string) {
        let messageToSend = this.promptManager.PrepareDialogueMessage(this.profile, this.listener, this.character, this.eventBuffer, this.thoughtBuffer, message, BroadcastManager.currentLocation) 
        this.eventBuffer += " == CURRENT EVENT ==> " + this.listener + " says to you: \"" + message + "\""   
        this.googleController.Send(messageToSend)
    }

    SendNarratedAction(message: string) {
        this.eventBuffer += " " + message + " ";
    }

    SendEndSignal() {
        if(this.googleController) {
            this.googleController.SendEndSignal()
        }
    }

    GetId() {
        return this.id
    }

    GetFormId() {
        return this.formId
    }

    IsConversationOngoing() {
        return this.conversationOngoing;
    }

    SetInteractionOngoing(val: boolean) {
        this.isInteractionOngoing = val;
    }

}

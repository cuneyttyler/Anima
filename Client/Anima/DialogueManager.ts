// @ts-check
import CharacterManager from './CharacterManager.js';
import PromptManager from './PromptManager.js';
import FileManager from './FileManager.js';
import BroadcastManager from './BroadcastManager.js';
import {GoogleGenAIController, GetPayload} from './GenAIController.js';
import EventBus from './EventBus.js'
import { DEBUG } from '../Anima.js'
import SKSEController from './SKSEController.js';
import FollowerManager from './FollowerManager.js';

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
    private currentDateTime;
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
            if(!this.character) return
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
    }

    // Socket version of connection
    async ConnectToCharacter(characterId : string, formId: string, voiceType: string, listener : string, playerName : string, currentDateTime: string, socket : WebSocket) {
        console.log(`Trying to connect to ${characterId}`);
        this.listener = listener;
        let character =  Object.assign({}, this.characterManager.GetCharacter(characterId));
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
        this.character.formId = formId;
        this.profile = playerName;
        this.voiceType = voiceType;
        this.currentDateTime = currentDateTime;
        this.isEnding = false;
        this.googleController = new GoogleGenAIController(this.managerId, 0, this.character, this.voiceType, 0, this.profile, new SKSEController(socket));

        this.conversationOngoing = true;

        this.googleController.SendVerifyConnection()      
        
        return true
    }

    Stop() {
        if(!this.isInteractionOngoing) {
            EventBus.GetSingleton().emit('END')
        }   
    }

    StopImmediately() {
        this.character = null
        this.id = null;
        this.formId = null;
        this.profile = null;
        this.voiceType = null;
        this.googleController = null
        this.conversationOngoing = false
    }

    async Finalize() {
        let events = await this.googleController.SummarizeEvents(this.character, this.fileManager.GetEvents(this.id, this.formId, this.profile))
        this.fileManager.SaveEventLog(this.id, this.formId, events, this.profile, false)
        this.conversationOngoing = false;
        this.profile = null;
        this.id = null;
        this.formId = null;
    }

   async Say(message : string) {
        let messageToSend = this.promptManager.PrepareDialogueMessage(this.profile, this.listener, this.character, await this.fileManager.GetEvents(this.character.id, this.character.formId, this.profile), await this.fileManager.GetThoughts(this.character.id, this.character.formId, this.profile), message, BroadcastManager.currentLocation) 
        
        this.googleController.Send(messageToSend)
        if(process.env.USING_NFF) {
            let followerManager = FollowerManager.GetInstance();
            if(followerManager) followerManager.SendFollowerCommand(message)
        }
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

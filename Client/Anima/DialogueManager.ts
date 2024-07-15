// @ts-check
import CharacterManager from './CharacterManager.js';
import PromptManager from './PromptManager.js';
import FileManager from './FileManager.js';
import {GoogleGenAIController, GetPayload} from './GenAIController.js';
import EventBus from './EventBus.js'
import { DEBUG } from '../Anima.js'

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
    private is_n2n = false;
    private voiceType;
    private hardreset;
    private eventBuffer = "";
    private conversationOngoing;
    private isInteractionOngoing;
    private is_ending = false;
    public static currentCellActors;

    currentCapabilities = {
        audio: true,
        emotions: true,
        narratedActions: true
    }

    constructor(is_n2n) {
        this.characterManager = new CharacterManager();
        this.promptManager = new PromptManager();
        this.fileManager = new FileManager();
        this.managerId = !is_n2n ? 0 : 1;
        this.is_n2n = is_n2n;
        this.Init()
    }

    Init() {
        EventBus.GetSingleton().on('TARGET_RESPONSE', (msg) => {
            this.eventBuffer += "You said \"" + msg + "\"."
            if(this.is_ending) {
                setTimeout(() => {
                    this.SendEndSignal()
                }, 7000)
            }
        });

        EventBus.GetSingleton().on('INTERACTION_ONGOING', (val) => {
            this.isInteractionOngoing = val;
        });

        EventBus.GetSingleton().on('END', async (msg) => {
            if(!this.id) return;

            await this.Finalize()
            this.profile = null;
            this.id = null;
            this.formId = null;
        });

        EventBus.GetSingleton().on("N2N_END", () => {
            this.SendEndSignal()
        })
    }

    async InitNormal(initString) {
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
        this.hardreset = false;
        console.log(`Trying to connect to ${characterId}`);
        this.listener = listener;
        let character = this.characterManager.GetCharacter(characterId);
        (console as any).logToLog(`Trying to connect to ${characterId}`)
        if (!character) {
            console.log(`${characterId} is not included in DATABASE`);
            let returnDoesNotExist = GetPayload("NPC is not in database.", "doesntexist", 0, !this.is_n2n ? 0 : 1, this.listener);
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
        this.is_ending = false;
        this.googleController = new GoogleGenAIController(this.managerId, !this.is_n2n ? 0 : 1, this.character, this.listener, this.voiceType, 0, socket);

        this.conversationOngoing = true;
        this.eventBuffer = "HERE IS WHAT HAPPENED PREVIOUSLY: "  + await this.fileManager.GetEvents(characterId, formId, playerName)

        let verifyConnection = GetPayload("connection established", "established", 0, !this.is_n2n ? 0 : 1, 0);

        console.log("Connection to " + character.name + " is succesfull" + JSON.stringify(verifyConnection));
        (console as any).logToLog(`Connection to ${character.name} is succesfull.`)
        console.log("Sending verify connection, listener: " + this.listener)

        if(!DEBUG)
            socket.send(JSON.stringify(verifyConnection));
        
        return true
    }

    Stop() {
        this.is_ending = true;

        if(!this.isInteractionOngoing && this.googleController) {
            this.googleController.SendEndSignal();
        }   
    }

    static SetCharacters(actors) {
        DialogueManager.currentCellActors = actors
    }

    StopImmediately() {
        console.log("HARDRESET")
        this.character = null
        this.id = null;
        this.formId = null;
        this.profile = null;
        this.voiceType = null;
        this.googleController = null
        this.hardreset = true
    }

    async Finalize() {
        let events = await this.googleController.SummarizeEvents(this.eventBuffer)
        await this.fileManager.SaveEventLog(this.id, this.formId, events, this.profile)
    }

   Say(message : string) {
        let messageToSend
        if(!this.is_n2n) {
            messageToSend = this.promptManager.PrepareDialogueMessage(this.profile, this.listener, this.character, this.eventBuffer, message) 
       } else {
        messageToSend = this.promptManager.PrepareN2NDialogueMessage(this.character, this.eventBuffer)
       }

       this.eventBuffer += " == CURRENT EVENT ==> " + this.listener + " says to you: \"" + message + "\""
       
        this.googleController.Send(messageToSend)
    }

    StartN2N(location, listener) {
        let messageToSend = this.promptManager.PrepareN2NStartMessage(this.character, listener, location)
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

    Id() {
        return this.id
    }

    FormId() {
        return this.formId
    }

    IsConversationOngoing() {
        return this.conversationOngoing;
    }

    SetInteractionOngoing(val: boolean) {
        this.isInteractionOngoing = val;
    }

    IsReset() {
        return this.hardreset;
    }

    IsEnding() {
        return this.is_ending;
    }
}

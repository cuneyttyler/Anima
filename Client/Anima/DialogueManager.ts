// @ts-check
import CharacterManager from './CharacterManager.js';
import {GoogleGenAIController, GetPayload} from './GenAIController.js';
import EventBus from './EventBus.js'
import { DEBUG } from '../Anima.js'
import * as fs from 'fs';

export default class DialogueManager {
    private managerId: number;
    private IsConnected : boolean;
    private characterManager : CharacterManager;
    private googleController : GoogleGenAIController;
    private character;
    private id;
    private formId;
    private profile;
    private speakerName;
    private is_n2n = false;
    private voiceType;
    private speaker;
    private prompt;
    private hardreset;
    private eventBuffer = "";
    private conversationOngoing;
    private isInteractionOngoing;
    private is_ending = false;

    currentCapabilities = {
        audio: true,
        emotions: true,
        narratedActions: true
    }

    constructor(is_n2n, speaker) {
        this.characterManager = new CharacterManager();
        this.managerId = !is_n2n ? 0 : speaker + 1;
        this.is_n2n = is_n2n;
        this.speaker = speaker;
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
    }

    async InitNormal(initString) {
        if(!this.id) return
        this.SendNarratedAction(initString);
        let events = await this.GetEvents(this.id, this.formId, this.profile)
        if(events && events != "") {
            console.log("Sending event log for " + this.id);
            this.SendNarratedAction(events);
        }
    }

    // Socket version of connection
    async ConnectToCharacter(characterId : string, formId: string, voiceType: string, speakerName : string, playerName : string, socket : WebSocket) {
        this.hardreset = false;
        console.log(`Trying to connect to ${characterId}`);
        this.speakerName = speakerName;
        let character = this.characterManager.GetCharacter(characterId);
        (console as any).logToLog(`Trying to connect to ${characterId}`)
        if (!character) {
            console.log(`${characterId} is not included in DATABASE`);
            let returnDoesNotExist = GetPayload("NPC is not in database.", "doesntexist", 0, !this.is_n2n ? 0 : 1, this.speaker);
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
        this.googleController = new GoogleGenAIController(this.managerId, !this.is_n2n ? 0 : 1, this.character, this.voiceType, this.speaker, socket);

        this.IsConnected = true;
        this.conversationOngoing = true;
        this.prompt = this.characterManager.PreparePrompt(character)
        this.eventBuffer = "HERE IS WHAT HAPPENED PREVIOUSLY: "  + this.GetEvents(characterId, formId, playerName)

        let verifyConnection = GetPayload("connection established", "established", 0, !this.is_n2n ? 0 : 1, this.speaker);

        console.log("Connection to " + character.name + " is succesfull" + JSON.stringify(verifyConnection));
        (console as any).logToLog(`Connection to ${character.name} is succesfull.`)
        console.log("Sending verify connection, speaker: " + this.speaker)

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

    IsReset() {
        return this.hardreset;
    }

    IsEnding() {
        return this.is_ending;
    }

    SetInteractionOngoing(val: boolean) {
        this.isInteractionOngoing = val;
    }

    async GetEventFile(id, formId, profile) {
        try {
            id = id.toLowerCase();
            let profileFolder = './Profiles/' + profile;
            if(!await fs.existsSync(profileFolder)) {
                await fs.mkdirSync(profileFolder);
            }
            if(!await fs.existsSync(profileFolder + '/Events')) {
                await fs.mkdirSync(profileFolder + '/Events');
            }
            let fileName = profileFolder + '/Events/' + id + "_" + formId + '.txt'
            if(!await fs.existsSync(fileName)) {
                await fs.writeFileSync(fileName, "", "utf8");
            }
            return fileName;
        } catch (err) {
            console.error('Error reading or parsing the file:', err);
        }
    }

    async GetEvents(id, formId, profile) {
        let eventFile = await this.GetEventFile(id, formId, profile);
        return fs.readFileSync(eventFile, 'utf8')
    }

    async SaveEventLog(id, formId, log, profile) {
        try {
            id = id.toLowerCase();
            let eventFile = await this.GetEventFile(id, formId, profile);

            if(!fs.existsSync(eventFile)) {
                console.error("Event file not exists: " + eventFile);
                return;
            }
            await fs.appendFileSync(eventFile, log, 'utf8')
        } catch (err) {
        console.error('Error writing the file:', err);
        return false;
        }
    }

    async Finalize() {
        let events = await this.googleController.SummarizeEvents(this.eventBuffer)
        await this.SaveEventLog(this.id, this.formId, events, this.profile)
        // let history = await this.googleController.SummarizeHistory(this.dialogueHistory)
        // this.SaveDialogueHistory(this.id, this.formId, history, this.profile)
    }

    PrepareMessage(message) {
        this.eventBuffer += " == CURRENT EVENT ==> " + this.speakerName + " says to you.\"" + message + "\""
        return !this.is_n2n ? this.prompt + " " + this.characterManager.GetUserProfilePrompt(this.profile) + " " + this.eventBuffer : this.prompt + " " + this.eventBuffer 
    }

   Say(message : string, broadcast?) {
        if (this.IsConnected) {
            message = this.PrepareMessage(message)
            this.googleController.Send(message)
        }
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
}

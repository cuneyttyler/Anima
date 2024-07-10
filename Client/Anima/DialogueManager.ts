// @ts-check
import CharacterManager from './CharacterManager.js';
import {GoogleGenAIController, GetPayload} from './GenAIController.js';
import EventBus from '../EventBus.js'
import * as fs from 'fs';

const WORKSPACE_NAME = process.env.INWORLD_WORKSPACE;

const defaultConfigurationConnection = {
    autoReconnect: true,
    disconnectTimeout: 3600 * 60
}

export default class InworldClientManager {
    private managerId: number;
    private IsConnected : boolean;
    private characterManager : CharacterManager;
    private googleController : GoogleGenAIController;
    private id;
    private formId;
    private profile;
    private speakerName;
    private voice;
    private is_n2n = false;
    private speaker;
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
            // this.dialogueHistory.push({
            //     talker: this.id,
            //     phrase: msg
            // })
        });

        EventBus.GetSingleton().on('END', async (msg) => {
            if(!this.id) return;

            await this.Finalize()
            // this.SaveDialogueHistory(this.id, this.formId, this.dialogueHistory, this.profile);
            // this.dialogueHistory = [];
            this.profile = null;
            this.id = null;
            this.formId = null;
        });
    }

    InitNormal(message) {
        let initString = 'In ' + message.location + ', on ' + message.currentDateTime + ', you started to talk with ' + message.playerName + '. ';
        // this.dialogueHistory.push({
        //     talker: "DungeonMaster",
        //     phrase: initString
        // });
        this.SendNarratedAction(initString);
        let events = this.GetEvents(this.id, this.formId, this.profile)
        if(events && events != "") {
            console.log("Sending event log for " + message.id);
            this.SendNarratedAction(events);
        }
    }

    // Socket version of connection
    async ConnectToCharacter(characterId : string, formId: string, speakerName : string, playerName : string, socket : WebSocket) {
        console.log(`Trying to connect to ${characterId}`);
        this.speakerName = speakerName;
        let character = this.characterManager.GetCharacter(characterId);
        (console as any).logToLog(`Trying to connect to ${characterId}`)
        if (!character) {
            let errorResult = `Cannot connect to ${characterId}`;
            let returnDoesNotExist = GetPayload("NPC is not in database.", "doesntexist", 0, this.is_n2n, this.speaker);
            socket.send(JSON.stringify(returnDoesNotExist));
            throw errorResult
        }
        this.id = characterId;
        this.formId = formId;
        this.profile = playerName;
        this.voice = character.defaultCharacterAssets.voice
        this.is_ending = false;

        this.googleController = new GoogleGenAIController(this.managerId, this, socket);

        this.IsConnected = true;
        this.conversationOngoing = true;
        this.eventBuffer += this.characterManager.PreparePrompt(character)
        this.eventBuffer += " THESE ARE WHAT HAPPENED PREVIOUSLY: "  + this.GetEvents(characterId, formId, playerName)

        let verifyConnection = GetPayload("connection established", "established", 0, this.is_n2n, this.speaker);

        console.log("Connection to " + character.name + " is succesfull" + JSON.stringify(verifyConnection));
        (console as any).logToLog(`Connection to ${character.name} is succesfull.`)
        console.log("Sending verify connection, speaker: " + this.speaker)

        socket.send(JSON.stringify(verifyConnection));
        
        return true
    }

    Stop() {
        this.is_ending = true;

        if(!this.isInteractionOngoing && this.googleController) {
            this.googleController.SendEndSignal();
        }   
    }

    IsEnding() {
        return this.is_ending;
    }

    SetInteractionOngoing(val: boolean) {
        this.isInteractionOngoing = val;
    }

    GetDialogueHistory(id, formId, profile) {
        try {
            id = id.toLowerCase();
            let profileFolder = './Profiles/' + profile;
            if(!fs.existsSync(profileFolder)) { 
                fs.mkdirSync(profileFolder); 
            }
            if(!fs.existsSync(profileFolder + '/Conversations')) {
                fs.mkdirSync(profileFolder + '/Conversations'); 
            }
            let fileName = profileFolder + '/Conversations/' + id + "_" + formId + '.json'
            if(!fs.existsSync(fileName)) return
            let data = fs.readFileSync(fileName, 'utf8')
            return data
        } catch (err) {
          console.error('Error reading or parsing the file:', err);
          return
        }
    }

    async PrepareHistory(history) {
        let text = ""
        for(let i in history) {
            text += history[i].talker + " said: " + history[i].phrase
        }

        return await this.googleController.SummarizeHistory(text)
    }

    async SaveDialogueHistory(id, formId, history, profile) {
        try {
            id = id.toLowerCase();
            let previousHistory = this.GetDialogueHistory(id, formId, profile)
            let newHistory = null;
            if(previousHistory) {
                newHistory = previousHistory.concat(await this.PrepareHistory(history))
            } else {
                newHistory = this.PrepareHistory(history);
            }
            let fileName = './Profiles/' + profile + '/Conversations/' + id + "_" + formId + '.txt'

            if(fs.existsSync(fileName)) {
                fs.unlinkSync(fileName)
            }
            fs.writeFileSync(fileName, JSON.stringify(newHistory), 'utf8')
        } catch (err) {
          console.error('Error writing the file:', err);
          return false;
        }
    }

    GetEventFile(id, formId, profile) {
        try {
            id = id.toLowerCase();
            let profileFolder = './Profiles/' + profile;
            if(!fs.existsSync(profileFolder)) {
                fs.mkdirSync(profileFolder);
            }
            if(!fs.existsSync(profileFolder + '/Events')) {
                fs.mkdirSync(profileFolder + '/Events');
            }
            let fileName = profileFolder + '/Events/' + id + "_" + formId + '.txt'
            if(!fs.existsSync(fileName)) {
                fs.writeFileSync(fileName, "", "utf8");
            }
            return fileName;
        } catch (err) {
        console.error('Error reading or parsing the file:', err);
        return
        }
    }

    GetEvents(id, formId, profile) {
        let eventFile = this.GetEventFile(id, formId, profile);
        return fs.readFileSync(eventFile, 'utf8')
    }

    SaveEventLog(id, formId, log, profile) {
        try {
            id = id.toLowerCase();
            let eventFile = this.GetEventFile(id, formId, profile);

            if(!fs.existsSync(eventFile)) {
                console.error("Event file not exists: " + eventFile);
                return;
            }
            fs.appendFileSync(eventFile, log, 'utf8')
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
        this.eventBuffer += this.speakerName + " says to you.\"" + message + "\""
        return this.eventBuffer 
    }

   Say(message : string, is_ending?) {
        if (this.IsConnected) {
            this.is_ending = is_ending ? is_ending : this.is_ending;
            this.PrepareMessage(message)
            this.googleController.Send(this.eventBuffer)
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

    VoiceModel() {
        return this.voice;
    }

    IsConversationOngoing() {
        return this.conversationOngoing;
    }

    IsN2N() {
        return this.is_n2n;
    }

    Speaker() {
        return this.speaker;
    }
}

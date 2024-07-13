// @ts-check
import CharacterManager from './CharacterManager.js';
import {GoogleGenAIController, GetPayload} from './GenAIController.js';
import * as fs from 'fs';

export default class DialogueManager {
    private characterManager : CharacterManager;
    private profile;
    private speaker;
    private characters = [];
    private prompts = [];
    private eventBuffers = [];

    constructor() {
        this.characterManager = new CharacterManager();
    }

    // Socket version of connection
    async ConnectToCharactersAndSay(ids : Array<string>, formIds: Array<string>, voiceTypes: Array<string>, speakerName : string, playerName : string, message: string, socket : WebSocket) {
        console.log(`Trying to connect to ${ids.join(', ')}`);
        this.speaker = speakerName;
        this.profile = playerName;
        for(let i in ids) {
            if(ids[i].toLowerCase() == playerName.toLowerCase()) continue
            let character = this.characterManager.GetCharacter(ids[i]);
            (console as any).logToLog(`Trying to connect to ${ids[i]}`)
            if (!character) {
                console.log(`${ids[i]} is not included in DATABASE`);
                continue
            }
            this.profile = playerName;
            character.formId = formIds[i]
            character.voiceType = voiceTypes[i]
            character.voicePitch = character.voicePitch ? parseFloat(character.voicePitch) : 0
            this.characters.push(character)
            this.prompts.push(this.characterManager.PreparePrompt(character))
            this.eventBuffers.push("HERE IS WHAT HAPPENED PREVIOUSLY: "  + this.GetEvents(ids[i], formIds[i], playerName))
        }
        
        if(this.characters.length == 0) return false;

        for(let i in this.characters) {
            this.Say(i, message, socket)
            this.SaveEventLog(this.characters[i].id, this.characters[i].formId, this.eventBuffers[i], this.profile)
        }

        return true
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

    PrepareMessage(i, message) {
        this.eventBuffers[i] += " THIS IS A BROADCAST MESSAGE(NOT SPECIFICALLY SPOKEN TO YOU). " 
            + "RESPOND \"**NOT_ANSWERING**\" IF YOU DO NOT WISH TO ANSWER == CURRENT EVENT ==> " + this.speaker + " says to the crowd.\"" + message + "\""
        return this.prompts[i] + " " + this.characterManager.GetUserProfilePrompt(this.profile) + " " + this.eventBuffers[i]
    }

   Say(i, message : string, socket: WebSocket) {
        message = this.PrepareMessage(i, message)
        let googleController = new GoogleGenAIController(4, 2, this.characters[i], this.characters[i].voiceType, parseInt(i), socket);
        googleController.Send(message)
    }
}

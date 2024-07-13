// @ts-check
import CharacterManager from './CharacterManager.js';
import {GoogleGenAIController, GetPayload} from './GenAIController.js';
import * as fs from 'fs';

export default class BroadcastManager {
    private instance;
    private characterManager : CharacterManager;
    private socket;
    private static ids;
    private static formIds;
    private static voiceTypes;
    private profile;
    private speaker;
    private listener;
    private characters = [];
    private prompts = [];
    private eventBuffers = [];

    constructor(socket: WebSocket) {
        this.characterManager = new CharacterManager();
        this.socket = socket;
    }

    static SetCharacters(ids, formIds, voiceTypes) {
        BroadcastManager.ids = ids
        BroadcastManager.formIds = formIds
        BroadcastManager.voiceTypes = voiceTypes
    }

    // Socket version of connection
    async Send(message: string, speakerName : string, listenerName: string, playerName : string) {
        if(!BroadcastManager.ids) return
        console.log(`Trying to connect to ${BroadcastManager.ids.join(', ')}`);
        this.speaker = speakerName;
        this.listener = listenerName;
        this.profile = playerName;
        for(let i in BroadcastManager.ids) {
            if(BroadcastManager.ids[i].toLowerCase() == playerName.toLowerCase()) continue
            let character = this.characterManager.GetCharacter(BroadcastManager.ids[i]);
            (console as any).logToLog(`Trying to connect to ${BroadcastManager.ids[i]}`)
            if (!character) {
                console.log(`${BroadcastManager.ids[i]} is not included in DATABASE`);
                continue
            }
            this.profile = playerName;
            character.formId = BroadcastManager.formIds[i]
            character.voiceType = BroadcastManager.voiceTypes[i]
            character.voicePitch = character.voicePitch ? parseFloat(character.voicePitch) : 0
            this.characters.push(character)
            this.prompts.push(this.characterManager.PreparePrompt(character))
            this.eventBuffers.push("HERE IS WHAT HAPPENED PREVIOUSLY: "  + await this.GetEvents(BroadcastManager.ids[i], BroadcastManager.formIds[i], playerName)) + "\n========================\n"
        }
        
        if(this.characters.length == 0) return false;

        for(let i in this.characters) {
            if(this.characters[i].id.toLowerCase() == this.speaker || this.characters[i].id.toLowerCase() == this.listener) continue
            this.Say(i, message)
        }

        return true
    }

    async GetEventFile(id, formId, profile) {
        try {
            id = id.toLowerCase();
            let profileFolder = './Profiles/' + profile;
            if(!await fs.existsSync(profileFolder)) {
                await fs.mkdirSync(profileFolder);
                await fs.writeFileSync(profileFolder + "/profile.txt", "", "utf8")
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
        return await fs.readFileSync(eventFile, 'utf8')
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

    static CellActorsPrompt() {
        return BroadcastManager.ids ? "These actors are in current CELL: [" + BroadcastManager.ids.join(',') + "]\n========================\n" : ""
    }

    BroadcastPrompt(message) {
        return "THIS IS A BROADCAST MESSAGE(NOT SPECIFICALLY SPOKEN TO YOU - YOU DON'T NEED TO ANSWER. ONLY RESPOND IF YOU REALLY HAVE SOMETHING TO SAY AND IF YOU KNOW THE TALKER.). " 
            + "RESPOND \"**NOT_ANSWERING**\" IF YOU DO NOT WISH TO ANSWER == CURRENT EVENT ==> " 
            + this.speaker + " says to " + (!this.listener ? "the crowd" : this.listener) + ": " + message + "\"" + "\n========================\n"
    }

    PrepareMessage(i, message) {
        return this.prompts[i] + BroadcastManager.CellActorsPrompt() + this.BroadcastPrompt(message) + this.characterManager.GetUserProfilePrompt(this.profile) + " " + this.eventBuffers[i]
    }

   Say(i, message : string) {
        message = this.PrepareMessage(i, message)
        let googleController = new GoogleGenAIController(4, 2, this.characters[i], this.characters[i].voiceType, parseInt(i), this.socket);
        googleController.Send(message)
    }
}

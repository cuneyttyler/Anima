// @ts-check
import CharacterManager from './CharacterManager.js';
import PromptManager from './PromptManager.js';
import FileManager from './FileManager.js';
import {GoogleGenAIController, GetPayload} from './GenAIController.js';
import EventBus from './EventBus.js';
import { DEBUG } from '../Anima.js';

import * as fs from 'fs';

export default class BroadcastManager {
    private characterManager : CharacterManager;
    private promptManager : PromptManager;
    private fileManager: FileManager;
    private socket;
    public static ids;
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
        this.promptManager = new PromptManager();
        this.fileManager = new FileManager();
        this.socket = socket;

        EventBus.GetSingleton().removeAllListeners('BROADCAST_RESPONSE')
        EventBus.GetSingleton().on('BROADCAST_RESPONSE', (i, message) => {
            if(DEBUG) {
                for(let j in this.characters) {
                    this.fileManager.SaveEventLog(this.characters[j].id, this.characters[j].formId, " " + (message ? (i == j 
                        ? "You" : this.characters[i].name) + " said : " + message : (i == j ? "You" : this.characters[i].name) + " didn't answered."), this.profile)
                }
            }
            EventBus.GetSingleton().emit("WEB_BROADCAST_RESPONSE", i, message)
        })
    }

    static SetCharacters(ids, formIds, voiceTypes) {
        BroadcastManager.ids = ids
        BroadcastManager.formIds = formIds
        BroadcastManager.voiceTypes = voiceTypes
    }

    // Socket version of connection
    async Say(message: string, speakerName : string, listenerName: string, playerName : string) {
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
            this.prompts.push(this.promptManager.PrepareCharacterPrompt(character))
            this.eventBuffers.push("HERE IS WHAT HAPPENED PREVIOUSLY: "  + await this.fileManager.GetEvents(BroadcastManager.ids[i], BroadcastManager.formIds[i], playerName)) + "\n========================\n"
        }
        
        if(this.characters.length == 0) return false;

        console.log("Broadcasting \"" + message + "\"")
        for(let i in this.characters) {
            if(this.characters[i].id.toLowerCase() == this.speaker || this.characters[i].id.toLowerCase() == this.listener) continue
            this.Send(i, message)
        }

        return true
    }  

   Send(i, message : string) {
        let messageToSend = this.promptManager.PrepareBroadcastMessage(i, this.profile, this.speaker, this.listener, this.characters[i], message, this.eventBuffers[i])
        let googleController = new GoogleGenAIController(4, 2, this.characters[i], this.characters[i].voiceType, parseInt(i), this.socket);
        googleController.Send(messageToSend)
        if(DEBUG)
            this.fileManager.SaveEventLog(this.characters[i].id, this.characters[i].formId, this.promptManager.BroadcastEventMessage(this.speaker, this.listener, message), this.profile)
    }
}

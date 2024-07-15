// @ts-check
import CharacterManager from './CharacterManager.js';
import PromptManager from './PromptManager.js';
import FileManager from './FileManager.js';
import {GoogleGenAIController} from './GenAIController.js';
import EventBus from './EventBus.js';
import { DEBUG, N2N_SPEAKER, N2N_LISTENER  } from '../Anima.js';

export default class BroadcastManager {
    private characterManager : CharacterManager;
    private promptManager : PromptManager;
    private fileManager: FileManager;
    private socket;
    public static names;
    private static formIds;
    private static voiceTypes;
    private profile;
    private speaker;
    private listener;
    private characters = [];
    private prompts = [];
    private eventBuffers = [];

    constructor(playerName: string, socket: WebSocket) {
        this.characterManager = new CharacterManager();
        this.promptManager = new PromptManager();
        this.fileManager = new FileManager();
        this.socket = socket;
        this.profile = playerName;

        EventBus.GetSingleton().removeAllListeners('BROADCAST_RESPONSE')
        EventBus.GetSingleton().on('BROADCAST_RESPONSE', (i, listener, message) => {
            if(DEBUG) {
                for(let j in this.characters) {
                    this.fileManager.SaveEventLog(this.characters[j].id, this.characters[j].formId, " " + (message ? (i == j 
                        ? "You" : this.characters[i].name) + " said : " + message : (i == j ? "You" : this.characters[i].name) + " didn't answered."), this.profile)
                }
            }
            if(process.env.BROADCAST_RECURSIVE && process.env.BROADCAST_RECURSIVE.toLowerCase() == 'true' && message) {
                this.Say(message, BroadcastManager.names[i], listener)
            }
            if(!message && ((N2N_SPEAKER && this.characters[i].name.toLowerCase() == N2N_SPEAKER.toLowerCase()) || (N2N_LISTENER && this.characters[i] == N2N_LISTENER.toLowerCase()))) {
                EventBus.GetSingleton().emit("N2N_END")
            }
        })
    }

    static SetCharacters(names, formIds, voiceTypes) {
        BroadcastManager.names = names
        BroadcastManager.formIds = formIds
        BroadcastManager.voiceTypes = voiceTypes
    }

    async ConnectToCharacters() {
        if(!BroadcastManager.names) return
        console.log(`Trying to connect to ${BroadcastManager.names.join(', ')}`);
        this.characters = []
        for(let i in BroadcastManager.names) {
            if(BroadcastManager.names[i].toLowerCase() == this.profile.toLowerCase()) continue
            (console as any).logToLog(`Trying to connect to ${BroadcastManager.names[i]}`)
            let character = this.characterManager.GetCharacter(BroadcastManager.names[i]);
            if (!character) {
                console.log(`${BroadcastManager.names[i]} is not included in DATABASE`);
                continue
            }
            character.formId = BroadcastManager.formIds[i]
            character.voiceType = BroadcastManager.voiceTypes[i]
            character.voicePitch = character.voicePitch ? parseFloat(character.voicePitch) : 0
            this.characters.push(character)
            this.prompts.push(this.promptManager.PrepareCharacterPrompt(character))
            this.eventBuffers.push("HERE IS WHAT HAPPENED PREVIOUSLY: "  + await this.fileManager.GetEvents(BroadcastManager.names[i], BroadcastManager.formIds[i], this.profile)) + "\n========================\n"
        }
    }

    // Socket version of connection
    async Say(message: string, speakerName : string, listenerName: string, ) {
        await this.ConnectToCharacters()
        this.speaker = speakerName;
        this.listener = listenerName;
        
        if(this.characters.length == 0) return false;

        console.log("Broadcasting \"" + message + "\"")
        for(let i in this.characters) {
            if(this.characters[i].name.toLowerCase() == this.speaker.toLowerCase()) continue
            this.Send(i, message)
        }

        return true
    }  

   Send(i, message : string) {
    let messageToSend = this.promptManager.PrepareBroadcastMessage(this.profile, this.speaker, this.listener, this.characters[i], message, this.eventBuffers[i])
    let googleController = new GoogleGenAIController(4, 2, this.characters[i], null, this.characters[i].voiceType,  parseInt(i), this.socket);
        googleController.Send(messageToSend)
        if(DEBUG)
            this.fileManager.SaveEventLog(this.characters[i].id, this.characters[i].formId, this.promptManager.BroadcastEventMessage(this.speaker, this.listener, message), this.profile)
    }
}

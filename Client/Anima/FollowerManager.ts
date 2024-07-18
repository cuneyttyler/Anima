import {GetPayload, GoogleGenAIController} from './GenAIController.js';
import EventBus from './EventBus.js';
import { DEBUG } from '../Anima.js';
import SKSEController from './SKSEController.js';
import CharacterManager from './CharacterManager.js';
import PromptManager from './PromptManager.js';
import BroadcastManager from './BroadcastManager.js';
import FileManager from './FileManager.js';
import waitSync from 'wait-sync'

export default class FollowerManager {
    private characterManager: CharacterManager = new CharacterManager();
    private promptManager: PromptManager = new PromptManager();
    private fileManager: FileManager = new FileManager();
    private running: boolean = false;
    private profile: string;
    private characters = [];
    private characterCount = 0;
    private skseController: SKSEController;

    constructor(playerName: string, socket: WebSocket) {
        this.profile = playerName
        this.skseController = new SKSEController(socket)
    }

    Clear() {
        this.characters = []
        this.characterCount = 0
    }

    ConnectToCharacter(name: string, formId: string, voiceType: string, distance: number) {
        console.log(`Trying to connect to ${name}`);
        if(name.toLowerCase() == this.profile) return
        if(name.toLowerCase() == this.profile.toLowerCase()) return
        (console as any).logToLog(`Trying to connect to ${name}`)
        let character = this.characterManager.GetCharacter(name);
        if (!character) {
            console.log(`${name} is not included in DATABASE`);
            return
        }
        character.formId = formId
        character.voiceType = voiceType
        character.distance = distance
        character.voicePitch = character.voicePitch ? parseFloat(character.voicePitch) : 0 
        let googleController = new GoogleGenAIController(4, 2, character, null, character.voiceType, this.characterCount + BroadcastManager.MAX_SPEAKER_COUNT, this.profile, this.skseController);
        character.googleController = googleController
        this.characters.push(character)
        this.characterCount++
    }

    async SendThought() {
        console.log("SENDING THOUGHT PROMPTS")
        this.characters.forEach(async (c) => {
            console.log("SENDING for " + c.name)
            let thoughtPrompt = this.promptManager.PrepareFollowerThoughtMessage(this.profile,c,BroadcastManager.currentLocation, this.fileManager.GetEvents(c.id, c.formId, this.profile), this.fileManager.GetThoughts(c.id, c.formId, this.profile))
            let thoughts = await c.googleController.SendThought(thoughtPrompt)
            console.log("SAVING THOUGHTS " + thoughts)
            this.fileManager.SaveThoughts(c.id, c.formId, thoughts, this.profile, false)
            this.fileManager.SaveThoughts_WholeMemory(c.id, c.formId, thoughts, this.profile)
        })
    }

    SendPeriodic() {
        console.log("SENDING PERIODIC PROMPTS")
        this.characters.forEach((c) => {
            if(c.distance < 5) {
                console.log("SENDING FOR " + c.name)
                let periodicPrompt = this.promptManager.PrepareFollowerPeriodicMessage(this.profile,c,BroadcastManager.currentLocation, this.fileManager.GetEvents(c.id, c.formId, this.profile), this.fileManager.GetThoughts(c.id, c.formId, this.profile))
                c.googleController.Send(periodicPrompt, 2)
            } else {
                console.log("NOT SENDING FOR " + c.name + "(TOO FAR)")
            }
        })
    }
    Run() {
        this.running = true
        console.log("RUNNING FollowerManager")

        this.SendThought()
        setInterval(() => {
            this.SendThought()
        }, 60000 * 5)
        
        waitSync(10)

        this.SendPeriodic()
        setInterval(() => {
            this.SendPeriodic()
        }, 60000 * 2)
    }

    IsRunning() {
        return this.running;
    }
}
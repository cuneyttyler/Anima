import {GoogleGenAIController} from './GenAIController.js';
import OpenRouter from './OpenRouter.js'
import GoogleGenAI from './GoogleGenAI.js'
import SKSEController from './SKSEController.js';
import CharacterManager from './CharacterManager.js';
import PromptManager from './PromptManager.js';
import BroadcastManager from './BroadcastManager.js';
import FileManager from './FileManager.js';

export default class FollowerManager {
    private characterManager: CharacterManager = new CharacterManager();
    private promptManager: PromptManager = new PromptManager();
    private fileManager: FileManager = new FileManager();
    private running: boolean = false;
    private profile: string;
    private characters = [];
    private characterCount = 0;
    private socket: WebSocket;
    private skseController: SKSEController;
    private static instance: FollowerManager;

    constructor(playerName: string, socket: WebSocket) {
        this.profile = playerName
        this.socket = socket;
        this.skseController = new SKSEController(socket)
    }

    static GetInstance(playerName?: string, socket?: WebSocket) {
        if(!FollowerManager.instance && !playerName && !socket) {
            console.error("FollowerManager instance is not present. Initialization parameters must be provided.")
            return
        }
        if(!FollowerManager.instance) {
            FollowerManager.instance = new FollowerManager(playerName, socket)
        }
        return FollowerManager.instance
    }

    Clear() {
        this.characters = []
        this.characterCount = 0
    }

    ConnectToCharacter(name: string, formId: string, voiceType: string, distance: number) {
        if(this.characters.find((c) => c.name.toLowerCase() == name.toLowerCase())) return
        
        // console.log(`Trying to connect to ${name}`);
        if(name.toLowerCase() == this.profile) return
        if(name.toLowerCase() == this.profile.toLowerCase()) return
        (console as any).logToLog(`Trying to connect to ${name}`)
        let character =  Object.assign({}, this.characterManager.GetCharacter(name))
        if (!character) {
            console.log(`FollowerManager: ${name} is not included in DATABASE`);
            return
        }
        character.formId = formId
        character.voiceType = voiceType
        character.distance = distance
        character.voicePitch = character.voicePitch ? parseFloat(character.voicePitch) : 0 
        let googleController = new GoogleGenAIController(4, 2, character, character.voiceType, this.characterCount + BroadcastManager.MAX_SPEAKER_COUNT, this.profile, this.skseController);
        character.googleController = googleController
        this.characters.push(character)
        this.characterCount++
    }

    async SendThought() {
        // console.log("SENDING THOUGHT PROMPTS")
        this.characters.forEach(async (c) => {
            // console.log("SENDING for " + c.name)
            let thoughtPrompt = this.promptManager.PrepareThoughtMessage(this.profile,c, BroadcastManager.currentLocation, this.fileManager.GetEvents(c.id, c.formId, this.profile), this.fileManager.GetThoughts(c.id, c.formId, this.profile))
            let thoughts = await c.googleController.SendThought(thoughtPrompt)
            // console.log("SAVING THOUGHTS " + thoughts)
            this.fileManager.SaveThoughts(c.id, c.formId, thoughts, this.profile, false)
            this.fileManager.SaveThoughts_WholeMemory(c.id, c.formId, thoughts, this.profile)
        })
    }

    SendPeriodic() {
        // console.log("SENDING PERIODIC PROMPTS")
        this.characters.forEach((c) => {
            if(c.distance < 10) {
                // console.log("SENDING FOR " + c.name)
                let periodicPrompt = this.promptManager.PrepareFollowerPeriodicMessage(this.profile,c,BroadcastManager.currentLocation, this.fileManager.GetEvents(c.id, c.formId, this.profile), this.fileManager.GetThoughts(c.id, c.formId, this.profile))
                c.googleController.Send(periodicPrompt, 2)
            } else {
                // console.log("NOT SENDING FOR " + c.name + "(TOO FAR)")
            }
        })
    }

    Run() {
        this.running = true

        this.SendThought()
        setInterval(() => {
            this.SendThought()
        }, 60000 * 5)
        
        setTimeout(() => {
            if(!BroadcastManager.GetInstance('n2n', this.profile, this.socket).IsPaused()) {
                this.SendPeriodic()
            }
            setInterval(() => {
                if(!BroadcastManager.GetInstance('n2n', this.profile, this.socket).IsPaused()) {
                    this.SendPeriodic()
                }
            }, 60000 * 2)
        }, 10000)
    }

    async SendFollowerCommand(message: string) {
        if(this.characters.length == 0) {
            // console.log("NO FOLLOWERS PRESENT. NOT SENDING FOLLOWER COMMAND.")
            return
        }
        // console.log("SENDING FOLLOWER COMMAND.")
        let messageToSend = this.promptManager.PrepareFollowerCommandMessage(FollowerManager.GetInstance().GetCharacerNames(), message)
        let response = null;
        if(process.env.LLM_PROVIDER == "OPENROUTER") {
            response = await OpenRouter.SendMessage(messageToSend)
        } else if(process.env.LLM_PROVIDER == "GOOGLE") {
            response = await GoogleGenAI.SendMessage(messageToSend)
        } else {
            console.error("LLM_PROVIDER is missing in your .env file")
            return
        }
        if(response.status == 1) {
            let splitted = response.text.replace('\n', '').trim().split('|')
            let followers = splitted[0].replace('[','').replace(']','').split(',')
            let command = splitted[1].trim()

            switch (command) {
                case 'STAY_CLOSE':
                    this.skseController.Send({message: 'follower-command', type: 'follower-command', command: 'stay-close'})
                    break
                case 'RELAX':
                    this.skseController.Send({message: 'follower-command', type: 'follower-command', command: 'relax'})
                    break
                case 'UNKNOWN':
                    break
            }
        } else if(response.status == 2) {
            console.error("CAN'T GET RESPONSE FROM LLM.")
        }
    }

    GetCharacerNames() {
        return this.characters.map((c) => c.name).join(',')
    }

    IsRunning() {
        return this.running;
    }
}
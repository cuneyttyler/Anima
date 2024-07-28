import BroadcastManager from "./BroadcastManager.js";
import CharacterManager from "./CharacterManager.js";
import FileManager from "./FileManager.js";
import PromptManager from "./PromptManager.js";
import {GoogleGenAIController} from './GenAIController.js';
import SKSEController from "./SKSEController.js";

export default class AliveCharacterManager {
    private characterManager: CharacterManager;
    private fileManager: FileManager;
    private promptManager: PromptManager;
    private profile: string;
    private characters;

    constructor(profile, socket) {
        this.profile = profile;
        this.characterManager = new CharacterManager()
        this.fileManager = new FileManager();
        this.promptManager = new PromptManager();
        let skseController = new SKSEController(socket)
        this.characters = this.characterManager.GetAliveCharacterList()
        for(let i in this.characters) {
            let googleController = new GoogleGenAIController(4, 2, this.characters[i], this.characters[i].voiceType, 0, this.profile, skseController);
            this.characters[i].googleController = googleController
        }
    }

    Run() {
        this.SendThought()
        setInterval(() => {
            this.SendThought()
        }, 60 * 10000)
    }

    async SendThought() {
        this.characters.forEach(async (c) => {
            if(!c.formId) {
                console.warn(c.name + " doesn't have formId in database. Not sending thought prompt.")
                return
            }
            let thoughtPrompt = this.promptManager.PrepareThoughtMessage(this.profile,c, BroadcastManager.currentLocation, this.fileManager.GetEvents(c.id, c.formId, this.profile), this.fileManager.GetThoughts(c.id, c.formId, this.profile))
            let thoughts = await c.googleController.SendThought(thoughtPrompt)
            this.fileManager.SaveThoughts(c.id, c.formId, thoughts, this.profile, false)
            this.fileManager.SaveThoughts_WholeMemory(c.id, c.formId, thoughts, this.profile)
        })
    }
}
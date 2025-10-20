import BroadcastManager from "./BroadcastManager.js";
import CharacterManager from "./CharacterManager.js";
import LectureManager from "./LectureManager.js";
import FileManager from "./FileManager.js";
import PromptManager from "./PromptManager.js";
import {GoogleGenAIController} from './GenAIController.js';
import SKSEController from "./SKSEController.js";
import { AudioProcessor } from "./AudioProcessor.js";

export default class AliveCharacterManager {
    private characterManager: CharacterManager;
    private fileManager: FileManager;
    private promptManager: PromptManager;
    private broadcastManager: BroadcastManager
    private lectureManager: LectureManager;
    private skseController: SKSEController;
    private profile: string;
    private characters = [];

    constructor(profile, socket, private audioProcessor: AudioProcessor) {
        this.profile = profile;
        this.characterManager = new CharacterManager()
        this.fileManager = new FileManager();
        this.promptManager = new PromptManager();
        this.skseController = new SKSEController(socket)
        this.audioProcessor = new AudioProcessor(4);
        let characters = this.characterManager.GetCharacterList()
        for(let i in characters) {
            let c = Object.assign({}, characters[i])
            c.lastSentTime = 0
            this.characters.push(c)
        }
    }

    Run() {
        // this.SendThought()
        // setInterval(() => {
        //     this.SendThought()
        // }, 60 * 10000)
        setInterval(() => {
            this.CheckNearCharacters()
        }, 20000)
    }

    async SendThought() {
        this.characters.forEach(async (c) => {
            if(!c.formId) {
                console.warn(c.name + " doesn't have formId in database. Not sending thought prompt.")
                return
            }
            let thoughtPrompt = this.promptManager.PrepareThoughtMessage(this.profile,c, BroadcastManager.currentLocation, this.fileManager.GetEvents(c.id, c.formId, this.profile), this.fileManager.GetThoughts(c.id, c.formId, this.profile))
            c.googleController = new GoogleGenAIController(4, 4, c, null, 0, this.profile, this.skseController, this.audioProcessor);
            let thoughts = await c.googleController.SendThought(thoughtPrompt)
            this.fileManager.SaveThoughts(c.id, c.formId, thoughts, this.profile, false)
            this.fileManager.SaveThoughts_WholeMemory(c.id, c.formId, thoughts, this.profile)
        })
    }

    CheckNearCharacters() {
        if(!this.broadcastManager) return
        let nearCharacters = Object.assign({}, this.broadcastManager.GetCharacters())
        for(let i in nearCharacters) {
            let aliveCharacter = this.characters.find((c) => c.name == nearCharacters[i].name)
            if(!aliveCharacter) return
            if(aliveCharacter.lastSentTime && (Date.now() - aliveCharacter.lastSentTime) / 1000 > 120) return
            if(Math.random() < 0.8) return
            console.log("**AliveCharacterManager** Sending trigger to " + aliveCharacter.name)
            aliveCharacter.lastSentTime = Date.now()
            if(!this.lectureManager || !this.lectureManager.running) {
                let triggerPrompt = this.promptManager.PrepareTriggerMessage(this.profile, aliveCharacter, BroadcastManager.currentLocation, this.fileManager.GetEvents(aliveCharacter.id, aliveCharacter.formId, this.profile), this.fileManager.GetThoughts(aliveCharacter.id, aliveCharacter.formId, this.profile))
                aliveCharacter.aliveGoogleController = new GoogleGenAIController(4, 4, aliveCharacter, nearCharacters[i].voiceType, 0, this.profile, this.skseController, this.audioProcessor);
                aliveCharacter.aliveGoogleController.Send(triggerPrompt)        
            }
        }
    }

    SetBroadcastManager(broadcastManager) {
        this.broadcastManager = broadcastManager
    }

    SetLectureManager(lectureManager) {
        this.lectureManager = lectureManager
    }
}
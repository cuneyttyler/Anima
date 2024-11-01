import BroadcastManager from "./BroadcastManager.js";
import CharacterManager from "./CharacterManager.js";
import LectureManager from "./LectureManager.js";
import FileManager from "./FileManager.js";
import PromptManager from "./PromptManager.js";
import {GoogleGenAIController} from './GenAIController.js';
import SKSEController from "./SKSEController.js";

export default class AliveCharacterManager {
    private characterManager: CharacterManager;
    private fileManager: FileManager;
    private promptManager: PromptManager;
    private broadcastManager: BroadcastManager
    private lectureManager: LectureManager;
    private skseController: SKSEController;
    private profile: string;
    private characters = [];

    constructor(profile, socket) {
        this.profile = profile;
        this.characterManager = new CharacterManager()
        this.fileManager = new FileManager();
        this.promptManager = new PromptManager();
        this.skseController = new SKSEController(socket)
        let characters = this.characterManager.GetAliveCharacterList()
        for(let i in characters) {
            this.characters.push(Object.assign({}, characters[i]))
        }
    }

    Run() {
        // this.SendThought()
        // setInterval(() => {
        //     this.SendThought()
        // }, 60 * 10000)
        setInterval(() => {
            this.CheckNearCharacters()
        }, 5000)
    }

    async SendThought() {
        this.characters.forEach(async (c) => {
            if(!c.formId) {
                console.warn(c.name + " doesn't have formId in database. Not sending thought prompt.")
                return
            }
            let thoughtPrompt = this.promptManager.PrepareThoughtMessage(this.profile,c, BroadcastManager.currentLocation, this.fileManager.GetEvents(c.id, c.formId, this.profile), this.fileManager.GetThoughts(c.id, c.formId, this.profile))
            c.googleController = new GoogleGenAIController(4, 4, c, null, 0, this.profile, this.skseController);
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
            if(aliveCharacter.lastTryTime && (Date.now() - aliveCharacter.lastTryTime) / 1000 < 60 * 10) return
            aliveCharacter.lastTryTime = Date.now()
            if(Math.random() < 0.5) return
            console.log("**AliveCharacterManager** Sending trigger to " + aliveCharacter.name)
            if(!this.lectureManager || !this.lectureManager.running) {
                let triggerPrompt = this.promptManager.PrepareTriggerMessage(this.profile, aliveCharacter, BroadcastManager.currentLocation, this.fileManager.GetEvents(aliveCharacter.id, aliveCharacter.formId, this.profile), this.fileManager.GetThoughts(aliveCharacter.id, aliveCharacter.formId, this.profile))
                aliveCharacter.googleController = new GoogleGenAIController(4, 4, aliveCharacter, nearCharacters[i].voiceType, 0, this.profile, this.skseController);
                aliveCharacter.googleController.Send(triggerPrompt)        
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
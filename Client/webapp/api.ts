import { AudioProcessor } from "../Anima/AudioProcessor.js"
import {MALE_VOICES, FEMALE_VOICES} from './voices.js'
import GoogleGenAI from "../Anima/GoogleGenAI.js"
import CharacterManager from "../Anima/CharacterManager.js"
import DialogueManager from "../Anima/DialogueManager.js"
import BroadcastManager from "../Anima/BroadcastManager.js"
import EventBus from "../Anima/EventBus.js"
import { SET_DEBUG } from "../Anima.js"

import fs from 'fs'
import waitSync from 'wait-sync'

class CustomError extends Error {
    status?: number; // Explicitly declaring the status property
  
    constructor(message: string, status?: number) {
      super(message);
      this.status = status;
      this.name = this.constructor.name;
    }
  }

export default  class Api {
    private characterManager: CharacterManager = new CharacterManager()

    CharacterList() {
        return this.characterManager.GetCharacterList()
    }

    AliveCharacterList() {
        return this.characterManager.GetAliveCharacterList();
    }

    SaveCharacter(character) {
        this.characterManager.SaveCharacter(character)
    }

    SaveAliveCharacter(character) {
        this.characterManager.SaveAliveCharacter(character)
    }

    DeleteCharacter(id) {
        this.characterManager.DeleteCharacter(id)
    }

    DeleteAliveCharacter(id) {
        this.characterManager.DeleteAliveCharacter(id)
    }

    MaleVoices() {
        return MALE_VOICES
    }

    FemaleVoices() {
        return FEMALE_VOICES
    }

    ApplyPitch(gender, voice, pitch, callback) {
        const file = "./voices/" + gender.toLowerCase() + "/" + voice + ".mp3"
        const output_file = "./Audio/Temp/" + voice + ".wav"
        new AudioProcessor().convertAudio(file, output_file, parseFloat(pitch), () => {
            callback(output_file)
        })    
    }

    async Autofill(name) {
        let sampleCharacter = JSON.stringify(JSON.parse(fs.readFileSync('./World/SampleCharacter.json', 'utf8')))
        let prompt = "Please generate a similar json string to this for " + name + " from Elder Scrolls: Skyrim.\n" + sampleCharacter
            + "\n Possible voice values for MALE: " + JSON.stringify(this.MaleVoices()) + " and for FEMALE characters " + JSON.stringify(this.FemaleVoices())
            + "\n Possible lifeStage values : [CHILDHOOD, YOUNG_ADULTHOOD, MIDDLE_ADULTHOOD, LATE_ADULTHOOD]"
            + "\n Mood and personality can be a value between -100 and 100."
            + "\n PLEASE ONLY INCLUDE THE JSON STRING IN YOUR MESSAGE. OMIT ANYTHING OTHER THAN JSON STRING."

        let response = await GoogleGenAI.SendMessage({prompt: null, message: prompt})
        if(response.status == 1) {
            let text = response.text.replace("json","").replaceAll('```','').replaceAll("\n","")
            try{
                return JSON.parse(text)
            } catch(err) {
                console.error("ERROR PARSING JSON ==> " + JSON.stringify(text))
                throw new CustomError(err, 2)
            }
        } else if(response.status == 2) {
            console.error("ERROR during connecting to GOOGLE VERTEX AI")
            throw new CustomError("ERROR during connecting to GOOGLE VERTEX AI", 1)
        }
    }

    async SendNormal(names, speaker, text, callback) {
        SET_DEBUG(true)

        let dialogueManager = new DialogueManager()
        await dialogueManager.ConnectToCharacter(names[0], "0", "MaleNord", speaker, speaker, "", null)
        dialogueManager.Say(text)

        EventBus.GetSingleton().removeAllListeners('WEB_TARGET_RESPONSE')
        EventBus.GetSingleton().on('WEB_TARGET_RESPONSE', (message) => {
            callback(message)
        })
    }

    async SendN2N(names, text, io) {
        SET_DEBUG(true)

        let formIds = []
        let voiceTypes = []
        let distances = []

        for(let i in names) {
            formIds.push(0)
            voiceTypes.push("MaleNord")
            distances.push(parseInt(i) + 1)
        }

        let broadcastManager = await new BroadcastManager('Adventurer', null, new AudioProcessor(0))
        broadcastManager.SetCharacters(names, formIds, voiceTypes, distances, "First of the First Seed", "Riverwood")
        
        broadcastManager.ConnectToCharacters(true)
        broadcastManager.StartN2N(names[0], "0", names[1],  "1", "Riverwood", "First of the First Seed")

        let characters = broadcastManager.GetCharacters()
        EventBus.GetSingleton().removeAllListeners('WEB_BROADCAST_RESPONSE')
        EventBus.GetSingleton().on('WEB_BROADCAST_RESPONSE', (character, speaker, message) => {
            let response = names[speaker] + ": " + (message ? message : " ==NOT ANSWERED==")
            for(let i in characters) {
                broadcastManager.SaveMessage(characters[i].id, characters[i].formId, character.name + " said: \'" + message + "\"")
            }
            io.emit('chat_response', response + '\n==========\n')
        })
    }

    async SendBroadcast(names, speaker, text, io) {
        SET_DEBUG(true)

        let formIds = []
        let voiceTypes = []
        let distances = []

        for(let i in names) {
            formIds.push(0)
            voiceTypes.push("MaleNord")
            distances.push(parseInt(i) + 1)
        }

        let broadcastManager = new BroadcastManager(speaker, null, new AudioProcessor(0))
        broadcastManager.SetCharacters(names, formIds, voiceTypes, distances, "First of the First Seed", "Riverwood")
        await broadcastManager.ConnectToCharacters()
        await broadcastManager.Say(text, speaker, null)

        EventBus.GetSingleton().removeAllListeners('WEB_BROADCAST_RESPONSE')
        EventBus.GetSingleton().on('WEB_BROADCAST_RESPONSE', (character, speaker, message) => {
            let response = names[speaker] + ": " + (message ? message : " ==NOT ANSWERED==")

            io.emit('chat_response', response + '\n==========\n')
        })
    }
}   
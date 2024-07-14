import CharacterManager from "../Anima/CharacterManager.js"
import { AudioProcessor } from "../Anima/AudioProcessor.js"
import {MALE_VOICES, FEMALE_VOICES} from './voices.js'
import GoogleGenAI from "../Anima/GoogleGenAI.js"
import BroadcastManager from "../Anima/BroadcastManager.js"
import EventBus from "../Anima/EventBus.js"
import { DEBUG, SET_DEBUG } from "../Anima.js"

import fs from 'fs'
import path from 'path'
import PromptManager from "../Anima/PromptManager.js"

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
    private static NUM_RESPONSES = 0;

    CharacterList() {
        return this.characterManager.GetCharacterList()
    }

    SaveCharacter(character) {
        this.characterManager.SaveCharacter(character)
    }

    DeleteCharacter(id) {
        this.characterManager.DeleteCharacter(id)
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

        let response = await GoogleGenAI.SendMessage(prompt)
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

    SendBroadcast(ids, speaker, text, callback) {
        SET_DEBUG(true)

        let formIds = []
        let voiceTypes = []

        for(let i in ids) {
            formIds.push(0)
            voiceTypes.push("MaleNord")
        }

        BroadcastManager.SetCharacters(ids, formIds, voiceTypes)
        new BroadcastManager(null).Say(text, speaker, null, speaker)

        let numResponses = 0
        let responses = []

        EventBus.GetSingleton().removeAllListeners('WEB_BROADCAST_RESPONSE')
        EventBus.GetSingleton().on('WEB_BROADCAST_RESPONSE', (speaker, message) => {
            responses.push(ids[speaker] + ": " + (message ? message : " ==NOT ANSWERED=="))
            if(++numResponses == ids.length) {
                numResponses = 0
                callback(responses.join('\n==========\n'))
                setTimeout(() => {
                    SET_DEBUG(false)
                }, 5000)             
            }
        })
    }

    PrepareDataset() {
        const raw_dataset = JSON.parse(fs.readFileSync(path.resolve("./skyrim_dataset_raw.json"), 'utf-8'));

        let final_data = []
        let count = 0
        raw_dataset.forEach((d) => {
            const character_1 = this.characterManager.GetCharacter(d[0].character_1.toLowerCase())
            const text_1 = d[0].text_1
            const text_2 = d[1].text_2

            if(!character_1)
                return

            let prompt = new PromptManager().PrepareDialogueMessage("Uriel", character_1, text_1)
            
            let messages = []
            messages.push({role: 'user', content: prompt}, {role: 'model', content: text_2})
            final_data.push(JSON.stringify({messages: messages}))
            count++
        })

        fs.writeFileSync('skyrim_dataset.jsonl', final_data.join('\n'), 'utf8')
        console.log("Written " + count + " lines.")
        console.log("DONE")
    }
}   
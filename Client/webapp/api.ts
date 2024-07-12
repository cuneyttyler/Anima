import CharacterManager from "../Anima/CharacterManager.js"
import { AudioProcessor } from "../Anima/AudioProcessor.js"
import {MALE_VOICES, FEMALE_VOICES} from './voices.js'
import GoogleGenAI from "../Anima/GoogleGenAI.js"
import fs from 'fs'

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

        let response:string = ""
        try {
            response = await GoogleGenAI.SendMessage(prompt)
        } catch(err) {
            console.error(err)
            throw new CustomError(err, 1)
        }
        
        response = response.replace("json","").replaceAll('```','').replaceAll("\n","")
        try{
            return JSON.parse(response)
        } catch(err) {
            console.error("ERROR PARSING JSON ==> " + JSON.stringify(response))
            throw new CustomError(err, 2)
        }
    }
}
import CharacterManager from "../Anima/CharacterManager.js"
import { AudioProcessor } from "../Anima/AudioProcessor.js"
import {MALE_VOICES, FEMALE_VOICES} from './voices.js'

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
}
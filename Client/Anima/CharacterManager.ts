import path from "path";
import fs from 'fs';

const CHARACTERS_FILE_PATH = path.resolve("./World/SkyrimCharacters.json")
const CHARACTERS = JSON.parse(fs.readFileSync(CHARACTERS_FILE_PATH, 'utf-8'));

export default class CharacterManager {

    GetUserProfile(profile) {
        if(!fs.existsSync(path.resolve("./Profiles/" + profile + "/profile.txt")))
            return null
        return fs.readFileSync(path.resolve("./Profiles/" + profile + "/profile.txt"), 'utf-8');
    }

    GetCharacterList() {
        return CHARACTERS
    }

    GetCharacter(name) {
        let character = null;
        for(let i in CHARACTERS) {
            if(name.toLowerCase().replaceAll(" ", "_") == CHARACTERS[i].id.toLowerCase().replaceAll(" ", "_")) {
                character = CHARACTERS[i];
                break
            }
        }
        return character;
    }

    SaveCharacter(character) {
        let found = false
        for(let i in CHARACTERS) {
            if(CHARACTERS[i].id == character.id) {
                found = true
                CHARACTERS[i] = character
                break
            }
        }
        if(!found) {
            CHARACTERS.push(character)
        }

        fs.writeFileSync(CHARACTERS_FILE_PATH, JSON.stringify(CHARACTERS), 'utf8')
    }

    DeleteCharacter(id) {
        let index = -1
        for(let i in CHARACTERS) {
            if(CHARACTERS[i].id == id) {
                index = parseInt(i)
                break
            }
        }

        if(index == -1) {
            return
        }

        CHARACTERS.splice(index, 1)
        fs.writeFileSync(CHARACTERS_FILE_PATH, JSON.stringify(CHARACTERS), 'utf8')
    }

    
}

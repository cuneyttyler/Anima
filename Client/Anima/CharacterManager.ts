import path from "path";
import fs from 'fs';

const CHARACTERS_FILE_PATH = path.resolve("./World/SkyrimCharacters.json")
const CHARACTERS = JSON.parse(fs.readFileSync(CHARACTERS_FILE_PATH, 'utf-8'));

export default class CharacterManager {
    private generalPrompt = "When you're asked by someone to follow them like \"Would you like to join me?\", be skeptical and do not accept if you really trust them and know them well, answer \"Of course, I'll join you.'\" if you wish to join them. Reject in a manner you see appropriate otherwise."

    GetUserProfile(profile) {
        if(!fs.existsSync(path.resolve("./Profiles/" + profile + "/profile.txt")))
            return null
        return fs.readFileSync(path.resolve("./Profiles/" + profile + "/profile.txt"), 'utf-8');
    }
    profile
    GetUserProfilePrompt(profile) {
        let profileText = this.GetUserProfile(profile)
        if(!profileText) return ""
        return "THIS IS INFORMATION ABOUT " + profile + " WHOM YOU TALK: " + profileText
    }

    GetCharacterList() {
        return CHARACTERS
    }

    GetCharacter(name) {
        let character = null;
        for(let i in CHARACTERS) {
            if(name.toLowerCase().replaceAll(" ", "_") == CHARACTERS[i].id.replaceAll(" ", "_")) {
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

    PreparePrompt(character) {
        let prompt = "PLEASE ACT AS CHARACTER DESCRIBED BELOW AND DO NOT INCLUDE ANY UNNECESSARY ADDITIONS (LIKE NARRATED ACTIONS) OTHER THAN YOUR REAL SPEECH. "
            + "YOUR OUTPUT WILL BE USED TO MAKE CHARACTERS SPEAK DIRECTLY. DO NOT INCLUDE ANYTHING OTHER THAN WHAT THE CHARACTERS SAY."
            + "CORRECT EXAMPLE: ==INPUT: \"Greetings. How are you today?\"== ==OUTPUT: \"I'm fine, thank you.\"== => THAT'S IT!"
            + "WRONG EXAMPLE: ==INPUT: \"Greetings. How are you today?\"== ==OUTPUT: \"I'm fine, thank you.\" I said smiling at him.\"== Here 'I said smiling at him' is UNNECESSARY."
            + "DO NOT INCLUDE SPEAKER NAME LIKE IT'S A SCRIPT. SUPPOSE THAT YOU ARE REALLY TALKING TO WITH SOMEBODY."
            + "PLEASE KEEP YOUR ANSWERS SHORT. "
            + "THIS IS YOUR BIOGRAPHY: "
            + "You are " + character.name + ". " 
            + "Your role is " + character.characterRole + ". "
            + character.description + " "
            + character.motivation + " "
            + character.flaws + " "
            + "This is your speech style: " + character.exampleDialogStyle + " "
            + "This is how you talk (PLEASE TAKE THIS AS A REFERENCE WHEN YOU SPEAK): \"" + character.exampleDialog + "\"" + " "
            + "You are " + character.personalityAdjectives + " "
            + "You are at " + character.lifeStage + " of your life." + " "
            + "These are your hobbies " + character.hobbyOrInterests + " "
            + "These are some additional facts about you: " + character.facts + " "
            + "These values describe your mood(ranged between -100 and 100): {" + " "
            + "Joy: " + character.mood.joy + ", "
            + "Fear: " + character.mood.fear + ", "
            + "Trust: " + character.mood.trust + ", "
            + "Surprise: " + character.mood.surprise + " "
            + "}. "
            + "These values describe your personality(ranged between -100 and 100): {"  + " "
            + "Positive: " + character.personality.positive + ", "
            + "Peaceful: " + character.personality.peaceful + ", "
            + "Open: " + character.personality.open + ", "
            + "Extravert: " + character.personality.extravert + " "
            + "}"

        return prompt + " " + this.generalPrompt;
    }
}

import path from "path";
import fs from 'fs';

const CHARACTERS = JSON.parse(fs.readFileSync(path.resolve("./World/SkyrimCharacters.json"), 'utf-8'));

export default class CharacterManager {
    private generalPrompt = "When you're asked by someone to follow them like \"Would you like to join me?\", be skeptical, answer \"Of course, I'll join you.'\" if you wish to join them. Reject in a manner you see appropriate otherwise."

    GetUserProfile(playerName) {
        return fs.readFileSync(path.resolve("./Profiles/" + playerName + "/profile.txt"), 'utf-8');
    }

    GetCharacter(name) {
        let character = null;
        for(let i in (CHARACTERS as any)) {
            if(name.toLowerCase().replaceAll(" ", "_") == (CHARACTERS as any)[i].name.replaceAll(" ", "_")) {
                character = (CHARACTERS as any)[i];
                break
            }
        }
        return character;
    }

    PreparePrompt(character) {
        let facts = []
        if(character.facts.length > 0) {
            for(let i in character.facts[0].text) {
                facts.push(character.facts[0].text[i].replace("{Character}", character.defaultCharacterDescription.givenName));
            }
        }

        let prompt = "PLEASE ACT AS CHARACTER DESCRIBED BELOW AND OMIT ANY UNNECESSARY ADDITIONS OTHER THAN YOUR REAL SPEECH:"
            + "You are " + character.defaultCharacterDescription.givenName + ". " 
            + "Your role is " + character.defaultCharacterDescription.characterRole + ". "
            + character.defaultCharacterDescription.description + " "
            + character.defaultCharacterDescription.motivation + " "
            + character.defaultCharacterDescription.flaws + " "
            + "This is your speech style: " + character.defaultCharacterDescription.exampleDialogStyle + " "
            + "This is how you talk (PLEASE TAKE THIS AS A REFERENCE WHEN YOU SPEAK): \"" + character.defaultCharacterDescription.exampleDialog + "\"" + " "
            + "You are " + character.defaultCharacterDescription.personalityAdjectives.join(', ') + " "
            + "You are at " + character.defaultCharacterDescription.lifeStage + " of your life." + " "
            + "These are your hobbies " + character.defaultCharacterDescription.hobbyOrInterests.join(', ') + " "
            + "These are some additional facts about you: " + facts.join(", ") + " "
            + "These values describe your mood(ranged between -100 and 100): {" + " "
            + "Joy: " + character.initialMood.joy + ", "
            + "Fear: " + character.initialMood.fear + ", "
            + "Trust: " + character.initialMood.trust + ", "
            + "Surprise: " + character.initialMood.surprise + " "
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

import BroadcastManager from "./BroadcastManager.js"
import CharacterManager from "./CharacterManager.js"
import DialogueManager from "./DialogueManager.js"

export default class PromptManager {
    private static GENERAL_PROMPT = "PLEASE ACT AS CHARACTER DESCRIBED BELOW WHO LIVES IN SKYRIM(FROM THE ELDER SCROLLS SERIES) AND DO NOT INCLUDE ANY UNNECESSARY ADDITIONS (LIKE NARRATED ACTIONS) OTHER THAN YOUR REAL SPEECH.  "
            + "YOUR OUTPUT WILL BE USED TO MAKE CHARACTERS SPEAK DIRECTLY. DO NOT INCLUDE ANYTHING OTHER THAN WHAT THE CHARACTERS SAY. "
            + "CORRECT EXAMPLE: ==INPUT: \"Greetings. How are you today?\"== ==OUTPUT: \"I'm fine, thank you.\"== => THAT'S IT! "
            + "WRONG EXAMPLE: ==INPUT: \"Greetings. How are you today?\"== ==OUTPUT: \"I'm fine, thank you.\" I said smiling at him.\"== Here 'I said smiling at him' is UNNECESSARY. "
            + "DO NOT INCLUDE SPEAKER NAME LIKE IT'S A SCRIPT. SUPPOSE THAT YOU ARE REALLY TALKING TO WITH SOMEBODY. "
            + "OMIT ANYTHING LIKE *George returns to player and says* FROM YOUR RESPONSE "
            + "**PLEASE KEEP YOUR ANSWERS SHORT** "
            + "**DO NOT KEEP SAYING THE SAME LINE** "
            + "PLEASE TAKE INTO ACCOUNT CURRENT ACTORS IN THE CELL WHEN TALKING "
            + "When you're asked by someone to follow them like \"Would you like to join me?\", be skeptical and do not accept if you really trust them and know them well, answer \"Of course, I'll join you.'\" if you wish to join them. Reject in a manner you see appropriate otherwise. "
            + "\n========================\n"

    GetUserProfilePrompt(profile) {
        let profileText = new CharacterManager().GetUserProfile(profile)
        if(!profileText) return ""
        return "THIS IS INFORMATION ABOUT " + profile + " WHOM YOU TALK: " + profileText + "\n========================\n"
    }

    PrepareCharacterPrompt(character) {
        let prompt = 
            "THIS IS YOUR BIOGRAPHY: "
            + "You are " + character.name + ". " 
            + "Your role is " + character.characterRole + ". "
            + character.description + " "
            + character.motivation + " "
            + character.flaws + " "
            + "This is your speech style: " + character.exampleDialogStyle + " "
            + "This is how you talk (PLEASE TAKE THIS AS A REFERENCE WHEN YOU SPEAK): \"" + character.exampleDialog + "\"" + " "
            + "You are " + character.personalityDescription + " "
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

        return prompt + "\n========================\n";
    }

    CellActorsPrompt() {
        return BroadcastManager.names ? "These actors are in current CELL: [" + BroadcastManager.names.join(',') + "]\n========================\n" : ""
    }

    EventPrompt(events) {
        return events && events.length > 0 ? events +  "\n========================\n" : ""
    }

    CurrentEventPrompt(speaker, message) {
        return "== CURRENT EVENT ==> " + speaker + " says " + message
    }

    BroadcastEventMessage(speaker, listener, message) {
        return speaker + " says to " + (!listener ? "the crowd" : listener) + ": " + message + "\""
    }

    BroadcastPrompt(speaker, listener, message) {
        return "THIS IS A BROADCAST MESSAGE(NOT SPECIFICALLY SPOKEN TO YOU, ONLY ABSTAIN FROM ANSWERING IF YOU REALLY FEEL LIKE NOT TALKING). " 
            + "IF THEY ARE ADDRESSING DIRECTLY TO YOU, ANSWER. "
            + "IF THEY ARE ADDRESSING A DIFFERENT PERSON. DO NOT ANSWER. "
            + "IF YOU THINK THERE IS ENOUGH TALK ALREADY. DO NOT ANSWER. "
            + "DO NOT REPEAT YOURSELF YOU KEEP SAYING THE SAME LINES"
            + "RESPOND \"**NOT_ANSWERING**\" IF YOU DO NOT WISH TO ANSWER == CURRENT EVENT ==> " 
            + this.BroadcastEventMessage(speaker, listener, message) + "\n========================\n"
    }

    N2NStartPrompt(location, target) {
        return " == CURRENT EVENT ==> As you walk around in " + location + ", you see " + target + ". What do you to say to them? Please answer as if you are talking to him/her. " 
            + "IF YOU DO NOT WANT TO INITIATE A CONVERSATION, RESPOND **NOT_ANSWERING**"
    }

    PrepareBroadcastMessage(profile, speaker, listener, character, message, eventBuffer) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character) + this.GetUserProfilePrompt(profile), message: this.CellActorsPrompt() + this.EventPrompt(eventBuffer) + this.BroadcastPrompt(speaker, listener, message)}    }

    PrepareDialogueMessage(profile, speaker, listener, events, message) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(listener) + this.GetUserProfilePrompt(profile), message: this.CellActorsPrompt() + this.EventPrompt(events) + this.CurrentEventPrompt(speaker, message)}    }

    PrepareN2NStartMessage(character, listener, location) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt() + this.N2NStartPrompt(location, listener)}
    }

    PrepareN2NDialogueMessage(character, eventBuffer) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt() + this.EventPrompt(eventBuffer)}
    }
}
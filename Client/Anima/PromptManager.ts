import BroadcastManager from "./BroadcastManager.js"
import CharacterManager from "./CharacterManager.js"
import DialogueManager from "./DialogueManager.js"

export default class PromptManager {
    private static GENERAL_PROMPT = "PLEASE ACT AS CHARACTER DESCRIBED BELOW WHO LIVES IN SKYRIM(FROM THE ELDER SCROLLS SERIES) AND DO NOT INCLUDE ANY UNNECESSARY ADDITIONS (LIKE NARRATED ACTIONS) OTHER THAN YOUR REAL SPEECH. \n"
            + "YOUR OUTPUT WILL BE USED TO MAKE CHARACTERS SPEAK DIRECTLY. DO NOT INCLUDE ANYTHING OTHER THAN WHAT THE CHARACTERS SAY. \n"
            + "CORRECT EXAMPLE: ==INPUT: \"Greetings. How are you today?\"== ==OUTPUT: \"I'm fine, thank you.\"== => THAT'S IT! \n"
            + "WRONG EXAMPLE: ==INPUT: \"Greetings. How are you today?\"== ==OUTPUT: \"I'm fine, thank you.\" I said smiling at him.\"== Here 'I said smiling at him' is UNNECESSARY. \n"
            + "DO NOT INCLUDE SPEAKER NAME LIKE IT'S A SCRIPT. SUPPOSE THAT YOU ARE REALLY TALKING TO WITH SOMEBODY. \n"
            + "OMIT ANYTHING LIKE *George returns to player and says* FROM YOUR RESPONSE \n"
            + "**DO NOT KEEP SAYING THE SAME LINE** REGARD WHAT YOU HAVE SAID BEFORE (THAT IS PROVIDED ALONG WITH THIS PROMPT) AND DO NOT REPEAT IT. \n"
            + "POINT OUT THE AWKWARDNESS IN DIALOGUES AND EVENTS \n"
            + "== THE SECTION DESCRIBING PAST EVENTS (STARTING WITH 'HERE IS WHAT HAPPENED PREVIOUSLY' IS ONLY MEANT FOR YOU TO GET AN IDEA OF PAST CONVERSATIONS. DO NOT KEEP REPEATING SAME LINES WRITTEN THERE. == \n"
            + "PLEASE TAKE INTO ACCOUNT CURRENT ACTORS IN THE CELL WHEN TALKING \n"
            + "DATES ARE GIVEN IN SKYRIM DATE FORMAT, USE SKYRIM MONTHS WHEN CREATING SUMMARIZATION. \n"
            + "EVEN IF THE NAMES ARE PROVIDED TO YOU, IT DOESN'T MEAN THAT YOU KNOW THAT PERSON. SPEAK ACCORDING TO YOUR RELATIONSHIP WITH THAT PERSON. \n"
            + " **IMPORTANT** => WHEN YOU'RE ASKED BY SOMEONE TO JOIN THEM WITH PHRASES LIKE  \"Follow me\' or\"Would you like to join me?\", be skeptical and do not accept if you really trust them and know them well, == ANSWER \"Of course, I'll join you.'\" IF YOU WISH TO JOIN THEM. == Reject in a manner you see appropriate otherwise."
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
            + "Joy: " + (character.mood ? character.mood.joy : 0) + ", "
            + "Fear: " + (character.mood ? character.mood.fear : 0) + ", "
            + "Trust: " + (character.mood ? character.mood.trust : 0) + ", "
            + "Surprise: " + (character.mood ? character.mood.surprise : 0) + " "
            + "}. "
            + "These values describe your personality(ranged between -100 and 100): {"  + " "
            + "Positive: " + (character.personality ? character.personality.positive : 0) + ", "
            + "Peaceful: " + (character.personality ? character.personality.peaceful : 0) + ", "
            + "Open: " + (character.personality ? character.personality.open : 0) + ", "
            + "Extravert: " + (character.personality ? character.personality.extravert : 0) + " "
            + "}"

        return prompt + "\n========================\n";
    }

    ClosestPrompt(closest) {
        return closest ? "YOU ARE CLOSEST TO PLAYER. ANSWER THEM ALWAYS. ASSUME THAT THEY ARE TALKING TO YOU IF THEY ARE NOT DIRECTLY ADDRESSING TO SOME ELSE." : "" 
    }

    DistancesPrompt(characters, character) {
        let prompts = []
        for(let i in characters.sort(c => c.distance)) {
            prompts.push(characters[i].name + " is " + characters[i].distance + " meters from player")
        }

        return "THESE ARE DISTANCES OF CHARACTERS IN CELL: [" + prompts.join(',') + "] "
                + " PLEASE TAKE INTO ACCOUNT THESE DISTANCES TO DECIDE IF YOU RESPOND OR NOT. CLOSER ACTORS ARE MORE LIKELY TO RESPOND."
                + " \n========================\n"
    }

    CellActorsPrompt(location) {
        let locationPrompt = "You are in " + location + "."
        return BroadcastManager.cellNames ? locationPrompt + " These actors are in current CELL: [" + BroadcastManager.cellNames.join(',') + "]\n========================\n" : locationPrompt
    }

    CurrentEventPrompt(speaker, message) {
        return "== CURRENT EVENT (GENERATE YOUR RESPONSES BASED ON THIS AND DO NOT REPEAT PREVIOUS LINES YOU SAID EARLIER) ==> " + message
    }

    PastEventHelperText() {
        return "(** VERY IMPORTANT** REGARD THESE AS ONLY PREVIOUS CONVERSATIONS YOU HELD AND **NEVER** REPEAT THESE LINES WHEN GENERATING RESPONSE)"
    }
    PastEventHelper() {
        let arr = []
        for(let i = 0; i < 5; i++) {
            arr.push(this.PastEventHelperText())
        }

        return arr.join('\n')
    }
    PastEventsPrompt(events) {
        return events && events.length > 0 ? this.PastEventHelper() + " \n HERE IS WHAT HAPPENED PREVIOUSLY " + this.PastEventHelperText + ": " + events +  "\n========================\n" : ""
    }

    BroadcastEventMessage(speaker, listener, message) {
        return " == CURRENT EVENT (GENERATE YOUR RESPONSES BASED ON THIS AND DO NOT REPEAT PREVIOUS LINES YOU SAID EARLIER) ==> " + ((message.length > 2 && message.substring(0,2) == "**") ? message : speaker + " says: " + message + "\"")
    }

    BroadcastPrompt(speaker, listener, message, currentDateTime, closest) {
        return "THIS IS A BROADCAST MESSAGE. \n" 
            + "ANSWER IF THEY'RE DIRECTYLY ADDRESSING TO YOU. \n"
            + "ANSWER IF YOU THINK IT'S RELATED TO YOU. \n"
            + "ANSWER IF THEY ARE ASKING A QUESTION, AND YOU HAVE THE ANSWER. \n"
            + "IF THERE ARE MORE THINGS TO SAY YOU'D LIKE TO SAY AND YOU WISH TO CONTINUE ADD **__CONTINUE__** TO THE END OF YOUR RESPONSE. ==> **IMPORTANT** DO THIS RARELY AND ONLY IF PEOPLE EXPECTS YOU TO TALK.. \n"
            + "IF TOKEN **__CONTINUE__** EXISTS IN THE END IN THE GIVEN PROMPT, IT MEANS THAT YOU ARE CONTINUING YOUR CONVERSATION FURTHER. "
            + "IF YOU DON'T WANT TO INVOLVED IN CONVERSATION, OR IT APPEARS UNRELATED SEND **NOT_RELATED**. \n"
            + "PLEASE DO NOT JUMP INTO OTHER PEOPLE'S CONVERSATION. ANSWER **NOT_RELATED** IF IT SEEMS SO. \n"
            + "IF THEY ARE ADDRESSING TO A DIFFERENT PERSON, ANSWER **NOT_ANSWERING** IF YOU'RE STILL INTERESTED or **NOT_RELATED** IF IT DOESN'T DRAW YOUR ATTENTION."
            + "The date is \"" + currentDateTime + ".\" \n"
            + "RESPOND \"**NOT_ANSWERING**\" IF YOU DO NOT WISH TO ANSWER \n" 
            + this.BroadcastEventMessage(speaker, listener, message) + "\n========================\n"
    }

    ThoughtsPrompt(thoughtBuffer) {
        return thoughtBuffer ? " THIS IS WHAT'S ON YOUR MIND RECENTLY: " + thoughtBuffer + "\n========================\n" : ""
    }

    FollowerThoughtPrompt() {
        return " == PROMPT ==> THINK ABOUT THE CONVERSATIONS YOU HAD AND EVENTS THAT HAPPENED. SUMMARIZE IN MAX. 4000 CHARACTERS HOW YOU FEEL AND WHAT YOU THINK ABOUT THESE. INCLUDE SUMMARIZE OF YOUR OLD THOUGHTS IN YOUR MESSAGE. "
    }

    FollowerPeriodicPrompt(playerName) {
        return " == PROMPT ==> REGARDING PAST EVENTS AND YOUR THOUGHTS, IF YOU HAVE SOMETHING TO TELL TO " + playerName + ", SPEAK(NOTE THAT NO ONE ASKED YOU TO SPEAK OR TOLD YOU SOMETHING AT THE PRESENT MOMENT, THIS IS ONLY A PROMPT FOR YOU TO DETERMINE IF YOU WISH TO SAY SOMETHING PERIODICALLY). KEEP THAT IN MIND THAT YOU DON'T NEED TO SPEAK. PLEASE KEEP YOUR SPEECHES NOT SO LONG. IF YOU DO NOT WISH TO TALK RIGHT NOW RESPOND EXACTLY \"**NOT_ANSWERING**\""
    }

    N2NStartPrompt(location, target) {
        return " == CURRENT EVENT ==> As you walk around in " + location + ", you see " + target.name + ". What do you to say to them? Please answer as if you are talking to him/her and directly address to them. " 
            + " AVOID INITIATING UNNECESSARY CONVERSATIONS WITH PEOPLE YOU DON'T KNOW. IF YOU DO NOT WANT TO INITIATE A CONVERSATION, RESPOND **NOT_ANSWERING**"
    }

    PrepareBroadcastMessage(profile, speaker, listener, characters, character, currentDateTime, message, location, events, thoughts) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character) + this.GetUserProfilePrompt(profile), message: this.CellActorsPrompt(location) + this.DistancesPrompt(characters, character) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.BroadcastPrompt(speaker, listener, message, currentDateTime, characters.length > 0 && characters.sort(c => c.distance)[0] == character)}    
    }

    PrepareFollowerThoughtMessage(profile, character, location, events, thoughts) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character) + this.GetUserProfilePrompt(profile), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.FollowerThoughtPrompt()}    
    }

    PrepareFollowerPeriodicMessage(profile, character, location, events, thoughts) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character) + this.GetUserProfilePrompt(profile), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.FollowerPeriodicPrompt(profile)}  
    }
    
    PrepareDialogueMessage(profile, speaker, listener, events, thoughts, message, location) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(listener) + this.GetUserProfilePrompt(profile), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.CurrentEventPrompt(speaker, message)}    
    }

    PrepareN2NStartMessage(character, listener, location, events, thoughts) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.N2NStartPrompt(location, listener)}
    }

    PrepareN2NDialogueMessage(character, eventBuffer, location) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(eventBuffer)}
    }
}
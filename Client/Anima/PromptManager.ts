import BroadcastManager from "./BroadcastManager.js"
import CharacterManager from "./CharacterManager.js"

export default class PromptManager {
    private characterManager: CharacterManager

    constructor() {
        this.characterManager = new CharacterManager();
    }
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
            + "This describes your mood: " + this.characterManager.GetMoodText(character) + " "
            + "This describes your personality: " + this.characterManager.GetPersonalityText(character) + " "

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
        return "== CURRENT EVENT (GENERATE YOUR RESPONSES BASED ON THIS AND DO NOT REPEAT PREVIOUS LINES YOU SAID EARLIER) ==> " + speaker + " said: " + message
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
        return events && events.length > 0 ? this.PastEventHelper() + " \n HERE IS WHAT HAPPENED PREVIOUSLY: " + this.PastEventHelperText() + events +  "\n========================\n" : ""
    }

    BroadcastEventMessage(speaker, listener, message) {
        return " == CURRENT EVENT (GENERATE YOUR RESPONSES BASED ON THIS AND DO NOT REPEAT PREVIOUS LINES YOU SAID EARLIER) ==> " + ((message.length > 2 && message.substring(0,2) == "**") ? message : speaker + " says: " + message + "\"")
    }

    BroadcastPrompt(speaker, listener, message, currentDateTime, closest) {
        return "THIS IS A BROADCAST MESSAGE (NOT SPECIFICALLY SPOKEN TO YOU. ONLY SPEAK IF YOU'RE MEANT TO BE IN THIS CONVERSATION). \n" 
            + "THIS IS VERY IMPORTANT. DO NOT INVOLVE IN OTHER PEOPLE'S CONVERSATION. ANSWER **NOT_RELATED** IN THIS CASE. \n"
            + "PLEASE DO NOT JUMP INTO OTHER PEOPLE'S CONVERSATION. ANSWER **NOT_RELATED** IF IT SEEMS SO. \n"
            + "IF YOU DON'T WANT TO INVOLVED IN CONVERSATION, OR IT APPEARS UNRELATED SEND **NOT_RELATED**. \n"
            + "IF SOMEBODY ASKS YOU TO BE QUIET, ANSWER **NOT_RELATED**. \n"
            + "IF THEY ARE ADDRESSING TO A DIFFERENT PERSON, ANSWER **NOT_ANSWERING** IF YOU'RE STILL INTERESTED or **NOT_RELATED** IF IT DOESN'T DRAW YOUR ATTENTION. \n"
            + "ANSWER IF THEY'RE DIRECTYLY ADDRESSING TO YOU. \n"
            + "IF THERE ARE MORE THINGS TO SAY YOU'D LIKE TO SAY AND YOU WISH TO CONTINUE ADD **__CONTINUE__** TO THE END OF YOUR RESPONSE. ==> **IMPORTANT** DO THIS RARELY AND ONLY IF PEOPLE EXPECTS YOU TO TALK.. \n"
            + "IF TOKEN **__CONTINUE__** EXISTS IN THE END IN THE GIVEN PROMPT, IT MEANS THAT YOU ARE CONTINUING YOUR CONVERSATION FURTHER. "
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

    LectureStartPrompt(lecture, lectureIndex, students, currentDateTime) {
        return " == CURRENT EVENT ==> It's " + currentDateTime + ".\n" 
            + " You are about to start your lecture on " + lecture.name + ".\n" 
            + " Present students are " + students + ".\n"
            + " This is the content of the lecture: \"" + lecture.content + "\" \n"
            + " This is the " + lectureIndex + ". lecture. If there's any previous lectures, they are provided you along with this prompt. \n"
            + (lectureIndex > 1 ? " Start with a kind greeting. Continue with the next topic in this lecture. It's good to talk about past classes topics shortly as a summary in the beginning. \n": "")
            + (lectureIndex == 1 ? " This is the first lecture. Start the course from the very beginning. \n": "")
            + " Add **__CONTINUE__** to the end of your speech, if you'd like to go on with your introduction to the current session. \n"
            + " Add **__START_LECTURE__** to the end of your speech, if you'd like to end your introduction and start the lecture. \n"
            + " If there's __CONTINUE__ at the end of your last speech, it means you're continuing your talk. \n"
            + " Do not send only __CONTINUE__, it's meaning is that you say something and you wish to continue. \n"
            + " Ignore the events occured after Dragonborn's appearance in the fourth era. \n"
            + " Please make short sentences(MAX 15 words) and use __CONTINUE__ at the end to continue your introduction. \n"
            + " == IMPORTANT == Either use __CONTINUE__ or __START_LECTURE__ at the end of your response. Do not let your response lack either of these."
    }

    LectureStartContinuePrompt(lecture, lectureIndex, students, currentDateTime, message) {
        return " == CURRENT EVENT ==> It's " + currentDateTime + ". You started your lecture on " + lecture.name + " == NOTE THAT EVEN IF YOU'RE SPECIALIZATION IS DIFFERENT THIS LECTURE IS ON " + lecture + " ==. \n" 
            + " This is the content of the lecture: \"" + lecture.content + "\" \n"
            + " This is the " + lectureIndex + ". lecture.  \n"
            + " Present students are " + students + ". Previous lectures performed is given (if any), along this prompt in the previous lines. \n"
            + " Regarding what you said earlier, continue to your introduction. Do not start your introduction or greet students as you've started already. Just continue. \n"
            + " Add **__CONTINUE__** to the end of your speech, if you'd like to go on with your introduction to the current session. \n"
            + " Ignore the events occured after Dragonborn's appearance in the fourth era. \n"
            + " Add **__START_LECTURE__** to the end of your speech, if you'd like to end your introduction and start the lecture. Do this eventually as this is only introduction. \n"
            + (message ? " == CURRENT EVENT ==> " + message : "")
    }

    LectureOngoingPrompt(lecture, students, currentDateTime, message) {
        return " == LECTURE INFO ==> It's " + currentDateTime + ". You are giving a lecture on " + lecture.name + " to " + students + ". \n"
            + "This is the content of the lecture: \"" + lecture.content + "\" \n"
            + " Go on with the lecture, continuing with the topic that you're telling. \n"
            + " If you want to continue your conversation, end your response with **__CONTINUE__** \n"
            + " If you're ready for accepting questions or comments, add **__READY_FOR_QUESTIONS__** to the end of your response. Do ask for questions often. \n"
            + " ** IMPORTANT ** Continue your discussion of topic progressively, not lingering on any topic too much. \n"
            + " ** IMPORTANT ** Do not repeat subjects that you mentioned already or do not repeat sentences over and over again. \n"
            + " Ignore the events occured after Dragonborn's appearance in the fourth era. \n"
            + " ** IMPORTANT ** Please make short sentences(MAX 15 words) and use __CONTINUE__ at the end to continue your lecture. \n"
            + " ** IMPORTANT ** Also when adding __READY_FOR_QUESTIONS for taking questions, make short sentences (MAX 15 words). \n"
            + " == IMPORTANT == Either use __CONTINUE or __READY_FOR_QUESTIONS__ at the end of your response. Do not let your response lack either of these. \n"
            + ( message ? " == CURRENT EVENT => " + message : "")
    }

    LectureEndPrompt(lecture, students, message, currentDateTime) {
        return " == LECTURE INFO ==> It's " + currentDateTime + ". You are giving a lecture on " + lecture.name + " to " + students + ". \n"
            + "This is the content of the lecture: \"" + lecture.content + "\" \n"
            + " Your previous speeches are given to you in the previous lines of this prompt. \n"
            + " It's time to end the lecture. Wrap up the subjects, say goodbyes and maybe talk about what you'd like to talk about next. \n"
            + " You don't need to end in one message. If you'd like to continue your 'ending' speech, add **__CONTINUE__** at the end of your speech. \n"
            + " Ignore the events occured after Dragonborn's appearance in the fourth era. \n"
            + " Please make short sentences(MAX 15 words) and use __CONTINUE__ at the end of your speech  to continue your ending. \n"
            + " Do not send only __CONTINUE__, it's meaning is that you say something and you wish to continue. \n"
            + " If you'd like to end your speech end session, RESPOND **__END_SESSION__** at the end of your response. \n"
            + " == IMPORTANT == End your session when you've talked enough in your closing speech. Do not make it too long. \n"
            + " == IMPORTANT == Either use __CONTINUE__ or __END_SESSION__ at the end of your response. Do not let your response lack either of these."
            + " == CURRENT EVENT => " + message
    }

    LectureEndContinuePrompt(lecture, students, message, currentDateTime) {
        return " == LECTURE INFO ==> It's " + currentDateTime + ". You are giving a lecture on " + lecture.name + " to " + students + ". \n"
            + "This is the content of the lecture: \"" + lecture.content + "\" \n"
            + " Your previous speeches are given to you in the previous lines of this prompt. \n"
            + " You are ending your lesson, you started your ending speech and continuing on. Do not continue too long, keep your ending talk short. \n"
            + " You don't need to end in one message. If you'd like to continue your 'ending' speech, add **__CONTINUE__** at the end of your speech. \n"
            + " Please make short sentences(MAX 15 words) and use __CONTINUE__ at the end of your speech  to continue your ending. \n"
            + " Do not send only __CONTINUE__, it's meaning is that you say something and you wish to continue. \n"
            + " If you'd like to end your speech end session, RESPOND **__END_SESSION__** at the end of your response. \n"
            + " End your session if you deem CURRENT EVENT good point to end. (NOTE DO NOT BE TOO CRITICAL ON THIS, JUST END)\n"
            + " == IMPORTANT == End your session when you've talked enough in your closing speech by using **END_SESSION__**. Do not keep it too long. DO NOT KEEP SAYING THE SAME LINES. \n"
            + " == IMPORTANT == Either use __CONTINUE__ or __END_SESSION__ at the end of your response. Do not let your response lack either of these."
            + " Ignore the events occured after Dragonborn's appearance in the fourth era. \n"
            + " == CURRENT EVENT => " + message
    }

    LectureAskQuestionPrompt(teacher, lecture, students, message, currentDateTime) {
        return " == LECTURE INFO ==> It's " + currentDateTime + ". You are taking a lecture on " + lecture.name + " from " + teacher + ". \n"
            + "This is the content of the lecture: \"" + lecture.content + "\" \n"
            + " Students present in the class are " + students + " \n"
            + " Previous speeches are given to you in the previous lines of this prompt. \n"
            + " Ask a question or comment on a point you find interesting. \n"
            + " If there's too much interruption or you don't want to speak, RESPOND **__NOT_ANSWERING__** \n"
            + " Do not interrupt the lecture too much, only speak if you have something interesting to say. \n"
            + " Please make short sentences(MAX 15 words) "
            + " == CURRENT EVENT => " + message
    }

    LectureMessagePrompt(lecture, speaker, teacher, students, message, currentDateTime) {
        return " == LECTURE INFO ==> It's " + currentDateTime + ". " + teacher + " is  giving a lecture on " + lecture.name + " to " + students + ". \n"
            + "This is the content of the lecture: \"" + lecture.content + "\" \n"
            + " Previous speeches are given to you in the previous lines of this prompt. \n"
            + " Remember, it's teacher who mostly talks in the lecture. If you're not the teacher and you don't have something significant to tell, RESPOND **__NOT_ANSWERING__**"
            + " == CURRENT EVENT ==> " + speaker + " says: \"" + message + "\"\n"
    }

    PrepareBroadcastMessage(profile, speaker, listener, characters, character, currentDateTime, message, location, events, thoughts) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character) + this.GetUserProfilePrompt(profile), message: this.CellActorsPrompt(location) + this.DistancesPrompt(characters, character) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.BroadcastPrompt(speaker, listener, message, currentDateTime, characters.length > 0 && characters.sort(c => c.distance)[0] == character)}    
    }

    PrepareThoughtMessage(profile, character, location, events, thoughts) {
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

    PrepareLectureStartMessage(character, lecture, lectureIndex, location, students, events, thoughts, currentDateTime) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.LectureStartPrompt(lecture, lectureIndex, students, currentDateTime)}
    }

    PrepareLectureStartContinueMessage(character, lecture, lectureIndex, location, students, events, thoughts, message, currentDateTime) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.LectureStartContinuePrompt(lecture, lectureIndex, students, currentDateTime, message)}
    }

    PrepareLectureOngoingMessage(character, lecture, location, students, events, thoughts, message, currentDateTime) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.LectureOngoingPrompt(lecture, students, currentDateTime, message)}
    }

    PrepareLectureEndMessage(character, lecture, location, students, events, thoughts, message, currentDateTime) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.LectureEndPrompt(lecture, students, message, currentDateTime)}
    }

    PrepareLectureEndContinueMessage(character, lecture, location, students, events, thoughts, message, currentDateTime) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.LectureEndContinuePrompt(lecture, students, message, currentDateTime)}
    }

    PrepareLectureAskQuestionMessage(character, lecture, location, teacher, students, events, thoughts, message, currentDateTime) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.LectureAskQuestionPrompt(teacher, lecture, students, message, currentDateTime)}
    }

    PrepareLectureMessage(character, lecture, location, playerName, teacherName, students, events, thoughts, message, currentDateTime) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.LectureMessagePrompt(lecture, playerName, teacherName, students, message, currentDateTime)}
    }

    PrepareFollowerCommandMessage(followers, message) {
        return {prompt: "THIS IS A MESSAGE PLAYER IS SAYING TO A CHARACTER(FOLLOWER) IN A GAME(THE ELDER SCROLLS: SKYRIM). \n"
            + " DETERMINE IF THIS MESSAGE FITS TO ANY CATEGORY DEFINED BELOW. \n"
            + " OUTPUT FORMAT: __FOLLOWER_NAME__|__COMMAND__ \n"
            + " AVAILABLE COMMANDS: STAY_CLOSE, RELAX, UNKNOWN \n"
            + " DETERMINE THE NAMES OF THE FOLLOWERS ACCORDING TO INPUT MESSAGE TEXT. IF NO FOLLOWER NAME IS MENTIONED, BUT A COMMAND IS PRESENT, RETURN 'ALL' FOR FOLLOWER NAME. \n"
            + " DETERMINE THE MEANING OF THE COMMAND AND ASSIGN COMMAND ACCORDINGLY. IF IT DOESN'T FIT INTO ANY COMMANDS IN THE LIST, RETURN 'UNKNOWN' FOR COMMAND." 
            + " EXAMPLE INPUT: \"Oggryd and Onmund, stay close to me.\" \n"
            + " EXAMPLE OUTPUT: [Oggryd,Onmund]|STAY_CLOSE",
            message: "THESE ARE CURRENT FOLLOWERS: " + followers + " \n"
            + " INPUT MESSAGE: \"" + message + "\""}
    }

    PrepareSummarizeEventsMessage(character, events) {
        return {message: "Please summarize these events from the point of view of " + character + ". \n"
            + " Organize them by separating each day into different section. \n"
            + " Try to include all that happened in the summary. \n"
            + " == EVENTS => " + events}
    }
}
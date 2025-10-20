import BroadcastManager from "./BroadcastManager.js"
import CharacterManager from "./CharacterManager.js"

export default class PromptManager {
    private characterManager: CharacterManager

    constructor() {
        this.characterManager = new CharacterManager();
    }
    private static GENERAL_PROMPT = "Please act as character described below who lives in skyrim(from the elder scrolls series) and do not include any unnecessary additions (like narrated actions) other than your real speech. \n"
            + "Your output will be used to make characters speak directly. Do not include anything other than what the characters say. \n"
            + "Correct example: ==input: \"Greetings. How are you today?\"== ==output: \"I'm fine, thank you.\"== => that's it! \n"
            + "Wrong example: ==input: \"Greetings. How are you today?\"== ==output: \"I'm fine, thank you.\" I said smiling at him.\"== here 'I said smiling at him' is unnecessary. \n"
            + "Do not include speaker name like it's a script. Suppose that you are really talking to with somebody. \n"
            + "Omit anything like *george returns to player and says* from your response \n"
            // + "**do not keep saying the same line** regard what you have said before (that is provided along with this prompt) and do not repeat it. \n"
            // + "== the section describing past events (starting with 'here is what happened previously' is only meant for you to get an idea of past conversations. Do not keep repeating same lines written there. == \n"
            + "Please take into account current actors in the cell. \n"
            + "Even if the names are provided to you, it doesn't mean that you know that person. Speak according to your relationship with that person. \n"
            + " be realistic as much as possible. Do not sound like a chat bot. \n"
            + " **important** => when you're asked by someone to join them with phrases like  \"Follow me\' or\"Would you like to join me?\", be skeptical and do not accept if you really trust them and know them well, == answer \"Of course, I'll join you.'\" if you wish to join them. == reject in a manner you see appropriate otherwise."
            + " **important** => please keep your answers as short as possible.\n"
            + " try to say something interesting. \n"
            + " do not't repeat old lines. Try to be creative and progressive."
            + "\n========================\n"

    GetUserProfilePrompt(profile) {
        let profileText = this.characterManager.GetUserProfile(profile)
        if(!profileText) return ""
        return "THIS IS INFORMATION ABOUT " + profile + " WHOM YOU TALK: " + profileText + "\n========================\n"
    }

    PrepareCharacterPrompt(character) {
        let prompt = 
            "This is your biography: "
            + "You are " + character.name + ". " 
            + "Your role is " + character.characterRole + ". "
            + character.description + " "
            + character.motivation + " "
            + character.flaws + " "
            + "This is your speech style: " + character.exampleDialogStyle + " "
            + "This is your speech style (please take this as just a reference when you speak, do not use these lines directly): \"" + character.exampleDialog + "\"" + " "
            + "You are " + character.personalityDescription + " "
            + "You are at " + character.lifeStage + " of your life." + " "
            + "These are your hobbies " + character.hobbyOrInterests + " "
            + "These are some additional facts about you: " + character.facts + " "
            + "This describes your mood: " + this.characterManager.GetMoodText(character) + " "
            + "This describes your personality: " + this.characterManager.GetPersonalityText(character) + " "

        return prompt + "\n========================\n";
    }

    ClosestPrompt(closest) {
        return closest ? "You are closest to player. Answer them always. Assume that they are talking to you if they are not directly addressing to some else." : "" 
    }

    DistancesPrompt(characters, character) {
        let prompts = []
        for(let i in characters.sort(c => c.distance)) {
            prompts.push(characters[i].name + " is " + characters[i].distance + " meters from player")
        }

        return "These are distances of characters in cell: [" + prompts.join(',') + "] "
                + " please take into account these distances to decide if you respond or not. Closer actors are more likely to respond."
                + " \n========================\n"
    }

    CellActorsPrompt(location) {
        let locationPrompt = "You are in " + location + "."
        return BroadcastManager.cellNames ? locationPrompt + " These actors are in current CELL: [" + BroadcastManager.cellNames.join(',') + "]\n========================\n" : locationPrompt
    }

    CurrentEventPrompt(speaker, message) {
        return "== CURRENT EVENT => " + speaker + " said: " + message
    }

    PastEventsPrompt(events) {
        // events = events.substring(events.length / 2, events.length - 1)
        return events && events.length > 0 ? "\n Here is what happened previously (Use these as a reference and don't repeat these lines.): " + events +  "\n=====\n  \n========================\n" : ""
    }

    PastLecturesPrompt(events) {
        return events && events.length > 0 ? "\n Here is what has been thaught in this lecture previously. (do not teach the same things, continue with the next topic): " + events +  "\n========================\n" : ""
    }

    BroadcastEventMessage(speaker, listener, message) {
        return " == Current event (** very important ** => generate your responses based on this part and do not repeat previous lines you said earlier) ==> " + ((message.length > 2 && message.substring(0,2) == "**") ? message : speaker + " says: " + message + "\" " + (listener ? " to " + listener : ""))
    }

    BroadcastPrompt(speaker, listener, message, currentDateTime, closest) {
        return "This is a broadcast message (not specifically spoken to you. Only speak if you want to). \n" 
            + "This is very important. Do not involve in other people's conversation. Answer **__not_related__** in this case. \n"
            + "Please do not jump into other people's conversation. Answer **not_related** if it seems so. \n"
            + "If you don't want to involved in conversation, or it appears unrelated send **__not_related__**. \n"
            + "If you wan't to quit conversation respond **__not_related__** \n"
            + "Answer if they're directyly addressing to you. \n"
            + "If you're being addressed directly, answer most of the time unless you really don't want to talk \n"
            // + "If there are more things to say you'd like to say and you wish to continue add **__continue__** to the end of your response. ==> **important** do this rarely and only if people expects you to talk.. \n"
            // + "If token **__continue__** exists in the end in the given prompt, it means that you are continuing your conversation further. "
            + "The date is \"" + currentDateTime + ".\" \n"
            + "Respond \"**not_answering**\" if you do not wish to answer \n" 
            + this.BroadcastEventMessage(speaker, listener, message) + "\n========================\n"
    }
    
    N2NStartPrompt(topics, location, target) {
        return "Start a conversation with " + target.name + " considering what you talked earlier. Select a topic from the following list: {" + topics + "}. RESPOND __NOT_ANSWERING__ if you do not wish to initiate a conversation. Location: " + location
    }

    BroadcastN2NPrompt(speaker, listener, message, currentDateTime, closest, ending) {
        return "This is a conversation between other people. You are not directly spoken to. \n" 
            + "Only join conversation and respond if you think the conversation is strictly related to you. \n"
            // + "If there are more things to say you'd like to say and you wish to continue add **__continue__** to the end of your response. ==> **important** do this rarely and only if people expects you to talk.. \n"
            // + "If token **__continue__** exists in the end in the given prompt, it means that you are continuing your conversation further. "
            + "The date is \"" + currentDateTime + ".\" \n"
            + "A) if speaker is talking to you, answer always. And ignore following two instruction. \n"
            + "(ignore this if (a) is true) => respond \"**__not_answering__**\" if you do not wish to answer \n" 
            + "(ignore this if (a) is true) => respond \"**__not_related__**\" if you do not wish to join the conversation \n" 
            + "If you wan't to quit the conversation respond **__not_related__quit__** \n"
            + this.BroadcastEventMessage(speaker, listener, message) + "\n========================\n"
    }

    BroadcastN2NPrompt_MustTalk(speaker, listener, message, currentDateTime, closest, ending) {
        return "This is a message directly being spoken to you. \n"
            + "This is a conversation between you and " + speaker.Name + ". If you want to end conversation use __n2n_end__ at the end of your response. Don't end conversation while you're asking questions. Please use some concluding words before ending your conversation. Do not only include __n2n_end__."
            // + "IF THERE ARE MORE THINGS TO SAY YOU'D LIKE TO SAY AND YOU WISH TO CONTINUE ADD **__CONTINUE__** TO THE END OF YOUR RESPONSE. ==> **IMPORTANT** DO THIS RARELY AND ONLY IF PEOPLE EXPECTS YOU TO TALK.. \n"
            // + "IF TOKEN **__CONTINUE__** EXISTS IN THE END IN THE GIVEN PROMPT, IT MEANS THAT YOU ARE CONTINUING YOUR CONVERSATION FURTHER. "
            + "The date is \"" + currentDateTime + ".\" \n"
            // + (ending ? "You are ending conversation. Speak accordingly, and add __ENDING__ at the end of your response. \n" : "")
            + "If you want to end the conversation, speak accordingly, and add __ENDING__ at the end of your response. Note that, anyone else won't talk after you ended conversation. If you are asking questions, do not use __ENDING__ keyword. \n"
            + this.BroadcastEventMessage(speaker, listener, message) + "\n========================\n"
    }

    TriggerPrompt(playerName) {
        return " == CURRENT EVENT => You see " + playerName + ". Is there something you wish to tell him/her? \n"
            + " If so answer, if not RESPOND **__NOT_ANSWERING__**. \n"
            + " Speak only if you have something reasonable to tell and if you know " + playerName + " already. Do not speak in vain."
            + " If you don't know him/her, you can introduce yourself but do this rarely."
    }

    ThoughtsPrompt(thoughtBuffer) {
        return "" // return thoughtBuffer ? " THIS IS WHAT'S ON YOUR MIND RECENTLY: " + thoughtBuffer + "\n========================\n" : ""
    }

    FollowerThoughtPrompt() {
        return " == Prompt ==> think about the conversations you had and events that happened. Summarize in max. 4000 characters how you feel and what you think about these. Include summarize of your old thoughts in your message. "
    }

    FollowerPeriodicPrompt(playerName) {
        return " == Prompt ==> regarding past events and your thoughts, if you have something to tell to " + playerName + ", speak(note that no one asked you to speak or told you something at the present moment, this is only a prompt for you to determine if you wish to say something periodically). Keep that in mind that you don't need to speak. Please keep your speeches not so long. If you do not wish to talk right now respond exactly \"**not_answering**\""
    }

    LectureStartPrompt(lecture, lectureIndex, students, currentDateTime) {
        return " == CURRENT EVENT ==> It's " + currentDateTime + ".\n" 
            + " You are about to start your lecture on " + lecture.name + ".\n" 
            + " Present students are " + students + ".\n"
            + " This is the content of the lecture: \"" + lecture.content + "\" \n"
            + " This is the " + lectureIndex + ". lecture. If there's any previous lectures, they are provided you along with this prompt. Please take into account the appropriate section(lecture index) in the lecture content to present this lecture.\n"
            + (lectureIndex > 1 ? " Start with a kind greeting. Continue with the next topic in this lecture. It's good to talk about past classes topics shortly as a summary in the beginning. \n": "")
            + (lectureIndex == 1 ? " This is the first lecture. Start the course from the very beginning. \n": "")
            + " Add **__CONTINUE__** to the end of your speech, if you'd like to go on with your introduction to the current session. \n"
            + " Add **__START_LECTURE__** to the end of your speech, if you'd like to end your introduction and start the lecture. \n"
            + " If there's __CONTINUE__ at the end of your last speech, it means you're continuing your talk. \n"
            + " Do not send only __CONTINUE__, it's meaning is that you say something and you wish to continue. \n"
            + " Ignore the events occured after Dragonborn's appearance in the fourth era. \n"
            + " == IMPORTANT ==> Please make short sentences(MAX 15 words). <== IMPORTANT == \n"
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
            + " == IMPORTANT ==> Please make short sentences(MAX 15 words). <== IMPORTANT == \n"
            + " Add **__START_LECTURE__** to the end of your speech, if you'd like to end your introduction and start the lecture. Do this eventually as this is only introduction. \n"
            + (message ? " == CURRENT EVENT ==> " + message : "")
    }

    LectureOngoingPrompt(lecture, students, currentDateTime, message) {
        return " == LECTURE INFO ==> It's " + currentDateTime + ". You are giving a lecture on " + lecture.name + " to " + students + ". \n"
            + "This is the content of the lecture: \"" + lecture.content + "\" \n"
            + " Go on with the lecture, continuing with the topic that you're telling. \n"
            + " If you want to continue your conversation, end your response with **__CONTINUE__** \n"
            + " If you're ready for accepting questions or comments, add **__READY_FOR_QUESTIONS__** to the end of your response. Do ask for questions often. \n"
            + " ** IMPORTANT ** Continue your discussion of topic without losing track of what you are teaching. \n"
            + " Do smooth transitions between topics. \n"
            + " ** IMPORTANT ** Do not repeat subjects that you mentioned already or do not repeat sentences over and over again. \n"
            + " Ignore the events occured after Dragonborn's appearance in the fourth era. \n"
            + " == IMPORTANT ==> Please make short sentences(MAX 15 words). <== IMPORTANT == \n"
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
            // + " == IMPORTANT ==> Please make short sentences(MAX 15 words). <== IMPORTANT == \n"
            // + " Do not send only __CONTINUE__, it's meaning is that you say something and you wish to continue. \n"
            // + " If you'd like to end your speech end session, RESPOND **__END_SESSION__** at the end of your response. \n"
            + " RESPOND **__END_SESSION__** at the end of your response. \n"
            // + " == IMPORTANT == End your session when you've talked enough in your closing speech. Do not make it too long. \n"
            // + " == IMPORTANT == Either use __CONTINUE__ or __END_SESSION__ at the end of your response. Do not let your response lack either of these."
            + " == CURRENT EVENT => " + message
    }

    LectureEndContinuePrompt(lecture, students, message, currentDateTime) {
        return " == LECTURE INFO ==> It's " + currentDateTime + ". You are giving a lecture on " + lecture.name + " to " + students + ". \n"
            + "This is the content of the lecture: \"" + lecture.content + "\" \n"
            + " Your previous speeches are given to you in the previous lines of this prompt. \n"
            + " You are ending your lesson, you started your ending speech and continuing on. Do not continue too long, keep your ending talk short. \n"
            + " You don't need to end in one message. If you'd like to continue your 'ending' speech, add **__CONTINUE__** at the end of your speech. \n"
            + " == IMPORTANT ==> Please make short sentences(MAX 15 words). <== IMPORTANT == \n"
            + " Do not send only __CONTINUE__, it's meaning is that you say something and you wish to continue. \n"
            + " If you'd like to end your speech end session, RESPOND **__END_SESSION__** at the end of your response. \n"
            + " End your session if you deem CURRENT EVENT good point to end. (NOTE DO NOT BE TOO CRITICAL ON THIS, JUST END)\n"
            + " == IMPORTANT == End your session when you've talked enough in your closing speech by using **END_SESSION__**. Do not keep it too long. DO NOT KEEP SAYING THE SAME LINES. \n"
            + " == IMPORTANT == ONLY 10% of the time continue your ending speech and 90% of the time, end it with __END_SESSION__ \n"
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
            + " == IMPORTANT ==> Please make short sentences(MAX 15 words). <== IMPORTANT == \n"
            + " == CURRENT EVENT => " + message
    }

    LectureMessagePrompt(lecture, speaker, teacher, students, message, currentDateTime) {
        return " == LECTURE INFO ==> It's " + currentDateTime + ". " + teacher + " is  giving a lecture on " + lecture.name + " to " + students + ". \n"
            + "This is the content of the lecture: \"" + lecture.content + "\" \n"
            + " Previous speeches are given to you in the previous lines of this prompt. \n"
            + " == IMPORTANT ==> Please make short sentences(MAX 15 words). <== IMPORTANT == \n"
            + " Remember, it's teacher who mostly talks in the lecture. If you're not the teacher and you don't have something significant to tell, RESPOND **__NOT_ANSWERING__**"
            + " == CURRENT EVENT ==> " + speaker + " says: \"" + message + "\"\n"
    }

    TopicsPrompt(speaker, listener, location, events) {
        return "In the continent of Tamriel, in Skyrim, " + speaker + " and " + listener + " are about to start a conversation. This is " + speaker + "'s profile: \n"
            + this.PrepareCharacterPrompt(speaker) + "\n. This is " + listener + "'s profile: \n"
            + this.PrepareCharacterPrompt(listener) + "n. This is " + speaker + "'s (speaker) past events: \n"
            + this.PastEventsPrompt(events) + "\n"
            + "Return what " + speaker + " has in mind lately, considering the past events and profile."
    }

    PrepareTopicMessage(profile, speaker, listener, location, events) {
        return {prompt: this.TopicsPrompt(speaker, listener, listener, events), message: ""}
    }

    PrepareBroadcastMessage(profile, speaker, listener, characters, character, currentDateTime, message, location, events, thoughts) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character) + this.GetUserProfilePrompt(profile), message: this.CellActorsPrompt(location) + this.DistancesPrompt(characters, character) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.BroadcastPrompt(speaker, listener, message, currentDateTime, characters.length > 0 && characters.sort(c => c.distance)[0] == character)}    
    }

    PrepareN2NBroadcastMessage(profile, speaker, listener, characters, character, currentDateTime, message, location, events, thoughts, mustTalk, ending) {
        if(mustTalk) {
            return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character) + this.GetUserProfilePrompt(profile), message: this.CellActorsPrompt(location) + this.DistancesPrompt(characters, character) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.BroadcastN2NPrompt_MustTalk(speaker, listener, message, currentDateTime, characters.length > 0 && characters.sort(c => c.distance)[0] == character, ending)}    
    
        } else {
            return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character) + this.GetUserProfilePrompt(profile), message: this.CellActorsPrompt(location) + this.DistancesPrompt(characters, character) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.BroadcastN2NPrompt(speaker, listener, message, currentDateTime, characters.length > 0 && characters.sort(c => c.distance)[0] == character, ending)}    
        }
    }

    PrepareThoughtMessage(profile, character, location, events, thoughts) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character) + this.GetUserProfilePrompt(profile), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.FollowerThoughtPrompt()}    
    }

    PrepareTriggerMessage(profile, character, location, events, thoughts) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character) + this.GetUserProfilePrompt(profile), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.TriggerPrompt(profile)}    
    }

    PrepareFollowerPeriodicMessage(profile, character, location, events, thoughts) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character) + this.GetUserProfilePrompt(profile), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.FollowerPeriodicPrompt(profile)}  
    }
    
    PrepareDialogueMessage(profile, speaker, listener, events, thoughts, message, location) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(listener) + this.GetUserProfilePrompt(profile), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.CurrentEventPrompt(speaker, message)}    
    }

    PrepareN2NStartMessage(character, listener, topics, location, events, thoughts) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(events) + this.ThoughtsPrompt(thoughts) + this.N2NStartPrompt(topics, location, listener)}
    }

    PrepareN2NDialogueMessage(character, eventBuffer, location) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastEventsPrompt(eventBuffer)}
    }

    PrepareLectureStartMessage(character, lecture, lectureIndex, location, students, events, thoughts, currentDateTime) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastLecturesPrompt(events) + this.ThoughtsPrompt(thoughts) + this.LectureStartPrompt(lecture, lectureIndex, students, currentDateTime)}
    }

    PrepareLectureStartContinueMessage(character, lecture, lectureIndex, location, students, events, thoughts, message, currentDateTime) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastLecturesPrompt(events) + this.ThoughtsPrompt(thoughts) + this.LectureStartContinuePrompt(lecture, lectureIndex, students, currentDateTime, message)}
    }

    PrepareLectureOngoingMessage(character, lecture, location, students, events, thoughts, message, currentDateTime) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastLecturesPrompt(events) + this.ThoughtsPrompt(thoughts) + this.LectureOngoingPrompt(lecture, students, currentDateTime, message)}
    }

    PrepareLectureEndMessage(character, lecture, location, students, events, thoughts, message, currentDateTime) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastLecturesPrompt(events) + this.ThoughtsPrompt(thoughts) + this.LectureEndPrompt(lecture, students, message, currentDateTime)}
    }

    PrepareLectureEndContinueMessage(character, lecture, location, students, events, thoughts, message, currentDateTime) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastLecturesPrompt(events) + this.ThoughtsPrompt(thoughts) + this.LectureEndContinuePrompt(lecture, students, message, currentDateTime)}
    }

    PrepareLectureAskQuestionMessage(character, lecture, location, teacher, students, events, thoughts, message, currentDateTime) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastLecturesPrompt(events) + this.ThoughtsPrompt(thoughts) + this.LectureAskQuestionPrompt(teacher, lecture, students, message, currentDateTime)}
    }

    PrepareLectureMessage(character, lecture, location, playerName, teacherName, students, events, thoughts, message, currentDateTime) {
        return {prompt: PromptManager.GENERAL_PROMPT + this.PrepareCharacterPrompt(character), message: this.CellActorsPrompt(location) + this.PastLecturesPrompt(events) + this.ThoughtsPrompt(thoughts) + this.LectureMessagePrompt(lecture, playerName, teacherName, students, message, currentDateTime)}
    }

    PrepareFollowerCommandMessage(followers, message) {
        return {prompt: "This is a message player is saying to a character(follower) in a game(the elder scrolls: skyrim). \n"
            + " determine if this message fits to any category defined below. \n"
            + " output format: __follower_name__|__command__ \n"
            + " available commands: stay_close, relax, unknown \n"
            + " determine the names of the followers according to input message text. If no follower name is mentioned, but a command is present, return 'all' for follower name. \n"
            + " determine the meaning of the command and assign command accordingly. If it doesn't fit into any commands in the list, return 'unknown' for command." 
            + " example input: \"Oggryd and onmund, stay close to me.\" \n"
            + " example output: [oggryd,onmund]|stay_close",
            message: "These are current followers: " + followers + " \n"
            + " Input message: \"" + message + "\""}
    }

    PrepareSummarizeEventsMessage(profile, character, events) {
        return {message: "Please summarize these events from the point of view of " + character + ". \n"
            + " Maximum output token count should be 8000. Please do not exceed this. \n" +
            + " Organize them by separating each day into different section. \n"
            + " In the given text, do not omit any event or speech in the output. Even if somebody says just hello, include it in the sumamry. \n"
            + " Always include what the player(" + profile + ") says."
            + " Try to include all that happened in the summary. \n"
            + " Dates are given in skyrim date format, use skyrim months when creating summarization. \n"
            + " == EVENTS => " + events}
    }
}
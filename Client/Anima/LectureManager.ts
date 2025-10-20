import CharacterManager from './CharacterManager.js';
import PromptManager from './PromptManager.js';
import FileManager from './FileManager.js';
import SKSEController from './SKSEController.js';
import {GoogleGenAIController} from './GenAIController.js';
import EventBus from './EventBus.js';
import { DEBUG } from '../Anima.js'
import { AudioProcessor } from './AudioProcessor.js';

export default class LectureManager{
    private characterManager : CharacterManager;
    private promptManager : PromptManager;
    private fileManager: FileManager;
    private skseController: SKSEController;
    public names = [];
    private formIds = [];
    private voiceTypes = [];
    public location = "Hall of the Elements";
    public currentDateTime;
    private profile;
    private characters = [];
    private lock = { isLocked: false };
    private teacherName : string;
    private teacher;
    private students = [];
    private lecture;
    private lectureIndex : number;
    private paused : boolean = false;
    public running : boolean = true;
    private state = 0;
    private expectingAnswers : number = 0;

    constructor(playerName: string, socket: WebSocket, private audioProcessor: AudioProcessor) {
        this.characterManager = new CharacterManager();
        this.promptManager = new PromptManager();
        this.fileManager = new FileManager();
        this.profile = playerName;
        this.skseController = new SKSEController(socket);

        this.names.push("J'zargo")
        this.formIds.push("115107")
        this.voiceTypes.push("MaleKhajiit")
        this.names.push("Onmund")
        this.formIds.push("115106")
        this.voiceTypes.push("MaleYoungEager")
        this.names.push("Brelyna Maryon")
        this.formIds.push("115108")
        this.voiceTypes.push("FemaleYoungEager")

        EventBus.GetSingleton().removeAllListeners('LECTURE_RESPONSE')
        EventBus.GetSingleton().on('LECTURE_RESPONSE', async (character, message, _continue) => {
            console.log("**College Lectures** Response => " + character.name + ": " + message)
            let _character = this.FindCharacterByName(character.name);
            if(_character) _character.awaitingResponse = false;
            if(message && DEBUG) {
                for(let i in this.characters) {
                    this.fileManager.SaveEventLog(this.characters[i].id, this.characters[i].formId, character.name + " said: " + message, this.profile)
                }
            }
            if(message && !_continue && this.state == 2) {
                await this.WaitUntilPauseEnds();
                await this.Say(character.name + " said: \"" + message + "\"", character.name, character.formId);
            } if(message && !_continue && (this.state == 3 || this.state == 4)) {
                await this.WaitUntilPauseEnds();
                this.SendEndMessage(message ? character.name + " said: " + message : null)
            }
        })

        EventBus.GetSingleton().removeAllListeners('LECTURE_CONTINUE')
        EventBus.GetSingleton().on("LECTURE_CONTINUE", async (character, message) => {
            if(this.state == 0) {
                await this.WaitUntilPauseEnds();
                this.SendStartLecture(message ? character.name + " said: " + message : null)
            } else if(this.state == 1) { 
                await this.WaitUntilPauseEnds();
                await this.ContinueSession(message ? character.name + " said: " + message : null);
            } else if(this.state == 2) {
                await this.WaitUntilPauseEnds();
                let _character = this.FindCharacterByName(character.name)
                if(_character && _character.name) {
                    await this.WaitUntilPauseEnds();
                    await this.Send(_character, null, null, message ? character.name + " said: " + message : null);
                }
            } else if(this.state == 3 || this.state == 4) {
                await this.WaitUntilPauseEnds();
                this.SendEndMessage(message ? character.name + " said: " + message : null)
            }
        })

        EventBus.GetSingleton().removeAllListeners('READY_FOR_QUESTIONS')
        EventBus.GetSingleton().on("READY_FOR_QUESTIONS", async (character, message) => {
            if(!this.running) return;
            await this.WaitUntilPauseEnds();
            await this.SendAskForQuestions(message ? character.name + " said: " + message : null);
        })

        EventBus.GetSingleton().removeAllListeners('START_LECTURE')
        EventBus.GetSingleton().on("START_LECTURE", async () => {
            if(!this.running) return;
            await this.WaitUntilPauseEnds();
            await this.ContinueSession(null);
        })

        EventBus.GetSingleton().removeAllListeners('END_SESSION')
        EventBus.GetSingleton().on("END_SESSION", async () => {
            if(!this.running) return;
            await this.WaitUntilPauseEnds();
            await this.EndSession();
        })

        EventBus.GetSingleton().removeAllListeners('LECTURE_NOT_ANSWERING')
        EventBus.GetSingleton().on("LECTURE_NOT_ANSWERING", async (character) => {
            if(!this.running) return;
            if(this.state == 2 && --this.expectingAnswers == 0) {
                await this.WaitUntilPauseEnds();
                this.ContinueSession(null)
            }
        })
    }

    private async ConnectToCharacters() {
        while (this.lock.isLocked) {
            await new Promise(resolve => setTimeout(resolve, 50));  // Wait and try again
        }
        this.lock.isLocked = true;
        try {
            if(!this.names) return
            console.log(`**College Lectures** Trying to connect to ${this.names.join(', ')}`);
            this.characters = []
            for(let i in this.names) {
                if(!this.names[i] || !this.profile || this.names[i].toLowerCase() == this.profile) continue;
                if(this.names[i].toLowerCase() == this.profile.toLowerCase()) continue;
                (console as any).logToLog(`Trying to connect to ${this.names[i]}`);
                let character = Object.assign({}, this.characterManager.GetCharacter(this.names[i]));
                if (!character) {
                    console.log(`**College Lectures** ${this.names[i]} is not included in DATABASE`);
                    continue
                }
                character.stop = false;
                character.formId = this.formIds[i];
                character.voiceType = this.voiceTypes[i];
                character.voicePitch = character.voicePitch ? parseFloat(character.voicePitch) : 0;
                character.awaitingResponse = false;
                this.fileManager.SaveEventLog(this.names[i], this.formIds[i], "==LECTURE_START== On " + this.currentDateTime + ", you started " + this.lecture.name + " class in the College of Winterhold.", this.profile)
                this.fileManager.SaveLectureLog(this.names[i], this.formIds[i], "==LECTURE_START== On " + this.currentDateTime + ", you started " + this.lecture.name + " class in the College of Winterhold.", this.profile)
                character.eventBuffer = this.fileManager.GetEvents(this.names[i], this.formIds[i], this.profile);
                character.thoughtBuffer = this.fileManager.GetThoughts(this.names[i], this.formIds[i], this.profile);
                character.googleController = new GoogleGenAIController(4, 3, character, character.voiceType,  parseInt(i), this.profile, this.skseController, this.audioProcessor);
                if(character.id && character.name) {
                    this.characters.push(character);
                    if(character.name == this.teacherName) {
                        this.teacher = character
                    } else {
                        this.students.push(character)
                    }
                }
            }
            console.log(`**College Lectures** Connection successful.`);
        } finally {
            this.lock.isLocked = false;
        }
    }

    async StartLecture(teacher, teacherFormId, teacherVoiceType, lectureNo, lectureIndex, currentDateTime) {
        this.lecture = this.DetermineLecture(lectureNo);
        this.lectureIndex = lectureIndex;
        this.teacherName = teacher;
        this.names.push(this.teacherName);
        this.formIds.push(teacherFormId);
        this.voiceTypes.push(teacherVoiceType);
        this.currentDateTime = currentDateTime;

        console.log("**College Lectures** Starting Lecture: " + this.lecture.name)
        await this.ConnectToCharacters()
        this.running = true;
        this.SendStartLecture(null)
    }

    private async SendStartLecture(message) {
        console.log("**College Lectures** Sending Start Lecture")
        if(!message) {
            let prompt = this.promptManager.PrepareLectureStartMessage(this.teacher, this.lecture, this.lectureIndex, this.location, this.StudentNames(), this.fileManager.GetEvents(this.teacher.name, this.teacher.formId, this.profile), this.fileManager.GetThoughts(this.teacher.name, this.teacher.formId, this.profile), this.currentDateTime)
            this.teacher.googleController.Send(prompt)
        } else {
            let prompt = this.promptManager.PrepareLectureStartContinueMessage(this.teacher, this.lecture,  this.lectureIndex, this.location, this.StudentNames(), this.fileManager.GetEvents(this.teacher.name, this.teacher.formId, this.profile), this.fileManager.GetThoughts(this.teacher.name, this.teacher.formId, this.profile), "", this.currentDateTime)
            this.teacher.googleController.Send(prompt)
        }
    }

    async Say(message: string, speakerName : string, speakerFormId: string, isPlayer?: boolean) {
        if(isPlayer) {
            console.log("**College Lectures** Sending to " + this.teacher.name + ", " + this.teacher.voiceType);
            this.Send(this.teacher, speakerName, speakerFormId, message)
            return
        }
        console.log("**College Lectures** Broadcasting ==> " + speakerName + ": \"" + message + "\"");
        this.expectingAnswers += 2
        for(let i in this.characters) {
            if(this.characters[i].name == speakerName) continue
            console.log("**College Lectures** Sending to " + this.characters[i].name + ", " + this.characters[i].voiceType);
            this.Send(this.characters[i], speakerName, speakerFormId, message)
        }
        return true
    }

    private async Send(character, speakerName, speakerFormId, message) {
        console.log("**College Lectures** Sending Message")
        let messageToSend = this.promptManager.PrepareLectureMessage(character, this.lecture, this.location, speakerName, this.teacherName, this.StudentNames(), this.fileManager.GetEvents(character.name, character.formId, this.profile), this.fileManager.GetThoughts(character.name, character.formId, this.profile), message, this.currentDateTime);
        character.googleController.Send(messageToSend);
        character.googleController.SendLookAt(speakerFormId);
    }

    private async SendAskForQuestions(message) {
        if(this.state == 3 || this.state == 4) {
            this.SendEndMessage(message);
        } else {
            console.log("**College Lectures** Asking for questions.");
            this.state = 2;
            for(let i in this.students) {
                console.log("**College Lectures** Sending to " + this.characters[i].name + ", " + this.characters[i].voiceType);
                let messageToSend = this.promptManager.PrepareLectureAskQuestionMessage(this.characters[i], this.lecture, this.location, this.teacherName, this.StudentNames(), this.fileManager.GetEvents(this.characters[i].name, this.characters[i].formId, this.profile), this.fileManager.GetThoughts(this.characters[i].name, this.characters[i].formId, this.profile), message, this.currentDateTime);
                this.characters[i].googleController.Send(messageToSend);
                this.characters[i].googleController.SendLookAt(this.teacher.formId);
            }
        }
        
        return true
    }

    private async ContinueSession(message) {
        console.log("**College Lectures** Continuing session")
        if(this.state == 3 || this.state == 4) {
            this.SendEndMessage(message)
        } else {
            this.state = 1;
            let messageToSend = this.promptManager.PrepareLectureOngoingMessage(this.teacher, this.lecture, this.location, this.StudentNames(), this.fileManager.GetEvents(this.teacher.name, this.teacher.formId, this.profile), this.fileManager.GetThoughts(this.teacher.name, this.teacher.formId, this.profile), "", this.currentDateTime);
            this.teacher.googleController.Send(messageToSend);
            this.teacher.googleController.SendLookAt(this.characters[Math.ceil(Math.random() * 3)].formId) 
        }
    }

    private async SendEndMessage(message) {
        console.log("**College Lectures** Sending end message.")
        if(this.state == 3) {
            let messageToSend = this.promptManager.PrepareLectureEndMessage(this.teacher, this.lecture, this.location, this.StudentNames(), this.fileManager.GetEvents(this.teacher.name, this.teacher.formId, this.profile), this.fileManager.GetThoughts(this.teacher.name, this.teacher.formId, this.profile), message, this.currentDateTime);
            this.teacher.googleController.Send(messageToSend);
        } else {
            let messageToSend = this.promptManager.PrepareLectureEndContinueMessage(this.teacher, this.lecture, this.location, this.StudentNames(), this.fileManager.GetEvents(this.teacher.name, this.teacher.formId, this.profile), this.fileManager.GetThoughts(this.teacher.name, this.teacher.formId, this.profile), message, this.currentDateTime);
            this.teacher.googleController.Send(messageToSend);
        }
        this.state = 4
    }

    async SetEndSignal() {
        console.log("**College Lectures** End Signal")
        this.state = 3
    }

    private EndSession() {
        console.log("**College Lectures** Ending session.")
        this.running = false
        this.state = 5
        this.skseController.Send({type: "end_lecture", message: "end_lecture"})

        for(let i in this.characters) {
            if(!this.characters[i] || !this.characters[i].id) continue;
            setTimeout(async () => {
                const _events = await this.characters[i].googleController.SummarizeEvents(this.characters[i], this.fileManager.GetEvents(this.characters[i].id, this.characters[i].formId, this.profile));
                this.fileManager.SaveEventLog(this.characters[i].id, this.characters[i].formId, _events, this.profile, false);
                this.fileManager.SaveLectureLog(this.characters[i].id, this.characters[i].formId, _events, this.profile, false);
            }, 0)
        }
    }

    private DetermineLecture(no: number) {
        switch (no) {
            case 0: return {name: "History of World and Magic", content: "== THIS IS A LECTURE ON ALL SCHOOLS OF MAGIC, NOT JUST RESTORATION, DON'T TALK ABOUT RESTORATION == PROGRAMME => 1st Lecture: 1st Era World and Magic History. 2nd Lecture: 2nd Era World and Magic History. 2nd Lecture: 3rd Era World and Magic History. 2nd Lecture: 4th Era World and Magic History. 5th Lecture: Recap of history in general through all eras. 6th Lecture: How 1st era events shaped 2nd era events. 7th Lecture: How 2nd era events shaped 3rd era events. 8th Lecture: How 3rd era events shaped 4th era events. 9th Lecture and after: Improvise, take questions and move on accordingly."};
            case 1: return {name: "Illusion Magic", content: "1st Lecture: What is reality regarding Illusion magic? 2nd Lecture: How do we manipulate reality? 3rd Lecture: Explanations through spell examples. 4th Lecture: Examples from history. 5th Lecture and after: Improvise, take questions."};
            case 2: return {name: "Magical Artefacts", content: "1st Lecture: What is a magical artefact? 2nd Lecture: What is magical aura and it's relation to artefacts? 3rd Lecture: Artefact examples throughout history. 4th Lecture: How to determine if an artefact has benign or malign magic? 5th Lecture and after: Improvise, take questions."};
            case 3: return {name: "Destruction Magic", content: "1st Lecture: Introduction to elements of fire, water, air, earth. 2nd Lecture: How do we train our body to be a communicator of destruction magic? 3rd Lecture: How do we draw magickal source from spiritual realms and turn them into destruction magic? 4th Lecture: What is fire magic? 5th Lecture: What is air magic? 6th Lecture: What is water magic? 7th Lecture: Explanations through spell examples. 8th Lecture and after: Improvise, take questions."};
            case 4: return {name: "Restoration Magic", content: "1st Lecture: How does our physical body relates to our spiritual body? 2nd Lecture: Anatomical organs and their relations to spiritual phenomena (fire, water elements and etc) 3rd Lecture: How do we draw life force from spiritual realms and turm them into restoration magic? 4th lecture: Does knowing medicine helps restoration magic? 5th Lecture: Potions and potion making. 6th Lecture: Advanced topics. 7th Lecture and after: Improvise and take questions."};
            case 5: return {name: "Alteration Magic", content: "1st Lecture: What is reality? 2nd Lecture: What is spirutual reality. 3rd Lecture: How do we connect phsyical and spiritual realms? 4th Lecture: How do we alter physical and spiritual realities? 5th Lecture: Alteration spell examples and applications to demonstrate how do we alter reality. 6th Lecture: Advanced topics, examples from history. 7th Lecture and after: Improvise, take questions."};
            case 6: return {name: "Enchantments", content: "1st Lecture: What is an enchantment? 2nd Lecture: How do spiritual realms relate to phyiscal artefacts? 3rd Lecture: How to imbue objects with magic? 4th Lecture: How to imbue objects with magic? 5th Lecture: How to imbue objects with magic? 6th Lecture and after: Improvise, take questions."};
            case 7: return {name: "Conjuration Magic", content: "1st Lecture: Psychic phenomena. 2nd Lecture: How do we communicate with other beings? 3rd Lecture: Spiritual beings and their definitions. 4th Lecture: How does summoning works, what are basic principles? 5th Lecture: Fire atronachs and their spiritual structure. 6th Lecture: Ice atronachs and their spiritual structure. 7th Lecture: Strom atronachs and their spiritual structure. 8th Lecture: Nature spirits and their spiritual structure. 9th Lecture: Necromancy 10th Lecture and after. Improvise, take questions."};
        }
    }

    StudentNames() {
        return this.students.map((s) => s.name).join(', ') + ', ' + this.profile
    }

    Pause() {
        this.paused = true
    }

    private WaitUntilPauseEnds() {
        return new Promise<void>(resolve => {
            const intervalId = setInterval(() => {
                if (!this.paused) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, 100);
        });
    }

    Continue() {
        this.paused = false;
    }

    IsRunning() {
        return this.running;
    }

    private FindCharacterByName(name) {
        return this.characters.find((c) => c.name.replaceAll("'","").toLowerCase() == name.replaceAll("'","").toLowerCase());
    }

    private FindCharacterIndexByName(name) {
        return this.characters.findIndex((c) => c.name.replaceAll("'","").toLowerCase() == name.replaceAll("'","").toLowerCase());
    }
}
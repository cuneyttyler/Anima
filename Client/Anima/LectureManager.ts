import CharacterManager from './CharacterManager.js';
import PromptManager from './PromptManager.js';
import FileManager from './FileManager.js';
import SKSEController from './SKSEController.js';
import {GoogleGenAIController} from './GenAIController.js';
import EventBus from './EventBus.js';
import { DEBUG } from '../Anima.js'

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
    private running : boolean = true;
    private state = 0;
    private expectingAnswers : number = 0;

    constructor(playerName: string, socket: WebSocket) {
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
                character.eventBuffer = this.fileManager.GetLecture(this.names[i], this.formIds[i], this.profile);
                character.thoughtBuffer = this.fileManager.GetThoughts(this.names[i], this.formIds[i], this.profile);
                character.googleController = new GoogleGenAIController(4, 3, character, character.voiceType,  parseInt(i), this.profile, this.skseController);
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
            let prompt = this.promptManager.PrepareLectureStartMessage(this.teacher, this.lecture, this.lectureIndex, this.location, this.StudentNames(), this.fileManager.GetLecture(this.teacher.name, this.teacher.formId, this.profile), this.fileManager.GetThoughts(this.teacher.name, this.teacher.formId, this.profile), this.currentDateTime)
            this.teacher.googleController.Send(prompt)
        } else {
            let prompt = this.promptManager.PrepareLectureStartContinueMessage(this.teacher, this.lecture,  this.lectureIndex, this.location, this.StudentNames(), this.fileManager.GetLecture(this.teacher.name, this.teacher.formId, this.profile), this.fileManager.GetThoughts(this.teacher.name, this.teacher.formId, this.profile), "", this.currentDateTime)
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
        let messageToSend = this.promptManager.PrepareLectureMessage(character, this.lecture, this.location, speakerName, this.teacherName, this.StudentNames(), this.fileManager.GetLecture(character.name, character.formId, this.profile), this.fileManager.GetThoughts(character.name, character.formId, this.profile), message, this.currentDateTime);
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
                let messageToSend = this.promptManager.PrepareLectureAskQuestionMessage(this.characters[i], this.lecture, this.location, this.teacherName, this.StudentNames(), this.fileManager.GetLecture(this.characters[i].name, this.characters[i].formId, this.profile), this.fileManager.GetThoughts(this.characters[i].name, this.characters[i].formId, this.profile), message, this.currentDateTime);
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
            let messageToSend = this.promptManager.PrepareLectureOngoingMessage(this.teacher, this.lecture, this.location, this.StudentNames(), this.fileManager.GetLecture(this.teacher.name, this.teacher.formId, this.profile), this.fileManager.GetThoughts(this.teacher.name, this.teacher.formId, this.profile), "", this.currentDateTime);
            this.teacher.googleController.Send(messageToSend);
            this.teacher.googleController.SendLookAt(this.characters[Math.ceil(Math.random() * 3)].formId) 
        }
    }

    private async SendEndMessage(message) {
        console.log("**College Lectures** Sending end message.")
        if(this.state == 3) {
            let messageToSend = this.promptManager.PrepareLectureEndMessage(this.teacher, this.lecture, this.location, this.StudentNames(), this.fileManager.GetLecture(this.teacher.name, this.teacher.formId, this.profile), this.fileManager.GetThoughts(this.teacher.name, this.teacher.formId, this.profile), message, this.currentDateTime);
            this.teacher.googleController.Send(messageToSend);
        } else {
            let messageToSend = this.promptManager.PrepareLectureEndContinueMessage(this.teacher, this.lecture, this.location, this.StudentNames(), this.fileManager.GetLecture(this.teacher.name, this.teacher.formId, this.profile), this.fileManager.GetThoughts(this.teacher.name, this.teacher.formId, this.profile), message, this.currentDateTime);
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
                const _events = await this.characters[i].googleController.SummarizeEvents(this.characters[i], this.fileManager.GetLecture(this.characters[i].id, this.characters[i].formId, this.profile));
                this.fileManager.SaveEventLog(this.characters[i].id, this.characters[i].formId, _events, this.profile, false);
                this.fileManager.SaveLectureLog(this.characters[i].id, this.characters[i].formId, _events, this.profile, false);
            }, 0)
        }
    }

    private DetermineLecture(no: number) {
        switch (no) {
            case 0: return {name: "History of World and Magic", content: "== THIS IS A LECTURE ON ALL SCHOOLS OF MAGIC, NOT JUST RESTORATION, DON'T TALK ABOUT RESTORATION == Starts with the mythology and how gods shaped the world. Tries to answer the question: \"What's the role of magic in the creation act?\". After that, applies a chronological approach. Continues on with general history of races, how they settled in different regions etc up to this day. Gives a summary of which races populate Nirn. Goes on with bigger forces like Aedra and Daedra and their role in the fate of Nirn and it's habitants. After giving sufficient amount of overview on these subjects, goes on to tell about important events regarding magical phenomena and actors that dealed with magic. What did they contribute to the world of magic? Approaches critically, putting pros and cons of different approaches. Analyses each event with intricate detail. Leaves some open points for students to think about."};
            case 1: return {name: "Illusion Magic", content: "How did Illusion Magic first appear? From where it draws it's vitilizing energy? Applies a chronological approach. What are it's core principles? What are some important Illusion Masters? What is the fundamental principle that one should take into account when studying Illusion magic. How is it performed?"};
            case 2: return {name: "Magical Artefacts", content: "What makes an artefact magical? History of magical artefacts and objects. What consideration should we take when we are dealign with a magical object?"};
            case 3: return {name: "Destruction Magic", content: "How did Destruction Magic first appear? From where it draws it's vitilizing energy? Applies a chronological approach. What are it's core principles? What are some important Destruction Masters? What is the fundamental principle that one should take into account when studying Destruction magic. How is it performed?"};
            case 4: return {name: "Restoration Magic", content: "How did Restoration Magic first appear? From where it draws it's vitilizing energy? Applies a chronological approach. What are it's core principles? What are some important Restoration Masters? What is the fundamental principle that one should take into account when studying Restoration magic. How is it performed?"};
            case 5: return {name: "Alteration Magic", content: "How did Alteration Magic first appear? From where it draws it's vitilizing energy? Applies a chronological approach. What are it's core principles? What are some important Alteration Masters? What is the fundamental principle that one should take into account when studying Alteration magic. How is it performed?"};
            case 6: return {name: "Enchantments", content: "History of Enchantment. How do you enchant an object? Applies a chronological approach. How do we deal with magical energies to imbue objects with magic? Is there any dangers to it?"};
            case 7: return {name: "Conjuration Magic", content: "How did Conjuration Magic first appear? From where it draws it's vitilizing energy? Applies a chronological approach. What are it's core principles? What are some important Conjuration Masters? What is the fundamental principle that one should take into account when studying Conjuration magic. How is it performed?"};
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
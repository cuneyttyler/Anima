import { VoiceTypes } from './Helpers/VoiceTypes.js'
import { EventEmitter } from 'events'
import EventBus from './EventBus.js';
import { GetPayload } from './GenAIController.js';
import * as fs from 'fs';
import { BROADCAST_QUEUE, DEBUG } from '../Anima.js'
import SKSEController from './SKSEController.js';
import waitSync from 'wait-sync'

class Queue<T> {
    private items: T[] = [];

    enqueue(item: T): void {
        this.items.push(item);
    }

    dequeue(): T | undefined {
        return this.items.shift();
    }

    peek(): T | undefined {
        return this.items[0];
    }

    isEmpty(): boolean {
        return this.items.length === 0;
    }

    size(): number {
        return this.items.length;
    }

    get(index: number): T {
        return this.items[index]
    }
}

export class SenderData extends EventEmitter {
    public text: string;
    public type: number;
    public duration: number;
    public audioFile: string;
    public lipFile: string;
    public voiceType: string;
    public voiceFileName: string;
    public speaker: number;
    public character;
    public _continue: boolean;
    public readyForQuestions;

    constructor(text, type, audioFile, lipFile, voiceType, voiceFileName, duration, speaker, character, _continue, readyForQuestions?) {
        super();
        this.text = text;
        this.type = type;
        this.duration = duration;
        this.audioFile = audioFile;
        this.lipFile = lipFile;
        this.voiceType = voiceType;
        this.voiceFileName = voiceFileName;
        this.speaker = speaker;
        this.character = character;
        this._continue = _continue;
        this.readyForQuestions = readyForQuestions;
    }
}

export class SenderQueue extends EventEmitter{
    public id: number;
    private type: number;
    private eventName: string;
    private skseController: SKSEController;
    private queue: Queue<SenderData>;
    public processing: boolean;
    public waitTime : number = 0;

    constructor(id: number, type: number, skseController: SKSEController) {
        super();
        this.id = id;
        this.type = type,
        this.skseController = skseController;
        this.eventName = 'processNext_' + this.id;
        this.queue = new Queue<SenderData>();
        this.processing = false;
        this.on(this.eventName, this.processNext);
    }

    doesHaveSpeechForCharacter(character) {
        for(let i = 0; i < this.queue.size(); i++) {
            if(this.queue.get(i).character.name.toLowerCase() == character.name.toLowerCase()) return true
        }
        return false
    }

    addData(data: SenderData): void {
        this.queue.enqueue(data);
        if (!this.processing) {
            this.emit(this.eventName, this);
        }
    }

    private async processNext(): Promise<void> {
        if (this.queue.isEmpty()) {
            this.processing = false;
            return;
        }

        const data = this.queue.dequeue();
        if (data) {
            try {
                await this.processData(data);
            } catch (error) {
                console.error('Error processing audio stream:', error);
            }
        }
    }

    private async processData(data: SenderData): Promise<void> {
        return new Promise(async (resolve) => {
            try {
                this.processing = true;
                try {
                    await this.copyFiles(data)
                } catch {
                    this.processing = false;
                    console.error("ERROR during copying files.")
                }

                while(this.type == 0 && BROADCAST_QUEUE.doesHaveSpeechForCharacter(data.character) && this.waitTime < 5) {
                    console.log("HAVE_SPEECH_FOR_CHARACTER. WAITING...")
                    this.waitTime += 0.5
                    waitSync(0.5)
                }
                
                if(data.type == 0 || data.type == 1 || data.type == 2 || data.type == 3) {
                    setTimeout(() => {
                        let payload = GetPayload(data.text, "chat", data.duration, this.type, data.speaker, parseInt(data.character.formId));
                        if(!DEBUG) this.skseController.Send(payload);
                    }, 250)
                } else if(data.type == 4){
                    EventBus.GetSingleton().emit("FORCE_GREET_MESSAGE", data.character, data.text)
                    this.skseController.Send({type: "force-greet-player", message: "Force greet player", formId: parseInt(data.character.formId)})
                }
            
                setTimeout(() => {
                    this.processing = false;
                    this.emit(this.eventName);
                    EventBus.GetSingleton().emit('processNext_broadcast')
                }, data.duration * 1000 + 1500)
                
                setTimeout(() => {
                    if(this.type == 0) {
                        if(data._continue) {
                            EventBus.GetSingleton().emit("TARGET_CONTINUE", data.character, data.text)
                        }
                    } if((this.type == 1 || this.type == 2) && data.type != 4) {
                        EventBus.GetSingleton().emit('BROADCAST_RESPONSE', data.character, data.text, data._continue)
                        EventBus.GetSingleton().emit('WEB_BROADCAST_RESPONSE', data.speaker, data.text)
                        if(data._continue) {
                            EventBus.GetSingleton().emit("BROADCAST_CONTINUE", data.character, data.text)
                        }
                    } else if(this.type == 3) {
                        EventBus.GetSingleton().emit('LECTURE_RESPONSE', data.character, data.text, data._continue)
                        if(data._continue) {
                            EventBus.GetSingleton().emit("LECTURE_CONTINUE", data.character, data.text)
                        }
                        if(data.readyForQuestions) {
                            EventBus.GetSingleton().emit("READY_FOR_QUESTIONS", data.character, data.text)
                        }
                    }
                    
                }, this.CalculateResponseDelay(data.duration))
            } catch(e) {
                console.error("ERROR: " + e);
            }
        });
    }

    CalculateResponseDelay(duration) {
        return duration * 1000 - 3000 > 0 ? duration * 1000 - 3000 : duration * 1000
    }

    private async copyFiles(data: SenderData) {
        for(var i = 0; i < VoiceTypes.length; i++) {
            var voiceType = VoiceTypes[i];
            var outputFolder = process.env.MODS_FOLDER + "\\Anima\\Sound\\Voice\\Anima.esp\\" + voiceType + "\\";

            if (!fs.existsSync(outputFolder)) {
              // Folder does not exist, so create it
              fs.mkdir(outputFolder, (err) => {
                if (err) {
                  console.error("Error creating folder");
                } else {
                  // console.log("Voice Folder created successfully. {" + outputFolder + "}");
                }
              });
            }
        }

        outputFolder = process.env.MODS_FOLDER + "\\Anima\\Sound\\Voice\\Anima.esp\\" + data.voiceType + "\\";
        const audioFile = outputFolder + data.voiceFileName + ".wav";
        const lipFile = outputFolder + data.voiceFileName + ".lip";

        // Copying the file to a the same name
        fs.copyFileSync(data.audioFile, audioFile);
        fs.copyFileSync(data.lipFile, lipFile);

        try {
            fs.unlinkSync(data.audioFile);
            fs.unlinkSync(data.lipFile);
        } catch(e) {}
    }
}
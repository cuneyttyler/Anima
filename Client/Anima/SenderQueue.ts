import { VoiceTypes } from './Helpers/VoiceTypes.js'
import { EventEmitter } from 'events'
import EventBus from './EventBus.js';
import { GetPayload } from './GenAIController.js';
import * as fs from 'fs';
import { BROADCAST_QUEUE, DEBUG } from '../Anima.js'
import SKSEController from './SKSEController.js';
import waitSync from 'wait-sync'
import { BroadcastQueue } from './BroadcastQueue.js';

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
    public duration: number;
    public audioFile: string;
    public lipFile: string;
    public voiceType: string;
    public voiceFileName: string;
    public speaker: number;
    public character;
    public listener: string;

    constructor(text, audioFile, lipFile, voiceType, voiceFileName, duration, speaker, character, listener) {
        super();
        this.text = text;
        this.duration = duration;
        this.audioFile = audioFile;
        this.lipFile = lipFile;
        this.voiceType = voiceType;
        this.voiceFileName = voiceFileName;
        this.speaker = speaker;
        this.character = character;
        this.listener = listener;
    }
}

export class SenderQueue extends EventEmitter{
    public id: number;
    private type: number;
    private eventName: string;
    private skseController: SKSEController;
    private queue: Queue<SenderData>;
    public processing: boolean;

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

                while(this.type == 0 && BROADCAST_QUEUE.doesHaveSpeechForCharacter(data.character)) {
                    waitSync(0.5)
                }
                
                setTimeout(() => {
                    let result = GetPayload(data.text, "chat", data.duration, this.type, data.speaker);
                    if(!DEBUG)
                        this.skseController.Send(result);
                }, 250)

                setTimeout(() => {
                    this.processing = false;
                    this.emit(this.eventName);
                    setTimeout(() => {
                        this.processing = false;
                        EventBus.GetSingleton().emit('BROADCAST_RESPONSE', data.character, data.listener, data.text)
                        EventBus.GetSingleton().emit('WEB_BROADCAST_RESPONSE', data.speaker, data.text)
                        EventBus.GetSingleton().emit('processNext_broadcast')
                    }, 1000)
                }, data.duration * 1000)
            } catch(e) {
                console.error("ERROR: " + e);
            }
        });
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

        fs.unlinkSync(data.audioFile);
        fs.unlinkSync(data.lipFile);
    }
}
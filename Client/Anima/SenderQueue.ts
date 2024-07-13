import { VoiceTypes } from './Helpers/VoiceTypes.js'
import { EventEmitter } from 'events';
import { GetPayload } from './GenAIController.js';
import * as fs from 'fs';
import { DEBUG } from '../Anima.js'

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
}

export class SenderData {
    public text: string;
    public duration: number;
    public audioFile: string;
    public lipFile: string;
    public voiceType: string;
    public voiceFileName: string;
    public speaker: number;

    constructor(text, audioFile, lipFile, voiceType, voiceFileName, duration, speaker) {
        this.text = text;
        this.duration = duration;
        this.audioFile = audioFile;
        this.lipFile = lipFile;
        this.voiceType = voiceType;
        this.voiceFileName = voiceFileName;
        this.speaker = speaker;
    }
}

export class SenderQueue extends EventEmitter {
    private id: number;
    private type: number;
    private eventName: string;
    private socket: WebSocket;
    private queue: Queue<SenderData>;
    private processing: boolean;

    constructor(id: number, type: number, socket: WebSocket) {
        super();
        this.id = id;
        this.type = type,
        this.socket = socket;
        this.eventName = 'processNext_' + this.id;
        this.queue = new Queue<SenderData>();
        this.processing = false;
        this.on(this.eventName, this.processNext);
    }

    addData(data: SenderData): void {
        this.queue.enqueue(data);
        if (!this.processing) {
            this.emit(this.eventName);
        }
    }

    private async processNext(): Promise<void> {
        if (this.queue.isEmpty()) {
            this.processing = false;
            return;
        }

        this.processing = true;
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
                await this.copyFiles(data)
                setTimeout(() => {
                    let result = GetPayload(data.text, "chat", data.duration, this.type, data.speaker);
                    if(!DEBUG)
                        this.socket.send(JSON.stringify(result));
                }, 250)

                setTimeout(() => {
                    this.processing = false;
                    this.emit(this.eventName);
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
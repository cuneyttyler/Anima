import { EventEmitter } from 'events';
import * as fs from 'fs';
import { parseFile } from 'music-metadata';
import syncExec from 'sync-exec';
import GoogleVertexAPI from './GoogleVertexAPI.js'
import TTSAPI from './TTSAPI.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { getAudioDurationInSeconds } from 'get-audio-duration'
import waitSync from 'wait-sync'

ffmpeg.setFfmpegPath(ffmpegPath);

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

export class AudioData {
    public chunk: string;
    public voiceFileName: string;
    public text: string;
    public voiceModel: string;
    public voicePitch: number;
    public stepCount = 0;
    public temp_file_suffix: string;
    public callback: Function;

    constructor(text, voiceFileName, voiceModel, voicePitch, stepCount, temp_file_suffix, callback) {
        this.text = text;
        this.voiceFileName = voiceFileName;
        this.voiceModel = voiceModel;
        this.voicePitch = voicePitch;
        this.stepCount = stepCount;
        this.temp_file_suffix = temp_file_suffix;
        this.callback = callback;
    }
}

export class AudioProcessor extends EventEmitter {
    private id: number;
    private eventName: string;
    private queue: Queue<AudioData>;
    private processing: boolean;
    private itemCount: number = 0;
    private MAX_ITEM_COUNT:number = 1

    constructor(id?: number) {
        super();
        this.id = id;
        this.eventName = 'processNext_' + this.id;
        this.queue = new Queue<AudioData>();
        this.processing = false;
        this.on(this.eventName, this.processNext);
    }

    addAudioStream(data: AudioData): void {
        if(!data.text || data.text == "") return
        this.queue.enqueue(data);
        if (!this.processing) {
            this.emit(this.eventName);
        }
    }

    private async processNext(): Promise<void> {
        const audioData = this.queue.dequeue();
        if (audioData) {
            try {
                await this.processAudioStream(audioData);
            } catch (error) {
                console.error('Error processing audio stream:', error);
                this.processing = false
            }
        }
    }

    private async processAudioStream(data: AudioData): Promise<void> {
        return new Promise(async (resolve) => {
            try {
                this.processing = true
                let stime = performance.now()
                let output = this.saveAudio(data.text, data.voiceFileName, data.voiceModel, data.voicePitch, data.stepCount, data.temp_file_suffix, (output) => {
                    if(!output) {
                        data.callback(false)
                    } else {
                        let ftime = performance.now()
                        data.callback(true, data.text, output[0], output[1], Math.max(0, output[2] - (ftime - stime) / 1000 + 4));
                    }
                    this.processing = false
                    this.emit(this.eventName);
                });
            } catch(e) {
                console.error(e);
                this.processing = false
            }
        });
    }
    
    private async saveAudio(msg: string, voiceFileName: string, voiceModel, pitch, stepCount, temp_file_suffix: string, callback) {
        const fileName = `temp-${temp_file_suffix}_${stepCount}.mp3`;
        const tempFilename = `./Audio/Temp/${fileName}`;

        TTSAPI.TTS(msg, tempFilename, voiceModel, (status) => {
            if(status == 0) {
                console.error("ERROR during TTS.")
                callback()
                return
            }

            this.afterTTS('./Audio/Temp/' + voiceFileName + "_" + temp_file_suffix + '_' + stepCount, tempFilename, pitch, msg, callback)
        })    
    }

    private getAudioDurationFromBuffer(buffer) : Promise<Number> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(buffer, (err, metadata) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(metadata.format.duration as Number);
            });
        });
    }

    private async getAudioDuration(filePath) : Promise<Number> {
        return await getAudioDurationInSeconds(filePath)
        
    }

    private async getAudioDuration_Old(filePath: string) {
        let metaData = await parseFile(filePath);
        return metaData.format.duration;
    }

    private generateLipFile(wavFile: string, fileName: string, line: string) {
        const executablePath = '"' + process.env.SKYRIM_FOLDER + '\\Tools\\LipGen\\LipGenerator\\LipGenerator.exe"';
        const args = [
            '"' + wavFile + '"',
            '"' + line + '"']

        syncExec(executablePath + " " + args.join(' '));
    }
    
    convertAudio(inputFile, outputFile, pitch, callback) {
        try {
            const rate = 22050 * Math.pow(2, pitch / 12)
            const speedAdjustment = 1 / Math.pow(2, pitch / 12)
            ffmpeg()
                    .input(inputFile)
                    .format("wav")
                    // .audioCodec('pcm_s16le') // Set the audio codec to PCM with 16-bit depth
                    // .audioFrequency(44100) // Set the sample rate
                    // .audioFilters([{
                    //     filter: 'asetrate',
                    //     options: rate
                    // },{
                    //     filter: 'atempo',
                    //     options: speedAdjustment.toFixed(2)
                    // }])
                    .on('error', function(err) {
                        console.error('Error while converting:', err);
                    })
                    .on('end', function() {
                        callback(outputFile)
                    })
                    .save(outputFile);
        } catch(err) {
            console.error("ERROR during audio conversion:", err);
            this.processing = false
        }
    }

    private afterTTS(filename, tempFilename, pitch, msg, callback) {
        
        let duration: Number = 0;
        try {
            let audioFile =  filename + '.wav';
            let lipFile = filename + '.lip';
            this.convertAudio(tempFilename, audioFile, pitch, async () => {
                try {
                    this.generateLipFile(audioFile, lipFile, msg);
                    duration = await this.getAudioDuration(audioFile);
                    try {
                        fs.unlinkSync(tempFilename);
                    } catch(e) {}
                    callback( [audioFile, lipFile, duration])
                } catch(e) {
                    console.log(e)
                    callback()
                } 
            })
            
        } catch(e) {
            console.error("ERROR during processing audio!" + e);
            this.processing = false
            return
        }
    }
}
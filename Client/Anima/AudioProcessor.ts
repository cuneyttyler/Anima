import { EventEmitter } from 'events';
import * as fs from 'fs';
import { parseFile } from 'music-metadata';
import syncExec from 'sync-exec';
import GoogleVertexAPI from './GoogleVertexAPI.js'
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
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
        if (this.queue.isEmpty()) {
            this.processing = false;
            return;
        }

        this.processing = true;
        const audioData = this.queue.dequeue();
        if (audioData) {
            try {
                await this.processAudioStream(audioData);
            } catch (error) {
                console.error('Error processing audio stream:', error);
            }
        }
    }

    private async processAudioStream(data: AudioData): Promise<void> {
        // Your audio processing logic here.
        // Simulating async processing with a timeout.
        return new Promise(async (resolve) => {
            try {
                let output = await this.saveAudio(data.text, data.voiceFileName, data.voiceModel, data.voicePitch, data.stepCount, data.temp_file_suffix, (output) => {
                    data.callback(data.text, output[0], output[1], output[2]);
                    this.processing = false;
                    this.emit(this.eventName);
                });
            } catch(e) {
                console.error(e);
            }
        });
    }

    private async getAudioDuration(filePath: string) {
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
                    .audioCodec('pcm_s16le') // Set the audio codec to PCM with 16-bit depth
                    .audioFrequency(44100) // Set the sample rate
                    .audioFilters([{
                        filter: 'asetrate',
                        options: rate
                    },{
                        filter: 'atempo',
                        options: speedAdjustment.toFixed(2)
                    }])
                    .on('error', function(err) {
                        console.error('Error while converting:', err);
                    })
                    .on('end', function() {
                        callback(outputFile)
                    })
                    .save(outputFile);
        } catch(err) {
            console.error("ERROR during audio conversion:", err);
        }
    }
    
    private async saveAudio(msg: string, voiceFileName: string, voiceModel, pitch, stepCount, temp_file_suffix: string, callback) {
        const fileName = `temp-${temp_file_suffix}_${stepCount}.mp3`;
        const tempFileName = `./Audio/Temp/${fileName}`;

        try {
            await GoogleVertexAPI.TTS(msg, tempFileName, voiceModel)
            waitSync(0.2)
        } catch(e) {
            console.error("TTS Error: " + e)
            return
        }

        let duration: number = 0;
        try {
            let audioFile = './Audio/Temp/' + voiceFileName + "_" + temp_file_suffix + '_' + stepCount + '.wav';
            let lipFile = './Audio/Temp/' + voiceFileName + "_" + temp_file_suffix + '_' + stepCount + '.lip';
            this.convertAudio(tempFileName, audioFile, pitch, async () => {
                try {
                    this.generateLipFile(audioFile, lipFile, msg);
                    duration = await this.getAudioDuration(audioFile);
                    try {
                        fs.unlinkSync(tempFileName);
                    } catch(e) {}
                    callback( [audioFile, lipFile, duration])
                } catch(e) {
                    console.error("ERROR: AudioProcessor: " + e)
                    return
                } 
            })
            
        } catch(e) {
            console.error("ERROR during processing audio!" + e);
            return
        }
    }
}
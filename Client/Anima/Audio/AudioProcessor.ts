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
    public index: number;
    public chunk: string;
    public voiceFileName: string;
    public text: string;
    public voiceModel: string;
    public stepCount = 0;
    public temp_file_suffix: string;
    public callback: Function;

    constructor(index, text, voiceFileName, voiceModel, stepCount, temp_file_suffix, callback) {
        this.index = index;
        this.text = text;
        this.voiceFileName = voiceFileName;
        this.voiceModel = voiceModel;
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
    private nextSendTime: number = 0;
    private lastIndex: number = 0;

    constructor(id: number) {
        super();
        this.id = id;
        this.eventName = 'processNext_' + this.id;
        this.queue = new Queue<AudioData>();
        this.processing = false;
        this.on(this.eventName, this.processNext);
    }

    addAudioStream(data: AudioData): void {
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
                let output = await this.saveAudio(
                    data.text, data.index, data.voiceFileName, data.voiceModel, data.stepCount, data.temp_file_suffix);
                
                const interval = setInterval(() => {
                    if(data.index - this.lastIndex <= 1) {
                        data.callback(data.index, data.text, output[0], output[1], output[2]);
                        this.lastIndex = data.index;
                        clearInterval(interval);
                    }
                }, 100)
                
                this.processing = false;
                this.emit(this.eventName);
            } catch(e) {
                console.error("ERROR: " + e);
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

    async convertAudio(inputFile, outputFile) {
        await ffmpeg()
        .input(inputFile)
        .audioCodec('pcm_s16le') // Set the audio codec to PCM with 16-bit depth
        .audioFrequency(44100) // Set the sample rate
        .on('error', function(err) {
            console.error('Error while converting:', err);
        })
        .on('end', function() {
            console.log('Conversion finished');
        })
        .save(outputFile);
    }

    private async saveAudio(msg: string, index, voiceFileName: string, voiceModel, stepCount, temp_file_suffix: string) {
        if(!msg) {
            return 0;
        }

        const fileName = `temp-${temp_file_suffix}_${stepCount}.mp3`;
        const tempFileName = `./Audio/Temp/${fileName}`;

        await GoogleVertexAPI.TTS(msg, tempFileName, voiceModel)
        console.log("TTS applied == OUTOUT => " + tempFileName)

        let duration: number = 0;
        try {
            let audioFile = './Audio/Temp/' + voiceFileName + '_' + stepCount + '_' + index + '.wav';
            let lipFile = './Audio/Temp/' + voiceFileName + '_' + stepCount + '_' + index + '.lip';
            await this.convertAudio(tempFileName, audioFile)
            waitSync(0.5)
            duration = await this.getAudioDuration(audioFile);
            this.generateLipFile(audioFile, lipFile, msg);

            fs.unlinkSync(tempFileName);
            
            return [audioFile, lipFile, duration];
        } catch(e) {
            console.error("ERROR during processing audio!");
            throw Error(e);
        }
    }
}
import * as PlayHT from 'playht';

import fs from 'fs';
import http from 'http'

import EventBus from './EventBus.js'

export default class XTTSAPI {
    public static async TTS(text, outputFile, voiceModel, callback) {  
        const postData = JSON.stringify({"text":text, "speaker_wav": voiceModel, "language": "en"})

        const options = { 
            hostname: 'localhost',
            port: 8020, 
            path: '/tts_to_audio/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },  
        };

        const file = fs.createWriteStream(outputFile);

        const req = http.request(options, (res) => {
            if(res.statusCode != 200) {
                console.error("Problem with TTS Server.")
                callback(0)
                return
            }
            res.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    // console.log('File downloaded successfully.');
                    callback(1)
                    return
                });
            });
        });

        req.on('error', (e) => {
            fs.unlink(outputFile, () => {
                console.error(`Problem with request: ${e.message}`);
                EventBus.GetSingleton().emit("TTS_ERROR")
                callback(0)
                return
            });
        });

        // Write data to request body
        req.write(postData);
        req.end();
    }
}

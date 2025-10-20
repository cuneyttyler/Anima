import path from "path";
import fs from 'fs';
import http from 'http'
import https from 'https'

import EventBus from './EventBus.js'

import { TTS_SERVICE, TTS_URL, CAMBAI_API_KEY, ASYNCAI_API_KEY } from '../Anima.js';

export default class TTSAPI {
    public static async TTS(text, outputFile, voiceModel, callback) {  
        text = text.replaceAll('*','')
        const file = fs.createWriteStream(outputFile);

        if(TTS_SERVICE == 'CAMBAI') {
            let postData = JSON.stringify({"text":text, "voice_id": 123, "language": 1})

            const options = { 
                hostname: "client.camb.ai",
                port: 443, 
                path: '/apis/tts',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'x-api-key': CAMBAI_API_KEY
                },  
            };

            const req = https.request(options, (res) => {
                if(res.statusCode != 200) {
                    console.error("Problem with TTS Server.")
                    callback(0)
                    return
                }
                res.pipe(file);
                file.on('finish', () => {
                    file.close(() => {
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

            return
        } else if(TTS_SERVICE == 'ASYNCAI') {
            let voiceIds = JSON.parse(fs.readFileSync( path.resolve("./World/VoiceIds.json"), 'utf-8'));

            let postData = JSON.stringify({
                model_id: "asyncflow_v2.0", 
                transcript: text, 
                voice: {mode: "id", id: voiceIds[voiceModel]}, 
                output_format : {container : "wav", encoding: "pcm_f32le", sample_rate: 44100}
            })

            const options = { 
                hostname: "api.async.ai",
                port: 443, 
                path: '/text_to_speech',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': ASYNCAI_API_KEY,
                    'version': 'v1'
                },  
            };

            const req = https.request(options, (res) => {
                if(res.statusCode != 200) {
                    console.error("Problem with TTS Server.")
                    callback(0)
                    return
                }
                res.pipe(file);
                file.on('finish', () => {
                    file.close(() => {
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

            return
        }

        var port = 8020
        var service = 'http'

        if(TTS_SERVICE.toLowerCase() != 'local') {
            port = 443
            service = 'https'
        }

        let postData = JSON.stringify({"text":text, "speaker_wav": voiceModel, "language": "en"})

        const options = { 
            hostname: TTS_URL,
            port: port, 
            path: '/tts_to_audio/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },  
        };

        if (service == 'http') {
            const req = http.request(options, (res) => {
                if(res.statusCode != 200) {
                    console.error("Problem with TTS Server. Status: " + res.statusCode)
                    callback(0)
                    return
                }
                res.pipe(file);
                file.on('finish', () => {
                    file.close(() => {
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
        } else {
            const req = https.request(options, (res) => {
                if(res.statusCode != 200) {
                    console.error("Problem with TTS Server.")
                    callback(0)
                    return
                }
                res.pipe(file);
                file.on('finish', () => {
                    file.close(() => {
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
}

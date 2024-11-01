import { OLLAMA_URI, OLLAMA_MODEL, OLLAMA_SERVICE } from '../Anima.js'

import http from 'http'
import https from 'https'

export default class Ollama {
    private static DoRequest(message) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({"model": OLLAMA_MODEL, "prompt": message.prompt + message.message, "stream": false})

            var port, service
            if(OLLAMA_URI == "localhost") {
                port = 11434
                service = http
            } else {
                port = 443
                service = https
            }

            const options = { 
                hostname: OLLAMA_URI,
                port: port, 
                path: '/api/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                },  
            };

            var data = [];
            const req = service.request(options, (res) => {
                if(res.statusCode != 200) {
                    console.error("Problem with OLLAMA Server: " + res.statusCode)
                    reject({status: 2})
                }
                res.on('data', (d) => {
                    data.push(d);
                })
                res.on('end', () => {
                    resolve({status: 1, text: JSON.parse(data.join('')).response})
                })
            });

            // Write data to request body
            req.write(postData);
            req.end();
        });
    }

    public static async SendMessage(message) {
        try {
            return await this.DoRequest(message)
        } catch(e) {
            return {status:2}
        }
    }
}
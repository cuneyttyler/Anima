import { OLLAMA_MODEL } from '../Anima.js';

import http from 'http'

export default class Ollama {
    private static DoRequest(message) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({"model": OLLAMA_MODEL, "prompt": message.prompt + message.message, "stream": false})

            const options = { 
                hostname: "localhost",
                port: 11434, 
                path: '/api/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                },  
            };

            var data = [];
            const req = http.request(options, (res) => {
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
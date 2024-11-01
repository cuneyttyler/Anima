import * as PlayHT from 'playht';

import fs from 'fs';
import https from 'https'

import { PLAYHT_USER_ID, PLAYHT_API_KEY } from '../Anima.js';

export default class PlayHTAPI {
    public static async TTS(text, outputFile, voiceModel) {  
        PlayHT.init({
            apiKey: PLAYHT_API_KEY,
            userId: PLAYHT_USER_ID,
          });

        const generated = await PlayHT.generate(text, { voiceEngine: "PlayHT2.0", voiceId: voiceModel});

        const { audioUrl } = generated;

        // console.log('The url for the audio file is', audioUrl);

        const file = fs.createWriteStream(outputFile);

        https.get(audioUrl, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    // console.log('File downloaded successfully');
                });
            });
        }).on('error', (err) => {
            fs.unlink(outputFile, () => {
                // console.error('Error downloading file:', err);
            });
        });

        return outputFile
    }
}

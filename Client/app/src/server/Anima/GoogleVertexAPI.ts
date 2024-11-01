// Imports the Google Cloud client library
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech'
import { KEY_FILE_PATH, GOOGLE_PROJECT_ID } from '../Anima.js';

// Import other required libraries
import fs from 'fs';
import util from 'util';

// Creates a client

export default class GoogleVertexAPI {
  public static async TTS(text, outputFile, voiceModel) {  
    // Construct the request
    const client = new TextToSpeechClient({
      keyFilename: KEY_FILE_PATH,
      projectId: GOOGLE_PROJECT_ID, // Optional, but recommended
    });

    const request = {
      input: {text: text},
      // Select the language and SSML voice gender (optional)
      voice: {languageCode: 'en-US', name: voiceModel},
      audioConfig: {audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3},
    };
  
    // Performs the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(outputFile, response.audioContent, 'binary');
    return outputFile
  }

}
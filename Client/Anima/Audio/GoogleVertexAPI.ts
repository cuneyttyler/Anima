import {VertexAI} from '@google-cloud/vertexai'
// Imports the Google Cloud client library
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech'

// Import other required libraries
import fs from 'fs';
import util from 'util';

// Creates a client
// Path to the service account key JSON file
const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Creates a client
const client = new TextToSpeechClient({
  keyFilename: keyFilePath,
  projectId: process.env.GOOGLE_PROJECT_ID, // Optional, but recommended
});

export default class GoogleVertexAPI {
  public static async TTS(text, outputFile, voiceModel) {  
    // Construct the request
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
    console.log('Audio content written to file: output.mp3');
    return outputFile
  }

}
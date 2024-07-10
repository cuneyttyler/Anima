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

export default class GoogleGenAI {
  /**
 * TODO(developer): Update these variables before running the sample.
 */
  public static async SendMessage(prompt) {
    const vertexAI = new VertexAI({project: process.env.GOOGLE_PROJECT_ID, location: 'us-central1'});

    const generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
    });

    const resp = await generativeModel.generateContent(prompt);
    const contentResponse = await resp.response;
    if(!contentResponse || !contentResponse.candidates || contentResponse.candidates.length == 0 || !contentResponse.candidates[0].content 
    || !contentResponse.candidates[0].content.parts || contentResponse.candidates[0].content.parts.length == 0) {
      throw Error("ERROR: NO RESPONSE RETURNED FROM GOOGLE GENAI")
    } else {
      return contentResponse.candidates[0].content.parts[0].text;
    }
  }
}
import { GoogleAuth } from 'google-auth-library';
import {VertexAI} from '@google-cloud/vertexai'
import { GOOGLE_PROJECT_ID, KEY_FILE_PATH } from '../Anima.js';
import axios from 'axios'



export default class GoogleGenAI {

  public static async SendMessage(message) {
    const vertexAI = new VertexAI({project: GOOGLE_PROJECT_ID, location: 'us-central1', googleAuthOptions: {keyFile: KEY_FILE_PATH}});

    const generativeModel = vertexAI.getGenerativeModel({
      model: process.env.GOOGLE_LLM_MODEL,
    });

    try {
      let request = {contents: [
          // {role: 'user', parts: [{text: message.prompt}]}, 
          // {role: 'system', parts: [{text: "Sure, I understand. I'll roleplay."}]},
          {role: 'user', parts: [{text: message.message}]}
      ], systemInstruction: message.prompt}
      const resp = await generativeModel.generateContent(request);
      const contentResponse = await resp.response;
      if(!contentResponse || !contentResponse.candidates || contentResponse.candidates.length == 0 || !contentResponse.candidates[0].content 
      || !contentResponse.candidates[0].content.parts || contentResponse.candidates[0].content.parts.length == 0) {
        throw Error("ERROR: NO RESPONSE RETURNED FROM GOOGLE GENAI")
      } else {
        return {status: 1, text: contentResponse.candidates[0].content.parts[0].text}
      }
    } catch(e) {
      console.error(e)
      return {status: 2}
    }
  }
}
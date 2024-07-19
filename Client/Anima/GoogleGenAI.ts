import { GoogleAuth } from 'google-auth-library';
import {VertexAI} from '@google-cloud/vertexai'
import { GOOGLE_PROJECT_ID, KEY_FILE_PATH, GOOGLE_API_KEY, GOOGLE_LLM_MODEL } from '../Anima.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default class GoogleGenAI {
  private static TRY_COUNT = 0;
  private static MAX_TRY_COUNT = 3;

  public static async SendMessage(message) {
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: GOOGLE_LLM_MODEL});

    try {
      const result = await model.generateContent({systemInstruction: message.prompt, contents: [{role: 'user', parts:[{text:message.message}]}]});
      const response = await result.response;
      const text = response.text()

      GoogleGenAI.TRY_COUNT = 0
      return {status: 1, text: text}
    } catch(e) {
      if(e.toString().includes("Candidate was blocked due to SAFETY") && GoogleGenAI.TRY_COUNT++ < this.MAX_TRY_COUNT) {
        console.log("RETRYING")
        return GoogleGenAI.SendMessage(message)
      }

      console.error(e)
      return {status: 2}
    }
  }

  public static async SendMessage_Old(message) {
    const vertexAI = new VertexAI({project: GOOGLE_PROJECT_ID, location: 'us-central1', googleAuthOptions: {keyFile: KEY_FILE_PATH}});

    const model = vertexAI.getGenerativeModel({
      model: GOOGLE_LLM_MODEL,
    });

    try {
      const result = await model.generateContent({systemInstruction: message.prompt, contents: [{role: 'user', parts:[{text:message.message}]}]});
      const contentResponse = await result.response;
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
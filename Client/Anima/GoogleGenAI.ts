import { GoogleAuth } from 'google-auth-library';
import {VertexAI} from '@google-cloud/vertexai'
import { GOOGLE_PROJECT_ID, KEY_FILE_PATH, GOOGLE_API_KEY } from '../Anima.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default class GoogleGenAI {
  private static TRY_COUNT = 0;
  private static MAX_TRY_COUNT = 2;

  public static async SendMessage(message) {
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

    try {
      const result = await model.generateContent({systemInstruction: message.prompt, contents: [{role: 'user', parts:[{text:message.message}]}]});
      const response = await result.response;
      const text = response.text()

      GoogleGenAI.TRY_COUNT = 0
      return {status: 1, text: text}
    } catch(e) {
      if(e.toString() == "[GoogleGenerativeAI Error]: Candidate was blocked due to SAFETY" && GoogleGenAI.TRY_COUNT++ < this.MAX_TRY_COUNT) {
        console.log("RETRYING")
        return GoogleGenAI.SendMessage(message)
      }

      console.error(e)
      return {status: 2}
    }
  }

  public static async SendMessage_Old(message) {
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
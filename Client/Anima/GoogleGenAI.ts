import {VertexAI} from '@google-cloud/vertexai'
import { GOOGLE_PROJECT_ID } from '../Anima.js';

export default class GoogleGenAI {
  /**
 * TODO(developer): Update these variables before running the sample.
 */
  public static async SendMessage(prompt) {
    const vertexAI = new VertexAI({project: GOOGLE_PROJECT_ID, location: 'us-central1'});

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
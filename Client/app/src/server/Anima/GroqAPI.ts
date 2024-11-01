import Groq from "groq-sdk";
import {GROQ_API_KEY, GROQ_MODEL} from '../Anima.js'

var counter = 0;

export default class GroqAPI {

  public static async SendMessage(prompt) {
    const groq = new Groq({ apiKey: GROQ_API_KEY });

    var completion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt.prompt + " " + prompt.message,
          },
        ],
        model: GROQ_MODEL,
      });

      if(!completion || !completion.choices || completion.choices.length == 0 || !completion.choices[0].message || !completion.choices[0].message.content) {
        return { status: 2 };
      }
      
      return {status: 1, text: completion.choices[0].message.content}
  }
  
}
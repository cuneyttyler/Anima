import OpenAI from "openai"
import {OPENROUTER_API_KEY, OPENROUTER_BASE_URL} from '../Anima.js'

export default class OpenRouter {

  public static async SendMessage(prompt) {
    let openai = new OpenAI({
      apiKey: OPENROUTER_API_KEY, // defaults to process.env["OPENAI_API_KEY"]
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: {
        "HTTP-Referer": "https://github.com/OpenRouterTeam/openrouter-examples",
      },
      // dangerouslyAllowBrowser: true, // Enable this if you used OAuth to fetch a user-scoped `apiKey` above. See https://openrouter.ai/docs#oauth to learn how.
    })

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "google/gemma-2-9b-it:free",
    })
  
    if(!completion || !completion.choices || completion.choices.length == 0 || !completion.choices[0].message || !completion.choices[0].message.content) {
      throw Error("ERROR: NO RESPONSE RETURNED FROM OPENROUTER.")
    }
    
    return completion.choices[0].message.content
  }
  
}
import OpenAI from "openai"
import {LLM_PROVIDER, OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_LLM_MODEL, OPENAI_BASE_URL, 
  OPENAI_API_KEY, OPENAI_LLM_MODEL, MISTRALAI_BASE_URL, MISTRALAI_API_KEY, MISTRALAI_LLM_MODEL} from '../Anima.js'

export default class OpenRouter {

  public static async SendMessage(prompt) {
    let key = OPENAI_API_KEY
    let uri = OPENAI_BASE_URL
    let model = OPENAI_LLM_MODEL

    if(LLM_PROVIDER == "OPENROUTER") {
      key = OPENROUTER_API_KEY
      uri = OPENROUTER_BASE_URL
      model = OPENROUTER_LLM_MODEL
    } else if (LLM_PROVIDER == "MISTRALAI") {
      key = MISTRALAI_API_KEY
      uri = MISTRALAI_BASE_URL
      model = MISTRALAI_LLM_MODEL
    }

    let openai = new OpenAI({
      apiKey: key,
      baseURL: uri
    })

    try {
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt.prompt + " " + prompt.message }],
        model: model,
      })
    
      if(!completion || !completion.choices || completion.choices.length == 0 || !completion.choices[0].message || !completion.choices[0].message.content) {
        return { status: 2 };
      }
      
      return {status: 1, text: completion.choices[0].message.content}
    } catch(e) {
      console.error(e)
      return {status:2}
    }
  }
  
}
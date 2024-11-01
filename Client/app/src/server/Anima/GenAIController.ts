import OpenRouter from './OpenRouter.js'
import GroqAPI from './GroqAPI.js'
import GoogleGenAI from './GoogleGenAI.js'
import Ollama from './Ollama.js'
import {AudioData, AudioProcessor} from './AudioProcessor.js'
import SKSEController from './SKSEController.js'
import EventBus from './EventBus.js'
import { SenderData, SenderQueue } from './SenderQueue.js';
import { BROADCAST_QUEUE, LECTURE_QUEUE } from '../Anima.js'
import { BroadcastData } from './BroadcastQueue.js';
import { logToLog } from './LogUtil.js';
import PromptManager from './PromptManager.js'
import TextUtil from './TextUtil.js'
import waitSync from 'wait-sync'

export function GetPayload(message: string, type: string, duration, dialogue_type: number, speaker: number, formId?: number, listenerName?: string) {
    return {"message": message, "type": type, "duration": duration, "dial_type": dialogue_type, "speaker": speaker, "formId": formId, "listenerName": listenerName}
}

export class GoogleGenAIController {
    private promptManager = new PromptManager();
    private FollowAcceptResponse = "I'll join you.";
    private audioProcessor: AudioProcessor;
    private senderQueue: SenderQueue;
    private stepCount = 0;

    constructor(private id: number, private type: number, private character, private voiceType: string, private speaker: number, private playerName: String, private skseController: SKSEController) {
        this.audioProcessor = new AudioProcessor(id);
        this.senderQueue = new SenderQueue(id, type, skseController);

        EventBus.GetSingleton().removeAllListeners("TTS_ERROR")
        EventBus.GetSingleton().on("TTS_ERROR", () => {
            let payload = GetPayload("  TTS Error.", "notification", 0, 1, 0, 0, "")
                this.skseController.Send(payload)
        })
    }

    async SendThought(message,) {
        // console.log("PROMPT SENT: " + message.prompt + message.message)
        let response
        if(process.env.LLM_PROVIDER == "OPENROUTER" || process.env.LLM_PROVIDER == "OPENAI" || process.env.LLM_PROVIDER == "MISTRALAI") {
            response = await OpenRouter.SendMessage(message)
        } else if(process.env.LLM_PROVIDER == "GROQ") {
            response = await GroqAPI.SendMessage(message)
        } else if(process.env.LLM_PROVIDER == "GOOGLE") {
            response = await GoogleGenAI.SendMessage(message)
        } else if(process.env.LLM_PROVIDER == "OLLAMA") {
            response = await Ollama.SendMessage(message)
        } else {
            console.error("LLM_PROVIDER is missing in your .env file")
            return
        }
        if(response.status == 1) {
            return response.text
        } else {
            return ""
        } 
    }

    async Send(message, messageType?) {
        // console.log("PROMPT SENT: " + message.prompt + message.message)
        let response
        if(process.env.LLM_PROVIDER == "OPENROUTER" || process.env.LLM_PROVIDER == "OPENAI" || process.env.LLM_PROVIDER == "MISTRALAI") {
            response = await OpenRouter.SendMessage(message)
        } else if(process.env.LLM_PROVIDER == "GROQ") {
            response = await GroqAPI.SendMessage(message)
        } else if(process.env.LLM_PROVIDER == "GOOGLE") {
            response = await GoogleGenAI.SendMessage(message)
        } else if(process.env.LLM_PROVIDER == "OLLAMA") {
            response = await Ollama.SendMessage(message)
        } else {
            console.error("LLM_PROVIDER is missing in your .env file")
            return
        }
        if(response.status == 1) {
            this.ProcessMessage(response.text, messageType)
            // console.log("RESPONSE RECEIVED: " + response.text)
        } else {
            console.error("ERROR connecting to LLM Provider.")
            this.ProcessMessage("Let's talk about this later.", messageType)
        } 
    }
    
    async SummarizeEvents(character, events) {
        let response
        if(process.env.LLM_PROVIDER == "OPENROUTER" || process.env.LLM_PROVIDER == "OPENAI" || process.env.LLM_PROVIDER == "MISTRALAI") {
            response = await OpenRouter.SendMessage(this.promptManager.PrepareSummarizeEventsMessage(character.name, events))
        } else if(process.env.LLM_PROVIDER == "GROQ") {
            response = await GroqAPI.SendMessage(this.promptManager.PrepareSummarizeEventsMessage(character.name, events))
        } else if(process.env.LLM_PROVIDER == "GOOGLE") {
            response = await GoogleGenAI.SendMessage(this.promptManager.PrepareSummarizeEventsMessage(character.name, events))
        } else if(process.env.LLM_PROVIDER == "OLLAMA") {
            response = await Ollama.SendMessage(this.promptManager.PrepareSummarizeEventsMessage(character.name, events))
        }  else {
            console.error("LLM_PROVIDER is missing in your .env file")
            return
        }
        if(response.status == 2) {
            return events
        }
        return response.text;
    }

    async ProcessMessage(message : any, messageType) {
        if(message.toLowerCase().includes("not_answering") || message.toLowerCase().includes("not answering") || message == "Let's talk about this later.") {
            console.log(`${this.character.name} NOT ANSWERING.`)

            if(this.type == 0) {
                return
            } else if(this.type == 1) {
                let payload = GetPayload(this.character.name + "  not answering.", "notification", 0, 1, this.speaker, 0, "")
                this.skseController.Send(payload)
                EventBus.GetSingleton().emit("BROADCAST_RESPONSE", this.character, null)
                EventBus.GetSingleton().emit("WEB_BROADCAST_RESPONSE", this.speaker, null)
                return
            } else if (this.type == 2) {
                return
            } else if (this.type == 3) {
                EventBus.GetSingleton().emit("LECTURE_NOT_ANSWERING", this.character)
                return
            } else {
                console.error("UNKNOWN TYPE: " + this.type)
                return
            }
        }

        if(message.toLowerCase().includes("not_related") || message.toLowerCase().includes('not related')) {
            let payload = GetPayload(this.character.name + " thinks it's unrelated.", "notification", 0, 1, this.speaker, 0, "")
            if(this.character.name.toLowerCase() != this.playerName.toLowerCase())
                this.skseController.Send(payload)
            if(this.type == 1) {
                console.log("NOT_RELATED => SENDING STOP SIGNAL")
                EventBus.GetSingleton().emit("BROADCAST_RESPONSE", this.character, null)
                EventBus.GetSingleton().emit("BROADCAST_STOP", this.character)
                EventBus.GetSingleton().emit("WEB_BROADCAST_RESPONSE", this.speaker, null)
                if(messageType == 1) {
                    EventBus.GetSingleton().emit('N2N_END')
                }
                return
            } 
            return
        }

        if(this.type == 1 && message.toLowerCase().includes("stop_signal") || message.toLowerCase().includes('stop signal')) {
            console.log("STOP_SIGNAL => SENDING STOP SIGNAL")
            EventBus.GetSingleton().emit("BROADCAST_STOP", this.character)
            EventBus.GetSingleton().emit("WEB_BROADCAST_RESPONSE", this.speaker, " **STOPPING DIALOGUE**")
            return
        }

        let _continue = false
        if(message.includes("**__CONTINUE__**") || message.includes("__CONTINUE__")) {
            _continue = true;
        }

        if(message.includes("**__START_LECTURE__**") || message.includes("__START_LECTURE__")) {
            console.log("** Start Lecture **")
            EventBus.GetSingleton().emit("START_LECTURE")
         }

         let readyForQuestions = false
         if(message.includes("**__READY_FOR_QUESTIONS__**") || message.includes("__READY_FOR_QUESTIONS__")) {
            console.log("** Ready for Questions **")
            readyForQuestions = true
         }

         if(message.includes("**__END_SESSION__**") || message.includes("__END_SESSION__")) {
            console.log("** End Session **")
            setTimeout(() => {
                EventBus.GetSingleton().emit("END_SESSION")
            }, 10000)
         }

        if(message.includes(this.FollowAcceptResponse)) {
            let payload = GetPayload("", "follow_request_accepted", 0, 0, this.speaker);
            this.skseController.Send(payload)
        }

        message = message.replaceAll("**__CONTINUE__**", "").replaceAll("__CONTINUE__", "")
        message = message.replaceAll("**__START_LECTURE__**", "").replaceAll("__START_LECTURE__", "")
        message = message.replaceAll("**__READY_FOR_QUESTIONS__**", "").replaceAll("__READY_FOR_QUESTIONS__", "")
        message = message.replaceAll("**__END_SESSION__**", "").replaceAll("__END_SESSION__", "")
        message = message.replaceAll("\n","").replaceAll("**","")
        message = message.replaceAll("eh?", "")
        
        var temp_file_suffix = "0"
        var topic_filename = ""
        if (this.type == 0){
            temp_file_suffix = "0"
            topic_filename = "AnimaDialo_AnimaTargetBran_001B746A_1"
        } else if(this.type == 1 || this.type == 3) {
            if(this.speaker == 0) {
                temp_file_suffix = "1"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B7493_1"
            }
            if(this.speaker == 1) {
                temp_file_suffix = "2"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B7494_1"
            }
            if(this.speaker == 2) {
                temp_file_suffix = "3"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B7495_1"
            }
            if(this.speaker == 3) {
                temp_file_suffix = "4"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B7496_1"
            }
            if(this.speaker == 4) {
                temp_file_suffix = "5"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B7497_1"
            }
            if(this.speaker == 5) {
                temp_file_suffix = "6"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B7498_1"
            }
            if(this.speaker == 6) {
                temp_file_suffix = "7"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B7499_1"
            }
            if(this.speaker == 7) {
                temp_file_suffix = "8"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B749A_1"
            }
            if(this.speaker == 8) {
                temp_file_suffix = "9"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B749B_1"
            }
            if(this.speaker == 9) {
                temp_file_suffix = "10"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B749C_1"
            }
            if(this.speaker == 10) {
                temp_file_suffix = "11"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B749D_1"
            }
            if(this.speaker == 11) {
                temp_file_suffix = "12"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B749E_1"
            }
            if(this.speaker == 12) {
                temp_file_suffix = "13"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B749F_1"
            }
            if(this.speaker == 13) {
                temp_file_suffix = "14"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B74A0_1"
            }
            if(this.speaker == 14) {
                temp_file_suffix = "15"
                topic_filename = "AnimaDialo_AnimaBroadcastB_001B74A1_1"
            }
        } else if(this.type == 2) {
            if(this.speaker == 15) {
                temp_file_suffix = "16"
                topic_filename = "AnimaDialo_AnimaFollowerBr_001B74A2_1"
            }
            if(this.speaker == 16) {
                temp_file_suffix = "17"
                topic_filename = "AnimaDialo_AnimaFollowerBr_001B74A3_1"
            }
            if(this.speaker == 17) {
                temp_file_suffix = "18"
                topic_filename = "AnimaDialo_AnimaFollowerBr_001B74A4_1"
            }
            if(this.speaker == 18) {
                temp_file_suffix = "19"
                topic_filename = "AnimaDialo_AnimaFollowerBr_001B74A5_1"
            }
            if(this.speaker == 19) {
                temp_file_suffix = "20"
                topic_filename = "AnimaDialo_AnimaFollowerBr_001B74A6_1"
            }
        } else if(this.type == 4) {
            temp_file_suffix = "21"
            topic_filename = "AnimaDialo_AnimaAliveBranc_001CB8AB_1"
        }

        if(this.type == 0) {
            EventBus.GetSingleton().emit('WEB_TARGET_RESPONSE', message);
        }
        let sentences = TextUtil.SplitToSentences(message)
        for(let i in sentences) {
            let sentence = sentences[i]
            this.audioProcessor.addAudioStream(new AudioData(sentence, topic_filename, this.voiceType.toLowerCase(), this.character.voicePitch, ++this.stepCount, temp_file_suffix, (status, text, audioFile, lipFile, duration) => {
                if(!status) {
                    console.error("AUDIO COULD NOT BE PROCESSED.")
                    if(this.type == 0) {
                        EventBus.GetSingleton().emit("INTERACTION_ONGOING", false)
                        EventBus.GetSingleton().emit('TARGET_RESPONSE', "");
                    } else if(this.type == 1 || this.type == 2 || this.type == 4) {
                        EventBus.GetSingleton().emit('BROADCAST_RESPONSE', this.character, text, _continue)
                        EventBus.GetSingleton().emit('WEB_BROADCAST_RESPONSE', this.speaker, text)
                        if(_continue) {
                            EventBus.GetSingleton().emit("BROADCAST_CONTINUE", this.character, text)
                        }
                    } else if(this.type == 3) {
                        EventBus.GetSingleton().emit('LECTURE_RESPONSE', this.character, text, _continue)
                        if(_continue) {
                            EventBus.GetSingleton().emit("LECTURE_CONTINUE", this.character, text)
                        }
                        if(readyForQuestions) {
                            EventBus.GetSingleton().emit("READY_FOR_QUESTIONS", this.character, text)
                        }
                    }
                    return
                }
                console.log(`${this.character.name} said(${this.speaker}): ${sentence}`)
                logToLog(`${this.character.name} said(${this.speaker}): ${sentence}`)
                if(this.type == 0) {
                    this.senderQueue.addData(new SenderData(text, this.type, audioFile, lipFile, this.voiceType, topic_filename, duration, this.speaker, this.character, _continue));
                    setTimeout(() => { 
                        EventBus.GetSingleton().emit("INTERACTION_ONGOING", false)
                        EventBus.GetSingleton().emit('TARGET_RESPONSE', sentence);
                    }, duration * 1000 + 500)
                } else if(this.type == 1 || this.type == 2 || this.type == 4) {
                    BROADCAST_QUEUE.addData(new BroadcastData(new SenderData(text, this.type, audioFile, lipFile, this.voiceType, topic_filename, duration, this.speaker, this.character, _continue), duration));
                    // EventBus.GetSingleton().emit('WEB_BROADCAST_RESPONSE', 0, sentence);
                } else if(this.type == 3) {
                    LECTURE_QUEUE.addData(new BroadcastData(new SenderData(text, this.type, audioFile, lipFile, this.voiceType, topic_filename, duration, this.speaker, this.character, _continue, readyForQuestions), duration));
                }
            }))
        }

        
    }

    SendLookAt(targetFormId) {
        let payload = {message:"look-at", type: "look-at", dial_type: this.type, speaker: 0, formId: parseInt(this.character.formId), targetFormId: parseInt(targetFormId)}
        this.skseController.Send(payload);
    }

    StopLookAt() {
        let payload = {message:"look-at", type: "look-at", dial_type: this.type, speaker: 0, formId: parseInt(this.character.formId)}
        this.skseController.Send(payload);
    }

    Connect() {
        let payload = GetPayload("connection established", "established", 0, this.type, this.speaker);
        this.skseController.Send(payload);
    }

    Stop() {
        // console.log("Sending STOP for " + this.character.name)
        let payload = GetPayload("stop", "stop", 0, this.type, this.speaker, parseInt(this.character.formId));
        this.skseController.Send(payload);
        this.StopLookAt()
    }

    SendVerifyConnection() {
        let payload = GetPayload("established", "established", 0, this.type, this.speaker);
        this.skseController.Send(payload);
    }

    SendEndSignal() {
        console.log("*** SEND_END_SIGNAL ***")
        this.stepCount = 0;
        this.skseController.Send(GetPayload("", "end", 0, this.type, 0));
        if(this.type == 0) {
            EventBus.GetSingleton().emit("END");
        }
    }
}

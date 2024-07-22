import OpenRouter from './OpenRouter.js'
import GoogleGenAI from './GoogleGenAI.js'
import {AudioData, AudioProcessor} from './AudioProcessor.js'
import SKSEController from './SKSEController.js'
import EventBus from './EventBus.js'
import { SenderData, SenderQueue } from './SenderQueue.js';
import { BROADCAST_QUEUE } from '../Anima.js';
import { BroadcastData } from './BroadcastQueue.js';
import { logToLog } from './LogUtil.js';
import { DEBUG } from '../Anima.js'

export function GetPayload(message: string, type: string, duration, dialogue_type: number, speaker: number, formId?: number, listenerName?: string) {
    return {"message": message, "type": type, "duration": duration, "dial_type": dialogue_type, "speaker": speaker, "formId": formId, "listenerName": listenerName}
}

export class GoogleGenAIController {
    private FollowAcceptResponse = "I'll join you.";
    private audioProcessor: AudioProcessor;
    private senderQueue: SenderQueue;
    private stepCount = 0;

    constructor(private id: number, private type: number, private character, private voiceType: string, private speaker: number, private playerName: String, private skseController: SKSEController) {
        this.audioProcessor = new AudioProcessor(id);
        this.senderQueue = new SenderQueue(id, type, skseController);
    }

    async SendThought(message) {
        // console.log("PROMPT SENT: " + message.prompt + message.message)
        let response
        if(process.env.LLM_PROVIDER == "OPENROUTER") {
            response = await OpenRouter.SendMessage(message)
        } else if(process.env.LLM_PROVIDER == "GOOGLE") {
            response = await GoogleGenAI.SendMessage(message)
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
        if(process.env.LLM_PROVIDER == "OPENROUTER") {
            response = await OpenRouter.SendMessage(message)
        } else if(process.env.LLM_PROVIDER == "GOOGLE") {
            response = await GoogleGenAI.SendMessage(message)
        } else {
            console.error("LLM_PROVIDER is missing in your .env file")
            return
        }
        if(response.status == 1) {
            this.ProcessMessage(response.text, messageType)
            // console.log("RESPONSE RECEIVED: " + response.text)
        } else {
            this.ProcessMessage("Let's talk about this later.", messageType)
        } 
    }
    
    async SummarizeEvents(events) {
        let response
        if(process.env.LLM_PROVIDER == "OPENROUTER") {
            response = await OpenRouter.SendMessage({message: "Please summarize these events with max. length of 8192 tokens : \n\n" + events})
        } else if(process.env.LLM_PROVIDER == "GOOGLE") {
            response = await GoogleGenAI.SendMessage({message: "Please summarize these events with max. length of 8192 tokens : \n\n" + events})
        } else {
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
                EventBus.GetSingleton().emit("BROADCAST_RESPONSE", this.character, null)
                EventBus.GetSingleton().emit("WEB_BROADCAST_RESPONSE", this.speaker, null)
                return
            } else if (this.type == 2) {
                return
            } else {
                console.error("UNKNOWN TYPE: " + this.type)
                return
            }
        }

        if(message.toLowerCase().includes("not_related") || message.toLowerCase().includes('not related')) {
            let payload = GetPayload(this.character.name + " thinks you're not talking to them.", "notification", 0, 1, this.speaker, 0, "")
            if(!DEBUG && this.character.name.toLowerCase() == this.playerName.toLowerCase())
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

        if(messageType == 1) {
            this.SendVerifyConnection()
        }

        let _continue = false
        if(message.includes("**__CONTINUE__**") || message.includes("__CONTINUE__")) {
            _continue = true
        }

        message = message.replaceAll("**__CONTINUE__**", "").replaceAll("__CONTINUE__", "")
        message = message.replaceAll("\n","").replaceAll("**","")
        message = message.replaceAll("eh?", "")
        
        var temp_file_suffix = "0"
        var topic_filename = ""
        if (this.type == 0){
            temp_file_suffix = "0"
            topic_filename = "AnimaDialo_AnimaTargetBran_00133A1A_1"
        } else if(this.type == 1) {
            if(this.speaker == 0) {
                temp_file_suffix = "1"
                topic_filename = "AnimaDialo_AnimaBroadcastB_00142D2B_1"
            }
            if(this.speaker == 1) {
                temp_file_suffix = "2"
                topic_filename = "AnimaDialo_AnimaBroadcastB_00142D2C_1"
            }
            if(this.speaker == 2) {
                temp_file_suffix = "3"
                topic_filename = "AnimaDialo_AnimaBroadcastB_00147E2D_1"
            }
            if(this.speaker == 3) {
                temp_file_suffix = "4"
                topic_filename = "AnimaDialo_AnimaBroadcastB_00147E2E_1"
            }
            if(this.speaker == 4) {
                temp_file_suffix = "5"
                topic_filename = "AnimaDialo_AnimaBroadcastB_00147E2F_1"
            }
            if(this.speaker == 5) {
                temp_file_suffix = "6"
                topic_filename = "AnimaDialo_AnimaBroadcastB_0018EC4E_1"
            }
            if(this.speaker == 6) {
                temp_file_suffix = "7"
                topic_filename = "AnimaDialo_AnimaBroadcastB_0018EC4F_1"
            }
            if(this.speaker == 7) {
                temp_file_suffix = "8"
                topic_filename = "AnimaDialo_AnimaBroadcastB_0018EC50_1"
            }
            if(this.speaker == 8) {
                temp_file_suffix = "9"
                topic_filename = "AnimaDialo_AnimaBroadcastB_0018EC51_1"
            }
            if(this.speaker == 9) {
                temp_file_suffix = "10"
                topic_filename = "AnimaDialo_AnimaBroadcastB_0018EC52_1"
            }
        } else if(this.type == 2) {
            if(this.speaker == 10) {
                temp_file_suffix = "11"
                topic_filename = "AnimaDialo_AnimaFollowerBr_0016B533_1"
            }
            if(this.speaker == 11) {
                temp_file_suffix = "12"
                topic_filename = "AnimaDialo_AnimaFollowerBr_00175742_1"
            }
            if(this.speaker == 12) {
                temp_file_suffix = "13"
                topic_filename = "AnimaDialo_AnimaFollowerBr_0017063D_1"
            }
            if(this.speaker == 13) {
                temp_file_suffix = "14"
                topic_filename = "AnimaDialo_AnimaFollowerBr_0017063E_1"
            }
            if(this.speaker == 14) {
                temp_file_suffix = "15"
                topic_filename = "AnimaDialo_AnimaFollowerBr_0017063F_1"
            }
        }

        this.audioProcessor.addAudioStream(new AudioData(message, topic_filename, this.character.voice, this.character.voicePitch, ++this.stepCount, temp_file_suffix, (text, audioFile, lipFile, duration) => {
            if(this.type == 0) {
                console.log("TYPE 0")
                this.senderQueue.addData(new SenderData(text, audioFile, lipFile, this.voiceType, topic_filename, duration, this.speaker, this.character, _continue));
                EventBus.GetSingleton().emit('WEB_TARGET_RESPONSE', message);
                setTimeout(() => {
                    this.SendEvent(message, this.speaker)
                }, duration * 1000 + 500)
            } else if(this.type == 1 || this.type == 2) {
                console.log("SENDING == " + text + "== for " + this.character.name + "(" + this.speaker + ")" + ", " + this.voiceType)
                console.log(topic_filename)
                BROADCAST_QUEUE.addData(new BroadcastData(new SenderData(text, audioFile, lipFile, this.voiceType, topic_filename, duration, this.speaker, this.character, _continue), duration));
                // EventBus.GetSingleton().emit('WEB_BROADCAST_RESPONSE', 0, message);
            }
        }))
    }

    SendEvent(message, speaker) {
        console.log(`${this.character.name} said(${speaker}): ${message}`)
        logToLog(`${this.character.name} said(${speaker}): ${message}`)

        if(this.type == 0) {
            EventBus.GetSingleton().emit("INTERACTION_ONGOING", false)
            EventBus.GetSingleton().emit('TARGET_RESPONSE', message);
            if(message.includes(this.FollowAcceptResponse)) {
                let payload = GetPayload("", "follow_request_accepted", 0, 0, speaker);
                if(!DEBUG)
                    this.skseController.Send(payload)
            }
        }
    }

    SendLookAt(targetFormId) {
        let payload = {message:"look-at", type: "look-at", dial_type: this.type, speaker: 0, formId: parseInt(this.character.formId), targetFormId: parseInt(targetFormId)}
        this.skseController.Send(payload);
    }

    Connect() {
        console.log("Sending CONNECTION_ESTABLISHED for " + this.speaker)
        let payload = GetPayload("connection established", "established", 0, this.type, this.speaker);
        this.skseController.Send(payload);
    }

    Stop() {
        console.log("Sending STOP for " + this.character.name)
        let payload = GetPayload("stop", "stop", 0, this.type, this.speaker, parseInt(this.character.formId));
        this.skseController.Send(payload);
    }

    SendVerifyConnection() {
        let verifyConnection = GetPayload("connection established", "established", 0, this.type, 0);

        console.log("Connection to " + this.character.name + " is succesfull" + JSON.stringify(verifyConnection));
        (console as any).logToLog(`Connection to ${this.character.name} is succesfull.`)            
        if(!DEBUG)
            this.skseController.Send(verifyConnection);
    }

    SendEndSignal() {
        console.log("*** SEND_END_SIGNAL ***")
        this.stepCount = 0;
        if(!DEBUG) {
            this.skseController.Send(GetPayload("", "end", 0, this.type, 0));
        }
        if(this.type == 0) {
            EventBus.GetSingleton().emit("END");
        }
    }
}

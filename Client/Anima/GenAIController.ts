import OpenRouter from './OpenRouter.js'
import GoogleGenAI from './GoogleGenAI.js'
import {AudioData, AudioProcessor} from './AudioProcessor.js'
import EventBus from './EventBus.js'
import { SenderData, SenderQueue } from './SenderQueue.js';
import { BROADCAST_QUEUE } from '../Anima.js';
import { BroadcastData } from './BroadcastQueue.js';
import { logToLog } from './LogUtil.js';
import { DEBUG } from '../Anima.js'

export function GetPayload(message: string, type: string, duration, dialogue_type: number, speaker: number, speakerName?: string, listenerName?: string) {
    return {"message": message, "type": type, "duration": duration, "dial_type": dialogue_type, "speaker": speaker, "speakerName": speakerName, "listenerName": listenerName}
}

export class GoogleGenAIController {
    private FollowAcceptResponse = "I'll join you.";
    private audioProcessor: AudioProcessor;
    private senderQueue: SenderQueue;
    private stepCount = 0;

    constructor(private id: number, private type: number, private character, private listener, private voiceType: string, private speaker: number, private socket : WebSocket) {
        this.audioProcessor = new AudioProcessor(id);
        this.senderQueue = new SenderQueue(id, type, socket);
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
            response = await OpenRouter.SendMessage({message: "Please summarize this events with max. length of 2048 tokens : \n\n" + events})
        } else if(process.env.LLM_PROVIDER == "GOOGLE") {
            response = await GoogleGenAI.SendMessage({message: "Please summarize this events with max. length of 2048 tokens : \n\n" + events})
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
                EventBus.GetSingleton().emit("BROADCAST_RESPONSE", this.speaker, null)
                EventBus.GetSingleton().emit("WEB_BROADCAST_RESPONSE", this.speaker, null)
                if(messageType == 1) {
                    EventBus.GetSingleton().emit('N2N_END')
                }
                return
            } else {
                console.error("UNKNOWN TYPE: " + this.type)
                return
            }
        }

        if(messageType == 1) {
            this.SendVerifyConnection()
        }
        
        message = message.replaceAll("\n","").replaceAll("**","")

        var temp_file_suffix = "0"
        var topic_filename = ""
        if (this.type == 0){
            temp_file_suffix = "0"
            topic_filename = "AnimaDialo_AnimaTargetBran_00133A1A_1"
        } else if(this.type == 1 || this.type == 2) {
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
        }

        this.audioProcessor.addAudioStream(new AudioData(message, topic_filename, this.character.voice, this.character.voicePitch, ++this.stepCount, temp_file_suffix, (text, audioFile, lipFile, duration) => {
            if(this.type == 0) {
                this.senderQueue.addData(new SenderData(text, audioFile, lipFile, this.voiceType, topic_filename, duration, this.speaker, null));
                EventBus.GetSingleton().emit('WEB_TARGET_RESPONSE', message);
                setTimeout(() => {
                    this.SendEvent(message, this.speaker)
                }, duration * 1000 + 500)
            } else if(this.type == 1) {
                BROADCAST_QUEUE.addData(new BroadcastData(new SenderData(text, audioFile, lipFile, this.voiceType, topic_filename, duration, this.speaker, this.listener), duration));
                // EventBus.GetSingleton().emit('WEB_BROADCAST_RESPONSE', 0, message);
            } else {
                BROADCAST_QUEUE.addData(new BroadcastData(new SenderData(text, audioFile, lipFile, this.voiceType, topic_filename, duration, this.speaker, null), duration));
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
                    this.socket.send(JSON.stringify(payload))
            }
        }
    }

    SendVerifyConnection() {
        let verifyConnection = GetPayload("connection established", "established", 0, this.type, 0);

        console.log("Connection to " + this.character.name + " is succesfull" + JSON.stringify(verifyConnection));
        (console as any).logToLog(`Connection to ${this.character.name} is succesfull.`)            
        if(!DEBUG)
            this.socket.send(JSON.stringify(verifyConnection));
    }

    SendEndSignal() {
        console.log("*** SEND_END_SIGNAL ***")
        this.stepCount = 0;
        if(!DEBUG) {
            this.socket.send(JSON.stringify(GetPayload("", "end", 0, this.type, 0)));
        }
        if(this.type == 0) {
            EventBus.GetSingleton().emit("END");
        }
    }
}

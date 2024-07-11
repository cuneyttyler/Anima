import OpenRouter from './OpenRouter.js'
import GoogleGenAI from './GoogleGenAI.js'
import {AudioData, AudioProcessor} from './AudioProcessor.js'
import EventBus from './EventBus.js'
import { SenderData, SenderQueue } from './SenderQueue.js';
import DialogueManager from './DialogueManager.js';
import { logToLog } from './LogUtil.js';
import { DEBUG } from '../Anima.js'

export function GetPayload(message: string, type: string, duration, is_n2n, speaker) {
    return {"message": message, "type": type, "duration": duration, "is_n2n": is_n2n, "speaker": speaker}
}

export class GoogleGenAIController {
    private CombinedUserInput : string = "";
    private processingIndex : number = 0;
    private FollowAcceptResponse = "I'll join you.";
    private audioProcessor: AudioProcessor;
    private senderQueue: SenderQueue;
    private clientManager: DialogueManager;
    private stepCount = 0;
    private stepMessageCount = 0;
    private processedMessageCount = 0;

    constructor(private id: number, clientManager: DialogueManager, private socket : WebSocket) {
        this.audioProcessor = new AudioProcessor(id);
        this.senderQueue = new SenderQueue(id, clientManager.IsN2N(), socket);
        this.clientManager = clientManager;
    }

    async Send(message, voiceType) {
        let response = await GoogleGenAI.SendMessage(message)
        this.ProcessMessage(response.replaceAll("\n",""), voiceType)
    }

    async SummarizeHistory(history) {
        let response = await GoogleGenAI.SendMessage("Please summarize this conversation with max. length of 3072 tokens : \n\n" + history)
        return response;
    }

    async SummarizeEvents(events) {
        let response = await GoogleGenAI.SendMessage("Please summarize this events with max. length of 3072 tokens : \n\n" + events)
        return response;
    }

    async ProcessMessage(message : any, voiceType) {
        if(this.clientManager.IsN2N() && this.clientManager.IsEnding()) {
            return;
        }

        var temp_file_suffix = "0"
        var topic_filename = ""
        var speaker: number = this.clientManager.Speaker();
        if(this.clientManager.IsN2N() && speaker == 0) {
            temp_file_suffix = "0"
            topic_filename = "AnimaDialo_AnimaN2NSourceB_00133A1D_1"
        } else if(this.clientManager.IsN2N() && this.clientManager.Speaker() == 1) {
            temp_file_suffix = "1"
            topic_filename = "AnimaDialo_AnimaN2NTargetB_00133A20_1"
        } else {
            temp_file_suffix = "2"
            topic_filename = "AnimaDialo_AnimaTargetBran_00133A1A_1"
        }

        this.audioProcessor.addAudioStream(new AudioData(message, topic_filename, this.clientManager.VoiceModel(), this.clientManager.VoicePitch(), this.stepCount, temp_file_suffix, (text, audioFile, lipFile, duration) => {
            this.senderQueue.addData(new SenderData(text, audioFile, lipFile, voiceType, topic_filename, duration, speaker));
            setTimeout(() => {
                this.clientManager.SetInteractionOngoing(false);
                this.SendEvent(message, speaker)
            }, duration * 1000 + 500)
        }))

        console.log(`Character said: ${message}`)
        logToLog(`Character said: ${message}`)
    }

    SendEvent(message, speaker) {
        if(!this.clientManager.IsN2N()) {
            EventBus.GetSingleton().emit('TARGET_RESPONSE', message);
            if(message.includes(this.FollowAcceptResponse)) {
                let payload = GetPayload("", "follow_request_accepted", 0, this.clientManager.IsN2N(), speaker);
                if(!DEBUG)
                    this.socket.send(JSON.stringify(payload))
            }
            if(this.clientManager.IsEnding()) {
                setTimeout(() => {
                    this.SendEndSignal()
                }, 7000)
            }
        } else if(this.clientManager.IsN2N() && this.clientManager.Speaker() == 0) {
            EventBus.GetSingleton().emit('N2N_SOURCE_RESPONSE', message)
        } else if(this.clientManager.IsN2N() && this.clientManager.Speaker() == 1) {
            EventBus.GetSingleton().emit('N2N_TARGET_RESPONSE', message)
        }
    }
    SendEndSignal() {
        this.stepCount = 0;
        if(!DEBUG) {
            this.socket.send(JSON.stringify(GetPayload("", "end", 0, this.clientManager.IsN2N(), 0)));
        }
        if(!this.clientManager.IsN2N()) {
            EventBus.GetSingleton().emit("END");
        }
    }
}

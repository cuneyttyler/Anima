import OpenRouter from './OpenRouter.js'
import {AudioData, AudioProcessor} from './AudioProcessor.js'
import EventBus from './EventBus.js'
import { SenderData, SenderQueue } from './SenderQueue.js';
import DialogueManager from './DialogueManager.js';
import { logToLog } from '../Anima.js';

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

    async Send(msg) {
        let response = await OpenRouter.SendMessage(msg)
        this.ProcessMessage(response)
    }

    async SummarizeHistory(history) {
        let response = await OpenRouter.SendMessage("Please summarize this conversation with max. length of 3072 tokens : \n\n" + history)
        return response;
    }

    async SummarizeEvents(events) {
        let response = await OpenRouter.SendMessage("Please summarize this events with max. length of 3072 tokens : \n\n" + events)
        return response;
    }

    async ProcessMessage(msg : any) {
        if(this.clientManager.IsN2N() && this.clientManager.IsEnding()) {
            return;
        }

        var temp_file_suffix = "0"
        var topic_filename = ""
        var speaker: number = this.clientManager.Speaker();
        if(this.clientManager.IsN2N() && speaker == 0) {
            temp_file_suffix = "0"
            topic_filename = "DialogueGe_AnimaN2NSourceB_00129811_1"
        } else if(this.clientManager.IsN2N() && this.clientManager.Speaker() == 1) {
            temp_file_suffix = "1"
            topic_filename = "DialogueGe_AnimaN2NSourceB_00129811_1"
        } else {
            temp_file_suffix = "2"
            topic_filename = "DialogueGe_AnimaTargetBran_0012980E_1"
        }

        this.audioProcessor.addAudioStream(new AudioData(this.processingIndex++, msg, topic_filename, this.clientManager.VoiceModel(), this.stepCount, temp_file_suffix, (index, text, audioFile, lipFile, duration) => {
            this.senderQueue.addData(new SenderData(index, text, audioFile, lipFile, topic_filename, duration, speaker));
            if(++this.processedMessageCount == this.stepMessageCount) {
                setTimeout(() => {
                    this.clientManager.SetInteractionOngoing(false);
                }, duration * 1000)
            }
        }))

        console.log(`Character said: ${msg}`)
        logToLog(`Character said: ${msg}`)

        if(!this.clientManager.IsN2N()) {
            EventBus.GetSingleton().emit('TARGET_RESPONSE', msg);
            if(msg.includes(this.FollowAcceptResponse)) {
                let payload = GetPayload("", "follow_request_accepted", 0, this.clientManager.IsN2N(), speaker);
                this.socket.send(JSON.stringify(payload))
            }
            if(this.clientManager.IsEnding()) {
                setTimeout(() => {
                    this.SendEndSignal()
                }, 7000)
            }
        } else if(this.clientManager.IsN2N() && this.clientManager.Speaker() == 0) {
            EventBus.GetSingleton().emit('N2N_SOURCE_RESPONSE', msg)
        } else if(this.clientManager.IsN2N() && this.clientManager.Speaker() == 1) {
            EventBus.GetSingleton().emit('N2N_TARGET_RESPONSE', msg)
        }
    }

    SendEndSignal() {
        this.stepCount = 0;
        this.socket.send(JSON.stringify(GetPayload("", "end", 0, this.clientManager.IsN2N(), 0)));
        EventBus.GetSingleton().emit("END");
    }

    SendUserVoiceInput() {
        let userData = GetPayload(this.CombinedUserInput, "user_voice", 0, false, 0);
        this.socket.send(JSON.stringify(userData));
    }
}

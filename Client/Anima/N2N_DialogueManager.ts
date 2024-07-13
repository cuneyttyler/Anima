import EventBus from './EventBus.js';
import DialogueManager from "./DialogueManager.js";
import BroadcastManager from "./BroadcastManager.js"

import { setTimeout } from 'node:timers/promises';

export default class N2N_DialogueManager {
    private stepCount = 0;
    private shouldStop = false;
    private endSignal = false;
    private source;
    private target;
    private sourceFormId;
    private targetFormId;
    private playerName;
    private broadcastManager: BroadcastManager;
    private sourceHistory = [];
    private targetHistory = [];
    private initialized = false;
    private conversationOngoing = false;
    private hardreset = false;

    constructor(
        private maxStepCount,
        private ClientManager_N2N_Source: DialogueManager,
        private ClientManager_N2N_Target: DialogueManager
        ) {}

    getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    shouldEnd() {
        const num = this.getRandomNumber(0, this.maxStepCount - this.stepCount);

        return (this.stepCount != 0 && num == 0) || this.shouldStop;
    }

    reset() {
        this.stepCount = 0;
        this.shouldStop = false;
        this.endSignal = false;
        this.sourceHistory = [];
        this.targetHistory = [];
        this.conversationOngoing = false;
    }

    stop() {
        this.shouldStop = true;
    }

    StopImmediately() {
        console.log("N2N HARD RESET")
        this.hardreset = true
        this.reset()
    }

    finalizeConversation() {
        console.log("Saving conversation history.");
        this.ClientManager_N2N_Source.Finalize()
        this.ClientManager_N2N_Target.Finalize()
        setTimeout(2000, () => {
            this.reset();
        });
    }

    async Start_N2N_Dialogue(location, currentDateTime) {
        this.hardreset = false;
        
        this.ClientManager_N2N_Source.SendNarratedAction("You are at " + location + ". It's " + currentDateTime + ". Please keep your answers short if possible.");
        this.ClientManager_N2N_Target.SendNarratedAction("You are at " + location + ". It's " + currentDateTime + ". Please keep your answers short if possible.");

        this.ClientManager_N2N_Source.StartN2N("As you walk around in " + location + ", you see " + this.target + ". What do you to say to them? Please answer as if you are talking to him/her.");
    
        this.sourceHistory.push({
            talker: "DungeonMaster",
            phrase: 'In ' + location + ', on ' + currentDateTime + ', you started to talk with ' +this. target + '. '
        });
        this.targetHistory.push({
            talker: "DungeonMaster",
            phrase: 'In ' + location + ', on ' + currentDateTime + ', ' + this.source + ' approached you and you started to talk.'
        });
        this.conversationOngoing = true;
    }

    Init(source, target, sourceFormId, targetFormId, playerName, broadcastManager) {
        this.source = source
        this.target = target
        this.sourceFormId = sourceFormId
        this.targetFormId = targetFormId
        this.playerName = playerName
        this.broadcastManager = broadcastManager

        if(!this.initialized) {
            this.InitEvents();
            this.initialized = true;
        }
    }


    async InitEvents() {
        EventBus.GetSingleton().on("N2N_EVENT", (message) => {
            if(message.id == this.source && message.formId == this.sourceFormId) {
                this.ClientManager_N2N_Source.SendNarratedAction(message.message + " ");
            } else if(message.id == this.target && message.formId == this.targetFormId) {
                this.ClientManager_N2N_Target.SendNarratedAction(message.message + " ");
            }
        })

        EventBus.GetSingleton().on('N2N_SOURCE_RESPONSE', (message) => {
            if(this.hardreset) return

            if(message == "Let's talk about this later.") {
                this.finalizeConversation();
                return
            }
            this.ClientManager_N2N_Source.SendNarratedAction("You said: \"" + message + "\"")
            if(!this.endSignal) {
                this.ClientManager_N2N_Target.Say(message);
            } else {
                this.ClientManager_N2N_Target.SendNarratedAction(this.source + " says to you \"" + message + "\".");
            }

            if(process.env.N2N_BROADCAST && process.env.N2N_BROADCAST.toLowerCase() == 'true') {
                this.broadcastManager.Send(message, this.source, this.target, this.playerName)
            }

            this.sourceHistory.push({
                talker: this.source,
                phrase: message
            });
            this.targetHistory.push({
                talker: this.source,
                phrase: message
            });

            if(this.endSignal) {
                this.ClientManager_N2N_Source.SendEndSignal()
                this.finalizeConversation();
            }

            this.stepCount++;
        });

        EventBus.GetSingleton().on('N2N_TARGET_RESPONSE', (message) => {
            if(this.hardreset) return

            if(message == "Let's talk about this later.") {
                this.finalizeConversation();
                return
            }
            this.ClientManager_N2N_Target.SendNarratedAction("You said: \"" + message + "\"")
            let shouldEnd = this.shouldEnd();
            if(shouldEnd) {
                this.stop();
                this.endSignal = true;
                this.ClientManager_N2N_Source.SendNarratedAction("You are about to end the dialogue with " + this.target + ". What do you to say to him/her?");
            }
            this.ClientManager_N2N_Source.Say(message);
            
            if(process.env.N2N_BROADCAST && process.env.N2N_BROADCAST.toLowerCase() == 'true') {
                this.broadcastManager.Send(message, this.target, this.source, this.playerName)
            }

            this.sourceHistory.push({
                talker: this.target,
                phrase: message
            });
            this.targetHistory.push({
                talker: this.target,
                phrase: message
            });

            this.stepCount++;
        });
    }

    IsConversationOngoing() {
        return this.conversationOngoing;
    }
}
import { EventEmitter } from 'events'
import EventBus from './EventBus.js';
import { BROADCAST_QUEUE } from '../Anima.js';
import { SenderQueue, SenderData } from './SenderQueue.js';
import SKSEController from './SKSEController.js';
import BroadcastManager from './BroadcastManager.js';
import PromptManager from './PromptManager.js';
import FileManager from './FileManager.js';
import { logToLog } from './LogUtil.js';

class Queue {
    private items: BroadcastData[] = [];

    enqueue(item: BroadcastData): void {
        this.items.push(item);
    }

    dequeue(): BroadcastData | undefined {
        return this.items.shift();
    }

    checkIndexAndRemove(index) {
        if(!this.peek()) return
        if(this.peek().index == index) {
            this.dequeue()
            this.checkIndexAndRemove(index)
        }
    }

    peek(): BroadcastData | undefined {
        return this.items[0];
    }

    isEmpty(): boolean {
        return this.items.length === 0;
    }

    size(): number {
        return this.items.length;
    }
}

export class BroadcastData {
    public index;
    public type;
    public profile;
    public characters;
    public character;
    public speakerName: string;
    public speakerFormId: string;
    public topics: string;
    public location: string;
    public message: string;
    public ending: boolean

    constructor(index, type, profile, characters, character, speakerName: string, speakerFormId: string, message: string, topics: string, location: string, ending) {
        this.index = index;
        this.type = type;
        this.profile = profile;
        this.characters = characters;
        this.character = character;
        this.speakerName = speakerName;
        this.speakerFormId = speakerFormId;
        this.message = message;
        this.topics = topics;
        this.location = location;
        this.ending = ending;
    }
}

export class BroadcastSendQueue extends EventEmitter {
    private eventName: string;
    private queue: Queue;
    private promptManager: PromptManager;
    private fileManager: FileManager;
    private processing: boolean = false;
    private currentIndex: number = 0;

    constructor() {
        super()
        this.eventName = 'processNext_broadcast';
        this.queue = new Queue();
        this.processing = false;
        this.promptManager = new PromptManager();
        this.fileManager = new FileManager();
        this.on(this.eventName, this.processNext);
    }

    addData(data: BroadcastData): void {
        this.queue.enqueue(data);
        if (!this.processing) {
            this.emit(this.eventName);
        }
    }

    private async processNext(): Promise<void> {
        if (this.queue.isEmpty()) {
            return;
        }

        const data = this.queue.dequeue();
        if (data) {
            try {
                this.processing = true;
                this.currentIndex = data.index;
                await this.processData(data);
            } catch (error) {
                console.error('Error processing audio stream:', error);
            }
        }
    }

    private async processData(data: BroadcastData): Promise<void> {
        this.InitResponseEvent(data);

        return new Promise(async (resolve) => {
            await this.Send(data.type, data.profile, data.characters, data.character, data.speakerName, data.speakerFormId, data.message, data.topics, data.location, data.ending)
        });
    }

    async Send(type, profile, characters, character, speakerName, speakerFormId, message : string, topics: string, location, ending: boolean) {
        if(!character || !character.name) {
            console.error("** BroadcastSendQueue ** Send: CHARACTER OR CHARACER NAME DOESN'T EXIST. RETURNING.");
            this.processing = false
            return;
        }
        let messageToSend
        if(type == 2) {
            messageToSend = this.promptManager.PrepareN2NStartMessage(character, BroadcastManager.N2N_LISTENER, topics, location, this.fileManager.GetEvents(character.id, character.formId, profile), this.fileManager.GetThoughts(character.id, character.formId, profile));
        } else {
            if ((BroadcastManager.N2N_SPEAKER && character.name == BroadcastManager.N2N_SPEAKER.name) || (BroadcastManager.N2N_LISTENER && character.name == BroadcastManager.N2N_LISTENER.name)) {
                messageToSend = this.promptManager.PrepareN2NBroadcastMessage(profile, character.name, speakerName, characters, character, BroadcastManager.currentDateTime, "== DON'T REPEAT THIS ==> " + message + " <== DON'T REPEAT THIS ==", BroadcastManager.currentLocation, this.fileManager.GetEvents(character.name, character.formId, profile), this.fileManager.GetThoughts(character.name, character.formId, profile), true, ending);
            } else {
                if(BroadcastManager.N2N_SPEAKER) {
                    messageToSend = this.promptManager.PrepareN2NBroadcastMessage(profile, character.name, speakerName, characters, character, BroadcastManager.currentDateTime, "== DON'T REPEAT THIS ==> " + message + " <== DON'T REPEAT THIS ==", BroadcastManager.currentLocation, this.fileManager.GetEvents(character.name, character.formId, profile), this.fileManager.GetThoughts(character.name, character.formId, profile), false, ending);
                } else {
                    messageToSend = this.promptManager.PrepareBroadcastMessage(profile, character.name, speakerName, characters, character, BroadcastManager.currentDateTime, "== DON'T REPEAT THIS ==> " + message + " <== DON'T REPEAT THIS ==", BroadcastManager.currentLocation, this.fileManager.GetEvents(character.name, character.formId, profile), this.fileManager.GetThoughts(character.name, character.formId, profile));
                }
            }
        }
        let newListener = characters.find(c => c.name && speakerName && c.name.replaceAll("'","").toLowerCase() == speakerName.replaceAll("'","").toLowerCase() && c.formId == speakerFormId);
        character.awaitingResponse = true;
        // console.log("** BroadcastManager ** Sending message to " + character.name + (BroadcastManager.N2N_SPEAKER ? ". ( == " + BroadcastManager.N2N_SPEAKER.name + " <=> " + BroadcastManager.N2N_LISTENER.name + " == " + ")" : ""));
        character.googleController.Send(messageToSend, type);
        this.processing = false
        if(speakerFormId) character.googleController.SendLookAt(speakerFormId);
    }

    CheckIfHanging() {
        // setInterval(() => {
        //     if(this.queue.isEmpty()) this.processing = false;
        // }, 5000)
    }

    InitResponseEvent(data) {
        EventBus.GetSingleton().removeAllListeners('BROADCAST_RESPONSE')
        EventBus.GetSingleton().on('BROADCAST_RESPONSE', async (character, message, _continue) => {
            let _character = this.FindCharacterByName(data.characters, character.name)
            if(_character) _character.awaitingResponse = false;

            // NO ANSWER
            if(process.env.BROADCAST_RECURSIVE && process.env.BROADCAST_RECURSIVE.toLowerCase() == 'true' && !message && !_continue) {
                this.processing = false;
                this.processNext();
            } 
            // ANSWERED
            else if(process.env.BROADCAST_RECURSIVE && process.env.BROADCAST_RECURSIVE.toLowerCase() == 'true' && message && !_continue) {
                await this.WaitUntilPauseEnds();
                this.processing = false;
                this.queue.checkIndexAndRemove(this.currentIndex)
                EventBus.GetSingleton().emit("BROADCAST_SAY", message, character.name, character.formId)
            }
        })
        EventBus.GetSingleton().removeAllListeners('BRODCAST_SEND_DONE')
        EventBus.GetSingleton().on('BRODCAST_SEND_DONE', async () => {
            this.processing = false
        })
    }

    WaitUntilPauseEnds() {
        return new Promise<void>(resolve => {
            const intervalId = setInterval(() => {
                if (!BroadcastManager.paused) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, 100);
        });
    }

    FindCharacterByName(characters, name) {
        return characters.find((c) => c.name.replaceAll("'","").toLowerCase() == name.replaceAll("'","").toLowerCase());
    }
}
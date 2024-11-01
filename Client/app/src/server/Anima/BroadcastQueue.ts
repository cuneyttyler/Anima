import { EventEmitter } from 'events'
import EventBus from './EventBus.js';
import { BROADCAST_QUEUE } from '../Anima.js';
import { SenderQueue, SenderData } from './SenderQueue.js';
import SKSEController from './SKSEController.js';

class Queue<T> {
    private items: T[] = [];

    enqueue(item: T): void {
        this.items.push(item);
    }

    dequeue(): T | undefined {
        return this.items.shift();
    }

    peek(): T | undefined {
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
    public senderData: SenderData;
    public duration: number;

    constructor(senderData: SenderData, duration: number) {
        this.senderData = senderData;
        this.duration = duration;
    }
}

export class BroadcastQueue extends EventEmitter {
    private eventName: string;
    private queue: Queue<BroadcastData>;
    private senderQueue: SenderQueue;

    constructor(type: number, socket: WebSocket) {
        super()
        this.eventName = 'processNext_broadcast';
        this.queue = new Queue<BroadcastData>();
        this.senderQueue = new SenderQueue(3, type, new SKSEController(socket))
        this.senderQueue.processing = false;
        this.on(this.eventName, this.processNext);
        EventBus.GetSingleton().on(this.eventName, () => {
            this.emit(this.eventName)
        });
    }

    doesHaveSpeechForCharacter(name) {
        return this.senderQueue.doesHaveSpeechForCharacter(name)
    }

    addData(data: BroadcastData): void {
        this.queue.enqueue(data);
        if (!this.senderQueue.processing) {
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
                await this.processData(data);
            } catch (error) {
                console.error('Error processing audio stream:', error);
            }
        }
    }

    private async processData(data: BroadcastData): Promise<void> {
        return new Promise(async (resolve) => {
            try {
                this.senderQueue.addData(data.senderData)
                EventBus.GetSingleton().emit(this.eventName);
            } catch(e) {
                console.error("ERROR: " + e);
            }
        });
    }
}
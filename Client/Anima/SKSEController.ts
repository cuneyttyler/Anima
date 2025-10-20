import { DEBUG } from "../Anima.js"

export function GetPayload(message: string, type: string, duration, dialogue_type: number, speaker: number, formId?: number, listenerName?: string) {
    return {"message": message, "type": type, "duration": duration, "dial_type": dialogue_type, "speaker": speaker, "formId": formId, "listenerName": listenerName}
}

export default class SKSEController {
    constructor(private socket : WebSocket) {}

    public Send(payload) {
        if(!DEBUG) this.socket.send(JSON.stringify(payload))
    }
}
import { DEBUG } from "../Anima.js"

export default class SKSEController {
    constructor(private socket : WebSocket) {}

    public Send(payload) {
        if(!DEBUG) this.socket.send(JSON.stringify(payload))
    }
}
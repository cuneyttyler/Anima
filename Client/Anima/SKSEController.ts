export default class SKSEController {
    constructor(private socket : WebSocket) {}

    public Send(payload) {
        console.log("SENDING " + JSON.stringify(payload))
        this.socket.send(JSON.stringify(payload))
    }
}
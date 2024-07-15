import { io } from 'socket.io-client';

class SocketioService {
    socket;
    constructor() {}
  
    setupSocketConnection() {
      this.socket = io('http://localhost:3000');
    }

    disconnect() {
      if (this.socket) {
        this.socket.disconnect();
      }
    }

    on(event, callback) {
      this.socket.on(event, callback)
    }
    
    send(event, message) {
      console.log("")
      this.socket.emit(event, message)
    }
  }
  
  export default new SocketioService();
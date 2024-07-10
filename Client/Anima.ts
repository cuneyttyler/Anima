import * as dotenv from 'dotenv'
import * as fs from 'fs';
import websocketPlugin, {SocketStream} from "@fastify/websocket"
import Fastify, {FastifyRequest} from 'fastify'
import DialogueManager from "./Anima/DialogueManager.js";
import N2N_DialogueManager from './Anima/N2N_DialogueManager.js'
import EventBus from './Anima/EventBus.js';
import path from "path";

const resolved = path.resolve(".env");
console.log("Reading .env from location: ", resolved);
try {
    dotenv.config({path: resolved})
} catch (e) {
    console.error("Something is not right with your env config!", e)
}

const N2N_MAX_STEP_COUNT = 10;

const fastify = Fastify({logger: true});
fastify.register(websocketPlugin);

const ClientManager = await new DialogueManager(false, 0);
const ClientManager_N2N_Source = new DialogueManager(true, 0);
const ClientManager_N2N_Target = new DialogueManager(true, 1);

var n2nDialogueManager = new N2N_DialogueManager(N2N_MAX_STEP_COUNT, ClientManager_N2N_Source, ClientManager_N2N_Target);;

process.on('uncaughtException', function  (err, origin) {
    console.error('Caught exception: ', err, origin);
    logToErrorLog(JSON.stringify({err, origin}));
});

process.on('unhandledRejection', function (err, origin) {
    console.error('Caught rejection: ', err, origin);
    logToErrorLog(JSON.stringify({err, origin}));
});

RunInformation();
OverrideConsole();
logToLog("=============================S=T=A=R=T=I=N=G===T=H=E===M=O=D=============================");

fastify.get('/ping', (request, reply) => {
    return {'status': "OK"}
});

// Socket connection for better communication channel
fastify.register(async function (fastify) {
    fastify.get('/chat', {
        websocket: true
    }, (connection : SocketStream, req : FastifyRequest) => {
        connection.socket.on('message', async (msg) => {
            let message = JSON.parse(msg.toString());
            if(message.type != 'log_event') {
                console.log("Message received", msg.toString());
            }
            if (message.type == "connect" && !message.is_n2n) {
                let result = await ClientManager.ConnectToCharacter(message.id, message.formId, message.playerName, message.playerName, connection.socket);
                if(result) {
                    ClientManager.InitNormal(message);
                }
            } else if (message.type == "message" && !message.is_n2n) {
                if(message.stop) {
                    ClientManager.Stop();
                }
                ClientManager.Say(message.message);
            } else if (message.type == "stop" && !message.is_n2n) {
                ClientManager.Stop();
            } else if (message.type == "connect" && message.is_n2n) {
                let result =  await ClientManager_N2N_Source.ConnectToCharacter(message.target, message.targetFormId, message.source, message.playerName, connection.socket);
                result = result && await ClientManager_N2N_Target.ConnectToCharacter(message.source, message.sourceFormId, message.target, message.playerName, connection.socket);

            } else if (message.type == "start" && message.is_n2n) {
                n2nDialogueManager.Init(message.source, message.target, message.sourceFormId, message.targetFormId, message.playerName)
                n2nDialogueManager.Start_N2N_Dialogue(message.location, message.currentDateTime)
            } else if (message.type == "stop" && message.is_n2n) {
                if(n2nDialogueManager && n2nDialogueManager.running()) {
                    n2nDialogueManager.stop();
                }
            } else if (message.type == "log_event") {
                
                if(ClientManager.IsConversationOngoing() && message.id == ClientManager.Id() && message.formId == ClientManager.FormId()) {
                    ClientManager.SendNarratedAction(message.message + " ");
                } else {
                    ClientManager.SaveEventLog(message, message.formId, message.message + " ", message.playerName);
                }
                if(n2nDialogueManager.IsConversationOngoing()) {
                    EventBus.GetSingleton().emit("N2N_EVENT", message);
                }
            }
        })
    })
});

// Run the server!
const StartEngine = async () => {
    try {
        let portOnConfig = parseInt(process.env.CLIENT_PORT);
        await fastify.listen({port: portOnConfig})
    } catch (err) {
        logToLog(JSON.stringify(err));
        fastify.log.error(err);
        console.error(err);
        process.exit(1)
    }
}; 

StartEngine();


function RunInformation(){
    console.log("\x1b[32m",`                                                                                                    
                                                                                                    
                                                                                                    
                                             @        ,                                             
                                            @@@       @@#                                           
                                           @@           @@                                          
                                          @@    (       &@@                                         
                                         @@@   &@@@@     @@@                                        
                                       *@@@    @@  (@%    @&@                                       
                                      @@,@*   (      #@   @@ @                                      
                                     @@ @@@        @@,    @@@ @,                                    
                                    @@ @@      @@,          @@ @@                                   
                                   @@ @@&      @@@          @@@ @@                                  
                                  @@.@@@    @#@ @@@*  .@&   %@@@.@@                                 
                                  @@ @@@&&, &@@@@@@@@@ @   &@@@ @@/                                 
                                   @@#@@@ @@@@@@@@ @@@@@@@@@@@,@@                                   
                                    (@@@@@@@% @@@@@@@@# /@@@@&@@                                    
                                      @@@@@  @  @@@.@ &   #@@@@                                     
                                       @@@,       @@.     @@@@                                      
                                        @@@       @@@     @@@                                       
                                         @@@@@    &@@  @@@@&                                        
                                          @@@@   @@    @@@                                          
                                           @@@  @&     &@                                           
                                            ,@  %@                                                  
                                                &@                                                  
                                               @                                                    
                                                @, #@                                               
                                                 @@&                                                
                                                  ,                                                 
                                                                                                   `);
    console.log("\x1b[34m", "****************************************************");
    console.log("\x1b[32m", "Don't worry, you are suppose to see this!");
    console.log("\x1b[34m", "\n****************************************************\n\n");
    console.log("\x1b[31m", "DONT close this window or other window that opens if you want to use the mod. Close both only once you are done with the game. (Especially audio one because it really hits CPU)");
    console.log("\x1b[32m", "Errors will shown here.");
}

function OverrideConsole() {
    const originalLog = console.log;
    console.log = function () {
        const timestamp: string = new Date().toISOString();
        const args = Array.prototype.slice.call(arguments);
        args.unshift(`[${timestamp}]`);
        originalLog.apply(console, args);
    };
    const originalError = console.error;
    console.error = function () {
        const timestamp: string = new Date().toISOString();
        const args = Array.prototype.slice.call(arguments);
        args.unshift(`[${timestamp}]`);
        originalError.apply(console, args);
        logToLog(JSON.stringify(args));
    };

    (console as any).logToLog =   function () {
        logToLog(JSON.stringify(Array.prototype.slice.call(arguments)));
    }
}

export function logToLog(message: string): void {
    const timestamp: string = new Date().toISOString();
    const logMessage: string = `${timestamp} - ${message}`;
    const logFileName = "AnimaClient.log"
    if (fs.existsSync(logFileName)) { // File exists, append to it
        fs.appendFileSync(logFileName, logMessage + '\n', 'utf8');
    } else { // File does not exist, create it and write the log message
        fs.writeFileSync(logFileName, logMessage + '\n', 'utf8');
    }
}

export function logToErrorLog(message: string): void {
    const timestamp: string = new Date().toISOString();
    const logMessage: string = `${timestamp} - ${message}`;
    const logFileName = "AnimaError.log"
    if (fs.existsSync(logFileName)) { // File exists, append to it
        fs.appendFileSync(logFileName, logMessage + '\n', 'utf8');
    } else { // File does not exist, create it and write the log message
        fs.writeFileSync(logFileName, logMessage + '\n', 'utf8');
    }
}

// console.log("Connecting...")
// let result = await ClientManager.ConnectToCharacter("Faendal", "0", "Uriel", null)
// if(result) {
//     console.log("Connection successful.")
//     ClientManager.Say("Greetings.")
//     waitSync(5)
//     ClientManager.SendNarratedAction("A draugr approaches with an axe in his hands.");
//     ClientManager.Say("Oh, what's that?!")
// }

// let result = await ClientManager.ConnectToCharacter("Faendal", "0", "Adventurer", "Adventurer", null)
// if(result) {
//     console.log("Connection successful.")
//     ClientManager.SendNarratedAction("A draugr approaches with an axe in his hands.");
//     ClientManager.Say("Oh, what's that?!")
//     waitSync(5)
//     EventBus.GetSingleton().emit("END")
// }

// console.log("Connecting...")
// const message = {source: "Faendal", target: "Gerdur", sourceFormId: "0", targetFormId: "1", playerName: "Adventurer", location: "Riverwood", currentDateTime: "Today"}
// let result = await ClientManager_N2N_Source.ConnectToCharacter(message.source, message.sourceFormId, message.target, message.playerName, null);
// result = result && await ClientManager_N2N_Target.ConnectToCharacter(message.target, message.targetFormId, message.source, message.playerName, null);

// n2nDialogueManager.Init(message.source, message.target, message.sourceFormId, message.targetFormId, message.playerName)

// let eventMessage = {id: message.source, formId: message.sourceFormId, message:  "A Draugr is approaching with an axe in his hands!!!"}
// EventBus.GetSingleton().emit("N2N_EVENT", eventMessage);
// eventMessage = {id: message.target, formId: message.targetFormId, message:  "A Draugr is approaching with an axe in his hands!!!"}
// EventBus.GetSingleton().emit("N2N_EVENT", eventMessage);

// waitSync(5)
// n2nDialogueManager.Start_N2N_Dialogue(message.location, message.currentDateTime)

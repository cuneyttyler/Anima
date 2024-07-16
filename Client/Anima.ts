import * as dotenv from 'dotenv'
import websocketPlugin, {SocketStream} from "@fastify/websocket"
import Fastify, {FastifyRequest} from 'fastify'
import DialogueManager from "./Anima/DialogueManager.js";
import N2N_DialogueManager from './Anima/N2N_DialogueManager.js'
import BroadcastManager from './Anima/BroadcastManager.js'
import FileManager from './Anima/FileManager.js';
import EventBus from './Anima/EventBus.js';
import {logToLog, logToErrorLog} from './Anima/LogUtil.js'
import RunWebApp from './webapp/app.js'
import path from "path";
import waitSync from 'wait-sync';
import { BroadcastQueue } from './Anima/BroadcastQueue.js';

const resolved = path.resolve(".env");
logToLog("Reading .env from location: " + resolved);
try {
    dotenv.config({path: resolved})
} catch (e) {
    logToErrorLog("Something is not right with your env config!" + e)
}

export const KEY_FILE_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS
export const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
export const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"

export let DEBUG = false;
export function SET_DEBUG(debug) {
    DEBUG = debug
}
const N2N_MAX_STEP_COUNT = process.env.N2N_MAX_STEP_COUNT ? process.env.N2N_MAX_STEP_COUNT : 5;

const fastify = Fastify({logger: true});
fastify.register(websocketPlugin);

const fileManager = new FileManager()
const ClientManager = new DialogueManager(false);
const ClientManager_N2N = new DialogueManager(true)
let broadcastManager : BroadcastManager

export let BROADCAST_QUEUE = new BroadcastQueue(null)
export let N2N_SPEAKER
export let N2N_LISTENER
EventBus.GetSingleton().on("N2N_END", () => {
    N2N_SPEAKER = null
    N2N_LISTENER = null
})

RunInformation();

logToLog("=============================S=T=A=R=T=I=N=G===T=H=E===M=O=D=============================");

fastify.get('/ping', (request, reply) => {
    return {'status': "OK"}
});

// Socket connection for better communication channel
fastify.register(async function (fastify) {
    fastify.get('/chat', {
        websocket: true
    }, (connection : SocketStream, req : FastifyRequest) => {
        DEBUG = false
        BROADCAST_QUEUE = new BroadcastQueue(connection.socket)

        connection.socket.on('message', async (msg) => {

            let message = JSON.parse(msg.toString());
            if(message.type != 'log_event' && message.type != 'broadcast-set' && message.type != 'cellactors-set') {
                console.log("Message received", msg.toString());
            }
            if (message.type == "connect" && !message.is_n2n) {
                let result = await ClientManager.ConnectToCharacter(message.id, message.formId, message.voiceType, message.playerName, message.playerName, connection.socket);
                if(result) {
                    ClientManager.InitNormal('In ' + message.location + ', on ' + message.currentDateTime + ', you started to talk with ' + message.playerName + '. ');
                }
            } else if (message.type == "message" && !message.is_n2n) {
                if(message.stop) {
                    ClientManager.Stop();
                }
                ClientManager.Say(message.message);
            } else if (message.type == "stop" && !message.is_n2n) {
                ClientManager.Stop();
            } else if (message.type == "connect" && message.is_n2n) {
                let result = await ClientManager_N2N.ConnectToCharacter(message.source, message.sourceFormId, message.sourceVoiceType, message.target, message.playerName, connection.socket);
                if(result) {
                    N2N_SPEAKER = message.source
                    N2N_LISTENER = message.target
                    ClientManager_N2N.SendNarratedAction("You are at " + message.location + ". It's " + message.currentDateTime + ". Please keep your answers short if possible.")
                    ClientManager_N2N.StartN2N(message.location, message.target)
                    broadcastManager = new BroadcastManager(message.playerName,connection.socket)
                }
            } else if (message.type == "start" && message.is_n2n) {
                
            } else if (message.type == "stop" && message.is_n2n) {
                if(broadcastManager) broadcastManager.Stop()
            } else if (message.type == "broadcast-set") {
                BroadcastManager.SetCharacters(message.ids, message.formIds, message.voiceTypes)
            } else if (message.type == "cellactors-set") {
                BroadcastManager.SetCellCharacters(message.ids)
            } else if (message.type == "broadcast") {
                if(broadcastManager) broadcastManager.Say(message.message, message.playerName, null)
            } else if (message.type == "log_event") {
                fileManager.SaveEventLog(message.id, message.formId, message.message + " ", message.playerName);
                
                if(ClientManager.IsConversationOngoing() && message.id == ClientManager.Id() && message.formId == ClientManager.FormId()) {
                    ClientManager.SendNarratedAction(message.message + " ");
                }
            } else if (message.type == "hard-reset") {
                if(ClientManager.IsConversationOngoing()) {
                    ClientManager.StopImmediately();
                }
                if(broadcastManager) broadcastManager.Stop()
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
        // process.exit(1)
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
    console.log("\x1b[32m", "Errors will show here.");
}

RunWebApp()

// DEBUG = true
// let result = await ClientManager.ConnectToCharacter("Faendal", "0", "MaleEvenToned", "Adventurer", "Adventurer", null)
// if(result) {
//     console.log("Connection successful.")
//     // ClientManager.SendNarratedAction("A draugr approaches with an axe in his hands.");
//     ClientManager.Say("What do you find interesting about me?")
//     setTimeout(() => {
//         EventBus.GetSingleton().emit("END")
//     }, 3000)
// }

// DEBUG = true
// console.log("Connecting...")
// const message = {source: "Faendal", target: "Gerdur", sourceFormId: "0", targetFormId: "1", playerName: "Adventurer", location: "Riverwood", currentDateTime: "Today"}
// let result = await ClientManager_N2N_Source.ConnectToCharacter(message.source, message.sourceFormId, "MaleEvenToned", message.target, message.playerName, null);
// result = result && await ClientManager_N2N_Target.ConnectToCharacter(message.target, message.targetFormId, "FemaleNord", message.source, message.playerName, null);

// n2nDialogueManager.Init(message.source, message.target, message.sourceFormId, message.targetFormId, message.playerName)

// let eventMessage = {id: message.source, formId: message.sourceFormId, message:  "A Draugr is approaching with an axe in his hands!!!"}
// EventBus.GetSingleton().emit("N2N_EVENT", eventMessage);
// eventMessage = {id: message.target, formId: message.targetFormId, message:  "A Draugr is approaching with an axe in his hands!!!"}
// EventBus.GetSingleton().emit("N2N_EVENT", eventMessage);

// n2nDialogueManager.Start_N2N_Dialogue(message.location, message.currentDateTime)

// DEBUG = true
// BroadcastManager.SetCharacters(['Eerie', 'Ilynn', 'Llynn', 'Arynn'], ['0', '1', '2', '3'], ['FemaleNord', 'FemaleChild', 'FemaleChild', 'MaleChild'])
// new BroadcastManager(null).Say('Hi, I hope you are enjoying your day.', 'Uriel', null, 'Uriel')
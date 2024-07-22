import * as dotenv from 'dotenv'
import websocketPlugin, {SocketStream} from "@fastify/websocket"
import Fastify, {FastifyRequest} from 'fastify'
import DialogueManager from "./Anima/DialogueManager.js";
import BroadcastManager from './Anima/BroadcastManager.js'
import FileManager from './Anima/FileManager.js';
import EventBus from './Anima/EventBus.js';
import {logToLog, logToErrorLog} from './Anima/LogUtil.js'
import RunWebApp from './webapp/app.js'
import path from "path";
import waitSync from 'wait-sync';
import { BroadcastQueue } from './Anima/BroadcastQueue.js';
import FollowerManager from './Anima/FollowerManager.js';

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
export const GOOGLE_LLM_MODEL = process.env.GOOGLE_LLM_MODEL
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
export const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
export const OPENROUTER_LLM_MODEL = process.env.OPENROUTER_LLM_MODEL

export let DEBUG = false;
export function SET_DEBUG(debug) {
    DEBUG = debug
}
const N2N_MAX_STEP_COUNT = process.env.N2N_MAX_STEP_COUNT ? process.env.N2N_MAX_STEP_COUNT : 5;

const fastify = Fastify({logger: true});
fastify.register(websocketPlugin);

const fileManager = new FileManager()
const ClientManager = new DialogueManager();
const ClientManager_N2N = new DialogueManager()
let broadcastManager : BroadcastManager
let followerManager : FollowerManager

export let BROADCAST_QUEUE = new BroadcastQueue(null)

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
            if(message.type != 'log_event' && message.type != 'broadcast-set' && message.type != 'cellactors-set' && message.type != 'followers-clear') {
                console.log("Message received", msg.toString());
            }
            if (message.type == "connect" && !message.is_n2n) {
                let result = await ClientManager.ConnectToCharacter(message.id, message.formId, message.voiceType, message.playerName, message.playerName, connection.socket);
                if(result) {
                    ClientManager.InititializeSession('In ' + message.location + ', on ' + message.currentDateTime + ', you started to talk with ' + message.playerName + '. ');
                }
                if(broadcastManager) broadcastManager.Stop()
            } else if (message.type == "message" && !message.is_n2n) {
                if(message.stop) {
                    ClientManager.Stop();
                }
                await ClientManager.Say(message.message);
            } else if (message.type == "stop" && !message.is_n2n) {
                ClientManager.Stop();
            } else if (message.type == "connect" && message.is_n2n) {
                broadcastManager = BroadcastManager.GetInstance(message.playerName, connection.socket)
                if(broadcastManager.IsRunning()) {
                    broadcastManager.AddCharacter(message.source, message.sourceFormId, message.sourceVoiceType, 3)
                    broadcastManager.AddCharacter(message.target, message.targetFormId, message.targetVoiceType, 3)
                } else {
                    await broadcastManager.ConnectToCharacters()
                }
                
                await broadcastManager.Run()
                await broadcastManager.StartN2N(message.source, message.sourceFormId, message.target, message.targetFormId, message.location, message.currentDateTime)
            } else if (message.type == "stop" && message.is_n2n) {
                if(broadcastManager) broadcastManager.Stop()
            } else if (message.type == "pause") {
                if(broadcastManager) broadcastManager.Pause()
            } else if (message.type == "continue") {
                if(broadcastManager) broadcastManager.Continue()
            } else if (message.type == "followers-clear") {
                if(!followerManager) {
                    followerManager = new FollowerManager(message.playerName, connection.socket)
                }
                followerManager.Clear()
            } else if (message.type == "followers-set") {
                if(!followerManager) {
                    followerManager = new FollowerManager(message.playerName, connection.socket)
                    followerManager.Run()
                }
                broadcastManager = BroadcastManager.GetInstance(message.playerName, connection.socket)
                followerManager.ConnectToCharacter(message.ids[0], message.formIds[0], message.voiceTypes[0], message.distances[0])
                if(!followerManager.IsRunning()) {
                    followerManager.Run()
                }
            } else if (message.type == "broadcast-set") {
                broadcastManager = BroadcastManager.GetInstance(message.playerName, connection.socket)
                await broadcastManager.SetCharacters(message.ids, message.formIds, message.voiceTypes, message.distances, message.currentDateTime, message.location)
            } else if (message.type == "cellactors-set") {
                broadcastManager = BroadcastManager.GetInstance(message.playerName, connection.socket)
                broadcastManager.SetCellCharacters(message.ids)
            } else if (message.type == "broadcast") {
                broadcastManager = BroadcastManager.GetInstance(message.playerName, connection.socket)
                if(!broadcastManager.IsRunning()) await broadcastManager.ConnectToCharacters();
                broadcastManager.Run()
                broadcastManager.Say(message.message, message.playerName, message.playerFormId)
            } else if (message.type == "log_event") {
                broadcastManager = BroadcastManager.GetInstance(message.playerName, connection.socket)
                fileManager.SaveEventLog(message.id.toLowerCase().replaceAll(" ","_"), message.formId, "It's " + broadcastManager.currentDateTime + ". " + message.message + " ", message.playerName);
                
                if(ClientManager.IsConversationOngoing() && message.id == ClientManager.GetId() && message.formId == ClientManager.GetFormId()) {
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
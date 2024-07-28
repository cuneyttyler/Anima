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
import LectureManager from './Anima/LectureManager.js';
import AliveCharacterManager from './Anima/AliveCharacterManager.js';

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
let n2nBroadcastManager : BroadcastManager
let followerManager : FollowerManager
let lectureManager : LectureManager
let aliveCharacterManager : AliveCharacterManager

export let BROADCAST_QUEUE = new BroadcastQueue(1, null)
export let LECTURE_QUEUE = new BroadcastQueue(3, null)

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
        BROADCAST_QUEUE = new BroadcastQueue(1, connection.socket)
        LECTURE_QUEUE = new BroadcastQueue(3, connection.socket)

        connection.socket.on('message', async (msg) => {

            let message = JSON.parse(msg.toString());
            if(message.type == 'init') {
                if(!aliveCharacterManager) {
                    aliveCharacterManager = new AliveCharacterManager(message.playerName, connection.socket)
                    aliveCharacterManager.Run()
                }
            } else if (message.type == "connect" && !message.is_n2n) {
                console.log("** Incoming Message: Connect request to " + message.id + " **");
                let result = await ClientManager.ConnectToCharacter(message.id, message.formId, message.voiceType, message.playerName, message.playerName, message.currentDateTime, connection.socket);
                if(result) {
                    ClientManager.InititializeSession('In ' + message.location + ', on ' + message.currentDateTime + ', you started to talk with ' + message.playerName + '. ');
                }
                n2nBroadcastManager = BroadcastManager.GetInstance('n2n', message.playerName, connection.socket)
                if(n2nBroadcastManager) n2nBroadcastManager.Stop()
            } else if (message.type == "message" && !message.is_n2n) {
                console.log("** Incoming Message: Player saying: " + message.message + " **");
                if(message.stop) {
                    ClientManager.Stop();
                }
                await ClientManager.Say(message.message);
            } else if (message.type == "stop" && !message.is_n2n) {
                console.log("** Incoming Message: Stop request. **");
                ClientManager.Stop();
            } else if (message.type == "connect" && message.is_n2n) {
                console.log("** Incoming Message: Connect(N2N) request to " + message.source + " and " + message.target + " **");
                if(lectureManager && lectureManager.IsRunning() && message.location == "Hall of the Elements") {
                    console.log("** Lecture ongoing, ignoring request.");
                    return;
                }
                n2nBroadcastManager = BroadcastManager.GetInstance('n2n', message.playerName, connection.socket)
                await n2nBroadcastManager.ConnectToCharacters(true)
                await n2nBroadcastManager.Run()
                let result = n2nBroadcastManager.IsCharactersPresent([message.source, message.target])
                if(result) {
                    n2nBroadcastManager.SendVerifyConnection()
                }
            } else if (message.type == "start" && message.is_n2n) {
                console.log("** Incoming Message: Start request for " + message.source + " and " + message.target + " **");
                if(lectureManager && lectureManager.IsRunning() && message.location == "Hall of the Elements") {
                    console.log("** Lecture ongoing, ignoring request.");
                    return;
                }
                n2nBroadcastManager = BroadcastManager.GetInstance('n2n', message.playerName, connection.socket)
                await n2nBroadcastManager.Run()
                await n2nBroadcastManager.StartN2N(message.source, message.sourceFormId, message.target, message.targetFormId, message.location, message.currentDateTime)
            }else if (message.type == "pause") {
                broadcastManager = BroadcastManager.GetInstance('player')
                if(broadcastManager) broadcastManager.Pause()
                n2nBroadcastManager = BroadcastManager.GetInstance('n2n')
                if(n2nBroadcastManager) n2nBroadcastManager.Pause();
                if(lectureManager) lectureManager.Pause()
            } else if (message.type == "continue") {
                broadcastManager = BroadcastManager.GetInstance('player')
                if(broadcastManager) broadcastManager.Continue()
                n2nBroadcastManager = BroadcastManager.GetInstance('n2n')
                if(n2nBroadcastManager) n2nBroadcastManager.Continue()
                if(lectureManager) lectureManager.Continue()
            } else if (message.type == "followers-clear") {
                FollowerManager.GetInstance(message.playerName, connection.socket).Clear()
            } else if (message.type == "followers-set") {
                followerManager = FollowerManager.GetInstance(message.playerName, connection.socket)
                if(!followerManager.IsRunning())followerManager.Run()
                followerManager.ConnectToCharacter(message.ids[0], message.formIds[0], message.voiceTypes[0], message.distances[0])
                if(!followerManager.IsRunning()) {
                    followerManager.Run()
                }
            } else if (message.type == "cellactors-set") {
                broadcastManager = BroadcastManager.GetInstance('player', message.playerName, connection.socket)
                broadcastManager.SetCellCharacters(message.ids)
                n2nBroadcastManager = BroadcastManager.GetInstance('n2n', message.playerName, connection.socket)
                n2nBroadcastManager.SetCellCharacters(message.ids)
                if(!aliveCharacterManager) {
                    aliveCharacterManager = new AliveCharacterManager(message.playerName, connection.socket)
                    aliveCharacterManager.Run()
                }
            } else if (message.type == "broadcast-stop") {
                broadcastManager = BroadcastManager.GetInstance('player')
                if(broadcastManager && !message.id) broadcastManager.Stop()
                if(broadcastManager && message.id) broadcastManager.StopForCharacter(message.id)
                n2nBroadcastManager = BroadcastManager.GetInstance('n2n')
                if(n2nBroadcastManager && !message.id) n2nBroadcastManager.Stop()
                if(n2nBroadcastManager && message.id) n2nBroadcastManager.StopForCharacter(message.id)
            }  else if (message.type == "broadcast-set") {
                broadcastManager = BroadcastManager.GetInstance('player', message.playerName, connection.socket)
                await broadcastManager.SetCharacters(message.ids, message.formIds, message.voiceTypes, message.distances, message.currentDateTime, message.location)
            } else if (message.type == "broadcast") {
                console.log("** Incoming Message: Player saying broadcast: " + message.message + " **");
                if(lectureManager && lectureManager.IsRunning() && message.location == "Hall of the Elements") {
                    lectureManager.Say(message.message, message.playerName, message.playerFormId, true)
                } else {
                    broadcastManager = BroadcastManager.GetInstance('player', message.playerName, connection.socket)
                    broadcastManager.ConnectToCharacters(true)
                    broadcastManager.Run()
                    broadcastManager.Say(message.message, message.playerName, message.playerFormId)
                }
            } else if (message.type == "broadcast-n2n-set") {
                n2nBroadcastManager = BroadcastManager.GetInstance('n2n', message.playerName, connection.socket)
                await n2nBroadcastManager.SetCharacters(message.ids, message.formIds, message.voiceTypes, message.distances, message.currentDateTime, message.location)
            } else if (message.type == "log_event") {
                fileManager.SaveEventLog(message.id, message.formId, "It's " + broadcastManager.currentDateTime + ". " + message.message + " ", message.playerName);
            } else if (message.type == "start-lecture") {
                lectureManager = new LectureManager(message.playerName, connection.socket)
                lectureManager.StartLecture(message.teacher, message.teacherFormId, message.teacherVoiceType, message.lectureNo, message.lectureIndex, message.currentDateTime)
            }  else if (message.type == "end-lecture") {
                if(lectureManager) lectureManager.SetEndSignal()
            } else if (message.type == "hard-reset") {
                console.log("** Incoming Message: HARD_RESET **");
                if(ClientManager.IsConversationOngoing()) {
                    ClientManager.StopImmediately();
                }
                broadcastManager = BroadcastManager.GetInstance('player')
                if(broadcastManager) broadcastManager.Stop()
                n2nBroadcastManager = BroadcastManager.GetInstance('n2n')
                if(n2nBroadcastManager) n2nBroadcastManager.Stop()
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
// let result = await ClientManager.ConnectToCharacter("Colette Marence", "115112", "FemaleShrill", "Uriel", "Uriel", "Fifth of the First Seed", null)
// if(result) {
//     console.log("Connection successful.")
//     ClientManager.Say("Professor, last lecture was fascinating.")
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

// DEBUG = true
// lectureManager = new LectureManager("Uriel", null)
// lectureManager.StartLecture("Colette Marence", "115112", "FemaleShrill", 0, 4, "Fourth of the First Seed")

// setTimeout(() => {
//     lectureManager.SetEndSignal()
// }, 20000)
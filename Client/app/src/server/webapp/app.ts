import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import DatasetProcessing from '../Anima/DatasetProcessing.js'
import EventBus from '../Anima/EventBus.js'
import Api from './api.js'
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { Server } from 'socket.io';

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express()

app.use(express.static('web'))

let api: Api = new Api()
let dp: DatasetProcessing = new DatasetProcessing()

export default function RunWebApp() {
    const server = app.listen(3000, () => {
        console.log("Web interface listening on port 3000")
    })

    const io = new Server(server, {
        cors: {
            origin: ['http://localhost:3000', 'http://localhost:8080']
          }
    })

    io.on('connection', (socket) => {        
        socket.on('disconnect', () => {
            EventBus.GetSingleton().removeAllListeners('WEB_TARGET_RESPONSE')
            EventBus.GetSingleton().removeAllListeners('WEB_BROADCAST_RESPONSE')
        });
        
        socket.on('chat', (data) => {
            if(data.type == 1) {
                api.SendN2N(data.ids, data.text, io)
            } else if(data.type == 2) {
                api.SendBroadcast(data.ids, data.speaker, data.text, io)
            }
        });
      });

    // Parse application/x-www-form-urlencoded
    // app.use(bodyParser.urlencoded({ extended: false }));

    // // Parse application/json
    // app.use(bodyParser.json());

    const allowedOrigins = ['www.example1.com', 'www.example2.com'];
        app.use(cors({
        origin: function(origin, callback){
            if (!origin) {
            return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
            }
            return callback(null, true);
        }

        }));

    app.get('/api/character', (req,res) => {
        res.send(api.CharacterList())
    })

    app.get('/api/character/alive', (req,res) => {
        res.send(api.AliveCharacterList())
    })

    app.post('/api/character', (req,res) => {
        api.SaveCharacter(req.body)
        res.sendStatus(200)
    })

    app.post('/api/character/alive', (req,res) => {
        api.SaveAliveCharacter(req.body)
        res.sendStatus(200)
    })

    app.delete('/api/character/:id', (req,res) => {
        api.DeleteCharacter(req.params.id)
        res.sendStatus(200)
    })

    app.delete('/api/character/alive/:id', (req,res) => {
        api.DeleteAliveCharacter(req.params.id)
        res.sendStatus(200)
    })

    app.get('/api/voices/:gender', function(req, res){
        if(req.params.gender.toLowerCase() == 'female')
            res.send(api.FemaleVoices())
        else if(req.params.gender.toLowerCase() == 'male') {
            res.send(api.MaleVoices())
        }
    });

    app.get('/api/voice/:gender/:voice/:pitch', function(req, res){
        if(req.params.gender.toLowerCase() != 'male' && req.params.gender.toLowerCase() != 'female' 
            && req.params.voice.includes('..')
            && req.params.pitch.includes('..')) {
                res.sendStatus(404)
                return
            }
            
        const file = api.ApplyPitch(req.params.gender.toLowerCase(), req.params.voice, req.params.pitch, (file) => {
            res.download(file)
        })
    });

    app.get('/api/autofill/:name', async function(req,res) {
        try {
            let character = await api.Autofill(req.params.name)
            res.send(character)
        } catch(err) {
            if(err.status == 1) {
                res.sendStatus(401)
            } else if(err.status == 2) {
                res.sendStatus(500)
            }
            
        }
    })

    app.post('/api/chat', async function(req,res) {
        if(!req.body.ids || !req.body.text || req.body.ids.length == 0) {
            res.sendStatus(400)
            return
        }

        if(req.body.type == 0) {
            api.SendNormal(req.body.ids, req.body.speaker, req.body.text, (response) => {
                if(!res) return
                res.send(response)
            })
        } else if(req.body.type == 1) {
            api.SendBroadcast(req.body.ids, req.body.speaker, req.body.text, (response) => {
                if(!res) return
                res.send(response)
            })
        } else {
            res.sendStatus(400)
        }
    })

    app.get('/api/prepareDataset', async function(req,res) {
        await dp.PrepareDataset_v2()
    })

    app.get('/api/postprocessDataset', async function(req,res) {
        await dp.PostProcessDataset_v2()
    })
}
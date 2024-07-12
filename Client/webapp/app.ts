import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import Api from './api.js'
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express()

app.use(express.static('web'))

let api: Api = new Api()

export default function RunWebApp() {
    app.listen(3000, () => {
        console.log("Web interface listening on port 3000")
    })

    // Parse application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({ extended: false }));

    // Parse application/json
    app.use(bodyParser.json());

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

    app.post('/api/character', (req,res) => {
        api.SaveCharacter(req.body)
        res.sendStatus(200)
    })

    app.delete('/api/character/:id', (req,res) => {
        api.DeleteCharacter(req.params.id)
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
}
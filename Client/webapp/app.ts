import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import Api from './api.js'
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { fileURLToPath } from 'url';
import path from 'path'
import { exec } from 'child_process';

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express()

app.use(express.static('webapp/public'))

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
        if(req.params.pitch == "1" || req.params.pitch == "1.0") {
            const file = "./voices/" + req.params.gender.toLowerCase() + "/" + req.params.voice + ".mp3"
            res.download(file);
            return
        }

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const ffmpegDir = '../../Audio';
        const ffmpegPath = path.join(__dirname, ffmpegDir, 'ffmpeg');
        const inputFile = "./voices/" + req.params.gender.toLowerCase() + "/" + req.params.voice + ".mp3"
        const output_file = "./Audio/Temp/" + req.params.voice + ".mp3"

        const command = `${ffmpegPath} -i ${inputFile} ${output_file}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error converting audio: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`FFmpeg encountered an error: ${stderr}`);
                return;
            }
            console.log(`Audio conversion successful. Output saved to ${output_file}`);
        });


        // ffmpeg()
        //         .input(inputFile)
        //         .audioCodec('pcm_s16le') // Set the audio codec to PCM with 16-bit depth
        //         .audioFrequency(44100) // Set the sample rate
        //         .on('error', function(err) {
        //             console.error('Error while converting:', err);
        //         })
        //         .on('end', function() {
        //             // res.download(output_file)
        //         })
        //         .save(output_file);

        // const file = api.ApplyPitch(req.params.gender.toLowerCase(), req.params.voice, req.params.pitch, (file) => {
        //     res.download(file)
        // })
    });
}
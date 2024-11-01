import CharacterManager from "../Anima/CharacterManager.js"
import GoogleGenAI from "../Anima/GoogleGenAI.js"
import PromptManager from "../Anima/PromptManager.js"

import fs from 'fs'
import path from 'path'
import waitSync from 'wait-sync'
import BroadcastManager from "./BroadcastManager.js"

export default class DatasetProcessing {
    private characterManager: CharacterManager;
    private promptManager: PromptManager;

    constructor() {
        this.characterManager = new CharacterManager()
        this.promptManager = new PromptManager()
    }

    PostProcessDataset_v1() {
        const raw_dataset = JSON.parse(fs.readFileSync(path.resolve("./other/skyrim_dataset_raw.json"), 'utf-8'));

        let final_data = []
        let count = 0
        raw_dataset.forEach((d) => {
            const character_1 = this.characterManager.GetCharacter(d[0].character_1.toLowerCase())
            const character_2 = this.characterManager.GetCharacter(d[1].character_2.toLowerCase())
            const text_1 = d[0].text_1
            const text_2 = d[1].text_2

            if(!character_1 || !character_2)
                return

            let prompt = new PromptManager().PrepareDialogueMessage("Uriel", character_1, character_2, "", "", text_1, BroadcastManager.currentLocation)
            
            let messages = []
            messages.push({role: 'user', content: prompt.prompt + prompt.message}, {role: 'model', content: text_2})
            final_data.push(JSON.stringify({messages: messages}))
            count++
        })

        fs.writeFileSync('skyrim_dataset.jsonl', final_data.join('\n'), 'utf8')
        console.log("Written " + count + " lines.")
        console.log("DONE")
    }

    CleanDataset() {
        const raw_dataset = JSON.parse(fs.readFileSync(path.resolve("./other/skyrim_dataset_raw_v2.json"), 'utf-8'));

        let final_data = []
        let count = 0
        let filtered_dataset = []
        raw_dataset.forEach((d) => {
            d[0].character == d[0].character.replaceAll("**","")
            d[0].text == d[0].text.replaceAll("**","")
            d[1].character == d[1].character.replaceAll("**","")
            d[1].text == d[1].text.replaceAll("**","")

            const character_1 = d[0].character
            const character_2 = d[1].character
            const text_1 = d[0].text
            const text_2 = d[1].text

            if(!character_1 || !character_2 || character_1 == "" || character_2 == "" || text_1 == "===" || text_2 == "===" || text_1 == "##" || text_2 == "##"
                || text_1.length < 20 || text_2.length < 20
            )
                return

            let found: boolean = false
            filtered_dataset.forEach((d_2) => {
                if(character_2 == d_2[1].character) {
                    found = true
                    return
                }
            })

            if(found)
                return

            count++
            filtered_dataset.push([{character: character_1, text: text_1}, {character: character_2, text: text_2}])
        })

        fs.writeFileSync('./other/skyrim_dataset_raw_v2_cleaned_v2.json', JSON.stringify(filtered_dataset), 'utf8')
        console.log("Written " + count + " lines.")
        console.log("DONE")
    }

    // 1 Event
    // Broadcast direct prompts (1 Event directed towards target)
    // Broadcast different target prompts (1 event directed towards different target - response: NOT_ANSWERING)
    // Broadcast crowd-directed prompts (1 event directed towards crowd - response: NOW_ANSWERING or answer)
    // With event history
    // Broadcast direct prompts
    // Broadcast different target prompts
    // Broadcast crowd-directed prompts
    PostProcessDataset_v2() {
        const raw_dataset = JSON.parse(fs.readFileSync(path.resolve("./other/skyrim_dataset_v3.json"), 'utf-8'));
        let broadcast_dialogues_raw = fs.readFileSync(path.resolve("./other/broadcast_dialogues.txt"), 'utf-8')
        let broadcast_dialogues = broadcast_dialogues_raw.split("=========").map((d) => d.split("\n"))

        let j = 0
        let count = 0
        let final_data = []
        raw_dataset.forEach((d) => { 
            if(j++ > 2000) return

            // const character_1 = this.characterManager.GetCharacter(d[0].character.toLowerCase())
            // const character_2 = this.characterManager.GetCharacter(d[1].character.toLowerCase())
            // const text_1 = d[0].text
            // const text_2 = d[1].text

            // if(!character_2) {
            //     return
            // }

            // let promptManager = new PromptManager()

            // let prompt = promptManager.PrepareDialogueMessage("Uriel", character_1, character_2, "", text_1, BroadcastManager.currentLocation)
            
            // let messages = []
            // messages.push({role: 'user', content: prompt.prompt + prompt.message}, {role: 'model', content: text_2})
            // final_data.push(JSON.stringify({messages: messages}))
            // count++

            // BroadcastManager.SetCharacters([character_2.id], ["0"], ["MaleNord"], [1], null, "Riverwood")
            // new BroadcastManager("Adventurer", null).ConnectToCharacters()
            
            // // 1 //
            // messages = []
            // let broadcastPrompt = promptManager.PrepareBroadcastMessage("Adventurer", d[0].character, null, [character_2], character_2, "", character_2.name + ", " + text_1, "", BroadcastManager.currentLocation)
            // messages.push({role: 'user', content: broadcastPrompt.prompt + broadcastPrompt.message}, {role: 'model', content: text_2})
            // final_data.push(JSON.stringify({messages: messages}))
            // count++

            // // 2 //
            // messages = []
            // let index = Math.floor(Math.random() * raw_dataset.length)
            // let differentTarget = raw_dataset[index]
            // while(differentTarget.name == character_2.name) {
            //     Math.floor(Math.random() * raw_dataset.length)
            //     differentTarget = raw_dataset[index]
            // }
            // broadcastPrompt = promptManager.PrepareBroadcastMessage("Adventurer", d[0].character, null, [character_2], character_2, "", differentTarget.name + ", " + text_1, "", BroadcastManager.currentLocation)
            // messages.push({role: 'user', content: broadcastPrompt.prompt + broadcastPrompt.message}, {role: 'model', content: "**NOT_ANSWERING**"})
            // final_data.push(JSON.stringify({messages: messages}))
            // count++

            // // 3 //
            // messages = []
            // index = Math.floor(Math.random() * broadcast_dialogues.length)
            // let d_2 = broadcast_dialogues[index]
            // broadcastPrompt = promptManager.PrepareBroadcastMessage("Adventurer", d[0].character, null, [character_2], character_2, "", d[0], "", BroadcastManager.currentLocation)
            // messages.push({role: 'user', content: broadcastPrompt.prompt + broadcastPrompt.message}, {role: 'model', content: text_2})
            // final_data.push(JSON.stringify({messages: messages}))
            // count++

            // messages = []
            // index = Math.floor(Math.random() * broadcast_dialogues.length)
            // d_2 = broadcast_dialogues[index]
            // broadcastPrompt = promptManager.PrepareBroadcastMessage("Adventurer", d[0].character, null, [character_2], character_2, "", d[0], "", BroadcastManager.currentLocation)
            // messages.push({role: 'user', content: broadcastPrompt.prompt + broadcastPrompt.message}, {role: 'model', content: "**NOT ANSWERING**"})
            // final_data.push(JSON.stringify({messages: messages}))
            // count++

            // // 4 //
            // messages = []
            // let eventHistory = ""
            // for(let i = 0; i < 5; i++) {
            //     index = Math.floor(Math.random() * raw_dataset.length)

            //     let dd = raw_dataset[index]
            //     const character_1 = this.characterManager.GetCharacter(dd[0].character.toLowerCase())
            //     const character_2 = this.characterManager.GetCharacter(dd[1].character.toLowerCase())
            //     const text_1 = dd[0].text
            //     const text_2 = dd[1].text

            //     if(character_1)
            //         eventHistory += character_1.name + " said: " + text_1 + " "
            //     if(character_2)
            //         eventHistory += character_2.name + " said: " + text_2
            // }
            
            // broadcastPrompt = promptManager.PrepareBroadcastMessage("Adventurer", d[0].character, null, [character_2], character_2, "", character_2.name + ", " + text_1, eventHistory, BroadcastManager.currentLocation)
            // messages.push({role: 'user', content: broadcastPrompt.prompt + broadcastPrompt.message}, {role: 'model', content: text_2})
            // final_data.push(JSON.stringify({messages: messages}))
            // count++

            // // 5 //
            // messages = []
            // eventHistory = ""
            // for(let i = 0; i < 5; i++) {
            //     index = Math.floor(Math.random() * raw_dataset.length)

            //     let dd = raw_dataset[index]
            //     const character_1 = this.characterManager.GetCharacter(dd[0].character.toLowerCase())
            //     const character_2 = this.characterManager.GetCharacter(dd[1].character.toLowerCase())
            //     const text_1 = dd[0].text
            //     const text_2 = dd[1].text

            //     if(character_1)
            //         eventHistory += character_1.name + " said: " + text_1 + " "
            //     if(character_2)
            //         eventHistory += character_2.name + " said: " + text_2
            // }

            // index = Math.floor(Math.random() * raw_dataset.length)
            // differentTarget = raw_dataset[index]
            // while(differentTarget.name == character_2.name) {
            //     Math.floor(Math.random() * raw_dataset.length)
            //     differentTarget = raw_dataset[index]
            // }
            // broadcastPrompt = promptManager.PrepareBroadcastMessage("Adventurer", d[0].character, null, [character_2], character_2, "", differentTarget.name + ", " + text_1, eventHistory, BroadcastManager.currentLocation)
            // messages.push({role: 'user', content: broadcastPrompt.prompt + broadcastPrompt.message}, {role: 'model', content: "**NOT_ANSWERING**"})
            // final_data.push(JSON.stringify({messages: messages}))
            // count++

            
            // // 6 //
            // messages = []
            // eventHistory = ""
            // for(let i = 0; i < 5; i++) {
            //     index = Math.floor(Math.random() * raw_dataset.length)

            //     let dd = raw_dataset[index]
            //     const character_1 = this.characterManager.GetCharacter(dd[0].character.toLowerCase())
            //     const character_2 = this.characterManager.GetCharacter(dd[1].character.toLowerCase())
            //     const text_1 = dd[0].text
            //     const text_2 = dd[1].text

            //     if(character_1)
            //         eventHistory += character_1.name + " said: " + text_1 + " "
            //     if(character_2)
            //         eventHistory += character_2.name + " said: " + text_2
            // }

            // index = Math.floor(Math.random() * broadcast_dialogues.length)
            // d_2 = broadcast_dialogues[index]
            // broadcastPrompt = promptManager.PrepareBroadcastMessage("Adventurer", d[0].character, null, [character_2], character_2, "", d[0], eventHistory, BroadcastManager.currentLocation)
            // messages.push({role: 'user', content: broadcastPrompt.prompt + broadcastPrompt.message}, {role: 'model', content: text_2})
            // final_data.push(JSON.stringify({messages: messages}))
            // count++

            // messages = []
            // index = Math.floor(Math.random() * broadcast_dialogues.length)
            // d_2 = broadcast_dialogues[index]
            // broadcastPrompt = promptManager.PrepareBroadcastMessage("Adventurer", d[0].character, null, [character_2], character_2, "", d[0], eventHistory, BroadcastManager.currentLocation)
            // messages.push({role: 'user', content: broadcastPrompt.prompt + broadcastPrompt.message}, {role: 'model', content: "**NOT ANSWERING**"})
            // final_data.push(JSON.stringify({messages: messages}))
            // count++
            
        })

        fs.writeFileSync('./other/skyrim_dataset_v3.jsonl', final_data.join('\n'), 'utf8')
        
        console.log("Written " + count + " lines.")
        console.log("DONE")
    }

    async Send(c) {
        let characterPrompt = new PromptManager().PrepareCharacterPrompt(c)

        let prompt = 
            " GENERATE 1 creative, realistic dialogues for " + c.name + " from Skyrim. Use in-game, known dialogues if possible. "
                + "DO NOT PRECEDE YOUR ANSWER WITH ANY EXPLANATION. "
                + "PLEASE GENERATE AS A DIALOGUE SPOKEN BY TWO PEOPLE AS SHOWN BELOW "
                + "PLEASE SEPARATE EACH DIALOGUE WITH ========== (10 equals sign)"
                + c.name + " WILL BE RESPONDER "
                + "EXAMPLE RESPONSE: "
                + "Adrianna Avenicci: Oh, a bosmer I see. What brings you to Riverwood? "
                + "Faendal: I'm looking for a good bow for hunting. I've travelled a long trip to get here. Do you happen to have anything that would suit me? "
                + "========== "
                + "Aela the Huntress: I see your bow is shiny. "
                + "Farkas: It means that I'm not doing anything. To be honest, it's lying unattended for months. Some would say that it's good for me. But as a fierce warrior, I feel the need to wield my weapon and shed blood. How about you? Do you use your bow? "
                + "... "
                + "This is " + c.name + "'s biography: " + characterPrompt
        
        let response = await GoogleGenAI.SendMessage({prompt: null, message: prompt})

        if(response.status == 2) {
            console.error("ERROR returned from API. Retrying.")
            waitSync(10)
            response = await this.Send(c)
        }

        return response
    }

    async PrepareDataset_v2() {
        let characters = this.characterManager.GetCharacterList()

        console.log("TOTAL " + characters.length + " characters")
        let responses = []
        for(let i in characters){
            console.log("Running for " + i + ". character.")

            let response = await this.Send(characters[i])
            if(response.status == 2) {
                console.error("Retries unsuccessful. Skipping.")
            }
            responses.push(response.text)
            waitSync(20)
        }

        let data = []
        for(let i in responses) { 
            try {
                let response = responses[i]
                let dialogues = response.replaceAll("\n\n", "\n").split("==========").map((d) => d.trim().split("\n"))

                for(let j in dialogues) {
                    try {
                        let d = dialogues[j]
                        if(d.length == 0) return

                        let character_1 = d[0].substring(0,d[0].indexOf(':')).trim()
                        let text_1 = d[0].substring(d[0].indexOf(':') + 1, d[0].length - 1).trim()
                        let character_2 = d[1].substring(0,d[1].indexOf(':')).trim()
                        let text_2 = d[1].substring(d[1].indexOf(':') + 1, d[0].length - 1).trim()

                        data.push([{'character': character_1, 'text': text_1}, {'character': character_2, 'text': text_2}])
                    } catch(e_2) {
                        console.error("ERROR during parsing response.")
                        continue
                    }
                }
            } catch(e) {
                console.error("ERROR during parsing response.")
                continue
            }
        }

        console.log("WRITING to file.")
        fs.writeFileSync('skyrim_dataset_v2.json', JSON.stringify(data), 'utf8')
        console.log(data.length + " rows written.")
        console.log("DONE")
    }
}
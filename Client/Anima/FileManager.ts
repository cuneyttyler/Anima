import fs from 'fs'

export default class FileManager {
    
    async GetEventFile(id, formId, profile) {
        try {
            id = id.toLowerCase();
            let profileFolder = './Profiles/' + profile;
            if(!await fs.existsSync(profileFolder)) {
                await fs.mkdirSync(profileFolder);
                await fs.writeFileSync(profileFolder + "/profile.txt", "", "utf8")
            }
            if(!await fs.existsSync(profileFolder + '/Events')) {
                await fs.mkdirSync(profileFolder + '/Events');
            }
            let fileName = profileFolder + '/Events/' + id + "_" + formId + '.txt'
            if(!await fs.existsSync(fileName)) {
                await fs.writeFileSync(fileName, "", "utf8");
            }
            return fileName;
        } catch (err) {
            console.error('Error reading or parsing the file:', err);
        }
    }

    async GetEvents(id, formId, profile) {
        let eventFile = await this.GetEventFile(id, formId, profile);
        return await fs.readFileSync(eventFile, 'utf8')
    }

    async SaveEventLog(id, formId, log, profile) {
        try {
            id = id.toLowerCase();
            let eventFile = await this.GetEventFile(id, formId, profile);

            if(!fs.existsSync(eventFile)) {
                console.error("Event file not exists: " + eventFile);
                return;
            }
            await fs.appendFileSync(eventFile, log, 'utf8')
        } catch (err) {
        console.error('Error writing the file:', err);
        return false;
        }
    }
}
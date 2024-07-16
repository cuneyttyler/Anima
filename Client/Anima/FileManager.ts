import fs from 'fs'

export default class FileManager {
    
    GetEventFile(id, formId, profile) {
        try {
            id = id.toLowerCase();
            let profileFolder = './Profiles/' + profile;
            if(!fs.existsSync(profileFolder)) {
                fs.mkdirSync(profileFolder);
                fs.writeFileSync(profileFolder + "/profile.txt", "", "utf8")
            }
            if(!fs.existsSync(profileFolder + '/Events')) {
                fs.mkdirSync(profileFolder + '/Events');
            }
            let fileName = profileFolder + '/Events/' + id + "_" + formId + '.txt'
            if(!fs.existsSync(fileName)) {
                fs.writeFileSync(fileName, "", "utf8");
            }
            return fileName;
        } catch (err) {
            console.error('Error reading or parsing the file:', err);
        }
    }

    GetEvents(id, formId, profile) {
        let eventFile = this.GetEventFile(id, formId, profile);
        return fs.readFileSync(eventFile, 'utf8')
    }

    SaveEventLog(id, formId, log, profile) {
        try {
            id = id.toLowerCase();
            let eventFile = this.GetEventFile(id, formId, profile);

            if(!fs.existsSync(eventFile)) {
                console.error("Event file not exists: " + eventFile);
                return;
            }
            fs.appendFileSync(eventFile, log, 'utf8')
        } catch (err) {
        console.error('Error writing the file:', err);
        return false;
        }
    }
}
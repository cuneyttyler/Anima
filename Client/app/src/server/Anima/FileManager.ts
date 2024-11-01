import fs from 'fs'

export default class FileManager {
    
    private GetFile(type, id, formId, profile) {
        try {
            id = id.toLowerCase().replaceAll(" ", "_");
            let profileFolder = './Profiles/' + profile;
            if(!fs.existsSync(profileFolder)) {
                fs.mkdirSync(profileFolder);
                fs.writeFileSync(profileFolder + "/profile.txt", "", "utf8")
            }
            if(!fs.existsSync(profileFolder + '/' + type)) {
                fs.mkdirSync(profileFolder + '/' + type);
            }
            let fileName = profileFolder + '/' + type + '/' + id + "_" + formId + '.txt'
            if(!fs.existsSync(fileName)) {
                fs.writeFileSync(fileName, "", "utf8");
            }
            return fileName;
        } catch (err) {
            console.error('Error reading or parsing the file:', err);
        }
    }

    private SaveFile(type, id, formId, log, profile, append) {
        try {
            id = id.toLowerCase().replaceAll(" ", "_");
            let file = this.GetFile(type, id, formId, profile);

            if(!fs.existsSync(file)) {
                console.error("File not exists(" + type + "): " + file);
                return;
            }
            if(append)
                fs.appendFileSync(file, log ? log : "", 'utf8')
            else
                fs.writeFileSync(file, log ? log : "", 'utf8')
            return true
        } catch (err) {
        console.error('Error writing the file:', err);
        return false;
        }
    }

    GetEvents(id, formId, profile) {
        if(!id) {
            console.error("ID is needed for GetEvents!")
            return
        }
        let eventFile = this.GetFile('Events', id, formId, profile)
        return fs.readFileSync(eventFile, 'utf8')
    }

    SaveEventLog(id, formId, log, profile, append=true) {
        this.SaveFile('Events', id, formId, log, profile, append)
    }

    SaveLectureLog(id, formId, log, profile, append=true) {
        this.SaveFile('Lectures', id, formId, log, profile, append)
    }

    GetThoughts(id, formId, profile) {
        if(!id) {
            console.error("ID is needed for GetThoughts!")
            return
        }
        let eventFile = this.GetFile('Thoughts', id, formId, profile);
        return fs.readFileSync(eventFile, 'utf8')
    }

    GetLecture(id, formId, profile) {
        if(!id) {
            console.error("ID is needed for GetLecture!")
            return
        }
        let eventFile = this.GetFile('Lectures', id, formId, profile);
        return fs.readFileSync(eventFile, 'utf8')
    }

    SaveThoughts(id, formId, log, profile, append=true) {
        this.SaveFile('Thoughts', id, formId, log, profile, append)
    }

    SaveThoughts_WholeMemory(id, formId, log, profile) {
        this.SaveFile('Thoughts_WholeMemory', id, formId, log, profile, true)
    }
}
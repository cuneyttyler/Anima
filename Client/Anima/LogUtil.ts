import fs from 'fs'

process.on('uncaughtException', function  (err, origin) {
    console.error('Caught exception: ', err, origin);
    logToErrorLog(JSON.stringify({err, origin}));
});

process.on('unhandledRejection', function (err, origin) {
    console.error('Caught rejection: ', err, origin);
    logToErrorLog(JSON.stringify({err, origin}));
});

function OverrideConsole() {
    const originalLog = console.log;
    console.log = function () {
        const timestamp: string = new Date().toISOString();
        const args = Array.prototype.slice.call(arguments);
        args.unshift(`[${timestamp}]`);
        originalLog.apply(console, args);
    };
    const originalError = console.error;
    console.error = function () {
        const timestamp: string = new Date().toISOString();
        const args = Array.prototype.slice.call(arguments);
        args.unshift(`[${timestamp}]`);
        originalError.apply(console, args);
        logToLog(JSON.stringify(args));
    };

    (console as any).logToLog =   function () {
        logToLog(JSON.stringify(Array.prototype.slice.call(arguments)));
    }
}

OverrideConsole();

export function logToLog(message: string): void {
    const timestamp: string = new Date().toISOString();
    const logMessage: string = `${timestamp} - ${message}`;
    const logFileName = "Anima.log"
    if (fs.existsSync(logFileName)) { // File exists, append to it
        fs.appendFileSync(logFileName, logMessage + '\n', 'utf8');
    } else { // File does not exist, create it and write the log message
        fs.writeFileSync(logFileName, logMessage + '\n', 'utf8');
    }
}

export function logToErrorLog(message: string): void {
    const timestamp: string = new Date().toISOString();
    const logMessage: string = `${timestamp} - ${message}`;
    const logFileName = "AnimaError.log"
    if (fs.existsSync(logFileName)) { // File exists, append to it
        fs.appendFileSync(logFileName, logMessage + '\n', 'utf8');
    } else { // File does not exist, create it and write the log message
        fs.writeFileSync(logFileName, logMessage + '\n', 'utf8');
    }
}

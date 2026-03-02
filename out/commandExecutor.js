"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandExecutor = void 0;
//import { LibrariesChangeDetector } from './librariesChangeDetector';
const utils_1 = require("./utils");
class CommandExecutor {
    //private librariesChangeDetector: LibrariesChangeDetector;
    constructor(pathToTest) {
        (0, utils_1.mylog)('Initializing CommandExecutor with test path:', pathToTest);
        this.isRunningFlag = false;
        //this.librariesChangeDetector = new LibrariesChangeDetector(pathToTest);
        //this.librariesChangeDetector.capture();
    }
    run() {
        (0, utils_1.mylog)('Command execution started');
        this.isRunningFlag = true;
    }
    getLibrariesToLoad() {
        // add backup libraries to load 
        //this.librariesChangeDetector.capture();
        //this.librariesChangeDetector.backupLibraries();
        //return this.librariesChangeDetector.getConvertedStatements();
        return '';
    }
    isRunning() {
        (0, utils_1.mylog)('Checking if command is running:', this.isRunningFlag);
        return this.isRunningFlag;
    }
    finish() {
        (0, utils_1.mylog)('Command execution finished');
        this.isRunningFlag = false;
        //this.librariesChangeDetector.removeBackups();
    }
}
exports.CommandExecutor = CommandExecutor;

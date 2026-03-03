"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandExecutor = void 0;
const utils_1 = require("./utils");
/**
 * CommandExecutor manages command execution state.
 * Tracks whether a command is currently running and coordinates with the IPC server.
 *
 * Note: Library change detection (backup/restore) is currently disabled.
 * The LibrariesChangeDetector was previously used to track library changes but is not in use.
 */
class CommandExecutor {
    /**
     * Creates an instance of CommandExecutor
     * @param pathToTest - The path to the test file being executed
     */
    constructor(pathToTest) {
        (0, utils_1.mylog)('Initializing CommandExecutor with test path:', pathToTest);
        this.isRunningFlag = false;
    }
    /**
     * Marks the command execution as started
     */
    run() {
        (0, utils_1.mylog)('Command execution started');
        this.isRunningFlag = true;
    }
    /**
     * Returns libraries to load for command execution.
     * Currently returns an empty string as library change detection is disabled.
     *
     * @returns Empty string (library reloading not currently implemented)
     */
    getLibrariesToLoad() {
        return '';
    }
    /**
     * Checks if a command is currently executing
     * @returns True if a command is running, false otherwise
     */
    isRunning() {
        (0, utils_1.mylog)('Checking if command is running:', this.isRunningFlag);
        return this.isRunningFlag;
    }
    /**
     * Marks the command execution as completed
     */
    finish() {
        (0, utils_1.mylog)('Command execution finished');
        this.isRunningFlag = false;
    }
}
exports.CommandExecutor = CommandExecutor;

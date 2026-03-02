"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeLogger = initializeLogger;
exports.mylog = mylog;
exports.myerror = myerror;
let outputChannel = null;
/**
 * Initialize the logging output channel
 */
function initializeLogger(channel) {
    outputChannel = channel;
}
/**
 * Custom logging function that writes to VS Code output channel
 */
function mylog(...args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    if (outputChannel) {
        outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ${message}`);
    }
}
/**
 * Custom error logging function that writes to VS Code output channel
 */
function myerror(...args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    if (outputChannel) {
        outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ERROR: ${message}`);
    }
}

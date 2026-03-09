"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPCServer = void 0;
const node_ipc_1 = __importDefault(require("node-ipc"));
const commandExecutor_1 = require("./commandExecutor");
const librariesChangeDetector_1 = require("./librariesChangeDetector");
const utils_1 = require("./utils");
const commandBuilder_1 = require("./commandBuilder");
class IPCServer {
    /**
     * Creates an instance of IPCServer
     * @param logPanel - The log panel provider for displaying server messages and responses
     */
    constructor(logPanel) {
        this.clientSocket = null;
        this.pendingCommandResolver = null;
        this.isConnected = false;
        this.responsePanel = null;
        this.commandExecutor = null;
        this.logPanel = logPanel;
        // Store IPC instance
        this.ipc = node_ipc_1.default;
        // Configure IPC
        this.ipc.config.id = 'PWConsole';
        this.ipc.config.retry = 1500;
        this.ipc.config.maxConnections = 100;
        this.ipc.config.appspace = 'PW'; // No prefix
        this.ipc.config.socketRoot = 'PW';
        //this.ipc.config.silent = true; // Reduce console noise
    }
    /**
     * Set the response panel provider for status updates
     */
    setResponsePanel(responsePanel) {
        this.responsePanel = responsePanel;
    }
    /**
     * Start the IPC server
     */
    start() {
        this.ipc.serve(() => {
            this.initEvents();
        });
        this.ipc.server.start();
        (0, utils_1.mylog)('IPC Server started');
    }
    /**
     * Stop the IPC server
     */
    stop() {
        if (this.ipc && this.ipc.server) {
            this.ipc.server.stop();
            (0, utils_1.mylog)('IPC Server stopped');
        }
        this.cleanup();
    }
    /**
     * Initialize IPC events and set up message handling
     */
    initEvents() {
        this.ipc.server.on('message', (data, socket) => {
            // Handle different message types from the client
            (0, utils_1.mylog)('IPC Server received message:', data);
            this.commandExecutor?.finish();
            if (data.type === 'init') {
                (0, utils_1.mylog)('Before command executor');
                this.commandExecutor = new commandExecutor_1.CommandExecutor(data.pathToTest || '');
                (0, utils_1.mylog)('After command executor');
                (0, utils_1.mylog)('Client initialized with test path:', data.pathToTest);
                this.logPanel.addLog(`Playwright initialized with test: ${data.pathToTest}`, 'success', false);
                // Immediately set a very long test timeout so the browser stays open
                (async () => {
                    const setTimeoutCmd = commandBuilder_1.CommandBuilder.buildAsStatement(`const { test } = await import('@playwright/test'); test.setTimeout(30_000_000);`, 5000);
                    const result = await this.sendSingleCommand(setTimeoutCmd, 5000);
                    (0, utils_1.mylog)('test.setTimeout result:', result.success ? 'ok' : result.message);
                })();
                return;
            }
            this.resolveCommand(data);
        });
        this.ipc.server.on('socket.disconnected', () => {
            // Log to both output channel and panel
            this.logPanel.addLog('Playwright disconnected', 'warning', false);
            (0, utils_1.mylog)('Client disconnected from IPC server');
            this.cleanup();
            // Update response panel to show default message
            if (this.responsePanel) {
                this.responsePanel.setDefaultMessage('Set Run Point and run the test');
            }
            this.resolveCommand({
                message: 'IPC client disconnected',
                success: false,
            });
        });
        this.ipc.server.on('connect', (socket) => {
            // Log to both output channel and panel
            this.logPanel.addLog('Playwright connected', 'success', false);
            (0, utils_1.mylog)('Client connected to IPC server');
            this.clientSocket = socket;
            this.isConnected = true;
            // Update response panel to show connected message
            if (this.responsePanel) {
                this.responsePanel.setDefaultMessage('Select the playwright command(s) in the editor → Right Mouse Click → "Run in Browser"');
            }
        });
        this.ipc.server.on('error', (err) => {
            this.logPanel.addLog(`IPC server error: ${err.message}`, 'error', false);
            (0, utils_1.myerror)('IPC server error:', err);
            this.cleanup();
            this.resolveCommand({
                message: `IPC server error: ${err.message}`,
                success: false,
            });
        });
    }
    /**
     * Clean up client connection and resources
     */
    cleanup() {
        this.clientSocket = null;
        this.isConnected = false;
        this.commandExecutor?.finish();
        this.commandExecutor = null;
        // Update response panel to show disconnected message
        if (this.responsePanel) {
            this.responsePanel.setDefaultMessage('Set Run Point and run the test');
        }
    }
    /**
     * Check if a client is connected and initialized
     */
    isClientConnected() {
        return this.isConnected && this.clientSocket !== null && this.commandExecutor !== null;
    }
    /**
     * Resolve pending command with result
     */
    resolveCommand(result) {
        this.commandExecutor?.finish();
        if (this.pendingCommandResolver) {
            this.pendingCommandResolver(result);
            this.pendingCommandResolver = null;
        }
    }
    /**
     * Send a command to the connected client for execution.
     *
     * Attempts to execute the command first as an expression (to capture return values).
     * If the expression fails with a SyntaxError, automatically retries as a statement
     * (for variable declarations, assignments, etc. that don't return values).
     *
     * @param command - The code command to execute in the Playwright context
     * @param timeout - The timeout in milliseconds for the command execution
     * @returns An ActionResponse with the execution result or error message
     *
     * @remarks
     * The command will be wrapped with timeout settings by CommandBuilder.
     * Returns immediately if no client is connected.
     */
    async sendCommand(command, timeout) {
        // On first command after client init, reload all imports from the test file
        if (this.commandExecutor?.isFirstRun()) {
            const pathToTest = this.commandExecutor.getPathToTest();
            if (pathToTest) {
                const detector = new librariesChangeDetector_1.LibrariesChangeDetector(pathToTest);
                const initialImports = detector.getInitialImports();
                (0, utils_1.mylog)(`First run: reloading ${initialImports.length} libraries from test file`);
                const libraryReloadTimeout = 5000;
                for (const importStatement of initialImports) {
                    const libCmd = commandBuilder_1.CommandBuilder.buildAsStatement(importStatement, libraryReloadTimeout);
                    const libResult = await this.sendSingleCommand(libCmd, libraryReloadTimeout);
                    if (libResult.success) {
                        (0, utils_1.mylog)('Library reloaded successfully:', importStatement);
                    }
                    else {
                        (0, utils_1.mylog)('Library reload failed:', importStatement, libResult.message);
                        this.logPanel.addLog(`Library reload failed: ${libResult.message}`, 'warning', false);
                    }
                }
            }
        }
        // First try to execute as expression (to capture return value)
        const expressionCommand = commandBuilder_1.CommandBuilder.buildAsExpression(command, timeout);
        const result = await this.sendSingleCommand(expressionCommand, timeout);
        // If it failed with a SyntaxError, try as statement (for variable declarations, etc.)
        // SyntaxError is prefixed in executionContext.ts when error instanceof SyntaxError
        if (!result.success && result.message.includes('SyntaxError')) {
            (0, utils_1.mylog)('Expression command failed with SyntaxError, retrying as statement');
            const statementCommand = commandBuilder_1.CommandBuilder.buildAsStatement(command, timeout);
            return await this.sendSingleCommand(statementCommand, timeout);
        }
        return result;
    }
    /**
     * Send command to connected client and wait for response
     */
    async sendSingleCommand(command, timeout) {
        if (!this.clientSocket) {
            return Promise.resolve({
                message: 'No client socket available. The client may have disconnected.',
                success: false,
            });
        }
        if (!this.isConnected || !this.commandExecutor) {
            return Promise.resolve({
                message: 'Client is not connected.',
                success: false,
            });
        }
        if (this.commandExecutor.isRunning()) {
            return Promise.resolve({
                message: 'A command is already running.',
                success: false,
            });
        }
        // Create a promise that will be resolved when the result arrives
        const resultPromise = new Promise((resolve) => {
            this.pendingCommandResolver = resolve;
            // Set timeout to reject if no response within specified time
            const additionalTimeout = 15000; // Add extra time to account for command execution
            const sendingTimeout = timeout + additionalTimeout; // Add extra time to account for command execution
            setTimeout(() => {
                if (this.pendingCommandResolver) {
                    this.resolveCommand({
                        success: false,
                        message: `Timeout (${timeout} + ${additionalTimeout}) ms reached, command not finished.`,
                    });
                }
            }, sendingTimeout);
        });
        // Send command to the client via IPC using the stored socket
        (0, utils_1.mylog)('Sending command to client via IPC:', command);
        this.commandExecutor.run();
        this.ipc.server.emit(this.clientSocket, 'message', {
            type: 'command',
            command: command,
            timeout: timeout,
        });
        return await resultPromise;
    }
}
exports.IPCServer = IPCServer;

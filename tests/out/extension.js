"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const ipcServer_1 = require("./ipcServer");
const logPanel_1 = require("./logPanel");
const responsePanel_1 = require("./responsePanel");
const runPoint_1 = require("./runPoint");
const libraries_1 = require("./libraries");
const utils_1 = require("./utils");
const timeoutWebview_1 = require("./timeoutWebview");
let ipcServer = null;
let logPanelProvider;
let responsePanelProvider;
let outputChannel;
let runPointDecorationManager;
function activate(context) {
    (0, utils_1.mylog)('"PW Write-And-Run" extension is now active');
    // Create output channel for system logs
    outputChannel = vscode.window.createOutputChannel('"PW Write-And-Run"');
    context.subscriptions.push(outputChannel);
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] "PW Write-And-Run" extension activated`);
    // Initialize the logger
    (0, utils_1.initializeLogger)(outputChannel);
    // Create response panel webview provider
    responsePanelProvider = new responsePanel_1.ResponsePanelProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(responsePanel_1.ResponsePanelProvider.viewType, responsePanelProvider, { webviewOptions: { retainContextWhenHidden: true } }));
    // Create log panel provider (without tree view first)
    logPanelProvider = new logPanel_1.LogPanelProvider();
    const logView = vscode.window.createTreeView('pwConsole.logView', {
        treeDataProvider: logPanelProvider,
        showCollapseAll: false
    });
    // Pass tree view reference to provider for auto-scroll
    logPanelProvider.setTreeView(logView);
    context.subscriptions.push(logView);
    // Register timeout webview provider
    const timeoutWebviewProvider = new timeoutWebview_1.TimeoutWebviewProvider(context.extensionUri, logPanelProvider);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(timeoutWebview_1.TimeoutWebviewProvider.viewType, timeoutWebviewProvider));
    // Initialize Run Point decoration manager to hide/show Run Point statements
    runPointDecorationManager = new runPoint_1.RunPointDecorationManager();
    context.subscriptions.push(runPointDecorationManager);
    // Add initial log to panel
    logPanelProvider.addLog('"PW Write-And-Run" extension initialized', 'info', false);
    // Register clear logs command
    const clearLogsCommand = vscode.commands.registerCommand('pwConsole.clearLogs', () => {
        logPanelProvider.clear();
    });
    context.subscriptions.push(clearLogsCommand);
    // Register copy log command
    const copyLogCommand = vscode.commands.registerCommand('pwConsole.copyLog', async (logItem) => {
        if (logItem && logItem.cleanedMessage) {
            try {
                await vscode.env.clipboard.writeText(logItem.cleanedMessage);
                vscode.window.showInformationMessage('Log message copied to clipboard');
            }
            catch (error) {
                vscode.window.showErrorMessage('Failed to copy log message to clipboard');
            }
        }
    });
    context.subscriptions.push(copyLogCommand);
    // Register set timeout command
    const setTimeoutCommand = vscode.commands.registerCommand('pwConsole.setTimeout', async () => {
        const currentTimeout = logPanelProvider.getTimeout();
        const input = await vscode.window.showInputBox({
            prompt: 'Enter timeout in milliseconds',
            value: currentTimeout.toString(),
            placeHolder: '60000',
            validateInput: (value) => {
                const num = parseInt(value, 10);
                if (isNaN(num)) {
                    return 'Please enter a valid number';
                }
                if (num <= 0) {
                    return 'Timeout must be a positive number';
                }
                return null;
            }
        });
        if (input !== undefined) {
            const timeout = parseInt(input, 10);
            if (logPanelProvider.setTimeout(timeout)) {
                vscode.window.showInformationMessage(`Timeout set to ${timeout}ms`);
                logPanelProvider.addLog(`Timeout updated to ${timeout}ms`, 'info', false);
            }
            else {
                vscode.window.showErrorMessage('Invalid timeout value');
            }
        }
    });
    context.subscriptions.push(setTimeoutCommand);
    // Initialize IPC server
    ipcServer = new ipcServer_1.IPCServer(logPanelProvider);
    ipcServer.setResponsePanel(responsePanelProvider);
    ipcServer.start();
    // Set initial message in response panel
    responsePanelProvider.setDefaultMessage('Set Run Point and run the test');
    // Register the command
    const disposable = vscode.commands.registerCommand('pwConsole.executeInBrowser', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        const selection = editor.selection;
        let selectedText = editor.document.getText(selection);
        // If no selection, get the whole line where cursor is placed
        if (!selectedText || selectedText.trim() === '') {
            const cursorLine = editor.selection.active.line;
            const line = editor.document.lineAt(cursorLine);
            selectedText = line.text;
        }
        // Strip Run Point calls from the text before execution
        selectedText = selectedText.split(runPoint_1.RUNPOINT_CALL).join('').trim();
        if (!selectedText || selectedText.trim() === '') {
            vscode.window.showWarningMessage('No text selected and current line is empty');
            return;
        }
        if (!ipcServer) {
            vscode.window.showErrorMessage('IPC Server not initialized');
            return;
        }
        // Check if client is connected
        if (!ipcServer.isClientConnected()) {
            vscode.window.showWarningMessage('"PW Write-And-Run" not connected. Execute the test to the desired Run Point.');
            return;
        }
        // Clear response panel and show waiting message
        responsePanelProvider.setWaitingMessage();
        // Check if selected text is an import statement
        let commandToExecute = selectedText;
        const fileDir = path.dirname(editor.document.uri.fsPath);
        const importLib = new libraries_1.ImportLibrary(selectedText, fileDir);
        const importErrorMessage = importLib.getErrorMessage();
        if (!importLib.importSucessfull() && importErrorMessage.length > 0) {
            logPanelProvider.addLog(`Failed to load library: ${importErrorMessage}`, 'error', false);
            vscode.window.showErrorMessage(`Failed to load library: ${importErrorMessage}`);
            return;
        }
        if (importLib.importSucessfull()) {
            // an import statement
            importLib.createBackup();
            commandToExecute = importLib.getConvertedImport();
            // After execution, we'll clean up
            const executeResult = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Loading library in browser...',
            }, async (progress) => {
                try {
                    const result = await ipcServer.sendCommand(commandToExecute, logPanelProvider.getTimeout());
                    if (result.success) {
                        logPanelProvider.addLog(`Library executed successfully.`, 'success', false);
                        responsePanelProvider.setMessage(`Library loaded successfully.`, 'success');
                        vscode.window.showInformationMessage(
                        //`Library loaded successfully: ${importLib.getLibraryName()}`
                        `Library loaded successfully.`);
                    }
                    else {
                        const cleanedMsg = (0, logPanel_1.escapeSpecialCharacters)(result.message);
                        logPanelProvider.addLog(`Failed to execute library: ${result.message}`, 'error', false);
                        responsePanelProvider.setMessage(`Failed to execute library: ${cleanedMsg}`, 'error');
                        vscode.window.showErrorMessage(`Failed to execute library: ${cleanedMsg}`);
                    }
                    return result;
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const cleanedErrorMsg = (0, logPanel_1.escapeSpecialCharacters)(errorMessage);
                    logPanelProvider.addLog(`Error: ${errorMessage}`, 'error', false);
                    responsePanelProvider.setMessage(`Error: ${cleanedErrorMsg}`, 'error');
                    vscode.window.showErrorMessage(`Error: ${cleanedErrorMsg}`);
                    throw error;
                }
                finally {
                    // Clean up
                    const clearResult = importLib.clear();
                }
            });
            return executeResult;
        }
        // Normal execution (not an import statement)
        const cmdPreview = selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : '');
        (0, utils_1.mylog)('Sending command:', cmdPreview);
        // Show waiting message
        responsePanelProvider.setWaitingMessage();
        // Show progress notification
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Executing in browser...',
        }, async (progress) => {
            try {
                const result = await ipcServer.sendCommand(selectedText, logPanelProvider.getTimeout());
                if (result.success) {
                    const cleanedMsg = (0, logPanel_1.escapeSpecialCharacters)(result.message);
                    logPanelProvider.addLog(`Execution successful: ${result.message}`, 'success', false);
                    responsePanelProvider.setMessage(`Execution successful: ${cleanedMsg}`, 'success');
                    vscode.window.showInformationMessage(`Execution successful: ${cleanedMsg}`);
                }
                else {
                    const cleanedMsg = (0, logPanel_1.escapeSpecialCharacters)(result.message);
                    logPanelProvider.addLog(`Execution failed: ${result.message}`, 'error', false);
                    responsePanelProvider.setMessage(`Execution failed: ${cleanedMsg}`, 'error');
                    vscode.window.showErrorMessage(`Execution failed: ${cleanedMsg}`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const cleanedErrorMsg = (0, logPanel_1.escapeSpecialCharacters)(errorMessage);
                logPanelProvider.addLog(`Error: ${errorMessage}`, 'error', false);
                responsePanelProvider.setMessage(`Error: ${cleanedErrorMsg}`, 'error');
                vscode.window.showErrorMessage(`Error: ${cleanedErrorMsg}`);
            }
        });
    });
    context.subscriptions.push(disposable);
    // Register addRunPoint command
    const addRunPointCommand = vscode.commands.registerCommand('pwConsole.addRunPoint', () => {
        (0, runPoint_1.addRunPointToFile)(logPanelProvider);
    });
    context.subscriptions.push(addRunPointCommand);
    // Register clearRunPoints command
    const clearRunPointsCommand = vscode.commands.registerCommand('pwConsole.clearRunPoints', () => {
        (0, runPoint_1.clearRunPointsFromFile)(logPanelProvider);
    });
    context.subscriptions.push(clearRunPointsCommand);
    // Show status bar item with PWC indicator
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = 'W&R';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Update status bar periodically
    const statusInterval = setInterval(() => {
        if (ipcServer) {
            const connected = ipcServer.isClientConnected();
            if (connected) {
                statusBarItem.text = 'W&R✓';
                statusBarItem.backgroundColor = new vscode.ThemeColor('testing.iconPassed');
                statusBarItem.tooltip = '"PW Write-And-Run": connected';
            }
            else {
                statusBarItem.text = 'W&R⊘';
                statusBarItem.backgroundColor = undefined;
                statusBarItem.tooltip = '"PW Write-And-Run": not connected';
            }
            // Update context key for menu visibility
            vscode.commands.executeCommand('setContext', 'pwConsole.clientConnected', connected);
        }
    }, 1000);
    context.subscriptions.push(new vscode.Disposable(() => clearInterval(statusInterval)));
}
function deactivate() {
    if (ipcServer) {
        ipcServer.stop();
        ipcServer = null;
    }
}

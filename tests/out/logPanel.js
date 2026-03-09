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
exports.LogPanelProvider = exports.LogItem = void 0;
exports.escapeSpecialCharacters = escapeSpecialCharacters;
const vscode = __importStar(require("vscode"));
class LogItem extends vscode.TreeItem {
    constructor(label, timestamp, message, // Store the full original message for copying
    cleanedMessage, // Cleaned message for tooltip display
    iconPath, showTimestamp = true, children // Support for multi-line messages
    ) {
        super(label, children && children.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.timestamp = timestamp;
        this.message = message;
        this.cleanedMessage = cleanedMessage;
        this.iconPath = iconPath;
        this.showTimestamp = showTimestamp;
        this.children = children;
        this.description = showTimestamp ? timestamp : undefined;
        this.tooltip = `${timestamp} - ${cleanedMessage}`;
        this.contextValue = 'logItem'; // Allow context menu for copy
    }
}
exports.LogItem = LogItem;
class LogPanelProvider {
    constructor(treeView) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.logs = [];
        this.maxLogs = 1000; // Limit number of logs to prevent memory issues
        this.timeout = 60000; // Default timeout in milliseconds
        this.treeView = treeView;
    }
    setTreeView(treeView) {
        this.treeView = treeView;
    }
    refresh(autoScroll = true) {
        this._onDidChangeTreeData.fire();
        // Auto-scroll to the latest message after tree view updates
        if (autoScroll && this.treeView && this.logs.length > 0) {
            const lastItem = this.logs[this.logs.length - 1];
            // Use both setImmediate and setTimeout to ensure tree view is ready
            setImmediate(() => {
                setTimeout(() => {
                    if (this.treeView && this.logs.length > 0) {
                        this.treeView.reveal(lastItem, {
                            select: false,
                            focus: true,
                            expand: true
                        }).then(undefined, () => {
                            // Silently ignore reveal errors
                        });
                    }
                }, 100);
            });
        }
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            // Return children of the element if it has any
            return Promise.resolve(element.children || []);
        }
        return Promise.resolve(this.logs);
    }
    addLog(message, type = 'info', showTimestamp = true) {
        const timestamp = new Date().toLocaleTimeString();
        let icon;
        switch (type) {
            case 'success':
                icon = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
                break;
            case 'error':
                icon = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
                break;
            case 'warning':
                icon = new vscode.ThemeIcon('warning', new vscode.ThemeColor('testing.iconQueued'));
                break;
            default:
                icon = new vscode.ThemeIcon('info');
        }
        // Escape special characters for proper display
        const escapedMessage = this.escapeSpecialCharacters(message);
        // Split by newlines to create multi-line display
        const lines = escapedMessage.split('\n');
        let logItem;
        if (lines.length > 1) {
            // Multi-line message: create parent with children
            const firstLine = lines[0];
            const childItems = lines.slice(1).map(line => new LogItem(line, timestamp, message, escapedMessage, undefined, false));
            logItem = new LogItem(firstLine, timestamp, message, escapedMessage, icon, showTimestamp, childItems);
        }
        else {
            // Single line message
            logItem = new LogItem(escapedMessage, timestamp, message, escapedMessage, icon, showTimestamp);
        }
        this.logs.push(logItem);
        // Keep only the last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        this.refresh(true);
    }
    clear() {
        this.logs = [];
        this.refresh(false);
    }
    /**
     * Get the last log item for copying
     */
    getLastLog() {
        return this.logs.length > 0 ? this.logs[this.logs.length - 1] : undefined;
    }
    /**
     * Get a specific log item by index for copying
     */
    getLogByIndex(index) {
        return this.logs[index];
    }
    /**
     * Get all logs as a formatted string for bulk copying
     */
    getAllLogsAsText() {
        return this.logs
            .map(log => `[${log.timestamp}] ${log.cleanedMessage}`)
            .join('\n');
    }
    /**
     * Escape special characters for proper display in the tree view
     */
    escapeSpecialCharacters(text) {
        return escapeSpecialCharacters(text);
    }
    /**
     * Get the current timeout value in milliseconds
     */
    getTimeout() {
        return this.timeout;
    }
    /**
     * Set the timeout value in milliseconds (must be positive)
     */
    setTimeout(timeout) {
        if (timeout > 0) {
            this.timeout = timeout;
            return true;
        }
        return false;
    }
}
exports.LogPanelProvider = LogPanelProvider;
/**
 * Escape special characters for proper display
 * Exported for use in other modules
 */
function escapeSpecialCharacters(text) {
    return text
        .replace(/\\u001b\[[0-9;]*m/g, '') // Remove Unicode escape sequences for ANSI codes (e.g., \u001b[31m)
        .replace(/\x1b\[[0-9;]*m/g, '') // Remove actual ANSI color codes (ESC[...m)
        .replace(/\x00/g, '\\0') // Null character
        .replace(/\x08/g, '\\b') // Backspace
        .replace(/\x0c/g, '\\f'); // Form feed
}

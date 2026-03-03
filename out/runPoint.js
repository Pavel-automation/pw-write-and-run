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
exports.RunPointDecorationManager = void 0;
exports.addRunPointToFile = addRunPointToFile;
exports.clearRunPointsFromFile = clearRunPointsFromFile;
const vscode = __importStar(require("vscode"));
const utils_1 = require("./utils");
const RUNPOINT_CALL = "(await (await import('pw-execution-context')).runPoint(async s => (await eval(s))));";
/**
 * Manages hiding/showing Run Point statements with decorations
 */
class RunPointDecorationManager {
    constructor() {
        this.hiddenRanges = new Map(); // uri -> ranges
        this.disposables = [];
        // Decoration to make the text very small and transparent
        this.hideDecorationType = vscode.window.createTextEditorDecorationType({
            opacity: '0.00', // Nearly invisible
            letterSpacing: '-0.9em', // Collapse heavily
        });
        // Decoration to show the collapsed indicator - this replaces the visual appearance
        this.showDecorationType = vscode.window.createTextEditorDecorationType({
            before: {
                contentText: '▶', // Indicator text
                color: '#4fc3f7',
                //backgroundColor: 'rgba(79, 195, 247, 0.25)',
                //border: '1px solid #4fc3f7',
                margin: '0 6px 0 0',
                fontWeight: 'bold',
                textDecoration: 'none',
            },
            after: {
                contentText: ' ', // Add space to push content
                margin: '0 0 0 2px',
            },
            cursor: 'pointer',
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        });
        // Update decorations when active editor changes
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                this.applyDecorations(editor);
            }
        }));
        // Update decorations when document changes
        this.disposables.push(vscode.workspace.onDidChangeTextDocument(event => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document) {
                this.updateRangesForDocument(editor.document);
                this.applyDecorations(editor);
            }
        }));
        // Handle clicks on Run Point decorations
        this.disposables.push(vscode.window.onDidChangeTextEditorSelection(event => {
            const editor = event.textEditor;
            const selection = event.selections[0];
            // Check if cursor is in a Run Point range
            if (selection.isEmpty) { // Just a cursor, not a selection
                const position = selection.active;
                const ranges = this.hiddenRanges.get(editor.document.uri.toString()) || [];
                for (const range of ranges) {
                    if (range.contains(position)) {
                        // Cursor is in a collapsed Run Point - reveal it
                        this.revealRunPoint(editor, range);
                        break;
                    }
                }
            }
        }));
        // Apply decorations to current editor
        if (vscode.window.activeTextEditor) {
            this.updateRangesForDocument(vscode.window.activeTextEditor.document);
            this.applyDecorations(vscode.window.activeTextEditor);
            (0, utils_1.mylog)(`RunPointDecorationManager initialized with ${this.hiddenRanges.get(vscode.window.activeTextEditor.document.uri.toString())?.length || 0} Run Points`);
        }
    }
    updateRangesForDocument(document) {
        const text = document.getText();
        const ranges = [];
        // Match dynamic import Run Point pattern
        const runPointRegex = /\(await \(await import\([^)]+\)\)\.runPoint\([\s\S]*?\)\);/g;
        let match;
        while ((match = runPointRegex.exec(text)) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            ranges.push(new vscode.Range(startPos, endPos));
        }
        this.hiddenRanges.set(document.uri.toString(), ranges);
    }
    applyDecorations(editor) {
        const ranges = this.hiddenRanges.get(editor.document.uri.toString()) || [];
        // Apply both decorations to the same ranges
        editor.setDecorations(this.hideDecorationType, ranges);
        editor.setDecorations(this.showDecorationType, ranges);
    }
    toggleRunPointAtPosition(editor, position) {
        const ranges = this.hiddenRanges.get(editor.document.uri.toString()) || [];
        // Check if clicked position is in a collapsed range
        for (const range of ranges) {
            if (range.contains(position)) {
                // Found it - temporarily reveal by removing decorations
                this.revealRunPoint(editor, range);
                return;
            }
        }
    }
    revealRunPoint(editor, range) {
        // Temporarily clear decorations for this specific range
        const allRanges = this.hiddenRanges.get(editor.document.uri.toString()) || [];
        const otherRanges = allRanges.filter(r => !r.isEqual(range));
        editor.setDecorations(this.hideDecorationType, otherRanges);
        editor.setDecorations(this.showDecorationType, otherRanges);
        // Re-apply decorations after 1 second if cursor moved out of the Run Point
        setTimeout(() => {
            const currentEditor = vscode.window.activeTextEditor;
            if (currentEditor && currentEditor === editor) {
                const cursorPosition = currentEditor.selection.active;
                // Only re-hide if cursor is no longer in this Run Point range
                if (!range.contains(cursorPosition)) {
                    this.applyDecorations(editor);
                }
            }
        }, 1000);
    }
    dispose() {
        this.hideDecorationType.dispose();
        this.showDecorationType.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.RunPointDecorationManager = RunPointDecorationManager;
/**
 * Add Run Point using dynamic import to the current active editor
 * - Adds Run Point call at current cursor position (no import needed)
 */
async function addRunPointToFile(logPanelProvider) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }
    const cursorPosition = editor.selection.active;
    // Get the position at the beginning of the line where cursor is
    const lineStartPosition = new vscode.Position(cursorPosition.line, 0);
    await editor.edit(editBuilder => {
        // Add Run Point call at the beginning of the line where cursor is
        editBuilder.insert(lineStartPosition, RUNPOINT_CALL);
    });
    (0, utils_1.mylog)('Run Point added (local)');
    logPanelProvider.addLog('Run Point added to file', 'success', false);
    vscode.window.showInformationMessage('Run Point added to file');
}
/**
 * Clear all Run Points from the current active editor
 * Removes dynamic import Run Point statements
 */
async function clearRunPointsFromFile(logPanelProvider) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }
    const document = editor.document;
    const text = document.getText();
    // Remove dynamic import Run Point statements
    // Matches: (await (await import('...')).runPoint(...));
    const runPointRegex = /\(await\s+\(await\s+import\([^)]+\)\)\.runPoint\([\s\S]*?\)\);/g;
    const modifiedText = text.replace(runPointRegex, '');
    // Apply changes to the document
    if (modifiedText !== text) {
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        await editor.edit(editBuilder => {
            editBuilder.replace(fullRange, modifiedText);
        });
        (0, utils_1.mylog)('Run Points cleared (local)');
        logPanelProvider.addLog('Run Points cleared from file', 'success', false);
        vscode.window.showInformationMessage('Run Points cleared from file');
    }
    else {
        vscode.window.showInformationMessage('No Run Points found to clear');
    }
}

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
exports.LibrariesChangeDetector = void 0;
const libraries_1 = require("./libraries");
const utils_1 = require("./utils");
const path = __importStar(require("path"));
/**
 * LibrariesChangeDetector class monitors changes in local library files
 * used in import statements and provides methods to detect and handle changes.
 */
class LibrariesChangeDetector {
    /**
     * Creates a new LibrariesChangeDetector instance
     * @param pathToFile - Path to the file to analyze
     */
    constructor(pathToFile) {
        this.capturedLibraries = new Map();
        this.librariesToRefresh = new Map();
        this.pathToFile = null;
        (0, utils_1.mylog)('Initializing LibrariesChangeDetector for file:', pathToFile);
        this.pathToFile = pathToFile;
        // Extract the directory from the file path to use as baseDir for resolving relative imports
        this.testFileDir = path.dirname(this.pathToFile);
        (0, utils_1.mylog)('Using base directory for import resolution:', this.testFileDir);
    }
    /**
     * Captures libraries from the file by extracting import statements from the first 30 lines
     */
    capture() {
        try {
            if (this.pathToFile === null || this.testFileDir === null) {
                (0, utils_1.mylog)('Error: Path to file or directory not initialized');
                return;
            }
            // Get file content
            const testFileContent = (0, libraries_1.getFileContent)(this.pathToFile);
            if (testFileContent === null) {
                (0, utils_1.mylog)('Error: Could not read file:', this.pathToFile);
                return;
            }
            // Split into lines and take first 5
            const lines = testFileContent.split('\n').slice(0, 5);
            this.captureLibraries(lines);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            (0, utils_1.mylog)('Error capturing libraries:', errorMessage);
            return;
        }
    }
    /**
     * Captures the current state of libraries from the provided import statements
     * @param importStatements - Array of import statement strings to track
     
     */
    captureLibraries(importStatements) {
        this.librariesToRefresh.clear();
        for (const importStatement of importStatements) {
            if (this.capturedLibraries.has(importStatement)) {
                // check the content of the file for changes 
                const existingLibrary = this.capturedLibraries.get(importStatement);
                if (existingLibrary?.getIsLibraryLocalFlag() === false) {
                    (0, utils_1.mylog)('Library is not local, skipping change detection:', importStatement);
                    continue;
                }
                else {
                    (0, utils_1.mylog)('Import statement already captured, checking for changes:', importStatement);
                }
                const currentLibrary = new libraries_1.ImportLibrary(importStatement, this.testFileDir);
                if (existingLibrary && currentLibrary.importSucessfull() && existingLibrary.getFileContent() !== currentLibrary.getFileContent()) {
                    (0, utils_1.mylog)('Captured library has changed, updating content:', importStatement);
                    // replace library in capturedLibraries with new content
                    this.capturedLibraries.set(importStatement, currentLibrary);
                    this.librariesToRefresh.set(importStatement, currentLibrary);
                }
                else {
                    // No change in library content, skipping
                    (0, utils_1.mylog)('No change detected in library content, skipping:', importStatement);
                }
            }
            else {
                (0, utils_1.mylog)('New import statement found, capturing:', importStatement);
                const currentLibrary = new libraries_1.ImportLibrary(importStatement, this.testFileDir);
                this.capturedLibraries.set(importStatement, currentLibrary);
                this.librariesToRefresh.set(importStatement, currentLibrary);
            }
        }
    }
    backupLibraries() {
        for (const [importStatement, library] of this.librariesToRefresh.entries()) {
            (0, utils_1.mylog)('Refreshing library for import statement:', importStatement);
            library.createBackup();
        }
    }
    removeBackups() {
        for (const [importStatement, library] of this.librariesToRefresh.entries()) {
            (0, utils_1.mylog)('Removing backup for import statement:', importStatement);
            library.removeBackup();
        }
        this.librariesToRefresh.clear();
    }
    getConvertedStatements() {
        const convertedStatements = [];
        for (const [importStatement, library] of this.librariesToRefresh.entries()) {
            (0, utils_1.mylog)('Getting converted import statement for:', importStatement);
            convertedStatements.push(library.getConvertedImport());
        }
        return convertedStatements.join(',\n');
    }
}
exports.LibrariesChangeDetector = LibrariesChangeDetector;

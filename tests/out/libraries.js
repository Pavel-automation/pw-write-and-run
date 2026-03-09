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
exports.ImportLibrary = void 0;
exports.getFileContent = getFileContent;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const utils_1 = require("./utils");
/**
 * Gets file content, preferring the VSCode editor version (includes unsaved changes)
 * @param filePath - The absolute file path
 * @returns The file content or null if unable to read
 */
function getFileContent(filePath) {
    try {
        // Check if the library file is open in VSCode
        const resolvedUri = vscode.Uri.file(filePath);
        const openEditor = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath.toLowerCase() === resolvedUri.fsPath.toLowerCase());
        if (openEditor) {
            (0, utils_1.mylog)(`Reading content from open editor for file: ${filePath}`);
            // Get content from the open editor (includes unsaved changes)
            return openEditor.getText();
        }
        else {
            // Read content from disk
            (0, utils_1.mylog)(`Reading content from disk for file: ${filePath}`);
            return fs.readFileSync(filePath, 'utf-8');
        }
    }
    catch (error) {
        (0, utils_1.mylog)(`Error reading file content for file: ${filePath} - ${error}`);
        return null;
    }
}
/**
 * ImportLibrary class handles copying and managing local library files
 * It parses import statements, validates that libraries are local (not npm packages),
 * and creates backup copies with a timestamp suffix before the file extension.
 */
class ImportLibrary {
    /**
     * Creates an instance of ImportLibrary by parsing the given import statement and validating that it refers to a local library.
     * If valid, it prepares the converted import statement and stores the library name.
     * If any validation fails, it clears the instance properties and sets an error message.
     * @param importStatement - The import statement to parse (e.g., "import { foo } from './module'")
     * @param baseDir - The base directory for resolving relative paths
     */
    constructor(importStatement, baseDir) {
        this.convertedImport = '';
        this.libraryName = '';
        this.actualFilePath = '';
        this.backupFilePath = '';
        this.backupLibraryName = '';
        this.errorMsg = '';
        this.success = false;
        this.fileContent = null;
        this.isLibraryLocalFlag = false;
        try {
            // Parse and validate import statement with extended checks
            // Parse import statement    
            if (!this.parseImportStatement(importStatement)) {
                this.clear();
                this.success = false;
                return;
            }
            this.isLibraryLocalFlag = this.getIsLibraryLocal();
            if (!this.isLibraryLocalFlag) {
                this.success = true;
                return;
            }
            if (!this.checkLibrary(importStatement, baseDir)) {
                this.clear();
                this.success = false;
                return;
            }
            this.fileContent = getFileContent(this.actualFilePath);
            if (this.fileContent === null) {
                this.errorMsg = `Could not read content from: ${this.actualFilePath}`;
                (0, utils_1.mylog)(this.errorMsg);
                this.clear();
                this.success = false;
                return;
            }
            this.success = true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            (0, utils_1.mylog)(`Error processing library: ${errorMessage}`);
            this.errorMsg = errorMessage;
            this.success = false;
            this.clear();
        }
    }
    /**
     * Creates a backup copy of the library file with a timestamp suffix.
     * Reads the actual file content (from VSCode editor or disk), generates backup file names with timestamp,
     * updates the converted import statement with the new backup library name, and writes the backup file.
     * @remarks Logs errors if file paths are unavailable, file content cannot be read, or backup file cannot be written
     */
    createBackup() {
        try {
            if (!this.actualFilePath) {
                (0, utils_1.mylog)('No file path available for backup');
                return;
            }
            // Get file content using shared utility function
            const fileContent = getFileContent(this.actualFilePath);
            if (fileContent === null) {
                this.errorMsg = `Could not read content from: ${this.actualFilePath}`;
                (0, utils_1.mylog)(this.errorMsg);
                return;
            }
            // Generate backup file names      
            const timestamp = this.getTimestamp();
            this.backupFilePath = this.addSuffixToFileName(this.actualFilePath, timestamp);
            this.backupLibraryName = this.addSuffixToPath(this.libraryName, timestamp);
            if (!this.backupFilePath || !this.backupLibraryName) {
                this.errorMsg = 'Could not generate backup file path or library name!';
                (0, utils_1.mylog)(this.errorMsg);
                return;
            }
            // Update instance properties with backup names
            this.convertedImport = this.convertedImport.replace(new RegExp(`'${this.libraryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'), `'${this.backupLibraryName}'`);
            // Write the file with the content (from editor or disk)
            fs.writeFileSync(this.backupFilePath, fileContent, 'utf-8');
            (0, utils_1.mylog)(`Library '${this.libraryName}' successfully copied to ${this.backupFilePath} with converted import: ${this.convertedImport}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            (0, utils_1.mylog)(`Error creating backup: ${errorMessage}`);
        }
    }
    /**
     * Removes the backup copy of the library file if it exists.
     */
    removeBackup() {
        try {
            if (this.backupFilePath && fs.existsSync(this.backupFilePath)) {
                fs.unlinkSync(this.backupFilePath);
                (0, utils_1.mylog)(`Backup file removed: ${this.backupFilePath}`);
            }
            else {
                (0, utils_1.mylog)('No backup file to remove or file does not exist:', this.backupFilePath);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            (0, utils_1.mylog)(`Error removing backup file: ${errorMessage}`);
        }
    }
    addSuffixToFileName(filePath, suffix) {
        const dir = path.dirname(filePath);
        const ext = path.extname(filePath);
        const baseName = path.basename(filePath, ext);
        return path.join(dir, `${baseName}_${suffix}${ext}`);
    }
    /**
     * Adds a suffix to a file name or path, inserting it before the file extension if present
     * @param libraryName - The file name or path to modify
     * @param suffix - The suffix to add
     * @returns The modified file name with suffix inserted before extension
     */
    addSuffixToPath(libraryName, suffix) {
        const lastSlashIndex = Math.max(libraryName.lastIndexOf('/'), libraryName.lastIndexOf('\\'));
        const lastDotIndex = libraryName.lastIndexOf('.');
        // Only treat as extension if the dot comes after any path separator
        if (lastDotIndex > lastSlashIndex && lastDotIndex > 0) {
            // Has an extension - insert suffix before it
            return `${libraryName.substring(0, lastDotIndex)}_${suffix}${libraryName.substring(lastDotIndex)}`;
        }
        else {
            // No extension - just append suffix
            return `${libraryName}_${suffix}`;
        }
    }
    /**
     * Generates a timestamp string in HHmmssMMM format (hours, minutes, seconds, milliseconds)
     * @returns A formatted timestamp string suitable for use in file names
     */
    getTimestamp() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
        return `${hours}${minutes}${seconds}${milliseconds}`;
    }
    /**
     * Clears the library - removes the backup copy if it exists and resets all instance properties
     */
    clear() {
        if (this.backupFilePath && fs.existsSync(this.backupFilePath)) {
            fs.unlinkSync(this.backupFilePath);
            (0, utils_1.mylog)(`Library cleared${this.backupFilePath ? ` and backup file removed: ${this.backupFilePath}` : ''}`);
        }
        this.convertedImport = '';
        this.libraryName = '';
        this.backupFilePath = '';
        this.actualFilePath = '';
        this.backupLibraryName = '';
        this.success = false;
    }
    /**
     * Parses a TypeScript/JavaScript import statement and converts it to dynamic import syntax.
     * Supports named imports, namespace imports, default imports, and mixed imports.
     * @param importStatement - The import statement to parse (e.g., "import { foo } from 'module'")
     * @returns True if the import statement was successfully parsed, false otherwise
     * @remarks Sets this.convertedImport and this.libraryName on successful parse
     */
    parseImportStatement(importStatement) {
        // Remove trailing semicolon and trim
        const statement = importStatement.trim().replace(/;$/, '');
        // Pattern for named imports: import { Item1, Item2 } from 'module';
        const namedImportMatch = statement.match(/import\s*{\s*([^}]*)\s*}\s*from\s*['"]([^'"]+)['"]/);
        if (namedImportMatch) {
            const imports = namedImportMatch[1];
            const module = namedImportMatch[2];
            this.convertedImport = `const { ${imports} } = await import('${module}');`;
            this.libraryName = module;
            return true;
        }
        // Pattern for namespace imports: import * as name from 'module';
        const namespaceImportMatch = statement.match(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
        if (namespaceImportMatch) {
            const varName = namespaceImportMatch[1];
            const module = namespaceImportMatch[2];
            this.convertedImport = `const ${varName} = await import('${module}');`;
            this.libraryName = module;
            this.success = true;
            return true;
        }
        // Pattern for default import: import name from 'module';
        const defaultImportMatch = statement.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
        if (defaultImportMatch) {
            const varName = defaultImportMatch[1];
            const module = defaultImportMatch[2];
            this.convertedImport = `const ${varName} = (await import('${module}')).default;`;
            this.libraryName = module;
            this.success = true;
            return true;
        }
        // Pattern for mixed imports: import defaultName, { named } from 'module';
        const mixedImportMatch = statement.match(/import\s+(\w+)\s*,\s*{\s*([^}]*)\s*}\s*from\s*['"]([^'"]+)['"]/);
        if (mixedImportMatch) {
            const defaultName = mixedImportMatch[1];
            const namedImports = mixedImportMatch[2];
            const module = mixedImportMatch[3];
            this.convertedImport = `const ${defaultName} = (await import('${module}')).default; const { ${namedImports} } = await import('${module}');`;
            this.libraryName = module;
            this.success = true;
            return true;
        }
        // Could not parse the import statement    
        return false;
    }
    /**
     * Checks if the library is a local library (starts with . or ..).
     * @returns True if the library is local, false otherwise
     * @remarks Sets this.errorMsg if the library is not local
     */
    getIsLibraryLocal() {
        // Check if library is local (starts with ./ or ../)
        if (!this.libraryName.startsWith('.')) {
            this.errorMsg = `Library '${this.libraryName}' is an npm package. Only local project libraries are supported.`;
            return false;
        }
        return true;
    }
    getIsLibraryLocalFlag() {
        return this.isLibraryLocalFlag;
    }
    /**
     * Validates and resolves local library imports.
     * Validates that the library is local (starts with . or ..), resolves the file path with common extensions, and verifies the file exists.
     * @param importStatement - The import statement to parse and validate
     * @param baseDir - The base directory for resolving relative paths (defaults to current working directory)
     * @returns True if the library is valid and can be resolved, false otherwise
     * @remarks Sets this.actualFilePath on successful resolution, or sets this.errorMsg on failure
     */
    checkLibrary(importStatement, baseDir = process.cwd()) {
        // Resolve the actual file path
        const resolvedPath = path.resolve(baseDir, this.libraryName);
        // Try to find the file with the resolved path or with common extensions
        let actualFilePath = null;
        const commonExtensions = ['.ts', '.js', '.tsx', '.jsx', ''];
        for (const ext of commonExtensions) {
            const testPath = ext ? `${resolvedPath}${ext}` : resolvedPath;
            if (fs.existsSync(testPath)) {
                actualFilePath = testPath;
                break;
            }
        }
        // Check if file exists with any common extension
        if (!actualFilePath) {
            this.errorMsg = `Local library file not found: ${resolvedPath} (tried with extensions: .ts, .js, .tsx, .jsx)`;
            return false;
        }
        // Check if it's a file (not a directory)
        const stats = fs.statSync(actualFilePath);
        if (!stats.isFile()) {
            this.errorMsg = `Path is not a file: ${actualFilePath}`;
            return false;
        }
        // Store the resolved file path for later use in createBackup()
        this.actualFilePath = actualFilePath;
        return true;
    }
    ;
    /**
     * Returns whether the import was processed successfully.
     * @returns True if the import library was successfully imported, false otherwise
     */
    importSucessfull() {
        return this.success;
    }
    /**
     * Returns the error message if import processing failed.
     * @returns The error message, or empty string if no error occurred
     */
    getErrorMessage() {
        return this.errorMsg;
    }
    /**
     * Returns the content of the imported library file.
     * @returns The file content as a string, or null if the file could not be read
     */
    getFileContent() {
        return this.fileContent;
    }
    /**
     * Returns the converted import statement in dynamic import syntax.
     * @returns The converted import statement, or empty string if parsing failed
     */
    getConvertedImport() {
        return this.convertedImport;
    }
}
exports.ImportLibrary = ImportLibrary;

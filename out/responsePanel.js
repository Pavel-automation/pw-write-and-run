"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponsePanelProvider = void 0;
class ResponsePanelProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        this.lastMessage = '';
        this.lastType = 'info';
        this.hasResponse = false;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // If there's already a message, send it to the webview once it's ready
        if (this.lastMessage) {
            // Use setTimeout to ensure the webview is fully loaded
            setTimeout(() => {
                this._updateWebview();
            }, 100);
        }
    }
    setMessage(message, type) {
        this.lastMessage = message;
        this.lastType = type;
        this.hasResponse = true;
        this._updateWebview();
    }
    clear() {
        this.lastMessage = '';
        this.lastType = 'info';
        this.hasResponse = false;
        this._updateWebview();
    }
    hasMessage() {
        return this.lastMessage.length > 0;
    }
    setDefaultMessage(message) {
        // Only set default message if there's no actual response
        if (!this.hasResponse) {
            this.lastMessage = message;
            this.lastType = 'info';
            this._updateWebview();
        }
    }
    setWaitingMessage() {
        this.lastMessage = 'Executing in browser ...';
        this.lastType = 'info';
        this.hasResponse = false;
        this._updateWebview();
    }
    _updateWebview() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'update',
                message: this.lastMessage,
                messageType: this.lastType
            });
        }
    }
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Response</title>
  <style>
    * {
      box-sizing: border-box;
    }
    
    body {
      padding: 0;
      margin: 0;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 8px;
      gap: 6px;
    }

    .response-area {
      flex: 1;
      width: 100%;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      padding: 8px;
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
      resize: none;
      overflow-y: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .response-area:focus {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    .response-area.success {
      border-left: 3px solid var(--vscode-testing-iconPassed);
    }

    .response-area.error {
      border-left: 3px solid var(--vscode-testing-iconFailed);
    }

    .response-area.info {
      border-left: 3px solid var(--vscode-charts-blue);
    }

    .response-area.empty {
      color: var(--vscode-input-placeholderForeground);
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <textarea 
      id="responseArea" 
      class="response-area empty" 
      readonly
      placeholder="No response yet. Execute a command to see the result here."
    ></textarea>
  </div>

  <script>
    (function() {
      const vscode = acquireVsCodeApi();
      const responseArea = document.getElementById('responseArea');

      window.addEventListener('message', event => {
        const message = event.data;
        
        if (message.type === 'update') {
          if (message.message) {
            responseArea.value = message.message;
            responseArea.classList.remove('empty', 'success', 'error', 'info');
            responseArea.classList.add(message.messageType);
          } else {
            responseArea.value = '';
            responseArea.classList.remove('success', 'error', 'info');
            responseArea.classList.add('empty');
          }
        }
      });
    })();
  </script>
</body>
</html>`;
    }
}
exports.ResponsePanelProvider = ResponsePanelProvider;
ResponsePanelProvider.viewType = 'pwConsole.responseView';

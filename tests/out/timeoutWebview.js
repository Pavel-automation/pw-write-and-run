"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutWebviewProvider = void 0;
class TimeoutWebviewProvider {
    constructor(_extensionUri, logPanelProvider) {
        this._extensionUri = _extensionUri;
        this.logPanelProvider = logPanelProvider;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'setTimeout':
                    {
                        const timeout = parseInt(data.value, 10);
                        if (!isNaN(timeout) && timeout > 0) {
                            if (this.logPanelProvider.setTimeout(timeout)) {
                                this.logPanelProvider.addLog(`Timeout updated to ${timeout}ms`, 'info', false);
                                // Update the webview with success
                                webviewView.webview.postMessage({ type: 'timeoutUpdated', value: timeout });
                            }
                        }
                    }
                    break;
                case 'getTimeout':
                    {
                        const currentTimeout = this.logPanelProvider.getTimeout();
                        webviewView.webview.postMessage({ type: 'currentTimeout', value: currentTimeout });
                    }
                    break;
            }
        });
    }
    _getHtmlForWebview(webview) {
        const currentTimeout = this.logPanelProvider.getTimeout();
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Timeout Settings</title>
  <style>
    * {
      box-sizing: border-box;
    }
    
    body {
      padding: 10px;
      margin: 0;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    label {
      display: block;
      margin-bottom: 4px;
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      text-transform: uppercase;
    }

    input[type="number"] {
      width: 100%;
      padding: 4px 8px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      outline: none;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    input[type="number"]:focus {
      border-color: var(--vscode-focusBorder);
    }

    input[type="number"]:invalid {
      border-color: var(--vscode-inputValidation-errorBorder);
    }

    .presets {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .preset-btn {
      padding: 3px 8px;
      font-size: 11px;
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      cursor: pointer;
    }

    .preset-btn:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }

    .current-value {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div>
      <label for="timeout">Timeout (milliseconds)</label>
      <input type="number" id="timeout" value="${currentTimeout}" min="1" step="1000" placeholder="60000" />
      <div class="current-value">Current: <span id="currentValue">${currentTimeout}ms</span></div>
    </div>
    
    <div class="presets">
      <button class="preset-btn" data-value="5000">5s</button>
      <button class="preset-btn" data-value="10000">10s</button>
      <button class="preset-btn" data-value="15000">15s</button>
      <button class="preset-btn" data-value="30000">30s</button>
      <button class="preset-btn" data-value="60000">60s</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const input = document.getElementById('timeout');
    const currentValue = document.getElementById('currentValue');
    const presetBtns = document.querySelectorAll('.preset-btn');

    function updateTimeout() {
      const value = input.value;
      if (value && parseInt(value) > 0) {
        vscode.postMessage({ type: 'setTimeout', value: value });
      }
    }

    // Update timeout when user finishes editing (blur or Enter)
    input.addEventListener('change', updateTimeout);
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        updateTimeout();
      }
    });

    // Preset buttons
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        input.value = value;
        vscode.postMessage({ type: 'setTimeout', value: value });
      });
    });

    // Handle messages from the extension
    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.type) {
        case 'timeoutUpdated':
          currentValue.textContent = message.value + 'ms';
          break;
        case 'currentTimeout':
          input.value = message.value;
          currentValue.textContent = message.value + 'ms';
          break;
      }
    });

    // Request current timeout on load
    vscode.postMessage({ type: 'getTimeout' });
  </script>
</body>
</html>`;
    }
}
exports.TimeoutWebviewProvider = TimeoutWebviewProvider;
TimeoutWebviewProvider.viewType = 'pwConsole.timeoutView';

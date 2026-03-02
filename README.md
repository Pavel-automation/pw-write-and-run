# PW Write-And-Run

**Write and run Playwright code on the fly, without restarting the test.**

## Features

- ▶ **Live Code Execution** - Run Playwright code on the fly without restarting the test
- ▶ **Instant Feedback** - Executed commands take effect in the browser immediately
- ▶ **Preserved Context** - Preserves the scope - variables and functions remain accessible
- ▶ **Dynamic Module Loading** - Support for (re)loading imported modules
- ▶ **Flexible Timeouts** - Configurable timeout settings for different scenarios


![PW Write-And-Run Demo](./images/Short_Demo.gif)

## How to Use

1. **Add a Run Point (▶)** 
   - Right-click in your test file → **PW Write-And-Run** → **Add Run Point**
   - This marks where the test should pause for interactive execution

2. **Run Your Test in Show Browser Mode**
   - Execute your Playwright test with the *Show browser* - flag 
   - The test will pause when it reaches the Run Point

3. **Check Connection Status**
   - When the Run Point is reached, the status bar indicator changes from **PWC⊘** (disconnected) to **PWC✓** (connected)

4. **Write and Execute Code Interactively**
   - Write one or several commands after Run Point
   - Select the code you want to execute
   - Right-click → **Run Selected** or press **Ctrl+Enter**
   - Watch the commands execute immediately in the browser

5. **Iterate as Needed**
   - Continue writing and executing code as many times as you need
   - Test different approaches without restarting the test

6. **Clean Up**
   - When done, remove Run Points: Right-click → **PW Write-And-Run** → **Clear Run Point(s)**

### Keyboard Shortcuts

- **Ctrl+Enter** - Execute selected code

## Use Cases

- **Rapid Prototyping** - Test selectors and interactions quickly
- **Debugging** - Inspect page state and try fixes without restarting
- **Learning** - Experiment with Playwright API interactively
- **Exploration** - Discover page elements and behaviors on the fly

## Support

For issues, questions, or feature requests, please visit the [GitHub repository](https://github.com/Pavel-automation/pw-write-and-run).

## Prerequisites

- Visual Studio Code 1.80.0 or higher
- Playwright installed
- "Playwright Test for VS Code" extension highly recommended


## Installation
1. Install required library 
```bash
npm install -D pw-execution-context
```
1. Open Visual Studio Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Playwright Write-And-Run"
4. Click Install

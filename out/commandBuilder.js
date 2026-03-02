"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandBuilder = void 0;
/**
 * CommandBuilder is responsible for building commands that will be executed in the test context.
 * It wraps user commands with necessary setup (timeouts) and context management.
 */
class CommandBuilder {
    static buildAsExpression(command, timeout) {
        return `(async () => {
      page.setDefaultNavigationTimeout(${timeout});
      page.setDefaultTimeout(${timeout});
      const ${this.returnVariableName} = ${command}
      return { res: ${this.returnVariableName}, contextFunction: async s => (await eval(s)) };
    })()`;
    }
    /**
     * Builds a command that executes as a statement without trying to capture a return value.
     * Use this for commands that are statements (e.g., const x = 5) or don't return values.
     *
     * @param command The raw command to execute
     * @param timeout The timeout for page operations in milliseconds
     * @returns The built command string ready for execution
     */
    static buildAsStatement(command, timeout) {
        return `(async () => {
      page.setDefaultNavigationTimeout(${timeout});
      page.setDefaultTimeout(${timeout});
      ${command}
      return async s => (await eval(s));
    })()`;
    }
}
exports.CommandBuilder = CommandBuilder;
/**
 * Builds a command that tries to return a result from an expression.
 * Use this for commands that should return a value (e.g., await page.textContent('#id'))
 *
 * @param command The raw command to execute
 * @param timeout The timeout for page operations in milliseconds
 * @returns The built command string ready for execution
 */
CommandBuilder.returnVariableName = 'res95869048690';

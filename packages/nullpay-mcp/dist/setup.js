"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSetupWizard = runSetupWizard;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("readline/promises"));
const process_1 = require("process");
function getClaudeCodeConfigPath() {
    return path_1.default.join(os_1.default.homedir(), '.claude.json');
}
function getClaudeDesktopConfigPath() {
    if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || path_1.default.join(os_1.default.homedir(), 'AppData', 'Local');
        const packagedClaudePath = path_1.default.join(localAppData, 'Packages', 'Claude_pzs8sxrjxfjjc', 'LocalCache', 'Roaming', 'Claude', 'claude_desktop_config.json');
        if (fs_1.default.existsSync(packagedClaudePath) || fs_1.default.existsSync(path_1.default.dirname(packagedClaudePath))) {
            return packagedClaudePath;
        }
    }
    if (process.platform === 'win32') {
        const appData = process.env.APPDATA || path_1.default.join(os_1.default.homedir(), 'AppData', 'Roaming');
        return path_1.default.join(appData, 'Claude', 'claude_desktop_config.json');
    }
    if (process.platform === 'darwin') {
        return path_1.default.join(os_1.default.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    }
    return path_1.default.join(os_1.default.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
}
function buildServerEntry(answers) {
    const env = {
        NULLPAY_MAIN_ADDRESS: answers.address,
        NULLPAY_MAIN_PRIVATE_KEY: answers.privateKey,
        NULLPAY_MAIN_PASSWORD: answers.password,
    };
    if (process.platform === 'win32') {
        return {
            command: 'cmd',
            args: ['/c', 'npx', '-y', '@nullpay/mcp', 'server'],
            env,
        };
    }
    return {
        command: 'npx',
        args: ['-y', '@nullpay/mcp', 'server'],
        env,
    };
}
function readJsonConfig(configPath) {
    if (!fs_1.default.existsSync(configPath)) {
        return {};
    }
    const raw = fs_1.default.readFileSync(configPath, 'utf8').trim();
    if (!raw) {
        return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error(`Config at ${configPath} is not a JSON object.`);
    }
    return parsed;
}
function writeMcpConfig(configPath, serverName, entry) {
    const current = readJsonConfig(configPath);
    const currentMcpServers = current.mcpServers && typeof current.mcpServers === 'object' && !Array.isArray(current.mcpServers)
        ? current.mcpServers
        : {};
    const next = {
        ...current,
        mcpServers: {
            ...currentMcpServers,
            [serverName]: entry,
        },
    };
    fs_1.default.mkdirSync(path_1.default.dirname(configPath), { recursive: true });
    fs_1.default.writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}
async function askChoice(rl) {
    process_1.stdout.write('Where do you want to install NullPay MCP?\n');
    process_1.stdout.write('1. Claude Code\n');
    process_1.stdout.write('2. Claude Desktop\n');
    process_1.stdout.write('3. Cancel\n');
    while (true) {
        const answer = (await rl.question('Choose 1, 2, or 3: ')).trim();
        if (answer === '1')
            return 'claude-code';
        if (answer === '2')
            return 'claude-desktop';
        if (answer === '3')
            return null;
        process_1.stdout.write('Please enter 1, 2, or 3.\n');
    }
}
async function askRequired(rl, label) {
    while (true) {
        const answer = (await rl.question(`${label}: `)).trim();
        if (answer) {
            return answer;
        }
        process_1.stdout.write(`${label} is required.\n`);
    }
}
async function collectAnswers(rl) {
    process_1.stdout.write('\nNullPay will configure Claude automatically. You only need to provide your wallet credentials here.\n\n');
    const address = await askRequired(rl, 'Main wallet address');
    const privateKey = await askRequired(rl, 'Main wallet private key');
    const password = await askRequired(rl, 'NullPay password');
    return {
        address,
        privateKey,
        password,
    };
}
async function runSetupWizard() {
    const rl = promises_1.default.createInterface({ input: process_1.stdin, output: process_1.stdout });
    try {
        process_1.stdout.write('NullPay MCP setup\n\n');
        const choice = await askChoice(rl);
        if (!choice) {
            process_1.stdout.write('Setup cancelled.\n');
            return;
        }
        const answers = await collectAnswers(rl);
        const entry = buildServerEntry(answers);
        const configPath = choice === 'claude-code' ? getClaudeCodeConfigPath() : getClaudeDesktopConfigPath();
        writeMcpConfig(configPath, 'nullpay', entry);
        process_1.stdout.write(`\nNullPay MCP was added to ${configPath}\n`);
        if (choice === 'claude-code') {
            process_1.stdout.write('Next step: restart Claude Code or run `claude mcp list` to confirm the server is registered.\n');
        }
        else {
            process_1.stdout.write('Next step: fully restart Claude Desktop so it reloads the new MCP config.\n');
        }
    }
    finally {
        rl.close();
    }
}

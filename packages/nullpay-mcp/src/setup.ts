import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

type AgentChoice = 'claude-code' | 'claude-desktop';

interface SetupAnswers {
    address: string;
    privateKey: string;
    password: string;
}

type JsonRecord = Record<string, unknown>;

function getClaudeCodeConfigPath(): string {
    return path.join(os.homedir(), '.claude.json');
}

function getClaudeDesktopConfigPath(): string {
    if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        const packagedClaudePath = path.join(localAppData, 'Packages', 'Claude_pzs8sxrjxfjjc', 'LocalCache', 'Roaming', 'Claude', 'claude_desktop_config.json');
        if (fs.existsSync(packagedClaudePath) || fs.existsSync(path.dirname(packagedClaudePath))) {
            return packagedClaudePath;
        }
    }

    if (process.platform === 'win32') {
        const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
        return path.join(appData, 'Claude', 'claude_desktop_config.json');
    }

    if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    }

    return path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
}

function buildServerEntry(answers: SetupAnswers) {
    const env: Record<string, string> = {
        NULLPAY_MAIN_ADDRESS: answers.address,
        NULLPAY_MAIN_PRIVATE_KEY: answers.privateKey,
        ...(answers.password ? { NULLPAY_MAIN_PASSWORD: answers.password } : {}),
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

function readJsonConfig(configPath: string): JsonRecord {
    if (!fs.existsSync(configPath)) {
        return {};
    }

    const raw = fs.readFileSync(configPath, 'utf8').trim();
    if (!raw) {
        return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error(`Config at ${configPath} is not a JSON object.`);
    }

    return parsed as JsonRecord;
}

function writeMcpConfig(configPath: string, serverName: string, entry: Record<string, unknown>) {
    const current = readJsonConfig(configPath);
    const currentMcpServers = current.mcpServers && typeof current.mcpServers === 'object' && !Array.isArray(current.mcpServers)
        ? current.mcpServers as JsonRecord
        : {};

    const next = {
        ...current,
        mcpServers: {
            ...currentMcpServers,
            [serverName]: entry,
        },
    };

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}

async function askChoice(rl: readline.Interface): Promise<AgentChoice | null> {
    output.write('Where do you want to install NullPay MCP?\n');
    output.write('1. Claude Code (beta version)\n');
    output.write('2. Claude Desktop\n');
    output.write('3. Cancel\n');

    while (true) {
        const answer = (await rl.question('Choose 1, 2, or 3: ')).trim();
        if (answer === '1') return 'claude-code';
        if (answer === '2') return 'claude-desktop';
        if (answer === '3') return null;
        output.write('Please enter 1, 2, or 3.\n');
    }
}

async function askRequired(rl: readline.Interface, label: string): Promise<string> {
    while (true) {
        const answer = (await rl.question(`${label}: `)).trim();
        if (answer) {
            return answer;
        }
        output.write(`${label} is required.\n`);
    }
}

async function askOptional(rl: readline.Interface, label: string): Promise<string> {
    return (await rl.question(`${label}: `)).trim();
}

async function collectAnswers(rl: readline.Interface): Promise<SetupAnswers> {
    output.write('\nNullPay will configure Claude automatically. You only need to provide your wallet credentials here.\n\n');
    const address = await askRequired(rl, 'Main wallet address');
    const privateKey = await askRequired(rl, 'Main wallet private key');
    const password = await askOptional(rl, 'NullPay password (optional if you have it backed up in your records)');

    return {
        address,
        privateKey,
        password,
    };
}

export async function runSetupWizard() {
    const rl = readline.createInterface({ input, output });

    try {
        output.write('NullPay MCP setup\n\n');
        const choice = await askChoice(rl);
        if (!choice) {
            output.write('Setup cancelled.\n');
            return;
        }

        const answers = await collectAnswers(rl);
        const entry = buildServerEntry(answers);
        const configPath = choice === 'claude-code' ? getClaudeCodeConfigPath() : getClaudeDesktopConfigPath();

        writeMcpConfig(configPath, 'nullpay', entry);

        output.write(`\nNullPay MCP was added to ${configPath}\n`);

        if (choice === 'claude-code') {
            output.write('Next step: restart Claude Code or run `claude mcp list` to confirm the server is registered.\n');
        } else {
            output.write('Next step: fully restart Claude Desktop so it reloads the new MCP config.\n');
        }
    } finally {
        rl.close();
    }
}

import { spawn, execSync } from 'child_process';
import { platform } from 'os';

const SHUTDOWN_DELAY_SECONDS = 5;

const SLEEP_COMMANDS = {
    win32: { cmd: 'powershell.exe', args: ['-Command', 'Add-Type -Assembly System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState([System.Windows.Forms.PowerState]::Suspend, $false, $false)'] },
    darwin: { cmd: 'pmset', args: ['sleepnow'] },
    linux: { cmd: 'systemctl', args: ['suspend'] }
};

const SHUTDOWN_COMMANDS = {
    win32: { cmd: 'shutdown', args: ['/s', '/t', String(SHUTDOWN_DELAY_SECONDS)] },
    darwin: { cmd: 'shutdown', args: ['-h', `+${SHUTDOWN_DELAY_SECONDS}`] },
    linux: { cmd: 'shutdown', args: ['-h', `+${SHUTDOWN_DELAY_SECONDS}`] }
};

function executeCommand(commandConfig) {
    const { cmd, args } = commandConfig;
    return new Promise((resolve, reject) => {
        let errorOccurred = false;
        let settled = false;

        const proc = spawn(cmd, args, {
            stdio: 'ignore',
            shell: false
        });

        const timeout = setTimeout(() => {
            if (!settled) {
                settled = true;
                try { proc.kill(); } catch (e) { /* ignore */ }
                resolve();
            }
        }, 10000);

        proc.on('error', (error) => {
            errorOccurred = true;
            if (!settled) {
                settled = true;
                clearTimeout(timeout);
                reject(new Error(`Failed to execute command: ${error.message}`));
            }
        });

        proc.on('exit', (code, signal) => {
            if (!errorOccurred && !settled) {
                settled = true;
                clearTimeout(timeout);
                if (code === 0 || code === null) {
                    resolve();
                } else {
                    reject(new Error(`Command exited with code: ${code}`));
                }
            }
        });

        proc.unref();
    });
}

export async function executeSystemSleep() {
    const currentPlatform = platform();
    const commandConfig = SLEEP_COMMANDS[currentPlatform];

    if (!commandConfig) {
        throw new Error(`Unsupported platform for sleep: ${currentPlatform}`);
    }

    try {
        await executeCommand(commandConfig);
    } catch (error) {
        const fallbackCommands = {
            linux: { cmd: 'loginctl', args: ['suspend'] }
        };

        if (fallbackCommands[currentPlatform]) {
            console.log('[TimerService] Primary sleep command failed, trying fallback...');
            await executeCommand(fallbackCommands[currentPlatform]);
        } else {
            throw error;
        }
    }
}

export async function executeSystemShutdown() {
    const currentPlatform = platform();
    const commandConfig = SHUTDOWN_COMMANDS[currentPlatform];

    if (!commandConfig) {
        throw new Error(`Unsupported platform for shutdown: ${currentPlatform}`);
    }

    await executeCommand(commandConfig);
}

export function checkSystemPermission(action) {
    const currentPlatform = platform();
    const result = {
        platform: currentPlatform,
        canExecute: true,
        warnings: []
    };

    if (action === 'shutdown' || action === 'sleep') {
        if (currentPlatform === 'linux') {
            result.warnings.push('Linux 系统可能需要 polkit 权限才能执行系统操作');
            try {
                execSync('which systemctl', { stdio: 'ignore' });
            } catch (e) {
                result.canExecute = false;
                result.warnings.push('未找到 systemctl 命令，无法执行系统操作');
            }
        }
        if (currentPlatform === 'darwin') {
            result.warnings.push('macOS 可能需要管理员权限才能执行关机操作');
        }
    }

    return result;
}

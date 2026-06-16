import { BrowserWindow, app } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import log from 'electron-log';
import treeKill from 'tree-kill';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NATIVE_HOST_PERMISSION = 'moekoe:nativeHost';
const SUPPORTED_PLATFORMS = ['win32', 'darwin', 'linux'];
const MAX_MESSAGE_BYTES = 64 * 1024;
const SHUTDOWN_TIMEOUT = 1500;

// 自定义权限不建议直接放进 Chrome 标准 permissions，否则扩展加载器可能认为是未知权限。
// 因此这里同时兼容 manifest.permissions 和 MoeKoe 专用的 manifest.moekoe_permissions。
function hasNativeHostPermission(manifest) {
    return (Array.isArray(manifest?.permissions) && manifest.permissions.includes(NATIVE_HOST_PERMISSION)) ||
        (Array.isArray(manifest?.moekoe_permissions) && manifest.moekoe_permissions.includes(NATIVE_HOST_PERMISSION));
}

function fsExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch {
        return false;
    }
}

function getPlatformEntries(host) {
    if (!host?.platforms || typeof host.platforms !== 'object' || Array.isArray(host.platforms)) {
        return {};
    }

    return host.platforms;
}

function isRelativePluginPath(filePath) {
    const value = typeof filePath === 'string' ? filePath.trim() : '';
    const normalizedPath = path.posix.normalize(value.replace(/[\\]+/g, '/'));

    return Boolean(value) &&
        !path.isAbsolute(value) &&
        !/^[a-zA-Z]:/.test(value) &&
        !normalizedPath.startsWith('/') &&
        normalizedPath !== '..' &&
        !normalizedPath.startsWith('../');
}

class NativeHostManager {
    constructor() {
        // electron-store 会写入当前用户的应用配置目录，用来持久化用户授权选择。
        this.store = new Store();
        // extensionId -> 插件运行时信息。extensionId 来自 Electron/Chromium 加载后的扩展 ID。
        this.extensions = new Map();
        // `${extensionId}:${hostId}` -> 子进程信息。
        this.processes = new Map();
        // `${extensionId}:${hostId}` -> 隐藏 bridge 窗口。
        this.bridgeWindows = new Map();
    }

    syncExtensions(loadedExtensions = [], scannedExtensions = []) {
        // 插件加载/刷新后重建索引，后续授权、状态查询和消息发送都依赖这个索引。
        this.extensions.clear();

        for (const extension of loadedExtensions) {
            const scanned = scannedExtensions.find(item => item.name === extension.name);
            const manifest = extension.manifest || scanned?.manifest || {};
            const extensionPath = scanned?.path || '';
            const pluginId = this.getPluginId(extension.id, scanned?.directory, manifest);

            this.extensions.set(extension.id, {
                extensionId: extension.id,
                pluginId,
                name: extension.name,
                directory: scanned?.directory || '',
                extensionPath,
                manifest
            });
        }
    }

    startAuthorizedAutoHosts() {
        // 只处理明确支持的三类桌面平台，其他平台直接跳过。
        if (!SUPPORTED_PLATFORMS.includes(process.platform)) {
            return;
        }

        for (const record of this.extensions.values()) {
            for (const host of this.getHosts(record)) {
                // auto_start 只控制 exe 是否自动启动；bridge 需要在授权后就打开，
                // 这样 background/service worker 即使没有 popup 也能发起通信。
                if (host.autoStart && host.authorized && host.valid && host.supported) {
                    this.startHost(record, host);
                }
                if (host.authorized && host.valid && host.supported) {
                    this.openBridge(record, host);
                }
            }
        }
    }

    describeHosts(extensionId, manifest, extensionPath, directory = '') {
        // 供插件管理页展示用：返回声明、授权、运行状态，但不启动进程。
        const record = {
            extensionId,
            pluginId: this.getPluginId(extensionId, directory, manifest || {}),
            name: manifest?.name || '',
            directory,
            extensionPath,
            manifest: manifest || {}
        };

        return this.getHosts(record);
    }

    setAuthorization(extensionId, hostId, authorized) {
        // 管理页授权/取消授权入口。授权记录以 pluginId + hostId 为 key 持久化。
        const record = this.extensions.get(extensionId);
        if (!record) {
            return { success: false, message: '未找到插件' };
        }

        const host = this.getHosts(record).find(item => item.id === hostId);
        if (!host) {
            return { success: false, message: '未找到本地程序声明' };
        }
        if (!host.valid) {
            return { success: false, message: host.errors.join('; ') };
        }
        if (!host.supported) {
            return { success: false, message: '当前平台不支持该本地程序' };
        }

        this.store.set(this.getPermissionKey(record.pluginId, host.id), authorized === true);

        if (authorized) {
            if (host.autoStart) {
                this.startHost(record, host);
            }
            this.openBridge(record, host);
        } else {
            this.stopHostByKey(this.getKey(record.extensionId, host.id), true);
            this.closeBridge(this.getKey(record.extensionId, host.id));
        }

        return { success: true };
    }

    clearExtensionAuthorization(extensionId) {
        const record = this.extensions.get(extensionId);
        if (!record) {
            return;
        }

        for (const host of this.getHosts(record)) {
            this.store.delete(this.getPermissionKey(record.pluginId, host.id));
        }
    }

    getStatusFromSender(extensionId, hostId) {
        // 插件侧查询自己的 host 状态。extensionId 从 senderFrame.url 解析，不允许跨插件查询。
        const record = this.extensions.get(extensionId);
        if (!record) {
            return { success: false, message: '未找到插件' };
        }

        const host = this.getHosts(record).find(item => item.id === hostId);
        if (!host) {
            return { success: false, message: '未找到本地程序声明' };
        }

        return { success: true, host };
    }

    sendFromSender(extensionId, hostId, payload) {
        // 插件侧发送业务消息。真正写 stdin 前会再次检查授权、平台和声明合法性。
        const record = this.extensions.get(extensionId);
        if (!record) {
            return { success: false, message: '未找到插件' };
        }

        const host = this.getHosts(record).find(item => item.id === hostId);
        if (!host) {
            return { success: false, message: '未找到本地程序声明' };
        }
        if (!host.authorized) {
            return { success: false, message: '本地程序尚未授权' };
        }
        if (!host.valid) {
            return { success: false, message: host.errors.join('; ') };
        }
        if (!host.supported) {
            return { success: false, message: '当前平台不支持该本地程序' };
        }

        const processInfo = this.startHost(record, host);
        this.openBridge(record, host);

        if (!processInfo?.process || processInfo.process.killed) {
            return { success: false, message: '本地程序未运行' };
        }

        const message = JSON.stringify({ type: 'message', payload });
        if (Buffer.byteLength(message, 'utf8') > MAX_MESSAGE_BYTES) {
            return { success: false, message: '发送给本地程序的消息过大' };
        }

        // 与 exe 的通信协议是 JSON Lines：每条 JSON 后面追加一个换行。
        this.writeToHost(processInfo, { type: 'message', payload });
        return { success: true };
    }

    stopExtension(extensionId, clearAuthorization = false) {
        // 插件卸载/重载时停止其所有 host；卸载时还会清理授权记录。
        const record = this.extensions.get(extensionId);
        if (!record) {
            return;
        }

        for (const host of this.getHosts(record)) {
            const key = this.getKey(record.extensionId, host.id);
            this.stopHostByKey(key, true);
            this.closeBridge(key);
            if (clearAuthorization) {
                this.store.delete(this.getPermissionKey(record.pluginId, host.id));
            }
        }
    }

    stopAll() {
        // 应用退出或插件系统清理时调用，统一关闭所有托管进程和 bridge。
        for (const key of [...this.processes.keys()]) {
            this.stopHostByKey(key, true);
        }
        for (const key of [...this.bridgeWindows.keys()]) {
            this.closeBridge(key);
        }
    }

    startHost(record, host) {
        // 同一个 host 已经在运行时复用进程，避免重复启动多个 exe。
        const key = this.getKey(record.extensionId, host.id);
        const existing = this.processes.get(key);
        if (existing?.process && !existing.process.killed && existing.process.exitCode === null) {
            return existing;
        }
        if (existing) {
            this.processes.delete(key);
        }
        if (!host.executablePath || !fsExists(host.executablePath)) {
            log.error(`本地程序文件不存在 ${record.pluginId}/${host.id}: ${host.executablePath}`);
            return null;
        }

        try {
            // 不使用 shell，避免插件通过拼接参数获得命令执行能力。
            const child = spawn(host.executablePath, host.args, {
                cwd: path.dirname(host.executablePath),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            const processInfo = {
                process: child,
                record,
                host,
                stdoutBuffer: ''
            };

            this.processes.set(key, processInfo);

            child.stdin.on('error', error => {
                if (error?.code !== 'EPIPE') {
                    log.warn(`本地程序标准输入错误 ${record.pluginId}/${host.id}:`, error);
                }
            });
            child.stdout.on('data', data => {
                this.handleStdout(key, data);
            });
            child.stderr.on('data', data => {
                log.warn(`本地程序标准错误输出 ${record.pluginId}/${host.id}: ${data}`);
            });
            child.on('exit', (code, signal) => {
                log.info(`本地程序已退出 ${record.pluginId}/${host.id}: ${code} ${signal || ''}`);
                if (this.processes.get(key) === processInfo) {
                    this.processes.delete(key);
                }
            });
            child.on('error', error => {
                log.error(`本地程序运行错误 ${record.pluginId}/${host.id}:`, error);
                if (this.processes.get(key) === processInfo) {
                    this.processes.delete(key);
                }
            });

            return processInfo;
        } catch (error) {
            log.error(`启动本地程序失败 ${record.pluginId}/${host.id}:`, error);
            return null;
        }
    }

    stopHostByKey(key, forceKill) {
        // 先给 exe 一个正常退出机会；超时后再 tree-kill 兜底清理子进程树。
        const processInfo = this.processes.get(key);
        if (!processInfo?.process) {
            return;
        }

        const child = processInfo.process;
        if (this.processes.get(key) === processInfo) {
            this.processes.delete(key);
        }

        this.writeToHost(processInfo, { type: 'shutdown' }, true);

        setTimeout(() => {
            if (!forceKill || child.killed || child.exitCode !== null) {
                return;
            }

            treeKill(child.pid, 'SIGKILL', error => {
                if (error) {
                    log.warn(`强制结束本地程序失败 ${key}:`, error);
                }
            });
        }, SHUTDOWN_TIMEOUT);
    }

    // 安全写入 exe 标准输入。退出阶段 exe 可能已经先关闭管道，
    // 这时 Windows 会抛 EPIPE；关闭流程允许忽略这个错误，避免主进程未处理异常。
    writeToHost(processInfo, payload, ignoreBrokenPipe = false) {
        const child = processInfo?.process;
        if (!child || child.killed || child.stdin.destroyed || child.stdin.writableEnded || !child.stdin.writable) {
            return false;
        }

        try {
            child.stdin.write(`${JSON.stringify(payload)}\n`, error => {
                if (!error) {
                    return;
                }
                if (ignoreBrokenPipe && error.code === 'EPIPE') {
                    return;
                }
                log.warn(`写入本地程序标准输入失败 ${processInfo.record.pluginId}/${processInfo.host.id}:`, error);
            });
            return true;
        } catch (error) {
            if (!(ignoreBrokenPipe && error?.code === 'EPIPE')) {
                log.warn(`写入本地程序标准输入失败 ${processInfo.record.pluginId}/${processInfo.host.id}:`, error);
            }
            return false;
        }
    }

    openBridge(record, host) {
        // bridge 是一个隐藏扩展页，既能访问 chrome.runtime，又能通过 preload 访问 electronAPI。
        // background/service worker 不能直接拿到 Electron preload，因此需要这个中转页。
        if (!host.bridge) {
            return;
        }

        const key = this.getKey(record.extensionId, host.id);
        const existing = this.bridgeWindows.get(key);
        if (existing && !existing.isDestroyed()) {
            return;
        }

        const bridgeWindow = new BrowserWindow({
            width: 1,
            height: 1,
            show: false,
            skipTaskbar: true,
            webPreferences: {
                preload: path.join(__dirname, '../preload.cjs'),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
                webSecurity: false
            }
        });

        bridgeWindow.loadURL(`chrome-extension://${record.extensionId}/${host.bridge}`).catch(error => {
            log.error(`加载本地程序桥接页失败 ${record.pluginId}/${host.id}:`, error);
            this.closeBridge(key);
        });
        bridgeWindow.on('closed', () => {
            if (this.bridgeWindows.get(key) === bridgeWindow) {
                this.bridgeWindows.delete(key);
            }
        });

        this.bridgeWindows.set(key, bridgeWindow);
    }

    closeBridge(key) {
        const window = this.bridgeWindows.get(key);
        this.bridgeWindows.delete(key);
        if (window && !window.isDestroyed()) {
            window.close();
        }
    }

    handleStdout(key, data) {
        // exe stdout 可能一次返回半行或多行，这里用 buffer 累积后按换行切分。
        const processInfo = this.processes.get(key);
        if (!processInfo) {
            return;
        }

        processInfo.stdoutBuffer += data.toString('utf8');
        if (Buffer.byteLength(processInfo.stdoutBuffer, 'utf8') > MAX_MESSAGE_BYTES) {
            log.warn(`本地程序标准输出消息过大 ${key}`);
            processInfo.stdoutBuffer = '';
            return;
        }

        const lines = processInfo.stdoutBuffer.split(/\r?\n/);
        processInfo.stdoutBuffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                continue;
            }

            try {
                const message = JSON.parse(trimmed);
                // 解析成功后转给同一个 chrome-extension:// 扩展下的 bridge/popup 页面。
                this.sendToExtension(processInfo.record.extensionId, {
                    hostId: processInfo.host.id,
                    message
                });
            } catch (error) {
                log.warn(`本地程序输出的 JSON 无效 ${key}:`, error);
            }
        }
    }

    sendToExtension(extensionId, payload) {
        // 只向相同 extensionId 的扩展页面广播，避免插件之间互相收到 native host 消息。
        const extensionUrl = `chrome-extension://${extensionId}/`;
        for (const window of BrowserWindow.getAllWindows()) {
            if (window.isDestroyed()) {
                continue;
            }

            const url = window.webContents.getURL();
            if (url.startsWith(extensionUrl)) {
                window.webContents.send('native-host-message', payload);
            }
        }
    }

    getHosts(record) {
        // manifest 中未声明 moekoe_native_hosts 时，插件就是普通 Chrome 扩展。
        const declaredHosts = Array.isArray(record.manifest?.moekoe_native_hosts)
            ? record.manifest.moekoe_native_hosts
            : [];

        return declaredHosts.map(rawHost => this.normalizeHost(record, rawHost));
    }

    normalizeHost(record, rawHost) {
        // 把 manifest 声明转换成 UI/运行时都能直接使用的结构。
        const host = rawHost && typeof rawHost === 'object' ? rawHost : {};
        const errors = validateNativeHostDeclaration(record.manifest, host);
        const id = typeof host.id === 'string' ? host.id.trim() : '';
        const platformEntries = getPlatformEntries(host);
        const platformConfig = platformEntries[process.platform] && typeof platformEntries[process.platform] === 'object'
            ? platformEntries[process.platform]
            : null;
        const hostPath = typeof platformConfig?.path === 'string' ? platformConfig.path.trim() : '';
        const args = Array.isArray(platformConfig?.args) ? platformConfig.args : [];
        const executablePath = hostPath && record.extensionPath
            ? path.resolve(record.extensionPath, hostPath)
            : '';
        const bridge = typeof host.bridge === 'string' ? host.bridge.trim().replace(/[\\/]+/g, '/') : '';
        const platforms = Object.keys(platformEntries);
        const supported = SUPPORTED_PLATFORMS.includes(process.platform) && Boolean(platformConfig);
        const key = this.getKey(record.extensionId, id);

        return {
            id,
            path: hostPath,
            args,
            platform: process.platform,
            platforms,
            autoStart: host.auto_start === true,
            bridge,
            executablePath,
            supported,
            valid: errors.length === 0,
            errors,
            authorized: this.store.get(this.getPermissionKey(record.pluginId, id)) === true,
            running: this.processes.has(key)
        };
    }

    getPluginId(extensionId, directory, manifest) {
        return manifest?.plugin_id || directory || extensionId;
    }

    getPermissionKey(pluginId, hostId) {
        // 授权记录示例：nativeHostPermissions.moekoe-native-host-test.echo-host = true
        return `nativeHostPermissions.${pluginId}.${hostId}`;
    }

    getKey(extensionId, hostId) {
        return `${extensionId}:${hostId}`;
    }
}

export function validateNativeHostManifest(manifest) {
    const hosts = manifest?.moekoe_native_hosts;
    if (hosts === undefined) {
        return null;
    }
    if (!Array.isArray(hosts)) {
        return 'moekoe_native_hosts 必须是数组';
    }
    if (!hasNativeHostPermission(manifest)) {
        return `moekoe_native_hosts 需要声明 ${NATIVE_HOST_PERMISSION} 权限`;
    }

    for (const host of hosts) {
        const errors = validateNativeHostDeclaration(manifest, host);
        if (errors.length > 0) {
            return errors[0];
        }
    }

    return null;
}

function validateNativeHostDeclaration(manifest, host) {
    const errors = [];
    if (!host || typeof host !== 'object') {
        return ['本地程序声明必须是对象'];
    }
    if (!hasNativeHostPermission(manifest)) {
        errors.push(`缺少 ${NATIVE_HOST_PERMISSION} 权限声明`);
    }
    if (typeof host.id !== 'string' || !host.id.trim()) {
        errors.push('本地程序 id 不能为空');
    }
    if (!host.platforms || typeof host.platforms !== 'object' || Array.isArray(host.platforms)) {
        errors.push('本地程序 platforms 必须是平台配置对象');
    } else {
        const entries = Object.entries(host.platforms);
        if (entries.length === 0) {
            errors.push('本地程序 platforms 不能为空');
        }

        for (const [platform, config] of entries) {
            if (!SUPPORTED_PLATFORMS.includes(platform)) {
                errors.push('本地程序 platforms 只能包含 win32、darwin、linux');
                continue;
            }
            if (!config || typeof config !== 'object' || Array.isArray(config)) {
                errors.push(`本地程序 ${platform} 配置必须是对象`);
                continue;
            }
            if (typeof config.path !== 'string' || !config.path.trim()) {
                errors.push(`本地程序 ${platform}.path 不能为空`);
            } else {
                if (!isRelativePluginPath(config.path)) {
                    errors.push(`本地程序 ${platform}.path 必须位于插件目录内`);
                }
                if (platform === 'win32' && path.extname(config.path).toLowerCase() !== '.exe') {
                    errors.push('Windows 本地程序路径必须以 .exe 结尾');
                }
            }
            if (config.args !== undefined && (!Array.isArray(config.args) || config.args.some(arg => typeof arg !== 'string'))) {
                errors.push(`本地程序 ${platform}.args 必须是字符串数组`);
            }
        }
    }
    if (host.bridge !== undefined) {
        if (typeof host.bridge !== 'string' || !host.bridge.trim()) {
            errors.push('本地程序 bridge 必须是非空字符串');
        } else if (!isRelativePluginPath(host.bridge)) {
            errors.push('本地程序 bridge 必须位于插件目录内');
        }
    }

    return errors;
}

const nativeHostManager = new NativeHostManager();

app.on('before-quit', () => {
    nativeHostManager.stopAll();
});

export default nativeHostManager;

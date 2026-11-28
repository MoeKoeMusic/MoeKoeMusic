import fs from 'fs';
import path from 'path';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { app, dialog, ipcMain, net, shell, Notification } from 'electron';
import log from 'electron-log';
import { useStore } from '../util/store.js';

const store = useStore();
const DOWNLOAD_DIR_KEY = 'downloads.directory';
const DEFAULT_FOLDER_NAME = 'MoeKoe Music';

// 正在进行的下载任务 id -> { controller, sender, tempPath, filePath }
const tasks = new Map();
// 已被本次会话占用的目标路径，避免同名并发下载互相覆盖
const reservedPaths = new Set();

const ensureDirectory = (dir) => {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
};

/**
 * 获取下载目录，未配置或配置的目录已失效时回退到「下载」目录
 * @returns {string}
 */
const getDownloadDirectory = () => {
    const fallbackDir = path.join(app.getPath('downloads'), DEFAULT_FOLDER_NAME);
    const saved = store.get(DOWNLOAD_DIR_KEY);
    if (typeof saved === 'string' && saved.trim()) {
        try {
            return ensureDirectory(saved);
        } catch (error) {
            log.warn('[download] 自定义下载目录不可用，回退到默认目录:', error);
        }
    }
    try {
        return ensureDirectory(fallbackDir);
    } catch (error) {
        log.warn('[download] 默认下载目录不可用:', error);
        return fallbackDir;
    }
};

const sanitizeFileName = (name) => {
    const cleaned = String(name || '')
        .replace(/[\\/:*?"<>|\r\n\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[.\s]+$/, '');
    return (cleaned || 'MoeKoe Music').slice(0, 140);
};

const getUniqueFilePath = (dir, fileName) => {
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    let candidate = path.join(dir, fileName);
    let index = 1;
    while (fs.existsSync(candidate) || reservedPaths.has(candidate)) {
        candidate = path.join(dir, `${base} (${index})${ext}`);
        index += 1;
    }
    return candidate;
};

const removeQuietly = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (error) {
        log.warn('[download] 清理临时文件失败:', filePath, error);
    }
};

const safeSend = (sender, channel, payload) => {
    try {
        if (sender && !sender.isDestroyed()) sender.send(channel, payload);
    } catch (error) {
        log.warn('[download] 发送进度失败:', error);
    }
};

/**
 * 流式下载到本地文件，并把进度回传给渲染进程
 * @param {Electron.IpcMainInvokeEvent} event
 * @param {{ id: string, url: string, fileName: string, headers?: Record<string, string> }} payload
 */
const startDownload = async (event, payload = {}) => {
    const { id, url, fileName } = payload;
    if (!id || !url) return { success: false, error: 'INVALID_PAYLOAD' };

    const sender = event.sender;
    const dir = getDownloadDirectory();
    const targetPath = getUniqueFilePath(dir, `${sanitizeFileName(fileName)}`);
    const tempPath = `${targetPath}.part`;
    const controller = new AbortController();

    reservedPaths.add(targetPath);
    tasks.set(id, { controller, sender, tempPath, filePath: targetPath });
    safeSend(sender, 'download-progress', { id, received: 0, total: 0, started: true });

    try {
        const response = await net.fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
                ...(payload.headers || {})
            }
        });

        if (!response.ok || !response.body) {
            tasks.delete(id);
            reservedPaths.delete(targetPath);
            safeSend(sender, 'download-progress', { id, failed: true, error: `HTTP ${response.status}` });
            return { success: false, error: `HTTP ${response.status}` };
        }

        const contentLength = Number(response.headers.get('content-length')) || 0;
        let received = 0;
        let lastReport = 0;

        const progressTransform = new Transform({
            transform(chunk, encoding, callback) {
                received += chunk.length;
                const now = Date.now();
                if (now - lastReport > 120) {
                    lastReport = now;
                    safeSend(sender, 'download-progress', { id, received, total: contentLength });
                }
                callback(null, chunk);
            }
        });

        await pipeline(
            Readable.fromWeb(response.body),
            progressTransform,
            fs.createWriteStream(tempPath)
        );

        if (!received) throw new Error('EMPTY_RESPONSE');

        fs.renameSync(tempPath, targetPath);
        safeSend(sender, 'download-progress', {
            id,
            received,
            total: contentLength || received,
            completed: true
        });

        try {
            new Notification({
                title: 'MoeKoe Music',
                body: path.basename(targetPath)
            }).show();
        } catch (error) {
            log.warn('[download] 系统通知展示失败:', error);
        }

        tasks.delete(id);
        reservedPaths.delete(targetPath);
        return { success: true, filePath: targetPath, size: received };
    } catch (error) {
        const canceled = error?.name === 'AbortError' || controller.signal.aborted;
        removeQuietly(tempPath);
        tasks.delete(id);
        reservedPaths.delete(targetPath);
        if (!canceled) log.error('[download] 下载失败:', url, error);
        safeSend(sender, 'download-progress', {
            id,
            canceled,
            failed: !canceled,
            error: canceled ? 'CANCELED' : String(error?.message || error)
        });
        return {
            success: false,
            canceled,
            error: canceled ? 'CANCELED' : String(error?.message || error)
        };
    }
};

/**
 * 注册下载相关的 IPC 通道
 */
export const registerDownloadHandlers = () => {
    ipcMain.handle('download-song', startDownload);

    ipcMain.handle('download-cancel', (event, id) => {
        const task = tasks.get(id);
        if (!task) return { success: false };
        task.controller.abort();
        return { success: true };
    });

    ipcMain.handle('download-get-dir', () => ({
        directory: getDownloadDirectory()
    }));

    ipcMain.handle('download-choose-dir', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'MoeKoe Music',
            defaultPath: getDownloadDirectory(),
            properties: ['openDirectory', 'createDirectory']
        });

        if (canceled || !filePaths?.length) return { canceled: true };

        store.set(DOWNLOAD_DIR_KEY, filePaths[0]);
        return { canceled: false, directory: ensureDirectory(filePaths[0]) };
    });

    ipcMain.handle('download-open-dir', async () => {
        const dir = getDownloadDirectory();
        try {
            const error = await shell.openPath(dir);
            return { success: !error, error: error || undefined, directory: dir };
        } catch (error) {
            return { success: false, error: String(error?.message || error) };
        }
    });

    ipcMain.handle('download-show-item', (event, filePath) => {
        if (!filePath || !fs.existsSync(filePath)) return { success: false };
        shell.showItemInFolder(filePath);
        return { success: true };
    });
};

export { getDownloadDirectory };

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { app, ipcMain, protocol, shell } from 'electron';
import log from 'electron-log';
import { parseFile } from 'music-metadata';
import { getDownloadDirectory } from './downloadService.js';

/**
 * 本地音乐服务（主进程）
 * - 真·全盘扫描：直接遍历磁盘目录，不再受 File System Access API 的「必须手选目录」限制
 * - 元数据解析：按批解析，避免一次阻塞
 * - 自定义协议 moekoe-local:// ：把本地音频/封面以流的形式喂给渲染进程，支持 Range 拖动进度
 */

export const LOCAL_MEDIA_SCHEME = 'moekoe-local';

const AUDIO_EXTENSIONS = new Set([
    '.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma',
    '.ape', '.opus', '.aiff', '.aif', '.dsf', '.dff', '.mka'
]);

const MIME_BY_EXT = {
    '.mp3': 'audio/mpeg',
    '.flac': 'audio/flac',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.wma': 'audio/x-ms-wma',
    '.ape': 'audio/x-ape',
    '.opus': 'audio/ogg',
    '.aiff': 'audio/aiff',
    '.aif': 'audio/aiff',
    '.dsf': 'audio/dsd',
    '.dff': 'audio/dsd',
    '.mka': 'audio/x-matroska'
};

// 遍历时跳过的目录（系统目录 / 缓存 / 代码依赖，进去只会白跑）
const SKIP_DIR_NAMES = new Set([
    'windows', 'program files', 'program files (x86)', 'programdata', 'perflogs',
    '$recycle.bin', 'system volume information', 'recovery', 'msocache', 'config.msi',
    '$windows.~bt', '$windows.~ws', 'windows.old', 'node_modules', '.git', '.svn', '.hg',
    'appdata', 'application data', 'local settings', 'cache', 'caches', 'temp', 'tmp',
    '__pycache__', '.venv', 'venv', 'site-packages', 'packages', 'conda-meta',
    'moeKOE cache'.toLowerCase(), 'gpucache', 'code cache', 'service worker'
]);

const MAX_DEPTH = 16;

// 扫描取消标记
let scanToken = { canceled: false };

// 封面缓存，避免列表滚动时反复解析同一个文件
const coverCache = new Map();
const COVER_CACHE_LIMIT = 400;

const isAudioFile = (fileName) => AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase());

const hashPath = (filePath) => crypto.createHash('sha1').update(filePath).digest('hex').slice(0, 16);

const toWebStream = (nodeStream) => Readable.toWeb(nodeStream);

const normalizePathForCompare = (value) => {
    try {
        return path.resolve(value).toLowerCase();
    } catch {
        return String(value || '').toLowerCase();
    }
};

/**
 * 是否是可能存放音乐的磁盘根目录
 * Windows 下枚举 A-Z 盘符，其它平台直接扫用户目录与常见挂载点
 */
const listDrives = () => {
    if (process.platform === 'win32') {
        const drives = [];
        for (let code = 67; code <= 90; code += 1) { // 从 C: 开始，跳过 A/B 软驱
            const letter = String.fromCharCode(code);
            const root = `${letter}:\\`;
            try {
                if (fs.existsSync(root)) drives.push(root);
            } catch {
                /* 忽略无权限盘符 */
            }
        }
        return drives;
    }

    const candidates = ['/Volumes', '/media', '/mnt', '/run/media'];
    const roots = [];
    candidates.forEach((base) => {
        try {
            if (!fs.existsSync(base)) return;
            if (base === '/Volumes') {
                roots.push(base);
                return;
            }
            fs.readdirSync(base, { withFileTypes: true })
                .filter(entry => entry.isDirectory())
                .forEach(entry => roots.push(path.join(base, entry.name)));
        } catch {
            /* 忽略 */
        }
    });
    roots.push(app.getPath('music'), app.getPath('home'));
    return [...new Set(roots)];
};

/**
 * 递归遍历目录，收集音频文件
 * @param {string} dir
 * @param {object} options
 */
const walkDirectory = async (dir, options) => {
    const { files, onProgress, depth = 0, skipPaths = [] } = options;
    if (scanToken.canceled) return;
    if (depth > MAX_DEPTH) return;

    const normalized = normalizePathForCompare(dir);
    if (skipPaths.some(skip => normalized === skip || normalized.startsWith(`${skip}${path.sep}`))) return;

    let entries;
    try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
        // 无权限目录直接跳过（System Volume Information 之类）
        return;
    }

    const lrcNames = new Set();
    entries.forEach((entry) => {
        if (entry.isFile() && /\.lrc$/i.test(entry.name)) {
            lrcNames.add(entry.name.replace(/\.lrc$/i, '').toLowerCase());
        }
    });

    const subDirs = [];

    for (const entry of entries) {
        if (scanToken.canceled) return;

        if (entry.isFile()) {
            if (!isAudioFile(entry.name)) continue;
            const fullPath = path.join(dir, entry.name);
            let stat;
            try {
                stat = await fs.promises.stat(fullPath);
            } catch {
                continue;
            }

            const baseName = entry.name.replace(/\.[^.]+$/, '').toLowerCase();
            files.push({
                path: fullPath,
                name: entry.name,
                size: stat.size,
                lastModified: stat.mtimeMs,
                hash: `local_fs_${hashPath(fullPath)}`,
                lrcPath: lrcNames.has(baseName) ? path.join(dir, `${entry.name.replace(/\.[^.]+$/, '')}.lrc`) : ''
            });
            onProgress?.(files.length, fullPath);
            continue;
        }

        if (entry.isDirectory()) {
            if (SKIP_DIR_NAMES.has(entry.name.toLowerCase())) continue;
            if (entry.name.startsWith('.')) continue;
            subDirs.push(path.join(dir, entry.name));
        }
    }

    for (const subDir of subDirs) {
        if (scanToken.canceled) return;
        await walkDirectory(subDir, { ...options, depth: depth + 1 });
    }
};

/**
 * 扫描单个目录（下载目录等小范围场景）
 * @returns {Promise<Array>}
 */
export const scanDirectory = async (dir) => {
    const files = [];
    if (!dir) return files;
    const resolved = path.resolve(dir);
    let stat;
    try {
        stat = await fs.promises.stat(resolved);
    } catch {
        return files;
    }
    if (!stat.isDirectory()) return files;

    await walkDirectory(resolved, { files, skipPaths: [] });
    return files.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
};

/**
 * 批量解析元数据
 * @param {Array<string>} filePaths
 */
/**
 * 从 music-metadata 的 lyrics 字段里提取 LRC 文本
 * v11 起 common.lyrics 是对象数组（text / syncText），早期版本是字符串数组
 */
const extractLyricsText = (lyrics = []) => {
    const toLrcLine = (entry) => {
        if (typeof entry?.timestamp !== 'number') return entry?.text || '';
        const totalSeconds = entry.timestamp / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = (totalSeconds % 60).toFixed(2).padStart(5, '0');
        return `[${String(minutes).padStart(2, '0')}:${seconds}]${entry.text || ''}`;
    };

    for (const item of Array.isArray(lyrics) ? lyrics : []) {
        if (typeof item === 'string' && item.includes('[')) return item;
        if (typeof item?.text === 'string' && item.text.includes('[')) return item.text;
        if (Array.isArray(item?.syncText) && item.syncText.length > 0) {
            const joined = item.syncText.map(toLrcLine).join('\n');
            if (joined.includes('[')) return joined;
        }
    }
    return '';
};

export const readMetadataBatch = async (filePaths = []) => {
    const results = [];
    const queue = [...filePaths];
    const concurrency = 4;

    const worker = async () => {
        while (queue.length > 0) {
            const filePath = queue.shift();
            if (!filePath) continue;
            try {
                const metadata = await parseFile(filePath, {
                    duration: true,
                    skipCovers: true,
                    skipPostHeaders: true
                });
                const embedded = extractLyricsText(metadata.common.lyrics);
                results.push({
                    path: filePath,
                    title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
                    artist: metadata.common.artist || '',
                    album: metadata.common.album || '',
                    year: metadata.common.year || null,
                    genre: Array.isArray(metadata.common.genre) ? metadata.common.genre.join(', ') : '',
                    track: metadata.common.track?.no || null,
                    duration: metadata.format.duration || 0,
                    bitrate: metadata.format.bitrate || null,
                    sampleRate: metadata.format.sampleRate || null,
                    embeddedLyrics: embedded,
                    ok: true
                });
            } catch (error) {
                results.push({
                    path: filePath,
                    ok: false,
                    error: String(error?.message || error)
                });
            }
        }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length || 1) }, () => worker()));
    return results;
};

/* ---------------- 协议：moekoe-local:// ---------------- */

const decodePathParam = (request) => {
    try {
        const url = new URL(request.url);
        const encoded = url.searchParams.get('p') || '';
        return Buffer.from(encoded, 'base64url').toString('utf8');
    } catch {
        return '';
    }
};

const buildMediaResponse = async (request, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!AUDIO_EXTENSIONS.has(ext)) {
        return new Response('Unsupported media type', { status: 415 });
    }

    let stat;
    try {
        stat = await fs.promises.stat(filePath);
    } catch {
        return new Response('Not found', { status: 404 });
    }
    if (!stat.isFile()) return new Response('Not found', { status: 404 });

    const headers = {
        'Content-Type': MIME_BY_EXT[ext] || 'application/octet-stream',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
    };

    const range = request.headers.get('range');
    if (range) {
        const match = /bytes=(\d*)-(\d*)/.exec(range);
        if (match) {
            const start = match[1] ? Number(match[1]) : 0;
            const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
            if (Number.isNaN(start) || start > end) {
                return new Response('Range not satisfiable', {
                    status: 416,
                    headers: { 'Content-Range': `bytes */${stat.size}` }
                });
            }
            headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
            headers['Content-Length'] = String(end - start + 1);
            return new Response(toWebStream(fs.createReadStream(filePath, { start, end })), {
                status: 206,
                headers
            });
        }
    }

    headers['Content-Length'] = String(stat.size);
    return new Response(toWebStream(fs.createReadStream(filePath)), { status: 200, headers });
};

const readCoverBuffer = async (filePath) => {
    const cached = coverCache.get(filePath);
    if (cached !== undefined) return cached;

    let picture = null;
    try {
        const metadata = await parseFile(filePath, {
            duration: false,
            skipPostHeaders: true,
            includeChapters: false
        });
        picture = metadata.common.picture?.[0] || null;
    } catch (error) {
        log.warn('[local-media] 解析封面失败:', error?.message || error);
    }

    if (!picture) {
        // 负缓存：没有封面的歌不要每次渲染都重新解析
        if (coverCache.size >= COVER_CACHE_LIMIT) coverCache.delete(coverCache.keys().next().value);
        coverCache.set(filePath, null);
        return null;
    }

    const result = {
        buffer: Buffer.from(picture.data),
        mime: picture.format || 'image/jpeg'
    };

    if (coverCache.size >= COVER_CACHE_LIMIT) {
        const firstKey = coverCache.keys().next().value;
        coverCache.delete(firstKey);
    }
    coverCache.set(filePath, result);
    return result;
};

const buildCoverResponse = async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!AUDIO_EXTENSIONS.has(ext)) return new Response('Unsupported', { status: 415 });

    try {
        const cover = await readCoverBuffer(filePath);
        if (!cover) {
            return new Response('No cover', {
                status: 404,
                headers: {
                    'Cache-Control': 'public, max-age=3600',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        return new Response(cover.buffer, {
            status: 200,
            headers: {
                'Content-Type': cover.mime,
                'Content-Length': String(cover.buffer.length),
                'Cache-Control': 'public, max-age=604800',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        log.warn('[local-media] 读取封面失败:', error?.message || error);
        return new Response('Error', { status: 500 });
    }
};

/**
 * 注册自定义协议（必须在 app ready 之前调用 registerSchemesAsPrivileged）
 */
export const registerLocalMediaScheme = () => {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: LOCAL_MEDIA_SCHEME,
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true,
                stream: true,
                bypassCSP: true,
                // 播放器为了做响度分析会设置 crossOrigin，需要显式开启 CORS
                corsEnabled: true
            }
        }
    ]);
};

/**
 * 注册 IPC
 */
export const registerLocalMediaHandlers = () => {
    protocol.handle(LOCAL_MEDIA_SCHEME, async (request) => {
        try {
            const url = new URL(request.url);
            const kind = url.hostname;
            const filePath = decodePathParam(request);

            if (!filePath || !path.isAbsolute(filePath)) {
                return new Response('Bad request', { status: 400 });
            }

            if (kind === 'cover') return await buildCoverResponse(filePath);
            return await buildMediaResponse(request, filePath);
        } catch (error) {
            log.error('[local-media] protocol handle failed:', error);
            return new Response('Internal error', { status: 500 });
        }
    });

    ipcMain.handle('local-media:list-drives', () => listDrives());

    // 真·全盘扫描
    ipcMain.handle('local-media:scan-all', async (event, options = {}) => {
        scanToken = { canceled: false };
        const token = scanToken;
        const roots = options.roots?.length ? options.roots : listDrives();
        const skipPaths = [
            app.getPath('userData'),
            path.join(app.getPath('userData'), 'Cache'),
            ...(options.skipPaths || [])
        ].map(normalizePathForCompare);

        const files = [];
        let lastReport = 0;
        const sendProgress = (force = false) => {
            const now = Date.now();
            if (!force && now - lastReport < 200) return;
            lastReport = now;
            if (!event.sender.isDestroyed()) {
                event.sender.send('local-media:scan-progress', {
                    scanned: files.length,
                    root: options.currentRoot || '',
                    file: files[files.length - 1]?.path || ''
                });
            }
        };

        for (const root of roots) {
            if (token.canceled) break;
            options.currentRoot = root;
            await walkDirectory(root, {
                files,
                skipPaths,
                onProgress: () => sendProgress()
            });
        }

        sendProgress(true);
        const canceled = token.canceled;
        scanToken = { canceled: false };
        return { files, canceled };
    });

    ipcMain.handle('local-media:cancel-scan', () => {
        scanToken.canceled = true;
        return true;
    });

    ipcMain.handle('local-media:scan-dir', async (_event, dir) => {
        const target = dir || getDownloadDirectory();
        const files = await scanDirectory(target);
        return { files, directory: target };
    });

    ipcMain.handle('local-media:read-metadata', async (_event, filePaths = []) => {
        if (!Array.isArray(filePaths) || filePaths.length === 0) return [];
        return readMetadataBatch(filePaths.slice(0, 200));
    });

    ipcMain.handle('local-media:read-text', async (_event, filePath) => {
        if (!filePath) return '';
        try {
            const buffer = await fs.promises.readFile(filePath);
            try {
                return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
            } catch {
                return new TextDecoder('gbk').decode(buffer);
            }
        } catch (error) {
            log.warn('[local-media] 读取文本失败:', error?.message || error);
            return '';
        }
    });

    ipcMain.handle('local-media:get-download-dir', () => getDownloadDirectory());

    // 在资源管理器中定位歌曲文件
    ipcMain.handle('local-media:show-in-folder', async (_event, filePath) => {
        if (!filePath || typeof filePath !== 'string') return false;
        try {
            const resolved = path.resolve(filePath);
            const stat = await fs.promises.stat(resolved);
            if (!stat.isFile()) return false;
            shell.showItemInFolder(resolved);
            return true;
        } catch (error) {
            log.warn('[local-media] 打开歌曲所在目录失败:', error?.message || error);
            return false;
        }
    });

    // 计算音频文件 md5：用于向酷狗曲库做「音频识别」，拿到和在线播放完全一致的歌曲 hash
    ipcMain.handle('local-media:file-md5', async (_event, filePath) => {
        if (!filePath || typeof filePath !== 'string') return '';
        try {
            const stat = await fs.promises.stat(filePath);
            if (!stat.isFile()) return '';
            return await new Promise((resolve) => {
                const hash = crypto.createHash('md5');
                const stream = fs.createReadStream(filePath);
                stream.on('data', (chunk) => hash.update(chunk));
                stream.on('error', (error) => {
                    log.warn('[local-media] 计算文件 md5 失败:', error?.message || error);
                    resolve('');
                });
                stream.on('end', () => resolve(hash.digest('hex')));
            });
        } catch (error) {
            log.warn('[local-media] 计算文件 md5 失败:', error?.message || error);
            return '';
        }
    });

    ipcMain.handle('local-media:is-file-exists', async (_event, filePath) => {
        if (!filePath) return false;
        try {
            const stat = await fs.promises.stat(filePath);
            return stat.isFile();
        } catch {
            return false;
        }
    });
};

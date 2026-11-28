/**
 * 本地媒体工具（渲染进程）
 * 与主进程 localMediaService 配合，实现真·全盘扫描与 file 协议播放。
 */

const SCHEME = 'moekoe-local';

const isElectron = () => typeof window !== 'undefined' && !!window.electronAPI?.localMedia;

const encodePath = (filePath) => {
    if (typeof btoa !== 'function') return '';
    const bytes = new TextEncoder().encode(String(filePath || ''));
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

/** 音频流地址（支持 Range，可直接用于 <audio>） */
export const buildMediaUrl = (filePath) => (filePath ? `${SCHEME}://media/?p=${encodePath(filePath)}` : '');

/** 封面地址（主进程按需从音频文件里抽取封面） */
export const buildCoverUrl = (filePath) => (filePath ? `${SCHEME}://cover/?p=${encodePath(filePath)}` : '');

export const isLocalMediaSupported = () => isElectron();

/* ---------------- 扫描 ---------------- */

/**
 * 全盘扫描（主进程遍历所有磁盘）
 * @param {{ onProgress?: (payload: { scanned: number, root: string, file: string }) => void }} options
 */
export const scanAllDisks = async ({ onProgress } = {}) => {
    if (!isElectron()) throw new Error('当前环境不支持全盘扫描');

    const unsubscribe = onProgress ? window.electronAPI.localMedia.onScanProgress(onProgress) : null;
    try {
        const result = await window.electronAPI.localMedia.scanAll({});
        return {
            files: result?.files || [],
            canceled: Boolean(result?.canceled)
        };
    } finally {
        unsubscribe?.();
    }
};

export const cancelDiskScan = () => {
    if (!isElectron()) return Promise.resolve(false);
    return window.electronAPI.localMedia.cancelScan();
};

/**
 * 扫描指定目录（用于「下载歌单」）
 * @param {string} [dir] 为空时使用应用下载目录
 */
export const scanLocalDirectory = async (dir) => {
    if (!isElectron()) return { files: [], directory: '' };
    const result = await window.electronAPI.localMedia.scanDirectory(dir);
    return {
        files: result?.files || [],
        directory: result?.directory || dir || ''
    };
};

/**
 * 批量读取元数据
 * @param {Array<string>} filePaths
 */
export const readFsMetadata = async (filePaths = []) => {
    if (!isElectron() || filePaths.length === 0) return [];
    const result = await window.electronAPI.localMedia.readMetadata(filePaths);
    return Array.isArray(result) ? result : [];
};

/** 读取歌词等文本文件（自动处理 GBK） */
export const readLocalText = async (filePath) => {
    if (!filePath) return '';
    if (!isElectron()) return '';
    try {
        return await window.electronAPI.localMedia.readText(filePath);
    } catch {
        return '';
    }
};

export const getDownloadDirectory = async () => {
    if (!isElectron()) return '';
    try {
        return await window.electronAPI.localMedia.getDownloadDirectory();
    } catch {
        return '';
    }
};

export const isFileExists = async (filePath) => {
    if (!isElectron() || !filePath) return false;
    try {
        return await window.electronAPI.localMedia.isFileExists(filePath);
    } catch {
        return false;
    }
};

/**
 * 在系统文件管理器中定位歌曲
 * @param {string} filePath 歌曲的绝对路径
 * @returns {Promise<boolean>} 是否成功
 */
export const showInFolder = async (filePath) => {
    if (!isElectron() || !filePath) return false;
    const api = window.electronAPI.localMedia;
    if (typeof api.showInFolder !== 'function') return false;
    try {
        return Boolean(await api.showInFolder(filePath));
    } catch {
        return false;
    }
};

/** 计算本地音频的 md5（主进程流式读取），用于音频识别歌词 */
export const getFileMd5 = async (filePath) => {
    if (!isElectron() || !filePath) return '';
    const api = window.electronAPI?.localMedia;
    if (typeof api?.fileMd5 !== 'function') return '';
    try {
        return String(await api.fileMd5(filePath) || '');
    } catch {
        return '';
    }
};

/* ---------------- 数据转换 ---------------- */

const baseName = (filePath) => {
    const name = String(filePath || '').split(/[\\/]/).pop() || '';
    return name.replace(/\.[^.]+$/, '');
};

const extName = (name) => {
    const dot = String(name || '').lastIndexOf('.');
    return dot >= 0 ? String(name).slice(dot).toLowerCase() : '';
};

/**
 * 把主进程扫描到的文件转成页面使用的歌曲对象
 * @param {{ path: string, name: string, size: number, lastModified: number, hash: string, lrcPath?: string }} file
 * @param {object|null} metadata readFsMetadata 的结果
 * @param {string} folderId 归属（full-disk / downloads）
 */
export const createFsTrack = (file, metadata, folderId) => {
    const duration = Number(metadata?.duration) || 0;
    const name = file.name || baseName(file.path);
    return {
        cacheKey: `fs:${file.path}`,
        folderId,
        source: 'fs',
        filePath: file.path,
        relativePath: file.path,
        hash: file.hash || `local_fs_${Date.now()}`,
        name,
        displayName: metadata?.title || baseName(file.path),
        author: metadata?.artist || '未知',
        album: metadata?.album || '本地音乐',
        year: metadata?.year || null,
        genre: metadata?.genre || null,
        track: metadata?.track || null,
        size: file.size || 0,
        lastModified: file.lastModified || 0,
        duration,
        timelen: duration * 1000,
        bitrate: metadata?.bitrate || null,
        sampleRate: metadata?.sampleRate || null,
        lrcPath: file.lrcPath || '',
        embeddedLyrics: metadata?.embeddedLyrics || '',
        coverState: 'protocol',
        extension: extName(name)
    };
};

/**
 * 按批次解析元数据
 * @param {Array<object>} files 主进程返回的文件
 * @param {{ folderId: string, cached?: Map<string, object>, onProgress?: (done: number, total: number) => void, batchSize?: number }} options
 */
export const buildFsTracks = async (files = [], options = {}) => {
    const { folderId, cached = new Map(), onProgress, batchSize = 40 } = options;
    const tracks = [];
    const pending = [];

    files.forEach((file) => {
        const cachedTrack = cached.get(`fs:${file.path}`);
        const reusable = cachedTrack
            && cachedTrack.size === file.size
            && cachedTrack.lastModified === file.lastModified
            && cachedTrack.displayName;

        if (reusable) {
            tracks.push({
                ...cachedTrack,
                lrcPath: file.lrcPath || cachedTrack.lrcPath || ''
            });
            return;
        }
        pending.push(file);
    });

    onProgress?.(tracks.length, files.length);

    let done = tracks.length;
    for (let index = 0; index < pending.length; index += batchSize) {
        const batch = pending.slice(index, index + batchSize);
        let metas = [];
        try {
            metas = await readFsMetadata(batch.map(file => file.path));
        } catch (error) {
            console.warn('[localMedia] 解析元数据失败:', error);
        }
        const metaMap = new Map(metas.map(item => [item.path, item]));

        batch.forEach((file) => {
            tracks.push(createFsTrack(file, metaMap.get(file.path), folderId));
        });

        done += batch.length;
        onProgress?.(done, files.length);
    }

    return tracks;
};

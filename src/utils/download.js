import { get } from './request';
import i18n from './i18n';
import { MoeAuthStore } from '../stores/store';
import { useDownloadStore } from '../stores/download';

// 与播放逻辑保持一致的音质档位（从低到高）
const QUALITY_LEVELS = ['128', '320', 'flac', 'high', 'viper_atmos', 'viper_clear', 'viper_tape'];
const QUALITY_LABELS = {
    '128': '标准',
    '320': '高品',
    flac: 'FLAC',
    high: 'Hi-Res',
    viper_atmos: '全景声',
    viper_clear: '超清',
    viper_tape: '母带'
};

const t = (key, fallback = '') => {
    const result = i18n.global.t(key);
    return result === key ? fallback : result;
};

const normalizeQuality = (quality) => (QUALITY_LEVELS.includes(quality) ? quality : '128');

/**
 * 获取某首歌可下载的音质列表
 * @param {string} hash
 * @returns {Promise<Array<{ value: string, hash: string, label: string }>>}
 */
export const fetchDownloadQualityOptions = async (hash) => {
    const fallback = [{ value: '128', hash, label: QUALITY_LABELS['128'] }];
    if (!hash) return [];

    const MoeAuth = MoeAuthStore();
    // 未登录时与播放逻辑保持一致，只使用接口默认码率
    if (!MoeAuth.isAuthenticated) return fallback;

    try {
        const response = await get('/privilege/lite', { hash });
        const qualityMap = new Map();

        for (const item of response?.data || []) {
            for (const variant of [item, ...(item?.relate_goods || [])]) {
                if (!variant?.hash || variant?.level === 0 || !QUALITY_LEVELS.includes(variant?.quality)) continue;
                if (qualityMap.has(variant.quality)) continue;
                qualityMap.set(variant.quality, {
                    value: variant.quality,
                    hash: variant.hash,
                    label: QUALITY_LABELS[variant.quality] || variant.quality
                });
            }
        }

        const options = [...qualityMap.values()].sort((a, b) => QUALITY_LEVELS.indexOf(b.value) - QUALITY_LEVELS.indexOf(a.value));
        return options.length > 0 ? options : fallback;
    } catch (error) {
        console.warn('[download] 获取音质列表失败，使用默认音质:', error);
        return fallback;
    }
};

const requestSongUrl = async (hash, quality) => {
    const MoeAuth = MoeAuthStore();
    const isAuth = !!MoeAuth.isAuthenticated;
    const params = { hash };
    if (isAuth && quality) params.quality = quality;
    if (!isAuth) params.free_part = 1;

    const response = await get('/song/url', params);
    if (response?.status !== 1) return { response, url: '' };

    const url = Array.isArray(response.url) ? response.url[0] : response.url;
    // mp4 是 MV 片段，不作为音频下载
    if (!url || response.extName === 'mp4') return { response, url: '' };
    return { response, url };
};

/**
 * 按所选音质下载，失败时自动逐档降级
 * @param {string} hash
 * @param {{ value: string, hash: string, label: string } | null} option
 * @param {Array} options
 */
const resolveDownloadSource = async (hash, option, options = []) => {
    const candidates = [];
    const seen = new Set();
    const push = (item) => {
        const candidateHash = item?.hash || hash;
        const key = `${item?.value || ''}-${candidateHash}`;
        if (!candidateHash || seen.has(key)) return;
        seen.add(key);
        candidates.push({ value: item?.value || '', hash: candidateHash });
    };

    if (option?.value) push(option);
    if (option?.value) {
        const startIndex = QUALITY_LEVELS.indexOf(normalizeQuality(option.value));
        const optionHash = option?.hash || '';
        for (let index = startIndex; index >= 0; index -= 1) {
            const level = QUALITY_LEVELS[index];
            const matched = (options || []).find(item => item.value === level);
            if (matched) {
                push(matched);
            } else if (!optionHash || optionHash === hash) {
                // 没有拿到各音质的独立 hash 时（如批量下载），用原始 hash 逐档降级尝试
                push({ value: level, hash });
            }
        }
    }
    // 兜底：不带音质参数，请求当前账号可用的默认码率
    push({ value: '', hash });

    let lastResponse = null;
    for (const candidate of candidates) {
        try {
            const { response, url } = await requestSongUrl(candidate.hash, candidate.value);
            lastResponse = response;
            if (url) {
                return {
                    url,
                    ext: (response?.extName || 'mp3').toLowerCase(),
                    quality: candidate.value,
                    response
                };
            }
        } catch (error) {
            // 风控/登录失效需要中止，其它情况继续尝试下一档音质
            if (error?.response?.data?.error?.includes('验证') || error?.response?.data?.status == 2) throw error;
            console.warn('[download] 获取下载地址失败:', candidate, error);
        }
    }

    return { url: '', ext: '', quality: '', response: lastResponse };
};

const sanitizeFileNamePart = (value) => String(value || '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.\s]+$/, '');

/**
 * 生成「歌手 - 歌名.扩展名」形式的文件名
 */
export const buildDownloadFileName = (song = {}, ext = 'mp3') => {
    const title = sanitizeFileNamePart(song.name || song.OriSongName || '');
    const author = sanitizeFileNamePart(song.author || '');
    let base = title;
    if (title && author && !title.toLowerCase().includes(author.toLowerCase())) {
        base = `${author} - ${title}`;
    }
    if (!base) base = author || 'MoeKoe Music';

    const extension = String(ext || 'mp3').replace(/^\./, '') || 'mp3';
    return `${base.slice(0, 120)}.${extension}`;
};

/**
 * 执行单个下载任务（解析地址 -> 下载 -> 更新任务状态）
 * @param {object} task 下载任务
 * @param {{ value: string, hash?: string, label: string } | null} option 音质选项
 * @param {Array} options 可选音质列表，用于自动降级
 * @param {{ silent?: boolean }} config silent 为 true 时不弹出单曲提示（批量下载用）
 */
const runTask = async (task, option = null, options = [], config = {}) => {
    const store = useDownloadStore();
    const silent = !!config.silent;

    try {
        const source = await resolveDownloadSource(task.hash, option, options);
        if (!source.url) {
            store.updateTask(task.id, { status: 'error', error: 'NO_SOURCE' });
            if (!silent) window.$message?.error?.(t('gai-ge-qu-wu-fa-xia-zai', '该歌曲暂不支持下载'));
            return null;
        }

        const fileName = buildDownloadFileName({ name: task.name, author: task.author }, source.ext);
        store.updateTask(task.id, {
            fileName,
            qualityLabel: QUALITY_LABELS[source.quality] || option?.label || '',
            status: 'downloading'
        });

        if (window.electronAPI?.downloadSong) {
            const result = await window.electronAPI.downloadSong({
                id: task.id,
                url: source.url,
                fileName
            });

            if (result?.success) {
                store.updateTask(task.id, {
                    status: 'done',
                    filePath: result.filePath || '',
                    received: result.size || 0,
                    total: result.size || 0
                });
                if (!silent) window.$message?.success?.(t('xia-zai-wan-cheng', '下载完成'));
            } else if (result?.canceled) {
                store.updateTask(task.id, { status: 'canceled' });
            } else {
                store.updateTask(task.id, { status: 'error', error: result?.error || 'UNKNOWN' });
                if (!silent) window.$message?.error?.(t('xia-zai-shi-bai', '下载失败'));
            }
            return result;
        }

        // 浏览器/PWA 环境：交给浏览器处理
        const link = document.createElement('a');
        link.href = source.url;
        link.download = fileName;
        link.rel = 'noopener';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        link.remove();
        store.updateTask(task.id, { status: 'done', received: 0, total: 0 });
        return { success: true, browser: true };
    } catch (error) {
        console.error('[download] 下载失败:', error);
        store.updateTask(task.id, { status: 'error', error: String(error?.message || error) });
        if (!silent) window.$message?.error?.(t('xia-zai-shi-bai', '下载失败'));
        return null;
    }
};

/**
 * 下载一首歌曲
 * @param {{ hash: string, name?: string, author?: string, OriSongName?: string }} song
 * @param {{ value: string, hash: string, label: string } | null} option 音质选项
 * @param {Array} options 可选音质列表，用于自动降级
 */
export const downloadSong = async (song, option = null, options = []) => {
    const hash = song?.hash;
    if (!hash) {
        window.$message?.error?.(t('gai-ge-qu-wu-fa-xia-zai', '该歌曲暂不支持下载'));
        return null;
    }

    const store = useDownloadStore();
    const task = store.createTask({
        hash,
        name: song.name || song.OriSongName || '',
        author: song.author || '',
        quality: option?.value || '',
        qualityLabel: option?.label || ''
    });
    store.openPanel();
    store.updateTask(task.id, { status: 'downloading' });

    return runTask(task, option, options);
};

// 批量下载的并发数，太高容易触发接口风控
const BATCH_CONCURRENCY = 2;

/**
 * 批量下载（歌单 / 多选歌曲）
 * @param {Array<{ hash: string, name?: string, author?: string }>} songs
 * @param {{ value: string, label: string } | null} option 音质选项，为空时使用接口默认码率
 * @returns {Promise<number>} 加入队列的歌曲数
 */
export const downloadSongs = async (songs = [], option = null) => {
    const list = (Array.isArray(songs) ? songs : []).filter(song => song?.hash);
    if (list.length === 0) {
        window.$message?.error?.(t('gai-ge-qu-wu-fa-xia-zai', '该歌曲暂不支持下载'));
        return 0;
    }

    const store = useDownloadStore();
    store.openPanel();

    const queue = list.map(song => {
        const task = store.createTask({
            hash: song.hash,
            name: song.name || song.OriSongName || '',
            author: song.author || '',
            quality: option?.value || '',
            qualityLabel: option?.label || ''
        });
        store.updateTask(task.id, { status: 'pending' });
        return task;
    });

    window.$message?.success?.(t('yi-tian-jia-dao-xia-zai-dui-lie', { count: queue.length }));

    let cursor = 0;
    const worker = async () => {
        while (cursor < queue.length) {
            const task = queue[cursor];
            cursor += 1;
            const current = store.tasks.find(item => item.id === task.id);
            if (!current || current.status === 'canceled') continue;
            await runTask(task, option, [], { silent: true });
        }
    };

    const workerCount = Math.min(BATCH_CONCURRENCY, queue.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return queue.length;
};

/**
 * 读取设置里的偏好音质，作为批量下载的默认音质
 * @returns {{ value: string, label: string } | null}
 */
export const getSavedQualityOption = () => {
    try {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        const quality = normalizeQuality(settings?.quality);
        return { value: quality, label: QUALITY_LABELS[quality] || '' };
    } catch (error) {
        console.warn('[download] 读取音质设置失败:', error);
        return null;
    }
};

/**
 * 取消下载
 */
export const cancelDownload = async (taskId) => {
    if (!taskId) return;
    const api = window.electronAPI;
    if (api?.cancelDownload) {
        await api.cancelDownload(taskId);
    }
};

/**
 * 让播放器当前歌曲可直接下载时使用当前音质
 */
export const pickDownloadOption = (qualityOptions = [], resolvedQuality = '', playHash = '') => {
    if (!Array.isArray(qualityOptions) || qualityOptions.length === 0) return null;
    const matched = qualityOptions.find(option => option.value === resolvedQuality && option.hash === playHash);
    return matched || qualityOptions[0];
};

export { QUALITY_LABELS };

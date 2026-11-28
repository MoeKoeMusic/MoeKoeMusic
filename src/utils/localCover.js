/**
 * 本地歌曲封面
 * 顺序：音频内嵌封面（moekoe-local://cover） -> 在线匹配（歌名 + 歌手 + 时长） -> 占位图
 * 匹配结果落 IndexedDB（trackCovers），没找到也记一笔，避免每次都重新请求。
 */
import { findOnlineSong } from './localLyrics';
import { getStoredCover, getAllStoredCovers, saveStoredCover } from './localMusicDb';

/** 没有任何封面时用的占位图 */
export const PLACEHOLDER_COVER = './assets/images/cover-placeholder.svg';

/** 「没找到」的有效期，过期后再试一次（比如当时离线） */
const NEGATIVE_TTL = 7 * 24 * 60 * 60 * 1000;

const inflight = new Map();

export const coverCacheKey = (track) => track?.cacheKey
    || (track?.filePath ? `fs:${track.filePath}` : '')
    || (track?.hash ? `hash:${track.hash}` : '');

/** 在线封面地址是带 {size} 的模板，按需替换 */
export const sizeCover = (url, size = 480) => (url ? String(url).replace('{size}', String(size)) : '');

export const isPlaceholderCover = (url) => {
    const value = String(url || '');
    return value === PLACEHOLDER_COVER || value.endsWith('/assets/images/cover-placeholder.svg');
};

/** 播放器里的歌曲对象只保留了展示用字段，这里补齐匹配需要的信息 */
export const toCoverTrack = (song) => ({
    ...song,
    name: song?.fileName || song?.name || '',
    displayName: song?.displayName || song?.name || '',
    author: song?.author || '',
    duration: Number(song?.duration) || (Number(song?.timeLength) || 0) / 1000
});

/** 读取已缓存的封面记录：cacheKey -> { cacheKey, cover } */
export const loadKnownCovers = async () => {
    const map = new Map();
    try {
        (await getAllStoredCovers()).forEach(record => map.set(record.cacheKey, record));
    } catch (error) {
        console.warn('[localCover] 读取封面缓存失败:', error);
    }
    return map;
};

/** 「没找到」的记录是否已过期（过期后再试一次，比如当时是离线） */
export const isCoverRecordExpired = (record) => !record?.cover
    && (!record.updatedAt || Date.now() - record.updatedAt > NEGATIVE_TTL);

const isExpired = isCoverRecordExpired;

/**
 * 内嵌封面缺失时找一张可用的封面。
 * @param {object} track
 * @param {{ schedule?: (task: () => Promise<string>) => Promise<string> }} [options]
 *   schedule：把在线请求交给调用方排队（列表里一次要解析很多首，需要限流）
 * @returns {Promise<string>} 永远非空：在线封面地址（带 {size}，用 sizeCover 转换），找不到则是占位图
 */
export const resolveTrackCover = async (track, { schedule = task => task() } = {}) => {
    const key = coverCacheKey(track);
    if (!key) return PLACEHOLDER_COVER;
    if (inflight.has(key)) return inflight.get(key);

    const task = (async () => {
        try {
            const stored = await getStoredCover(key);
            if (stored && !isExpired(stored)) return stored.cover ? stored.cover : PLACEHOLDER_COVER;
        } catch (error) {
            console.warn('[localCover] 读取封面缓存失败:', error);
        }

        let cover = '';
        try {
            cover = await schedule(async () => (await findOnlineSong(toCoverTrack(track)))?.image || '');
        } catch (error) {
            console.warn('[localCover] 在线匹配封面失败:', error);
        }

        try {
            await saveStoredCover({ cacheKey: key, cover, updatedAt: Date.now() });
        } catch (error) {
            console.warn('[localCover] 保存封面缓存失败:', error);
        }
        return cover || PLACEHOLDER_COVER;
    })().finally(() => inflight.delete(key));

    inflight.set(key, task);
    return task;
};

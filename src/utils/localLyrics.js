import { parseBlob } from 'music-metadata';
import { get } from './request';
import { getStoredLyrics, saveStoredLyrics, getAllStoredLyrics } from './localMusicDb';
import { readLocalText, getFileMd5 } from './localMedia';

import { looksLikeLrc, extractEmbeddedLyrics } from './lrc';

export { looksLikeLrc, parseLrcToLyrics } from './lrc';

const UNKNOWN_ARTISTS = new Set(['', '未知', '未知艺术家', 'unknown', 'unknown artist', 'various artists', 'va']);

const isKnownArtist = (value) => {
    const artist = String(value || '').trim().toLowerCase();
    return Boolean(artist) && !UNKNOWN_ARTISTS.has(artist);
};

const stripExtension = (value) => String(value || '').replace(/\.[a-z0-9]{2,5}$/i, '');

/** 去掉序号、音质标记等噪声，只保留歌名主干 */
const normalizeName = (value) => {
    let name = stripExtension(value)
        // 开头的序号：01 / 01. / [01] / 1、
        .replace(/^\s*\[?\d{1,3}\]?\s*[-_.、．)]?\s+/, '')
        .replace(/^\s*\d{1,3}\s*[-_.、．)]\s*/, '')
        // 结尾的括号备注：HQ / 320k / 无损 / 官方版 ...
        .replace(/\s*[\[(（【][^[\](（【】)]{0,20}[\])）】]\s*$/g, '')
        // 结尾直接跟的音质标记：晴天 HQ / 稻香 320k
        .replace(/\s+(hi-?res|hq|sq|320k|192k|128k|flac|ape|wav|mp3|m4a|aac|无损|高清)\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();

    return name.replace(/\.(mp3|flac|wav|ape|m4a|aac|ogg|wma)$/i, '').trim();
};

/** 文件名常见写法："歌手 - 歌名" / "歌名 - 歌手" / "歌名_歌手" */
const splitNameAndArtist = (rawName) => {
    const name = normalizeName(rawName);
    const separators = [' - ', ' – ', ' — ', '-', '_', '·'];
    for (const separator of separators) {
        if (!name.includes(separator)) continue;
        const parts = name.split(separator).map(part => part.trim()).filter(Boolean);
        if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) {
            return { title: parts[1], artist: parts[0], reversed: true };
        }
    }
    return { title: name, artist: '', reversed: false };
};

const readHandleText = async (handle) => {
    if (!handle || typeof handle.getFile !== 'function') return '';
    try {
        const file = await handle.getFile();
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        // 常见中文歌词是 GBK，先按 UTF-8 严格解码，失败再退回 GBK
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        } catch {
            return new TextDecoder('gbk').decode(bytes);
        }
    } catch (error) {
        console.warn('[localLyrics] 读取歌词文件失败:', error);
        return '';
    }
};

/**
 * 推断歌曲的「歌名 / 歌手」组合。
 * 本地文件的标签经常是空的（歌手=未知），这时从文件名里拆 "歌手 - 歌名"。
 */
export const describeTrack = (track) => {
    const fileTitle = normalizeName(track?.name || '');
    const metaTitle = normalizeName(track?.displayName || '');
    const metaArtist = isKnownArtist(track?.author) ? String(track.author).trim() : '';
    const fromFile = splitNameAndArtist(track?.name || '');

    // 标签标题其实就是文件名（说明没有真正的标题标签），这时用文件名拆出来的歌名
    const titleLooksLikeFileName = !metaTitle
        || textKey(metaTitle) === textKey(fileTitle)
        || textKey(metaTitle) === textKey(stripExtension(track?.name || ''));

    let title = titleLooksLikeFileName && fromFile.reversed ? fromFile.title : (metaTitle || fileTitle);
    const artist = metaArtist || fromFile.artist;

    // 文件名到底是「歌手 - 歌名」还是「歌名 - 歌手」无法百分百确定，
    // 两个片段都当作可能的歌名，匹配时任意一个命中即可（再靠歌手/时长筛掉错的）
    const aliases = [title];
    if (fromFile.reversed) {
        if (fromFile.title) aliases.push(fromFile.title);
        if (fromFile.artist) aliases.push(fromFile.artist);
    }
    if (metaTitle) aliases.push(metaTitle);

    return {
        title: title || fileTitle || stripExtension(track?.name || ''),
        artist,
        aliases: [...new Set(aliases.filter(Boolean))],
        duration: Number(track?.duration) || 0
    };
};

/** 生成多个检索关键词，从精确到宽松逐个尝试 */
export const buildKeywords = ({ title, artist, aliases }) => {
    const list = [];
    const push = (value) => {
        const keyword = String(value || '').replace(/\s+/g, ' ').trim();
        if (keyword && !list.includes(keyword)) list.push(keyword);
    };

    if (title && artist) push(`${title} ${artist}`);
    if (title) push(title);
    if (title && artist) push(`${artist} ${title}`);

    // 文件名里拆出来的另一半也当歌名试一次（"歌手 - 歌名" 到底哪边是歌名并不确定）
    (Array.isArray(aliases) ? aliases : []).forEach((alias) => {
        if (textKey(alias) === textKey(title)) return;
        if (artist) push(`${alias} ${artist}`);
        push(alias);
    });

    return list.slice(0, 5);
};

const textKey = (value) => String(value || '')
    .toLowerCase()
    .replace(/[\s\-_·・.,，。、'"“”‘’()（）[\]【】!！?？~～/\\]/g, '');

const titleMatches = (candidateTitle, targetTitle) => {
    const candidate = textKey(candidateTitle);
    const target = textKey(targetTitle);
    if (!candidate || !target) return false;
    return candidate === target || candidate.includes(target) || target.includes(candidate);
};

/** 歌名任意一个别名命中就算命中 */
const matchesAnyTitle = (candidateName, info) => {
    const aliases = Array.isArray(info?.aliases) && info.aliases.length ? info.aliases : [info?.title];
    return aliases.some(alias => titleMatches(candidateName, alias));
};

const artistMatches = (candidateArtist, targetArtist) => {
    const target = textKey(targetArtist);
    if (!target) return false;
    const parts = String(candidateArtist || '')
        .split(/[、&,，/;；]|feat\.?|ft\.?/i)
        .map(textKey)
        .filter(Boolean);
    return parts.some(part => part && (part.includes(target) || target.includes(part)));
};

/**
 * 时长是否对得上（秒）。本地时长未知时不做限制。
 * 差太多说明是另一个版本（Live / 片段 / 伴奏），歌词时间轴对不上，宁可不用。
 */
const durationOk = (candidateSeconds, targetSeconds, tolerance = 15) => {
    if (!(candidateSeconds > 0) || !(targetSeconds > 0)) return true;
    return Math.abs(candidateSeconds - targetSeconds) <= tolerance;
};

/** 时长接近程度打分（秒） */
const durationScore = (candidateSeconds, targetSeconds) => {
    if (!(candidateSeconds > 0) || !(targetSeconds > 0)) return 0;
    const diff = Math.abs(candidateSeconds - targetSeconds);
    if (diff <= 3) return 55;
    if (diff <= 8) return 30;
    if (diff <= 20) return 5;
    return -35;
};

/** 歌曲搜索结果打分 */
const scoreSong = (song, info) => {
    let score = 0;
    if (matchesAnyTitle(song.name, info)) score += 60;
    if (artistMatches(song.singers, info.artist)) score += 40;
    score += durationScore(song.duration, info.duration);
    return score;
};

/**
 * 歌词候选是否可用：优先歌名命中；
 * 歌名在曲库里写法不一样（少了副标题、繁简差异等）时，允许「歌手一致 + 时长差 ≤5 秒」兜底
 */
const titleExactMatch = (candidateTitle, info) => {
    const candidate = textKey(candidateTitle);
    if (!candidate) return false;
    const aliases = Array.isArray(info?.aliases) && info.aliases.length ? info.aliases : [info?.title];
    return aliases.some(alias => textKey(alias) === candidate);
};

const acceptCandidate = (candidate, info) => {
    // 歌名完全一致，直接可用
    if (titleExactMatch(candidate?.song, info)) return true;

    const artistOk = Boolean(info.artist) && artistMatches(candidate?.singer, info.artist);

    // 歌名只是「包含」关系（如 歌名 (Live)、歌名 某某版），要求歌手也必须对上
    if (matchesAnyTitle(candidate?.song, info)) return artistOk || !info.artist;

    // 歌名写法不同：歌手一致 + 时长相差 ≤5 秒才接受
    if (!artistOk) return false;
    const candidateSeconds = (Number(candidate?.duration) || 0) / 1000;
    if (!(candidateSeconds > 0) || !(info.duration > 0)) return false;
    return Math.abs(candidateSeconds - info.duration) <= 5;
};

/** 歌词候选打分（duration 单位是毫秒） */
const scoreCandidate = (candidate, info) => {
    let score = 0;
    if (matchesAnyTitle(candidate?.song, info)) score += 60;
    if (artistMatches(candidate?.singer, info.artist)) score += 40;
    score += durationScore((Number(candidate?.duration) || 0) / 1000, info.duration);
    return score;
};

const requestJson = async (path, label, retry = 1) => {
    for (let attempt = 0; attempt <= retry; attempt++) {
        try {
            return await get(path);
        } catch (error) {
            if (attempt === retry) {
                console.warn(`[localLyrics] ${label}失败:`, error);
                return null;
            }
            // 风控/超时重试前稍等一下
            await new Promise(resolve => setTimeout(resolve, 320 + Math.random() * 280));
        }
    }
    return null;
};

const PLACEHOLDER_LYRIC = /纯音乐|请欣赏|暂无歌词|没有歌词|instrumental/i;

/** 纯音乐/占位歌词不算有效歌词 */
const isPlaceholderLyric = (content) => {
    const lines = String(content || '')
        .split(/\r?\n/)
        .filter(line => /\[\d{1,3}:\d{1,2}/.test(line));
    if (lines.length > 3) return false;
    return PLACEHOLDER_LYRIC.test(content);
};

const requestLyricContent = async (candidate) => {
    if (!candidate?.id || !candidate?.accesskey) return '';
    const response = await requestJson(
        `/lyric?id=${candidate.id}&accesskey=${candidate.accesskey}&fmt=lrc&decode=true`,
        '下载歌词'
    );
    const content = response?.decodeContent || '';
    if (!looksLikeLrc(content) || isPlaceholderLyric(content)) return '';
    return content;
};

/** 搜索歌曲，返回 { name, singers, hash, duration, image } 列表（image 是带 {size} 的封面模板）
 *  注意：应用内置接口按「模块名」路由，必须用 search 模块 + type=song；`/search/song` 只在独立 HTTP 服务上可用，内置接口会返回 Not Found
 */
const searchSongs = async (keyword) => {
    if (!keyword) return [];
    const response = await requestJson(`/search?type=song&dopicfull=1&keywords=${encodeURIComponent(keyword)}`, '搜索歌曲');
    const lists = response?.data?.lists || [];
    return lists.map(item => ({
        name: item.SongName || item.songname || '',
        singers: Array.isArray(item.Singers)
            ? item.Singers.map(singer => singer?.name).filter(Boolean).join('、')
            : (item.SingerName || ''),
        hash: item.FileHash || item.SQFileHash || item.HQFileHash || '',
        duration: Number(item.Duration) || 0,
        image: typeof item.Image === 'string' && item.Image.includes('{size}') ? item.Image : ''
    })).filter(song => song.hash);
};

/** 用歌曲 hash 精确取歌词（同一份音频对应的歌词，最准） */
const fetchLyricsByHash = async (hash, info = null) => {
    if (!hash) return '';
    const lyricSearch = await requestJson(`/search/lyric?hash=${hash}`, '按 hash 查歌词');
    const candidates = Array.isArray(lyricSearch?.candidates) ? lyricSearch.candidates : [];
    const usable = candidates.filter((candidate) => {
        if (!info) return true;
        return durationOk((Number(candidate?.duration) || 0) / 1000, info.duration);
    });

    for (const candidate of usable.slice(0, 3)) {
        const content = await requestLyricContent(candidate);
        if (content) return content;
    }
    return '';
};

/** 搜歌曲并按 歌名/歌手/时长 打分，只保留确实是这首歌的候选（从高到低） */
const pickSongs = async (keyword, info) => {
    const songs = await searchSongs(keyword);
    return songs
        .map(song => ({ song, score: scoreSong(song, info) }))
        .filter(item => item.score > 0
            && matchesAnyTitle(item.song.name, info)
            && durationOk(item.song.duration, info.duration))
        .sort((a, b) => b.score - a.score);
};

/**
 * 在曲库里找到本地歌曲对应的在线歌曲（歌词、封面共用）。
 * @returns {Promise<{ name, singers, hash, duration, image } | null>}
 */
export const findOnlineSong = async (track) => {
    const info = describeTrack(track);
    if (!info.title) return null;

    for (const keyword of buildKeywords(info)) {
        const best = (await pickSongs(keyword, info))[0];
        if (best) return best.song;
    }
    return null;
};

/** 第一优先级：歌名+歌手搜到具体歌曲 -> hash -> 歌词 */
const fetchLyricsBySongSearch = async (keyword, info) => {
    const scored = await pickSongs(keyword, info);
    if (!scored.length) return '';

    for (const item of scored.slice(0, 3)) {
        const content = await fetchLyricsByHash(item.song.hash, info);
        if (content) return content;
    }
    return '';
};

/** 第二优先级：直接问歌词库（关键词 + 时长） */
const fetchLyricsByKeyword = async (keyword, info) => {
    const params = [`keywords=${encodeURIComponent(keyword)}`];
    if (info.duration > 0) params.push(`duration=${Math.round(info.duration)}`);

    const response = await requestJson(`/search/lyric?${params.join('&')}`, '歌词搜索');
    const candidates = Array.isArray(response?.candidates) ? response.candidates : [];
    if (!candidates.length) return '';

    const scored = candidates
        .map(candidate => ({ candidate, score: scoreCandidate(candidate, info) }))
        .filter(item => acceptCandidate(item.candidate, info)
            && durationOk((Number(item.candidate?.duration) || 0) / 1000, info.duration))
        .sort((a, b) => b.score - a.score);

    for (const item of scored.slice(0, 3)) {
        const content = await requestLyricContent(item.candidate);
        if (content) return content;
    }
    return '';
};

/**
 * 最后兜底：用文件 md5 问酷狗曲库（音频识别）。
 * 对于下载自酷狗的文件能直接拿到曲库标准 hash，效果等同「在线听这首歌」。
 */
const fetchLyricsByAudioMatch = async (track) => {
    if (!track?.filePath) return '';

    const md5 = await getFileMd5(track.filePath);
    if (!md5) return '';

    const response = await requestJson(`/user/cloud/match?hash=${md5}`, '音频识别');
    const matches = Array.isArray(response?.match_list) && response.match_list.length
        ? response.match_list
        : [response?.match].filter(Boolean);

    for (const match of matches.slice(0, 3)) {
        const hash = match?.hash_std || match?.hash || match?.raw?.audio_info?.hash || '';
        if (!hash) continue;
        const content = await fetchLyricsByHash(String(hash).toUpperCase());
        if (content) return content;
    }

    return '';
};

/**
 * 按「歌名 + 歌手」在线找歌词（LRC）
 * 1. 先用「歌名 歌手」搜到对应歌曲，用 hash 精确拿歌词
 * 2. 再用歌词库关键词检索兜底（带时长校验，避免同名不同曲）
 */
export const fetchOnlineLyrics = async (track) => {
    const info = describeTrack(track);
    if (!info.title) return '';

    const keywords = buildKeywords(info);

    for (const keyword of keywords) {
        const content = await fetchLyricsBySongSearch(keyword, info);
        if (content) return content;
    }

    for (const keyword of keywords) {
        const content = await fetchLyricsByKeyword(keyword, info);
        if (content) return content;
    }

    // 歌名/歌手都对不上时，再用音频指纹问一次曲库
    return await fetchLyricsByAudioMatch(track);
};

/**
 * 依次尝试：同目录同名 .lrc -> 内嵌歌词 -> 在线匹配
 * @returns {Promise<{ source: string, content: string, label: string } | null>}
 */
export const matchTrackLyrics = async (track) => {
    if (track?.lrcPath) {
        const content = await readLocalText(track.lrcPath);
        if (looksLikeLrc(content)) {
            return { source: 'lrc-file', label: '同名歌词', content };
        }
    }

    if (track?.lrcHandle) {
        const content = await readHandleText(track.lrcHandle);
        if (looksLikeLrc(content)) {
            return { source: 'lrc-file', label: '同名歌词', content };
        }
    }

    if (looksLikeLrc(track?.embeddedLyrics)) {
        return { source: 'embedded', label: '内嵌歌词', content: track.embeddedLyrics };
    }

    // 兜底再解析一次文件，防止缓存是旧版本写下的（没有 embeddedLyrics 字段）
    if (!track?.embeddedLyrics && track?.handle) {
        try {
            const file = await track.handle.getFile();
            const metadata = await parseBlob(file);
            const embedded = extractEmbeddedLyrics(metadata.common.lyrics);
            if (looksLikeLrc(embedded)) {
                return { source: 'embedded', label: '内嵌歌词', content: embedded };
            }
        } catch (error) {
            console.warn('[localLyrics] 解析内嵌歌词失败:', error);
        }
    }

    const online = await fetchOnlineLyrics(track);
    if (online) {
        return { source: 'online', label: '在线匹配', content: online };
    }

    return null;
};

/**
 * 匹配并写入缓存
 * @returns {Promise<object | null>} 写入的歌词记录
 */
export const matchAndStoreLyrics = async (track) => {
    const result = await matchTrackLyrics(track);
    if (!result) return null;

    const record = {
        hash: track.hash || `local_${track.cacheKey}`,
        cacheKey: track.cacheKey,
        name: track.displayName || track.name || '',
        author: track.author || '',
        source: result.source,
        sourceLabel: result.label,
        content: result.content,
        updatedAt: Date.now()
    };

    try {
        await saveStoredLyrics(record);
    } catch (error) {
        console.error('[localLyrics] 保存歌词失败:', error);
    }

    return record;
};

export { getStoredLyrics };

/**
 * 批量读取已有歌词，用于列表展示状态
 * @param {Array<{ hash: string, cacheKey: string }>} tracks
 * @returns {Promise<Map<string, object>>} cacheKey -> 歌词记录
 */
export const getLyricsStatusMap = async (tracks = []) => {
    const map = new Map();
    if (!tracks.length) return map;

    const wanted = new Set(tracks.map(track => track.cacheKey));
    const hashToCacheKey = new Map();
    tracks.forEach((track) => {
        if (track.hash) hashToCacheKey.set(track.hash, track.cacheKey);
    });

    const records = await getAllStoredLyrics();

    records.forEach((record) => {
        if (wanted.has(record.cacheKey)) {
            map.set(record.cacheKey, record);
            return;
        }
        // 播放时自动匹配写入的记录只带了 hash，这里按 hash 反查回列表
        const cacheKey = record.hash ? hashToCacheKey.get(record.hash) : '';
        if (cacheKey) map.set(cacheKey, record);
    });

    return map;
};

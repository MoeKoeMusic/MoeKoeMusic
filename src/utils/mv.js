import { get } from './request';

// 歌曲 hash -> MV 查询结果缓存（含"未找到"的负缓存），避免重复请求
const mvLookupCache = new Map();

const normalizeText = (value) => String(value || '').replace(/\s+/g, '').toLowerCase();

// 歌名可能带"歌手-歌名"前缀或"（MV）"等装饰，拆成用于匹配的片段
const splitSongName = (name) =>
    String(name || '')
        .split(/[-–—|/]/)
        .map(normalizeText)
        .filter(part => part.length >= 2);

// 返回命中的最长歌名片段长度，0 表示歌名没对上
const matchTitleLength = (mvName, songName, artistName) => {
    const artist = normalizeText(artistName);
    const allParts = splitSongName(songName);
    // 优先排除歌手名片段，避免误匹配同一歌手的其他 MV
    const parts = allParts.filter(part => part !== artist);
    const candidates = parts.length > 0 ? parts : allParts;

    return candidates.reduce((maxLength, part) => {
        if (!mvName.includes(part) && !(mvName.length > 0 && part.includes(mvName))) return maxLength;
        return Math.max(maxLength, part.length);
    }, 0);
};

// 计算 MV 与歌曲的匹配度
const scoreMvCandidate = (mv, songName, artistName) => {
    const mvName = normalizeText(mv.MvName);
    const titleLength = matchTitleLength(mvName, songName, artistName);

    const artist = normalizeText(artistName);
    const singerName = normalizeText(mv.SingerName);
    const artistMatched = !!artist && !!singerName && (singerName.includes(artist) || artist.includes(singerName));

    return {
        titleLength,
        artistMatched,
        score: titleLength + (artistMatched ? 2 : 0)
    };
};

// 通过搜索匹配歌曲对应的 MV，匹配不到时返回 null
export const searchSongMv = async (name, artistName, hash) => {
    const cacheKey = hash || `${normalizeText(artistName)}|${normalizeText(name)}`;
    if (mvLookupCache.has(cacheKey)) return mvLookupCache.get(cacheKey);

    const response = await get('/search', {
        keywords: [artistName, name].filter(Boolean).join(' '),
        type: 'mv',
        page: 1,
        pagesize: 20
    });

    const candidates = (response?.data?.lists || [])
        .filter(mv => !!mv?.MvHash)
        .map(mv => ({ mv, ...scoreMvCandidate(mv, name, artistName) }))
        .filter(item => item.titleLength > 0)
        .sort((a, b) => b.score - a.score);

    const result = candidates.length
        ? { hash: candidates[0].mv.MvHash, title: candidates[0].mv.MvName || '', source: 'search' }
        : null;

    mvLookupCache.set(cacheKey, result);
    return result;
};

// 优先使用歌曲自带的 mvhash，否则回退到搜索匹配
export const resolveSongMv = async (song) => {
    if (!song) return null;

    if (song.mvhash) {
        return {
            hash: song.mvhash,
            title: [song.name, song.author].filter(Boolean).join(' - '),
            source: 'song'
        };
    }

    if (!song.hash && !song.name) return null;
    return searchSongMv(song.name, song.author, song.hash);
};

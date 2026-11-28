/**
 * 纯 LRC 解析工具（不依赖 music-metadata，播放器可以直接用）
 */

// 逐行时间标签：[mm:ss]、[mm:ss.xx]、[mm:ss:xx]
const LRC_TIME_TAG_SOURCE = '\\[(\\d{1,3}):(\\d{1,2})(?:[.:](\\d{1,3}))?\\]';
const LRC_META_TAG = /^\[(ar|ti|al|by|offset|re|ve|length|kana|language|hash|total):/i;

export const looksLikeLrc = (text) => {
    if (typeof text !== 'string' || !text.trim()) return false;
    if (!new RegExp(LRC_TIME_TAG_SOURCE).test(text)) return false;
    // 排除 KRC 那种 [start,duration] 格式
    if (/^\[\d+,\d+\]/m.test(text)) return false;
    return true;
};

/**
 * 从 music-metadata 的 common.lyrics 里提取 LRC 文本
 * v11 起为对象数组（text / syncText），旧版本为字符串数组
 * @param {Array} lyrics
 * @returns {string}
 */
export const extractEmbeddedLyrics = (lyrics) => {
    const list = Array.isArray(lyrics) ? lyrics : [];

    const toLrcLine = (entry) => {
        if (typeof entry?.timestamp !== 'number') return entry?.text || '';
        const totalSeconds = entry.timestamp / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = (totalSeconds % 60).toFixed(2).padStart(5, '0');
        return `[${String(minutes).padStart(2, '0')}:${seconds}]${entry.text || ''}`;
    };

    for (const item of list) {
        if (typeof item === 'string' && looksLikeLrc(item)) return item;
        if (typeof item?.text === 'string' && looksLikeLrc(item.text)) return item.text;
        if (Array.isArray(item?.syncText) && item.syncText.length > 0) {
            const joined = item.syncText.map(toLrcLine).join('\n');
            if (looksLikeLrc(joined)) return joined;
        }
    }
    return '';
};

/**
 * LRC 文本 -> 播放器歌词行结构
 * 与 LyricsHandler 内部结构保持一致：{ characters: [{ char, startTime, endTime, highlighted }] }
 * @param {string} lrc LRC 文本
 * @returns {Array}
 */
export const parseLrcToLyrics = (lrc) => {
    if (!looksLikeLrc(lrc)) return [];

    const tagRegex = new RegExp(LRC_TIME_TAG_SOURCE, 'g');
    const entries = [];

    lrc.split(/\r?\n/).forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line || LRC_META_TAG.test(line)) return;

        const timeTags = [...line.matchAll(new RegExp(LRC_TIME_TAG_SOURCE, 'g'))];
        if (timeTags.length === 0) return;

        const text = line.replace(tagRegex, '').trim();
        if (!text) return;

        timeTags.forEach((match) => {
            const minutes = Number(match[1]);
            const seconds = Number(match[2]);
            const fraction = match[3] ? Number(`0.${match[3]}`) : 0;
            entries.push({ time: (minutes * 60 + seconds + fraction) * 1000, text });
        });
    });

    entries.sort((a, b) => a.time - b.time);

    const lines = [];
    entries.forEach((entry, index) => {
        const next = entries[index + 1];
        const start = entry.time;
        const end = next ? Math.max(next.time, start + 500) : start + 8000;
        const chars = [...entry.text];
        if (chars.length === 0) return;

        const step = Math.max(end - start, 300) / chars.length;
        lines.push({
            characters: chars.map((char, charIndex) => ({
                char,
                startTime: Math.round(start + charIndex * step),
                endTime: Math.round(start + (charIndex + 1) * step),
                highlighted: false
            }))
        });
    });

    return lines;
};

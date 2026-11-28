import { ref, nextTick } from 'vue';
import { get } from '../../utils/request';
import { parseLrcToLyrics } from '../../utils/lrc';

export default function useLyricsHandler(t) {
    const lyricsData = ref([]);
    const originalLyrics = ref('');
    const showLyrics = ref(false);
    const scrollAmount = ref(null);
    const SongTips = ref(t('zan-wu-ge-ci'));
    const lyricsMode = ref('translation'); // 'translation' 翻译模式 或 'romanization' 音译模式
    let currentLineIndex = -1;
    let activeLyricsRequestId = 0;
    // 歌词行放大有 0.42s 的 font-size 过渡，布局在这期间还在变，需要延后校正滚动位置
    let scrollSyncTimer = null;
    const SCROLL_SYNC_DELAY = 480;
    const isLocalHash = (hash) => String(hash || '').startsWith('local_');

    // 显示/隐藏歌词
    const toggleLyrics = (hash, currentTime) => {
        showLyrics.value = !showLyrics.value;
        if (isLocalHash(hash)) {
            // 本地歌曲：如果已经通过「一键匹配歌词」拿到歌词，就直接滚动到当前行
            if (lyricsData.value.length > 0) {
                nextTick(() => {
                    const lineIndex = getCurrentLineIndex(currentTime);
                    if (lineIndex !== -1) scrollToCurrentLine(lineIndex);
                    else centerFirstLine();
                });
            } else {
                SongTips.value = t('zan-wu-ge-ci');
            }
            return showLyrics.value;
        }

        SongTips.value = t('huo-qu-ge-ci-zhong');
        // 如果显示歌词，滚动到当前播放行
        if (!lyricsData.value.length && hash) getLyrics(hash);
        else if (showLyrics.value) {
            nextTick(() => {
                // 从全局 audio 对象获取当前播放时间
                const currentLineIndex = getCurrentLineIndex(currentTime);
                if (currentLineIndex !== -1) scrollToCurrentLine(currentLineIndex);
                else centerFirstLine();
            });
        }
        
        return showLyrics.value;
    };

    // 获取歌词
    const getLyrics = async (hash) => {
        if (isLocalHash(hash)) {
            SongTips.value = t('zan-wu-ge-ci');
            return false;
        }

        const requestId = ++activeLyricsRequestId;
        try {
            const settings = JSON.parse(localStorage.getItem('settings') || '{}');
            if (!showLyrics.value &&
                (settings?.desktopLyrics !== 'on' && settings?.apiMode !== 'on' && settings?.statusBarLyrics !== 'on' && settings?.touchBar !== 'on')) {
                return;
            }

            console.log('[LyricsHandler] 请求歌词……');
            const lyricSearchResponse = await get(`/search/lyric?hash=${hash}`);
            if (requestId !== activeLyricsRequestId) {
                return false;
            }
            if (lyricSearchResponse.status !== 200 || lyricSearchResponse.candidates.length === 0) {
                SongTips.value = t('zan-wu-ge-ci');
                return false;
            }

            // 明确指定使用KRC格式
            const lyricResponse = await get(`/lyric?id=${lyricSearchResponse.candidates[0].id}&accesskey=${lyricSearchResponse.candidates[0].accesskey}&fmt=krc&decode=true`);
            if (requestId !== activeLyricsRequestId) {
                return false;
            }
            if (lyricResponse.status !== 200) {
                SongTips.value = t('huo-qu-ge-ci-shi-bai');
                return false;
            }
            parseLyrics(lyricResponse.decodeContent, settings?.lyricsTranslation !== 'off');
            originalLyrics.value = lyricResponse.decodeContent;
            resetLyricsScrollAnchor();
            centerFirstLine();
            return true;
        } catch (error) {
            SongTips.value = t('huo-qu-ge-ci-shi-bai');
        }
    };

    // 本地歌曲：直接套用已匹配到的 LRC 歌词，不走在线接口
    const setLocalLyrics = (lrcText) => {
        const parsed = parseLrcToLyrics(lrcText);
        if (parsed.length === 0) return false;

        lyricsData.value = parsed;
        originalLyrics.value = lrcText;
        SongTips.value = '';
        resetLyricsScrollAnchor();
        centerFirstLine();
        return true;
    };

    // 解析歌词
    const parseLyrics = (text, parseTranslation = true) => {
        let translationLyrics = [];
        let romanizationLyrics = [];
        const lines = text.split(/\r?\n/);
        try {
            const languageLine = lines.find(line => line.match(/\[language:(.*)\]/));
            if (parseTranslation && languageLine) {
                const languageCode = languageLine.match(/\[language:([^\]]*)\]/)?.[1];
                if (languageCode) {
                    try {
                        // 确保 languageCode 是有效的 Base64 编码
                        // 替换可能导致 Base64 解码失败的字符
                        const cleanedCode = languageCode.replace(/[^A-Za-z0-9+/=]/g, '');
                        // 添加缺失的填充字符
                        const paddedCode = cleanedCode.padEnd(cleanedCode.length + (4 - cleanedCode.length % 4) % 4, '=');
                        const decodedData = new TextDecoder().decode(
                            Uint8Array.from(atob(paddedCode), char => char.charCodeAt(0))
                        );
                        const languageData = JSON.parse(decodedData);

                        // 获取翻译歌词 (type === 1)
                        const translation = languageData?.content?.find(section => section.type === 1);
                        if (translation?.lyricContent) {
                            translationLyrics = translation.lyricContent;
                        }
                        
                        // 获取音译歌词 (type === 0)
                        const romanization = languageData?.content?.find(section => section.type === 0);
                        if (romanization?.lyricContent) {
                            romanizationLyrics = romanization.lyricContent;
                        }
                    } catch (decodeError) {
                        console.warn('[LyricsHandler] Base64 解码失败:', decodeError);
                    }
                }
            }
        } catch (error) {
            console.warn('[LyricsHandler] 解析翻译歌词失败！');
        }

        const parsedLyrics = [];
        const charRegex = /<(\d+),(\d+),\d+>([^<]+)/g;

        lines.forEach(line => {
            // 匹配主时间标签 [start,duration]
            const lineMatch = line.match(/^\[(\d+),(\d+)\](.*)/);
            if (!lineMatch) return;

            const start = parseInt(lineMatch[1]);
            const lyricContent = lineMatch[3];
            const characters = [];
            
            // 解析字符级时间标签 <start,duration,unknown>text
            let charMatch;

            while ((charMatch = charRegex.exec(lyricContent)) !== null) {
                const text = charMatch[3];
                const charDuration = parseInt(charMatch[2]);
                const charStart = start + parseInt(charMatch[1]);
                
                // 直接使用文本组，不拆分
                characters.push({
                    char: text,
                    startTime: charStart,
                    endTime: charStart + charDuration,
                    highlighted: false
                });
            }

            // 如果没有找到字符级时间标签，使用行级时间标签进行等分
            if (characters.length === 0) {
                const duration = parseInt(lineMatch[2]);
                const lyric = lyricContent.replace(/<.*?>/g, '');
                if (lyric.trim()) {
                    for (let index = 0; index < lyric.length; index++) {
                        characters.push({
                            char: lyric[index],
                            startTime: start + (index * duration) / lyric.length,
                            endTime: start + ((index + 1) * duration) / lyric.length,
                            highlighted: false
                        });
                    }
                }
            }

            // 保存有效歌词行
            if (characters.length > 0) {
                parsedLyrics.push({ characters });
            }
        });

        // 添加翻译歌词
        if (translationLyrics.length) {
            parsedLyrics.forEach((line, index) => {
                if (translationLyrics[index] && translationLyrics[index][0]) {
                    line.translated = translationLyrics[index][0];
                }
            });
        }

        // 添加音译歌词
        if (romanizationLyrics.length) {
            parsedLyrics.forEach((line, index) => {
                if (romanizationLyrics[index]) {
                    // 将音译歌词数组合并为一个字符串
                    line.romanized = romanizationLyrics[index].join('');
                }
            });
        }

        lyricsData.value = parsedLyrics;
        resetLyricsScrollAnchor();
    };

    // 切换歌词显示模式（翻译/音译）
    const toggleLyricsMode = () => {
        lyricsMode.value = lyricsMode.value === 'translation' ? 'romanization' : 'translation';
        return lyricsMode.value;
    };

    /** 逐级累加 offsetTop，得到元素相对某个祖先（或文档）的偏移 */
    const getOffsetTopWithin = (element, root) => {
        let top = 0;
        let node = element;
        while (node && node !== root) {
            top += node.offsetTop || 0;
            const parent = node.offsetParent;
            if (!parent) break;
            node = parent;
        }
        return top;
    };

    /**
     * 计算把某一行居中需要的 translateY。
     * 不再用固定 -32px 的经验值：容器有 padding、行高会随字号过渡变化，
     * 统一按「行相对容器的偏移」来计算，避免歌词整体偏上/偏下。
     */
    const measureLineScroll = (lineIndex) => {
        const lyricsContainer = document.getElementById('lyrics-container');
        const lyricsElement = document.getElementById('lyrics');
        if (!lyricsContainer || !lyricsElement) return null;

        const lineElement = document.querySelectorAll('#lyrics .line-group')[lineIndex];
        if (!lineElement) return null;

        // 歌词面板还没展开（高度为 0）时算出来的值一定是错的，交给调用方稍后重试
        if (!lyricsContainer.clientHeight || !lineElement.offsetHeight) return null;

        const lineTop = getOffsetTopWithin(lineElement, lyricsContainer);
        const lyricsTop = getOffsetTopWithin(lyricsElement, lyricsContainer);

        return lyricsContainer.clientHeight / 2 - lyricsTop - (lineTop - lyricsTop) - lineElement.offsetHeight / 2;
    };

    // 居中显示第一行歌词
    const centerFirstLine = () => {
        currentLineIndex = -1;
        nextTick(() => {
            const amount = measureLineScroll(0);
            if (amount === null) return;
            scrollAmount.value = amount;
        });
    };

    // 歌词被替换（切歌/重新匹配）后重置滚动锚点，否则同一行索引会被判成「没变化」而不滚动
    const resetLyricsScrollAnchor = () => {
        currentLineIndex = -1;
        if (scrollSyncTimer) {
            clearTimeout(scrollSyncTimer);
            scrollSyncTimer = null;
        }
    };

    // 滚动到当前歌词行
    const scrollToCurrentLine = (lineIndex, options = {}) => {
        const { force = false, attempt = 0 } = options;
        const index = Number(lineIndex);
        if (!Number.isFinite(index) || index < 0) return;
        if (!force && attempt === 0 && currentLineIndex === index) return;

        if (attempt === 0) currentLineIndex = index;

        // 当前行用 font-size 放大会改变各行高度，须等 DOM 应用放大后再测量
        nextTick(() => {
            const amount = measureLineScroll(index);
            if (amount === null) {
                // 面板还在展开动画里，稍后重试（最多 6 次）
                if (attempt < 6) {
                    if (scrollSyncTimer) clearTimeout(scrollSyncTimer);
                    scrollSyncTimer = setTimeout(() => {
                        scrollSyncTimer = null;
                        scrollToCurrentLine(index, { force: true, attempt: attempt + 1 });
                    }, 180);
                } else if (currentLineIndex === index) {
                    currentLineIndex = -1;
                }
                return;
            }

            scrollAmount.value = amount;

            // 字号过渡结束后行高才稳定，再校正一次，否则会「越滚越偏」
            if (scrollSyncTimer) clearTimeout(scrollSyncTimer);
            scrollSyncTimer = setTimeout(() => {
                scrollSyncTimer = null;
                if (currentLineIndex !== index) return;
                const corrected = measureLineScroll(index);
                if (corrected !== null) scrollAmount.value = corrected;
            }, SCROLL_SYNC_DELAY);
        });
    };

    // 高亮当前字符
    const highlightCurrentChar = (currentTime, scroll = true) => {
        const currentTimeMs = currentTime * 1000;
        let currentActiveLineIndex = -1;
        
        lyricsData.value.forEach((lineData, lineIndex) => {
            let isLineActive = false;
            let hasHighlightedChar = false;
            
            lineData.characters.forEach((charData) => {
                // 更精确的时间判断
                if (currentTimeMs >= charData.startTime && currentTimeMs <= charData.endTime) {
                    if (!charData.highlighted) {
                        charData.highlighted = true;
                        hasHighlightedChar = true;
                    }
                    isLineActive = true;
                } else if (currentTimeMs > charData.endTime) {
                    // 已经播放过的字符保持高亮
                    if (!charData.highlighted) {
                        charData.highlighted = true;
                    }
                } else {
                    // 还未播放的字符取消高亮
                    charData.highlighted = false;
                }
            });

            // 如果当前行有活跃字符，记录为当前行
            if (isLineActive) {
                currentActiveLineIndex = lineIndex;
            }

            // 处理滚动
            if (scroll && hasHighlightedChar) {
                scrollToCurrentLine(lineIndex);
            }
        });
        
        // 如果没有找到活跃行，尝试找到最接近的行
        if (currentActiveLineIndex === -1 && lyricsData.value.length > 0) {
            for (let i = 0; i < lyricsData.value.length; i++) {
                const lineData = lyricsData.value[i];
                const firstChar = lineData.characters[0];
                const lastChar = lineData.characters[lineData.characters.length - 1];
                
                if (firstChar && lastChar && 
                    currentTimeMs >= firstChar.startTime && 
                    currentTimeMs <= lastChar.endTime) {
                    currentActiveLineIndex = i;
                    break;
                }
            }
        }
    };

    // 重置歌词高亮状态
    const resetLyricsHighlight = (currentTime) => {
        if (!lyricsData.value) return;

        const currentTimeMs = currentTime * 1000;
        let currentActiveLineIndex = -1;

        lyricsData.value.forEach((lineData, lineIndex) => {
            let isCurrentLine = false;
            
            lineData.characters.forEach(charData => {
                // 更精确的时间判断
                if (currentTimeMs >= charData.startTime && currentTimeMs <= charData.endTime) {
                    charData.highlighted = true;
                    isCurrentLine = true;
                } else if (currentTimeMs > charData.endTime) {
                    // 已经播放过的字符保持高亮
                    charData.highlighted = true;
                } else {
                    // 还未播放的字符取消高亮
                    charData.highlighted = false;
                }
            });

            if (isCurrentLine) {
                currentActiveLineIndex = lineIndex;
                scrollToCurrentLine(lineIndex);
            }
        });
    };

    // 获取当前播放行索引
    const getCurrentLineIndex = (currentTime) => {
        if (!lyricsData.value || lyricsData.value.length === 0) return -1;

        const currentTimeMs = (Number(currentTime) || 0) * 1000;
        let index = -1;

        for (let i = 0; i < lyricsData.value.length; i++) {
            const firstChar = lyricsData.value[i]?.characters?.[0];
            if (!firstChar) continue;
            if (currentTimeMs >= firstChar.startTime) index = i;
            else break;
        }

        // 还没唱到第一行时定位到第一行；唱完后停在最后一行
        return index === -1 ? 0 : index;
    };

    // 获取当前行歌词文本
    const getCurrentLineText = (currentTime) => {
        if (!lyricsData.value || lyricsData.value.length === 0) return "";

        for (const lineData of lyricsData.value) {
            const firstChar = lineData.characters[0];
            const lastChar = lineData.characters[lineData.characters.length - 1];

            if (
                firstChar && lastChar &&
                currentTime * 1000 >= firstChar.startTime &&
                currentTime * 1000 <= lastChar.endTime
            ) {
                return lineData.characters.map((char) => char.char).join("");
            }
        }
        return "";
    };

    return {
        lyricsData,
        originalLyrics,
        showLyrics,
        scrollAmount,
        SongTips,
        lyricsMode,
        toggleLyrics,
        getLyrics,
        setLocalLyrics,
        highlightCurrentChar,
        resetLyricsHighlight,
        getCurrentLineText,
        scrollToCurrentLine,
        resetLyricsScrollAnchor,
        toggleLyricsMode
    };
}

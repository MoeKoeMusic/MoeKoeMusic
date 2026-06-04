import { ref, nextTick } from 'vue';
import { get } from '../../utils/request';

export default function useLyricsHandler(t) {
    const lyricsData = ref([]);
    const originalLyrics = ref('');
    const showLyrics = ref(false);
    const scrollAmount = ref(null);
    const SongTips = ref(t('zan-wu-ge-ci'));
    const lyricsMode = ref('translation'); // 'translation' 翻译模式 或 'romanization' 音译模式
    let currentLineIndex = 0;
    let activeLyricsRequestId = 0;
    const isLocalHash = (hash) => String(hash || '').startsWith('local_');

    // 显示/隐藏歌词
    const toggleLyrics = (hash, currentTime) => {
        showLyrics.value = !showLyrics.value;
        if (isLocalHash(hash)) {
            SongTips.value = t('zan-wu-ge-ci');
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
            parseLyrics(lyricResponse.decodeContent, settings?.lyricsTranslation === 'on');
            originalLyrics.value = lyricResponse.decodeContent;
            centerFirstLine();
            return true;
        } catch (error) {
            SongTips.value = t('huo-qu-ge-ci-shi-bai');
        }
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
    };

    // 切换歌词显示模式（翻译/音译）
    const toggleLyricsMode = () => {
        lyricsMode.value = lyricsMode.value === 'translation' ? 'romanization' : 'translation';
        return lyricsMode.value;
    };

    // 居中显示第一行歌词
    const centerFirstLine = () => {
        const lyricsContainer = document.getElementById('lyrics-container');
        if (!lyricsContainer) return;
        const containerHeight = lyricsContainer.offsetHeight;
        const lyricsElement = document.getElementById('lyrics');
        if (!lyricsElement) return;
        const lyricsHeight = lyricsElement.offsetHeight;
        scrollAmount.value = (containerHeight - lyricsHeight) / 2;
    };

    // 滚动到当前歌词行
    const scrollToCurrentLine = (lineIndex) => {
        if (currentLineIndex === lineIndex) return;
        
        currentLineIndex = lineIndex;
        const lyricsContainer = document.getElementById('lyrics-container');
        if (!lyricsContainer) return false;
        const containerHeight = lyricsContainer.offsetHeight;
        const lineElement = document.querySelectorAll('.line-group')[lineIndex];
        if (lineElement) {
            const lineHeight = lineElement.offsetHeight;
            scrollAmount.value = -lineElement.offsetTop + (containerHeight / 2) - (lineHeight / 2);
        }
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

        const currentTimeMs = currentTime * 1000;
        for (let index = 0; index < lyricsData.value.length; index++) {
            const lineData = lyricsData.value[index];
            const nextLineData = lyricsData.value[index + 1];
            const firstChar = lineData.characters[0];
            const nextFirstChar = nextLineData?.characters[0];

            if (
                firstChar && nextFirstChar &&
                currentTimeMs >= firstChar.startTime &&
                currentTimeMs <= nextFirstChar.startTime
            ) return index + 1;
        }
        return lyricsData.value.length - 1;
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
        highlightCurrentChar,
        resetLyricsHighlight,
        getCurrentLineText,
        scrollToCurrentLine,
        toggleLyricsMode
    };
}

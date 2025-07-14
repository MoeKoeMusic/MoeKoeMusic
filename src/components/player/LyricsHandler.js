import { ref, nextTick } from 'vue';
import { get } from '../../utils/request';

export default function useLyricsHandler(t) {
    const lyricsData = ref([]);
    const originalLyrics = ref('');
    const showLyrics = ref(false);
    const scrollAmount = ref(null);
    const SongTips = ref(t('zan-wu-ge-ci'));
    let currentLineIndex = 0;

    // 显示/隐藏歌词
    const toggleLyrics = (currentTime) => {
        showLyrics.value = !showLyrics.value;
        SongTips.value = t('huo-qu-ge-ci-zhong');
        // 如果显示歌词，滚动到当前播放行
        if (!lyricsData.value.length) getLyrics();
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
    const getLyrics = async (hash, settings) => {
        try {
            if (!showLyrics.value &&
                (settings?.desktopLyrics === 'off' && settings?.apiMode === 'off')) {
                return;
            }

            const lyricSearchResponse = await get(`/search/lyric?hash=${hash}`);
            if (lyricSearchResponse.status !== 200 || lyricSearchResponse.candidates.length === 0) {
                SongTips.value = t('zan-wu-ge-ci');
                return;
            }

            // 明确指定使用KRC格式
            const lyricResponse = await get(`/lyric?id=${lyricSearchResponse.candidates[0].id}&accesskey=${lyricSearchResponse.candidates[0].accesskey}&fmt=krc&decode=true`);
            if (lyricResponse.status !== 200) {
                SongTips.value = t('huo-qu-ge-ci-shi-bai');
                return;
            }
            console.log('[LyricsHandler] 请求歌词……');
            parseLyrics(lyricResponse.decodeContent, settings?.lyricsTranslation === 'on');
            originalLyrics.value = lyricResponse.decodeContent;
            centerFirstLine();
        } catch (error) {
            SongTips.value = t('huo-qu-ge-ci-shi-bai');
        }
    };

    // 解析歌词
    const parseLyrics = (text, parseTranslation = true) => {
        let translationLyrics = [];
        const lines = text.split('\n');

        try {
            const languageLine = lines.find(line => line.match(/\[language:(.*)\]/));
            if (parseTranslation && languageLine) {
                const languageCode = languageLine.slice(10, -2);
                if (languageCode) {
                    const languageData = JSON.parse(atob(languageCode));
                    const translation = languageData?.content?.find(section => section.type === 1);
                    translationLyrics = translation?.lyricContent || [];
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

        if (translationLyrics.length) {
            parsedLyrics.forEach((line, index) => {
                if (translationLyrics[index] && translationLyrics[index][0])
                    line.translated = translationLyrics[index][0];
            });
        }

        lyricsData.value = parsedLyrics;
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
        toggleLyrics,
        getLyrics,
        highlightCurrentChar,
        resetLyricsHighlight,
        getCurrentLineText,
        scrollToCurrentLine,
    };
} 

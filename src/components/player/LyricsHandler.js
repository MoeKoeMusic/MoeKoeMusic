import { ref } from 'vue';
import { get } from '../../utils/request';

export default function useLyricsHandler(t) {
    const lyricsData = ref([]);
    const originalLyrics = ref('');
    const showLyrics = ref(false);
    const scrollAmount = ref(null);
    const SongTips = ref(t('zan-wu-ge-ci'));
    let currentLineIndex = 0;

    // 显示/隐藏歌词
    const toggleLyrics = () => {
        showLyrics.value = !showLyrics.value;
        SongTips.value = t('huo-qu-ge-ci-zhong');
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

            const lyricResponse = await get(`/lyric?id=${lyricSearchResponse.candidates[0].id}&accesskey=${lyricSearchResponse.candidates[0].accesskey}&decode=true`);
            if (lyricResponse.status !== 200) {
                SongTips.value = t('huo-qu-ge-ci-shi-bai');
                return;
            }

            parseLyrics(lyricResponse.decodeContent);
            originalLyrics.value = lyricResponse.decodeContent;
            centerFirstLine();
        } catch (error) {
            SongTips.value = t('huo-qu-ge-ci-shi-bai');
        }
    };

    // 解析歌词
    const parseLyrics = (text) => {
        const lines = text.split('\n');
        const parsedLyrics = lines
            .map((line) => {
                const match = line.match(/^\[(\d+),(\d+)\](.*)/);
                if (match) {
                    const time = parseInt(match[1]);
                    const duration = parseInt(match[2]);
                    const lyric = match[3].replace(/<.*?>/g, '');
                    const characters = lyric.split('').map((char, index) => ({
                        char,
                        startTime: time + (index * duration) / lyric.length,
                        endTime: time + ((index + 1) * duration) / lyric.length,
                        highlighted: false,
                    }));
                    return { characters };
                }
                return null;
            })
            .filter((line) => line);
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

    // 高亮当前字符
    const highlightCurrentChar = (currentTime) => {
        lyricsData.value.forEach((lineData, index) => {
            let isLineHighlighted = false;
            lineData.characters.forEach((charData) => {
                if (currentTime * 1000 >= charData.startTime && !charData.highlighted) {
                    charData.highlighted = true;
                    isLineHighlighted = true;
                }
            });

            if (isLineHighlighted && currentLineIndex !== index) {
                currentLineIndex = index;
                const lyricsContainer = document.getElementById('lyrics-container');
                if (!lyricsContainer) return;
                const containerHeight = lyricsContainer.offsetHeight;
                const lineElement = document.querySelectorAll('.line')[index];
                if (lineElement) {
                    const lineHeight = lineElement.offsetHeight;
                    scrollAmount.value = -lineElement.offsetTop + (containerHeight / 2) - (lineHeight / 2);
                }
            }
        });
    };

    // 重置歌词高亮状态
    const resetLyricsHighlight = (currentTimeInSeconds) => {
        if (!lyricsData.value) return;

        lyricsData.value.forEach((lineData, lineIndex) => {
            lineData.characters.forEach(charData => {
                charData.highlighted = (currentTimeInSeconds * 1000 >= charData.startTime);
            });

            const isCurrentLine = lineData.characters.some(char =>
                currentTimeInSeconds * 1000 >= char.startTime &&
                currentTimeInSeconds * 1000 <= char.endTime
            );

            if (isCurrentLine) {
                currentLineIndex = lineIndex;
                const lyricsContainer = document.getElementById('lyrics-container');
                if (!lyricsContainer) return;
                const containerHeight = lyricsContainer.offsetHeight;
                const lineElement = document.querySelectorAll('.line')[lineIndex];
                if (lineElement) {
                    const lineHeight = lineElement.offsetHeight;
                    scrollAmount.value = -lineElement.offsetTop + (containerHeight / 2) - (lineHeight / 2);
                }
            }
        });
    };

    // 获取当前行歌词文本
    const getCurrentLineText = (currentTime) => {
        if (!lyricsData.value || lyricsData.value.length === 0) return "";

        for (const lineData of lyricsData.value) {
            const firstChar = lineData.characters[0];
            const lastChar =
                lineData.characters[lineData.characters.length - 1];

            if (
                firstChar &&
                lastChar &&
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
    };
} 

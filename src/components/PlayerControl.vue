<template>
    <div class="player-container">
        <div class="progress-bar" @mousedown="onProgressDragStart" @click="updateProgressFromEvent"
            @mousemove="updateTimeTooltip" @mouseleave="hideTimeTooltip">
            <div class="progress" :style="{ width: progressWidth + '%' }"></div>
            <div class="progress-handle" :style="{ left: progressWidth + '%' }"></div>
            <div v-for="(point, index) in climaxPoints" :key="index" class="climax-point"
                :style="{ left: point.position + '%' }">
            </div>
            <div v-if="showTimeTooltip" class="time-tooltip" :style="{ left: tooltipPosition + 'px' }">
                {{ tooltipTime }}
            </div>
        </div>
        <div class="player-bar">
            <div class="album-art" @click="toggleLyrics(currentSong.hash, currentTime)">
                <img v-if="currentSong.img" :src="currentSong.img" alt="Album Art" />
                <i v-else class="fas fa-music"></i>
            </div>
            <div class="song-info" @click="toggleLyrics(currentSong.hash, currentTime)">
                <div class="song-title">{{ currentSong?.name || "MoeKoeMusic" }}</div>
                <div class="artist">{{ currentSong?.author || "MoeJue" }}</div>
            </div>
            <div class="controls">
                <button class="control-btn" @click="playSongFromQueue('previous')">
                    <i class="fas fa-step-backward"></i>
                </button>
                <button class="control-btn" @click="togglePlayPause">
                    <i :class="playing ? 'fas fa-pause' : 'fas fa-play'"></i>
                </button>
                <button class="control-btn" @click="playSongFromQueue('next')">
                    <i class="fas fa-step-forward"></i>
                </button>
            </div>
            <div class="extra-controls">
                <button class="extra-btn" title="桌面歌词" v-if="isElectron()" @click="desktopLyrics"><i
                        class="fas">词</i></button>
                <div class="playback-speed">
                    <button class="extra-btn" @click="toggleSpeedMenu" title="播放速度">
                        <i class="fas fa-tachometer-alt"></i>
                    </button>
                    <div v-if="showSpeedMenu" class="speed-menu">
                        <div v-for="speed in playbackSpeeds" :key="speed" class="speed-option"
                            :class="{ active: currentSpeed === speed }" @click="changePlaybackSpeed(speed)">
                            {{ speed }}x
                        </div>
                    </div>
                </div>
                <button class="extra-btn" title="我喜欢" @click="playlistSelect.toLike()"><i
                        class="fas fa-heart"></i></button>
                <button class="extra-btn" title="收藏至" @click="playlistSelect.fetchPlaylists()"><i
                        class="fas fa-add"></i></button>
                <button class="extra-btn" title="分享歌曲" @click="share('share?hash=' + currentSong.hash)"><i
                        class="fas fa-share"></i></button>
                <button class="extra-btn" @click="togglePlaybackMode">
                    <i v-if="currentPlaybackModeIndex != '2'" :class="currentPlaybackMode.icon"
                        :title="currentPlaybackMode.title"></i>
                    <span v-else class="loop-icon" :title="currentPlaybackMode.title">
                        <i class="fas fa-repeat"></i>
                        <sup>1</sup>
                    </span>
                </button>
                <button class="extra-btn" @click="queueList.openQueue()"><i class="fas fa-list"></i></button>
                <!-- 音量控制 -->
                <div class="volume-control" @wheel="handleVolumeScroll">
                    <i :class="isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up'" @click="toggleMute"></i>
                    <div class="volume-slider" @mousedown="onDragStart">
                        <div class="volume-progress" :style="{ width: volume + '%' }"></div>
                        <input type="range" min="0" max="100" v-model="volume" @input="changeVolume" />
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 播放队列 -->
    <QueueList :current-song="currentSong" @add-song-to-queue="onQueueSongAdd"
        @add-cloud-music-to-queue="onQueueCloudSongAdd" @add-local-music-to-queue="onQueueLocalSongAdd" ref="queueList" />

    <!-- 全屏歌词界面 -->
    <transition name="slide-up">
        <div v-if="showLyrics" class="lyrics-bg"
            :style="(lyricsBackground == 'on' ? ({ backgroundImage: `url(${currentSong?.img || 'https://random.MoeJue.cn/randbg.php'})` }) : ({ background: 'var(--secondary-color)' }))">
            <div class="lyrics-screen">
                <div class="close-btn">
                    <i class="fas fa-chevron-down" @click="toggleLyrics(currentSong.hash, currentTime)"></i>
                </div>
                <div class="lyrics-mode-btn" v-if="hasMultiLyricsMode" @click="switchLyricsMode" :title="lyricsMode === 'translation' ? '切换到音译' : '切换到翻译'">
                    <i class="fas fa-language"></i>
                </div>

                <div class="left-section">
                    <div class="album-art-container" @click="toggleCoverMode">
                        <transition name="cover-fade" mode="out-in">
                            <div v-if="coverMode === 'vinyl'" key="vinyl" class="vinyl-player">
                                <!-- 唱片播放器模式 -->
                                <div class="vinyl-disc" :class="{ 'rotating': playing }">
                                    <img :src="currentSong?.img || './assets/images/!.png'" alt="Album Art" class="vinyl-cover" />
                                </div>
                                <div class="tonearm" :class="{ 'playing': playing }"></div>
                            </div>
                            <div v-else key="square" class="album-art-large">
                                <!-- 普通封面模式 -->
                                <img v-if="easterEggImage" :src="easterEggImage.src" :class="easterEggClass" alt="Easter Egg" />
                                <img :src="currentSong?.img || './assets/images/!.png'" alt="Album Art" />
                            </div>
                        </transition>
                    </div>
                    <div class="song-details">
                        <div class="song-title">{{ currentSong?.name }}</div>
                        <div class="artist">{{ currentSong?.author }}</div>
                    </div>

                    <!-- 播放进度条 -->
                    <div class="progress-bar-container">
                        <span class="current-time">{{ formattedCurrentTime }}</span>
                        <div class="progress-bar" @mousedown="onProgressDragStart" @click="updateProgressFromEvent"
                            @mousemove="updateTimeTooltip" @mouseleave="hideTimeTooltip">
                            <div class="progress" :style="{ width: progressWidth + '%' }"></div>
                            <div class="progress-handle" :style="{ left: progressWidth + '%' }"></div>
                            <div v-for="(point, index) in climaxPoints" :key="index" class="climax-point"
                                :style="{ left: point.position + '%' }">
                            </div>
                            <div v-if="showTimeTooltip" class="time-tooltip" :style="{ left: tooltipPosition + 'px' }">
                                {{ tooltipTime }}
                            </div>
                        </div>
                        <span class="duration">{{ formattedDuration }}</span>
                    </div>

                    <div class="player-controls">
                        <button class="control-btn like-btn" title="我喜欢" @click="playlistSelect.toLike()">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="control-btn" @click="playSongFromQueue('previous')">
                            <i class="fas fa-step-backward"></i>
                        </button>
                        <button class="control-btn" @click="togglePlayPause">
                            <i :class="playing ? 'fas fa-pause' : 'fas fa-play'"></i>
                        </button>
                        <button class="control-btn" @click="playSongFromQueue('next')">
                            <i class="fas fa-step-forward"></i>
                        </button>
                        <button class="control-btn" @click="togglePlaybackMode">
                            <i v-if="currentPlaybackModeIndex != '2'" :class="currentPlaybackMode.icon" :title="currentPlaybackMode.title"></i>
                            <span v-else class="loop-icon" :title="currentPlaybackMode.title">
                                <i class="fas fa-repeat"></i>
                                <sup>1</sup>
                            </span>
                        </button>
                    </div>
                </div>
                <div id="lyrics-container" @wheel="handleLyricsWheel">
                    <div v-if="lyricsData.length > 0" id="lyrics"
                        :style="{ fontSize: lyricsFontSize, transform: `translateY(${scrollAmount ? scrollAmount + 'px' : '50%'})` }">
                        <div class="line-group" v-for="(lineData, lineIndex) in lyricsData" :key="lineIndex">
                            <div class="line" @click="handleLyricsClick(lineIndex)" :class="{ click: lyricsFlag, [lyricsAlign]: true }">
                                <span v-for="(charData, charIndex) in lineData.characters" :key="charIndex" class="char"
                                    :class="{ highlight: charData.highlighted }">
                                    {{ charData.char }}
                                </span>
                            </div>
                            <div class="line translated" :class="{ [lyricsAlign]: true }" v-show="lineData.translated && lyricsMode === 'translation'">{{ lineData.translated }}</div>
                            <div class="line romanized" :class="{ [lyricsAlign]: true }" v-show="lineData.romanized && lyricsMode === 'romanization'">{{ lineData.romanized }}</div>
                        </div>
                    </div>
                    <div v-else class="no-lyrics">{{ SongTips }}</div>
                </div>
            </div>
        </div>
    </transition>

    <!-- 歌单选择模态框 -->
    <PlaylistSelectModal ref="playlistSelect" :current-song="currentSong" :playlists="playlists" />

</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useMusicQueueStore } from '../stores/musicQueue';
import { useI18n } from 'vue-i18n';
import PlaylistSelectModal from './PlaylistSelectModal.vue';
import QueueList from './QueueList.vue';
import { useRouter } from 'vue-router';
import { getCover, share } from '../utils/utils';

// 从统一入口导入所有模块
import {
    useAudioController,
    useLyricsHandler,
    useProgressBar,
    usePlaybackMode,
    useMediaSession,
    useSongQueue,
    useHelpers
} from './player';

// 基础设置
const queueList = ref(null);
const playlistSelect = ref(null);
const { t } = useI18n();
const router = useRouter();
const musicQueueStore = useMusicQueueStore();
const playlists = ref([]);
const currentTime = ref(0);
const lyricsFontSize = ref('24px');
const lyricsAlign = ref('center');
const lyricsBackground = ref('on');
const sliderElement = ref(null);
const coverMode = ref(localStorage.getItem('lyrics-cover-mode') || 'square');

const isDragging = ref(false);
const lyricsFlag = ref(false);

// 辅助函数
const { isElectron, throttle, getVip, desktopLyrics } = useHelpers(t);

// Easter Egg 相关
const easterEggImages = [
    { src: './assets/images/miku.png', class: 'miku' },
    { src: './assets/images/miku2.png', class: 'miku2' },
    { src: './assets/images/miku3.png', class: 'miku3' }
];

const easterEggImage = computed(() => {
    const author = currentSong.value?.author || '';
    if (author.includes('初音') || author.includes('Miku')) {
        const randomIndex = Math.floor(Math.random() * easterEggImages.length);
        return easterEggImages[randomIndex];
    }
    return null;
});

const easterEggClass = computed(() => easterEggImage.value?.class || '');

// 初始化事件回调
const onSongEnd = () => {
    if (currentPlaybackModeIndex.value == 2) return;
    playSongFromQueue('next');
};

// 节流处理的时间更新函数
const updateCurrentTime = throttle(() => {
    currentTime.value = audio.currentTime;
    if (!isProgressDragging.value) {
        progressWidth.value = (currentTime.value / audio.duration) * 100;
    }

    // 更新SMTC位置状态
    if (audio.duration && currentSong.value?.hash) {
        mediaSession.updatePositionState(audio.currentTime, audio.duration, currentSpeed.value);
    }

    const savedConfig = JSON.parse(localStorage.getItem('settings') || '{}');
    const hasLyricsData = Array.isArray(lyricsData.value) && lyricsData.value.length > 0;

    if (audio) {
        if (savedConfig?.lyricsAlign != lyricsAlign.value) lyricsAlign.value = savedConfig.lyricsAlign;

        if (hasLyricsData) {
            highlightCurrentChar(audio.currentTime, !lyricsFlag.value);
        }

        if (isElectron()) {
            const desktopLyricsSource = hasLyricsData ? lyricsData.value : [];
            const desktopLyricsPayload = JSON.parse(JSON.stringify(desktopLyricsSource));
            const serverLyricsSource = hasLyricsData && originalLyrics.value ? originalLyrics.value : [];
            const serverLyricsPayload = JSON.parse(JSON.stringify(serverLyricsSource));
            const currentSongPayload = JSON.parse(JSON.stringify(currentSong.value ?? null));

            if (savedConfig?.desktopLyrics === 'on' || savedConfig?.statusBarLyrics === 'on') {
                const currentLine = hasLyricsData ? getCurrentLineText(audio.currentTime) : '';
                window.electron.ipcRenderer.send('lyrics-data', {
                    currentTime: audio.currentTime,
                    lyricsData: desktopLyricsPayload,
                    currentSongHash: currentSong.value?.hash || '',
                    currentLyric: currentLine
                });
            }
            if (savedConfig?.apiMode === 'on') {
                window.electron.ipcRenderer.send('server-lyrics', {
                    currentTime: audio.currentTime,
                    lyricsData: serverLyricsPayload,
                    currentSong: currentSongPayload,
                    duration: audio.duration
                });
            }
            if (window.electron.platform == 'darwin' && savedConfig?.touchBar == 'on') {
                const currentLine = hasLyricsData ? getCurrentLineText(audio.currentTime) : '';
                window.electron.ipcRenderer.send(
                    "update-current-lyrics",
                    currentLine
                );
            }
        }
    }

    if (!hasLyricsData && isElectron() && (savedConfig?.desktopLyrics === 'on' || savedConfig?.statusBarLyrics === 'on' || savedConfig?.apiMode === 'on')) {
        if (isLyrics === false) return;
        getCurrentLyrics();
    }

    localStorage.setItem('player_progress', audio.currentTime);
}, 200);

// 初始化各个模块
const audioController = useAudioController({ onSongEnd, updateCurrentTime });
const { playing, isMuted, volume, changeVolume, audio, playbackRate, setPlaybackRate, applyLoudnessNormalization, ensureAudioContextRunning, toggleLoudnessNormalization, loudnessNormalizationEnabled, currentLoudnessGain, webAudioInitialized } = audioController;

const lyricsHandler = useLyricsHandler(t);
const { lyricsData, originalLyrics, showLyrics, scrollAmount, SongTips, lyricsMode, toggleLyrics, getLyrics, highlightCurrentChar, resetLyricsHighlight, getCurrentLineText, scrollToCurrentLine, toggleLyricsMode } = lyricsHandler;

const progressBar = useProgressBar(audio, resetLyricsHighlight);
const { progressWidth, isProgressDragging, showTimeTooltip, tooltipPosition, tooltipTime, climaxPoints, formatTime, getMusicHighlights, onProgressDragStart, updateProgressFromEvent, updateTimeTooltip, hideTimeTooltip } = progressBar;

const playbackMode = usePlaybackMode(t, audio);
const { currentPlaybackModeIndex, currentPlaybackMode, playedSongsStack, currentStackIndex, togglePlaybackMode } = playbackMode;

const mediaSession = useMediaSession();

const songQueue = useSongQueue(t, musicQueueStore);
const { currentSong, NextSong, addSongToQueue, addCloudMusicToQueue, addLocalMusicToQueue, addLocalPlaylistToQueue, addToNext, getPlaylistAllSongs, addPlaylistToQueue, addCloudPlaylistToQueue } = songQueue;

// 添加自动切换定时器引用
let autoSwitchTimer = null;
// 恢复歌词正常滚动计时器
let lyricScrollTimer = null;
// 自动切换计数器和最大重试次数
let autoSwitchCount = 0;
const maxAutoSwitchRetries = 3;

// 处理自动切换逻辑的函数
const handleAutoSwitch = () => {
    console.log('[PlayerControl] 检查自动切换重试次数:', autoSwitchCount, '/', maxAutoSwitchRetries);
    if (autoSwitchCount < maxAutoSwitchRetries) {
        autoSwitchCount++;
        console.log(`[PlayerControl] 自动切换尝试 ${autoSwitchCount}/${maxAutoSwitchRetries}`);
        autoSwitchTimer = setTimeout(() => {
            playSongFromQueue('next');
        }, 3000);
        return true;
    } else {
        console.log('[PlayerControl] 已达到最大重试次数，停止自动切换');
        window.$modal.alert('已达到最大重试次数，请手动选择歌曲');
        autoSwitchCount = 0;
        return false;
    }
};

// 清除自动切换定时器的函数
const clearAutoSwitchTimer = () => {
    if (autoSwitchTimer) {
        console.log('[PlayerControl] 取消自动切换到下一首');
        clearTimeout(autoSwitchTimer);
        autoSwitchTimer = null;
    }
};

// 恢复歌词正常滚动的节流函数
const restoreLyricsScroll = throttle(() => {
    if (lyricScrollTimer) clearTimeout(lyricScrollTimer);
    lyricScrollTimer = setTimeout(() => {
        console.log('[PlayerControl] 恢复歌词正常滚动');
        lyricScrollTimer = null;
        lyricsFlag.value = false;
        const currentLine = getCurrentLineText(audio.currentTime);
        scrollToCurrentLine(currentLine);
    }, 5000);
}, 1000);

// 获取歌词的节流函数
let isLyrics;
const getCurrentLyrics = throttle(async() => {
    if (currentSong.value.hash) {
        isLyrics = await getLyrics(currentSong.value.hash);
    }
}, 1000);

// 计算属性
const formattedCurrentTime = computed(() => formatTime(currentTime.value));
const formattedDuration = computed(() => formatTime(currentSong.value?.timeLength || 0));

// 判断是否有多种歌词模式（同时有翻译和音译）
const hasMultiLyricsMode = computed(() => {
    if (!lyricsData.value || lyricsData.value.length === 0) return false;
    
    // 检查是否至少有一行同时包含翻译和音译
    return lyricsData.value.some(line => line.translated && line.romanized);
});

// 切换歌词显示模式（翻译/音译）
const switchLyricsMode = () => {
    toggleLyricsMode();
};

// 切换封面模式（正方形/唱片）
const toggleCoverMode = () => {
    coverMode.value = coverMode.value === 'square' ? 'vinyl' : 'square';
    localStorage.setItem('lyrics-cover-mode', coverMode.value);
};

// 播放歌曲
const playSong = async (song) => {
    clearAutoSwitchTimer();

    try {
        console.log('[PlayerControl] 开始播放歌曲:', song.name);

        // 检查歌曲对象和URL是否有效
        if (!song || !song.url) {
            console.error('[PlayerControl] 无效的歌曲或URL:', song);
            window.$modal.alert(t('bo-fang-shi-bai-qu-mu-wei-kong'));
            playing.value = false;
            return;
        }

        currentSong.value = structuredClone(song);

        // 应用响度规格化（如果已启用 Web Audio）
        if (song.loudnessNormalization) {
            console.log('[PlayerControl] 应用响度规格化:', song.loudnessNormalization);
            applyLoudnessNormalization(song.loudnessNormalization);
        } else {
            console.log('[PlayerControl] 歌曲无响度规格化数据');
            applyLoudnessNormalization(null);
        }

        audio.src = song.url;

        // 确保 AudioContext 处于运行状态（如果已启用）
        await ensureAudioContextRunning();

        setPlaybackRate(currentSpeed.value);
        console.log('[PlayerControl] 设置音频源:', song.url);

        try {
            mediaSession.changeMediaSession(currentSong.value);
            // 更新SMTC位置状态
            if (audio.duration) {
                mediaSession.updatePositionState(audio.currentTime, audio.duration, currentSpeed.value);
            }
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                await playPromise;
                console.log('[PlayerControl] 成功开始播放歌曲');
                playing.value = true;
            }
        } catch (playError) {
            console.warn('[PlayerControl] 播放被中断，尝试重新播放:', playError);
            // 等待一小段时间后重试
            await new Promise(resolve => setTimeout(resolve, 100));

            try {
                await audio.play();
                playing.value = true;
            } catch (retryError) {
                console.error('[PlayerControl] 重试播放失败:', retryError);
                window.$modal.alert(t('bo-fang-shi-bai'));
                playing.value = false;
            }
        }

        // 设置标题
        if (song.name && song.author) {
            document.title = song.name + " - " + song.author;
        } else if (song.name) {
            document.title = song.name;
        }

        // 清空歌词数据
        lyricsData.value = [];
        if(song?.isLocal) return;
        // 保存当前歌曲到本地存储
        localStorage.setItem('current_song', JSON.stringify(currentSong.value));

        getVip();
        // 获取歌词
        getCurrentLyrics();
        getMusicHighlights(currentSong.value.hash);
    } catch (error) {
        console.error('[PlayerControl] 播放音乐时发生错误:', error);
        playing.value = false;
        window.$modal.alert(t('bo-fang-chu-cuo'));
    }
};

// 切换播放/暂停
const togglePlayPause = async () => {
    if (!currentSong.value.hash) {
        console.log('[PlayerControl] 没有当前歌曲，尝试播放队列中的下一首');
        playSongFromQueue('next');
        return;
    } else if (!audio.src) {
        console.log('[PlayerControl] 音频源为空，尝试重新设置');
        if (currentSong.value.url) {
            console.log('[PlayerControl] 从当前歌曲获取URL:', currentSong.value.url);
            audio.src = currentSong.value.url;
        } else {
            console.log('[PlayerControl] 重新从队列获取歌曲');
            const songIndex = musicQueueStore.queue.findIndex(song => song.hash === currentSong.value.hash);
            if (songIndex !== -1) {
                const song = musicQueueStore.queue[songIndex];
                if (song.url) {
                    console.log('[PlayerControl] 从队列中的歌曲获取URL:', song.url);
                    currentSong.value.url = song.url;
                    audio.src = song.url;
                } else if (song.isCloud) {
                    console.log('[PlayerControl] 云音乐没有URL，重新获取');
                    addCloudMusicToQueue(song.hash, song.name, song.author, song.timeLength, song.img);
                    return;
                }else if(song.isLocal){
                    console.log('[PlayerControl] 本地音乐没有URL，重新获取');
                    addLocalMusicToQueue(song);
                } else {
                    console.log('[PlayerControl] 歌曲没有URL，重新获取');
                    addSongToQueue(song.hash, song.name, song.img, song.author);
                    return;
                }
            } else {
                console.log('[PlayerControl] 歌曲不在队列中，播放下一首');
                playSongFromQueue('next');
                return;
            }
        }
    }

    if (playing.value) {
        console.log('[PlayerControl] 暂停播放');
        audio.pause();
        playing.value = false;
    } else {
        console.log('[PlayerControl] 开始播放');
        try {
            await audio.play();
            playing.value = true;
        } catch (retryError) {
            console.error('[PlayerControl] 播放失败:', retryError);
            window.$modal.alert(t('bo-fang-shi-bai'));
        }
    }
};

// 从队列中播放歌曲
const playSongFromQueue = async (direction) => {
    clearAutoSwitchTimer();

    if (musicQueueStore.queue.length === 0) {
        console.log('[PlayerControl] 队列为空');
        window.$modal.alert(t('ni-huan-mei-you-tian-jia-ge-quo-kuai-qu-tian-jia-ba'));
        return;
    }

    console.log(`[PlayerControl] 从队列播放${direction === 'next' ? '下' : '上'}一首`);
    audio.pause();
    playing.value = false;
    if (direction == 'next' && NextSong.value.length > 0) {
        // 添加下一首播放
        console.log('[PlayerControl] 播放预定的下一首:', NextSong.value[0].name);
        const songData = NextSong.value[0];
        NextSong.value.shift();

        try {
            const result = await addSongToQueue(songData.hash, songData.name, songData.img, songData.author);
            // 如果返回了歌曲对象，直接播放
            if (result && result.song) {
                console.log('[PlayerControl] 获取到下一首歌曲，开始播放:', result.song.name);
                await playSong(result.song);
            } else if (result && result.shouldPlayNext) {
                console.log('[PlayerControl] 预定的下一首无法播放');
                handleAutoSwitch();
            } else {
                console.error('[PlayerControl] 无法获取下一首歌曲信息');
            }
        } catch (error) {
            console.error('[PlayerControl] 获取下一首歌曲时出错:', error);
        }
        return;
    }

    const currentIndex = musicQueueStore.queue.findIndex(song => song.hash === currentSong.value.hash);
    console.log('[PlayerControl] 当前歌曲索引:', currentIndex);
    let targetIndex;

    // 处理不同播放模式
    if (currentIndex === -1) {
        targetIndex = 0;
    } else if (currentPlaybackModeIndex.value === 0) {
        // 随机播放
        targetIndex = handleRandomPlayback(direction, currentIndex);
    } else {
        // 顺序播放或单曲循环
        targetIndex = direction === 'previous'
            ? (currentIndex === 0 ? musicQueueStore.queue.length - 1 : currentIndex - 1)
            : (currentIndex + 1) % musicQueueStore.queue.length;
    }

    console.log('[PlayerControl] 目标歌曲索引:', targetIndex);

    // 播放目标索引的歌曲
    const targetSong = musicQueueStore.queue[targetIndex];
    console.log('[PlayerControl] 开始播放目标歌曲:', targetSong.name);

    try {
        let result;
        if (targetSong.isCloud) {
            result = await addCloudMusicToQueue(
                targetSong.hash,
                targetSong.name,
                targetSong.author,
                targetSong.timeLength,
                targetSong.img,
                false // 不重置播放位置，只获取URL
            );
        } else if (targetSong.isLocal) {
            result = await addLocalMusicToQueue(targetSong, false);
        } else {
            result = await addSongToQueue(
                targetSong.hash,
                targetSong.name,
                targetSong.img,
                targetSong.author,
                false // 不重置播放位置，只获取URL
            );
        }

        // 检查返回结果并播放
        if (result && result.song) {
            console.log('[PlayerControl] 成功获取歌曲URL，开始播放:', result.song.name);
            await playSong(result.song);
        } else if (result && result.shouldPlayNext) {
            console.log('[PlayerControl] 云盘歌曲无法播放');
            handleAutoSwitch();
        } else {
            console.error('[PlayerControl] 无法获取歌曲URL');
        }
    } catch (error) {
        console.error('[PlayerControl] 切换歌曲时发生错误:', error);
        // 如果出错，尝试播放下一首
        if (direction === 'next') {
            console.log('[PlayerControl] 发生错误，3秒后尝试播放下一首');
            handleAutoSwitch();
        }
    }
};

// 处理随机播放逻辑
const handleRandomPlayback = (direction, currentIndex) => {
    if (direction === 'previous' && currentStackIndex.value > 0) {
        // 返回上一首随机歌曲
        currentStackIndex.value--;
        return playedSongsStack.value[currentStackIndex.value];
    } else if (direction === 'previous') {
        // 向前随机一首新歌曲
        let newIndex;
        let attempts = 0;
        const maxAttempts = musicQueueStore.queue.length * 2; // 防止死循环
        
        do {
            newIndex = Math.floor(Math.random() * musicQueueStore.queue.length);
            attempts++;
            
            // 如果尝试次数过多，直接返回
            if (attempts >= maxAttempts) {
                break;
            }
        } while (playedSongsStack.value.length > 0 && 
                 (newIndex === playedSongsStack.value[currentStackIndex.value] ||
                  (musicQueueStore.queue.length >= 10 && playedSongsStack.value.length > 0 && 
                   playedSongsStack.value.slice(-Math.min(10, playedSongsStack.value.length)).includes(newIndex))));

        playedSongsStack.value.unshift(newIndex);
        return newIndex;
    } else if (direction === 'next' && currentStackIndex.value < playedSongsStack.value.length - 1) {
        // 前进到下一首已随机过的歌曲
        currentStackIndex.value++;
        return playedSongsStack.value[currentStackIndex.value];
    } else if (direction === 'next') {
        // 随机一首新歌曲
        let newIndex;
        let attempts = 0;
        const maxAttempts = musicQueueStore.queue.length * 2; // 防止死循环
        
        do {
            newIndex = Math.floor(Math.random() * musicQueueStore.queue.length);
            attempts++;
            
            // 如果尝试次数过多，直接返回
            if (attempts >= maxAttempts) {
                break;
            }
        } while (playedSongsStack.value.length > 0 && 
                 (newIndex === playedSongsStack.value[currentStackIndex.value] ||
                  (musicQueueStore.queue.length >= 10 && playedSongsStack.value.length > 0 && 
                   playedSongsStack.value.slice(-Math.min(10, playedSongsStack.value.length)).includes(newIndex))));

        // 截断未来的历史记录
        if (currentStackIndex.value < playedSongsStack.value.length - 1) {
            playedSongsStack.value = playedSongsStack.value.slice(0, currentStackIndex.value + 1);
        }

        // 添加新歌曲到历史记录
        playedSongsStack.value.push(newIndex);
        currentStackIndex.value = playedSongsStack.value.length - 1;
        return newIndex;
    }
};

// 音量拖动相关函数
const setVolumeOnClick = (event) => {
    const slider = event.target.closest('.volume-slider');
    if (slider) {
        const sliderWidth = slider.offsetWidth;
        const offsetX = event.offsetX;
        volume.value = Math.round((offsetX / sliderWidth) * 100);
        changeVolume();
        console.log('[PlayerControl] 点击设置音量:', volume.value, '实际audio.volume:', audio.volume);
    }
};

const onDragStart = (event) => {
    sliderElement.value = event.target.closest('.volume-slider');
    if (sliderElement.value) {
        isDragging.value = true;
        setVolumeOnClick(event);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onDragEnd);
    }
};
const onDrag = (event) => {
    if (isDragging.value && sliderElement.value) {
        const sliderWidth = sliderElement.value.offsetWidth;
        const rect = sliderElement.value.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const newVolume = Math.max(0, Math.min(100, Math.round((offsetX / sliderWidth) * 100)));
        volume.value = newVolume;
        changeVolume();
        console.log('[PlayerControl] 拖动设置音量:', volume.value, '实际audio.volume:', audio.volume);
    }
};
const onDragEnd = () => {
    isDragging.value = false;
    sliderElement.value = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', onDragEnd);
};

// 音量滚轮事件
const handleVolumeScroll = (event) => {
    event.preventDefault();
    const delta = Math.sign(event.deltaY) * -1;
    volume.value = Math.min(Math.max(volume.value + delta * 10, 0), 100);
    changeVolume();
    console.log('[PlayerControl] 滚轮设置音量:', volume.value, '实际audio.volume:', audio.volume);
};

// 歌词滚轮控制播放进度
const handleLyricsWheel = (event) => {
    if (!audio.duration || !currentSong.value?.hash) return;
    
    event.preventDefault();
    const lyricsContainer = document.getElementById('lyrics-container');
    if (!lyricsContainer) return;
    const lineGroups = document.querySelectorAll('.line-group');
    const firstLineElement = lineGroups[0];
    const lastLineElement = lineGroups[lineGroups.length - 1];
    if (!firstLineElement || (firstLineElement == lastLineElement)) return;
    const lineHeight = lastLineElement.offsetHeight;
    const containerHeight = lyricsContainer.offsetHeight;
    // 计算滚动的距离
    const scrollNumber = scrollAmount.value - (event.deltaY * 1.5);
    const maxScrollNumber = ((containerHeight - firstLineElement.offsetHeight) / 2);
    const miniScrollNumber = -lastLineElement.offsetTop + (containerHeight / 2) - (lineHeight / 2);
    if (scrollNumber > maxScrollNumber) scrollAmount.value = maxScrollNumber;
    else if (scrollNumber < miniScrollNumber) scrollAmount.value = miniScrollNumber;
    else scrollAmount.value = scrollNumber;
    lyricsFlag.value = true;
    restoreLyricsScroll();
};

const handleLyricsClick = (lineIndex) => {
    if (!lyricsFlag.value) return;
    console.log('[PlayerControl] 点击歌词:', lineIndex);
    const lineStartTime = lyricsData.value[lineIndex].characters[0].startTime;
    audio.currentTime = lineStartTime / 1000;
    resetLyricsHighlight(audio.currentTime);
    scrollToCurrentLine(lineIndex);
    lyricsFlag.value = false;
    if (lyricScrollTimer) clearTimeout(lyricScrollTimer);
    lyricScrollTimer = null;
}

// 键盘快捷键
const handleKeyDown = (event) => {
    const isInputFocused = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (isInputFocused) return;

    switch (event.code) {
        case 'Space':
            event.preventDefault();
            togglePlayPause();
            break;
        case 'ArrowLeft':
            playSongFromQueue('previous');
            break;
        case 'ArrowRight':
            playSongFromQueue('next');
            break;
        case 'Escape':
            if (showLyrics.value) toggleLyrics(currentSong.value.hash, audio.currentTime);
            break;
    }
};

// 初始化系统媒体快捷键
const setupMediaShortcuts = () => {
    if (!isElectron()) return;

    window.electron.ipcRenderer.on('play-previous-track', () => playSongFromQueue('previous'));
    window.electron.ipcRenderer.on('play-next-track', () => playSongFromQueue('next'));
    window.electron.ipcRenderer.on('volume-up', () => {
        volume.value = Math.min(volume.value + 10, 100);
        changeVolume();
    });
    window.electron.ipcRenderer.on('volume-down', () => {
        volume.value = Math.max(volume.value - 10, 0);
        changeVolume();
    });
    window.electron.ipcRenderer.on('toggle-play-pause', togglePlayPause);
    window.electron.ipcRenderer.on('toggle-mute', toggleMute);
    window.electron.ipcRenderer.on('toggle-like', () => playlistSelect.value.toLike());
    window.electron.ipcRenderer.on('toggle-mode', togglePlaybackMode);
    window.electron.ipcRenderer.on('url-params', (data) => {
        console.log('[PlayerControl] 接收到URL参数:', data);

        // 处理歌曲哈希参数
        if (data.hash) {
            console.log('[PlayerControl] 从URL启动播放歌曲:', data.hash);
            songQueue.privilegeSong(data.hash).then(res => {
                if (res.status == 1) {
                    const songInfo = res.data[0];
                    addSongToQueue(songInfo.hash, songInfo.albumname, getCover(songInfo.info.image, 480), songInfo.singername)
                }
            })
        }else if (data.listid) {
            // 处理歌单ID参数
            console.log('[PlayerControl] 从URL启动跳转到歌单:', data.listid);
            router.push({
                path: '/PlaylistDetail',
                query: { global_collection_id: data.listid }
            });
        }
    });
};

// 切换静音
const toggleMute = () => {
    isMuted.value = !isMuted.value;
    audio.muted = isMuted.value;
    if (isMuted.value) volume.value = 0;
    else volume.value = audio.volume * 100;
    localStorage.setItem('player_volume', volume.value);
    console.log('[PlayerControl] 切换静音:', isMuted.value, '音量:', volume.value, '实际audio.volume:', audio.volume);
};

const showSpeedMenu = ref(false);
const currentSpeed = ref(1.0);
const playbackSpeeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

// 切换速度菜单
const toggleSpeedMenu = () => {
    showSpeedMenu.value = !showSpeedMenu.value;
};

// 改变播放速度
const changePlaybackSpeed = (speed) => {
    currentSpeed.value = speed;
    setPlaybackRate(speed);
    showSpeedMenu.value = false;
    
    // 更新SMTC位置状态以反映新的播放速率
    if (audio.duration && currentSong.value?.hash) {
        mediaSession.updatePositionState(audio.currentTime, audio.duration, speed);
    }
};

// 组件挂载
onMounted(() => {
    console.log('[PlayerControl] 组件挂载');

    // 初始化音频设置
    audioController.initAudio();

    // 监听响度规格化开关变更
    const handleLoudnessChange = (event) => {
        const enabled = event.detail.enabled;
        console.log('[PlayerControl] 响度规格化开关变更:', enabled);
        toggleLoudnessNormalization(enabled);
    };
    window.addEventListener('loudness-normalization-change', handleLoudnessChange);

    // 初始化歌曲和播放状态
    const current_song = localStorage.getItem('current_song');
    if (current_song) {
        try {
            const savedSong = JSON.parse(current_song);
            currentSong.value = savedSong;

            // 如果有URL，恢复播放源
            if (savedSong.url) {
                if(savedSong.isLocal) return;
                console.log('[PlayerControl] 从缓存恢复音频源:', savedSong.url);
                audio.src = savedSong.url;
            } else {
                console.log('[PlayerControl] 缓存的歌曲没有URL');
            }
        } catch (error) {
            console.error('[PlayerControl] 解析保存的歌曲信息失败:', error);
        }
    } else {
        console.log('[PlayerControl] 没有缓存的歌曲信息');
    }

    // 初始化播放模式
    playbackMode.initPlaybackMode();

    // 初始化设置
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    if (settings) {
        lyricsBackground.value = settings?.lyricsBackground || 'on';
        lyricsFontSize.value = settings?.lyricsFontSize || '24px';
    }

    // 设置媒体会话
    mediaSession.initMediaSession({
        togglePlayPause,
        playPrevious: () => playSongFromQueue('previous'),
        playNext: () => playSongFromQueue('next'),
        seekBackward: (seekOffset) => {
            if (audio.currentTime > seekOffset) {
                audio.currentTime -= seekOffset;
            } else {
                audio.currentTime = 0;
            }
        },
        seekForward: (seekOffset) => {
            if (audio.currentTime + seekOffset < audio.duration) {
                audio.currentTime += seekOffset;
            } else {
                audio.currentTime = audio.duration;
            }
        },
        seekTo: (seekTime) => {
            if (seekTime >= 0 && seekTime <= audio.duration) {
                audio.currentTime = seekTime;
            }
        }
    });

    // 设置系统媒体快捷键
    setupMediaShortcuts();

    // 恢复播放进度
    if (current_song && localStorage.getItem('player_progress')) {
        const savedProgress = localStorage.getItem('player_progress');
        audio.currentTime = savedProgress;
        console.log('[PlayerControl] 恢复播放进度:', savedProgress);
        progressWidth.value = (audio.currentTime / currentSong.value.timeLength) * 100;
    }

    // 恢复播放速度设置
    const savedSpeed = localStorage.getItem('player_speed');
    if (savedSpeed) {
        currentSpeed.value = parseFloat(savedSpeed);
        setPlaybackRate(currentSpeed.value);
    }

    // 获取VIP
    getVip();

    // 添加事件监听
    document.addEventListener('keydown', handleKeyDown);

    // 设置特定于PlayerControl的监听器
    audio.addEventListener('pause', () => {
        playing.value = false;
        console.log('[PlayerControl] 暂停事件');
        // 暂停时清除SMTC位置状态
        mediaSession.clearPositionState();
        if (isElectron()) window.electron.ipcRenderer.send('play-pause-action', playing.value, audio.currentTime);
    });

    audio.addEventListener('play', () => {
        playing.value = true;
        console.log('[PlayerControl] 播放事件');
        if (!lyricsData.value.length) getCurrentLyrics();
        if (isElectron()) window.electron.ipcRenderer.send('play-pause-action', playing.value, audio.currentTime);
    });

    audio.addEventListener('error', (e) => {
        console.error('[PlayerControl] 音频错误:', e);
        if(audio.error?.code == 4){
            addSongToQueue(currentSong.value.hash, currentSong.value.name, currentSong.value.img, currentSong.value.author);
        }else{
            window.$modal.alert(t('yin-pin-jia-zai-shi-bai'));
        }
    });

    console.log('[PlayerControl] 音频初始化完成');
});

// 组件卸载清理
onUnmounted(() => {
    // 清除自动切换定时器
    clearAutoSwitchTimer();

    // 移除响度规格化事件监听
    window.removeEventListener('loudness-normalization-change', () => {});

    // 使用AudioController的销毁方法清理基本监听器
    audioController.destroy();

    // 清理组件特定的监听器
    audio.removeEventListener('pause', () => { });
    audio.removeEventListener('play', () => { });
    audio.removeEventListener('error', () => { });

    // 清理系统媒体快捷键
    if (isElectron()) {
        window.electron.ipcRenderer.removeAllListeners('play-previous-track');
        window.electron.ipcRenderer.removeAllListeners('play-next-track');
        window.electron.ipcRenderer.removeAllListeners('volume-up');
        window.electron.ipcRenderer.removeAllListeners('volume-down');
        window.electron.ipcRenderer.removeAllListeners('toggle-play-pause');
        window.electron.ipcRenderer.removeAllListeners('toggle-mute');
        window.electron.ipcRenderer.removeAllListeners('toggle-like');
        window.electron.ipcRenderer.removeAllListeners('toggle-mode');
    }

    // 清理键盘事件
    document.removeEventListener('keydown', handleKeyDown);
});

// 对外暴露接口
defineExpose({
    playing,
    addSongToQueue: async (hash, name, img, author) => {
        clearAutoSwitchTimer();

        console.log('[PlayerControl] 外部调用addSongToQueue:', name);
        audio.pause();
        playing.value = false;
        const result = await addSongToQueue(hash, name, img, author);
        if (result && result.song) {
            await playSong(result.song);
        } else if (result && result.shouldPlayNext) {
            console.log('[PlayerControl] 歌曲无法播放');
            handleAutoSwitch();
        }
        return result;
    },
    addLocalMusicToQueue: async (localSong) => {
        clearAutoSwitchTimer();

        console.log('[PlayerControl] 外部调用addLocalMusicToQueue:', localSong.name);
        audio.pause();
        playing.value = false;
        
        const result = await addLocalMusicToQueue(localSong);
        if (result && result.song) {
            await playSong(result.song);
            console.log('[PlayerControl] 本地音乐播放成功:', localSong.name);
            return { song: result.song };
        } else {
            console.error('[PlayerControl] 播放本地音乐失败');
            return { error: true };
        }
    },
    addLocalPlaylistToQueue: async (localSongs, append = false) => {
        console.log('[PlayerControl] 外部调用addLocalPlaylistToQueue:', localSongs.length, '首歌曲');
        
        const queueSongs = await addLocalPlaylistToQueue(localSongs, append);
        
        // 如果不是追加模式，自动播放第一首
        if (!append && queueSongs.length > 0) {
            let songIndex = 0;
            
            // 如果是随机播放模式，则随机选择一首歌曲
            if (currentPlaybackModeIndex.value == 0) {
                songIndex = Math.floor(Math.random() * queueSongs.length);
                console.log('[PlayerControl] 随机模式下添加本地歌单后随机播放:', queueSongs[songIndex].name);
            } else {
                console.log('[PlayerControl] 添加本地歌单后自动播放第一首:', queueSongs[0].name);
            }
            
            clearAutoSwitchTimer();
            audio.pause();
            playing.value = false;
            
            const result = await addLocalMusicToQueue(queueSongs[songIndex]);
            if (result && result.song) {
                await playSong(result.song);
            }
        }
        
        return queueSongs;
    },
    getPlaylistAllSongs,
    addPlaylistToQueue: async (info, append = false) => {
        const songs = await addPlaylistToQueue(info, append);
        if (songs && songs.length > 0 && !append) {
            // 根据播放模式决定播放哪首歌曲
            let songIndex = 0;

            // 如果是随机播放模式，则随机选择一首歌曲
            if (currentPlaybackModeIndex.value == 0) {
                songIndex = Math.floor(Math.random() * songs.length);
                console.log('[PlayerControl] 随机模式下添加歌单后随机播放:', songs[songIndex].name);
            } else {
                console.log('[PlayerControl] 添加歌单后自动播放第一首:', songs[0].name);
            }
            audio.pause();
            playing.value = false;
            // 播放选中的歌曲
            const result = await addSongToQueue(
                songs[songIndex].hash,
                songs[songIndex].name,
                songs[songIndex].img,
                songs[songIndex].author,
                true
            );
            if (result && result.song) {
                await playSong(result.song);
            }
        }
        return songs;
    },
    addToNext,
    addCloudMusicToQueue: async (hash, name, author, timeLength, cover) => {
        clearAutoSwitchTimer();

        console.log('[PlayerControl] 外部调用addCloudMusicToQueue:', name);
        audio.pause();
        playing.value = false;
        const result = await addCloudMusicToQueue(hash, name, author, timeLength, cover);
        if (result && result.song) {
            await playSong(result.song);
    } else if (result && result.shouldPlayNext) {
        console.log('[PlayerControl] 云盘歌曲无法播放');
        handleAutoSwitch();
        }
        return result;
    },
    addCloudPlaylistToQueue: async (songs, append = false) => {
        const queueSongs = await addCloudPlaylistToQueue(songs, append);
        if (queueSongs && queueSongs.length > 0 && !append) {
            // 根据播放模式决定播放哪首歌曲
            let songIndex = 0;

            // 如果是随机播放模式，则随机选择一首歌曲
            if (currentPlaybackModeIndex.value == 0) {
                songIndex = Math.floor(Math.random() * queueSongs.length);
                console.log('[PlayerControl] 随机模式下添加云盘歌单后随机播放:', queueSongs[songIndex].name);
            } else {
                console.log('[PlayerControl] 添加云盘歌单后自动播放第一首:', queueSongs[0].name);
            }

            // 播放选中的歌曲
            const result = await addCloudMusicToQueue(
                queueSongs[songIndex].hash,
                queueSongs[songIndex].name,
                queueSongs[songIndex].author,
                queueSongs[songIndex].timeLength,
                queueSongs[songIndex].cover,
                true
            );
            if (result && result.song) {
                await playSong(result.song);
            }
        }
        return queueSongs;
    },
    currentSong
});

// 从播放队列接收事件
const onQueueSongAdd = async (hash, name, img, author) => {
    clearAutoSwitchTimer();

    console.log('[PlayerControl] 从播放队列收到addSongToQueue事件:', name);
    audio.pause();
    playing.value = false;
    const result = await addSongToQueue(hash, name, img, author);
    if (result && result.song) {
        await playSong(result.song);
    } else if (result && result.shouldPlayNext) {
        console.log('[PlayerControl] 歌曲无法播放');
        handleAutoSwitch();
    }
};

const onQueueCloudSongAdd = async (hash, name, author, timeLength, cover) => {
    clearAutoSwitchTimer();

    console.log('[PlayerControl] 从播放队列收到addCloudMusicToQueue事件:', name);
    const result = await addCloudMusicToQueue(hash, name, author, timeLength, cover);
    if (result && result.song) {
        await playSong(result.song);
    } else if (result && result.shouldPlayNext) {
        console.log('[PlayerControl] 云盘歌曲无法播放');
        handleAutoSwitch();
    }
};

const onQueueLocalSongAdd = async (item) => {
    clearAutoSwitchTimer();
    audio.pause();
    playing.value = false;
    
    console.log('[PlayerControl] 从播放队列收到addLocalMusicToQueue事件:', item.name);
    const result = await addLocalMusicToQueue(item);
    if (result && result.song) {
        await playSong(result.song);
    } else if (result && result.shouldPlayNext) {
        console.log('[PlayerControl] 本地音乐无法播放');
        handleAutoSwitch();
    }
};
</script>

<style scoped>
@import '@/assets/style/PlayerControl.css';
</style>

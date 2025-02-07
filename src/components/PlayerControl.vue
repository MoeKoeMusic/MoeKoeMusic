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
            <div class="album-art" @click="toggleLyrics">
                <img v-if="currentSong.img" :src="currentSong.img" alt="Album Art" />
                <i v-else class="fas fa-music"></i>
            </div>
            <div class="song-info" @click="toggleLyrics">
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
                <button class="extra-btn" @click="toggleFavorite"><i class="fas fa-heart"></i></button>
                <button class="extra-btn" @click="togglePlaybackMode">
                    <i v-if="currentPlaybackModeIndex != '2'" :class="currentPlaybackMode.icon"
                        :title="currentPlaybackMode.title"></i>
                    <span v-else class="loop-icon" :title="currentPlaybackMode.title">
                        <i class="fas fa-repeat"></i>
                        <sup>1</sup>
                    </span>
                </button>
                <button class="extra-btn" @click="toggleQueue"><i class="fas fa-list"></i></button>
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


        <!-- 播放队列 -->
        <transition name="fade">
            <div v-if="showQueue" class="queue-popup">
                <div class="queue-header">
                    <h3>
                        <span>{{ $t('bo-fang-lie-biao') }}</span> ({{ musicQueueStore.queue.length }})
                        <i class="fas fa-trash-alt close-store" @click="musicQueueStore.clearQueue()" title="close"></i>
                    </h3>
                </div>

                <RecycleScroller :items="musicQueueStore.queue" :item-size="50" key-field="id" :buffer="200"
                    :items-limit="2000" :prerender="Math.min(10, musicQueueStore.queue.length)" ref="queueScroller"
                    class="queue-list">
                    <template #default="{ item, index }">
                        <li class="queue-item" :class="{ 'playing': currentSong.hash == item.hash }" :key="item.id">
                            <div class="queue-song-info">
                                <span class="queue-song-title">{{ item.name }}</span>
                                <span class="queue-artist">{{ $formatMilliseconds(item.timeLength) }}</span>
                            </div>
                            <div class="queue-actions">
                                <button v-if="currentSong.hash == item.hash"
                                    class="queue-play-btn fas fa-music"></button>
                                <template v-else>
                                    <button class="queue-play-btn" @click="addSongToQueue(
                                        item.hash,
                                        item.name,
                                        item.img,
                                        item.author
                                    )"><i class="fas fa-play"></i></button>
                                    <i class="fas fa-times close-store"
                                        @click="musicQueueStore.queue.splice(index, 1); $event.target.closest('li').classList.add('marked-as-deleted');"></i>
                                </template>
                            </div>
                        </li>
                    </template>
                </RecycleScroller>
            </div>
        </transition>
    </div>

    <!-- 全屏歌词界面 -->
    <transition name="slide-up">
        <div v-if="showLyrics" class="lyrics-bg"
            :style="(lyricsBackground == 'on' ? ({ backgroundImage: `url(${currentSong?.img || 'https://random.MoeJue.cn/randbg.php'})` }) : ({ background: 'var(--background-color)' }))">
            <div class="lyrics-screen">
                <div class="close-btn">
                    <i class="fas fa-chevron-down" @click="toggleLyrics"></i>
                </div>

                <div class="left-section">
                    <div class="album-art-large">
                        <img v-if="easterEggImage" :src="easterEggImage.src" :class="easterEggClass" alt="Easter Egg" />
                        <img :src="currentSong?.img || 'https://random.MoeJue.cn/randbg.php'" alt="Album Art" />
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
                        <button class="control-btn like-btn" @click="toggleFavorite">
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
                            <i v-if="currentPlaybackMode.mode !== 'loop_one'" :class="currentPlaybackMode.icon"
                                :title="currentPlaybackMode.title"></i>
                            <span v-else class="loop-icon" :title="currentPlaybackMode.title">
                                <i class="fas fa-repeat"></i>
                                <sup>1</sup>
                            </span>
                        </button>
                    </div>
                </div>
                <div id="lyrics-container">
                    <div v-if="lyricsData.length > 0" id="lyrics"
                        :style="{ transform: `translateY(${scrollAmount}px)` }">
                        <div v-for="(lineData, lineIndex) in lyricsData" :key="lineIndex" class="line">
                            <span v-for="(charData, charIndex) in lineData.characters" :key="charIndex" class="char"
                                :class="{ highlight: charData.highlighted }">
                                {{ charData.char }}
                            </span>
                        </div>
                    </div>
                    <div v-else class="no-lyrics">{{ SongTips }}</div>
                </div>
            </div>
        </div>
    </transition>

    <!-- 歌单选择模态框 -->
    <transition name="fade">
        <div v-if="isPlaylistSelectOpen" class="modal">
            <div class="modal-content">
                <h3>{{ t('shou-cang-dao') }}</h3>
                <ul class="playlist-select-list" v-if="playlists.length > 0">
                    <li v-for="playlist in playlists" 
                        :key="playlist.list_id" 
                        @click="addToPlaylist(playlist.listid, currentSong); closePlaylistSelect()">
                        {{ playlist.name }}
                    </li>
                </ul>
                <div v-else class="no-playlist">{{ t('mei-you-ge-dan') }}</div>
                <button class="close-btn-modal" @click="closePlaylistSelect">{{ t('guan-bi') }}</button>
            </div>
        </div>
    </transition>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, nextTick, watch } from 'vue';
import { RecycleScroller } from 'vue3-virtual-scroller';
import 'vue3-virtual-scroller/dist/vue3-virtual-scroller.css';
import { get } from '../utils/request';
import { ElMessage } from 'element-plus';
import { useMusicQueueStore } from '../stores/musicQueue';
import { MoeAuthStore } from '../stores/store';
import { useI18n } from 'vue-i18n';
const MoeAuth = MoeAuthStore();
const { t } = useI18n();
const showLyrics = ref(false); // 是否显示歌词
const isDragging = ref(false);
const showQueue = ref(false);
const currentSong = ref({ name: '', author: '', img: '', url: '', hash: '' }); // 当前播放的音乐信息
const playing = ref(false); // 是否正在播放
const isMuted = ref(false); // 是否静音
const volume = ref(66); // 音量初始值为 100
const audio = new Audio(); // 创建音频对象
const musicQueueStore = useMusicQueueStore(); // 使用 Pinia store
let sliderElement = null; // 用来保存音量滑块的 DOM 引用
const progressWidth = ref(0);
const lyricsData = ref([]);
const scrollAmount = ref(226);
const currentTime = ref(0);
const SongTips = ref(t('zan-wu-ge-ci'));
const lyricsBackground = ref('on');
let currentLineIndex = 0;
const queueScroller = ref(null);
const timeoutId = ref(null);
const playbackModes = ref([
    { icon: 'fas fa-random', title: t('sui-ji-bo-fang') },
    { icon: 'fas fa-refresh', title: t('lie-biao-xun-huan') },
    { icon: '', title: t('dan-qu-xun-huan') }
]);
const currentPlaybackModeIndex = ref(0);
const currentPlaybackMode = computed(() => playbackModes.value[currentPlaybackModeIndex.value]);
const isProgressDragging = ref(false);
const isDraggingHandle = ref(false);
const climaxPoints = ref([]);
const NextSong = ref([]);
const playlists = ref([]);
const isPlaylistSelectOpen = ref(false);

// 切换随机/顺序/单曲播放
const togglePlaybackMode = () => {
    currentPlaybackModeIndex.value = (currentPlaybackModeIndex.value + 1) % playbackModes.value.length;
    audio.loop = currentPlaybackModeIndex.value == 2;
    localStorage.setItem('player_playback_mode', currentPlaybackModeIndex.value);
};

const toggleFavorite = async () => {
    if (!currentSong.value.hash) {
        window.$modal.alert(t('mei-you-zheng-zai-bo-fang-de-ge-qu'));
        return;
    }
    try {
        const playlistResponse = await get('/user/playlist');
        if (playlistResponse.status !== 1) {
            window.$modal.alert(t('huo-qu-ge-dan-shi-bai'));
            return;
        }
        playlists.value = playlistResponse.data.info.filter(
            playlist => playlist.list_create_userid === MoeAuth.UserInfo.userid
        );
        isPlaylistSelectOpen.value = true;
    } catch (error) {
        window.$modal.alert(t('shou-cang-shi-bai'));
    }
};
const addToPlaylist = async (listid, song) => {
    try {
        await get(`/playlist/tracks/add?listid=${listid}&data=${encodeURIComponent(song.name.replace(',', ''))}|${song.hash}`);
        ElMessage.success({
            message: t('cheng-gong-tian-jia-dao-ge-dan'),
            duration: 2000
        });
    } catch (error) {
        ElMessage.error({
            message: t('tian-jia-dao-ge-dan-shi-bai'),
            duration: 2000
        })
    }
    closePlaylistSelect();
};
const closePlaylistSelect = () => {
    isPlaylistSelectOpen.value = false;
};

onMounted(() => {
    const savedVolume = localStorage.getItem('player_volume');
    if (savedVolume !== null) volume.value = parseFloat(savedVolume);
    isMuted.value = volume.value === 0;
    audio.volume = volume.value / 100;
    const current_song = localStorage.getItem('current_song');
    if (current_song) currentSong.value = JSON.parse(current_song);
    currentPlaybackModeIndex.value = localStorage.getItem('player_playback_mode') || 1;
    audio.loop = currentPlaybackModeIndex.value == 2;
    if (localStorage.getItem('settings')) {
        lyricsBackground.value = JSON.parse(localStorage.getItem('settings'))['lyricsBackground']
    }
    handleShortcut();
    if (current_song && localStorage.getItem('player_progress')) {
        audio.currentTime = localStorage.getItem('player_progress');
        progressWidth.value = (audio.currentTime / currentSong.value.timeLength) * 100;
    }
    initMediaSession();
});
const formattedCurrentTime = computed(() => formatTime(currentTime.value));
const formattedDuration = computed(() => formatTime(currentSong.value?.timeLength || 0));
const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};
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
// 播放音乐
const playSong = async (song) => {
    try {
        currentSong.value = structuredClone(song);
        lyricsData.value = [];
        audio.src = song.url;
        try {
            changeMediaSession(currentSong.value);
            await audio.play();
            playing.value = true;
        } catch (playError) {
            console.warn('播放被中断，尝试重新播放:', playError);
            setTimeout(async () => {
                try {
                    await audio.play();
                    playing.value = true;
                } catch (retryError) {
                    window.$modal.alert(t('bo-fang-shi-bai'));
                    playing.value = false;
                }
            }, 100);
        }

        localStorage.setItem('current_song', JSON.stringify(currentSong.value));
        getLyrics(currentSong.value.hash);
        if (MoeAuth.isAuthenticated && canRequestVip()) {
            try {
                await get('/youth/vip');
            } catch (error) {
                console.error('领取VIP失败:', error);
            }
        }
        getMusicHighlights(currentSong.value.hash);
    } catch (error) {
        console.error('播放音乐时发生错误:', error);
        playing.value = false;
    }
};

// 获取音乐高潮
const getMusicHighlights = async (hash) => {
    const response = await get(`/song/climax?hash=${hash}`);
    if (response.status !== 1) {
        climaxPoints.value = [];
        return;
    }
    climaxPoints.value = response.data.map(point => ({
        position: (parseInt(point.start_time) / 1000 / audio.duration) * 100,
        duration: parseInt(point.timelength) / 1000
    }));
};

// 从队列中播放歌曲
const playSongFromQueue = (direction) => {
    if (musicQueueStore.queue.length === 0) {
        window.$modal.alert(t('ni-huan-mei-you-tian-jia-ge-quo-kuai-qu-tian-jia-ba'));
        return;
    }

    if (direction == 'next') {
        if (NextSong.value.length > 0) {
            addSongToQueue(NextSong.value[0].hash, NextSong.value[0].name, NextSong.value[0].img, NextSong.value[0].author, NextSong.value[0].timeLength);
            NextSong.value.shift();
            return;
        }
    }

    const currentIndex = musicQueueStore.queue.findIndex(song => song.hash === currentSong.value.hash);
    let targetIndex;

    if (currentIndex == -1) {
        targetIndex = 0;
    } else if (currentPlaybackModeIndex.value == 0) {
        targetIndex = Math.floor(Math.random() * musicQueueStore.queue.length);
    } else {
        targetIndex = direction === 'previous'
            ? (currentIndex === 0 ? musicQueueStore.queue.length - 1 : currentIndex - 1)
            : (currentIndex + 1) % musicQueueStore.queue.length;
    }
    addSongToQueue(
        musicQueueStore.queue[targetIndex].hash,
        musicQueueStore.queue[targetIndex].name,
        musicQueueStore.queue[targetIndex].img,
        musicQueueStore.queue[targetIndex].author
    );
};

//切换小宠物显示状态
watch(showQueue, (newValue) => {
    const locationArrow = document.querySelector('.location-arrow');
    const scrollBottom = document.querySelector('.scroll-bottom-img');

    if (newValue) {
        locationArrow.style.zIndex = -1;
        scrollBottom.style.zIndex = -1;
    } else {
        locationArrow.style.zIndex = 90;
        scrollBottom.style.zIndex = 90;
    }
});

// 切换播放/暂停
const togglePlayPause = async () => {
    if (!currentSong.value.hash) {
        playSongFromQueue('next');
        return;
    } else if (!audio.src) {
        addSongToQueue(
            currentSong.value.hash,
            currentSong.value.name,
            currentSong.value.img,
            currentSong.value.author,
            false,
            false
        );
        return;
    }

    if (playing.value) {
        audio.pause();
        playing.value = false;
    } else {
        try {
            await audio.play();
            playing.value = true;
        } catch (retryError) {
            window.$modal.alert(t('bo-fang-shi-bai'));
        }
    }
};

// 切换静音
const toggleMute = () => {
    isMuted.value = !isMuted.value;
    audio.muted = isMuted.value;
    if (isMuted.value) {
        volume.value = 0;
    } else {
        volume.value = audio.volume * 100;
    }
    localStorage.setItem('player_volume', volume.value);
};

// 更新音量的点击处理函数
const setVolumeOnClick = (event) => {
    const slider = event.target.closest('.volume-slider');
    if (slider) {
        const sliderWidth = slider.offsetWidth;
        const offsetX = event.offsetX;
        volume.value = Math.round((offsetX / sliderWidth) * 100);
        changeVolume();
    }
};

// 开始拖拽时触发，初始化拖拽并实时更新音量
const onDragStart = (event) => {
    sliderElement = event.target.closest('.volume-slider');
    if (sliderElement) {
        isDragging.value = true;
        setVolumeOnClick(event);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onDragEnd);
    }
};

// 拖拽过程中的音量更新
const onDrag = (event) => {
    if (isDragging.value && sliderElement) {
        const sliderWidth = sliderElement.offsetWidth;
        const rect = sliderElement.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const newVolume = Math.max(0, Math.min(100, Math.round((offsetX / sliderWidth) * 100)));
        volume.value = newVolume;
        changeVolume();
    }
};

const onDragEnd = () => {
    isDragging.value = false;
    sliderElement = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', onDragEnd);
};

// 音量调节
const changeVolume = () => {
    audio.volume = volume.value / 100;
    localStorage.setItem('player_volume', volume.value);
    isMuted.value = volume.value === 0;
};

// 获取歌单全部歌曲
const getPlaylistAllSongs = async (id) => {
    try {
        let allSongs = [];
        for (let page = 1; page <= 4; page++) {
            const url = `/playlist/track/all?id=${id}&pagesize=300&page=${page}`;
            const response = await get(url);
            if (response.status !== 1) {
                window.$modal.alert(t('huo-qu-ge-dan-shi-bai'));
                return;
            }
            if (Object.keys(response.data.info).length === 0) break;
            allSongs = allSongs.concat(response.data.info);
            if (response.data.info.length < 300) break;
        }
        addPlaylistToQueue(allSongs);
    } catch (error) {
        console.error(error);
        window.$modal.alert(t('huo-qu-ge-dan-shi-bai'));
    }
}

// 添加歌单到播放列表
const addPlaylistToQueue = async (info) => {
    musicQueueStore.clearQueue();
    const songs = info.map((song, index) => {
        return {
            id: index + 1,
            hash: song.hash,
            name: song.name,
            img: song.cover?.replace("{size}", 480) || './assets/images/ico.png',
            author: song.author,
            timeLength: song.timelen
        };
    });
    musicQueueStore.queue = songs;
    let startIndex = 0;
    if (currentPlaybackModeIndex.value == 0) {
        startIndex = Math.floor(Math.random() * songs.length);
    }
    addSongToQueue(songs[startIndex].hash, songs[startIndex].name, songs[startIndex].img, songs[startIndex].author);
};

// 添加歌曲到队列并播放的方法
const addSongToQueue = async (hash, name, img, author, free = true, isReset = true) => {
    const currentSongHash = currentSong.value.hash;
    try {
        clearTimeout(timeoutId.value);
        currentSong.value.author = author;
        currentSong.value.name = name;
        currentSong.value.img = img;
        currentSong.value.hash = hash;
        const url = `/song/url?hash=${hash}${free ? '&free_part=1' : ''}`;
        const response = await get(url);
        if (response.status !== 1) {
            currentSong.value.author = currentSong.value.name = t('huo-qu-yin-le-shi-bai');
            if (response.status == 3) {
                currentSong.value.name = t('gai-ge-qu-zan-wu-ban-quan')
            }
            if (musicQueueStore.queue.length === 0) return;
            currentSong.value.author = t('3-miao-hou-zi-dong-qie-huan-xia-yi-shou');
            timeoutId.value = setTimeout(() => {
                playSongFromQueue('next');
            }, 3000);
            return;
        }

        if (response.extName == 'mp4') {
            addSongToQueue(hash, name, img, author, false);
            return;
        }
        
        if (isReset) {
            localStorage.setItem('player_progress', 0);
            audio.currentTime = progressWidth.value = 0;
        }

        const existingSongIndex = musicQueueStore.queue.findIndex(song => song.hash === hash);

        if (existingSongIndex === -1) {
            const song = {
                id: musicQueueStore.queue.length + 1,
                hash: hash,
                name: name,
                img: img,
                author: author,
                timeLength: response.timeLength,
                url: response.url[0]
            };

            const currentIndex = musicQueueStore.queue.findIndex(song => song.hash == currentSongHash);
            if (currentIndex !== -1) {
                musicQueueStore.queue.splice(currentIndex + 1, 0, song);
            } else {
                musicQueueStore.addSong(song);
            }
            playSong(song);
        } else {
            const updatedQueue = [...musicQueueStore.queue];
            const newSong = {
                id: musicQueueStore.queue[existingSongIndex].id,
                hash: hash,
                name: name,
                img: img,
                author: author,
                timeLength: response.timeLength,
                url: response.url[0]
            };
            updatedQueue[existingSongIndex] = newSong;
            musicQueueStore.setQueue(updatedQueue);
            playSong(newSong);
        }
    } catch (error) {
        currentSong.value.author = currentSong.value.name = t('huo-qu-yin-le-di-zhi-shi-bai');
        if (musicQueueStore.queue.length === 0) return;
        currentSong.value.author = t('3-miao-hou-zi-dong-qie-huan-xia-yi-shou');
        timeoutId.value = setTimeout(() => {
            playSongFromQueue('next');
        }, 3000);
    }
};

// 音乐播放结束后自动播放下一首
audio.addEventListener('ended', () => {
    if (currentPlaybackModeIndex.value == 2) return;
    playSongFromQueue('next');
});
const handleAudioEvent = (event) => {
    playing.value = event.type === 'play';
    if(isElectron()){
        window.electron.ipcRenderer.send('play-pause-action', playing.value);
    }
};

audio.addEventListener('pause', handleAudioEvent);
audio.addEventListener('play', handleAudioEvent);
const toggleQueue = async () => {
    showQueue.value = !showQueue.value;
    if (showQueue.value) {
        await nextTick();
        setTimeout(() => {
            const currentIndex = musicQueueStore.queue.findIndex(song => song.hash === currentSong.value.hash);
            queueScroller.value.scrollToItem(currentIndex - 3);
        }, 100);
    }
};

const toggleLyrics = async () => {
    showLyrics.value = !showLyrics.value;
    SongTips.value = t('huo-qu-ge-ci-zhong');
    if (!currentSong.value) return;
    try {
        if (lyricsData.value.length != 0) return;
        getLyrics(currentSong.value.hash)
    } catch (error) {
        SongTips.value = t('huo-qu-ge-ci-shi-bai');
    }
};

// 请求歌词
const getLyrics = async (hash) => {
    const savedConfig = JSON.parse(localStorage.getItem('settings'));
    if (!showLyrics.value && savedConfig?.desktopLyrics === 'off') return;
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
    centerFirstLine();
}

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

// 添加到下一首 
const addToNext = async (hash, name, img, author, timeLength) => {
    const currentIndex = musicQueueStore.queue.findIndex(song => song.hash === currentSong.value.hash);
    musicQueueStore.queue.splice(currentIndex !== -1 ? currentIndex + 1 : musicQueueStore.queue.length, 0, {
        id: musicQueueStore.queue.length + 1,
        hash: hash,
        name: name,
        img: img,
        author: author,
        timeLength: timeLength,
    });
    NextSong.value.push({
        id: musicQueueStore.queue.length + 1,
        hash: hash,
        name: name,
        img: img,
        author: author,
        timeLength: timeLength,
    });
};
const centerFirstLine = () => {
    const lyricsContainer = document.getElementById('lyrics-container');
    if (!lyricsContainer) return;
    const containerHeight = lyricsContainer.offsetHeight;
    const lyricsElement = document.getElementById('lyrics');
    if (!lyricsElement) return;
    const lyricsHeight = lyricsElement.offsetHeight;
    scrollAmount.value = (containerHeight - lyricsHeight) / 2;
};
const throttle = (func, delay) => {
    let lastTime = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastTime >= delay) {
            lastTime = now;
            func.apply(this, args);
        }
    };
};
// 监听方法
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
                scrollAmount.value = -lineElement.offsetTop + (containerHeight / 2) - (lineHeight / 2); // 计算中心位置
            }
        }
    });
};
// 节流处理
const throttledHighlight = throttle(() => {
    currentTime.value = audio.currentTime; // 实时更新当前时间
    if (!isProgressDragging.value) {  // 只在非拖动状态更新进度条
        progressWidth.value = (currentTime.value / audio.duration) * 100;
    }
    const savedConfig = JSON.parse(localStorage.getItem('settings'));
    if (audio && lyricsData.value) {
        if (showLyrics.value) {
            highlightCurrentChar(audio.currentTime);
        }
        if (isElectron() && savedConfig?.desktopLyrics === 'on') {
            window.electron.ipcRenderer.send('lyrics-data', { currentTime: audio.currentTime, lyricsData: JSON.parse(JSON.stringify(lyricsData.value)) });
        }
    } else if (isElectron() && savedConfig?.desktopLyrics === 'on') {
        getLyrics(currentSong.value.hash)
    }
    localStorage.setItem('player_progress', audio.currentTime);
}, 200);
// 启动监听
audio.addEventListener('timeupdate', throttledHighlight);

defineExpose({
    addSongToQueue,
    getPlaylistAllSongs,
    addPlaylistToQueue,
    addToNext,
    currentSong
});

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    if (isElectron()) {
        window.electron.ipcRenderer.removeAllListeners('play-previous-track');
        window.electron.ipcRenderer.removeAllListeners('play-next-track');
        window.electron.ipcRenderer.removeAllListeners('volume-up');
        window.electron.ipcRenderer.removeAllListeners('volume-down');
        window.electron.ipcRenderer.removeAllListeners('toggle-play-pause');
        window.electron.ipcRenderer.removeAllListeners('toggle-mute');
    }
});
const isElectron = () => {
    return typeof window !== 'undefined' && typeof window.electron !== 'undefined';
};
const handleClickOutside = (event) => {
    const queuePopup = document.querySelector('.queue-popup');
    if (queuePopup && !queuePopup.contains(event.target) && !event.target.closest('.extra-btn')) {
        showQueue.value = false;
    }
};
const handleVolumeScroll = (event) => {
    event.preventDefault();
    const delta = Math.sign(event.deltaY) * -1;
    volume.value = Math.min(Math.max(volume.value + delta * 10, 0), 100);
    changeVolume();
};
const canRequestVip = () => {
    const lastRequestTime = localStorage.getItem('lastVipRequestTime');
    if (lastRequestTime) {
        const now = new Date().getTime();
        const elapsedTime = now - parseInt(lastRequestTime);
        const threeHours = 3 * 60 * 60 * 1000;
        if (elapsedTime < threeHours) {
            return false;
        }
    }
    localStorage.setItem('lastVipRequestTime', new Date().getTime().toString());
    return true;
}

const handleShortcut = (event) => {
    if (isElectron()) {
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
        window.electron.ipcRenderer.on('toggle-play-pause', () => {
            togglePlayPause();
        });
        window.electron.ipcRenderer.on('toggle-mute', () => {
            toggleMute();
        });
    }
}

// 修改进度条拖动
const onProgressDragStart = (event) => {
    event.preventDefault();

    const currentProgressBar = event.target.closest('.progress-bar');
    if (!currentProgressBar) return;

    // 检查是否点击在小圆点上
    const handle = event.target.closest('.progress-handle');
    if (!handle) {
        if (!audio.duration) return;
        const rect = currentProgressBar.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(event.clientX - rect.left, currentProgressBar.offsetWidth));
        const percentage = (offsetX / currentProgressBar.offsetWidth) * 100;
        progressWidth.value = Math.max(0, Math.min(percentage, 100));
    }

    isProgressDragging.value = true;
    isDraggingHandle.value = true;

    activeProgressBar.value = currentProgressBar;

    document.addEventListener('mousemove', onProgressDrag);
    document.addEventListener('mouseup', onProgressDragEnd);
};

// 添加一个 ref 来保存当前活动的进度条元素
const activeProgressBar = ref(null);

const onProgressDrag = (event) => {
    event.preventDefault();
    if (isProgressDragging.value && activeProgressBar.value) {
        const rect = activeProgressBar.value.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(event.clientX - rect.left, activeProgressBar.value.offsetWidth));
        const percentage = (offsetX / activeProgressBar.value.offsetWidth) * 100;
        progressWidth.value = Math.max(0, Math.min(percentage, 100));

        // 更新时间提示
        tooltipPosition.value = offsetX;
        const time = (percentage / 100) * audio.duration;
        tooltipTime.value = formatTime(time);
    }
};

// 重置歌词高亮
const resetLyricsHighlight = (currentTimeInSeconds) => {
    if (!lyricsData.value) return;

    // 重置所有字符的高亮状态
    lyricsData.value.forEach((lineData, lineIndex) => {
        lineData.characters.forEach(charData => {
            charData.highlighted = (currentTimeInSeconds * 1000 >= charData.startTime);
        });

        // 找到当前应该显示的行
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

const onProgressDragEnd = (event) => {
    if (isProgressDragging.value && activeProgressBar.value) {
        const rect = activeProgressBar.value.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(event.clientX - rect.left, activeProgressBar.value.offsetWidth));
        const percentage = (offsetX / activeProgressBar.value.offsetWidth) * 100;
        const newTime = (percentage / 100) * audio.duration;

        audio.currentTime = Math.max(0, Math.min(newTime, audio.duration));
        resetLyricsHighlight(audio.currentTime);
    }
    isProgressDragging.value = false;
    isDraggingHandle.value = false;
    showTimeTooltip.value = false;
    activeProgressBar.value = null;
    document.removeEventListener('mousemove', onProgressDrag);
    document.removeEventListener('mouseup', onProgressDragEnd);
};

// 修改点击进度条的处理方法
const updateProgressFromEvent = (event) => {
    if (isProgressDragging.value) return; // 如果正在拖动则不处理点击

    const progressBar = event.target.closest('.progress-bar');
    if (!progressBar || !audio.duration) return;

    const rect = progressBar.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(event.clientX - rect.left, progressBar.offsetWidth));
    const percentage = (offsetX / progressBar.offsetWidth) * 100;
    const newTime = (percentage / 100) * audio.duration;

    audio.currentTime = Math.max(0, Math.min(newTime, audio.duration));
    progressWidth.value = percentage;
    resetLyricsHighlight(audio.currentTime);
};

// 在进度条模板中添加时间提示
const showTimeTooltip = ref(false);
const tooltipPosition = ref(0);
const tooltipTime = ref('0:00');

const updateTimeTooltip = (event) => {
    const progressBar = event.target.closest('.progress-bar');
    if (!progressBar || !audio.duration) return;

    const rect = progressBar.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(event.clientX - rect.left, progressBar.offsetWidth));
    
    const tooltipWidth = 50;
    if (offsetX < tooltipWidth / 2) {
        tooltipPosition.value = tooltipWidth / 2;
    } else if (offsetX > progressBar.offsetWidth - tooltipWidth / 2) {
        tooltipPosition.value = progressBar.offsetWidth - tooltipWidth / 2;
    } else {
        tooltipPosition.value = offsetX;
    }

    const percentage = (offsetX / progressBar.offsetWidth);
    const time = percentage * audio.duration;
    tooltipTime.value = formatTime(time);

    showTimeTooltip.value = true;
};

const hideTimeTooltip = () => {
    if (!isProgressDragging.value) {
        showTimeTooltip.value = false;
    }
};

const initMediaSession = () => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession) return;
    navigator.mediaSession.setActionHandler('play', togglePlayPause);
    navigator.mediaSession.setActionHandler('pause', togglePlayPause);
    navigator.mediaSession.setActionHandler('previoustrack', () => {
        playSongFromQueue('previous');
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
        playSongFromQueue('next');
    });
};

const changeMediaSession = (song) => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession) return;

    const defaultArtwork = './assets/images/logo.png';
    const checkImageAccessibility = (src) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => resolve(defaultArtwork);
            img.src = src;
        });
    };

    const updateMediaSession = async () => {
        try {
            const artworkSrc = await checkImageAccessibility(song.img || defaultArtwork);
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.name,
                artist: song.author,
                album: song.album,
                artwork: [{ src: artworkSrc }]
            });
        } catch (error) {
            console.error("Failed to update media session metadata:", error);
        }
    };
    updateMediaSession();
};
</script>


<style scoped>
@import '@/assets/style/PlayerControl.css';
</style>
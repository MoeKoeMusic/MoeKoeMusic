<template>
    <div class="recognize-page">
        <div class="recognize-decor" aria-hidden="true">
            <i class="decor-note fas fa-music note-a"></i>
            <i class="decor-note fas fa-headphones note-b"></i>
            <i class="decor-note fas fa-volume-up note-c"></i>
            <span class="decor-ring ring-b"></span>
        </div>
        <section class="recognize-panel">
            <div class="recognize-head">
                <h2>听歌识曲</h2>
                <div v-if="!matches.length" class="status-text-wrap">
                    <transition name="status-text" mode="out-in">
                        <p :key="statusText">{{ statusText }}</p>
                    </transition>
                </div>
            </div>

            <div v-if="matches.length" class="recognize-results">
                <div
                    class="result-carousel"
                    :class="{ dragging: isDragging }"
                    @pointerdown="startDrag"
                    @pointermove="moveDrag"
                    @pointerup="endDrag"
                    @pointercancel="cancelDrag"
                    @pointerleave="endDrag"
                >
                    <div
                        class="card-track"
                        :class="{
                            dragging: isDragging,
                            resetting: isResetting,
                            'drag-next': isDragging && dragOffset < -6,
                            'drag-previous': isDragging && dragOffset > 6,
                            'slide-next': isSliding && switchDirection === 'next',
                            'slide-previous': isSliding && switchDirection === 'previous'
                        }"
                        :style="{ '--drag-x': `${dragOffset}px`, '--drag-tilt': `${dragProgress * -5}deg` }"
                    >
                        <div
                            v-for="item in carouselItems"
                            :key="item.key"
                            class="carousel-card"
                            :class="item.class"
                            @click="item.onClick?.()"
                        >
                            <img :src="item.match.song.Image" alt="">
                            <span class="hero-shade"></span>
                            <button class="hero-play card-action" type="button" title="播放" @click.stop="playSong(item.match.song)">
                                <i class="fas fa-play"></i>
                            </button>
                            <span class="hero-info">
                                <strong>{{ item.match.song.SongName }}</strong>
                                <small>{{ item.match.song.SingerName }}</small>
                                <em v-if="item.match.song.AlbumName">{{ item.match.song.AlbumName }}</em>
                            </span>
                            <span class="hero-tools">
                                <button class="card-action" type="button" title="加入歌单" @click.stop="addSelectedToPlaylist(item.match.song)">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <button class="card-action" type="button" title="播放" @click.stop="playSong(item.match.song)">
                                    <i class="fas fa-play"></i>
                                </button>
                                <button class="card-action" type="button" title="加入收藏" @click.stop="likeSelectedSong(item.match.song)">
                                    <i class="far fa-heart"></i>
                                </button>
                                <button class="card-action" type="button" title="搜索" @click.stop="searchSelectedMatch(item.match.song)">
                                    <i class="fas fa-search"></i>
                                </button>
                            </span>
                        </div>
                    </div>
                </div>
                <div v-if="matches.length > 1" class="result-dots">
                    <button
                        v-for="(_, index) in matches"
                        :key="index"
                        type="button"
                        :class="{ active: selectedIndex === index }"
                        @click="selectIndex(index)"
                    ></button>
                </div>
            </div>

            <div v-else class="recognize-capture">
                <button
                    class="record-button"
                    :class="{ recording: status === 'recording', waiting: status === 'recognizing' }"
                    :disabled="status === 'recognizing'"
                    type="button"
                    @click="toggleRecording"
                >
                    <i :class="status === 'recording' ? 'fas fa-stop' : 'fas fa-microphone'"></i>
                </button>
                <div class="source-row">
                    <button
                        class="source-button"
                        :class="{ active: source === 'mic' }"
                        :disabled="isBusy"
                        type="button"
                        @click="source = 'mic'"
                    >
                        <i class="fas fa-microphone"></i>
                        麦克风
                    </button>
                    <button
                        class="source-button"
                        :class="{ active: source === 'system' }"
                        :disabled="isBusy"
                        type="button"
                        @click="source = 'system'"
                    >
                        <i class="fas fa-volume-up"></i>
                        系统音频
                    </button>
                </div>
                <label class="device-select" :class="{ hidden: source !== 'mic' }">
                    <i class="fas fa-microphone-alt"></i>
                    <select v-model="selectedMicId" :disabled="isBusy || !micDevices.length">
                        <option value="">默认麦克风</option>
                        <option v-for="device in micDevices" :key="device.deviceId" :value="device.deviceId">
                            {{ device.label || '麦克风' }}
                        </option>
                    </select>
                </label>
            </div>

            <div class="recognize-actions">
                <button v-if="matches.length || status === 'failed'" type="button" @click="reset">
                    <span v-if="matches.length">没有找到满意的结果？</span>
                    重新识别
                </button>
            </div>
        </section>
        <PlaylistSelectModal ref="playlistSelect" :current-song="playlistSong" />
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { recognizeAudio } from '@/utils/recognize';
import PlaylistSelectModal from '@/components/PlaylistSelectModal.vue';

const props = defineProps({
    playerControl: Object
});

const SAMPLE_RATE = 8000;
const MAX_SECONDS = 10;
const DRAG_THRESHOLD = 48;
const MAX_DRAG_OFFSET = 340;
const SLIDE_MS = 420;

const router = useRouter();
const source = ref('mic');
const status = ref('idle');
const matches = ref([]);
const errorMsg = ref('');
const seconds = ref(0);
const selectedIndex = ref(0);
const switchDirection = ref('next');
const dragOffset = ref(0);
const dragProgress = computed(() => dragOffset.value / MAX_DRAG_OFFSET);
const isDragging = ref(false);
const isSliding = ref(false);
const isResetting = ref(false);
const playlistSelect = ref(null);
const playlistSong = ref({});
const micDevices = ref([]);
const selectedMicId = ref('');

let recorder = null;
let chunks = [];
let timer = null;
let dragStartX = 0;
let dragPointerId = null;
let slideTimer = null;
let resetFrame = null;
let hasDragged = false;
let ignoreClickUntil = 0;

const isBusy = computed(() => status.value === 'recording' || status.value === 'recognizing');

const statusText = computed(() => {
    if (status.value === 'recording') return `正在聆听... ${seconds.value}s`;
    if (status.value === 'recognizing') return '识别中，请稍候...';
    if (status.value === 'failed') return errorMsg.value || '未识别到歌曲';
    return source.value === 'mic' ? '靠近音源后点击麦克风' : '选择共享带声音的屏幕或窗口';
});

const stopTracks = (stream) => stream?.getTracks().forEach(track => track.stop());

const clearTimer = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
};

const loadMicDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    micDevices.value = devices.filter(device => device.kind === 'audioinput');
    if (selectedMicId.value && !micDevices.value.some(device => device.deviceId === selectedMicId.value)) {
        selectedMicId.value = '';
    }
};

const selectedMatch = computed(() => matches.value[selectedIndex.value] || matches.value[0]);

const getMatchKey = (match, index) => getSongHash(match?.song) || `${match?.song?.SongName || 'song'}-${index}`;
const loopIndex = offset => (selectedIndex.value + offset + matches.value.length) % matches.value.length;

const clearSlideTimer = () => {
    if (!slideTimer) return;
    clearTimeout(slideTimer);
    slideTimer = null;
};

const endReset = () => {
    resetFrame = requestAnimationFrame(() => {
        resetFrame = requestAnimationFrame(() => {
            isResetting.value = false;
            resetFrame = null;
        });
    });
};

const slideTo = (direction, targetIndex) => {
    if (matches.value.length <= 1) return;
    if (isSliding.value) return;
    clearSlideTimer();
    switchDirection.value = direction;
    isSliding.value = true;
    slideTimer = setTimeout(() => {
        selectedIndex.value = targetIndex;
        isResetting.value = true;
        isSliding.value = false;
        dragOffset.value = 0;
        clearSlideTimer();
        endReset();
    }, SLIDE_MS);
};

const selectPrevious = () => {
    slideTo('previous', (selectedIndex.value - 1 + matches.value.length) % matches.value.length);
};

const selectNext = () => {
    slideTo('next', (selectedIndex.value + 1) % matches.value.length);
};

const clickPrevious = () => {
    if (Date.now() < ignoreClickUntil) return;
    selectPrevious();
};

const clickNext = () => {
    if (Date.now() < ignoreClickUntil) return;
    selectNext();
};

const carouselItems = computed(() => {
    if (!selectedMatch.value) return [];
    if (matches.value.length === 1) {
        return [{
            key: `current-${getMatchKey(selectedMatch.value, selectedIndex.value)}`,
            match: selectedMatch.value,
            class: 'hero-card',
        }];
    }

    return [
        { offset: -2, role: 'far-left', class: 'far-card far-left-card' },
        { offset: -1, role: 'previous', class: 'side-card left-card', onClick: clickPrevious },
        { offset: 0, role: 'current', class: 'hero-card' },
        { offset: 1, role: 'next', class: 'side-card right-card', onClick: clickNext },
        { offset: 2, role: 'far-right', class: 'far-card far-right-card' },
    ].map(item => {
        const index = loopIndex(item.offset);
        const match = matches.value[index];
        return {
            ...item,
            key: `${item.role}-${getMatchKey(match, index)}`,
            match,
        };
    });
});

const selectIndex = (index) => {
    if (index === selectedIndex.value) return;
    slideTo(index > selectedIndex.value ? 'next' : 'previous', index);
};

const startDrag = (event) => {
    if (matches.value.length <= 1) return;
    if (isSliding.value) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest('.card-action, select')) return;
    dragPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragOffset.value = 0;
    isDragging.value = true;
    hasDragged = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
};

const moveDrag = (event) => {
    if (!isDragging.value || event.pointerId !== dragPointerId) return;
    const delta = event.clientX - dragStartX;
    dragOffset.value = Math.max(-MAX_DRAG_OFFSET, Math.min(MAX_DRAG_OFFSET, delta));
    if (Math.abs(delta) > 6) hasDragged = true;
    if (Math.abs(delta) > 4) event.preventDefault();
};

const endDrag = (event) => {
    if (!isDragging.value || event.pointerId !== dragPointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const offset = dragOffset.value;
    isDragging.value = false;
    dragPointerId = null;
    if (hasDragged) ignoreClickUntil = Date.now() + 260;
    if (Math.abs(offset) < DRAG_THRESHOLD) {
        dragOffset.value = 0;
        return;
    }
    offset < 0 ? selectNext() : selectPrevious();
};

const cancelDrag = (event) => {
    if (!isDragging.value) return;
    if (event?.pointerId === dragPointerId) event.currentTarget.releasePointerCapture?.(event.pointerId);
    isDragging.value = false;
    dragPointerId = null;
    dragOffset.value = 0;
};

const decodeToPCM = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const decodeContext = new AudioContext();
    const audioBuffer = await decodeContext.decodeAudioData(arrayBuffer);
    await decodeContext.close();

    const length = Math.ceil(audioBuffer.duration * SAMPLE_RATE);
    const offlineContext = new OfflineAudioContext(1, length, SAMPLE_RATE);
    const sourceNode = offlineContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(offlineContext.destination);
    sourceNode.start();

    const rendered = await offlineContext.startRendering();
    const samples = rendered.getChannelData(0);
    const pcm = new Int16Array(samples.length);

    for (let i = 0; i < samples.length; i++) {
        const sample = Math.max(-1, Math.min(1, samples[i]));
        pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    return pcm.buffer;
};

const getMicStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            deviceId: selectedMicId.value ? { exact: selectedMicId.value } : undefined,
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
        },
    });
    loadMicDevices();
    return stream;
};

const getSystemStream = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('当前环境不支持系统音频捕获');

    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    stream.getVideoTracks().forEach(track => {
        track.stop();
        stream.removeTrack(track);
    });
    if (!stream.getAudioTracks().length) throw new Error('未获取到系统音频，请选择共享声音');
    return stream;
};

const recognizeBlob = async (stream) => {
    if (!chunks.length) {
        stopTracks(stream);
        status.value = 'failed';
        errorMsg.value = '未录制到音频';
        return;
    }

    status.value = 'recognizing';
    try {
        const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
        const pcm = await decodeToPCM(blob);
        const result = await recognizeAudio(pcm);
        matches.value = result;
        selectedIndex.value = 0;
        status.value = result.length ? 'success' : 'failed';
        errorMsg.value = result.length ? '' : '未识别到歌曲，请靠近音源重试';
    } catch (error) {
        console.error('识曲失败:', error);
        status.value = 'failed';
        errorMsg.value = '识别过程出错';
    } finally {
        stopTracks(stream);
    }
};

const startRecording = async () => {
    if (isBusy.value) return;
    if (!navigator.mediaDevices?.getUserMedia) {
        status.value = 'failed';
        errorMsg.value = '当前环境不支持录音';
        return;
    }

    status.value = 'recording';
    matches.value = [];
    selectedIndex.value = 0;
    errorMsg.value = '';
    seconds.value = 0;
    chunks = [];

    try {
        let stream = null;
        stream = source.value === 'system' ? await getSystemStream() : await getMicStream();
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = event => {
            if (event.data.size) chunks.push(event.data);
        };
        recorder.onstop = () => {
            clearTimer();
            void recognizeBlob(stream);
        };
        recorder.start(500);
        timer = setInterval(() => {
            seconds.value += 1;
            if (seconds.value >= MAX_SECONDS) stopRecording();
        }, 1000);
    } catch (error) {
        stopTracks(recorder?.stream);
        clearTimer();
        status.value = 'failed';
        errorMsg.value = error instanceof Error ? error.message : '无法访问音频输入';
    }
};

const stopRecording = (shouldRecognize = true) => {
    clearTimer();
    if (!recorder || recorder.state === 'inactive') return;
    if (!shouldRecognize) {
        const stream = recorder.stream;
        recorder.onstop = () => stopTracks(stream);
    }
    recorder.stop();
};

const toggleRecording = () => {
    if (status.value === 'recording') stopRecording();
    else startRecording();
};

const reset = () => {
    stopRecording();
    cancelDrag();
    clearSlideTimer();
    isSliding.value = false;
    isResetting.value = false;
    dragOffset.value = 0;
    status.value = 'idle';
    matches.value = [];
    selectedIndex.value = 0;
    errorMsg.value = '';
    seconds.value = 0;
};

const getSongHash = song => song?.HQFileHash || song?.SQFileHash || song?.FileHash;

const toPlayerSong = song => ({
    hash: getSongHash(song),
    name: song?.SongName,
    img: song?.Image,
    author: song?.SingerName,
});

const playSong = song => {
    const playerSong = toPlayerSong(song);
    if (!playerSong.hash) return;
    props.playerControl?.addSongToQueue(
        playerSong.hash,
        playerSong.name,
        playerSong.img,
        playerSong.author
    );
};

const addSelectedToPlaylist = (sourceSong = selectedMatch.value?.song) => {
    const song = toPlayerSong(sourceSong);
    if (!song.hash) return;
    playlistSong.value = song;
    playlistSelect.value?.fetchPlaylists();
};

const likeSelectedSong = (sourceSong = selectedMatch.value?.song) => {
    const song = toPlayerSong(sourceSong);
    if (!song.hash) return;
    playlistSong.value = song;
    playlistSelect.value?.toLike();
};

const searchSelectedMatch = (sourceSong = selectedMatch.value?.song) => {
    const song = sourceSong;
    if (!song) return;
    router.push({ path: '/search', query: { q: `${song.SongName} ${song.SingerName}` } });
};

onBeforeUnmount(() => {
    cancelDrag();
    clearSlideTimer();
    if (resetFrame) cancelAnimationFrame(resetFrame);
    stopRecording(false);
});

onMounted(() => loadMicDevices());
</script>

<style lang="scss" scoped>
.recognize-page {
    min-height: calc(100vh - 230px);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow-x: clip;
    position: relative;
    background-image: url('/assets/images/recognize-bg.png');
    background-repeat: no-repeat;
    background-size: 35% auto;
    background-position: left bottom;
}

.recognize-decor {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
}

.decor-note,
.decor-ring {
    position: absolute;
    color: rgba(var(--primary-color-rgb), 0.26);
    opacity: 0.9;
    filter: blur(0.2px);
    animation-timing-function: ease-in-out;
}

.decor-note {
    --note-size: 30px;
    font-size: var(--note-size);
    animation-name: recognize-note-float;
    animation-iteration-count: infinite;
    animation-fill-mode: both;
}

.note-a {
    left: 9%;
    top: 12%;
    animation-duration: 12s;
    animation-delay: -1.2s;
}

.note-b {
    left: 23%;
    top: 58%;
    animation-duration: 9.5s;
    animation-delay: -3.6s;
}

.note-c {
    right: 18%;
    top: 18%;
    animation-duration: 14s;
    animation-delay: -7.8s;
}

.decor-ring {
    border: 1px solid rgba(var(--primary-color-rgb), 0.22);
    border-radius: 50%;
    animation-name: recognize-ring-rotate;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
    --ring-scale: 1;
    transform: scale(var(--ring-scale));
}

.ring-b {
    width: 150px;
    height: 150px;
    right: 8%;
    top: 58%;
    animation-duration: 28s;
    animation-direction: reverse;
}

.recognize-panel {
    position: relative;
    z-index: 1;
    width: min(720px, 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
}

.recognize-head {
    text-align: center;

    h2 {
        margin: 0;
        color: var(--text-color);
        font-size: 28px;
    }

    .status-text-wrap {
        min-height: 22px;
    }

    p {
        margin: 0;
        color: #666;
        font-size: 15px;
        line-height: 22px;
    }
}

.status-text-enter-active,
.status-text-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
}

.status-text-enter-from {
    opacity: 0;
    transform: translateY(5px);
}

.status-text-leave-to {
    opacity: 0;
    transform: translateY(-5px);
}

.recognize-capture {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
}

.record-button {
    width: 140px;
    height: 140px;
    border: none;
    border-radius: 50%;
    color: #fff;
    background: linear-gradient(135deg, var(--primary-color), var(--color-primary));
    box-shadow: 0 18px 46px var(--color-box-shadow);
    cursor: pointer;
    transition: transform 0.2s, opacity 0.2s;

    i {
        font-size: 42px;
    }

    &:hover:not(:disabled) {
        transform: scale(1.04);
    }

    &.recording {
        background: linear-gradient(135deg, #ef4444, #f97316);
        animation: recognize-pulse 1s ease-in-out infinite;
    }

    &.waiting {
        cursor: wait;
        opacity: 0.65;
    }
}

.source-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
}

.device-select {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: min(320px, 86vw);
    min-height: 38px;
    padding: 0 14px;
    border: 1px solid var(--border-color);
    border-radius: 19px;
    color: var(--text-color);
    background: rgba(255, 255, 255, 0.72);
    transition: opacity 0.18s ease, visibility 0.18s ease;

    &.hidden {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
    }

    i {
        color: var(--color-primary);
        font-size: 14px;
    }

    select {
        width: 100%;
        min-width: 0;
        border: none;
        outline: none;
        color: inherit;
        background: transparent;
        cursor: pointer;
    }
}

.source-button,
.recognize-actions button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 36px;
    padding: 0 16px;
    border: 1px solid var(--border-color);
    border-radius: 18px;
    color: var(--text-color);
    background: rgba(255, 255, 255, 0.72);
    cursor: pointer;
    transition: 0.2s;

    &:hover:not(:disabled),
    &.active {
        color: var(--color-primary);
        border-color: var(--primary-color);
        background: var(--color-primary-light);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}

.recognize-results {
    width: 100%;
    display: grid;
    justify-items: center;
    gap: 16px;
}

.result-carousel {
    position: relative;
    width: min(680px, 100%);
    min-height: 440px;
    overflow: visible;
    cursor: grab;
    perspective: 1100px;
    perspective-origin: center 48%;
    touch-action: pan-y;
    user-select: none;

    &.dragging {
        cursor: grabbing;
    }
}

.card-track {
    --card-width: clamp(250px, 38vw, 320px);
    --card-gap: 20px;
    --slide-distance: calc(var(--card-width) + var(--card-gap));
    position: absolute;
    left: 50%;
    top: 50%;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: var(--card-width);
    align-items: center;
    gap: var(--card-gap);
    transform: translate(calc(-50% + var(--drag-x, 0px)), -50%);
    transform-style: preserve-3d;
    transition: transform 0.42s cubic-bezier(0.2, 0.9, 0.2, 1);
    will-change: transform;

    &.slide-next {
        transform: translate(calc(-50% - var(--slide-distance)), -50%);
    }

    &.slide-previous {
        transform: translate(calc(-50% + var(--slide-distance)), -50%);
    }

    &.dragging,
    &.resetting {
        transition: none;
    }
}

.carousel-card {
    position: relative;
    width: var(--card-width);
    aspect-ratio: 4 / 5;
    border: none;
    border-radius: 8px;
    padding: 0;
    color: #fff;
    cursor: pointer;
    overflow: hidden;
    background: #ddd;
    backface-visibility: hidden;
    transform-origin: center center;
    transition:
        opacity 0.42s cubic-bezier(0.2, 0.9, 0.2, 1),
        filter 0.42s cubic-bezier(0.2, 0.9, 0.2, 1),
        transform 0.42s cubic-bezier(0.2, 0.9, 0.2, 1),
        box-shadow 0.42s cubic-bezier(0.2, 0.9, 0.2, 1);
    box-shadow:
        0 18px 36px rgba(0, 0, 0, 0.2),
        0 0 24px rgba(0, 0, 0, 0.12),
        0 1px 0 rgba(255, 255, 255, 0.12) inset;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 1;
        background: rgba(0, 0, 0, 0.16);
        pointer-events: none;
    }
}

.hero-card {
    cursor: grab;
    z-index: 2;
    transform: translateZ(52px) rotateY(0deg) scale(1);
    box-shadow:
        0 26px 58px rgba(0, 0, 0, 0.3),
        0 0 30px rgba(0, 0, 0, 0.16),
        0 1px 0 rgba(255, 255, 255, 0.18) inset;
}

.dragging .hero-card {
    cursor: grabbing;
    transform: translateZ(64px) rotateY(var(--drag-tilt)) scale(1.015);
}

.side-card {
    z-index: 1;
    opacity: 0.52;
    filter: saturate(0.74) brightness(0.82);
    box-shadow:
        0 16px 30px rgba(0, 0, 0, 0.16),
        0 0 18px rgba(0, 0, 0, 0.1),
        0 1px 0 rgba(255, 255, 255, 0.1) inset;
}

.left-card {
    transform: translateZ(-110px) rotateY(18deg) scale(0.76);
}

.right-card {
    transform: translateZ(-110px) rotateY(-18deg) scale(0.76);
}

.far-card {
    z-index: 0;
    opacity: 0;
    filter: saturate(0.6) brightness(0.7);
    pointer-events: none;
    box-shadow:
        0 10px 20px rgba(0, 0, 0, 0.12),
        0 0 14px rgba(0, 0, 0, 0.08),
        0 1px 0 rgba(255, 255, 255, 0.08) inset;
}

.far-left-card {
    transform: translateZ(-170px) rotateY(24deg) scale(0.66);
}

.far-right-card {
    transform: translateZ(-170px) rotateY(-24deg) scale(0.66);
}

.card-track.slide-next {
    .hero-card {
        opacity: 0.52;
        filter: saturate(0.74) brightness(0.82);
        transform: translateZ(-110px) rotateY(18deg) scale(0.76);
        box-shadow:
            0 16px 30px rgba(0, 0, 0, 0.16),
            0 0 18px rgba(0, 0, 0, 0.1),
            0 1px 0 rgba(255, 255, 255, 0.1) inset;
    }

    .right-card {
        opacity: 1;
        filter: saturate(1) brightness(1);
        transform: translateZ(52px) rotateY(0deg) scale(1);
        box-shadow:
            0 26px 58px rgba(0, 0, 0, 0.3),
            0 0 30px rgba(0, 0, 0, 0.16),
            0 1px 0 rgba(255, 255, 255, 0.18) inset;
    }

    .left-card {
        opacity: 0;
        transform: translateZ(-170px) rotateY(24deg) scale(0.66);
    }

    .far-right-card {
        z-index: 1;
        opacity: 0.52;
        filter: saturate(0.74) brightness(0.82);
        transform: translateZ(-110px) rotateY(-18deg) scale(0.76);
        box-shadow:
            0 16px 30px rgba(0, 0, 0, 0.16),
            0 0 18px rgba(0, 0, 0, 0.1),
            0 1px 0 rgba(255, 255, 255, 0.1) inset;
    }
}

.card-track.drag-next {
    .left-card {
        opacity: 0;
        transform: translateZ(-170px) rotateY(24deg) scale(0.66);
    }

    .right-card {
        opacity: 1;
        filter: saturate(1) brightness(1);
        transform: translateZ(52px) rotateY(0deg) scale(1);
        box-shadow:
            0 26px 58px rgba(0, 0, 0, 0.3),
            0 0 30px rgba(0, 0, 0, 0.16),
            0 1px 0 rgba(255, 255, 255, 0.18) inset;
    }

    .far-right-card {
        z-index: 1;
        opacity: 0.52;
        filter: saturate(0.74) brightness(0.82);
        transform: translateZ(-110px) rotateY(-18deg) scale(0.76);
        box-shadow:
            0 16px 30px rgba(0, 0, 0, 0.16),
            0 0 18px rgba(0, 0, 0, 0.1),
            0 1px 0 rgba(255, 255, 255, 0.1) inset;
    }
}

.card-track.slide-previous {
    .hero-card {
        opacity: 0.52;
        filter: saturate(0.74) brightness(0.82);
        transform: translateZ(-110px) rotateY(-18deg) scale(0.76);
        box-shadow:
            0 16px 30px rgba(0, 0, 0, 0.16),
            0 0 18px rgba(0, 0, 0, 0.1),
            0 1px 0 rgba(255, 255, 255, 0.1) inset;
    }

    .left-card {
        opacity: 1;
        filter: saturate(1) brightness(1);
        transform: translateZ(52px) rotateY(0deg) scale(1);
        box-shadow:
            0 26px 58px rgba(0, 0, 0, 0.3),
            0 0 30px rgba(0, 0, 0, 0.16),
            0 1px 0 rgba(255, 255, 255, 0.18) inset;
    }

    .right-card {
        opacity: 0;
        transform: translateZ(-170px) rotateY(-24deg) scale(0.66);
    }

    .far-left-card {
        z-index: 1;
        opacity: 0.52;
        filter: saturate(0.74) brightness(0.82);
        transform: translateZ(-110px) rotateY(18deg) scale(0.76);
        box-shadow:
            0 16px 30px rgba(0, 0, 0, 0.16),
            0 0 18px rgba(0, 0, 0, 0.1),
            0 1px 0 rgba(255, 255, 255, 0.1) inset;
    }
}

.card-track.drag-previous {
    .right-card {
        opacity: 0;
        transform: translateZ(-170px) rotateY(-24deg) scale(0.66);
    }

    .left-card {
        opacity: 1;
        filter: saturate(1) brightness(1);
        transform: translateZ(52px) rotateY(0deg) scale(1);
        box-shadow:
            0 26px 58px rgba(0, 0, 0, 0.3),
            0 0 30px rgba(0, 0, 0, 0.16),
            0 1px 0 rgba(255, 255, 255, 0.18) inset;
    }

    .far-left-card {
        z-index: 1;
        opacity: 0.52;
        filter: saturate(0.74) brightness(0.82);
        transform: translateZ(-110px) rotateY(18deg) scale(0.76);
        box-shadow:
            0 16px 30px rgba(0, 0, 0, 0.16),
            0 0 18px rgba(0, 0, 0, 0.1),
            0 1px 0 rgba(255, 255, 255, 0.1) inset;
    }
}

.card-track.dragging .carousel-card {
    transition: opacity 0.18s ease, filter 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.card-track.resetting .carousel-card {
    transition: none;
}

.hero-shade {
    position: absolute;
    inset: 0;
    z-index: 2;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.08) 25%, rgba(52, 21, 16, 0.82) 100%);
}

.hero-play {
    position: absolute;
    left: 50%;
    top: 43%;
    width: 62px;
    height: 62px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: #7a3b2c;
    background: rgba(255, 255, 255, 0.86);
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, -42%) scale(0.88);
    transition: opacity 0.28s ease, transform 0.28s ease, background 0.2s ease;
    z-index: 3;

    i {
        margin-left: 4px;
        font-size: 22px;
    }
}

.hero-info {
    position: absolute;
    left: 24px;
    right: 24px;
    bottom: 108px;
    display: grid;
    justify-items: center;
    gap: 10px;
    text-align: center;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    z-index: 3;

    strong,
    small,
    em,
    span {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    strong {
        font-size: clamp(18px, 3.2vw, 24px);
        font-weight: 800;
    }

    small,
    em {
        font-style: normal;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.82);
    }
}

.result-dots {
    display: flex;
    justify-content: center;
    gap: 10px;
    min-height: 16px;

    button {
        width: 9px;
        height: 9px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.1);
        cursor: pointer;
        transition: 0.2s;

        &.active {
            background: rgba(0, 0, 0, 0.28);
            transform: scale(1.2);
        }
    }
}

.hero-tools {
    position: absolute;
    left: 24px;
    right: 24px;
    bottom: 24px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    opacity: 0;
    pointer-events: none;
    transform: translateY(12px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    z-index: 3;

    button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        padding: 0;
        border: none;
        border-radius: 50%;
        color: #fff;
        background: transparent;
        cursor: pointer;
        transition: 0.2s;
        font-size: 18px;

        &:hover {
            background: rgba(255, 255, 255, 0.16);
            transform: translateY(-2px);
        }
    }
}

.hero-card,
.card-track.drag-next .right-card,
.card-track.slide-next .right-card,
.card-track.drag-previous .left-card,
.card-track.slide-previous .left-card {
    .hero-play {
        opacity: 1;
        pointer-events: auto;
        transform: translate(-50%, -50%) scale(1);
    }

    .hero-info,
    .hero-tools {
        opacity: 1;
        transform: translateY(0);
    }

    .hero-tools {
        pointer-events: auto;
    }
}

.card-track.drag-next .hero-card,
.card-track.slide-next .hero-card,
.card-track.drag-previous .hero-card,
.card-track.slide-previous .hero-card {
    .hero-play {
        opacity: 0;
        pointer-events: none;
        transform: translate(-50%, -58%) scale(0.9);
    }

    .hero-info,
    .hero-tools {
        opacity: 0;
        transform: translateY(-10px);
    }

    .hero-tools {
        pointer-events: none;
    }
}

.recognize-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;

    button {
        border: none;
        background: transparent;
        color: var(--color-primary);

        span {
            color: #999;
            margin-right: 6px;
        }
    }
}

@keyframes recognize-pulse {
    0%,
    100% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.08);
    }
}

@keyframes recognize-note-float {
    0%,
    100% {
        transform: translateY(0);
        opacity: 0.7;
    }

    50% {
        transform: translateY(-16px);
        opacity: 1;
    }
}

@keyframes recognize-ring-rotate {
    from {
        transform: rotate(0deg) scale(var(--ring-scale));
    }

    to {
        transform: rotate(360deg) scale(var(--ring-scale));
    }
}

:global(html.dark) {
    .recognize-head p {
        color: rgba(255, 255, 255, 0.62);
    }

    .source-button,
    .device-select,
    .recognize-actions button,
    .result-dots button {
        background: rgba(32, 32, 32, 0.9);
    }

    .result-dots button.active {
        background: rgba(255, 255, 255, 0.38);
    }

    .recognize-actions button {
        background: transparent;
    }

    .carousel-card {
        background: #252525;
    }

    .hero-shade {
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.12) 24%, rgba(18, 18, 18, 0.88) 100%);
    }

    .decor-note,
    .decor-ring {
        color: rgba(255, 255, 255, 0.22);
        border-color: rgba(255, 255, 255, 0.22);
    }
}

@media (max-width: 560px) {
    .recognize-page {
        align-items: flex-start;
    }

    .decor-note {
        --note-size: 20px;
        opacity: 0.72;
    }

    .ring-b {
        --ring-scale: 0.74;
    }

    .result-carousel {
        min-height: 400px;
    }

    .hero-card {
        width: var(--card-width);
    }

    .card-track {
        --card-width: min(300px, 78vw);
        --card-gap: 14px;
    }

    .hero-play {
        width: 58px;
        height: 58px;

        i {
            font-size: 21px;
        }
    }

    .hero-info {
        left: 18px;
        right: 18px;
        bottom: 92px;
    }

    .hero-tools {
        left: 18px;
        right: 18px;
        bottom: 20px;

        button {
            width: 36px;
            height: 36px;
            font-size: 16px;
        }
    }

}
</style>

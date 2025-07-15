<template>
    <div class="lyrics-container" :class="{ 'locked': isLocked }">
        <!-- 控制栏 -->
        <div class="controls-overlay" ref="controlsOverlay">
            <div class="controls-wrapper" :class="{ 'locked-controls': isLocked }">
                <template v-if="!isLocked">
                    <div class="color-controls">
                        <button 
                            class="color-button"
                            title="默认颜色"
                            @click="$refs.defaultColorInput.click()"
                        >
                            <div class="color-preview" :style="{ backgroundColor: defaultColor }"></div>
                        </button>
                        <button 
                            class="color-button"
                            title="高亮颜色"
                            @click="$refs.highlightColorInput.click()"
                        >
                            <div class="color-preview" :style="{ backgroundColor: highlightColor }"></div>
                        </button>
                        <input
                            ref="defaultColorInput"
                            type="color"
                            :value="defaultColor"
                            @input="e => handleColorChange(e.target.value, 'default')"
                            class="hidden-color-input"
                        >
                        <input
                            ref="highlightColorInput"
                            type="color"
                            :value="highlightColor"
                            @input="e => handleColorChange(e.target.value, 'highlight')"
                            class="hidden-color-input"
                        >
                    </div>
                    <button @click="changeFontSize(-2)" class="font-control" title="减小字体">
                        <i class="fas fa-minus"></i>
                        <i class="fas fa-font"></i>
                    </button>
                    <button @click="sendAction('previous-song')" title="上一首">
                        <i class="fas fa-step-backward"></i>
                    </button>
                    <button @click="togglePlay" :title="isPlaying ? '暂停' : '播放'">
                        <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
                    </button>
                    <button @click="sendAction('next-song')" title="下一首">
                        <i class="fas fa-step-forward"></i>
                    </button>
                    <button @click="changeFontSize(2)" class="font-control" title="增大字体">
                        <i class="fas fa-font"></i>
                        <i class="fas fa-plus"></i>
                    </button>
                    <button @click="toggleLock" class="lock-button" :title="isLocked ? '解锁' : '锁定'">
                        <i :class="isLocked ? 'fas fa-lock' : 'fas fa-lock-open'"></i>
                    </button>
                    <button @click="sendAction('close-lyrics')" title="关闭歌词">
                        <i class="fas fa-times"></i>
                    </button>
                </template>
                <template v-else>
                    <button @click="toggleLock" class="lock-button" :title="isLocked ? '解锁' : '锁定'">
                        <i :class="isLocked ? 'fas fa-lock' : 'fas fa-lock-open'"></i>
                    </button>
                </template>
            </div>
        </div>
        <!-- 歌词内容 -->
        <div 
            class="lyrics-content-wrapper"
            ref="lyricsContainerRef"
            @mouseenter="handleMouseEnter"
            @mouseleave="handleMouseLeave"
            :class="{ 'hovering': isHovering,'locked': isLocked }"
            :style="containerStyle"
        >
            <template v-if="lyrics.length">
                <div class="lyrics-line">
                    <div class="lyrics-content" 
                        :style="currentLineStyle"
                        :class="{ 'hovering': isHovering && !isLocked }"
                    >
                        <span
                            v-for="(segment, index) in lyrics[displayedLines[0]]?.characters"
                            :key="`line1-${index}`"
                            class="character"
                            :style="getSegmentStyle(segment)"
                        >{{ segment.char }}</span>
                    </div>
                </div>
                <div class="lyrics-line" v-if="lyrics[displayedLines[0]]?.translated">
                    <div class="lyrics-content" :style="{ color: defaultColor }" :class="{ 'hovering': isHovering && !isLocked }">
                        <span>{{ lyrics[displayedLines[0]].translated }}</span>
                    </div>
                </div>
                <div class="lyrics-line" v-else-if="lyrics[displayedLines[1]]">
                    <div class="lyrics-content" :class="{ 'hovering': isHovering && !isLocked }">
                        <span
                            v-for="(segment, index) in lyrics[displayedLines[1]].characters"
                            :key="`line2-${index}`"
                            class="character"
                            :style="getSegmentStyle(segment)"
                        >{{ segment.char }}</span>
                    </div>
                </div>
            </template>
            <div v-else class="lyrics-content hovering nolyrics">暂无歌词</div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

let currentSongHash = ''

const isPlaying = ref(false)
const isLocked = ref(false)
const controlsOverlay = ref(null)
const lyricsContainerRef = ref(null)

const currentTime = ref(0)
const currentLineIndex = ref(0)
const lyrics = ref([])
const currentLineScrollX = ref(0)
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const currentLineStyle = computed(() => ({
    transform: `translateX(${currentLineScrollX.value}px)`
}))

const throttle = (func, delay) => {
    let lastTime = 0
    return (...args) => {
        const now = Date.now()
        if (now - lastTime >= delay) {
            lastTime = now
            func(...args)
        }
    }
}

const sendWindowDrag = throttle((mouseX, mouseY) => {
    window.electron.ipcRenderer.send('window-drag', { mouseX, mouseY })
}, 16)

const displayedLines = ref([0, 1]) 
const defaultColor = ref(localStorage.getItem('lyrics-default-color') || '#999999')
const highlightColor = ref(localStorage.getItem('lyrics-highlight-color') || 'var(--primary-color)')

const handleColorChange = (color, type) => {
    if (type === 'default') {
        defaultColor.value = color
        localStorage.setItem('lyrics-default-color', color)
    } else {
        highlightColor.value = color
        localStorage.setItem('lyrics-highlight-color', color)
    }
}

const sendAction = (action) => {
    window.electron.ipcRenderer.send('desktop-lyrics-action', action)
}

const togglePlay = () => {
    isPlaying.value = !isPlaying.value
    sendAction('toggle-play')
}

const toggleLock = () => {
    isLocked.value = !isLocked.value
    localStorage.setItem('lyrics-lock', isLocked.value)
    if (isLocked.value) {
        isHovering.value = false
        window.electron.ipcRenderer.send('set-ignore-mouse-events', true)
    }
}

// 更新当前行索引
const updateCurrentLineIndex = () => {
    const currentTimeMs = currentTime.value
    
    for (let i = 0; i < lyrics.value.length; i++) {
        const line = lyrics.value[i]
        if (!line?.characters?.length) continue
        
        const lineStartTime = line.characters[0].startTime
        const lineEndTime = line.characters[line.characters.length - 1].endTime
        
        if (currentTimeMs >= lineStartTime && currentTimeMs <= lineEndTime) {
            if (currentLineIndex.value !== i) {
                currentLineIndex.value = i
                updateDisplayedLines()
            }
            break
        }
    }
}

const updateDisplayedLines = () => {
    const currentIdx = currentLineIndex.value
    if (lyrics.value[currentIdx]?.translated?.length) {
        displayedLines.value = [currentIdx];
        return
    }
    setTimeout(() => {
        if (currentIdx % 2) displayedLines.value = [currentIdx + 1, currentIdx]
        else displayedLines.value = [currentIdx, currentIdx + 1]
        currentLineScrollX.value = 0
    }, 200)
}

// 开始拖动
const startDrag = (event) => {
    if (isLocked.value || 
        (!event.target.closest('.controls-overlay') && 
         !event.target.closest('.lyrics-content'))) return

    isDragging.value = true
    dragOffset.value = {
        x: event.clientX,
        y: event.clientY
    }
}

// 检查鼠标是否在交互区域
const checkMousePosition = (event) => {
    if (isLocked.value) {
        const isMouseInControls = event.target.closest('.lock-button') !== null
        window.electron.ipcRenderer.send('set-ignore-mouse-events', !isMouseInControls)
        return
    }
    const isMouseInControls = event.target.closest('.controls-overlay') !== null
    const isMouseInLyrics = event.target.closest('.lyrics-content') !== null && isHovering.value

    window.electron.ipcRenderer.send('set-ignore-mouse-events', !(isMouseInControls || isMouseInLyrics))
}

window.electron.ipcRenderer.on('lyrics-data', (data) => {
    if (data.currentTime < 1 || data.lyricsData.length === 0 || data.currentSongHash !== currentSongHash) {
        currentSongHash = data.currentSongHash
        lyrics.value = data.lyricsData;
        currentLineIndex.value = 0;
        currentTime.value = 0;
        currentLineScrollX.value = 0;
        displayedLines.value = [0, 1];
    } 
    currentTime.value = data.currentTime * 1000;
    updateCurrentLineIndex();
})

window.electron.ipcRenderer.on('playing-status', (playing)=>{
    isPlaying.value = !!playing
})

const fontSize = ref(32)
const changeFontSize = (delta) => {
    fontSize.value = Math.max(12, Math.min(72, fontSize.value + delta))
    localStorage.setItem('lyrics-font-size', fontSize.value)
}

onMounted(() => {
    isLocked.value = localStorage.getItem('lyrics-lock') === 'true'
    window.electron.ipcRenderer.send('set-ignore-mouse-events', true)
    
    document.addEventListener('mousemove', checkMousePosition)
    document.addEventListener('mousedown', startDrag)
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', endDrag)
    fontSize.value = parseInt(localStorage.getItem('lyrics-font-size') || '32')
    setInterval(() => isPlaying.value && (currentTime.value += 10), 10)
})

const onDrag = (event) => {
    if (!isDragging.value) return

    const deltaX = event.screenX - dragOffset.value.x
    const deltaY = event.screenY - dragOffset.value.y

    sendWindowDrag(deltaX, deltaY)
}

const endDrag = () => {
    isDragging.value = false
}

onBeforeUnmount(() => {
    document.removeEventListener('mousemove', checkMousePosition)
    document.removeEventListener('mousedown', startDrag)
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', endDrag)
})

const isHovering = ref(false)
const handleMouseEnter = () => {
    if (!isLocked.value) {
        isHovering.value = true
        window.electron.ipcRenderer.send('set-ignore-mouse-events', false)
    }
}

const handleMouseLeave = () => {
    isHovering.value = false
    if (!isLocked.value) {
        window.electron.ipcRenderer.send('set-ignore-mouse-events', true)
    }
}

const containerStyle = computed(() => ({
    fontSize: `${fontSize.value}px`
}))

// 获取段落样式
const getSegmentStyle = (segment) => {
    const startTime = segment.startTime
    const endTime = segment.endTime
    const progress = (currentTime.value - startTime) / (endTime - startTime)
    
    let fillPercent = 0
    if (currentTime.value < startTime) fillPercent = 0
    else if (currentTime.value >= endTime) fillPercent = 100
    else fillPercent = Math.max(0, Math.min(100, progress * 100))
    
    return {
        backgroundSize: '200% 100%',
        backgroundPosition: `${100 - fillPercent}% 0`,
        backgroundImage: `linear-gradient(to right, ${highlightColor.value} 50%, ${defaultColor.value} 50%)`,
    }
}
</script>

<style>
body,
html {
    background-color: rgba(0, 0, 0, 0);
}
</style>
<style scoped>
.character {
    display: inline-block;
    position: relative;
    background-clip: text;
    -webkit-background-clip: text;
    font-weight: bold;
    background-image: linear-gradient(to right, #ff0000, #00ff00);
    color: transparent;
    transform: translateZ(0);
    will-change: background-position;
    white-space: pre;
}

.lyrics-container {
    backdrop-filter: blur(8px);
    border-radius: 8px;
    user-select: none;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    cursor: inherit;
    font-weight: bold;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: auto;
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    transform: translateZ(0); /* 启用硬件加速 */
}

.lyrics-content-wrapper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.lyrics-container-hover:not(.locked):hover {
    background-color: rgba(0, 0, 0, 0.5);
}

.controls-overlay {
    opacity: 0;
    transition: opacity 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
    margin-bottom: 10px;
    height: 40px;
    position: relative;
    z-index: 10;
}

.controls-overlay:hover {
    opacity: 1;
}

.controls-wrapper {
    display: flex;
    gap: 15px;
    justify-content: center;
    background: rgba(0, 0, 0, 0.9);
    padding: 6px 12px;
    border-radius: 20px;
    backdrop-filter: blur(4px);
    transition: all 0.3s ease;
    width: auto;
    min-width: 430px;
}

.lock-button {
    position: relative;
    z-index: 3;
}

.lock-button i {
    font-size: 13px !important;
}

.controls-wrapper.locked-controls {
    background: none;
    padding: 0;
    width: auto;
}

.controls-wrapper button {
    background: #020202c4;
    border: none !important;
    color: white;
    cursor: pointer;
    width: 28px !important;
    height: 28px !important;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
    transform: scale(1);
}

.controls-wrapper button:hover {
    transform: scale(1.1);
    background: #333333c4;
}

.controls-wrapper button:active {
    transform: scale(0.95);
}

.controls-wrapper i {
    font-size: 16px;
}

.lyrics-line {
    overflow: hidden;
    position: relative;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
    opacity: 1;
    transform: translateY(0);
    will-change: background-position;
}

.lyrics-content {
    display: inline-block;
    white-space: nowrap;
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    padding: 4px 8px;
    border-radius: 4px;
    transform: translateX(0);
}

.lyrics-container:not(.locked) .lyrics-content.hovering:hover {
    cursor: move;
}

.nolyrics{
    margin-bottom: 30px;
}

.controls-wrapper:not(.locked-controls) {
    cursor: move;
}

.font-size-controls {
    display: none;
}

.font-control {
    opacity: 0.8;
    padding: 0 6px;
    display: flex;
    align-items: center;
    gap: 2px;
    width: auto !important;
    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
    transform: scale(1);
}

.font-control:hover {
    opacity: 1;
    transform: scale(1.05);
}

.font-control i {
    font-size: 12px;
}

.font-control i.fa-font {
    font-size: 14px;
    margin: 0 1px;
}

.font-icon {
    display: none;
}

.color-controls {
    display: flex;
    gap: 4px;
    align-items: center;
}

.color-button {
    padding: 2px !important;
    width: 24px !important;
    height: 24px !important;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
    transform: scale(1);
}

.color-button:hover {
    transform: scale(1.1);
    border-color: rgba(255, 255, 255, 0.4) !important;
}

.color-preview {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.hidden-color-input {
    position: absolute;
    visibility: hidden;
    width: 0;
    height: 0;
    padding: 0;
    margin: 0;
    border: none;
}
</style>
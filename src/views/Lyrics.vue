<template>
    <div class="lyrics-container" :class="{ 'locked': isLocked, 'hovering': isHovering && !isLocked }">
        <!-- 控制栏 -->
        <div class="controls-overlay" ref="controlsOverlay">
            <div class="controls-wrapper" :class="{ 'locked-controls': isLocked }">
                <template v-if="!isLocked">
                    <div class="color-controls">
                        <button class="color-button" title="默认颜色" @click="$refs.defaultColorInput.click()">
                            <div class="color-preview" :style="{ backgroundColor: defaultColor }"></div>
                        </button>
                        <button class="color-button" title="高亮颜色" @click="$refs.highlightColorInput.click()">
                            <div class="color-preview" :style="{ backgroundColor: highlightColor }"></div>
                        </button>
                        <input ref="defaultColorInput" type="color" :value="defaultColor"
                            @input="e => handleColorChange(e.target.value, 'default')" class="hidden-color-input">
                        <input ref="highlightColorInput" type="color" :value="highlightColor"
                            @input="e => handleColorChange(e.target.value, 'highlight')" class="hidden-color-input">
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
        <div class="lyrics-content-wrapper" ref="lyricsContainerRef" :class="{ 'locked': isLocked }"
            :style="containerStyle">
            <template v-if="lyrics.length">
                <div class="lyrics-line">
                    <div class="lyrics-content" ref="activeLyricsContentRef" :style="currentLineStyle"
                        :class="{ 'hovering': isHovering && !isLocked }">
                        <span class="lyrics-text">
                            <span class="lyrics-layer lyrics-layer-default" :style="defaultLineStyle">
                                {{ lyrics[displayedLines[0]]?.text || '' }}
                            </span>
                            <span class="lyrics-layer lyrics-layer-highlight"
                                :style="getLineHighlightStyle(displayedLines[0])">
                                {{ lyrics[displayedLines[0]]?.text || '' }}
                            </span>
                        </span>
                    </div>
                </div>
                <div class="lyrics-line" v-if="lyrics[displayedLines[0]]?.translated">
                    <div class="lyrics-content" :class="{ 'hovering': isHovering && !isLocked }">
                        <span class="lyrics-text lyrics-text-static">
                            <span class="lyrics-layer lyrics-layer-default" :style="defaultLineStyle">
                                {{ lyrics[displayedLines[0]].translated }}
                            </span>
                        </span>
                    </div>
                </div>
                <div class="lyrics-line" v-else-if="lyrics[displayedLines[1]]">
                    <div class="lyrics-content" :class="{ 'hovering': isHovering && !isLocked }">
                        <span class="lyrics-text">
                            <span class="lyrics-layer lyrics-layer-default" :style="defaultLineStyle">
                                {{ lyrics[displayedLines[1]]?.text || '' }}
                            </span>
                            <span class="lyrics-layer lyrics-layer-highlight"
                                :style="getLineHighlightStyle(displayedLines[1])">
                                {{ lyrics[displayedLines[1]]?.text || '' }}
                            </span>
                        </span>
                    </div>
                </div>
            </template>
            <div v-else class="lyrics-content hovering nolyrics">暂无歌词</div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

let currentSongHash = ''

const isPlaying = ref(false)
const isLocked = ref(false)
const controlsOverlay = ref(null)
const lyricsContainerRef = ref(null)
const activeLyricsContentRef = ref(null)

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

// Linux 下 setIgnoreMouseEvents 的 forward 选项不可用，避免直接吃掉鼠标事件导致无法点击
const isLinux = window?.electron?.platform === 'linux'
const setIgnoreMouseEvents = (ignore) => {
    if (isLinux) return
    window.electron.ipcRenderer.send('set-ignore-mouse-events', ignore)
}

const sendWindowDrag = throttle((mouseX, mouseY) => {
    window.electron.ipcRenderer.send('window-drag', { mouseX, mouseY })
}, 16)

const displayedLines = ref([0, 1])
const defaultColor = ref(localStorage.getItem('lyrics-default-color') || '#D4D4D4')
const highlightColor = ref(localStorage.getItem('lyrics-highlight-color') || 'var(--primary-color)')
const FALLBACK_COLOR = '#D4D4D4'
let colorContext = null

const clampColorChannel = (value) => Math.max(0, Math.min(255, Math.round(value)))

const getColorContext = () => {
    if (colorContext) return colorContext
    const canvas = document.createElement('canvas')
    colorContext = canvas.getContext('2d')
    return colorContext
}

const parseHexColor = (hex) => {
    const cleanHex = hex.replace('#', '')
    if (cleanHex.length === 3) {
        return {
            r: parseInt(cleanHex[0] + cleanHex[0], 16),
            g: parseInt(cleanHex[1] + cleanHex[1], 16),
            b: parseInt(cleanHex[2] + cleanHex[2], 16),
        }
    }
    return {
        r: parseInt(cleanHex.slice(0, 2), 16),
        g: parseInt(cleanHex.slice(2, 4), 16),
        b: parseInt(cleanHex.slice(4, 6), 16),
    }
}

const parseRgbColorString = (rgbString) => {
    const match = rgbString.match(/rgba?\(([^)]+)\)/i)
    if (!match) return null
    const [r = '0', g = '0', b = '0'] = match[1].split(',').map((item) => item.trim())
    return {
        r: clampColorChannel(Number.parseFloat(r)),
        g: clampColorChannel(Number.parseFloat(g)),
        b: clampColorChannel(Number.parseFloat(b)),
    }
}

const resolveCssVarColor = (color) => {
    const rawColor = `${color || ''}`.trim()
    if (!rawColor) return FALLBACK_COLOR
    if (!rawColor.startsWith('var(')) return rawColor

    const varMatch = rawColor.match(/^var\(\s*([^,\s)]+)\s*(?:,\s*(.+))?\)$/)
    if (!varMatch) return FALLBACK_COLOR

    const [, cssVarName, fallback = ''] = varMatch
    const cssValue = getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim()
    return cssValue || fallback.trim() || FALLBACK_COLOR
}

const parseColorToRgb = (color) => {
    const ctx = getColorContext()
    if (!ctx) return parseHexColor(FALLBACK_COLOR)

    ctx.fillStyle = FALLBACK_COLOR
    ctx.fillStyle = resolveCssVarColor(color)
    const normalized = ctx.fillStyle

    if (normalized.startsWith('#')) return parseHexColor(normalized)
    if (normalized.startsWith('rgb')) {
        const rgb = parseRgbColorString(normalized)
        if (rgb) return rgb
    }
    return parseHexColor(FALLBACK_COLOR)
}

const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((channel) => clampColorChannel(channel).toString(16).padStart(2, '0')).join('')}`

const shiftRgb = (rgb, offset) => ({
    r: clampColorChannel(rgb.r + offset),
    g: clampColorChannel(rgb.g + offset),
    b: clampColorChannel(rgb.b + offset),
})

const buildVerticalGradient = (baseColor) => {
    const rgb = parseColorToRgb(baseColor)
    const topColor = rgbToHex(shiftRgb(rgb, -38))
    const bottomColor = rgbToHex(shiftRgb(rgb, 28))
    return `linear-gradient(to bottom, ${topColor}, ${bottomColor})`
}

const defaultLineStyle = computed(() => ({
    background: buildVerticalGradient(defaultColor.value),
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    fontWeight: 'bold',
}))

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
        setIgnoreMouseEvents(true)
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
    if (isLocked.value) return

    // 只有在悬停状态下才允许拖动（即只有先碰到歌词文本后才能拖动）
    if (isHovering.value) {
        isDragging.value = true
        dragOffset.value = {
            x: event.clientX,
            y: event.clientY
        }
    }
}

// 检查鼠标是否在交互区域
const checkMousePosition = (event) => {
    if (isLocked.value) {
        // 检查鼠标是否在歌词文本上或控制按钮上
        // const isMouseOnLyrics = event.target.closest('.lyrics-content') !== null
        const isMouseInControls = event.target.closest('.controls-overlay') !== null || event.target.closest('.lock-button') !== null

        // 当鼠标在歌词文本上或者在控制按钮上时，显示控制按钮
        if (isMouseInControls) {
            document.querySelector('.controls-overlay')?.classList.add('show-locked-controls')
        } else {
            document.querySelector('.controls-overlay')?.classList.remove('show-locked-controls')
        }

        setIgnoreMouseEvents(!(isMouseInControls))
        return
    }

    // 使用更可靠的方法检查鼠标位置
    const lyricsContainer = document.querySelector('.lyrics-container')
    if (!lyricsContainer) return

    const rect = lyricsContainer.getBoundingClientRect()
    const isMouseInContainer = (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
    )

    // 检查鼠标是否在歌词文本上或控制栏上
    const isMouseOnLyrics = event.target.closest('.lyrics-content') !== null
    const isMouseInControls = event.target.closest('.controls-overlay') !== null

    // 如果鼠标在歌词文本上或控制栏上，激活悬停状态
    if ((isMouseOnLyrics || isMouseInControls) && !isLocked.value) {
        isHovering.value = true
    }

    // 只有当鼠标完全离开容器时才重置悬停状态
    if (!isMouseInContainer && !isLocked.value) {
        isHovering.value = false
    }

    // 设置鼠标事件穿透，当在控制区域或悬停状态时不穿透
    setIgnoreMouseEvents(!(isMouseInControls || isHovering.value))
}

window.electron.ipcRenderer.on('lyrics-data', (_event, data) => {
    if (data.currentTime < 1) {
        lyrics.value = processLyricsData(data.lyricsData);
    }
    else if (data.lyricsData.length && data.currentSongHash != currentSongHash) {
        currentSongHash = data.currentSongHash
        lyrics.value = processLyricsData(data.lyricsData);
        currentLineIndex.value = 0;
        currentTime.value = 0;
        currentLineScrollX.value = 0;
        displayedLines.value = [0, 1];
    }
    currentTime.value = data.currentTime * 1000;
    updateCurrentLineIndex();
})

// 处理歌词数据，添加完整的文本
const processLyricsData = (lyricsData) => {
    return lyricsData.map(line => {
        if (line.characters && line.characters.length) {
            // 为每行添加完整文本
            line.text = line.characters.map(char => char.char).join('');
        }
        return line;
    });
}

window.electron.ipcRenderer.on('playing-status', (_event, playing) => {
    isPlaying.value = !!playing
})

const fontSize = ref(32)
const changeFontSize = (delta) => {
    fontSize.value = Math.max(12, Math.min(72, fontSize.value + delta))
    localStorage.setItem('lyrics-font-size', fontSize.value)
}

onMounted(() => {
    isLocked.value = localStorage.getItem('lyrics-lock') === 'true'
    setIgnoreMouseEvents(true)

    document.addEventListener('mousemove', checkMousePosition)
    document.addEventListener('mousedown', startDrag)
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', endDrag)
    fontSize.value = parseInt(localStorage.getItem('lyrics-font-size') || '32')
    setInterval(() => { isPlaying.value && (currentTime.value += 5) }, 5)
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

const containerStyle = computed(() => ({
    fontSize: `${fontSize.value}px`
}))

const computeHighlightMetrics = (lineIndex) => {
    const line = lyrics.value[lineIndex]
    if (!line || !line.characters || !line.characters.length) {
        return {
            progress: 0
        }
    }

    const characters = line.characters
    const text = line.text || ''
    const safeTextLength = Math.max(1, text.length)
    const lineStartTime = characters[0].startTime
    const lineEndTime = characters[characters.length - 1].endTime
    const lineDuration = Math.max(1, lineEndTime - lineStartTime)

    if (currentTime.value < lineStartTime) {
        return {
            progress: 0
        }
    }

    if (currentTime.value >= lineEndTime) {
        return {
            progress: 1
        }
    }

    let charBasedPosition = 0
    for (let i = 0; i < characters.length; i++) {
        const char = characters[i]
        const startTime = char.startTime
        const endTime = char.endTime

        if (currentTime.value >= startTime && currentTime.value <= endTime) {
            const charDuration = Math.max(1, endTime - startTime)
            const progress = (currentTime.value - startTime) / charDuration
            const charWidth = 100 / safeTextLength
            charBasedPosition = (i / safeTextLength * 100) + (progress * charWidth)
            break
        }

        if (currentTime.value > endTime) {
            charBasedPosition = ((i + 1) / safeTextLength) * 100
        }
    }

    const lineProgress = Math.min(1, Math.max(0, (currentTime.value - lineStartTime) / lineDuration))
    let highlightPosition = Math.max(charBasedPosition, lineProgress * 100)
    highlightPosition = Math.max(0, Math.min(100, highlightPosition))

    return {
        progress: highlightPosition / 100
    }
}

const getLineHighlightStyle = (lineIndex) => ({
    width: `${(computeHighlightMetrics(lineIndex).progress * 100).toFixed(3)}%`,
    background: buildVerticalGradient(highlightColor.value),
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    fontWeight: 'bold',
})
const getHighlightProgress = (lineIndex) => computeHighlightMetrics(lineIndex).progress

const updateActiveLineScroll = () => {
    const activeIndex = displayedLines.value[0];
    const containerEl = lyricsContainerRef.value;
    const contentEl = activeLyricsContentRef.value;

    if (activeIndex === undefined || !containerEl || !contentEl) {
        return;
    }

    const activeLine = lyrics.value[activeIndex];
    if (!activeLine) {
        if (currentLineScrollX.value !== 0) currentLineScrollX.value = 0;
        return;
    }

    const containerWidth = containerEl.clientWidth || 0;
    const contentWidth = contentEl.scrollWidth || 0;
    const overflow = contentWidth - containerWidth;

    if (overflow <= 0) {
        if (currentLineScrollX.value !== 0) currentLineScrollX.value = 0;
        return;
    }

    const progress = Math.min(1, Math.max(0, getHighlightProgress(activeIndex)));

    if (progress <= 0) {
        if (currentLineScrollX.value !== 0) currentLineScrollX.value = 0;
        return;
    }

    const targetOffset = -overflow * progress;
    const clampedOffset = Math.max(-overflow, Math.min(0, targetOffset));

    if (currentLineScrollX.value !== clampedOffset) {
        currentLineScrollX.value = clampedOffset;
    }
};

const scheduleActiveLineScroll = throttle(() => {
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(updateActiveLineScroll);
    } else {
        updateActiveLineScroll();
    }
}, 50);

watch([currentTime, currentLineIndex, () => displayedLines.value], () => {
    scheduleActiveLineScroll();
}, { immediate: true });

watch(() => lyrics.value, () => {
    scheduleActiveLineScroll();
});

watch(fontSize, () => {
    scheduleActiveLineScroll();
});
</script>

<style>
body,
html {
    background-color: rgba(0, 0, 0, 0);
}
</style>
<style lang="scss" scoped>
$white: white;
$text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
$shadow-light: 0 2px 8px rgba(0, 0, 0, 0.2);
$bg-overlay: rgba(30, 30, 30, 0.75);
$bg-button: rgba(50, 50, 50, 0.7);

.lyrics-text {
    display: inline-block;
    position: relative;
    transform: translateZ(0);
    white-space: pre;
    letter-spacing: 0.5px;
}

.lyrics-layer {
    display: block;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    font-weight: bold;
    white-space: pre;
    text-shadow: $text-shadow;

    &-default {
        position: relative;
    }

    &-highlight {
        position: absolute;
        left: 0;
        top: 0;
        overflow: hidden;
        width: 0;
        max-width: 100%;
        will-change: width;
    }
}

.lyrics-text-static .lyrics-layer {
    position: relative;
}

.lyrics-container {
    backdrop-filter: blur(10px);
    border-radius: 12px;
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
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateZ(0);
    padding: 8px 0;
    overflow: hidden;

    &.hovering {
        background-color: rgba(0, 0, 0, 0.4);
        cursor: move;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    &.locked {
        .controls-overlay {
            opacity: 0;
        }

        .controls-overlay.show-locked-controls {
            opacity: 1;
        }
    }

    &:not(.locked) .lyrics-content.hovering:hover {
        cursor: move;
    }
}

.lyrics-content-wrapper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.controls-overlay {
    opacity: 0;
    transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    margin-bottom: 10px;
    height: 40px;
    position: relative;
    z-index: 10;
    pointer-events: auto;
}

.lyrics-container.hovering .controls-overlay {
    opacity: 1;
}

.controls-wrapper {
    display: flex;
    gap: 15px;
    justify-content: center;
    background: $bg-overlay;
    padding: 6px 12px;
    border-radius: 20px;
    backdrop-filter: blur(4px);
    transition: all 0.3s ease;
    width: auto;
    min-width: 430px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: $shadow-light;

    &:not(.locked-controls) {
        cursor: move;
    }

    &.locked-controls {
        background: $bg-overlay;
        padding: 6px;
        width: auto;
        min-width: auto;
        border-radius: 50%;
    }

    button {
        background: $bg-button;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        color: $white;
        cursor: pointer;
        width: 28px !important;
        height: 28px !important;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        transform: scale(1);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

        &:hover {
            transform: scale(1.1);
            background: rgba(80, 80, 80, 0.8);
            border-color: rgba(255, 255, 255, 0.25) !important;
        }

        &:active {
            transform: scale(0.95);
        }
    }

    i {
        font-size: 16px;
    }
}

.lock-button {
    position: relative;
    z-index: 3;

    i {
        font-size: 13px !important;
    }
}

.lyrics-line {
    overflow: hidden;
    position: relative;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
    opacity: 1;
    transform: translateY(0);
    will-change: background-position;
}

.lyrics-content {
    display: inline-block;
    white-space: nowrap;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 6px;
    transform: translateX(0);
    background-color: transparent;
}

.nolyrics {
    margin-bottom: 30px;
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
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    transform: scale(1);

    &:hover {
        opacity: 1;
        transform: scale(1.05);
    }

    i {
        font-size: 12px;

        &.fa-font {
            font-size: 14px;
            margin: 0 1px;
        }
    }
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
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    transform: scale(1);

    &:hover {
        transform: scale(1.1);
        border-color: rgba(255, 255, 255, 0.4) !important;
    }
}

.color-preview {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
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
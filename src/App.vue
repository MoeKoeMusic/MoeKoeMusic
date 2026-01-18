<template>
    <div id="app">
        <TitleBar v-if="showTitleBar && !isLyricsRoute" />
        <RouterView />
        <Disclaimer v-if="!isLyricsRoute" />
        <!-- 离屏 Canvas 用于生成状态栏图片 (逻辑宽 200pt * 2 = 400px, 高 22pt * 2 = 44px) -->
        <canvas ref="statusBarCanvas" width="400" height="44" style="display: none;"></canvas>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import Disclaimer from '@/components/Disclaimer.vue';
import TitleBar from '@/components/TitleBar.vue';
import { MoeAuthStore } from '@/stores/store';

const logoImageUrl = import.meta.env.DEV 
    ? '/tray-icon@2x.png' 
    : 'dist/tray-icon@2x.png';

const route = useRoute();
const isLyricsRoute = computed(() => route.path === '/lyrics');
const statusBarCanvas = ref(null);
const logoImage = ref(null);

// ====================  macOS 状态栏歌词跑马灯滚动效果状态管理 ====================
const scrollState = {
    animationTimer: null,    // 动画定时器
    fullText: '',            // 完整歌词文本
    textWidth: 0,            // 文本宽度
    scrollOffset: 0,         // 当前滚动偏移量
    isScrolling: false,      // 是否正在滚动
    renderFailCount: 0,      // 渲染失败计数（用于降级保护）
};

// 配置常量
const CONFIG = {
    SCROLL_SPEED: 4,         // 滚动速度 4px/frame (约120px/s)，适合快歌和长歌词
    FRAME_INTERVAL: 33,      // 帧间隔 (ms)，30 FPS
    SEPARATOR: '',           // 不需要分隔符了，因为不再循环
    LOGO_WIDTH: 50,          // Logo 区域宽度
    FONT_SIZE: 26,           // 字体大小
    PAUSE_AT_START: 1200,    // 开始滚动前的暂停时间 (ms)
    MAX_RENDER_FAILS: 3,     // 最大渲染失败次数
};

// 清除滚动状态
const clearScrollState = () => {
    if (scrollState.animationTimer) {
        clearTimeout(scrollState.animationTimer);
        scrollState.animationTimer = null;
    }
    scrollState.fullText = '';
    scrollState.textWidth = 0;
    scrollState.scrollOffset = 0;
    scrollState.isScrolling = false;
    scrollState.renderFailCount = 0;  // 重置渲染失败计数
};

// 动态控制 TitleBar 的显示
const showTitleBar = ref(true);

// ==================== 核心渲染函数 ====================

// 渲染一帧（支持滚动偏移）
const renderFrameWithOffset = (text, offsetX = 0, isMarquee = false) => {
    const canvas = statusBarCanvas.value;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;   // 400
    const height = canvas.height; // 44
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 宽度锚点（防止 macOS 裁剪）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'; 
    ctx.fillRect(0, 0, 1, height);
    ctx.fillRect(width - 1, 0, 1, height);
    
    // 布局常量
    const CONTENT_START_X = CONFIG.LOGO_WIDTH;
    const CONTENT_WIDTH = width - CONTENT_START_X;
    const CONTENT_CENTER_X = CONTENT_START_X + (CONTENT_WIDTH / 2);
    
    // 字体配置
    const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial';
    ctx.font = `600 ${CONFIG.FONT_SIZE}px ${fontFamily}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';

    // 1. 绘制 Logo
    if (logoImage.value && logoImage.value.complete && logoImage.value.naturalHeight !== 0) {
        try {
            const targetHeight = 32;
            const scale = targetHeight / logoImage.value.naturalHeight;
            const targetWidth = logoImage.value.naturalWidth * scale;
            const x = (CONFIG.LOGO_WIDTH - targetWidth) / 2;
            const y = (height - targetHeight) / 2;
            ctx.drawImage(logoImage.value, x, y, targetWidth, targetHeight);
        } catch (e) {
            // 忽略
        }
    }

    // 2. 绘制文本内容
    let textToDraw = text;
    let isPlaceholder = false;

    if (!text || text.trim().length === 0) {
        textToDraw = '♩ ♩ ♩'; 
        isPlaceholder = true;
    }

    // 设置裁剪区域
    ctx.save();
    ctx.beginPath();
    ctx.rect(CONTENT_START_X, 0, CONTENT_WIDTH, height);
    ctx.clip();

    if (isPlaceholder) {
        // 占位符居中
        ctx.textAlign = 'center';
        ctx.fillText(textToDraw, CONTENT_CENTER_X, height / 2 + 2);
    } else if (isMarquee) {
        // 跑马灯模式：只绘制一次，不循环
        ctx.textAlign = 'left';
        // 左侧留一点边距 (10px)
        const textX = CONTENT_START_X + 10 - offsetX;
        ctx.fillText(textToDraw, textX, height / 2 + 2);
    } else {
        // 短歌词居中
        ctx.textAlign = 'center';
        ctx.fillText(textToDraw, CONTENT_CENTER_X, height / 2 + 2);
    }
    
    ctx.restore();

    // 发送到主进程
    try {
        const dataUrl = canvas.toDataURL('image/png');
        if (window.electron && window.electron.ipcRenderer) {
            window.electron.ipcRenderer.send('update-statusbar-image', dataUrl);
        }
        // 成功渲染，重置失败计数
        scrollState.renderFailCount = 0;
    } catch (e) {
        console.error('[Status Bar] Render failed:', e);
        scrollState.renderFailCount++;
        
        // 超过最大失败次数，降级到静态显示
        if (scrollState.renderFailCount >= CONFIG.MAX_RENDER_FAILS) {
            console.warn(`[Status Bar] Render failed ${scrollState.renderFailCount} times, degrading to static display`);
            clearScrollState();
        }
    }
};

// ==================== 跑马灯动画循环 ====================

const startMarqueeAnimation = () => {
    // 计算最大滚动距离：文本宽度 - 可视区域宽度
    // 可视区域宽度 ≈ canvas宽度 - Logo宽度 - 左右padding(20)
    // 但为了确保最后一个字能完全露出来，我们稍微多滚一点点
    const canvas = statusBarCanvas.value;
    const contentWidth = canvas ? (canvas.width - CONFIG.LOGO_WIDTH - 20) : 330;
    
    // 目标偏移量：让文本尾部刚好贴近显示区域右侧
    // TextWidth - ContentWidth 就是刚好对齐右边的偏移量
    const maxOffset = scrollState.textWidth - contentWidth;

    const animate = () => {
        if (!scrollState.isScrolling) {
            scrollState.animationTimer = null;
            return;
        }
        
        // 更新偏移量
        scrollState.scrollOffset += CONFIG.SCROLL_SPEED;
        
        // 检查是否滚动到底
        let shouldStop = false;
        if (scrollState.scrollOffset >= maxOffset) {
            scrollState.scrollOffset = maxOffset; // 修正到最大值
            shouldStop = true;
        }
        
        // 渲染当前帧
        renderFrameWithOffset(scrollState.fullText, scrollState.scrollOffset, true);
        
        if (shouldStop) {
            // 滚动结束，停止计时器，保持在最后一帧
            scrollState.animationTimer = null;
            return;
        }
        
        // 继续下一帧
        scrollState.animationTimer = setTimeout(animate, CONFIG.FRAME_INTERVAL);
    };
    
    // 启动动画
    if (scrollState.animationTimer) clearTimeout(scrollState.animationTimer);
    scrollState.animationTimer = setTimeout(animate, CONFIG.FRAME_INTERVAL);
};

// 获取文本宽度
const getTextWidth = (text) => {
    const canvas = statusBarCanvas.value;
    if (!canvas) return 0;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    
    const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial';
    ctx.font = `600 ${CONFIG.FONT_SIZE}px ${fontFamily}`;
    
    return ctx.measureText(text).width;
};

// ==================== 主入口函数 ====================

const drawStatusBarImage = (text) => {
    const canvas = statusBarCanvas.value;
    if (!canvas) return;
    
    // 相同歌词不重复处理
    if (text === scrollState.fullText && scrollState.isScrolling) {
        return;
    }
    
    // 清理之前的动画
    clearScrollState();
    
    // 空歌词处理
    if (!text || text.trim().length === 0) {
        renderFrameWithOffset('', 0, false);
        return;
    }
    
    // 计算文本宽度
    const textWidth = getTextWidth(text);
    const contentWidth = canvas.width - CONFIG.LOGO_WIDTH - 20; // 可用宽度
    
    scrollState.fullText = text;
    scrollState.textWidth = textWidth;
    
    if (textWidth <= contentWidth) {
        // 短歌词：静态居中显示
        scrollState.isScrolling = false;
        renderFrameWithOffset(text, 0, false);
    } else {
        // 长歌词：启动跑马灯滚动
        scrollState.isScrolling = true;
        scrollState.scrollOffset = 0;
        
        // 先静态显示一下，然后开始滚动
        renderFrameWithOffset(text, 0, true);
        
        // 延迟启动滚动（让用户先看到开头）
        setTimeout(() => {
            if (scrollState.isScrolling && scrollState.fullText === text) {
                startMarqueeAnimation();
            }
        }, CONFIG.PAUSE_AT_START);
    }
};

// ==================== 生命周期 ====================

let messageHandler = null;

onMounted(async () => {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    showTitleBar.value = settings.nativeTitleBar !== 'on';

    // 初始化认证
    const MoeAuth = MoeAuthStore();
    await MoeAuth.initDfid();

    // 预加载 Logo
    const img = new Image();
    img.src = logoImageUrl;
    img.onload = () => {
        logoImage.value = img;
    };

    // 监听 IPC 消息
    if (window.electron && window.electron.ipcRenderer) {
        try {
            window.electron.ipcRenderer.removeAllListeners('generate-statusbar-image');
        } catch (e) {
            // 忽略
        }
        
        messageHandler = (text) => {
            try {
                drawStatusBarImage(text);
            } catch (e) {
                // 忽略
            }
        };
        
        window.electron.ipcRenderer.on('generate-statusbar-image', messageHandler);
    }
});

onUnmounted(() => {
    clearScrollState();
    
    if (messageHandler && window.electron && window.electron.ipcRenderer) {
        try {
            window.electron.ipcRenderer.removeListener('generate-statusbar-image', messageHandler);
            messageHandler = null;
        } catch (e) {
            // 忽略
        }
    }
});
</script>

<style scoped>
.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}
</style>

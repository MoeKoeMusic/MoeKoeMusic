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
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Disclaimer from '@/components/Disclaimer.vue';
import TitleBar from '@/components/TitleBar.vue';
import { MoeAuthStore } from '@/stores/store';

const route = useRoute();
const isLyricsRoute = computed(() => route.path === '/lyrics');
const statusBarCanvas = ref(null);
const logoImage = ref(null);

// 动态控制 TitleBar 的显示
const showTitleBar = ref(true);

// 绘制状态栏图片
const drawStatusBarImage = (text) => {
    const canvas = statusBarCanvas.value;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;   // 400
    const height = canvas.height; // 44
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 布局常量
    const LOGO_WIDTH = 50; // Logo 区域宽度 (左侧固定区域)
    const SEPARATOR = 0;   // Logo 与文本的间距
    const CONTENT_START_X = LOGO_WIDTH + SEPARATOR;
    const CONTENT_WIDTH = width - CONTENT_START_X;
    const CONTENT_CENTER_X = CONTENT_START_X + (CONTENT_WIDTH / 2);
    
    // 字体配置
    const fontSize = 26; 
    const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial';
    ctx.font = `600 ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';

    // 1. 绘制图片 Logo
    if (logoImage.value && logoImage.value.complete && logoImage.value.naturalHeight !== 0) {
        // 目标图片高度: tray-icon 通常较小，设为 18px (@1x) / 36px (@2x) 
        // 我们在 44px 高度下，绘制 32px 高度比较合适，保留上下边距
        const targetHeight = 32;
        // 计算缩放比例
        const scale = targetHeight / logoImage.value.naturalHeight;
        const targetWidth = logoImage.value.naturalWidth * scale;
        
        // 居中计算 (在 LOGO_WIDTH 区域内居中)
        const x = (LOGO_WIDTH - targetWidth) / 2;
        const y = (height - targetHeight) / 2;
        
        ctx.drawImage(logoImage.value, x, y, targetWidth, targetHeight);
    } else {
        // ... (fallback)
    }

    // 2. 绘制内容 (歌词 或 占位符)
    let textToDraw = text;
    let isPlaceholder = false;

    if (!text || text.trim().length === 0) {
        textToDraw = '♩ ♩ ♩'; 
        isPlaceholder = true;
    }

    if (isPlaceholder) {
        // 占位符：在内容区域绝对居中
        ctx.textAlign = 'center';
        ctx.fillText(textToDraw, CONTENT_CENTER_X, height / 2 + 2);
    } else {
        // 歌词：根据长度决定居中还是左对齐
        const maxTextWidth = CONTENT_WIDTH - 20; // 左右留出 10px 边距
        const textMetrics = ctx.measureText(textToDraw);
        
        if (textMetrics.width <= maxTextWidth) {
            // 短歌词：在内容区域居中
            ctx.textAlign = 'center';
            ctx.fillText(textToDraw, CONTENT_CENTER_X, height / 2 + 2);
        } else {
            // 长歌词：左对齐 + 截断
            ctx.textAlign = 'left';
            let displayText = textToDraw;
            // 逐字截断
            while (ctx.measureText(displayText + '...').width > maxTextWidth && displayText.length > 0) {
                displayText = displayText.slice(0, -1);
            }
            displayText += '...';
            // 从内容区域起始位置 + 10px 边距开始绘制
            ctx.fillText(displayText, CONTENT_START_X + 10, height / 2 + 2);
        }
    }
    
    // 生成图片并发送
    const dataUrl = canvas.toDataURL('image/png');
    if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.send('update-statusbar-image', dataUrl);
    }
};

onMounted(async () => {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    showTitleBar.value = settings.nativeTitleBar !== 'on'; // 如果值为 'on'，则不显示 TitleBar

    // Initialize device dfid for API authentication
    const MoeAuth = MoeAuthStore();
    await MoeAuth.initDfid();
    
    // 预加载 Logo 图片 (使用默认 Tray 图标的高清 @2x 版本)
    const img = new Image();
    // 打包后资源在 asar 中，使用相对路径
    img.src = 'tray-icon@2x.png';
    img.onload = () => {
        logoImage.value = img;
    };

    // 监听生成图片请求
    if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.on('generate-statusbar-image', (text) => {
            drawStatusBarImage(text);
        });
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
import { ref } from 'vue';

// 配置常量
const CONFIG = {
    SCROLL_SPEED: 8,         // 滚动速度 8px/frame (约240px/s)
    FRAME_INTERVAL: 33,      // 30 FPS
    LOGO_WIDTH: 50,          // Logo 区域宽度
    FONT_SIZE: 26,           // 字体大小
    PAUSE_AT_START: 1200,    // 滚动前暂停时间 (ms)
    MAX_RENDER_FAILS: 3,     // 最大重试次数
};

// 状态管理 (改为闭包内的局部变量，如果需要多实例才用工厂模式，这里单例即可)
const scrollState = {
    animationTimer: null,
    fullText: '',
    textWidth: 0,
    scrollOffset: 0,
    isScrolling: false,
    renderFailCount: 0,
    hasPlayedLyrics: false,
};

export function useStatusBarLyrics() {
    const canvasRef = ref(null);
    const logoImage = ref(null);

    // 清除状态
    const clearScrollState = () => {
        if (scrollState.animationTimer) {
            clearTimeout(scrollState.animationTimer);
            scrollState.animationTimer = null;
        }
        scrollState.fullText = '';
        scrollState.textWidth = 0;
        scrollState.scrollOffset = 0;
        scrollState.isScrolling = false;
        scrollState.renderFailCount = 0;
    };

    // 渲染一帧
    const renderFrameWithOffset = (text, offsetX = 0, isMarquee = false) => {
        const canvas = canvasRef.value;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // 清空
        ctx.clearRect(0, 0, width, height);

        // 宽度锚点
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, 0, 1, height);
        ctx.fillRect(width - 1, 0, 1, height);

        // 布局计算
        const CONTENT_START_X = CONFIG.LOGO_WIDTH;
        const CONTENT_WIDTH = width - CONTENT_START_X;
        const CONTENT_CENTER_X = CONTENT_START_X + (CONTENT_WIDTH / 2);

        // 字体
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
            } catch (e) { /* ignore */ }
        }

        // 2. 准备文本
        let textToDraw = text;
        let isPlaceholder = false;

        if (!text || text.trim().length === 0) {
            if (scrollState.hasPlayedLyrics) {
                textToDraw = '♩ ♩ ♩';
            } else {
                textToDraw = '♪ MoeKoeMusic - 萌音';
            }
            isPlaceholder = true;
        } else {
            scrollState.hasPlayedLyrics = true;
        }

        // 3. 绘制文本 (带裁剪)
        ctx.save();
        ctx.beginPath();
        ctx.rect(CONTENT_START_X, 0, CONTENT_WIDTH, height);
        ctx.clip();

        if (isPlaceholder) {
            ctx.textAlign = 'center';
            ctx.fillText(textToDraw, CONTENT_CENTER_X, height / 2 + 2);
        } else if (isMarquee) {
            ctx.textAlign = 'left';
            const textX = CONTENT_START_X + 10 - offsetX;
            ctx.fillText(textToDraw, textX, height / 2 + 2);
        } else {
            ctx.textAlign = 'center';
            ctx.fillText(textToDraw, CONTENT_CENTER_X, height / 2 + 2);
        }

        ctx.restore();

        // 4. 发送给主进程
        try {
            const dataUrl = canvas.toDataURL('image/png');
            if (window.electron && window.electron.ipcRenderer) {
                window.electron.ipcRenderer.send('update-statusbar-image', dataUrl);
            }
            scrollState.renderFailCount = 0;
        } catch (e) {
            console.error('[Status Bar] Render failed:', e);
            scrollState.renderFailCount++;
            if (scrollState.renderFailCount >= CONFIG.MAX_RENDER_FAILS) {
                clearScrollState();
            }
        }
    };

    // 动画循环
    const startMarqueeAnimation = () => {
        const canvas = canvasRef.value;
        const contentWidth = canvas ? (canvas.width - CONFIG.LOGO_WIDTH - 20) : 330;
        const maxOffset = scrollState.textWidth - contentWidth;

        const animate = () => {
            if (!scrollState.isScrolling) {
                scrollState.animationTimer = null;
                return;
            }

            scrollState.scrollOffset += CONFIG.SCROLL_SPEED;
            let shouldStop = false;

            if (scrollState.scrollOffset >= maxOffset) {
                scrollState.scrollOffset = maxOffset;
                shouldStop = true;
            }

            renderFrameWithOffset(scrollState.fullText, scrollState.scrollOffset, true);

            if (shouldStop) {
                scrollState.animationTimer = null;
                return;
            }
            scrollState.animationTimer = setTimeout(animate, CONFIG.FRAME_INTERVAL);
        };

        if (scrollState.animationTimer) clearTimeout(scrollState.animationTimer);
        scrollState.animationTimer = setTimeout(animate, CONFIG.FRAME_INTERVAL);
    };

    // 获取文本宽度
    const getTextWidth = (text) => {
        const canvas = canvasRef.value;
        if (!canvas) return 0;
        const ctx = canvas.getContext('2d');
        if (!ctx) return 0;

        const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial';
        ctx.font = `600 ${CONFIG.FONT_SIZE}px ${fontFamily}`;
        return ctx.measureText(text).width;
    };

    // 公共方法：更新显示
    const updateStatusBarImage = (text) => {
        if (!canvasRef.value) return;

        // 去重
        if (text === scrollState.fullText && scrollState.isScrolling) return;

        clearScrollState();

        if (!text || text.trim().length === 0) {
            renderFrameWithOffset('', 0, false);
            return;
        }

        const textWidth = getTextWidth(text);
        const contentWidth = canvasRef.value.width - CONFIG.LOGO_WIDTH - 20;

        scrollState.fullText = text;
        scrollState.textWidth = textWidth;

        if (textWidth <= contentWidth) {
            // 短歌词
            scrollState.isScrolling = false;
            renderFrameWithOffset(text, 0, false);
        } else {
            // 长歌词
            scrollState.isScrolling = true;
            scrollState.scrollOffset = 0;
            renderFrameWithOffset(text, 0, true);

            setTimeout(() => {
                if (scrollState.isScrolling && scrollState.fullText === text) {
                    startMarqueeAnimation();
                }
            }, CONFIG.PAUSE_AT_START);
        }
    };

    // 初始化图片
    const initLogo = (src) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            logoImage.value = img;
            // 首次加载后渲染一次占位符
            updateStatusBarImage('');
        }
    };

    // 初始化状态栏歌词（封装初始化和IPC监听）
    const initStatusBar = (logoSrc, settings) => {
        if (!window.electron?.ipcRenderer) return null;

        // 判断是否需要开启 (macOS 默认开启)
        const isMac = window.electron.platform === 'darwin';
        const shouldEnable = settings.statusBarLyrics === 'on' ||
            (settings.statusBarLyrics === undefined && isMac);

        if (!shouldEnable) return null;

        // 初始化 Logo
        initLogo(logoSrc);

        // 清理旧的监听器
        try {
            window.electron.ipcRenderer.removeAllListeners('generate-statusbar-image');
        } catch (e) { }

        // 创建消息处理器
        const handler = (text) => {
            try {
                updateStatusBarImage(text);
            } catch (e) { }
        };

        // 注册监听器
        window.electron.ipcRenderer.on('generate-statusbar-image', handler);

        // 返回清理函数
        return () => {
            if (window.electron?.ipcRenderer) {
                try {
                    window.electron.ipcRenderer.removeListener('generate-statusbar-image', handler);
                } catch (e) { }
            }
        };
    };

    return {
        canvasRef,
        initStatusBar,
        updateStatusBarImage,
        initLogo,
        cleanupStatusBar: clearScrollState
    };
}

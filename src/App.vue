<template>
    <div id="app">
        <TitleBar v-if="showTitleBar && !isLyricsRoute" />
        <RouterView />
        <Disclaimer v-if="!isLyricsRoute" />
        <!-- 离屏 Canvas 用于生成顶部状态栏StatusBar图片 (逻辑宽 200pt * 2 = 400px, 高 22pt * 2 = 44px) -->
        <canvas ref="statusBarCanvas" width="400" height="44" style="display: none;"></canvas>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import Disclaimer from '@/components/Disclaimer.vue';
import TitleBar from '@/components/TitleBar.vue';
import { MoeAuthStore } from '@/stores/store';
import { useStatusBarLyrics } from '@/composables/useStatusBarLyrics';
import logoImageSrc from '@/assets/images/tray/tray-icon@2x.png?url';

const route = useRoute();
const isLyricsRoute = computed(() => route.path === '/lyrics');

// 状态栏歌词逻辑
const { canvasRef: statusBarCanvas, initStatusBar, cleanupStatusBar } = useStatusBarLyrics();
let cleanupStatusBarIPC = null;

// 动态控制 TitleBar 的显示
const showTitleBar = ref(true);

onMounted(async () => {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    showTitleBar.value = settings.nativeTitleBar !== 'on'; // 如果值为 'on'，则不显示 TitleBar

    // Initialize device dfid for API authentication
    const MoeAuth = MoeAuthStore();
    await MoeAuth.initDfid();

    // 初始化状态栏歌词
    cleanupStatusBarIPC = initStatusBar(logoImageSrc, settings);
});

onUnmounted(() => {
    cleanupStatusBar();
    cleanupStatusBarIPC?.();
});
</script>

<style scoped>
.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}
</style>

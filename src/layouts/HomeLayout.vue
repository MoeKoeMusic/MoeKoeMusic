<template>
    <Header v-if="navigationMode === 'top'" />
    <SidebarNavigation v-else />
    <main :class="{ 'side-navigation-main-content': navigationMode === 'side', collapsed: sidebarCollapsed }">
        <div v-if="!isOnline" class="network-status">
            网络连接已断开
        </div>
        <div class="main-content-shell">
            <router-view :playerControl="playerControl"></router-view>
        </div>
    </main>
    <PlayerControl ref="playerControl" />
    <OnboardingGuide />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Header from "@/components/Header.vue";
import SidebarNavigation from "@/components/SidebarNavigation.vue";
import PlayerControl from "@/components/PlayerControl.vue";
import OnboardingGuide from "@/components/OnboardingGuide.vue";
import { setTheme, applyColorTheme, applyCustomFont } from '../utils/utils';

const playerControl = ref(null);
const isOnline = ref(navigator.onLine);
const navigationMode = ref('top');
const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === '1');
const playerBarLayout = ref('full');

// 监听网络状态变化
const handleNetworkChange = (online) => {
    isOnline.value = online;

    const title = online ? '网络已连接' : '网络已断开';
    const body = online ? '您已恢复网络连接' : '请检查网络设置';

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    new Notification(title, {
        body,
        icon: './assets/images/logo.png'
    });
};

const handleOnline = () => handleNetworkChange(true);
const handleOffline = () => handleNetworkChange(false);
const loadNavigationMode = (settings = JSON.parse(localStorage.getItem('settings')) || {}) => {
    navigationMode.value = settings.navigationMode === 'side' ? 'side' : 'top';
    playerBarLayout.value = settings.playerBarLayout === 'content' ? 'content' : 'full';
    applyPlayerBarLayout();
};
const handleSettingsChange = (event) => {
    loadNavigationMode(event.detail?.settings);
};
const handleSidebarCollapseChange = (event) => {
    sidebarCollapsed.value = event.detail?.collapsed === true;
    applyPlayerBarLayout();
};
const applyPlayerBarLayout = () => {
    const enabled = navigationMode.value === 'side' && playerBarLayout.value === 'content';
    document.body.classList.toggle('player-bar-content-layout', enabled);
    document.documentElement.style.setProperty('--side-navigation-width', sidebarCollapsed.value ? '64px' : '226px');
};

onMounted(() => {
    const savedConfig = JSON.parse(localStorage.getItem('settings'));
    if (savedConfig) {
        applyColorTheme(savedConfig['themeColor']);
        applyCustomFont(savedConfig.font || '');
    }
    loadNavigationMode(savedConfig || {});
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    }

    // 添加网络状态监听
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('settings-change', handleSettingsChange);
    window.addEventListener('sidebar-collapse-change', handleSidebarCollapseChange);

    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
});

// 组件卸载时移除事件监听
onUnmounted(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('settings-change', handleSettingsChange);
    window.removeEventListener('sidebar-collapse-change', handleSidebarCollapseChange);
    document.body.classList.remove('player-bar-content-layout');
    document.documentElement.style.removeProperty('--side-navigation-width');
});
</script>

<style>
:root {
    /* 粉红色主色调 - 用于主要按钮、强调元素 */
    --primary-color: #FF69B4;
    /* 粉红色主色调的RGB值 - 用于需要RGB格式的样式 */
    --primary-color-rgb: '255, 105, 180';
    /* 浅粉红色辅助色 - 用于次要按钮、提示信息 */
    --secondary-color: #FFB6C1;
    /* 文本颜色 - 用于正文内容 */
    --text-color: #333;
    /* 浅粉色背景 - 用于页面主背景 */
    --background-color: #FFF0F5;
    /* 次要背景色 - 用于卡片、侧边栏背景 */
    --background-color-secondary: #FFE6F0;
    /* 高亮色 - 用于交互元素如按钮、链接 */
    --color-primary: #ea33e4;
    /* 高亮色的浅色版本 - 用于选中状态背景 */
    --color-primary-light: rgba(255, 105, 180, 0.1);
    /* 边框颜色 - 用于分隔线、边框 */
    --border-color: #FFD9E6;
    /* 悬停颜色 - 用于元素悬停状态 */
    --hover-color: #FFE9F2;
    /* 半透明背景 - 用于覆盖层、提示框 */
    --color-secondary-bg-for-transparent: rgba(209, 209, 214, 0.28);
    /* 阴影颜色 - 用于卡片、弹窗阴影 */
    --color-box-shadow: rgba(255, 105, 180, 0.2);
}

* {
    user-select: none;
}

body,
html {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background-color: #FFF;
    color: var(--text-color);
    height: 100%;
}

body {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

::-webkit-scrollbar {
    width: 0;
    height: 0;
}

main {
    min-height: calc(100vh - 80px - 188px);
    width: 100%;
    margin: 0;
    margin-bottom: 150px;
    padding-top: 80px;
    padding-bottom: 150px;
    box-sizing: border-box;
}

.main-content-shell {
    width: min(1200px, 100%);
    margin: 0 auto;
}

main.side-navigation-main-content {
    --side-main-width: 226px;
    width: calc(100% - var(--side-main-width));
    margin-left: var(--side-main-width);
    margin-right: 0;
    padding-top: 52px;
}

main.side-navigation-main-content.collapsed {
    --side-main-width: 64px;
}

a {
    text-decoration: none;
    color: inherit;
    display: block;
}

.network-status {
    position: fixed;
    top: 80px;
    left: 0;
    right: 0;
    background-color: #ff4757;
    color: white;
    text-align: center;
    padding: 8px;
    z-index: 1000;
}

body.player-bar-content-layout .side-navigation {
    bottom: 0;
}

body:not(.player-bar-content-layout) .side-navigation {
    z-index: 98;
}

body.player-bar-content-layout .player-container {
    left: var(--side-navigation-width);
    width: calc(100% - var(--side-navigation-width));
}
</style>

<template>
    <div class="side-top-actions" :class="{ collapsed: isCollapsed }">
        <div class="side-action-buttons">
            <button class="side-action-button" @click="toggleCollapse">
                <i :class="isCollapsed ? 'fas fa-indent' : 'fas fa-outdent'"></i>
            </button>
            <button class="side-action-button" @click="goBack" :disabled="!canGoBack">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="side-action-button" @click="goForward" :disabled="!canGoForward">
                <i class="fas fa-chevron-right"></i>
            </button>
            <button class="side-action-button" @click="refreshPage">
                <i class="fas fa-redo"></i>
            </button>
        </div>
        <div class="side-top-search">
            <i class="fas fa-search"></i>
            <input v-model="searchQuery" type="text" :placeholder="$t('sou-suo-yin-le-ge-shou-ge-dan')"
                :readonly="searchMode === 'recommend'" @click="getSearch" @keydown.enter="getSearch">
        </div>
    </div>

    <aside class="side-navigation" :class="{ collapsed: isCollapsed }">
        <div class="side-profile">
            <router-link :to="!isCollapsed ? '/library' : '/settings'" class="side-profile-link">
                <img :src="MoeAuth.UserInfo ? MoeAuth.UserInfo.pic : './assets/images/profile.jpg'"
                    alt="Profile Picture">
                <div class="side-profile-info">
                    <span>{{ MoeAuth.UserInfo?.nickname || $t('deng-lu') }}</span>
                    <small>{{ MoeAuth.isAuthenticated ? 'Hi,欢迎回来!' : 'MoeKoe Music' }}</small>
                </div>
            </router-link>
            <button class="side-profile-menu-button" @click.stop="toggleProfile">
                <i class="fas fa-ellipsis-h"></i>
            </button>
        </div>
        <transition name="side-profile-menu">
            <div v-if="showProfile" class="side-profile-menu" @click.stop="toggleProfile">
                <ul>
                    <li>
                        <router-link to="/settings">
                            <i class="fas fa-cog"></i> {{ $t('she-zhi') }}
                        </router-link>
                    </li>
                    <li>
                        <a v-if="MoeAuth.isAuthenticated" @click="logout">
                            <i class="fas fa-sign-out-alt"></i>{{ $t('tui-chu') }}
                        </a>
                        <router-link v-else to="/login">
                            <i class="fas fa-sign-in-alt"></i> {{ $t('deng-lu') }}
                        </router-link>
                    </li>
                    <li>
                        <a style="position: relative;" @click="handleUpdateEntryClick">
                            <i class="fab fa-github"></i> {{ $t('geng-xin') }}
                            <i v-if="showNewBadge" class="new-badge">new</i>
                        </a>
                    </li>
                    <li>
                        <a @click="Disclaimer()">
                            <i class="fas fa-info-circle"></i> {{ $t('guan-yu') }}
                        </a>
                    </li>
                </ul>
            </div>
        </transition>

        <div class="side-navigation-main">
            <div class="side-search">
                <i class="fas fa-search" @click="isCollapsed && $router.push('/search/recommend')"></i>
                <input v-model="searchQuery" type="text" :placeholder="$t('sou-suo-yin-le-ge-shou-ge-dan')"
                    :readonly="searchMode === 'recommend'" @click="getSearch" @keydown.enter="getSearch">
            </div>

            <nav class="side-section">
                <router-link v-for="item in mainLinks" :key="item.path" :to="item.path" class="side-link"
                    :title="item.label">
                    <i :class="item.icon"></i>
                    <span>{{ item.label }}</span>
                </router-link>
            </nav>

            <div class="side-section">
                <div class="side-section-title">{{ $t('yin-le-ku') }}</div>
                <router-link to="/CloudDrive" class="side-link" title="我的云盘">
                    <i class="fas fa-cloud"></i>
                    <span>我的云盘</span>
                </router-link>
                <router-link to="/LocalMusic" class="side-link" title="本地音乐">
                    <i class="fas fa-compact-disc"></i>
                    <span>本地音乐</span>
                </router-link>
            </div>

            <div v-if="MoeAuth.isAuthenticated" class="side-playlist-area">
                <div class="side-playlist-tabs">
                    <button :class="{ active: activePlaylistTab === 'own' }" @click="activePlaylistTab = 'own'">
                        我的歌单
                    </button>
                    <span>|</span>
                    <button :class="{ active: activePlaylistTab === 'collected' }"
                        @click="activePlaylistTab = 'collected'">
                        收藏歌单
                    </button>
                    <button class="side-refresh-button" @click="getplaylist">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="side-playlist-toggle-button" :title="activePlaylistTab === 'own' ? '收藏歌单' : '我的歌单'"
                        @click="activePlaylistTab = activePlaylistTab === 'own' ? 'collected' : 'own'">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                </div>

                <div class="side-playlist-list">
                    <router-link
                        v-for="playlist in activePlaylistTab === 'own' ? userPlaylists : collectedPlaylists"
                        :key="`${activePlaylistTab}-${playlist.listid}`" :to="getPlaylistTo(playlist)"
                        class="side-link side-playlist-link" :class="{ active: isActivePlaylist(playlist) }"
                        :title="playlist.name">
                        <img :src="playlist.pic ? $getCover(playlist.pic, 32) : './assets/images/live.png'" alt="">
                        <span>{{ playlist.name }}</span>
                    </router-link>
                    <div
                        v-if="(activePlaylistTab === 'own' ? userPlaylists : collectedPlaylists).length === 0"
                        class="side-playlist-empty">
                        暂无歌单
                    </div>
                </div>
            </div>
        </div>
    </aside>

    <div v-if="isDisclaimerVisible" class="modal-overlay" @click="Disclaimer">
        <div class="modal-content" @click.stop>
            <img class="modal-banner" src="/assets/images/banners.png" alt="Banner">
            <h2>{{ $t('mian-ze-sheng-ming') }}</h2>
            <p>{{ $t('0-ben-cheng-xu-shi-ku-gou-di-san-fang-ke-hu-duan-bing-fei-ku-gou-guan-fang-xu-yao-geng-wan-shan-de-gong-neng-qing-xia-zai-guan-fang-ke-hu-duan-ti-yan') }}</p>
            <p>{{ $t('1-ben-xiang-mu-jin-gong-xue-xi-shi-yong-qing-zun-zhong-ban-quan-qing-wu-li-yong-ci-xiang-mu-cong-shi-shang-ye-hang-wei-ji-fei-fa-yong-tu') }}</p>
            <p>{{ $t('2-shi-yong-ben-xiang-mu-de-guo-cheng-zhong-ke-neng-hui-chan-sheng-ban-quan-shu-ju-dui-yu-zhe-xie-ban-quan-shu-ju-ben-xiang-mu-bu-yong-you-ta-men-de-suo-you-quan-wei-le-bi-mian-qin-quan-shi-yong-zhe-wu-bi-zai-24-xiao-shi-nei-qing-chu-shi-yong-ben-xiang-mu-de-guo-cheng-zhong-suo-chan-sheng-de-ban-quan-shu-ju') }}</p>
            <p>{{ $t('3-you-yu-shi-yong-ben-xiang-mu-chan-sheng-de-bao-kuo-you-yu-ben-xie-yi-huo-you-yu-shi-yong-huo-wu-fa-shi-yong-ben-xiang-mu-er-yin-qi-de-ren-he-xing-zhi-de-ren-he-zhi-jie-jian-jie-te-shu-ou-ran-huo-jie-guo-xing-sun-hai-bao-kuo-dan-bu-xian-yu-yin-shang-yu-sun-shi-ting-gong-ji-suan-ji-gu-zhang-huo-gu-zhang-yin-qi-de-sun-hai-pei-chang-huo-ren-he-ji-suo-you-qi-ta-shang-ye-sun-hai-huo-sun-shi-you-shi-yong-zhe-fu-ze') }}</p>
            <p>{{ $t('4-jin-zhi-zai-wei-fan-dang-di-fa-lv-fa-gui-de-qing-kuang-xia-shi-yong-ben-xiang-mu-dui-yu-shi-yong-zhe-zai-ming-zhi-huo-bu-zhi-dang-di-fa-lv-fa-gui-bu-yun-xu-de-qing-kuang-xia-shi-yong-ben-xiang-mu-suo-zao-cheng-de-ren-he-wei-fa-wei-gui-hang-wei-you-shi-yong-zhe-cheng-dan-ben-xiang-mu-bu-cheng-dan-you-ci-zao-cheng-de-ren-he-zhi-jie-jian-jie-te-shu-ou-ran-huo-jie-guo-xing-ze-ren') }}</p>
            <p>{{ $t('5-yin-le-ping-tai-bu-yi-qing-zun-zhong-ban-quan-zhi-chi-zheng-ban') }}</p>
            <p>{{ $t('6-ben-xiang-mu-jin-yong-yu-dui-ji-shu-ke-hang-xing-de-tan-suo-ji-yan-jiu-bu-jie-shou-ren-he-shang-ye-bao-kuo-dan-bu-xian-yu-guang-gao-deng-he-zuo-ji-juan-zeng') }}</p>
            <p>{{ $t('7-ru-guo-guan-fang-yin-le-ping-tai-jue-de-ben-xiang-mu-bu-tuo-ke-lian-xi-ben-xiang-mu-geng-gai-huo-yi-chu') }}</p>
            <button @click="Disclaimer">{{ $t('guan-bi-an-niu') }}</button>
            <div class="version-number">© MoeKoe Music <span v-if="appVersion">V{{ appVersion }} - {{ platform }}</span></div>
        </div>
    </div>
    <AppUpdateDialog ref="updateDialogRef" :app-version="appVersion" :platform="platform"
        @badge-change="showNewBadge = $event" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { get } from '../utils/request';
import { MoeAuthStore } from '../stores/store';
import AppUpdateDialog from './AppUpdateDialog.vue';

const MoeAuth = MoeAuthStore();
const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const searchQuery = ref('');
const searchMode = ref('quick');
const canGoBack = ref(false);
const canGoForward = ref(false);
const forwardStack = ref([]);
const showProfile = ref(false);
const isDisclaimerVisible = ref(false);
const showNewBadge = ref(false);
const appVersion = ref('');
const platform = ref('');
const updateDialogRef = ref(null);
const userPlaylists = ref([]);
const collectedPlaylists = ref([]);
const isCollapsed = ref(localStorage.getItem('sidebarCollapsed') === '1');
const activePlaylistTab = ref('own');
const removeAfterEach = router.afterEach(() => {
    updateNavigationStatus();
});

const mainLinks = [
    { path: '/', icon: 'fas fa-home', label: t('shou-ye') },
    { path: '/discover', icon: 'fas fa-compass', label: t('fa-xian') },
    { path: '/library', icon: 'fas fa-music', label: t('yin-le-ku') }
];

const updateNavigationStatus = () => {
    canGoBack.value = window.history.length > 1;
    canGoForward.value = forwardStack.value.length > 0;
};

const goBack = () => {
    if (canGoBack.value) {
        forwardStack.value.push(route.fullPath);
        router.back();
    }
    updateNavigationStatus();
};

const goForward = () => {
    if (canGoForward.value) {
        const forwardRoute = forwardStack.value.pop();
        router.push(forwardRoute);
    }
    updateNavigationStatus();
};

const refreshPage = () => {
    window.location.reload();
};

const emitSidebarWidth = () => {
    window.dispatchEvent(new CustomEvent('sidebar-collapse-change', {
        detail: { collapsed: isCollapsed.value }
    }));
};

const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value;
    localStorage.setItem('sidebarCollapsed', isCollapsed.value ? '1' : '0');
    emitSidebarWidth();
};

const getSearch = () => {
    const keyword = searchQuery.value.trim();
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    searchMode.value = settings?.searchMode === 'recommend' ? 'recommend' : 'quick';

    if (searchMode.value === 'recommend') {
        const nextQuery = keyword ? { q: keyword } : {};
        if (route.path === '/search/recommend' && JSON.stringify(route.query) === JSON.stringify(nextQuery)) return;
        router.push({
            path: '/search/recommend',
            query: nextQuery
        });
        return;
    }

    if (keyword !== '') {
        if (keyword.includes('collection_')) {
            router.push({
                path: '/PlaylistDetail',
                query: { global_collection_id: keyword }
            });
            return;
        }
        router.push({
            path: '/search',
            query: { q: keyword }
        });
    }
};

const getPlaylistTo = (playlist) => ({
    path: '/PlaylistDetail',
    query: {
        global_collection_id: playlist.list_create_gid || playlist.global_collection_id,
        listid: playlist.listid
    }
});

const isActivePlaylist = (playlist) => {
    if (route.path.toLowerCase() !== '/playlistdetail') return false;
    const routeListId = route.query.listid?.toString();
    const playlistListId = playlist.listid?.toString();
    if (routeListId && playlistListId) return routeListId === playlistListId;

    const routeCollectionId = route.query.global_collection_id?.toString();
    const playlistCollectionId = (playlist.list_create_gid || playlist.global_collection_id)?.toString();
    return Boolean(routeCollectionId && playlistCollectionId && routeCollectionId === playlistCollectionId);
};

const getplaylist = async () => {
    if (!MoeAuth.isAuthenticated) return;

    try {
        const playlistResponse = await get('/user/playlist', {
            pagesize: 500,
            t: localStorage.getItem('t')
        });
        if (playlistResponse.status !== 1) return;

        const sortedInfo = playlistResponse.data.info.sort((a, b) => {
            if (a.sort !== b.sort) return a.sort - b.sort;
            return 0;
        });

        userPlaylists.value = sortedInfo.filter(playlist => {
            if (playlist.name == '我喜欢') {
                localStorage.setItem('like', playlist.listid);
            }
            return playlist.list_create_userid === MoeAuth.UserInfo.userid || playlist.name === '我喜欢';
        }).sort((a, b) => a.name === '我喜欢' ? -1 : 1);

        collectedPlaylists.value = sortedInfo.filter(playlist =>
            playlist.list_create_userid !== MoeAuth.UserInfo.userid && !playlist.authors
        );

        const collectedIds = [];
        sortedInfo.forEach(playlist => {
            if (playlist.list_create_userid !== MoeAuth.UserInfo.userid) {
                collectedIds.push({
                    list_create_listid: playlist.list_create_listid,
                    listid: playlist.listid
                });
            }
        });
        localStorage.setItem('collectedPlaylists', JSON.stringify(collectedIds));
    } catch (error) {
        console.error('Failed to get playlists:', error);
    }
};

const toggleProfile = () => {
    showProfile.value = !showProfile.value;
};

const logout = async () => {
    const result = await window.$modal.confirm(t('ni-que-ren-yao-tui-chu-deng-lu-ma'));
    if (result) {
        MoeAuth.clearData();
        router.push({ path: '/' });
    }
};

const Disclaimer = () => {
    isDisclaimerVisible.value = !isDisclaimerVisible.value;
};

const handleClickOutside = (event) => {
    const profileMenu = document.querySelector('.side-profile-menu');
    if (profileMenu && !profileMenu.contains(event.target) && !event.target.closest('.side-profile')) {
        showProfile.value = false;
    }
};

const handleUpdateEntryClick = () => {
    showProfile.value = false;
    updateDialogRef.value?.handleEntryClick();
};

onMounted(() => {
    updateNavigationStatus();
    emitSidebarWidth();
    void getplaylist();
    if (window.electron) {
        window.electron.ipcRenderer.on('version', (_event, version) => {
            appVersion.value = version;
            platform.value = window.electron.platform;
            localStorage.setItem('version', version);
        });
    } else {
        appVersion.value = __VERSION__ || '';
        platform.value = 'Web';
    }
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    removeAfterEach();
});

watch(() => MoeAuth.isAuthenticated, (isAuthenticated) => {
    if (isAuthenticated) {
        void getplaylist();
    } else {
        userPlaylists.value = [];
        collectedPlaylists.value = [];
    }
});
</script>

<style lang="scss" scoped>
.side-navigation,
.side-top-actions {
    --side-surface: #fff;
    --side-border: rgba(0, 0, 0, 0.08);
    --side-muted: #777;
    --side-text: #333;
    --side-action-icon: #666;
    --side-hover: var(--color-secondary-bg-for-transparent);
}

.side-navigation:is(.dark .side-navigation),
.side-top-actions:is(.dark .side-top-actions) {
    --side-surface: rgba(24, 24, 24, 0.96);
    --side-border: rgba(255, 255, 255, 0.08);
    --side-muted: rgba(255, 255, 255, 0.56);
    --side-text: rgba(255, 255, 255, 0.86);
    --side-action-icon: rgba(255, 255, 255, 0.68);
    --side-hover: rgba(255, 255, 255, 0.08);
}

.side-navigation {
    position: fixed;
    inset: 0 auto 78px 0;
    width: 226px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: visible;
    background: var(--side-surface);
    border-right: 1px solid var(--side-border);
    box-shadow: 2px 0 18px rgba(0, 0, 0, 0.08);
    transition: width 0.2s ease;
}

.side-navigation.collapsed {
    width: 67px;
}

.side-top-actions {
    position: fixed;
    top: 0;
    left: 226px;
    right: 0;
    height: 52px;
    z-index: 25;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 24px 0 16px;
    background: var(--side-surface);
    border-bottom: 1px solid var(--side-border);
    transition: left 0.2s ease;
}

.side-top-actions::before {
    content: '';
    position: absolute;
    inset: 0 100px 0 0;
    -webkit-app-region: drag;
}

.side-top-actions.collapsed {
    left: 64px;
}

.side-action-buttons {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}

.side-action-button,
.side-icon-button,
.side-refresh-button {
    border: none;
    background: transparent;
    color: var(--side-action-icon);
    cursor: pointer;
    border-radius: 8px;
    transition: 0.2s;
    -webkit-app-region: no-drag;

    &:hover {
        background: var(--side-hover);
    }

    &:disabled {
        color: #bbb;
        cursor: not-allowed;
    }
}

.side-action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;

    i {
        font-size: 14px;
        line-height: 1;
    }
}

.side-top-search {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    flex: 0 0 26px;
    height: 26px;
    padding: 0;
    overflow: hidden;
    border: 1px solid transparent;
    border-radius: 13px;
    color: var(--side-muted);
    background: transparent;
    transition: flex-basis 0.2s ease, padding 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
    -webkit-app-region: no-drag;
    position: relative;
    z-index: 1;

    > i {
        flex-shrink: 0;
        width: 16px;
        color: var(--side-action-icon);
        font-size: 12px;
        line-height: 1;
        text-align: center;
    }

    &:hover,
    &:focus-within {
        flex-basis: 190px;
        justify-content: flex-start;
        gap: 6px;
        padding: 0 8px;
        border-color: var(--border-color);
        background: var(--background-color);
    }

    input {
        width: 0;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        color: var(--side-text);
        font-size: 12px;
        opacity: 0;
        transition: width 0.2s ease, opacity 0.15s ease;
    }

    &:hover input,
    &:focus-within input {
        width: 100%;
        opacity: 1;
    }
}

.side-navigation-main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 12px 10px;
    padding-bottom: 0;
}

.side-search {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 38px;
    margin-bottom: 16px;
    padding: 0 12px;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    color: var(--side-muted);

    input {
        width: 100%;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        color: var(--side-text);
        font-size: 14px;
    }

    &:is(.dark .side-search){
        border: 1px solid #505050;
    }
}

.side-icon-button {
    width: 34px;
    height: 34px;
}

.side-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 18px;
}

.side-section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px 6px;
    color: var(--side-muted);
    font-size: 12px;
    font-weight: 700;
}

.side-refresh-button {
    width: 24px;
    height: 24px;
}

.side-link {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 38px;
    padding: 0 10px;
    border-radius: 10px;
    color: var(--side-text);
    font-size: 14px;
    transition: 0.2s;

    i {
        width: 18px;
        color: var(--primary-color);
        text-align: center;
    }

    span {
        flex: 1;
        min-width: 0;
        max-width: 160px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        opacity: 1;
        visibility: visible;
        transition: max-width 0.2s ease, opacity 0.15s ease, visibility 0s;
    }

    &:hover,
    &.router-link-exact-active {
        background: var(--side-hover);
    }

    &.router-link-exact-active {
        color: var(--color-primary);
        font-weight: 700;
    }
}

.side-playlist-area {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-bottom: 10px;
}

.side-playlist-tabs {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    min-height: 26px;
    padding: 0 8px 8px;
    color: var(--side-muted);
    font-size: 12px;
    font-weight: 700;

    button {
        max-width: 80px;
        overflow: hidden;
        white-space: nowrap;
        border: none;
        background: transparent;
        color: inherit;
        cursor: pointer;
        padding: 2px 0;
        font-size: 12px;
        font-weight: 700;
        opacity: 1;
        visibility: visible;
        transition: max-width 0.2s ease, opacity 0.15s ease, visibility 0s;

        &.active {
            color: var(--color-primary);
        }
    }

    span {
        max-width: 8px;
        overflow: hidden;
        opacity: 1;
        visibility: visible;
        transition: max-width 0.2s ease, opacity 0.15s ease, visibility 0s;
    }

    .side-refresh-button {
        max-width: 24px;
        margin-left: auto;
    }

    .side-playlist-toggle-button {
        width: 0;
        height: 32px;
        max-width: 0;
        padding: 0;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
    }
}

.side-playlist-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.side-playlist-empty {
    padding: 14px 10px;
    color: var(--side-muted);
    font-size: 12px;
    text-align: center;
}

.side-playlist-link {
    &.router-link-active:not(.active),
    &.router-link-exact-active:not(.active) {
        background: transparent;
        color: var(--side-text);
        font-weight: 400;
    }

    &.active {
        background: var(--side-hover);
        color: var(--color-primary);
        font-weight: 700;
    }

    img {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        object-fit: cover;
    }
}

.side-profile {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 62px;
    padding: 15px 12px;
    border-bottom: 1px solid var(--side-border);
}

.side-profile-link {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;

    > img {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        object-fit: cover;
        background: var(--secondary-color);
    }
}

.side-profile-menu-button {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--side-muted);
    cursor: pointer;

    &:hover {
        background: var(--side-hover);
    }
}

.side-profile-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;

    span,
    small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    span {
        color: var(--side-text);
        font-size: 14px;
        font-weight: 600;
    }

    small {
        color: var(--side-muted);
        font-size: 12px;
    }
}

.side-profile-menu {
    position: absolute;
    left: 180px;
    top: 56px;
    z-index: 2000;
    width: 180px;
    padding: 10px;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);

    ul {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    li a {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        border-radius: 8px;
        color: #000;

        &:hover {
            background: var(--secondary-color);
        }
    }
}

.side-profile-menu-enter-active,
.side-profile-menu-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
}

.side-profile-menu-enter-from,
.side-profile-menu-leave-to {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
}

.collapsed {
    .side-profile {
        justify-content: center;
        padding: 15px 0;

        .side-profile-info {
            display: none;
        }
    }

    .side-profile-link {
        flex: 0 0 auto;
    }

    .side-profile-menu-button {
        display: none;
    }

    .side-section-title {
        display: none;
    }

    .side-playlist-tabs {
        justify-content: center;
        gap: 0;
        padding: 0 0 8px;

        button,
        span,
        .side-refresh-button {
            max-width: 0;
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: max-width 0.2s ease, opacity 0.12s ease, visibility 0s 0.2s;
        }

        .side-refresh-button {
            width: 0;
            margin-left: 0;
        }

        .side-playlist-toggle-button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            max-width: 32px;
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
            color: var(--color-primary);
            font-size: 14px;
            border-radius: 10px;
            transition: opacity 0.15s ease, background-color 0.2s ease;
        }
    }

    .side-search {
        justify-content: center;
        padding: 0;

        input {
            display: none;
        }
    }

    .side-section {
        align-items: center;
    }

    .side-link {
        width: 42px;
        justify-content: center;
        padding: 0;
        gap: 0;

        span {
            max-width: 0;
            opacity: 0;
            visibility: hidden;
            transition: max-width 0.2s ease, opacity 0.12s ease, visibility 0s 0.2s;
        }

        i {
            width: auto;
        }
    }

    .side-playlist-list {
        align-items: center;
    }

    .side-playlist-empty {
        display: none;
    }

    .side-playlist-link img {
        width: 30px;
        height: 30px;
    }
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    position: relative;
    background: #fff;
    padding: 20px;
    border-radius: 8px;
    max-width: 700px;
    width: 90%;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    text-align: left;

    .modal-banner {
        position: absolute;
        top: 0;
        right: 15px;
        width: 180px;
        max-width: 35%;
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
    }

    h2 {
        margin-top: 20px;
        color: var(--primary-color);
    }

    p {
        margin: 10px 0;
        line-height: 1.6;
    }

    button {
        margin-top: 15px;
        padding: 8px 12px;
        background-color: var(--primary-color);
        color: #fff;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }
}

.new-badge {
    position: absolute;
    top: 1px;
    left: 67px;
    background-color: red;
    color: white;
    padding: 0 4px;
    border-radius: 5px;
    font-size: 14px;
}

.version-number {
    position: absolute;
    bottom: 10px;
    right: 10px;
    font-size: 12px;
    color: #666;
}
</style>

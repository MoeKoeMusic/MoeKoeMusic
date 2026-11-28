<template>
    <div v-if="showContextMenu" ref="contextMenuRef"
        :style="{ top: `${menuPosition.y}px`, left: `${menuPosition.x}px` }"
        :class="{ 'submenu-left': submenuLeft }" class="context-menu">
        <ul>
            <li @mouseenter="fetchPlaylists" @mouseleave="hideSubMenu">
                <i class="fa-solid fa-plus"></i>
                {{ MoeAuth.isAuthenticated ? $t('tian-jia-ge-dan') : $t('qing-xian-deng-lu') }} <i
                    class="fa-solid fa-chevron-right"></i>
                <ul v-if="MoeAuth.isAuthenticated && showSubMenu" class="submenu">
                    <li v-for="playlist in playlists" :key="playlist.listid" :title="playlist.name"
                        @click="addToPlaylist(playlist.listid, contextSong)">
                        {{ playlist.name }}
                    </li>
                </ul>
            </li>
            <li v-if="contextSong.mvhash" @click="playMV(contextSong.mvhash)"><i class="fa-solid fa-video"></i> 播放MV
            </li>
            <li @click="shareSong(contextSong)"><i class="fa-solid fa-share-nodes"></i> 分享</li>
            <li @mouseenter="fetchDownloadOptions" @mouseleave="hideDownloadMenu">
                <i class="fa-solid fa-download"></i>
                {{ $t('xia-zai') }} <i class="fa-solid fa-chevron-right"></i>
                <ul v-if="showDownloadMenu" class="submenu download-submenu">
                    <li v-if="downloadLoading" class="submenu-tip">{{ $t('zheng-zai-jie-xi') }}</li>
                    <li v-else-if="downloadOptions.length === 0" class="submenu-tip">{{ $t('gai-ge-qu-wu-fa-xia-zai') }}
                    </li>
                    <li v-for="option in downloadOptions" :key="`${option.value}-${option.hash}`" :title="option.label"
                        @click="download(option)">
                        {{ option.label }}
                    </li>
                </ul>
            </li>
            <li v-if="MoeAuth.isAuthenticated && listId && contextSong.userid === MoeAuth.UserInfo.userid"
                @click="cancel()"><i class="fa-solid fa-heart"></i> 取消收藏</li>
            <li v-if="MoeAuth.isAuthenticated" @click="addToNext(contextSong)"><i class="fa-solid fa-arrow-right"></i>
                添加到下一首</li>
        </ul>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { get } from '../utils/request';
import { MoeAuthStore } from '../stores/store';
import i18n from '@/utils/i18n';
import { openMvPlayer, share } from '@/utils/utils';
import { fetchDownloadQualityOptions, downloadSong } from '@/utils/download';

const router = useRouter();
const MoeAuth = MoeAuthStore();
const showContextMenu = ref(false);
const showSubMenu = ref(false);
const menuPosition = ref({ x: 0, y: 0 });
const contextMenuRef = ref(null);
const submenuLeft = ref(false);
const playlists = ref([]);
const listId = ref(0);
const contextSong = ref(null);
let events;
const MENU_GAP = 8;
const SUBMENU_WIDTH = 170;

const adjustMenuPosition = () => {
    const menu = contextMenuRef.value;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - MENU_GAP;
    const maxY = window.innerHeight - rect.height - MENU_GAP;
    const x = Math.max(MENU_GAP, Math.min(menuPosition.value.x, maxX));
    const y = Math.max(MENU_GAP, Math.min(menuPosition.value.y, maxY));

    menuPosition.value = { x, y };
    submenuLeft.value = window.innerWidth - (x + rect.width) < SUBMENU_WIDTH && x > SUBMENU_WIDTH;
};
// 右键菜单显示与隐藏
const openContextMenu = (event, song, Id) => {
    events = event
    event.preventDefault();
    showContextMenu.value = true;
    showSubMenu.value = false;
    listId.value = Id;
    menuPosition.value = { x: event.clientX, y: event.clientY };
    contextSong.value = song;
    nextTick(adjustMenuPosition);
};
const hideContextMenu = () => {
    showContextMenu.value = false;
    showSubMenu.value = false;
    resetDownloadMenu();
};
// 获取歌单列表
const fetchPlaylists = async () => {
    if (!MoeAuth.isAuthenticated) return;
    showSubMenu.value = true;
    try {
        const playlistResponse = await get('/user/playlist', {
            pagesize: 100
        });
        if (playlistResponse.status === 1) {
            playlists.value = playlistResponse.data.info.filter(playlist => playlist.list_create_userid === MoeAuth.UserInfo.userid);
        }
    } catch (error) {
        $message.error(i18n.global.t('huo-qu-ge-dan-shi-bai'));
    }
};

// 分享歌曲功能
const shareSong = (song) => {
    if (!song) return;
    share(song.OriSongName, song.FileHash);
    hideContextMenu();
};

// 下载相关状态
const showDownloadMenu = ref(false);
const downloadLoading = ref(false);
const downloadOptions = ref([]);
const downloadFetchedHash = ref('');

const resetDownloadMenu = () => {
    showDownloadMenu.value = false;
    downloadLoading.value = false;
    downloadOptions.value = [];
    downloadFetchedHash.value = '';
};

// 从右键菜单的歌曲对象里整理出下载所需信息
const buildDownloadSong = () => {
    const song = contextSong.value || {};
    const hash = song.hash || song.FileHash || '';
    let name = song.name || song.SongName || '';
    let author = song.author || song.SingerName || '';
    const raw = song.OriSongName || '';

    if (raw) {
        const parts = raw.split(' - ');
        if (parts.length > 1) {
            author = author || parts[0];
            name = parts.slice(1).join(' - ');
        } else {
            name = name || raw;
        }
    }

    return { hash, name, author };
};

// 展开下载音质列表
const fetchDownloadOptions = async () => {
    showDownloadMenu.value = true;
    showSubMenu.value = false;

    const hash = contextSong.value?.hash || contextSong.value?.FileHash;
    if (!hash) return;
    if (downloadFetchedHash.value === hash && downloadOptions.value.length > 0) return;

    downloadFetchedHash.value = hash;
    downloadLoading.value = true;
    try {
        downloadOptions.value = await fetchDownloadQualityOptions(hash);
    } catch (error) {
        console.error('[ContextMenu] 获取下载音质失败:', error);
        downloadOptions.value = [];
    } finally {
        downloadLoading.value = false;
    }
};

const hideDownloadMenu = () => {
    showDownloadMenu.value = false;
};

// 按所选音质下载
const download = (option) => {
    const song = buildDownloadSong();
    const options = [...downloadOptions.value];
    hideContextMenu();
    if (!song.hash) {
        $message.error(i18n.global.t('gai-ge-qu-wu-fa-xia-zai'));
        return;
    }
    downloadSong(song, option, options);
};

// 添加到歌单功能
const addToPlaylist = async (listid, song) => {
    try {
        await get(`/playlist/tracks/add?listid=${listid}&data=${encodeURIComponent(song.OriSongName.replace(',', ''))}|${song.FileHash}`);
        hideContextMenu();
        $message.success(i18n.global.t('cheng-gong-tian-jia-dao-ge-dan'));
    } catch (error) {
        $message.error(i18n.global.t('tian-jia-dao-ge-dan-shi-bai'))
    }
};
// 取消收藏功能
const cancel = async () => {
    try {
        await get(`/playlist/tracks/del?listid=${listId.value}&fileids=${contextSong.value.fileid}`);
        emit('songRemoved', contextSong.value.fileid);
        hideContextMenu();
        $message.success(i18n.global.t('cheng-gong-qu-xiao-shou-cang'));
    } catch (error) {
        $message.error(i18n.global.t('qu-xiao-shou-cang-shi-bai'))
    }
};

const props = defineProps({
    playerControl: Object
});

const emit = defineEmits(['songRemoved']);

const addToNext = async (song) => {
    let songNameParts = song?.OriSongName.split(' - ');
    props.playerControl.addToNext(song.FileHash, songNameParts[1], song.cover, songNameParts[0], song.timeLength);
    $message.success(i18n.global.t('tian-jia-cheng-gong'))
    hideContextMenu();
};

const hideSubMenu = () => {
    showSubMenu.value = false;
};

// 播放MV
const playMV = async (mvhash) => {
    try {
        hideContextMenu();
        props.playerControl?.pause?.();
        const title = contextSong.value?.OriSongName || '视频播放';

        await openMvPlayer(router, mvhash, title);
    } catch (error) {
        $message.error('打开视频播放器失败');
    }
};

const handleClickOutside = (event) => {
    if (!event.target.closest(".context-menu")) {
        hideContextMenu();
    }
};
onMounted(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('scroll', hideContextMenu);
});
onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('scroll', hideContextMenu);
});

defineExpose({ openContextMenu }); 
</script>

<style lang="scss" scoped>
.context-menu {
    position: fixed;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 10px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    min-width: 120px;
    max-width: calc(100vw - 16px);
    box-sizing: border-box;

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    li {
        padding: 8px 14px;
        cursor: pointer;
        position: relative;
        border-radius: 10px;
        white-space: nowrap;

        &:hover {
            background-color: var(--background-color);
        }
    }
}

.context-menu.submenu-left .submenu {
    left: auto;
    right: 100%;
}

.submenu {
    position: absolute;
    left: 100%;
    top: 0;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 10px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
    padding: 5px 0;
    max-height: 320px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;

    li {
        width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .submenu-tip {
        color: #999;
        font-size: 12px;
        cursor: default;

        &:hover {
            background-color: transparent;
        }
    }
}
</style>

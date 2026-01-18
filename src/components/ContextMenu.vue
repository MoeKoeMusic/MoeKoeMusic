<template>
    <div v-if="showContextMenu" :style="{ top: `${menuPosition.y}px`, left: `${menuPosition.x}px` }"
        class="context-menu">
        <ul>
            <li @mouseenter="fetchPlaylists" @mouseleave="hideSubMenu">
                <i class="fa-solid fa-plus"></i>
                {{ MoeAuth.isAuthenticated ? $t('tian-jia-ge-dan') : $t('qing-xian-deng-lu') }} <i
                    class="fa-solid fa-chevron-right"></i>
                <ul v-if="MoeAuth.isAuthenticated && showSubMenu" class="submenu">
                    <li v-for="playlist in playlists" :key="playlist.listid"
                        @click="addToPlaylist(playlist.listid, contextSong)">
                        {{ playlist.name }}
                    </li>
                </ul>
            </li>
            <li v-if="contextSong.mvhash" @click="playMV(contextSong.mvhash)"><i class="fa-solid fa-video"></i> 播放MV</li>
            <li @click="shareSong(contextSong)"><i class="fa-solid fa-share-nodes"></i> 分享</li>
            <li v-if="MoeAuth.isAuthenticated && listId && contextSong.userid === MoeAuth.UserInfo.userid" @click="cancel()"><i class="fa-solid fa-heart"></i> 取消收藏</li>
            <li v-if="MoeAuth.isAuthenticated" @click="addToNext(contextSong)"><i class="fa-solid fa-arrow-right"></i> 添加到下一首</li>
        </ul>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { get } from '../utils/request';
import { MoeAuthStore } from '../stores/store';
import i18n from '@/utils/i18n';
import { share } from '@/utils/utils';

const router = useRouter();
const MoeAuth = MoeAuthStore();
const showContextMenu = ref(false);
const showSubMenu = ref(false);
const menuPosition = ref({ x: 0, y: 0 });
const playlists = ref([]);
const listId = ref(0);
const contextSong = ref(null);
let events;
// 右键菜单显示与隐藏
const openContextMenu = (event, song, Id) => {
    events = event
    event.preventDefault();
    showContextMenu.value = true;
    listId.value = Id;
    menuPosition.value = { x: event.clientX, y: event.clientY };
    contextSong.value = song;
};
const hideContextMenu = () => {
    showContextMenu.value = false;
    showSubMenu.value = false;
};
// 获取歌单列表
const fetchPlaylists = async () => {
    if(!MoeAuth.isAuthenticated) return;
    showSubMenu.value = true;
    try {
        const playlistResponse = await get('/user/playlist',{
            pagesize:100
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

        const resolved = router.resolve({
            path: '/video',
            query: { hash: mvhash, title }
        });
        const base = window.location.href.split('#')[0];
        const href = resolved.href || '';
        const fullUrl = href.startsWith('#')
            ? `${base}${href}`
            : `${base}#${href.startsWith('/') ? href : `/${href}`}`;

        if (window.electronAPI) {
            await window.electronAPI.openMvWindow(fullUrl);
        } else {
            const width = 960;
            const height = 620;
            const left = Math.max(0, Math.round((window.screen.width - width) / 2));
            const top = Math.max(0, Math.round((window.screen.height - height) / 2));
            const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`;

            const popup = window.open(fullUrl, 'moekoe-mv', features);
            if (popup) {
                popup.focus?.();
            } else {
                await router.push(resolved);
            }
        }
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

<style scoped>
.context-menu {
    position: fixed;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 10px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
    z-index: 1000;
}

.context-menu ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.context-menu li {
    padding: 8px 14px;
    cursor: pointer;
    position: relative;
    border-radius: 10px;
}

.context-menu li:hover {
    background-color: var(--background-color)
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
}

.submenu li {
    width: 150px;
}
</style>

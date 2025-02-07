<template>
    <div class="playlist-detail-page">
        <div class="playlist-header">
            <img class="album-art" :src="detail.pic? $getCover(detail.pic, 240) : './assets/images/live.png'" />
            <div class="playlist-info">
                <h1 class="playlist-title">{{ detail.name }}</h1>
                <p class="playlist-subtitle">{{ detail.publish_date }} | {{ detail.list_create_username }}</p>
                <p class="playlist-meta">{{ detail.tags }}</p>
                <p class="playlist-description">{{ detail.intro }}</p>
                <div class="playlist-actions">
                    <button class="play-btn" @click="addPlaylistToQueue($event)">
                        <i class="fas fa-play"></i> {{ $t('bo-fang') }}
                    </button>
                    <button class="fav-btn" v-if="detail.list_create_userid != MoeAuth.UserInfo?.userid && !route.query.listid" @click="toggleFavorite(detail.list_create_gid)">
                        <i class="fas fa-heart"></i>
                    </button>
                    <div class="more-btn-container">
                        <button class="more-btn" @click="toggleDropdown">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                        <div v-if="isDropdownVisible" class="dropdown-menu">
                            <ul>
                                <li @click="deletePlaylist(detail.listid)" v-if="(detail.list_create_userid == MoeAuth.UserInfo?.userid || route.query.listid) && detail.sort > 1">
                                    <i class="fas fa-trash-alt"></i>
                                </li>
                                <li @click="sharePlaylist">
                                    <i class="fas fa-share-alt"></i>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <i class="location-arrow fas fa-location-arrow" @click="scrollToItem" :title="t('dang-qian-bo-fang-ge-qu')"></i>
        <img :src="`./assets/images/lemon.gif`" class="scroll-bottom-img" @click="scrollToFirstItem" :title="t('fan-hui-ding-bu')"/>
        <div class="track-list">
            <div class="track-list-header">
                <h2 class="track-list-title"><span>{{ $t('ge-qu-lie-biao') }}</span> ( {{ detail.count }} )</h2>
                <input type="text" v-model="searchQuery" @keyup.enter="searchTracks" :placeholder="t('sou-suo-ge-qu') " class="search-input" />
            </div>
            <RecycleScroller ref="recycleScrollerRef" :items="filteredTracks" :item-size="50" class="track-list" key-field="hash">
                <template #default="{ item, index }">
                    <div class="li" :key="item.hash"
                        @click="playSong($getQuality(item.relate_goods), item.name.split(' - ')[1], $getCover(item.cover, 480), item.name.split(' - ')[0])"
                        @contextmenu.prevent="showContextMenu($event, item)">
                        <div class="track-number">{{ index + 1 }}</div>
                        <div class="track-title" :title="item.name">{{ item.name.split(' - ')[1] || item.name }}
                            <span v-if="item.privilege == 10" class="icon vip-icon">VIP</span>
                            <span v-if="item.relate_goods.length > 2" class="icon sq-icon">SQ</span>
                            <span v-else-if="item.relate_goods.length > 1" class="icon sq-icon">HQ</span>
                        </div>
                        <div class="track-artist" :title="item.name.split(' - ')[0]">{{ item.name.split(' - ')[0] }}</div>
                        <div class="track-album" :title="item.albuminfo?.name">{{ item.albuminfo?.name }}</div>
                        <div class="track-duration">
                            <button v-if="props.playerControl.currentSong.hash == item.hash" class="queue-play-btn fas fa-music"></button>
                            {{ $formatMilliseconds(item.timelen) }}
                        </div>
                    </div>
                </template>
            </RecycleScroller>
        </div>
        <ContextMenu ref="contextMenuRef" :playerControl="playerControl" />
        <div class="note-container">
            <transition-group name="fly-note">
                <div v-for="note in flyingNotes" :key="note.id" class="flying-note":style="note.style">♪</div>
            </transition-group>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { RecycleScroller } from 'vue3-virtual-scroller';
import ContextMenu from '../components/ContextMenu.vue';
import { get } from '../utils/request';
import { useRoute } from 'vue-router';
import { MoeAuthStore } from '../stores/store';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
const { t } = useI18n();
const MoeAuth = MoeAuthStore();
const router = useRouter();
const route = useRoute();
const tracks = ref([]);
const filteredTracks = ref([]);
const pageSize = ref(250);
const detail = ref([]);
const searchQuery = ref('');
const contextMenuRef = ref(null);
const recycleScrollerRef = ref(null);
const isDropdownVisible = ref(false);
const flyingNotes = ref([]);
let noteId = 0;
const playSong = (hash, name, img, author) => {
    props.playerControl.addSongToQueue(hash, name, img, author);
};
const addPlaylistToQueue = (event) => {
    const playButton = event.currentTarget;
    const rect = playButton.getBoundingClientRect();
    const note = {
        id: noteId++,
        style: {
            '--start-x': `${rect.left + rect.width/2}px`,
            '--start-y': `${rect.top + rect.height/2}px`,
            'left': '0',
            'top': '0'
        }
    };
    flyingNotes.value.push(note);
    setTimeout(() => {
        flyingNotes.value = flyingNotes.value.filter(n => n.id !== note.id);
    }, 1500);

    const newTracks = filteredTracks.value.map(track => ({...track, author: track.name.split(' - ')[0], name: track.name.split(' - ')[1]}))
    props.playerControl.addPlaylistToQueue(newTracks);
}
const toggleFavorite = async (id) => {
    if(!MoeAuth.isAuthenticated){
        window.$modal.alert(t('qing-xian-deng-lu'));
        return;
    }
    try {
        await get('/playlist/add', { name: detail.value.name, list_create_userid: MoeAuth.UserInfo.userid, type: 1,list_create_gid:id });
        localStorage.setItem('t', Date.now());
        window.$modal.alert(t('shou-cang-cheng-gong'));
    } catch (error) {
        window.$modal.alert(t('shou-cang-shi-bai'));
    }
}
const deletePlaylist = async () => {
    isDropdownVisible.value = false;
    const result = await window.$modal.confirm(t('que-ren-shan-chu-ge-dan'));
    if (result) {
        await get('/playlist/del', { listid: route.query.listid });
        localStorage.setItem('t', Date.now());
        router.back();
    }
}
const props = defineProps({
    playerControl: Object
});
onMounted(() => {
    getdetail();
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});

const handleClickOutside = (event) => {
    const dropdown = document.querySelector('.dropdown-menu');
    const moreBtn = document.querySelector('.more-btn');
    if (dropdown && !dropdown.contains(event.target) && !moreBtn.contains(event.target)) {
        isDropdownVisible.value = false;
    }
};

watch(() => route.query.global_collection_id, () => {
    getdetail();
});

const showContextMenu = (event, song) => {
    if (contextMenuRef.value) {
        contextMenuRef.value.openContextMenu(event, { 
            OriSongName: song.name, 
            FileHash: song.hash, 
            fileid: song.fileid,
            userid: detail.value.list_create_userid,
            timeLength: song.timelen,
            cover: song.cover,
        }, detail.value.listid);
    }
};
const getdetail = async () => {
    const response = await get('/playlist/detail', { ids: route.query.global_collection_id });
    if (response.status == 1) {
        detail.value = response.data[0];
        getTracks();
    }
};

const searchTracks = () => {
    filteredTracks.value = tracks.value.filter(track => track.name.includes(searchQuery.value));
}

const getTracks = async () => {
    let allTracks = [];
    let currentPage = 1;
    try{    
        const firstPageResponse = await get('/playlist/track/all', {
            id: route.query.global_collection_id,
            page: currentPage,
            pagesize: pageSize.value
        });
        if (firstPageResponse.status == 1) {
            allTracks = firstPageResponse.data.info;
            tracks.value = allTracks;
            filteredTracks.value = allTracks;
            currentPage++;
        }
    }catch(error){
        window.$modal.alert(t('ge-qu-shu-ju-cuo-wu'));
        return;
    }

    const totalPages =  Math.ceil(detail.value.count / pageSize.value);
    for(let i = 1; i < totalPages; i++){
        const response = await get('/playlist/track/all', {
            id: route.query.global_collection_id,
            page: currentPage,
            pagesize: pageSize.value
        });
        if (response.status == 1) {
            if (response.data.info.length > 0) {
                allTracks = allTracks.concat(response.data.info);
                currentPage++;
            }
            if(response.data.info.length < pageSize.value) break;
        } else {
            break;
        }
    }
    tracks.value = allTracks;
    filteredTracks.value = allTracks;
};

const scrollToFirstItem = () => {
    recycleScrollerRef.value.scrollToItem(0, { behavior: 'smooth' });
    window.scrollTo({
        top: 0,
        behavior: 'smooth' 
    });
}

const scrollToItem = () => {
    const currentIndex = filteredTracks.value.findIndex(song => song.hash === props.playerControl.currentSong.hash);
    recycleScrollerRef.value.scrollToItem(currentIndex - 5, { behavior: 'smooth' });
}

const toggleDropdown = () => {
    isDropdownVisible.value = !isDropdownVisible.value;
};

const sharePlaylist = () => {
    isDropdownVisible.value = false;
    navigator.clipboard.writeText(route.query.global_collection_id);
    window.$modal.alert(t('yi-fu-zhi-fen-xiang-ma-qing-zai-moekoe-ke-hu-duan-zhong-fang-wen'));
};

</script>

<style scoped>
.playlist-detail-page {
    padding: 20px;
}

.playlist-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
}

.album-art {
    width: 200px;
    height: 200px;
    border-radius: 10px;
    margin-right: 20px;
}

.playlist-info {
    max-width: 600px;
}

.playlist-title {
    font-size: 36px;
    font-weight: bold;
    width: 800px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.playlist-subtitle {
    font-size: 18px;
    color: #666;
}

.playlist-meta {
    font-size: 14px;
    margin-bottom: 10px;
    color: #999;
}

.playlist-description {
    font-size: 16px;
    margin-bottom: 20px;
    max-height: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: break-spaces;
    overflow-y: auto;
}

.playlist-actions {
    display: flex;
    gap: 10px;
}

.play-btn {
    background-color: #ff69b4;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
}

.play-btn i {
    margin-right: 5px;
}

.fav-btn,
.more-btn {
    background-color: transparent;
    border: 1px solid #ccc;
    padding: 10px;
    border-radius: 5px;
    cursor: pointer;
    border:1px solid var(--secondary-color);
}

.fav-btn i{
    color: var(--color-primary);
}

.track-list {
    margin-top: 20px;
    max-height: 800px;
}


.track-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.search-input {
    width: 250px; 
    padding: 8px;
    border: 1px solid var(--secondary-color);
    border-radius: 20px;
    box-sizing: border-box;
    padding-left: 15px;
}

.track-list-title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 10px;
}

.track-list .li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #eee;
    padding-left: 10px;
    border-radius: 5px;
    padding-right: 10px;
    cursor: pointer;
}

.track-list .li:hover {
    background-color: #f0f0f0;
}

.track-number {
    font-weight: bold;
    margin-right: 10px;
    width: 30px;
}

.track-title {
    flex: 2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.track-artist {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 10px;
}

.track-album {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 10px;
}

.track-duration {
    width: 95px;
    text-align: right;
}

.icon {
    margin-left: 5px;
    border: 1px solid;
    border-radius: 5px;
    font-size: 10px;
    padding-left: 6px;
    padding-right: 6px;
}

.vip-icon {
    color: #ff6d00;
}

.sq-icon {
    color: #0094ff;
}

.location-arrow {
    position: fixed;
    bottom: 168px;
    right: 16px;
    z-index: 90;
    cursor: pointer;
    font-size: 37px;
    color: var(--primary-color);
}

.scroll-bottom-img {
    position: fixed;
    width: 60px;
    height: 60px;
    bottom: 110px;
    right: 88px;
    z-index: 90;
    cursor: pointer;
}

.queue-play-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--primary-color);
    cursor: pointer;
}
.more-btn-container{
    position: relative;
} 
.dropdown-menu {
    position: absolute;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    top: 50px;
    z-index: 50;
}

.dropdown-menu ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.dropdown-menu li {
    padding: 10px;
    cursor: pointer;
}

.dropdown-menu li:hover {
    background-color: #f0f0f0;
}


.note-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    overflow: hidden;
}

.flying-note {
    position: absolute;
    font-size: 36px;
    color: var(--primary-color);
    pointer-events: none;
    transform-origin: center;
}

.fly-note-enter-active {
    animation: fly-note 2s ease-out forwards;
}

.fly-note-leave-active {
    animation: fly-note 2s ease-out forwards;
}

@keyframes fly-note {
    0% {
        transform: translate(var(--start-x), calc(var(--start-y) - 50px)) rotate(0deg) scale(1.2);
        opacity: 0.9;
    }
    20% {
        transform: translate(calc(var(--start-x) + 20px), calc(var(--start-y) - 70px)) rotate(45deg) scale(1.3);
        opacity: 0.85;
    }
    100% {
        transform: translate(80vw, 100vh) rotate(360deg) scale(0.6);
        opacity: 0;
    }
}
</style>
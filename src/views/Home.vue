<template>
    <div class="container">
        <h2 class="section-title">{{ $t('tui-jian') }}</h2>
        <div class="recommendations">
            <div class="recommend-card">
                <a href="https://activity.kugou.com/download/v-a23b0cf0/index.html" target="_blank"><img
                        src="@/assets/images/home/recommend1.png" class="recommend-image" title="酷狗概念版下载"></a>
            </div>
            <div class="recommend-card">
                <a href="https://activity.kugou.com/getvips/v-4163b2d0/index.html" target="_blank"><img
                        src="@/assets/images/home/recommend2.png" class="recommend-image" title="每日领取VIP"></a>
            </div>

            <div class="recommend-card">
                <div class="card-content">
                    <router-link :to="{
                        path: '/PlaylistDetail',
                        query: { global_collection_id: 'collection_3_25230245_24_0' }
                    }">
                        <img src="@/assets/images/home/recommend3.png" class="recommend-image" title="阿珏酱の歌单">
                    </router-link>
                </div>
            </div>
        </div>

        <h2 class="section-title">{{ $t('tui-jian-ge-qu') }}</h2>
        <div v-if="isLoading" class="skeleton-loader">
            <div v-for="n in 16" :key="n" class="skeleton-item">
                <div class="skeleton-cover"></div>
                <div class="skeleton-info">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
            </div>
        </div>
        <div v-else class="song-list">
            <div class="song-item" v-for="(song, index) in songs" :key="index"
                @click="playSong($getQuality(null, song), song.ori_audio_name, $getCover(song.sizable_cover, 480), song.author_name)"
                @contextmenu.prevent="showContextMenu($event, song)">
                <img :src="$getCover(song.sizable_cover, 64)" :alt="song.ori_audio_name" class="song-cover">
                <div class="song-info">
                    <div class="song-title">{{ song.ori_audio_name }}</div>
                    <div class="song-artist">{{ song.author_name }}</div>
                </div>
            </div>
        </div>
        <h2 class="section-title">{{ $t('tui-jian-ge-dan') }}</h2>
        <div class="playlist-grid">
            <div class="playlist-item" v-for="(playlist, index) in special_list" :key="index">
                <router-link :to="{
                    path: '/PlaylistDetail',
                    query: { global_collection_id: playlist.global_collection_id }
                }">
                    <img :src="$getCover(playlist.flexible_cover, 240)" class="playlist-cover">
                    <div class="playlist-info">
                        <div class="playlist-title">{{ playlist.specialname }}</div>
                        <div class="playlist-description">{{ playlist.intro }}</div>
                    </div>
                </router-link>
            </div>
        </div>
        <ContextMenu ref="contextMenuRef" />
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { get } from '../utils/request';
import ContextMenu from '../components/ContextMenu.vue';
const songs = ref([]);
const special_list = ref([]);
const isLoading = ref(true);
const playSong = (hash, name, img, author) => {
    props.playerControl.addSongToQueue(hash, name, img, author);
};
const contextMenuRef = ref(null);
const showContextMenu = (event, song) => {
    if (contextMenuRef.value) {
        contextMenuRef.value.openContextMenu(event, { OriSongName: song.ori_audio_name, FileHash: song.hash });
    }
};
const props = defineProps({
    playerControl: Object
});
onMounted(() => {
    recommend();
    playlist();
});

const recommend = async () => {
    const response = await get('/everyday/recommend');
    if (response.status == 1) {
        songs.value = response.data.song_list;
    }
    isLoading.value = false;
}

const playlist = async () => {
    const response = await get(`/top/playlist?category_id=0`);
    if (response.status == 1) {
        special_list.value = response.data.special_list;
    }
}

</script>

<style scoped>
.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 0 20px 0;
}

.section-title {
    font-size: 28px;
    font-weight: bold;
    margin: 10px 0 10px 0;
    color: var(--primary-color);
}

.recommendations {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 25px;
    margin: 20px 0 40px 0;
    padding: 0 20px;
}

.recommend-card {
    width: 100%;
    height: 180px;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.recommend-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.recommend-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.recommend-card:hover .recommend-image {
    transform: scale(1.05);
}

.play-icon {
    font-size: 30px;
    color: white;
    cursor: pointer;
}

.card-content {
    display: flex;
    align-items: center;
}

.song-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    margin: 20px 20px 40px 20px;
}

.song-item {
    display: flex;
    align-items: center;
    gap: 15px;
    background-color: var(--background-secondary);
    padding: 12px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
}

.song-item:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
    background-color: var(--background-hover);
}

.song-cover {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.song-info {
    flex: 1;
    min-width: 0;
}

.song-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.song-artist {
    font-size: 13px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.playlist-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 25px;
    padding: 0 20px;
    margin-bottom: 40px;
}

.playlist-item {
    background-color: var(--background-secondary);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
}

.playlist-item:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 24px var(--color-box-shadow);
}

.playlist-cover {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.playlist-item:hover .playlist-cover {
    transform: scale(1.05);
}

.playlist-info {
    padding: 16px;
}

.playlist-title {
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 15px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.playlist-description {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    height: 40px;
}

.skeleton-loader {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    margin: 20px;
}

.skeleton-item {
    display: flex;
    align-items: center;
    padding: 12px;
    background-color: var(--background-secondary);
    border-radius: 12px;
    height: 80px;
}

.skeleton-cover {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    background-color: var(--skeleton-color);
}

.skeleton-info {
    flex: 1;
    margin-left: 15px;
}

.skeleton-line {
    height: 12px;
    background-color: var(--skeleton-color);
    border-radius: 6px;
    margin-bottom: 8px;
}

.skeleton-line.short {
    width: 60%;
}

@media (max-width: 768px) {
    .recommendations {
        grid-template-columns: 1fr;
    }

    .recommend-card {
        height: 150px;
    }

    .song-list {
        grid-template-columns: 1fr;
    }

    .playlist-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 15px;
    }
}
</style>
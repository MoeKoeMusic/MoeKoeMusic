<template>
    <div class="container">
        <h2 class="section-title">{{ $t('tui-jian') }}</h2>
        <div class="recommendations">
            <div class="recommend-card gradient-background">
                <div class="radio-card">
                    <div class="radio-left">
                        <div class="disc-container">
                            <img :src="`./assets/images/home/hutao1.png`" class="radio-disc">
                        </div>
                        <div class="decorative-box">
                            <div class="music-bars">
                                <div class="bar"></div>
                                <div class="bar"></div>
                                <div class="bar"></div>
                                <div class="bar"></div>
                            </div>
                        </div>
                        <div class="play-button" @click="playFM"></div>
                        <div class="note-container">
                            <transition-group name="fly-note">
                                <div v-for="note in flyingNotes" :key="note.id" class="flying-note" :style="note.style">
                                    ♪</div>
                            </transition-group>
                        </div>
                    </div>
                    <div class="radio-content gradient-background">
                        <div class="radio-title">
                            <span class="heart-icon">💖</span>
                            MoeKoe Radio
                            <span class="shuffle-icon" @click="toggleMode">{{ modeIcon }}</span>
                        </div>
                        <div class="radio-subtitle">{{ radioSubtitle }}</div>
                    </div>
                </div>
            </div>
            <div class="recommend-card">
                <router-link :to="{
                    path: '/Ranking'
                }" class="ranking-entry">
                    <div class="ranking-content">
                        <img :src="`./assets/images/home/hutao2.png`" class="ranking-icon">
                        <h3 class="ranking-title">排行榜</h3>
                        <div class="ranking-description">发现你的专属好歌</div>
                    </div>
                </router-link>
            </div>

            <div class="recommend-card">
                <div class="playlist-entry gradient-background">
                    <router-link :to="{
                        path: '/PlaylistDetail',
                        query: { global_collection_id: 'collection_3_25230245_24_0' }
                    }">
                        <div class="playlist-content">
                            <div class="playlist-icon">
                                <img :src="`./assets/images/home/hutao.png`" />
                            </div>
                            <div class="ranking-description">送给也喜欢音乐的你</div>
                        </div>
                    </router-link>
                </div>
            </div>
        </div>

        <h2 class="section-title">
            <img :src="`./assets/images/home/mama.png`" class="mama" @click="addAllSongsToQueue">
            {{ $t('mei-ri-tui-jian') }}
        </h2>
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
                @click="playSong(song['hash'], song.ori_audio_name, $getCover(song.sizable_cover, 480), song.author_name)"
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
        <ContextMenu ref="contextMenuRef" :playerControl="playerControl" />
    </div>
</template>

<script setup>
import { ref, onMounted, computed, onUpdated } from "vue";
import { get } from '../utils/request';
import ContextMenu from '../components/ContextMenu.vue';
import { useRoute, useRouter } from 'vue-router';
import { getCover } from '../utils/utils';

const router = useRouter();
const route = useRoute();
const songs = ref([]);
const special_list = ref([]);
const isLoading = ref(true);
const playSong = (hash, name, img, author) => {
    props.playerControl.addSongToQueue(hash, name, img, author);
};
const contextMenuRef = ref(null);
const showContextMenu = (event, song) => {
    if (contextMenuRef.value) {
        contextMenuRef.value.openContextMenu(event, {
            OriSongName: song.filename,
            FileHash: song.hash,
            cover: song.sizable_cover?.replace("{size}", 480) || './assets/images/ico.png',
            timeLength: song.time_length
        });
    }
};
const props = defineProps({
    playerControl: Object
});

const currentMode = ref('1');
const modes = ['1', '2', '3', '4', '6'];

const modeIcon = computed(() => {
    switch (currentMode.value) {
        case '1': return '💖';
        case '2': return '🎶';
        case '3': return '🔥';
        case '4': return '💎';
        case '6': return '👑';
        default: return '💖';
    }
});

const radioSubtitle = computed(() => {
    switch (currentMode.value) {
        case '1': return '私人专属好歌推荐';
        case '2': return '经典怀旧金曲精选';
        case '3': return '热门好歌随心听';
        case '4': return '小众宝藏佳作发现';
        case '6': return 'VIP专属音乐推荐';
        default: return '根据你的听歌喜好推荐';
    }
});

const toggleMode = () => {
    const currentIndex = modes.indexOf(currentMode.value);
    const nextIndex = (currentIndex + 1) % modes.length;
    currentMode.value = modes[nextIndex];
};

const flyingNotes = ref([]);
let noteId = 0;

const playFM = async (event) => {
    try {
        const playButton = event.currentTarget;
        const rect = playButton.getBoundingClientRect();
        const note = {
            id: noteId++,
            style: {
                '--start-x': `${rect.left + rect.width / 2}px`,
                '--start-y': `${rect.top + rect.height / 2}px`,
                'left': '0',
                'top': '0'
            }
        };
        flyingNotes.value.push(note);
        setTimeout(() => {
            flyingNotes.value = flyingNotes.value.filter(n => n.id !== note.id);
        }, 1500);

        const response = await get('/top/card', {
            params: {
                card_id: currentMode.value
            }
        });

        if (response.status === 1 && response.data?.song_list?.length > 0) {
            const newSongs = response.data.song_list.map(song => {
                return {
                    hash: song.hash,
                    name: song.songname,
                    cover: song.sizable_cover?.replace("{size}", 480),
                    author: song.author_name,
                    timelen: song.time_length
                }
            })
            props.playerControl.addPlaylistToQueue(newSongs);
        }
    } catch (error) {
        console.error('FM播放出错:', error);
    }
};

onMounted(() => {
    recommend();
    playlist();
});

onUpdated(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!window.electron) {
        if (route.query.hash) {
            privilegeSong(route.query.hash).then(res => {
                if (res.status == 1) {
                    const songInfo = res.data[0];
                    playSong(songInfo.hash, songInfo.albumname, getCover(songInfo.info.image, 480), songInfo.singername)
                    router.push('/');
                }
            })
        } else if (route.query.listid) {
            router.push({
                path: '/PlaylistDetail',
                query: { global_collection_id: route.query.listid }
            });
        }
    }
})

const recommend = async () => {
    const response = await get('/everyday/recommend');
    if (response.status == 1) {
        songs.value = response.data.song_list.sort(() => Math.random() - 0.5);
    }
    isLoading.value = false;
}

const playlist = async () => {
    const response = await get(`/top/playlist?category_id=0`);
    if (response.status == 1) {
        special_list.value = response.data.special_list;
    }
}

const privilegeSong = async (hash) => {
    const response = await get(`/privilege/lite`, { hash: hash });
    return response;
}
const addAllSongsToQueue = () => {
    props.playerControl.addPlaylistToQueue(songs.value.map(song => ({
        hash: song.hash,
        name: song.ori_audio_name,
        cover: song.sizable_cover?.replace("{size}", 480),
        author: song.author_name,
        timelen: song.time_length
    })));
};

</script>

<style lang="scss" scoped>
.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

.section-title {
    font-size: 28px;
    font-weight: bold;
    margin-bottom: 30px;
    color: var(--primary-color);

    .mama {
        position: absolute;
        height: 40px;
        margin-left: 117px;
        cursor: cell;
    }
}

.recommendations {
    display: flex;
    gap: 35px;
    margin-bottom: 40px;
}

.recommend-card {
    width: 400px;
    height: 200px;
    border-radius: 15px;
    overflow: hidden;
    transition: transform 0.3s ease, box-shadow 0.3s ease;

    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    }

    &.gradient-background {
        background: linear-gradient(135deg, var(--primary-color), #8ff2ff);
        color: white;
    }
}

.recommend-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 15px;
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
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 20px;
    justify-content: flex-start;
}

.song-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: calc(20% - 30px);
    background-color: #fff;
    padding: 10px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease;
    cursor: pointer;

    &:hover {
        transform: translateY(-5px);
    }
}

.song-cover {
    width: 50px;
    height: 50px;
    border-radius: 5px;
}

.song-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.song-title {
    font-size: 16px;
    font-weight: bold;
    color: var(--primary-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.song-artist {
    font-size: 14px;
    color: #666;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.playlist-grid {
    display: flex;
    gap: 35px;
    flex-wrap: wrap;
    justify-content: space-evenly;

    @media screen and (max-width: 1400px) {
        gap: 25px;
    }

    @media screen and (max-width: 1200px) {
        gap: 20px;
    }

    @media screen and (max-width: 1024px) {
        gap: 18px;
    }

    @media screen and (max-width: 768px) {
        gap: 15px;
    }

    @media screen and (max-width: 576px) {
        gap: 12px;
    }
}

.playlist-item {
    background-color: #fff;
    border-radius: 10px;
    overflow: hidden;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    width: calc(16.666% - 30px);

    @media screen and (max-width: 1400px) {
        width: calc(20% - 20px);
    }

    @media screen and (max-width: 1200px) {
        width: calc(25% - 15px);
    }

    @media screen and (max-width: 1024px) {
        width: calc(25% - 14px);
    }

    @media screen and (max-width: 768px) {
        width: calc(33.333% - 10px);
        min-width: 150px;
    }

    @media screen and (max-width: 576px) {
        width: calc(50% - 6px);
        min-width: 140px;
    }

    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px var(--color-box-shadow);
    }
}

.playlist-cover {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
}

.playlist-info {
    padding: 15px;
}

.playlist-title {
    font-weight: bold;
    margin-bottom: 5px;
    font-size: 16px;
    color: var(--primary-color);

    @media screen and (max-width: 768px) {
        font-size: 14px;
    }
}

.playlist-description {
    color: #666;
    font-size: 14px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    max-height: 50px;
    line-height: 25px;

    @media screen and (max-width: 768px) {
        font-size: 12px;
    }
}

.skeleton-loader {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    margin-top: 10px;
}

.skeleton-item {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    width: 250px;
    border-radius: 10px;
    padding-left: 10px;
    background-color: #f0f0f0;
    height: 68px;
}

.skeleton-cover {
    width: 50px;
    height: 50px;
    margin-right: 10px;
    border-radius: 10px;
    background-color: #e0e0e0;
}

.skeleton-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 190px;
}

.skeleton-line {
    height: 10px;
    background-color: #e0e0e0;
    margin-bottom: 5px;
    border-radius: 5px;
    width: 150px;
}

.radio-card {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    border-radius: 15px;
}

.radio-left {
    flex: 0;
    margin-top: 7px;
    display: flex;
    align-items: center;
    width: 100%;
    justify-content: space-between;
}

.disc-container {
    position: relative;
    order: 1;
}

.radio-disc {
    width: 125px;
    height: 125px;
    object-fit: cover;
    border-radius: 50%;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2),
        inset 0 0 20px rgba(0, 0, 0, 0.1),
        0 2px 4px rgba(255, 255, 255, 0.8);
    padding: 2px;
}

.decorative-box {
    width: 60px;
    height: 60px;
    position: relative;
    border-radius: 12px;
    transform: perspective(500px) rotateY(-15deg);
    transition: transform 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 10px;
}

.music-bars {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 30px;
}

.bar {
    width: 3px;
    background: #4a90e2;
    border-radius: 3px;
    animation: sound-wave 1.2s ease-in-out infinite;

    @for $i from 1 through 4 {
        &:nth-child(#{$i}) {
            @if $i ==1 {
                height: 15px;
                animation-delay: 0s;
            }

            @else if $i ==2 {
                height: 20px;
                animation-delay: 0.2s;
            }

            @else if $i ==3 {
                height: 12px;
                animation-delay: 0.4s;
            }

            @else if $i ==4 {
                height: 18px;
                animation-delay: 0.6s;
            }
        }
    }
}

@keyframes sound-wave {

    0%,
    100% {
        transform: scaleY(1);
    }

    50% {
        transform: scaleY(0.5);
    }
}

.play-button {
    order: 3;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
    margin-right: 20px;
    margin-top: -57px;
    position: relative;
    font-size: 20px;
    color: #333;

    &::after {
        content: '♪';
        transition: all 0.2s ease;
        border: none;
        margin-left: 0;
    }

    &:hover {
        transform: scale(1.05);
        background: var(--primary-color);
        color: #fff;

        &::after {
            border-color: none;
        }
    }
}

.radio-title {
    justify-content: center;
    font-size: 22px;
    font-weight: bold;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
}

.heart-icon {
    font-size: 20px;
}

.shuffle-icon {
    font-size: 20px;
    color: #666;
    cursor: pointer;
    transition: transform 0.3s ease;

    &:hover {
        transform: scale(1.1);
        color: var(--primary-color);
    }
}

.radio-subtitle {
    font-size: 15px;
    color: white;
    text-align: center;
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

.ranking-entry {
    display: block;
    width: 100%;
    height: 100%;
    text-decoration: none;
    background: linear-gradient(135deg, var(--primary-color), #9f92ff);
    border-radius: 15px;
    overflow: hidden;
}

.ranking-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    position: relative;
}

.ranking-icon {
    width: 135px;
}

.ranking-title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 0px;
    margin-top: 0px;
}

.ranking-description {
    font-size: 16px;
    opacity: 0.9;
}

.playlist-entry {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border-radius: 15px;
    background: linear-gradient(135deg, var(--primary-color), #cfff82);
    color: white;
    text-align: center;
    transition: transform 0.3s ease, box-shadow 0.3s ease;

    &:hover {
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    }
}

.playlist-content {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    justify-content: flex-end;
}

.playlist-icon {
    width: 144px;
    height: 144px;

    img {
        width: 100%;
        height: 100%;
    }
}
</style>
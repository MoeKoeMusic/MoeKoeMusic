<template>
    <div class="ranking-container">
        <!-- 添加榜单选择区域 -->
        <div class="rank-selector">
            <div v-for="rank in allRanks" :key="rank.rankid" class="rank-chip"
                :class="{ active: selectedRankIds.includes(rank.rankid) }" @click="toggleRank(rank)">
                {{ rank.rankname }}
            </div>
        </div>

        <!-- 现有的榜单展示区域 -->
        <div class="ranking-list">
            <div class="ranking-item" v-for="(rank, index) in displayedRanks" :key="index">
                <div class="rank-header">
                    <div class="rank-cover">
                        <img :src="$getCover(rank.imgurl, 640)">
                    </div>
                    <div class="rank-info">
                        <h2 class="rank-title" :style="{ color: rank.album_cover_color }">{{ rank.rankname }}</h2>
                        <span class="rank-update">{{ formatIntro(rank.intro) }}</span>
                    </div>
                    <div class="rank-play-btn" @click.stop="handlePlayClick($event, rank.songs)">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
                <div class="song-list" @scroll="handleScroll($event, rank.rankid)">
                    <div class="song-item" v-for="(song, sIndex) in rank.songs" :key="sIndex"
                        @click="props.playerControl.addSongToQueue(song.deprecated.hash, song.songname, $getCover(song.trans_param.union_cover, 480), song.author_name)">
                        <div class="song-rank">
                            <span class="song-index" :class="{ 'top-three': sIndex < 3 }">{{ sIndex + 1 }}</span>
                        </div>
                        <div class="song-cover">
                            <img :src="$getCover(song.trans_param.union_cover, 120)">
                            <div class="hover-play">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>
                        <div class="song-info">
                            <div class="song-content">
                                <div class="song-main">
                                    <div class="song-name">{{ song.songname }}</div>
                                    <div class="song-author">{{ song.author_name }}</div>
                                </div>
                                <div class="song-meta">
                                    <span class="album">{{ song.album_name }}</span>
                                    <span class="duration">{{ $formatMilliseconds(song.deprecated.duration) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="rankPagination[rank.rankid]?.loading" class="loading-indicator">
                        <div class="loading-spinner"></div>
                        <span>加载中...</span>
                    </div>

                    <div v-else-if="!rankPagination[rank.rankid]?.hasMore && rank.songs?.length > 0"
                        class="no-more-indicator">
                        <span>已加载全部歌曲</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { get } from '../utils/request';

const allRanks = ref([]);
const displayedRanks = ref([]);
const selectedRankIds = ref([]);
const pagesize = 30;
const rankPagination = ref({});

const props = defineProps({
    playerControl: Object
});

const saveSelectedRanks = () => {
    localStorage.setItem('selectedRankIds', JSON.stringify(selectedRankIds.value));
};

const initRankPagination = (rankId) => {
    if (!rankPagination.value[rankId]) {
        rankPagination.value[rankId] = {
            currentPage: 1,
            loading: false,
            hasMore: true
        };
    }
};

// 加载榜单歌曲数据
const loadRankSongs = async (rankId, page = 1, append = false) => {
    const pagination = rankPagination.value[rankId];
    if (pagination.loading) return;

    pagination.loading = true;

    try {
        const songsResponse = await get(`/rank/audio?rankid=${rankId}&page=${page}&pagesize=${pagesize}`);
        if (songsResponse.status === 1) {
            const newSongs = songsResponse.data.songlist || [];
            const rank = displayedRanks.value.find(r => r.rankid === rankId);

            if (rank) {
                if (append) {
                    rank.songs = [...(rank.songs || []), ...newSongs];
                } else {
                    rank.songs = newSongs;
                }
            }

            // 如果返回的歌曲数量少于pagesize，说明没有更多数据了
            if (newSongs.length < pagesize) {
                pagination.hasMore = false;
            }

            pagination.currentPage = page;
        }
    } catch (error) {
        console.error('加载榜单歌曲失败:', error);
    } finally {
        pagination.loading = false;
    }
};

// 加载指定的榜单
const loadSelectedRanks = async (rankList, rankIds) => {
    for (const rankId of rankIds) {
        const rank = rankList.find(r => r.rankid === rankId);
        if (rank) {
            selectedRankIds.value.push(rank.rankid);
            initRankPagination(rank.rankid);
            displayedRanks.value.push(rank);
            await loadRankSongs(rank.rankid, 1, false);
        }
    }
};

// 随机选择并加载榜单
const loadRandomRanks = async (rankList, count = 4) => {
    const randomRanks = rankList.sort(() => 0.5 - Math.random()).slice(0, count);

    for (const rank of randomRanks) {
        selectedRankIds.value.push(rank.rankid);
        initRankPagination(rank.rankid);
        displayedRanks.value.push(rank);
        await loadRankSongs(rank.rankid, 1, false);
    }
    saveSelectedRanks();
};

// 切换榜单选择状态
const toggleRank = async (rank) => {
    const index = selectedRankIds.value.indexOf(rank.rankid);

    if (index === -1 && selectedRankIds.value.length < 6) {
        selectedRankIds.value.push(rank.rankid);
        initRankPagination(rank.rankid);
        displayedRanks.value.push(rank);
        await loadRankSongs(rank.rankid, 1, false);
    } else if (index !== -1) {
        selectedRankIds.value.splice(index, 1);
        displayedRanks.value = displayedRanks.value.filter(r => r.rankid !== rank.rankid);
        // 清理分页状态
        delete rankPagination.value[rank.rankid];
    }
    saveSelectedRanks();
};

const formatIntro = (intro) => {
    if (!intro) return '';
    const parts = intro.split('\n');
    const sortRule = parts.find(p => p.includes('排序方式：'))?.replace('排序方式：', '').trim() || '';
    const updateFreq = parts.find(p => p.includes('更新频率：'))?.replace('更新频率：', '').trim() || '';

    if (sortRule && updateFreq) {
        return `${sortRule} (${updateFreq})`;
    }
    return intro;
};

// 添加播放整个榜单
const playRankSongs = (songs) => {
    if (props.playerControl && songs?.length) {
        const newTracks = songs.map(song => ({
            hash: song.deprecated.hash,
            author: song.author_name,
            name: song.songname,
            cover: song.trans_param.union_cover?.replace("{size}", 120),
            timelen: song.deprecated.duration
        }))
        props.playerControl.addPlaylistToQueue(newTracks);
    }
};

// 处理滚动事件，实现无限滚动
const handleScroll = (event, rankId) => {
    const element = event.target;
    const pagination = rankPagination.value[rankId];

    if (!pagination || pagination.loading || !pagination.hasMore) {
        return;
    }

    // 检查是否滚动到底部附近（距离底部50px时开始加载）
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    if (scrollTop + clientHeight >= scrollHeight - 50) {
        const nextPage = pagination.currentPage + 1;
        loadRankSongs(rankId, nextPage, true);
    }
};

// 处理播放按钮点击
const handlePlayClick = (event, songs) => {
    const note = document.createElement('i');
    note.className = 'fas fa-music music-note';
    const x = event.clientX;
    const y = event.clientY;
    note.style.left = x + 'px';
    note.style.top = y + 'px';

    document.body.appendChild(note);
    const targetX = window.innerWidth - 300;
    const targetY = window.innerHeight - 100;

    const deltaX = targetX - x;
    const deltaY = targetY - y;

    requestAnimationFrame(() => {
        note.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        note.style.opacity = '0';
    });

    setTimeout(() => {
        document.body.removeChild(note);
    }, 1000);

    playRankSongs(songs);
};

onMounted(async () => {
    const response = await get('/rank/list');
    if (response.status === 1) {
        allRanks.value = response.data.info;

        const savedRankIds = localStorage.getItem('selectedRankIds');
        if (savedRankIds) {
            const rankIds = JSON.parse(savedRankIds);
            await loadSelectedRanks(allRanks.value, rankIds);
        } else {
            await loadRandomRanks(allRanks.value, 4);
        }
    }
});
</script>

<style lang="scss" scoped>
.ranking-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
}

.rank-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.rank-chip {
    padding: 8px 16px;
    border-radius: 20px;
    background: #f5f5f5;
    color: #666;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
        background: #eeeeee;
        transform: translateY(-2px);
    }

    &.active {
        background: var(--primary-color) !important;
        color: white;
    }
}

.ranking-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    padding: 20px;
}

.ranking-item {
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    height: 600px;
    display: flex;
    flex-direction: column;

    &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }
}

.rank-header {
    display: flex;
    align-items: center;
    padding: 20px;
    position: relative;
    background: linear-gradient(to right, rgba(100, 61, 73, 0.133), transparent);
}

.rank-cover {
    width: 100px;
    height: 100px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
    }

    &:hover img {
        transform: scale(1.05);
    }
}

.rank-info {
    flex: 1;
    margin-left: 20px;
}

.rank-title {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 8px 0;
}

.rank-update {
    font-size: 13px;
    color: #666;
}

.rank-play-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;

    &:hover {
        transform: scale(1.1);
        background: var(--primary-color);

        i {
            color: white;
        }
    }

    i {
        font-size: 20px;
        color: var(--primary-color);
        transition: color 0.3s ease;
    }
}

.song-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 12px;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background: #ddd;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-track {
        background: #f5f5f5;
    }
}

.song-item {
    display: flex;
    align-items: center;
    padding: 12px 8px;
    border-radius: 8px;
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
        background: #f8f9fa;

        .hover-play {
            opacity: 1;
        }
    }
}

.song-rank {
    width: 40px;
    text-align: center;
}

.song-index {
    font-size: 16px;
    font-weight: 500;
    color: #999;

    &.top-three {
        font-size: 18px;
        font-weight: 600;
        background: linear-gradient(45deg, #ff6b6b, #ff8787);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
}

.song-cover {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    overflow: hidden;
    margin: 0 16px;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
}

.hover-play {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;

    i {
        color: white;
        font-size: 24px;
    }
}

.song-info {
    flex: 1;
    min-width: 0;
    padding-right: 12px;
}

.song-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.song-main {
    flex: 2;
    min-width: 0;
    margin-right: 16px;
}

.song-name {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.song-author {
    font-size: 13px;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.song-meta {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 0;
}

.album {
    flex: 1;
    font-size: 12px;
    color: #999;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 16px;
    text-align: right;
}

.duration {
    font-size: 12px;
    color: #999;
    flex-shrink: 0;
    min-width: 45px;
    text-align: right;
}

.loading-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: #666;
    font-size: 14px;
    gap: 8px;
}

.loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

.no-more-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    color: #999;
    font-size: 13px;
    border-top: 1px solid #f0f0f0;
    margin-top: 8px;
}

@media (max-width: 1200px) {
    .ranking-list {
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        padding: 15px;
    }

    .ranking-item {
        height: 500px;
        min-height: 500px;
    }

    .rank-header {
        padding: 15px;
    }

    .rank-cover {
        width: 80px;
        height: 80px;
    }

    .rank-title {
        font-size: 20px;
    }

    .rank-update {
        font-size: 12px;
    }
}

@media (max-width: 768px) {
    .ranking-container {
        padding: 10px;
    }

    .rank-selector {
        padding: 12px;
        gap: 8px;
    }

    .rank-chip {
        padding: 6px 12px;
        font-size: 12px;
    }

    .ranking-list {
        gap: 10px;
        padding: 10px;
        grid-template-columns: 1fr;
    }

    .ranking-item {
        height: 400px;
    }

    .rank-cover {
        width: 60px;
        height: 60px;
    }

    .rank-info {
        margin-left: 10px;
    }

    .rank-title {
        font-size: 16px;
        margin: 0 0 4px 0;
    }

    .song-cover {
        width: 40px;
        height: 40px;
        margin: 0 10px;
    }

    .song-rank {
        width: 30px;
    }

    .song-name {
        font-size: 13px;
    }

    .song-author {
        font-size: 12px;
    }

    .album {
        display: none;
    }
}

:global(.music-note) {
    position: fixed;
    color: #ff6b6b;
    font-size: 24px;
    pointer-events: none;
    z-index: 9999;
    transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
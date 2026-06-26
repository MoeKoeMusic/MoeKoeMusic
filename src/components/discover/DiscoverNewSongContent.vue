<template>
    <div class="discover-new-song-content">
        <CommonSkeleton v-if="isLoading" variant="song-list" :count="10" />

        <div v-else-if="newSongList.length > 0" class="song-section">
            <SongSearchList :songs="newSongList" @song-click="handleSongClick"
                @song-contextmenu="showContextMenu" />

            <div v-if="showSongPagination" class="pagination">
                <button @click="prevSongPage" :disabled="currentSongPage === 1">{{ $t('shang-yi-ye') }}</button>
                <div class="page-numbers">
                    <button v-for="pageNum in displayedSongPageNumbers" :key="pageNum" :class="['page-number', {
                        active: pageNum === currentSongPage,
                        ellipsis: pageNum === '...'
                    }]" @click="pageNum !== '...' && goToSongPage(pageNum)" :disabled="pageNum === '...'">
                        {{ pageNum }}
                    </button>
                </div>
                <button @click="nextSongPage" :disabled="currentSongPage === totalSongPages">{{ $t('xia-yi-ye') }}</button>
            </div>
        </div>

        <div v-else class="discover-placeholder">
            <div class="placeholder-card">
                <h3>新歌速递</h3>
                <p>暂无数据</p>
            </div>
        </div>
    </div>

    <ContextMenu ref="contextMenuRef" :playerControl="props.playerControl" />
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CommonSkeleton from '../CommonSkeleton.vue';
import ContextMenu from '../ContextMenu.vue';
import SongSearchList from '../search/SongSearchList.vue';
import { get } from '../../utils/request';
import { useActivatedWatch } from '../../composables/useActivatedWatch';

const route = useRoute();
const router = useRouter();

const props = defineProps({
    playerControl: Object
});

const songPageSize = 20;
const newSongList = ref([]);
const isLoading = ref(false);
const currentSongPage = ref(1);
const totalSongPages = ref(1);
const contextMenuRef = ref(null);

const showSongPagination = computed(() => {
    return totalSongPages.value > 1;
});

const displayedSongPageNumbers = computed(() => {
    return buildPageNumbers(totalSongPages.value, currentSongPage.value);
});

const normalizePage = (page) => {
    const value = parseInt(page, 10);
    return Number.isNaN(value) || value < 1 ? 1 : value;
};

const buildPageNumbers = (total, current) => {
    const delta = 2;
    const pages = [];

    if (total <= 7) {
        for (let i = 1; i <= total; i++) {
            pages.push(i);
        }
        return pages;
    }

    pages.push(1);

    const leftBound = Math.max(2, current - delta);
    const rightBound = Math.min(total - 1, current + delta);

    if (leftBound > 2) {
        pages.push('...');
    }

    for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
    }

    if (rightBound < total - 1) {
        pages.push('...');
    }

    pages.push(total);
    return pages;
};

const getAuthorNames = (authors = []) => {
    if (!Array.isArray(authors)) return '';
    return authors.map(item => item.author_name).filter(Boolean).join(' / ');
};

const mapNewSongToSearchSong = (song) => {
    const image = song.album_sizable_cover || song.trans_param?.union_cover || song.authors?.[0]?.sizable_avatar || './assets/images/ico.png';
    const singerName = song.author_name || getAuthorNames(song.authors) || '未知歌手';
    const displayName = song.filename || `${singerName} - ${song.songname || ''}`;

    return {
        Image: image,
        OriSongName: displayName,
        SongName: song.songname || '',
        SingerName: singerName,
        Duration: song.timelength || 0,
        PublishDate: song.publish_date || '',
        PublishTime: song.publish_date || '',
        FileHash: song.hash,
        HQFileHash: song.hash_high || song.hash_320 || song.hash,
        SQFileHash: song.hash_flac || song.hash_high || song.hash_320 || song.hash,
        FileName: displayName,
        MVHash: song.video_hash || '',
        AlbumID: song.album_id,
        AlbumName: song.album_name || '',
        IsOriginal: 0
    };
};

const fetchNewSongs = async () => {
    isLoading.value = true;
    newSongList.value = [];

    try {
        const response = await get('/top/song', {
            page: currentSongPage.value,
            pagesize: songPageSize
        });

        if (response.status === 1) {
            newSongList.value = Array.isArray(response.data) ? response.data.map(mapNewSongToSearchSong) : [];
            totalSongPages.value = Math.max(1, Math.ceil((response.total || 0) / songPageSize));
        }
    } catch (error) {
        console.error('获取新歌速递失败:', error);
    } finally {
        isLoading.value = false;
    }
};

const updateSongPageQuery = (page) => {
    const nextQuery = { ...route.query };

    if (page > 1) {
        nextQuery.songPage = page;
    } else {
        delete nextQuery.songPage;
    }

    router.replace({
        path: '/discover',
        query: nextQuery
    });
};

const playSong = (hash, name, img, author) => {
    props.playerControl?.addSongToQueue(hash, name, img, author);
};

const showContextMenu = (event, song) => {
    if (!contextMenuRef.value) return;

    song.cover = song.Image?.replace("{size}", 480) || './assets/images/ico.png';
    song.timeLength = song.Duration;
    song.OriSongName = song.FileName || song.OriSongName || song.SongName;
    contextMenuRef.value.openContextMenu(event, song);
};

const handleSongClick = (song) => {
    playSong(
        song?.HQFileHash || song?.SQFileHash || song?.FileHash,
        song?.OriSongName,
        song?.Image?.replace('{size}', 480) || './assets/images/ico.png',
        song?.SingerName
    );
};

const goToSongPage = (page) => {
    const nextPage = normalizePage(page);
    if (nextPage === currentSongPage.value) return;
    updateSongPageQuery(nextPage);
};

const nextSongPage = () => {
    if (currentSongPage.value < totalSongPages.value) {
        goToSongPage(currentSongPage.value + 1);
    }
};

const prevSongPage = () => {
    if (currentSongPage.value > 1) {
        goToSongPage(currentSongPage.value - 1);
    }
};

useActivatedWatch(() => route.query.songPage, async (songPage) => {
    currentSongPage.value = normalizePage(songPage);
    await fetchNewSongs();
}, { immediate: true });
</script>

<style lang="scss" scoped>
.discover-new-song-content {
    --discover-page-bg: #f5f5f5;
    --discover-page-border: #ddd;
    --discover-page-text: #333;
    --discover-page-muted: #999;
    --discover-placeholder-bg: #fff;
    --discover-placeholder-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    --discover-placeholder-text: #8b8f9c;

    &:is(.dark .discover-new-song-content) {
        --discover-page-bg: #2a2a2a;
        --discover-page-border: #333;
        --discover-page-text: rgba(255, 255, 255, 0.86);
        --discover-page-muted: rgba(255, 255, 255, 0.42);
        --discover-placeholder-bg: #1d1d1d;
        --discover-placeholder-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
        --discover-placeholder-text: rgba(255, 255, 255, 0.6);
    }
}

.song-section {
    display: grid;
    gap: 20px;
}

.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 20px 0;
    gap: 10px;
}

.page-numbers {
    display: flex;
    gap: 5px;
}

.page-number {
    padding: 8px 12px;
    background-color: var(--discover-page-bg);
    border: 1px solid var(--discover-page-border);
    border-radius: 4px;
    cursor: pointer;
    color: var(--discover-page-text);
    min-width: 40px;
    transition: all 0.3s;

    &:hover {
        background-color: var(--primary-color);
        color: white;
    }

    &.active {
        background-color: var(--primary-color);
        color: white;
        border-color: var(--primary-color);
    }

    &.ellipsis {
        background-color: transparent;
        border: none;
        cursor: default;
        pointer-events: none;
        padding: 8px 8px;
        min-width: 30px;

        &:hover {
            background-color: transparent;
            color: var(--discover-page-text);
        }
    }
}

.pagination button {
    padding: 8px 15px;
    background-color: var(--discover-placeholder-bg);
    color: var(--discover-page-text);
    border: 1px solid var(--discover-page-border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover:not(:disabled) {
        background-color: var(--primary-color);
        color: white;
    }

    &:disabled {
        background-color: var(--discover-placeholder-bg);
        color: var(--discover-page-muted);
        cursor: not-allowed;
        border-color: var(--discover-page-border);
    }
}

.discover-placeholder {
    display: flex;
    justify-content: center;
    padding-top: 80px;
}

.placeholder-card {
    min-width: 260px;
    padding: 40px 48px;
    text-align: center;
    background: var(--discover-placeholder-bg);
    border-radius: 18px;
    box-shadow: var(--discover-placeholder-shadow);

    h3 {
        margin: 0 0 12px;
        font-size: 22px;
        color: var(--primary-color);
    }

    p {
        margin: 0;
        color: var(--discover-placeholder-text);
        font-size: 14px;
    }
}

@media (max-width: 768px) {
    .pagination {
        gap: 6px;
        flex-wrap: wrap;
    }

    .page-number {
        min-width: 36px;
        padding: 6px 10px;
    }
}
</style>

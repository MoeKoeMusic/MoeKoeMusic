<template>
    <div class="search-page">
        <div class="search-results">
            <h2 class="section-title">{{ $t('sou-suo-jie-guo') }}</h2>
            <!-- 添加搜索类型标签栏 -->
            <div class="search-tabs">
                <button v-for="tab in searchTabs" :key="tab.type"
                    :class="['tab-button', { active: searchType === tab.type }]" @click="changeSearchType(tab.type)">
                    {{ tab.name }}
                </button>
            </div>
            <!-- 骨架屏加载效果 -->
            <div v-if="isLoading">
                <!-- 歌曲/综合骨架屏 -->
                <CommonSkeleton v-if="searchType === 'song' || searchType === 'complex'" variant="song-list" :count="10" />

                <!-- 歌手/专辑/歌单/mv共用骨架屏 -->
                <CommonSkeleton v-else variant="search-grid" :count="12" :avatar="searchType === 'author'" />
            </div>

            <template v-else-if="hasSearchContent">
                <!-- 综合搜索结果 -->
                <ComplexSearchResults v-if="searchType === 'complex'" :data="complexSearchData"
                    :keyword="searchQuery" @song-play="handleComplexSongPlay"
                    @song-contextmenu="showContextMenu" @artist-click="handleArtistClick"
                    @album-click="handleAlbumClick" @playlist-click="handlePlaylistClick"
                    @mv-click="handleMvClick" @program-click="handleProgramClick" />

                <!-- 歌曲搜索结果 -->
                <SongSearchList v-else-if="searchType === 'song'" :songs="searchResults"
                    @song-click="handleSongClick" @song-contextmenu="showContextMenu" />

                <!-- 歌手搜索结果 -->
                <ArtistGrid v-else-if="searchType === 'author'" :artists="searchResults"
                    @artist-click="handleArtistClick" />

                <!-- 专辑搜索结果 -->
                <AlbumGrid v-else-if="searchType === 'album'" :albums="searchResults" @album-click="handleAlbumClick" />

                <!-- MV搜索结果 -->
                <MvGrid v-else-if="searchType === 'mv'" :mvs="searchResults" @mv-click="handleMvClick" />

                <!-- 歌单搜索结果 -->
                <PlaylistGrid v-else-if="searchType === 'special'" :playlists="searchResults"
                    @playlist-click="handlePlaylistClick" />

                <div v-if="showPagination" class="pagination">
                    <button @click="prevPage" :disabled="currentPage === 1">{{ $t('shang-yi-ye') }}</button>
                    <div class="page-numbers">
                        <button v-for="pageNum in displayedPageNumbers" :key="pageNum" :class="['page-number', {
                            active: pageNum === currentPage,
                            'ellipsis': pageNum === '...'
                        }]" @click="pageNum !== '...' && goToPage(pageNum)" :disabled="pageNum === '...'">
                            {{ pageNum }}
                        </button>
                    </div>
                    <button @click="nextPage" :disabled="currentPage === totalPages">{{ $t('xia-yi-ye') }}</button>
                </div>
            </template>
        </div>
    </div>
    <ContextMenu ref="contextMenuRef" :playerControl="playerControl" />
</template>
<script setup>
import { ref, onMounted, computed } from 'vue';
import ContextMenu from '../components/ContextMenu.vue';
import CommonSkeleton from '../components/CommonSkeleton.vue';
import SongSearchList from '../components/search/SongSearchList.vue';
import AlbumGrid from '../components/search/AlbumGrid.vue';
import PlaylistGrid from '../components/search/PlaylistGrid.vue';
import ArtistGrid from '../components/search/ArtistGrid.vue';
import MvGrid from '../components/search/MvGrid.vue';
import ComplexSearchResults from '../components/search/ComplexSearchResults.vue';
import { get } from '../utils/request';
import { openMvPlayer } from '../utils/utils';
import { useRoute, useRouter } from 'vue-router';
import { useActivatedWatch } from '../composables/useActivatedWatch';
const route = useRoute();
const router = useRouter();
const searchQuery = ref(route.query.q || '');
const searchType = ref(route.query.type || 'complex');
const searchResults = ref([]);
const complexSearchData = ref(null);
const currentPage = ref(1);
const pageSize = ref(30);
const totalPages = ref(1);
const contextMenuRef = ref(null);
const isLoading = ref(false);

const searchTabs = [
    { type: 'complex', name: '综合' },
    { type: 'song', name: '单曲' },
    { type: 'special', name: '歌单' },
    { type: 'album', name: '专辑' },
    { type: 'mv', name: 'MV' },
    { type: 'author', name: '歌手' }
];

// 切换搜索类型
const changeSearchType = (type) => {
    if (searchType.value === type) return;
    currentPage.value = 1; // 切换类型时重置页码

    // 更新URL参数
    router.push({
        query: {
            ...route.query,
            type: type
        }
    });
};

const showContextMenu = (event, song) => {
    if (contextMenuRef.value) {
        song.cover = song.Image?.replace("{size}", 480) || './assets/images/ico.png',
            song.timeLength = song.Duration;
        song.OriSongName = song.FileName;
        contextMenuRef.value.openContextMenu(event, song);
    }
};

onMounted(() => {
    syncSearchFromRoute(true);
});

useActivatedWatch(() => [route.name, route.query.q, route.query.type], () => {
    syncSearchFromRoute();
});

const syncSearchFromRoute = (force = false) => {
    if (route.name !== 'Search') return;

    const nextQuery = route.query.q || '';
    const nextType = route.query.type || 'complex';
    const changed = searchQuery.value !== nextQuery || searchType.value !== nextType;
    if (!force && !changed) return;

    currentPage.value = 1;
    searchQuery.value = nextQuery;
    searchType.value = nextType;
    performSearch();
};

const props = defineProps({
    playerControl: Object
});

const playSong = (hash, name, img, author) => {
    props.playerControl.addSongToQueue(hash, name, img, author);
};

const handleSongClick = (song) => {
    playSong(
        song?.HQFileHash || song?.SQFileHash || song?.FileHash,
        song?.OriSongName,
        song?.Image?.replace('{size}', 480) || './assets/images/ico.png',
        song?.SingerName
    );
};

const handleComplexSongPlay = (song) => {
    handleSongClick({
        ...song,
        OriSongName: song?.OriSongName || song?.SongName
    });
};

const hasSearchContent = computed(() => {
    if (searchType.value === 'complex') {
        return !!searchQuery.value;
    }
    return searchResults.value.length > 0;
});

const showPagination = computed(() => {
    return searchType.value !== 'complex' && totalPages.value > 1;
});

const performSearch = async () => {
    if (!searchQuery.value) {
        searchResults.value = [];
        complexSearchData.value = null;
        totalPages.value = 1;
        return;
    }

    isLoading.value = true;
    searchResults.value = [];
    totalPages.value = 1;
    try {
        if (searchType.value === 'complex') {
            complexSearchData.value = null;
            const response = await get(`/search/complex?keywords=${encodeURIComponent(searchQuery.value)}`);
            if (response.status === 1) {
                complexSearchData.value = response.data;
            }
            return;
        }

        complexSearchData.value = null;
        const response = await get(`/search?keywords=${encodeURIComponent(searchQuery.value)}&page=${currentPage.value}&pagesize=${pageSize.value}&type=${searchType.value}`)
        if (response.status === 1) {
            searchResults.value = response.data.lists;
            totalPages.value = Math.ceil(response.data.total / pageSize.value);
        }
    } catch (error) {
        console.error("搜索请求失败", error);
    } finally {
        isLoading.value = false;
    }
};

// 分页操作
const nextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++;
        performSearch();
    }
};

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--;
        performSearch();
    }
};

const displayedPageNumbers = computed(() => {
    const delta = 2; // 当前页前后显示的页码数
    let pages = [];

    if (totalPages.value <= 7) {
        // 如果总页数小于等于7，显示所有页码
        for (let i = 1; i <= totalPages.value; i++) {
            pages.push(i);
        }
    } else {
        // 始终显示第一页
        pages.push(1);

        // 计算中间页码的范围
        let leftBound = Math.max(2, currentPage.value - delta);
        let rightBound = Math.min(totalPages.value - 1, currentPage.value + delta);

        // 添加左边的省略号
        if (leftBound > 2) {
            pages.push('...');
        }

        // 添加中间的页码
        for (let i = leftBound; i <= rightBound; i++) {
            pages.push(i);
        }

        // 添加右边的省略号
        if (rightBound < totalPages.value - 1) {
            pages.push('...');
        }

        // 始终显示最后一页
        pages.push(totalPages.value);
    }

    return pages;
});

const goToPage = (page) => {
    currentPage.value = page;
    performSearch();
};

const handleAlbumClick = (album) => {
    router.push(`/PlaylistDetail?albumid=${album.albumid}`);
};

const handlePlaylistClick = (playlist) => {
    router.push({
        path: `/PlaylistDetail`,
        query: { global_collection_id: playlist.gid }
    });
};

const handleArtistClick = (artist) => {
    router.push({
        path: '/PlaylistDetail',
        query: {
            singerid: artist.AuthorId
        }
    });
};

const handleMvClick = async (mv) => {
    try {
        props.playerControl?.pause?.();
        const title = mv?.MvName || mv?.FileName || '视频播放';
        await openMvPlayer(router, mv?.MvHash, title);
    } catch (error) {
        $message.error('打开视频播放器失败');
    }
};

const handleProgramClick = (program) => {
    if (!program?.albumid) return;
    router.push(`/PlaylistDetail?albumid=${program.albumid}`);
};
</script>

<style lang="scss" scoped>
.search-results {
    padding: 20px;
}

.search-tabs {
    display: flex;
    margin-bottom: 20px;
    border-bottom: 1px solid #eee;
}

.tab-button {
    padding: 10px 20px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    color: #666;
    position: relative;
    transition: all 0.3s;
    border-radius: 5px 5px 0 0;

    &:hover {
        color: var(--primary-color);
    }

    &.active {
        color: var(--primary-color);
        font-weight: bold;

        &::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            width: 100%;
            height: 2px;
            background-color: var(--primary-color);
        }
    }
}

.result-item {
    display: flex;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #f0f0f0;
    transition: background-color 0.3s;
    cursor: pointer;
    border-radius: 5px;
    gap: 10px;

    &:hover {
        background-color: #f5f5f5;
    }

    img {
        width: 50px;
        height: 50px;
        border-radius: 5px;
        margin-right: 10px;
    }
}

.result-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.result-meta {
    display: flex;
    margin-left: auto;
    min-width: 120px;
    justify-content: flex-end;
    padding-right: 20px;
}

.meta-column {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
}

.result-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: bold;
    height: 23px;
    margin: 0;
    max-width: 900px;
    min-width: 0;
}

.result-name-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.original-tag {
    flex-shrink: 0;
    padding: 0 4px;
    border-radius: 3px;
    font-size: 10px;
    line-height: 14px;
    color: #fff;
    background-color: var(--primary-color);
}

.result-duration,
.result-publish-date {
    font-size: 14px;
    color: #888;
    margin: 0;
    white-space: nowrap;
}

.result-duration {
    color: #666;
}

.result-publish-date {
    font-size: 12px;
    color: #999;
}

.result-type {
    font-size: 14px;
    color: #666;
    margin: 6px 0 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    color: #333;
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
            color: #333;
        }
    }
}

.pagination button {
    padding: 8px 15px;
    background-color: white;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover:not(:disabled) {
        background-color: var(--primary-color);
        color: white;
    }

    &:disabled {
        background-color: white;
        color: #999;
        cursor: not-allowed;
        border-color: #ddd;
    }
}

.section-title {
    font-size: 28px;
    font-weight: bold;
    margin-bottom: 30px;
    color: var(--primary-color);
}
</style>

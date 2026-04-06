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
            <div v-if="isLoading" class="skeleton-container">
                <!-- 歌曲骨架屏 -->
                <div v-if="searchType === 'song'" class="song-skeleton">
                    <div v-for="i in 10" :key="i" class="skeleton-item result-item">
                        <div class="skeleton-cover"></div>
                        <div class="skeleton-info">
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line short"></div>
                        </div>
                        <div class="skeleton-meta">
                            <div class="skeleton-line tiny"></div>
                            <div class="skeleton-line tiny"></div>
                        </div>
                    </div>
                </div>

                <!-- 歌手/专辑/歌单共用骨架屏 -->
                <div v-else class="grid-skeleton">
                    <div class="skeleton-grid">
                        <div v-for="i in 12" :key="i" :class="['skeleton-grid-card', {
                            'skeleton-artist-card': searchType === 'author',
                            'skeleton-album-card': searchType === 'album',
                            'skeleton-playlist-card': searchType === 'special'
                        }]">
                            <div :class="[searchType === 'author' ? 'skeleton-avatar' : 'skeleton-cover square']"></div>
                            <div class="skeleton-line"></div>
                            <div v-if="searchType !== 'author'" class="skeleton-line short"></div>
                        </div>
                    </div>
                </div>
            </div>

            <template v-else-if="searchResults.length > 0">
                <!-- 歌曲搜索结果 -->
                <ul v-if="searchType === 'song'">
                    <li v-for="(result, index) in searchResults" :key="index" class="result-item"
                        @click="playSong(result?.HQFileHash || result?.SQFileHash || result?.FileHash, result.OriSongName, $getCover(result.Image, 480), result.SingerName)"
                        @contextmenu.prevent="showContextMenu($event, result)">
                        <img :src="$getCover(result.Image, 100)" alt="Cover" />
                        <div class="result-info">
                            <p class="result-name">{{ result.OriSongName }}</p>
                            <p class="result-type">{{ result.SingerName }}</p>
                        </div>
                        <div class="result-meta">
                            <div class="meta-column">
                                <p class="result-duration">{{ $formatMilliseconds(result.Duration) }}</p>
                                <p class="result-publish-date">{{ result.PublishDate }}</p>
                            </div>
                        </div>
                    </li>
                </ul>

                <!-- 歌手搜索结果 -->
                <ArtistGrid v-else-if="searchType === 'author'" :artists="searchResults"
                    @artist-click="handleArtistClick" />

                <!-- 专辑搜索结果 -->
                <AlbumGrid v-else-if="searchType === 'album'" :albums="searchResults" @album-click="handleAlbumClick" />

                <!-- 歌单搜索结果 -->
                <PlaylistGrid v-else-if="searchType === 'special'" :playlists="searchResults"
                    @playlist-click="handlePlaylistClick" />

                <div class="pagination">
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
import { ref, onMounted, watch, computed } from 'vue';
import ContextMenu from '../components/ContextMenu.vue';
import AlbumGrid from '../components/AlbumGrid.vue';
import PlaylistGrid from '../components/PlaylistGrid.vue';
import ArtistGrid from '../components/ArtistGrid.vue';
import { get } from '../utils/request';
import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();
const searchQuery = ref(route.query.q || '');
const searchType = ref(route.query.type || 'song');
const searchResults = ref([]);
const currentPage = ref(1);
const pageSize = ref(30);
const totalPages = ref(1);
const contextMenuRef = ref(null);
const isLoading = ref(false);

const searchTabs = [
    { type: 'song', name: '单曲' },
    { type: 'special', name: '歌单' },
    { type: 'album', name: '专辑' },
    { type: 'author', name: '歌手' }
];

// 切换搜索类型
const changeSearchType = (type) => {
    searchType.value = type;
    currentPage.value = 1; // 切换类型时重置页码

    // 更新URL参数
    router.push({
        query: {
            ...route.query,
            type: type
        }
    });
    performSearch();
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
    if (route.query.type) {
        searchType.value = route.query.type;
    }
    performSearch();
});

watch(() => route.query.q, (newQuery) => {
    currentPage.value = 1;
    searchQuery.value = newQuery;
    performSearch();
});

const props = defineProps({
    playerControl: Object
});

const playSong = (hash, name, img, author) => {
    props.playerControl.addSongToQueue(hash, name, img, author);
};

const performSearch = async () => {
    if (!searchQuery.value) return;
    isLoading.value = true;
    try {
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
    font-size: 16px;
    font-weight: bold;
    height: 23px;
    margin: 0;
    max-width: 900px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

<style lang="scss" scoped>
@keyframes shimmer {
    0% {
        background-position: -468px 0;
    }

    100% {
        background-position: 468px 0;
    }
}

.skeleton-container {
    width: 100%;
}

.skeleton-item {
    margin-bottom: 15px;
}

.skeleton-cover,
.skeleton-avatar {
    width: 50px;
    height: 50px;
    border-radius: 5px;
    background: linear-gradient(to right, #f0f0f0 8%, #e0e0e0 18%, #f0f0f0 33%);
    background-size: 800px 104px;
    animation: shimmer 1.5s linear infinite forwards;
}

.skeleton-avatar {
    border-radius: 50%;
    width: 100px;
    height: 100px;
    margin: 0 auto 10px;
}

.skeleton-cover.square {
    width: 150px;
    height: 150px;
    margin: 0 auto 10px;
}

.skeleton-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.skeleton-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 120px;
    align-items: flex-end;
}

.skeleton-line {
    height: 16px;
    background: linear-gradient(to right, #f0f0f0 8%, #e0e0e0 18%, #f0f0f0 33%);
    background-size: 800px 104px;
    animation: shimmer 1.5s linear infinite forwards;
    border-radius: 3px;
    width: 100%;
    margin-top: 5px;

    &.short {
        width: 60%;
    }

    &.tiny {
        width: 40%;
        height: 12px;
    }
}

.skeleton-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 20px;
}

.skeleton-artist-card,
.skeleton-album-card,
.skeleton-playlist-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 15px;
    background-color: #f9f9f9;
    border-radius: 8px;
    transition: transform 0.3s;
}
</style>
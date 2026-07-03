<template>
    <div class="detail-page">
        <!-- 头部信息区域 -->
        <div class="header detail-sliver-header" :style="headerStyle">
            <CommonSkeleton v-if="loading" variant="detail-header" />
            <template v-else>
                <img class="cover-art" :style="coverStyle" :src="`./assets/images/cloud.png`" />
            <div class="info" :style="infoStyle">
                <h1 class="title" :style="titleStyle">{{ $t('wo-de-yun-pan') }}</h1>
                <div class="expanded-info" :style="detailsStyle">
                    <p class="subtitle">{{ $t('yun-pan-ge-qu-shu') }}: {{ displayTrackCount }}</p>
                    <div class="storage-info" v-if="storageInfo.totalSize > 0">
                        <div class="storage-progress">
                            <div class="storage-progress-bar" :style="storageUsageStyle"></div>
                        </div>
                        <div class="storage-text">
                            {{ formatStorageSize(storageInfo.usedSize) }} / {{ formatStorageSize(storageInfo.totalSize) }}
                            ({{ $t('ke-yong') }}: {{ formatStorageSize(storageInfo.availableSize) }})
                        </div>
                    </div>
                    <div class="description">{{ $t('yun-pan-miao-shu') }}</div>
                    <div class="actions">
                        <button class="primary-btn" @click="addPlaylistToQueue($event)">
                            <i class="fas fa-play"></i> {{ $t('bo-fang') }}
                        </button>
                        <button class="upload-btn" @click="uploadMusic">
                            <i class="fas fa-upload"></i> {{ $t('shang-chuan-yin-le') }}
                        </button>
                    </div>
                </div>
            </div>
            <button class="collapsed-play-btn" :style="collapsedActionsStyle" @click="addPlaylistToQueue($event)"
                :title="$t('bo-fang')">
                <i class="far fa-play-circle"></i>
            </button>
            </template>
        </div>
        <div class="detail-sliver-spacer" :style="spacerStyle"></div>

        <!-- 导航按钮 -->
        <i class="location-arrow fas fa-crosshairs" @click="scrollToItem" :title="t('dang-qian-bo-fang-ge-qu')"></i>
        <i class="scroll-bottom-img fas fa-angle-double-up" @click="scrollToFirstItem"
            :title="t('fan-hui-ding-bu')"></i>

        <!-- 歌曲列表 -->
        <div class="track-list-container">
            <div class="track-list-header" :style="listHeaderStyle">
                <h2 class="track-list-title" :style="listTitleStyle"><span>{{ $t('yun-pan-ge-qu') }}</span> ( {{ displayTrackCount }} )</h2>
                <div class="track-list-actions">
                    <div class="batch-action-container">
                        <button class="batch-action-btn" @click="toggleBatchSelection"
                            :class="{ 'active': batchSelectionMode }">
                            <input type="checkbox" v-model="batchSelectionMode" /> {{ $t('pi-liang-cao-zuo') }}
                            <span v-if="selectedTracks.length > 0" class="selected-count">{{ selectedTracks.length
                                }}</span>
                        </button>
                        <div v-if="batchSelectionMode && isBatchMenuVisible && selectedTracks.length > 0"
                            class="batch-actions-menu">
                            <ul>
                                <li @click="appendSelectedToQueue"><i class="fas fa-list"></i> 添加到播放列表</li>
                                <li @click="deleteSelectedFromCloud"><i class="fas fa-trash-alt"></i> {{
                                    $t('cong-yun-pan-shan-chu') }}</li>
                            </ul>
                        </div>
                    </div>
                    <button class="view-mode-btn" @click="toggleListMode"
                        :title="listMode === 'list' ? '切换到网格视图' : '切换到列表视图'">
                        <i class="fas" :class="listMode === 'list' ? 'fa-th' : 'fa-list'"></i>
                    </button>
                    <input type="text" v-model="searchQuery" @keyup.enter="searchTracks"
                        :placeholder="t('sou-suo-ge-qu')" class="search-input" />
                </div>
            </div>

            <!-- 表头 -->
            <div class="track-list-header-row" :style="trackHeaderStyle">
                <div class="track-checkbox-header" v-if="batchSelectionMode">
                    <input type="checkbox" :checked="isAllSelected" @click="toggleSelectAll">
                </div>
                <div class="track-number-header" v-else>♪</div>
                <div class="track-title-header" @click="sortTracks('name')">
                    文件名 <i class="fas" :class="getSortIconClass('name')"></i>
                </div>
                <div class="track-artist-header" @click="sortTracks('author')">
                    歌手 <i class="fas" :class="getSortIconClass('author')"></i>
                </div>
                <div class="track-size-header" @click="sortTracks('size')">
                    文件大小 <i class="fas" :class="getSortIconClass('size')"></i>
                </div>
                <div class="track-timelen-header" @click="sortTracks('timelen')">
                    时间 <i class="fas" :class="getSortIconClass('timelen')"></i>
                </div>
            </div>

            <div v-if="isSearching" class="search-loading-overlay">
                <div class="search-loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>{{ $t('zheng-zai-jia-zai-quan-bu-ge-qu') }}</span>
                </div>
            </div>

            <RecycleScroller v-else ref="recycleScrollerRef" :items="filteredTracks" :item-size="listMode === 'list' ? 50 : 70"
                class="track-list" key-field="hash" page-mode :buffer="400" :emit-update="true"
                @update="handleVirtualUpdate">
                <template #default="{ item, index }">
                    <div class="li" :key="item.hash"
                        :class="{ 'cover-view': listMode === 'grid', 'selected': batchSelectionMode && selectedTracks.includes(index) }"
                        @click="batchSelectionMode ? selectTrack(index, $event) : playSong(item.hash, item.name, item.author, item.timelen, item.cover)">

                        <!-- 复选框或序号 -->
                        <div class="track-checkbox" v-if="batchSelectionMode">
                            <input type="checkbox" :checked="selectedTracks.includes(index)"
                                @click.stop="selectTrack(index, $event)">
                        </div>
                        <div class="track-number" v-else>{{ index + 1 }}</div>

                        <!-- 网格模式封面 -->
                        <div class="track-cover" v-if="listMode === 'grid'">
                            <img :src="item.cover || './assets/images/ico.png'" alt="Cover">
                            <div class="track-cover-overlay"
                                :class="{ 'playing': props.playerControl?.currentSong.hash == item.hash }">
                                <i
                                    :class="props.playerControl?.currentSong.hash == item.hash ? 'fas fa-music' : 'fas fa-play'"></i>
                            </div>
                        </div>

                        <!-- 歌曲信息 -->
                        <div class="track-title" :title="item.name">{{ item.name }}
                            <span v-if="item.qualityInfo" class="icon" :class="item.qualityInfo.class">{{
                                item.qualityInfo.text }}</span>
                        </div>
                        <div class="track-artist" :title="item.author">{{ item.author }}</div>
                        <div class="track-size" :title="item.filesize">{{ item.filesize }}</div>
                        <div class="track-timelen">
                            <button v-if="props.playerControl?.currentSong.hash == item.hash && listMode === 'list'"
                                class="queue-play-btn fas fa-music"></button>
                            {{ $formatMilliseconds(item.timelen) }}
                        </div>
                    </div>
                </template>
            </RecycleScroller>
        </div>

        <div class="note-container">
            <transition-group name="fly-note">
                <div v-for="note in flyingNotes" :key="note.id" class="flying-note" :style="note.style">♪</div>
            </transition-group>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
import { RecycleScroller } from 'vue3-virtual-scroller';
import CommonSkeleton from '../components/CommonSkeleton.vue';
import { get } from '../utils/request';
import { useRouter } from 'vue-router';
import { MoeAuthStore } from '../stores/store';
import { useI18n } from 'vue-i18n';
import { useStickyDetailHeader } from '@/composables/useStickyDetailHeader';


const { t } = useI18n();
const MoeAuth = MoeAuthStore();
const router = useRouter();

// 通用状态
const tracks = ref([]);
const filteredTracks = ref([]);
const searchQuery = ref('');
const pageSize = 60;
const maxPageSize = 300;
const currentPage = ref(1);
const hasMore = ref(true);
const isLoadingMore = ref(false);
const totalCount = ref(0);
const recycleScrollerRef = ref(null);
const loading = ref(true);
const isSearching = ref(false);
const flyingNotes = ref([]);
let noteId = 0;

// 云盘存储空间信息
const storageInfo = ref({
    totalSize: 0,
    usedSize: 0,
    availableSize: 0
});

// 批量选择相关状态
const batchSelectionMode = ref(false);
const isBatchMenuVisible = ref(false);
const selectedTracks = ref([]);
let lastSelectedIndex = -1;

// 排序状态
const sortField = ref('');
const sortOrder = ref('asc');

// 列表模式状态
const listMode = ref(localStorage.getItem('cloudDriveListMode') || 'list');

// 判断是否全选
const isAllSelected = computed(() => {
    return selectedTracks.value.length === filteredTracks.value.length && filteredTracks.value.length > 0;
});

const displayTrackCount = computed(() => {
    return hasMore.value ? totalCount.value : tracks.value.length;
});

const props = defineProps({
    playerControl: Object
});

const {
    headerStyle,
    spacerStyle,
    coverStyle,
    infoStyle,
    titleStyle,
    detailsStyle,
    listTitleStyle,
    collapsedActionsStyle,
    listHeaderStyle,
    trackHeaderStyle
} = useStickyDetailHeader();

const storageUsageStyle = computed(() => ({
    width: `${storageInfo.value.totalSize ? storageInfo.value.usedSize / storageInfo.value.totalSize * 100 : 0}%`
}));

onMounted(() => {
    loadData();
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});

const loadData = async () => {
    if (!MoeAuth.isAuthenticated) {
        router.push('/login');
        return;
    }
    await fetchCloudTracks();
};

// 获取云盘歌曲
const fetchCloudTracks = async () => {
    currentPage.value = 1;
    hasMore.value = true;
    loading.value = true;
    isSearching.value = false;
    totalCount.value = 0;
    tracks.value = [];
    filteredTracks.value = [];

    try {
        const curPage = currentPage.value;
        const firstPageResponse = await get('/user/cloud', {
            page: curPage,
            pagesize: pageSize
        });

        applyCloudResponse(firstPageResponse, true, curPage, pageSize);
    } catch (error) {
        $message.error(t('ge-qu-shu-ju-cuo-wu'));
        console.error('获取云盘歌曲失败:', error);
    } finally {
        loading.value = false;
    }
};

// 获取单页云盘数据
const fetchCloudPage = async (page) => {
    try {
        const response = await get('/user/cloud', {
            page,
            pagesize: pageSize
        });

        return response;
    } catch (error) {
        console.error('获取更多云盘歌曲失败:', error);
    }
    return null;
};

const applyCloudResponse = (response, replace, curPage, curPageSize) => {
    if (!response || response.status !== 1) {
        hasMore.value = false;
        return;
    }

    if (response.data.type_size) {
        const { max_size, used_size, availble_size } = response.data;
        storageInfo.value = {
            totalSize: max_size || 0,
            usedSize: used_size || 0,
            availableSize: availble_size || 0
        };
    }

    const songList = response.data.list || response.data.info || [];
    const formattedTracks = formatTrackList(songList);
    totalCount.value = response.data.list_count ?? (replace ? formattedTracks.length : totalCount.value);
    tracks.value = replace ? formattedTracks : [...tracks.value, ...formattedTracks];
    filteredTracks.value = tracks.value;
    currentPage.value = curPage + 1;
    hasMore.value = songList.length >= curPageSize && tracks.value.length < totalCount.value;
};

const loadMoreTracks = async () => {
    if (loading.value || isLoadingMore.value || !hasMore.value) return;

    isLoadingMore.value = true;

    try {
        const curPage = currentPage.value;
        const response = await fetchCloudPage(curPage);
        applyCloudResponse(response, false, curPage, pageSize);
    } finally {
        isLoadingMore.value = false;
    }
};

const handleVirtualUpdate = (startIndex, endIndex) => {
    if (loading.value || searchQuery.value.trim()) return;
    if (Math.max(startIndex, endIndex) >= filteredTracks.value.length - 1) {
        loadMoreTracks();
    }
};

const loadAllRemainingTracks = async (onAppend) => {
    while (isLoadingMore.value) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!hasMore.value) return;

    isLoadingMore.value = true;
    try {
        const loadedHashes = new Set(tracks.value.map(track => track.hash));
        let page = Math.floor(tracks.value.length / maxPageSize) + 1;

        while (hasMore.value) {
            const response = await get('/user/cloud', {
                page,
                pagesize: maxPageSize
            });

            if (!response || response.status !== 1) break;

            if (response.data.type_size) {
                const { max_size, used_size, availble_size } = response.data;
                storageInfo.value = {
                    totalSize: max_size || 0,
                    usedSize: used_size || 0,
                    availableSize: availble_size || 0
                };
            }

            const songList = response.data.list || response.data.info || [];
            if (songList.length === 0) {
                hasMore.value = false;
                return;
            }

            totalCount.value = response.data.list_count ?? totalCount.value;
            const newTracks = formatTrackList(songList).filter(track => !loadedHashes.has(track.hash));
            if (newTracks.length > 0) {
                tracks.value = [...tracks.value, ...newTracks];
                filteredTracks.value = tracks.value;
                newTracks.forEach(track => loadedHashes.add(track.hash));
                onAppend?.(newTracks);
            }

            hasMore.value = songList.length >= maxPageSize && tracks.value.length < totalCount.value;
            page++;
        }

        currentPage.value = Math.floor(tracks.value.length / pageSize) + 1;
    } finally {
        isLoadingMore.value = false;
    }
};

// 获取音质信息
const getQualityInfo = (bitrate) => {
    switch (bitrate) {
        case 3:
            return { text: 'HQ', class: 'hq-icon' };
        case 4:
            return { text: 'SQ', class: 'sq-icon' };
        case 5:
            return { text: 'HR', class: 'hr-icon' };
        default:
            return null;
    }
};

// 格式化歌曲列表数据
const formatTrackList = (songList) => {
    return songList.map(track => {
        const qualityInfo = getQualityInfo(track.bitrate || 0);
        return {
            hash: track.hash || '',
            OriSongName: track.filename || '',
            name: track.name,
            author: track.author_name || '云盘音乐',
            album: track.album_name || '云盘音乐',
            timelen: track.timelen || 0,
            qualityInfo: qualityInfo,
            filesize: formatStorageSize(track.size) || 0,
            bitrate: track.bitrate || 0,
            cover: track?.album_info?.sizable_cover?.replace("{size}", 480) || track?.authors?.[0]?.sizable_avatar?.replace("{size}", 480)
        };
    });
};

// 切换列表模式
const toggleListMode = () => {
    listMode.value = listMode.value === 'list' ? 'grid' : 'list';
    localStorage.setItem('cloudDriveListMode', listMode.value);
};

// 格式化存储空间大小
const formatStorageSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 搜索歌曲
const searchTracks = async () => {
    if (hasMore.value) {
        isSearching.value = true;
        try {
            await loadAllRemainingTracks();
        } finally {
            isSearching.value = false;
        }
    }

    filteredTracks.value = tracks.value.filter(track =>
        track.name.toLowerCase().trim().includes(searchQuery.value.toLowerCase().trim()) ||
        track.author.toLowerCase().trim().includes(searchQuery.value.toLowerCase().trim())
    );
};

// 播放歌曲
const playSong = async (hash, name, author, timeLength, cover) => {
    name = name && name.includes(' - ') ? name.split(' - ')[1] : name;
    props.playerControl.addCloudMusicToQueue(hash, name, author, timeLength, cover);
};

// 添加整个播放列表到队列
const loadAndAppendRemainingTracks = async () => {
    await loadAllRemainingTracks((newTracks) => {
        props.playerControl.addCloudPlaylistToQueue(newTracks, true);
    });
};

const addPlaylistToQueue = async (event, append = false) => {
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
    props.playerControl.addCloudPlaylistToQueue(filteredTracks.value, append);
    if (hasMore.value) {
        loadAndAppendRemainingTracks();
    }
};

const uploadMusic = () => {
    $message.info('上传功能正在开发中...');
};

// 滚动到当前播放歌曲
const scrollToTrackIndex = async (index) => {
    await nextTick();
    const scrollContainer = document.querySelector('.app-main-scroll');
    const scrollerElement = recycleScrollerRef.value?.$el;
    if (!scrollContainer || !scrollerElement) return;

    const targetIndex = Math.max(0, index - 5);
    const itemSize = listMode.value === 'list' ? 50 : 70;
    const offsetTop = scrollContainer.scrollTop + scrollerElement.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top;

    scrollContainer.scrollTo({
        top: Math.max(0, offsetTop + targetIndex * itemSize),
        behavior: 'smooth'
    });
};

const scrollToItem = async () => {
    const currentHash = props.playerControl?.currentSong?.hash;
    if (!currentHash) return;

    let currentIndex = filteredTracks.value.findIndex(song => song.hash === currentHash);
    if (currentIndex === -1 && hasMore.value && !searchQuery.value.trim()) {
        try {
            await loadAllRemainingTracks();
            currentIndex = filteredTracks.value.findIndex(song => song.hash === currentHash);
        } catch (error) {
            console.error('scrollToItem failed:', error);
        }
    }

    if (currentIndex !== -1) {
        await scrollToTrackIndex(currentIndex);
    }
};

// 滚动到顶部
const scrollToFirstItem = () => {
    recycleScrollerRef.value?.scrollToItem(0, { behavior: 'smooth' });
    document.querySelector('.app-main-scroll')?.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};

const handleClickOutside = (event) => {
    const batchActionsMenu = document.querySelector('.batch-actions-menu');
    const batchActionBtn = document.querySelector('.batch-action-btn');
    if (batchActionsMenu && !batchActionsMenu.contains(event.target) && !batchActionBtn.contains(event.target)) {
        isBatchMenuVisible.value = false;
    }
};

// 切换批量选择模式
const toggleBatchSelection = () => {
    if (batchSelectionMode.value) {
        // 如果已经在批量选择模式，则切换菜单显示或退出模式
        if (isBatchMenuVisible.value) {
            // 如果菜单已经显示，则点击后退出批量选择模式
            batchSelectionMode.value = false;
            isBatchMenuVisible.value = false;
            selectedTracks.value = [];
            lastSelectedIndex = -1;
        } else {
            // 如果菜单未显示，则显示菜单
            isBatchMenuVisible.value = true;
        }
    } else {
        // 首次进入批量选择模式
        batchSelectionMode.value = true;
        isBatchMenuVisible.value = false;
    }
};

// 选择/取消选择歌曲
const selectTrack = (index, event) => {
    if (event.shiftKey && lastSelectedIndex !== -1) {
        // Shift 键多选
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);

        for (let i = start; i <= end; i++) {
            if (!selectedTracks.value.includes(i)) {
                selectedTracks.value.push(i);
            }
        }
    } else if (event.ctrlKey || event.metaKey) {
        // Ctrl/Cmd 键选择性多选
        const existingIndex = selectedTracks.value.indexOf(index);
        if (existingIndex === -1) {
            selectedTracks.value.push(index);
        } else {
            selectedTracks.value.splice(existingIndex, 1);
        }
    } else {
        // 普通点击
        const existingIndex = selectedTracks.value.indexOf(index);
        if (existingIndex === -1) {
            selectedTracks.value = [index];
        } else {
            selectedTracks.value = [];
        }
    }

    lastSelectedIndex = index;
};

// 将选中歌曲添加到播放队列（追加到当前队列）
const appendSelectedToQueue = async () => {
    if (selectedTracks.value.length === 0) return;
    const selectedSongs = selectedTracks.value.map(index => filteredTracks.value[index]);
    await props.playerControl.addCloudPlaylistToQueue(selectedSongs, true);
    $message.success(t('tian-jia-dao-bo-fang-lie-biao-cheng-gong'));
    isBatchMenuVisible.value = false;
};

// 从云盘中删除选中的歌曲
const deleteSelectedFromCloud = async () => {
    if (selectedTracks.value.length === 0) return;
    const result = await window.$modal.confirm(t('que-ren-shan-chu-yun-pan-ge-qu'));
    if (result) {
        $message.info('删除功能正在开发中...');

        // selectedTracks.value.sort((a, b) => b - a).forEach(index => {
        //     filteredTracks.value.splice(index, 1);
        //     tracks.value = tracks.value.filter((_, i) => 
        //         !selectedTracks.value.includes(i)
        //     );
        // });
        // filteredTracks.value = [...tracks.value];
        // selectedTracks.value = [];
        // $message.success(t('shan-chu-cheng-gong'));
    }
    isBatchMenuVisible.value = false;
};

// 切换全选/取消全选
const toggleSelectAll = () => {
    if (isAllSelected.value) {
        selectedTracks.value = [];
    } else {
        selectedTracks.value = Array.from({ length: filteredTracks.value.length }, (_, i) => i);
    }
};

// 根据字段排序
const sortTracks = async (field) => {
    if (hasMore.value) {
        isSearching.value = true;
        try {
            await loadAllRemainingTracks();
        } finally {
            isSearching.value = false;
        }
    }

    if (sortField.value === field) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortField.value = field;
        sortOrder.value = 'asc';
    }

    filteredTracks.value = [...filteredTracks.value].sort((a, b) => {
        let valueA, valueB;

        if (field === 'timelen') {
            valueA = a[field] || 0;
            valueB = b[field] || 0;
        } else if (field === 'size') {
            const parseSize = (sizeStr) => {
                if (!sizeStr) return 0;
                const match = sizeStr.match(/^([\d.]+)\s*([KMGTP]?B)$/i);
                if (!match) return 0;
                const [, num, unit] = match;
                const value = parseFloat(num);
                const units = { 'B': 1, 'KB': 1024, 'MB': 1024 * 1024, 'GB': 1024 * 1024 * 1024, 'TB': 1024 * 1024 * 1024 * 1024 };
                return value * (units[unit.toUpperCase()] || 1);
            };
            valueA = parseSize(a.filesize);
            valueB = parseSize(b.filesize);
        } else {
            valueA = (a[field] || '').toLowerCase();
            valueB = (b[field] || '').toLowerCase();
        }

        if (sortOrder.value === 'asc') {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });

    if (batchSelectionMode.value) {
        selectedTracks.value = [];
    }
};

const getSortIconClass = (field) => {
    if (sortField.value !== field) {
        return 'fa-sort';
    }
    return sortOrder.value === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
};


</script>

<style lang="scss" scoped>
$primary: var(--primary-color);
$text-muted: #666;
$border-light: #eee;
$bg-light: #e0e0e0;
$white: white;
$shadow-light: 0 2px 10px rgba(0, 0, 0, 0.1);

.detail-page {
    padding: 20px;
}

.header {
    display: flex;
    align-items: center;
}

.detail-sliver-header {
    position: sticky;
    z-index: 10;
    box-sizing: border-box;
    overflow: visible;
    align-items: flex-start;
    padding: 10px 0;
    background: #fff;
    gap: 20px;
}

.detail-sliver-spacer {
    pointer-events: none;
}

.cover-art {
    flex: 0 0 auto;
    width: 200px;
    height: 200px;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    object-fit: cover;
    transition: box-shadow 0.2s ease;
}

.info {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    max-width: calc(100% - 110px);
}

.title {
    flex: 0 0 auto;
    font-size: 36px;
    font-weight: bold;
    width: 100%;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 0;
    color: $primary;
}

.expanded-info {
    display: flex;
    flex-direction: column;
    transition: opacity 0.12s linear;
}

.collapsed-play-btn {
    position: absolute;
    top: 50%;
    right: 18px;
    width: 38px;
    height: 38px;
    padding: 0;
    border: none;
    background: transparent;
    color: $primary;
    cursor: pointer;
    font-size: 30px;
    line-height: 1;
    transition: color 0.2s ease, opacity 0.2s ease;

    &:hover {
        color: var(--color-primary);
    }
}

.subtitle {
    font-size: 18px;
    line-height: 1.35;
    margin: 6px 0 0;
    color: $text-muted;
}

.storage-info {
    margin: 8px 0;
    width: 100%;
    max-width: 600px;
}

.storage-progress {
    height: 6px;
    background-color: $bg-light;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 5px;

    &-bar {
        height: 100%;
        background-color: $primary;
        border-radius: 3px;
    }
}

.storage-text {
    font-size: 14px;
    color: $text-muted;
    display: flex;
    justify-content: space-between;
}

.description {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-height: 1.45;
    color: var(--text-color);
    margin: 0 0 12px;
    font-size: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.actions {
    display: flex;
    gap: 10px;
}

.primary-btn,
.upload-btn {
    background-color: $primary;
    color: $white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;

    i {
        margin-right: 5px;
    }
}

.upload-btn {
    background-color: #4caf50;
}

.track-list-container {
}

.track-list-header {
    position: sticky;
    z-index: 115;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
}

.track-list-title {
    font-size: 24px;
    font-weight: bold;
    color: $primary;
}

.track-list-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.batch-action-container {
    position: relative;
}

.batch-action-btn {
    background-color: transparent;
    border: 1px solid var(--secondary-color);
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color);
    position: relative;

    &.active {
        background-color: $primary;
        color: $white;
    }
}

.selected-count {
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: red;
    color: $white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
}

.batch-actions-menu {
    position: absolute;
    top: 100%;
    left: 0;
    background-color: $white;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: $shadow-light;
    z-index: 50;
    margin-top: 5px;
    width: 200px;

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    li {
        padding: 10px 15px;
        cursor: pointer;
        display: flex;
        align-items: center;
        white-space: nowrap;

        i {
            margin-right: 10px;
            width: 16px;
            text-align: center;
        }

        &:hover {
            background-color: #f0f0f0;
        }
    }
}

.search-input {
    width: 250px;
    padding: 8px;
    border: 1px solid var(--secondary-color);
    border-radius: 20px;
    box-sizing: border-box;
    padding-left: 15px;
}

.track-list {
    width: 100%;
}

.search-loading-overlay {
    height: 800px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 150px;
    border-radius: 0 0 5px 5px;
}

.search-loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    color: var(--text-color);

    i {
        font-size: 48px;
        color: $primary;
    }

    span {
        font-size: 16px;
        color: $text-muted;
    }
}

.li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 50px;
    padding: 10px;
    box-sizing: border-box;
    border-bottom: 1px solid $border-light;
    border-radius: 5px;
    cursor: pointer;

    &:hover {
        border: none;
        background-color: var(--background-color);
    }

    &.selected {
        background-color: rgba(var(--primary-color-rgb), 0.1);
    }

    &.cover-view {
        height: 70px;
        padding: 5px 10px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid $border-light;
        border-radius: 5px;

        &:hover {
            background-color: var(--background-color);
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

        .track-size {
            flex: 0.5;
            text-align: center;
        }

        .track-timelen {
            width: 95px;
            text-align: right;
        }

        .track-checkbox,
        .track-number {
            margin-right: 10px;
            width: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }
}

.track-checkbox {
    margin-right: 10px;
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
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

.track-size {
    flex: 0.5;
    text-align: center;
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

.track-timelen {
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

    &.vip-icon {
        color: #ff6d00;
    }

    &.hq-icon {
        color: #0094ff;
        border-color: #0094ff;
    }

    &.sq-icon {
        color: #00c853;
        border-color: #00c853;
    }

    &.hr-icon {
        color: #ff6d00;
        border-color: #ff6d00;
    }
}

.queue-play-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: $primary;
    cursor: pointer;
}

.content-section {
    margin-top: 50px;
    border-top: 1px dotted var(--secondary-color);
}

.intro-section {
    margin-bottom: 30px;

    h3 {
        color: $primary;
        margin-bottom: 15px;
    }
}

.section-content {
    white-space: pre-wrap;
    line-height: 1.6;
    color: var(--text-color);
}

.location-arrow {
    position: fixed;
    bottom: 168px;
    right: 14px;
    z-index: 110;
    cursor: pointer;
    font-size: 20px;
    color: $primary;
}

.scroll-bottom-img {
    position: fixed;
    bottom: 100px;
    right: 10px;
    z-index: 110;
    cursor: pointer;
    font-size: 20px;
    color: $primary;
}

.more-btn-container {
    position: relative;
}

.dropdown-menu {
    position: absolute;
    background-color: $white;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: $shadow-light;
    top: 50px;
    z-index: 50;

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    li {
        padding: 10px;
        cursor: pointer;

        &:hover {
            background-color: #f0f0f0;
        }
    }
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
    color: $primary;
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

.track-list-header-row {
    position: sticky;
    z-index: 114;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background: #fff;
    border-bottom: 1px solid $primary;
    font-weight: bold;
    border-radius: 5px 5px 0 0;
}

.track-checkbox-header {
    margin-right: 10px;
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.track-number-header {
    font-weight: bold;
    margin-right: 10px;
    width: 30px;
}

.track-title-header,
.track-artist-header,
.track-album-header,
.track-timelen-header,
.track-size-header {
    cursor: pointer;
    display: flex;
    align-items: center;
}

.track-title-header {
    flex: 2;

    i {
        margin-left: 5px;
        font-size: 14px;
    }
}

.track-size-header {
    flex: 0.5;
    padding: 0 10px;
}

.track-artist-header,
.track-album-header {
    flex: 1;
    padding: 0 10px;

    i {
        margin-left: 5px;
        font-size: 14px;
    }
}

.track-timelen-header {
    text-align: right;

    i {
        margin-left: 5px;
        font-size: 14px;
    }
}

.view-mode-btn {
    background-color: transparent;
    border: 1px solid var(--secondary-color);
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color);
    width: 36px;
    height: 31px;
    transition: all 0.3s ease;

    &:hover {
        background-color: rgba(var(--primary-color-rgb), 0.1);
    }

    i {
        font-size: 16px;
    }
}

.track-cover {
    position: relative;
    width: 50px;
    height: 50px;
    margin-right: 15px;
    overflow: hidden;
    border-radius: 4px;
    flex-shrink: 0;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
    }
}

.li.cover-view:hover .track-cover img {
    transform: scale(1.05);
}

.track-cover-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $white;
    font-size: 20px;

    &.playing {
        opacity: 1;
    }
}

.li.cover-view:hover .track-cover-overlay {
    opacity: 1;
}
</style>

<template>
    <div class="detail-page">
        <!-- 头部信息区域 -->
        <div class="header">
            <img class="cover-art" :class="isArtist ? 'artist-avatar' : ''" :data-playlist-id="detail.listid || null"
                :src="isArtist ? ($getCover(detail.sizable_avatar, 480)) : (detail.pic ? $getCover(detail.pic, 480) : './assets/images/live.png')" />
            <div class="info">
                <h1 class="title">{{ isArtist ? detail.author_name : detail.name }}</h1>
                <p class="subtitle" v-if="!isArtist && !isAlbum">{{ detail.publish_date }} | {{ detail.list_create_username }}</p>
                <p class="subtitle" v-if="isAlbum">{{ detail.publish_date }}</p>
                <div class="stats" v-if="isArtist">
                    <span>歌曲: {{ detail.song_count }}</span>
                    <span>专辑: {{ detail.album_count }}</span>
                    <span>MV: {{ detail.mv_count }}</span>
                    <span>粉丝: {{ detail.fansnums }}</span>
                </div>
                <p class="meta" v-if="!isArtist && !isAlbum">{{ detail.tags }}</p>
                <div class="description">{{ isArtist ? detail.intro : detail.intro }}</div>
                <div class="actions">
                    <button class="primary-btn" @click="addPlaylistToQueue($event)">
                        <i class="fas fa-play"></i> {{ $t('bo-fang') }}
                    </button>
                    <button class="follow-btn" v-if="isArtist" @click="toggleFollow" :disabled="followLoading">
                        <i class="fas fa-heart"></i> {{ isFollowed ? '已关注' : '关注' }}
                    </button>
                    <button class="fav-btn" v-if="!isArtist && !isAlbum && detail.list_create_userid != MoeAuth.UserInfo?.userid && !route.query.listid"
                        @click="toggleFavorite(detail.list_create_gid)" :class="{ 'active': isPlaylistFavorited }">
                        <i class="fas fa-heart"></i>
                    </button>
                    <div class="more-btn-container" v-if="!isArtist && !isAlbum">
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
                                <li @click="addPlaylistToQueue($event,true)" title="添加至播放列表">
                                    <i class="fas fa-add"></i>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 导航按钮 -->
        <i class="location-arrow fas fa-crosshairs" @click="scrollToItem" :title="t('dang-qian-bo-fang-ge-qu')"></i>
        <i class="scroll-bottom-img fas fa-angle-double-up" @click="scrollToFirstItem" :title="t('fan-hui-ding-bu')"></i>

        <!-- 歌曲列表 -->
        <div class="track-list-container">
            <div class="track-list-header">
                <h2 class="track-list-title"><span>{{ $t('ge-qu-lie-biao') }}</span> ( {{ displayTrackCount }} )</h2>
                <div class="track-list-actions">
                    <div class="batch-action-container">
                        <button class="batch-action-btn" @click="toggleBatchSelection" :class="{ 'active': batchSelectionMode }">
                            <input type="checkbox" v-model="batchSelectionMode" /> 批量操作
                            <span v-if="selectedTracks.length > 0" class="selected-count">{{ selectedTracks.length }}</span>
                        </button>
                        <div v-if="batchSelectionMode && isBatchMenuVisible && selectedTracks.length > 0" class="batch-actions-menu">
                            <ul>
                                <li @click="appendSelectedToQueue"><i class="fas fa-list"></i> 添加到播放列表 </li>
                                <li @click="addSelectedToOtherPlaylist" v-if="MoeAuth.UserInfo?.userid"><i class="fas fa-folder-plus"></i> 添加到其他歌单</li>
                                <li v-if="!isArtist && detail.list_create_userid == MoeAuth.UserInfo?.userid && route.query.listid" 
                                    @click="removeSelectedFromPlaylist"><i class="fas fa-trash-alt"></i> 取消收藏</li>
                            </ul>
                        </div>
                    </div>
                    <!-- 歌手歌曲排序选择 -->
                    <div v-if="isArtist" class="sort-selector">
                        <button class="sort-btn" :class="{ 'active': artistSortType === 'hot' }" @click="changeArtistSort('hot')">
                            热门
                        </button>
                        <button class="sort-btn" :class="{ 'active': artistSortType === 'new' }" @click="changeArtistSort('new')">
                            最新
                        </button>
                    </div>
                    <button class="view-mode-btn" @click="toggleViewMode" :title="viewMode === 'list' ? '切换到网格视图' : '切换到列表视图'">
                        <i class="fas" :class="viewMode === 'list' ? 'fa-th' : 'fa-list'"></i>
                    </button>
                    <input type="text" v-model="searchQuery" @keyup.enter="searchTracks" :placeholder="t('sou-suo-ge-qu')" class="search-input" />
                </div>
            </div>

            <!-- 表头 -->
            <div class="track-list-header-row">
                <div class="track-checkbox-header" v-if="batchSelectionMode">
                    <input type="checkbox" :checked="isAllSelected" @click="toggleSelectAll">
                </div>
                <div class="track-number-header" v-else>♪</div>
                <div class="track-title-header" @click="sortTracks('name')">
                    歌名 <i class="fas" :class="getSortIconClass('name')"></i>
                </div>
                <div class="track-artist-header" @click="sortTracks('author')">
                    歌手 <i class="fas" :class="getSortIconClass('author')"></i>
                </div>
                <div class="track-album-header" @click="sortTracks('album')">
                    专辑 <i class="fas" :class="getSortIconClass('album')"></i>
                </div>
                <div class="track-timelen-header" @click="sortTracks('timelen')">
                    时间 <i class="fas" :class="getSortIconClass('timelen')"></i>
                </div>
            </div>

            <!-- 搜索加载动画 -->
            <div v-if="isSearching" class="search-loading-overlay">
                <div class="search-loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>{{ $t('zheng-zai-jia-zai-quan-bu-ge-qu') }}</span>
                </div>
            </div>

            <RecycleScroller v-else ref="recycleScrollerRef" :items="filteredTracks" :item-size="viewMode === 'list' ? 50 : 70" class="track-list" key-field="hash" @scroll="handleScroll">
                <template #default="{ item, index }">
                    <div class="li" :key="item.hash"
                        :class="{ 'cover-view': viewMode === 'grid', 'selected': selectedTracks.includes(index) }"
                        @click="batchSelectionMode ? selectTrack(index, $event) : playSong(item.hash, item.name, item.cover, item.author)"
                        @contextmenu.prevent="showContextMenu($event, item)">

                        <!-- 复选框或序号 -->
                        <div class="track-checkbox" v-if="batchSelectionMode">
                            <input type="checkbox" :checked="selectedTracks.includes(index)" @click.stop="selectTrack(index, $event)">
                        </div>
                        <div class="track-number" v-else :class="{ 'current': isCurrentSong(item.hash) }">
                            <div v-if="isCurrentPlaying(item.hash)" class="sound-wave">
                                <span></span><span></span><span></span>
                            </div>
                            <span v-else>{{ index + 1 }}</span>
                        </div>

                        <!-- 网格模式封面 -->
                        <div class="track-cover" v-if="viewMode === 'grid'">
                            <img :src="item.cover || './assets/images/ico.png'" alt="Cover">
                            <div class="track-cover-overlay">
                                <i :class="props.playerControl?.currentSong.hash == item.hash ? 'fas fa-music' : 'fas fa-play'"></i>
                            </div>
                        </div>

                        <!-- 歌曲信息 -->
                        <div class="track-title-container">
                            <div class="track-title" :title="item.name" :class="{ 'current': isCurrentSong(item.hash) }">{{ item.name }}
                                <span v-if="item.privilege == 10" class="icon vip-icon">VIP</span>
                                <span v-if="item.isHQ" class="icon sq-icon">HQ</span>
                                <span v-else-if="item.isSQ" class="icon sq-icon">SQ</span>
                                <span v-if="item.mvhash" class="icon mv-icon">MV</span>
                            </div>
                            <div v-if="viewMode === 'grid' && item.remark" :title="item.remark" class="track-remark">{{ item.remark }}</div>
                        </div>
                        <div class="track-artist" :title="item.author">{{ item.author }}</div>
                        <div class="track-album" :title="item.album">{{ item.album }}</div>
                        <div class="track-timelen">
                            <button v-if="props.playerControl?.currentSong.hash == item.hash && viewMode === 'list'"
                                class="queue-play-btn fas fa-music"></button>
                            {{ $formatMilliseconds(item.timelen) }}
                        </div>
                    </div>
                </template>
            </RecycleScroller>
        </div>

        <!-- 歌手简介部分 -->
        <div class="content-section" v-if="isArtist && detail.long_intro && detail.long_intro.length">
            <div v-for="(section, index) in detail.long_intro" :key="index" class="intro-section">
                <h3>{{ section.title }}</h3>
                <div class="section-content">{{ section.content }}</div>
            </div>
        </div>

        <ContextMenu ref="contextMenuRef" :playerControl="playerControl" @songRemoved="handleSongRemoved" />
        <div class="note-container">
            <transition-group name="fly-note">
                <div v-for="note in flyingNotes" :key="note.id" class="flying-note" :style="note.style">♪</div>
            </transition-group>
        </div>
    </div>
    <PlaylistSelectModal ref="playlistSelect" :current-song="songs"/>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue';
import { RecycleScroller } from 'vue3-virtual-scroller';
import ContextMenu from '../components/ContextMenu.vue';
import PlaylistSelectModal from '../components/PlaylistSelectModal.vue';
import { get } from '../utils/request';
import { useRoute, useRouter } from 'vue-router';
import { MoeAuthStore } from '../stores/store';
import { useI18n } from 'vue-i18n';
import { share } from '@/utils/utils';

const playlistSelect = ref(null);
const { t } = useI18n();
const MoeAuth = MoeAuthStore();
const router = useRouter();
const route = useRoute();

// 判断是歌手还是歌单还是专辑
const isArtist = computed(() => !!route.query.singerid);
const isAlbum = computed(() => !!route.query.albumid);

// 通用状态
const detail = ref({});
const tracks = ref([]);
const filteredTracks = ref([]);
const searchQuery = ref('');
const basePageSize = 60; // 基础页面大小
const hasMore = ref(true);
const isLoadingMore = ref(false);
const totalCount = ref(0);
const contextMenuRef = ref(null);
const recycleScrollerRef = ref(null);
const loading = ref(true);
const isSearching = ref(false); // 搜索加载状态
const isDropdownVisible = ref(false);
const flyingNotes = ref([]);
let noteId = 0;

// 请求次数追踪，用于计算下一次的pageSize
const requestCount = ref(0);

// 计算下一次请求的pageSize
const getPageSize = () => {
    if (requestCount.value < 2) {
        return basePageSize;
    } else {
        return Math.min(basePageSize * Math.pow(2, requestCount.value - 1), 240);
    }
};

// 获取下一次请求的page 60 60 120 240 240
const getPage = () => {
    if (requestCount.value === 0) {
        return 1;
    } else if (requestCount.value <= 3) {
        // pageSize 还在递增阶段 (60, 60, 120, 240)，page 固定为 2
        return 2;
    } else {
        // pageSize 达到最大值 240 后，通过递增 page 继续加载
        // requestCount=4 时 page=3, requestCount=5 时 page=4, ...
        return requestCount.value - 1;
    }
};

// 歌手特有状态
const isFollowed = ref(true);
const followLoading = ref(false);
const collectedPlaylists = ref([]);
// 判断歌单是否被收藏
const isPlaylistFavorited = ref(false);

// 更新收藏状态
const updateFavoriteStatus = () => {
    if (!detail.value.list_create_listid) {
        isPlaylistFavorited.value = false;
        return;
    }
    collectedPlaylists.value = JSON.parse(localStorage.getItem('collectedPlaylists') || '[]');
    isPlaylistFavorited.value = collectedPlaylists.value.some(item => item.list_create_listid === detail.value.list_create_listid);
};

// 批量选择相关状态
const batchSelectionMode = ref(false);
const isBatchMenuVisible = ref(false);
const selectedTracks = ref([]);
let lastSelectedIndex = -1;
const songs = ref([]);

// 排序状态
const sortField = ref('');
const sortOrder = ref('asc');
const artistSortType = ref('hot'); // 歌手歌曲排序类型：hot(热门) 或 new(最新)

// 判断是否全选
const isAllSelected = computed(() => {
    return selectedTracks.value.length === filteredTracks.value.length && filteredTracks.value.length > 0;
});

// 视图模式相关状态
const viewMode = ref('list'); // 'list' or 'grid'

// 计算显示的歌曲数量
const displayTrackCount = computed(() => {
    // 当还有更多数据未加载时，显示 totalCount；否则显示实际加载的 tracks.length
    return hasMore.value ? totalCount.value : tracks.value.length;
});

const props = defineProps({
    playerControl: Object
});

onMounted(() => {
    isFollowed.value = !!route.query.unfollow;
    const savedViewMode = localStorage.getItem('trackViewMode');
    if (savedViewMode) {
        viewMode.value = savedViewMode;
    }
    loadData();
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});

watch(() => [route.query.global_collection_id, route.query.singerid, route.query.albumid], () => {
    loadData();
});

const loadData = async () => {
    if(!route.query.global_collection_id && !route.query.singerid && !route.query.albumid) {
        router.push('/library');
        return;
    }
    if (isArtist.value) {
        getArtistInfo();
        fetchArtistSongs();
    } else if (isAlbum.value) {
        getAlbumInfo();
        fetchAlbumSongs();
    } else {
        updateFavoriteStatus();
        await fetchPlaylistTracks();
    }
};

// 获取歌手信息
const getArtistInfo = async () => {
    try {
        const response = await get('/artist/detail', {
            id: route.query.singerid
        });
        if (response.status === 1) {
            detail.value = {
                ...response.data,
                id: route.query.singerid
            };
        }
    } catch (error) {
        console.error('获取歌手信息失败:', error);
    }
};

// 获取专辑信息
const getAlbumInfo = async () => {
    try {
        const response = await get('/album/detail', {
            id: route.query.albumid
        });
        if (response.status === 1 && response.data && response.data.length > 0) {
            const albumData = response.data[0]; // 数据在 data[0] 中
            detail.value = {
                name: albumData.album_name || '',
                pic: albumData.sizable_cover || albumData.cover || '',
                publish_date: albumData.publish_date || '',
                intro: albumData.intro || '',
                song_count: 0, // 专辑详情接口没有返回歌曲数量，从歌曲列表接口获取
                id: route.query.albumid
            };
        }
    } catch (error) {
        console.error('获取专辑信息失败:', error);
    }
};

// 获取歌手歌曲
const fetchArtistSongs = async () => {
    requestCount.value = 0;
    hasMore.value = true;

    try {
        const curPage = getPage();
        const curPageSize = getPageSize();

        const response = await get('/artist/audios', {
            id: route.query.singerid,
            sort: artistSortType.value,
            page: curPage,
            pagesize: curPageSize
        });

        if (response.status === 1) {
            totalCount.value = detail.value.song_count || 0;
            const rawSongs = response.data || [];
            const formattedTracks = rawSongs
            .filter(track => !!track.hash)
            .map(track => ({
                hash: track.hash || '',
                remark: track.remark || '',
                OriSongName: track.audio_name + ' - ' + track.author_name,
                name: track.audio_name || '',
                author: track.author_name || '',
                album: track.album_name || '',
                cover: track.trans_param.union_cover?.replace("{size}", 480) || '',
                timelen: track.timelength || 0,
                isSQ: track.hash_flac !== '',
                isHQ: track.hash_320 !== '',
                privilege: track.privilege || 0,
                mvhash: track.mvhash || '',
                originalData: track
            }));

            tracks.value = formattedTracks;
            filteredTracks.value = formattedTracks;
            requestCount.value++; // 增加请求计数

            // 判断是否还有更多数据
            hasMore.value = rawSongs.length >= curPageSize && tracks.value.length < totalCount.value;
        }
    } catch (error) {
        window.$modal.alert(t('ge-qu-shu-ju-cuo-wu'));
        return;
    }

    loading.value = false;

    ensureBufferData();
};

// 获取专辑歌曲
const fetchAlbumSongs = async () => {
    requestCount.value = 0;
    hasMore.value = true;

    try {
        const albumPageSize = 50; // 专辑固定使用 pagesize=50
        const curPage = 1;

        const response = await get('/album/songs', {
            id: route.query.albumid,
            page: curPage,
            pagesize: albumPageSize
        });

        if (response.status === 1) {
            totalCount.value = response.data.total || 0;
            // 更新专辑歌曲数量
            if (detail.value.song_count === 0) {
                detail.value.song_count = response.data.total || 0;
            }
            const rawSongs = response.data.songs || [];
            const formattedTracks = rawSongs
            .filter(track => track.audio_info?.hash)
            .map(track => {
                const audioInfo = track.audio_info;
                const base = track.base;
                const albumInfo = track.album_info;
                const mvHash = track.mvdata && track.mvdata.length > 0 ? track.mvdata[0].hash : '';

                return {
                    hash: audioInfo.hash || '',
                    remark: track.extra?.remark || '',
                    OriSongName: base.audio_name + ' - ' + base.author_name,
                    name: base.audio_name || '',
                    author: base.author_name || '',
                    album: albumInfo?.album_name || '',
                    cover: track.trans_param?.union_cover?.replace("{size}", 480) || '',
                    timelen: audioInfo.duration || 0,
                    isSQ: !!audioInfo.hash_flac,
                    isHQ: !!audioInfo.hash_320,
                    privilege: track.copyright?.privilege || 0,
                    mvhash: mvHash,
                    originalData: track
                };
            });

            tracks.value = formattedTracks;
            filteredTracks.value = formattedTracks;
            requestCount.value++; // 增加请求计数

            // 判断是否还有更多数据
            hasMore.value = rawSongs.length >= albumPageSize && tracks.value.length < totalCount.value;
        }
    } catch (error) {
        window.$modal.alert(t('ge-qu-shu-ju-cuo-wu'));
        return;
    }

    loading.value = false;

    ensureBufferData();
};

// 获取歌单歌曲
const fetchPlaylistTracks = async () => {
    requestCount.value = 0; // 重置请求计数
    hasMore.value = true;

    try {
        const curPage = getPage();
        const curPageSize = getPageSize();

        const response = await get('/playlist/track/all', {
            id: route.query.global_collection_id,
            page: curPage,
            pagesize: curPageSize
        });

        if (response.status === 1) {
            detail.value = response.data?.list_info;
            totalCount.value = detail.value.count || 0;
            const rawSongs = response.data?.songs || [];
            const formattedTracks = rawSongs
            .filter(track => !!track.hash)
            .map(track => {
                const nameParts = track.name.split(' - ');
                return {
                    hash: track.hash || '',
                    remark: track.remark || '',
                    OriSongName: track.name,
                    name: nameParts.length > 1 ? nameParts[1] : track.name,
                    author: nameParts.length > 1 ? nameParts[0] : '',
                    album: track.albuminfo?.name || '',
                    cover: track.cover?.replace("{size}", 480) || '',
                    timelen: track.timelen || 0,
                    isSQ: track.relate_goods && track.relate_goods.length > 2,
                    isHQ: track.relate_goods && track.relate_goods.length > 1,
                    privilege: track.privilege || 0,
                    mvhash: track.mvhash || '',
                    originalData: track
                };
            });

            tracks.value = formattedTracks;
            filteredTracks.value = formattedTracks;
            requestCount.value++; // 增加请求计数
            hasMore.value = rawSongs.length >= curPageSize && tracks.value.length < totalCount.value;
        }
    } catch (error) {
        window.$modal.alert(t('ge-qu-shu-ju-cuo-wu'));
        return;
    }

    loading.value = false;

    ensureBufferData();
};

// 加载更多歌曲
const loadMoreTracks = async () => {
    if (isLoadingMore.value || !hasMore.value) return;

    isLoadingMore.value = true;

    try {
        if (isArtist.value) {
            // 加载更多歌手歌曲
            const curPage = getPage();
            const curPageSize = getPageSize();

            const response = await get('/artist/audios', {
                id: route.query.singerid,
                sort: artistSortType.value,
                page: curPage,
                pagesize: curPageSize
            });

            if (response.status === 1 && response.data.length > 0) {
                const rawSongs = response.data;
                const formattedTracks = rawSongs
                .filter(track => !!track.hash)
                .map(track => ({
                    hash: track.hash || '',
                    OriSongName: track.audio_name + ' - ' + track.author_name,
                    name: track.audio_name || '',
                    author: track.author_name || '',
                    album: track.album_name || '',
                    cover: track.trans_param.union_cover?.replace("{size}", 480) || '',
                    timelen: track.timelength || 0,
                    isSQ: track.hash_flac !== '',
                    isHQ: track.hash_320 !== '',
                    privilege: track.privilege || 0,
                    mvhash: track.mvhash || '',
                    originalData: track
                }));

                tracks.value = [...tracks.value, ...formattedTracks];
                filteredTracks.value = tracks.value;
                requestCount.value++; // 增加请求计数
                hasMore.value = rawSongs.length >= curPageSize && tracks.value.length < totalCount.value;
            } else {
                hasMore.value = false;
            }
        } else if (isAlbum.value) {
            // 加载更多专辑歌曲
            const albumPageSize = 50; // 专辑固定使用 pagesize=50
            const curPage = Math.floor(tracks.value.length / albumPageSize) + 1;

            const response = await get('/album/songs', {
                id: route.query.albumid,
                page: curPage,
                pagesize: albumPageSize
            });

            if (response.status === 1 && response.data.songs?.length > 0) {
                const rawSongs = response.data.songs;
                const formattedTracks = rawSongs
                .filter(track => track.audio_info?.hash)
                .map(track => {
                    const audioInfo = track.audio_info;
                    const base = track.base;
                    const albumInfo = track.album_info;
                    const mvHash = track.mvdata && track.mvdata.length > 0 ? track.mvdata[0].hash : '';

                    return {
                        hash: audioInfo.hash || '',
                        remark: track.extra?.remark || '',
                        OriSongName: base.audio_name + ' - ' + base.author_name,
                        name: base.audio_name || '',
                        author: base.author_name || '',
                        album: albumInfo?.album_name || '',
                        cover: track.trans_param?.union_cover?.replace("{size}", 480) || '',
                        timelen: audioInfo.duration || 0,
                        isSQ: !!audioInfo.hash_flac,
                        isHQ: !!audioInfo.hash_320,
                        privilege: track.copyright?.privilege || 0,
                        mvhash: mvHash,
                        originalData: track
                    };
                });

                tracks.value = [...tracks.value, ...formattedTracks];
                filteredTracks.value = tracks.value;
                requestCount.value++; // 增加请求计数
                hasMore.value = rawSongs.length >= albumPageSize && tracks.value.length < totalCount.value;
            } else {
                hasMore.value = false;
            }
        } else {
            // 加载更多歌单歌曲
            const curPage = getPage();
            const curPageSize = getPageSize();

            const response = await get('/playlist/track/all', {
                id: route.query.global_collection_id,
                page: curPage,
                pagesize: curPageSize
            });

            if (response.status === 1 && response.data.songs?.length > 0) {
                const rawSongs = response.data.songs;
                const formattedTracks = rawSongs
                .filter(track => !!track.hash)
                .map(track => {
                    const nameParts = track.name.split(' - ');
                    return {
                        hash: track.hash || '',
                        OriSongName: track.name,
                        name: nameParts.length > 1 ? nameParts[1] : track.name,
                        author: nameParts.length > 1 ? nameParts[0] : '',
                        album: track.albuminfo?.name || '',
                        cover: track.cover?.replace("{size}", 480) || '',
                        timelen: track.timelen || 0,
                        isSQ: track.relate_goods && track.relate_goods.length > 2,
                        isHQ: track.relate_goods && track.relate_goods.length > 1,
                        privilege: track.privilege || 0,
                        mvhash: track.mvhash || '',
                        originalData: track
                    };
                });

                tracks.value = [...tracks.value, ...formattedTracks];
                filteredTracks.value = tracks.value;
                requestCount.value++; // 增加请求计数
                hasMore.value = rawSongs.length >= curPageSize && tracks.value.length < totalCount.value;
            } else {
                hasMore.value = false;
            }
        }
    } catch (error) {
        console.error('加载更多歌曲失败:', error);
    } finally {
        isLoadingMore.value = false;
        // 加载完成后继续检查是否需要加载更多以保持3页缓冲
        ensureBufferData();
    }
};

// 记录最后的滚动位置信息
let lastVisibleBottomIndex = 0;

// 确保始终有足够的缓冲数据
const ensureBufferData = () => {
    const totalItems = filteredTracks.value.length;
    const remainingItems = totalItems - lastVisibleBottomIndex;
    const bufferSize = 90;

    if (remainingItems < bufferSize && hasMore.value && !isLoadingMore.value) {
        loadMoreTracks();
    }
};

const handleScroll = (event) => {
    const { scrollTop, clientHeight } = event.target;
    const itemSize = viewMode.value === 'list' ? 50 : 70;
    // 计算当前可见区域底部对应的item索引
    const visibleBottomIndex = Math.ceil((scrollTop + clientHeight) / itemSize);
    lastVisibleBottomIndex = visibleBottomIndex;

    ensureBufferData();
};

// 搜索歌曲
const searchTracks = async () => {
    if (hasMore.value) {
        isSearching.value = true;
        try {
            await loadAndAppendRemainingTracks();
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
const playSong = (hash, name, img, author) => {
    props.playerControl.addSongToQueue(hash, name, img, author);
};

// 加载所有剩余歌曲并追加到播放队列
const loadAndAppendRemainingTracks = async () => {
    const loadedHashes = new Set(filteredTracks.value);

    while (hasMore.value) {
        if (isLoadingMore.value) {
            // 等待当前加载完成
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
        }
        await loadMoreTracks();
        // 找出新加载的歌曲（不在之前已加载集合中的）
        const newTracks = filteredTracks.value.filter(t => !loadedHashes.has(t));
        if (newTracks.length > 0) {
            // 将新歌曲追加到播放队列
            props.playerControl.addPlaylistToQueue(newTracks, true);
            // 更新已加载集合
            newTracks.forEach(t => {
                loadedHashes.add(t);
            });
        }
    }
};

// 添加整个播放列表到队列
const addPlaylistToQueue = (event, append = false) => {
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

    // 先将当前已加载的歌曲加入播放队列并开始播放
    props.playerControl.addPlaylistToQueue(filteredTracks.value, append);

    // 如果还有未加载的歌曲，后台继续加载并追加到队列
    if (hasMore.value) {
        loadAndAppendRemainingTracks();
    }
};

// 切换关注状态
const toggleFollow = async () => {
    if (!MoeAuth.isAuthenticated) {
        window.$modal.alert(t('qing-xian-deng-lu'));
        return;
    }
    followLoading.value = true;
    try {
        const response = await get(isFollowed.value ? '/artist/unfollow' : '/artist/follow', {
            id: route.query.singerid
        });
        if (response.status === 1) {
            isFollowed.value = !isFollowed.value;
        }
    } catch (error) {
        console.error('切换关注状态失败:', error);
    } finally {
        followLoading.value = false;
        localStorage.setItem('t', Date.now());
    }
};

// 收藏歌单
const toggleFavorite = async (id) => {
    if (!MoeAuth.isAuthenticated) {
        window.$modal.alert(t('qing-xian-deng-lu'));
        return;
    }
    
    try {
        if (isPlaylistFavorited.value) {
            const playlist = collectedPlaylists.value.find(p => p.list_create_listid === detail.value.list_create_listid);
            if (playlist) {
                await get('/playlist/del', { listid: playlist.listid });
                const newCollectedPlaylists = collectedPlaylists.value.filter(item => 
                    item.list_create_listid !== detail.value.list_create_listid
                );
                localStorage.setItem('collectedPlaylists', JSON.stringify(newCollectedPlaylists));
                isPlaylistFavorited.value = false;
                $message.success('取消收藏成功');
            }
        } else {
            const response = await get('/playlist/add', { 
                name: detail.value.name, 
                list_create_userid: MoeAuth.UserInfo.userid, 
                type: 1,
                list_create_gid: id 
            });
            if (response.status === 1) {
                const newPlaylist = {
                    list_create_listid: detail.value.list_create_listid,
                    listid: response.data.info.listid
                };
                const currentPlaylists = JSON.parse(localStorage.getItem('collectedPlaylists') || '[]');
                currentPlaylists.push(newPlaylist);
                localStorage.setItem('collectedPlaylists', JSON.stringify(currentPlaylists));
                isPlaylistFavorited.value = true;
                $message.success('收藏成功');
            }
        }
        localStorage.setItem('t', Date.now());
    } catch (error) {
        $message.error(isPlaylistFavorited.value ? t('qu-xiao-shou-cang-shi-bai') : t('shou-cang-shi-bai'));
    }
};

// 删除歌单
const deletePlaylist = async () => {
    isDropdownVisible.value = false;
    const result = await window.$modal.confirm(t('que-ren-shan-chu-ge-dan'));
    if (result) {
        await get('/playlist/del', { listid: route.query.listid });
        localStorage.setItem('t', Date.now());
        router.back();
    }
};

// 分享歌单
const sharePlaylist = () => {
    isDropdownVisible.value = false;
    share(detail.value.name,route.query.global_collection_id, 1);
};

// 右键菜单
const showContextMenu = (event, song) => {
    if (contextMenuRef.value) {
        contextMenuRef.value.openContextMenu(event, {
            OriSongName: song.OriSongName,
            FileHash: song.hash,
            fileid: song.originalData.fileid,
            userid: isArtist.value ? null : detail.value.list_create_userid,
            timeLength: song.timelen,
            cover: song.cover,
            mvhash: song.mvhash,
        }, isArtist.value ? null : detail.value.listid);
    }
};

// 滚动到当前播放歌曲
const scrollToItem = () => {
    const currentIndex = filteredTracks.value.findIndex(song => song.hash === props.playerControl.currentSong.hash);
    if (currentIndex !== -1) {
        recycleScrollerRef.value.scrollToItem(currentIndex - 3, { behavior: 'smooth' });
    }
};

// 滚动到顶部
const scrollToFirstItem = () => {
    recycleScrollerRef.value.scrollToItem(0, { behavior: 'smooth' });
    window.scrollTo({
        top: 0,
        behavior: 'smooth',
        scrollSource: 'manual-button-click' 
    });
};

// 处理下拉菜单点击外部关闭
const handleClickOutside = (event) => {
    const dropdown = document.querySelector('.dropdown-menu');
    const moreBtn = document.querySelector('.more-btn');
    if (dropdown && !dropdown.contains(event.target) && !moreBtn.contains(event.target)) {
        isDropdownVisible.value = false;
    }
    
    // 处理批量操作菜单
    const batchActionsMenu = document.querySelector('.batch-actions-menu');
    const batchActionBtn = document.querySelector('.batch-action-btn');
    if (batchActionsMenu && !batchActionsMenu.contains(event.target) && !batchActionBtn.contains(event.target)) {
        isBatchMenuVisible.value = false;
    }
};

// 切换下拉菜单显示状态
const toggleDropdown = () => {
    isDropdownVisible.value = !isDropdownVisible.value;
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
    } else {
        // 普通点击
        const existingIndex = selectedTracks.value.indexOf(index);
        if (existingIndex === -1) {
            selectedTracks.value.push(index);
        } else {
            selectedTracks.value.splice(existingIndex, 1);
        }
    }
    
    lastSelectedIndex = index;
};

// 将选中歌曲添加到播放队列（追加到当前队列）
const appendSelectedToQueue = async () => {
    if (selectedTracks.value.length === 0) return;
    const selectedSongs = selectedTracks.value.map(index => filteredTracks.value[index]);
    await props.playerControl.addPlaylistToQueue(selectedSongs, true);
    $message.success('添加到播放列表成功');
    isBatchMenuVisible.value = false;
};

// 将选中歌曲添加到其他歌单
const addSelectedToOtherPlaylist = async () => {
    if (selectedTracks.value.length === 0) return;
    const selectedSongs = selectedTracks.value.map(index => filteredTracks.value[index]);
    songs.value =  selectedSongs;
    await playlistSelect.value.fetchPlaylists();
    isBatchMenuVisible.value = false;
};

// 从歌单中移除选中的歌曲
const removeSelectedFromPlaylist = async () => {
    if (selectedTracks.value.length === 0) return;
    const result = await window.$modal.confirm('确定要移除选中的歌曲吗？');
    if (result) {
        const selectedSongs = selectedTracks.value.map(index => filteredTracks.value[index]);
        try {
            const fileids = selectedSongs.map(song => song.originalData.fileid).join(',');
            await get('/playlist/tracks/del', {
                listid: route.query.listid,
                fileids: fileids
            });
            selectedTracks.value.sort((a, b) => b - a).forEach(index => {
                filteredTracks.value.splice(index, 1);
                tracks.value = tracks.value.filter((_, i) => 
                    !selectedTracks.value.includes(i)
                );
            });
            filteredTracks.value = tracks.value;
            selectedTracks.value = [];
            $message.success('歌曲已从歌单中移除');
        } catch (err) {
            $message.error('移除歌曲失败');
            return;
        }
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
            await loadAndAppendRemainingTracks();
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

const handleSongRemoved = (fileid) => {
    tracks.value = tracks.value.filter(track => track.originalData?.fileid !== fileid);
    filteredTracks.value = filteredTracks.value.filter(track => track.originalData?.fileid !== fileid);
};

// 切换视图模式
const toggleViewMode = () => {
    viewMode.value = viewMode.value === 'list' ? 'grid' : 'list';
    localStorage.setItem('trackViewMode', viewMode.value);
};

// 切换歌手歌曲排序方式
const changeArtistSort = (sortType) => {
    if (artistSortType.value !== sortType) {
        artistSortType.value = sortType;
        // 重新获取歌手歌曲
        fetchArtistSongs();
    }
};

// 判断是否为当前歌曲（不管是否正在播放）
const isCurrentSong = (hash) => {
    return props.playerControl?.currentSong?.hash === hash;
};

// 判断是否为当前正在播放的歌曲
const isCurrentPlaying = (hash) => {
    return isCurrentSong(hash) && props.playerControl?.playing;
};
</script>

<style scoped>
.detail-page {
    padding: 20px;
}

/* 头部样式 */
.header {
    display: flex;
    align-items: center;
    margin-bottom: 40px;
}

.cover-art {
    width: 200px;
    height: 200px;
    border-radius: 10px;
    margin-right: 20px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    object-fit: cover;
}

.artist-avatar {
    border-radius: 50%;
}

.info {
    max-width: 600px;
}

.title {
    font-size: 36px;
    font-weight: bold;
    width: 800px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 0;
    color: var(--primary-color);
}

.subtitle {
    font-size: 18px;
    color: #666;
}

.meta {
    font-size: 14px;
    margin-bottom: 10px;
    color: #999;
}

.stats {
    display: flex;
    gap: 20px;
    color: #666;
    margin-top: 10px;
}

.description {
    white-space: pre-wrap;
    line-height: 1.6;
    color: var(--text-color);
    margin-bottom: 20px;
    font-size: 16px;
    max-height: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: break-spaces;
    overflow-y: auto;
}

.actions {
    display: flex;
    gap: 10px;
}

.primary-btn, .follow-btn {
    background-color: #ff69b4;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
}

.primary-btn i, .follow-btn i {
    margin-right: 5px;
}

.follow-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.fav-btn,
.more-btn {
    background-color: transparent;
    padding: 10px;
    border-radius: 5px;
    cursor: pointer;
    border: 1px solid var(--secondary-color);
    height: 100%;
}

.fav-btn i {
    color: #999;
}

.fav-btn.active i {
    color: var(--primary-color);
}

/* 歌曲列表样式 */
.track-list-container {
    margin-top: 30px;
}

.track-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.track-list-title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 10px;
    color: var(--primary-color);
}

/* 搜索和批量操作按钮 */
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
}

.batch-action-btn.active {
    background-color: var(--primary-color);
    color: white;
}

/* 视图模式切换按钮 */
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
}

.view-mode-btn:hover {
    background-color: rgba(var(--primary-color-rgb), 0.1);
}

.view-mode-btn i {
    font-size: 16px;
}

.selected-count {
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: red;
    color: white;
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
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 50;
    margin-top: 5px;
    width: 200px;
}

.batch-actions-menu ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.batch-actions-menu li {
    padding: 10px 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    white-space: nowrap;
}

.batch-actions-menu li i {
    margin-right: 10px;
    width: 16px;
    text-align: center;
}

.batch-actions-menu li:hover {
    background-color: #f0f0f0;
}

/* 排序选择器样式 */
.sort-selector {
    display: flex;
    border: 1px solid var(--secondary-color);
    border-radius: 5px;
    overflow: hidden;
}

.sort-btn {
    background-color: transparent;
    border: none;
    padding: 5px 15px;
    cursor: pointer;
    color: var(--text-color);
    transition: all 0.3s ease;
    font-size: 14px;
}

.sort-btn:not(:last-child) {
    border-right: 1px solid var(--secondary-color);
}

.sort-btn:hover {
    background-color: rgba(var(--primary-color-rgb), 0.1);
}

.sort-btn.active {
    background-color: var(--primary-color);
    color: white;
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
    height: 800px;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    overflow: auto;
}

/* 搜索加载动画 */
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
}

.search-loading-spinner i {
    font-size: 48px;
    color: var(--primary-color);
}

.search-loading-spinner span {
    font-size: 16px;
    color: #999;
}


.track-list::-webkit-scrollbar {
    width: 8px !important; 
    display: block !important;
}

.track-list:hover {
    scrollbar-color: var(--primary-color) transparent;
}

.li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #eee;
    border-radius: 5px;
    cursor: pointer;
}

.li:hover {
    background-color: var(--background-color);
}

.li.selected {
    background-color: rgba(var(--primary-color-rgb), 0.1);
}

/* 歌曲多选 */
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
    display: flex;
    align-items: flex-end;
    justify-content: center;
    height: 20px;
}

.track-number.current {
    color: var(--primary-color);
}

.track-title.current {
    color: var(--primary-color);
}

/* 声波动画 */
.sound-wave {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 16px;
}

.sound-wave span {
    width: 3px;
    background-color: var(--primary-color);
    animation: wave 0.8s ease-in-out infinite;
}

.sound-wave span:nth-child(1) {
    height: 6px;
    animation-delay: 0s;
}

.sound-wave span:nth-child(2) {
    height: 12px;
    animation-delay: 0.2s;
}

.sound-wave span:nth-child(3) {
    height: 8px;
    animation-delay: 0.4s;
}

@keyframes wave {
    0%, 100% {
        transform: scaleY(0.5);
    }
    50% {
        transform: scaleY(1);
    }
}

.track-title-container {
    flex: 2;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.track-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.track-remark {
    font-size: 12px;
    color: #999;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
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
}

.vip-icon {
    color: #ff6d00;
}

.sq-icon {
    color: #0094ff;
}

.mv-icon {
    color: #ff1744;
}

.queue-play-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--primary-color);
    cursor: pointer;
}

/* 歌手简介部分 */
.content-section {
    margin-top: 50px;
    border-top: 1px dotted var(--secondary-color);
}

.intro-section {
    margin-bottom: 30px;
}

.intro-section h3 {
    color: var(--primary-color);
    margin-bottom: 15px;
}

.section-content {
    white-space: pre-wrap;
    line-height: 1.6;
    color: var(--text-color);
}

/* 导航按钮 */
.location-arrow {
    position: fixed;
    bottom: 168px;
    right: 14px;
    z-index: 1;
    cursor: pointer;
    font-size: 20px;
    color: var(--primary-color);
}

.scroll-bottom-img {
    position: fixed;
    bottom: 100px;
    right: 10px;
    z-index: 1;
    cursor: pointer;
    font-size: 20px;
    color: var(--primary-color);
}

/* 下拉菜单 */
.more-btn-container {
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

/* 音符动画 */
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

/* 表头样式 */
.track-list-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid var(--primary-color);
    font-weight: bold;
    background-color: rgba(var(--primary-color-rgb), 0.1);
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

.track-title-header, .track-artist-header, .track-album-header, .track-timelen-header {
    cursor: pointer;
    display: flex;
    align-items: center;
}

.track-title-header {
    flex: 2;
}

.track-artist-header, .track-album-header {
    flex: 1;
    padding: 0 10px;
}

.track-timelen-header {
    width: 95px;
    text-align: right;
}

.track-title-header i, .track-artist-header i, .track-album-header i, .track-timelen-header i {
    margin-left: 5px;
    font-size: 14px;
}

.track-list-header-row:hover {
    background-color: rgba(var(--primary-color-rgb), 0.15);
}

/* 网格视图样式 */
.li.cover-view {
    height: 60px;
    padding: 5px 10px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #eee;
    border-radius: 5px;
}

.li.cover-view:hover {
    background-color: var(--background-color);
}

.track-cover {
    position: relative;
    width: 50px;
    height: 50px;
    margin-right: 15px;
    overflow: hidden;
    border-radius: 4px;
    flex-shrink: 0;
}

.track-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
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
    background: rgba(0,0,0,0.5);
    opacity: 0;
    transition: opacity 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
}

.li.cover-view:hover .track-cover-overlay {
    opacity: 1;
}

.track-list {
    height: 800px;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent; 
    overflow: auto;
}

/* 调整封面视图下的其他元素样式 */
.li.cover-view .track-title-container {
    flex: 2;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.li.cover-view .track-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.li.cover-view .track-remark {
    font-size: 12px;
    color: #999;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
}

.li.cover-view .track-artist {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 10px;
}

.li.cover-view .track-album {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 10px;
}

.li.cover-view .track-timelen {
    width: 95px;
    text-align: right;
}

.li.cover-view .track-checkbox,
.li.cover-view .track-number {
    margin-right: 10px;
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
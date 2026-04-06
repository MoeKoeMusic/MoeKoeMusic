<template>
    <div class="detail-page">
        <div class="header">
            <img class="cover-art" :src="`./assets/images/local.png`" />
            <div class="info">
                <h1 class="title">本地音乐</h1>
                <p class="subtitle">本地歌曲数: {{ musicFiles.length }}</p>
                <div class="folder-info" v-if="currentFolder">
                    <div class="folder-path">
                        <i class="fas fa-folder"></i>
                        <span>{{ currentFolder.name }}</span>
                    </div>
                </div>
                <div class="description">这里存放着你授权的文件夹中的歌曲，支持 MP3、FLAC、WAV、AAC、OGG、M4A 等格式</div>
                <div class="actions">
                    <button class="primary-btn" @click="addPlaylistToQueue($event)" v-if="musicFiles.length > 0">
                        <i class="fas fa-play"></i> 播放全部
                    </button>
                    <button class="upload-btn" @click="selectFolder" :disabled="loading">
                        <i class="fas fa-folder-open"></i> {{ currentFolder ? '重新选择文件夹' : '选择音乐文件夹' }}
                    </button>
                    <button v-if="currentFolder" class="upload-btn" @click="refreshFolder" :disabled="refreshing">
                        <i class="fas fa-sync-alt"></i> 刷新
                    </button>
                </div>
            </div>
        </div>

        <!-- 导航按钮 -->
        <i class="location-arrow fas fa-location-arrow" @click="scrollToItem" title="当前播放歌曲"></i>
        <img :src="`./assets/images/lemon.gif`" class="scroll-bottom-img" @click="scrollToFirstItem" title="返回顶部" />

        <!-- 歌曲列表 -->
        <div class="track-list-container" v-if="!loading">
            <div class="track-list-header">
                <h2 class="track-list-title"><span>本地歌曲</span> ( {{ filteredTracks.length }} )</h2>
                <div class="track-list-actions">
                    <div class="batch-action-container">
                        <button class="batch-action-btn" @click="toggleBatchSelection"
                            :class="{ 'active': batchSelectionMode }">
                            <input type="checkbox" v-model="batchSelectionMode" /> 批量操作
                            <span v-if="selectedTracks.length > 0" class="selected-count">{{ selectedTracks.length
                                }}</span>
                        </button>
                        <div v-if="batchSelectionMode && isBatchMenuVisible && selectedTracks.length > 0"
                            class="batch-actions-menu">
                            <ul>
                                <li @click="appendSelectedToQueue"><i class="fas fa-list"></i> 添加到播放列表</li>
                            </ul>
                        </div>
                    </div>
                    <button class="view-mode-btn" @click="toggleListMode"
                        :title="listMode === 'list' ? '切换到网格视图' : '切换到列表视图'">
                        <i class="fas" :class="listMode === 'list' ? 'fa-th' : 'fa-list'"></i>
                    </button>
                    <input type="text" v-model="searchQuery" @keyup.enter="searchTracks" placeholder="搜索歌曲"
                        class="search-input" />
                </div>
            </div>

            <!-- 表头 -->
            <div class="track-list-header-row" v-if="musicFiles.length > 0">
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
                <div class="track-album-header" @click="sortTracks('album')">
                    专辑 <i class="fas" :class="getSortIconClass('album')"></i>
                </div>
                <div class="track-size-header" @click="sortTracks('size')">
                    文件大小 <i class="fas" :class="getSortIconClass('size')"></i>
                </div>
                <div class="track-timelen-header" @click="sortTracks('timelen')">
                    时间 <i class="fas" :class="getSortIconClass('timelen')"></i>
                </div>
            </div>

            <RecycleScroller ref="recycleScrollerRef" :items="filteredTracks" :item-size="listMode === 'list' ? 50 : 70"
                class="track-list" key-field="name" v-if="musicFiles.length > 0">
                <template #default="{ item, index }">
                    <div class="li" :key="item.name"
                        :class="{ 'cover-view': listMode === 'grid', 'selected': selectedTracks.includes(index) }"
                        @click="batchSelectionMode ? selectTrack(index, $event) : playSong(item)">

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
                                :class="{ 'playing': props.playerControl?.currentSong.name == item.name }">
                                <i
                                    :class="props.playerControl?.currentSong.name == item.name ? 'fas fa-music' : 'fas fa-play'"></i>
                            </div>
                        </div>

                        <!-- 歌曲信息 -->
                        <div class="track-title" :title="item.name">{{ item.displayName }}
                            <span v-if="item.qualityInfo" class="icon" :class="item.qualityInfo.class">{{
                                item.qualityInfo.text }}</span>
                        </div>
                        <div class="track-artist" :title="item.author">{{ item.author }}</div>
                        <div class="track-album" :title="item.album">{{ item.album }}</div>
                        <div class="track-size" :title="item.filesize">{{ item.filesize }}</div>
                        <div class="track-timelen">
                            <button v-if="props.playerControl?.currentSong.name == item.name && listMode === 'list'"
                                class="queue-play-btn fas fa-music"></button>
                            {{ formatDuration(item.duration) }}
                        </div>
                    </div>
                </template>
            </RecycleScroller>

            <!-- 空状态 -->
            <div v-if="musicFiles.length === 0 && currentFolder" class="empty-state">
                <img src="/assets/images/empty1.png">
                <p>该文件夹中没有找到音乐文件</p>
                <p class="hint">支持的格式: MP3, FLAC, WAV, AAC, OGG, M4A</p>
            </div>

            <!-- 欢迎状态 -->
            <div v-if="!currentFolder" class="welcome-state">
                <img src="/assets/images/empty1.png">
                <h3>欢迎使用MoeKoe Music</h3>
                <p>请选择并授权以访问您的本地音乐文件夹</p>
            </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>正在扫描音乐文件...</p>
        </div>

        <div class="note-container">
            <transition-group name="fly-note">
                <div v-for="note in flyingNotes" :key="note.id" class="flying-note" :style="note.style">♪</div>
            </transition-group>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { RecycleScroller } from 'vue3-virtual-scroller';
import { parseBlob } from 'music-metadata';

// Props
const props = defineProps({
    playerControl: Object
});

// 通用状态
const currentFolder = ref(null);
const musicFiles = ref([]);
const filteredTracks = ref([]);
const searchQuery = ref('');
const recycleScrollerRef = ref(null);
const loading = ref(false);
const refreshing = ref(false);
const flyingNotes = ref([]);
let noteId = 0;

// 批量选择相关状态
const batchSelectionMode = ref(false);
const isBatchMenuVisible = ref(false);
const selectedTracks = ref([]);
let lastSelectedIndex = -1;

// 排序状态
const sortField = ref('');
const sortOrder = ref('asc');

// 列表模式状态
const listMode = ref(localStorage.getItem('localMusicListMode') || 'list');

// 支持的音乐文件格式
const supportedFormats = ['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma'];

// IndexedDB 相关
const DB_NAME = 'LocalMusicDB';
const DB_VERSION = 1;
const STORE_NAME = 'folderHandles';

// 判断是否全选
const isAllSelected = computed(() => {
    return selectedTracks.value.length === filteredTracks.value.length && filteredTracks.value.length > 0;
});

onMounted(() => {
    $message.warning('该页面处于测试阶段，功能还未完善')
    loadLastFolder();
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});

// 初始化 IndexedDB
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

// 保存文件夹句柄到 IndexedDB
const saveFolderHandle = async (handle) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        await store.put({
            id: 'lastSelectedFolder',
            handle: handle,
            name: handle.name,
            timestamp: Date.now()
        });

        console.log('文件夹句柄已保存');
    } catch (error) {
        console.error('保存文件夹句柄失败:', error);
    }
};

// 从 IndexedDB 读取文件夹句柄
const loadFolderHandle = async () => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get('lastSelectedFolder');
            request.onsuccess = () => {
                const result = request.result;
                if (result && result.handle) {
                    resolve(result.handle);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('读取文件夹句柄失败:', error);
        return null;
    }
};

// 检查是否支持 File System Access API
const checkFileSystemSupport = () => {
    if (!('showDirectoryPicker' in window)) {
        window.$modal.alert('您的浏览器不支持 File System Access API，请使用 Chrome 86+ 或 Edge 86+');
        return false;
    }
    return true;
};

// 加载上次选择的文件夹
const loadLastFolder = async () => {
    if (!checkFileSystemSupport()) return;

    try {
        loading.value = true;
        const savedHandle = await loadFolderHandle();
        if (savedHandle) {
            // 验证句柄是否仍然有效
            const permission = await savedHandle.queryPermission({ mode: 'read' });
            if (permission === 'granted') {
                currentFolder.value = savedHandle;
                await scanMusicFiles(savedHandle);
                console.log('已自动加载上次选择的文件夹:', savedHandle.name);
            } else {
                // 请求权限
                const newPermission = await savedHandle.requestPermission({ mode: 'read' });
                if (newPermission === 'granted') {
                    currentFolder.value = savedHandle;
                    await scanMusicFiles(savedHandle);
                    console.log('已重新获取权限并加载文件夹:', savedHandle.name);
                }
            }
        }
    } catch (error) {
        console.error('自动加载文件夹失败:', error);
    }
    loading.value = false;
};

// 选择文件夹
const selectFolder = async () => {
    if (!checkFileSystemSupport()) return;

    try {
        loading.value = true;
        const dirHandle = await window.showDirectoryPicker();
        currentFolder.value = dirHandle;

        // 保存句柄到 IndexedDB
        await saveFolderHandle(dirHandle);

        // 扫描音乐文件
        await scanMusicFiles(dirHandle);

        console.log(`已选择文件夹: ${dirHandle.name}`);
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('选择文件夹失败:', error);
        }
    } finally {
        loading.value = false;
    }
};

// 刷新文件夹
const refreshFolder = async () => {
    if (!currentFolder.value) return;

    try {
        refreshing.value = true;
        await scanMusicFiles(currentFolder.value);
        console.log('刷新完成');
    } catch (error) {
        console.error('刷新失败:', error);
    } finally {
        refreshing.value = false;
    }
};


// 读取音频元数据
const readAudioMetadata = async (file) => {
    try {
        const metadata = await parseBlob(file);

        let coverUrl = './assets/images/ico.png';

        // 提取封面图片
        if (metadata.common.picture && metadata.common.picture.length > 0) {
            const picture = metadata.common.picture[0];
            const blob = new Blob([picture.data], { type: picture.format });
            coverUrl = URL.createObjectURL(blob);
        }

        return {
            title: file.name || '未知',
            artist: metadata.common.artist || '未知',
            album: metadata.common.album || '本地音乐',
            year: metadata.common.year || null,
            genre: metadata.common.genre ? metadata.common.genre.join(', ') : null,
            track: metadata.common.track ? metadata.common.track.no : null,
            duration: metadata.format.duration || 0,
            bitrate: metadata.format.bitrate || null,
            sampleRate: metadata.format.sampleRate || null,
            cover: coverUrl
        };
    } catch (error) {
        console.warn('parseBlob读取失败，跳过该歌曲:', error);
        return null;
    }
};

// 递归扫描目录
const scanDirectory = async (dirHandle, files = []) => {
    try {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                const extension = '.' + getFileExtension(file.name).toLowerCase();

                if (supportedFormats.includes(extension)) {
                    // 读取音频元数据
                    const metadata = await readAudioMetadata(file);

                    if (metadata === null) {
                        console.log(`跳过无法解析的歌曲: ${file.name}`);
                        continue;
                    }

                    files.push({
                        name: file.name,
                        displayName: metadata.title,
                        author: metadata.artist,
                        album: metadata.album,
                        year: metadata.year,
                        genre: metadata.genre,
                        track: metadata.track,
                        size: file.size,
                        filesize: formatFileSize(file.size),
                        type: file.type,
                        file: file,
                        handle: entry,
                        duration: metadata.duration,
                        timelen: metadata.duration * 1000, // 转换为毫秒
                        bitrate: metadata.bitrate,
                        sampleRate: metadata.sampleRate,
                        cover: metadata.cover,
                        qualityInfo: getQualityInfo(extension, metadata.bitrate, metadata.sampleRate)
                    });
                }
            } else if (entry.kind === 'directory') {
                // 递归扫描子文件夹
                await scanDirectory(entry, files);
            }
        }
    } catch (error) {
        console.error('扫描目录失败:', error);
    }

    return files;
};

// 扫描音乐文件
const scanMusicFiles = async (dirHandle) => {
    try {
        // 递归扫描所有子文件夹
        const files = await scanDirectory(dirHandle);

        // 按艺术家和标题排序
        files.sort((a, b) => {
            const artistCompare = a.author.localeCompare(b.author);
            if (artistCompare !== 0) return artistCompare;
            return a.displayName.localeCompare(b.displayName);
        });

        musicFiles.value = files;
        filteredTracks.value = files;

    } catch (error) {
        console.error('扫描文件失败:', error);
    }
};

// 获取音质信息
const getQualityInfo = (extension, bitrate, sampleRate) => {
    // 无损格式
    if (['.flac', '.wav', '.ape', '.alac'].includes(extension)) {
        if (sampleRate >= 96000) {
            return { text: 'HR', class: 'hr-icon' }; // Hi-Res
        } else {
            return { text: 'SQ', class: 'sq-icon' }; // Studio Quality
        }
    }


    // 有损格式根据比特率判断
    if (bitrate) {
        if (bitrate >= 320) {
            return { text: 'HQ', class: 'hq-icon' }; // High Quality
        } else if (bitrate >= 192) {
            return { text: 'MQ', class: 'mq-icon' }; // Medium Quality
        }
    }

    // 特殊格式标识
    switch (extension) {
        case '.m4a':
        case '.aac':
            return { text: 'AAC', class: 'hq-icon' };
        case '.ogg':
            return { text: 'OGG', class: 'hq-icon' };
        default:
            return null;
    }
};

// 播放歌曲
const playSong = async (item) => {
    try {
        console.log('[LocalMusic] 开始播放本地音乐:', item.name);
        if (props.playerControl) {
            await props.playerControl.addLocalMusicToQueue(item);
        }
    } catch (error) {
        console.error('[LocalMusic] 播放本地音乐失败:', error);
        window.$modal?.alert('播放失败: ' + error.message);
    }
};

// 添加整个播放列表到队列
const addPlaylistToQueue = async (event, append = false) => {
    $message.warning('建设中'); return;
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

    if (props.playerControl) {
        console.log('[LocalMusic] 添加本地播放列表到队列:', filteredTracks.value.length, '首歌曲');
        await props.playerControl.addLocalPlaylistToQueue(filteredTracks.value, append);
    }
};

// 搜索歌曲
const searchTracks = () => {
    filteredTracks.value = musicFiles.value.filter(track =>
        track.name.toLowerCase().trim().includes(searchQuery.value.toLowerCase().trim()) ||
        track.author.toLowerCase().trim().includes(searchQuery.value.toLowerCase().trim())
    );
};

// 切换列表模式
const toggleListMode = () => {
    listMode.value = listMode.value === 'list' ? 'grid' : 'list';
    localStorage.setItem('localMusicListMode', listMode.value);
};

// 格式化文件大小
const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 格式化时长
const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 获取文件扩展名
const getFileExtension = (filename) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

// 滚动到当前播放歌曲
const scrollToItem = () => {
    const currentIndex = filteredTracks.value.findIndex(song => song.name === props.playerControl?.currentSong.name);
    if (currentIndex !== -1) {
        recycleScrollerRef.value.scrollToItem(currentIndex - 3, { behavior: 'smooth' });
    }
};

// 滚动到顶部
const scrollToFirstItem = () => {
    if (recycleScrollerRef.value) {
        recycleScrollerRef.value.scrollToItem(0, { behavior: 'smooth' });
    }
    window.scrollTo({
        top: 0,
        behavior: 'smooth',
        scrollSource: 'manual-button-click'
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
        if (isBatchMenuVisible.value) {
            batchSelectionMode.value = false;
            isBatchMenuVisible.value = false;
            selectedTracks.value = [];
            lastSelectedIndex = -1;
        } else {
            isBatchMenuVisible.value = true;
        }
    } else {
        batchSelectionMode.value = true;
        isBatchMenuVisible.value = false;
    }
};

// 选择/取消选择歌曲
const selectTrack = (index, event) => {
    if (event.shiftKey && lastSelectedIndex !== -1) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);

        for (let i = start; i <= end; i++) {
            if (!selectedTracks.value.includes(i)) {
                selectedTracks.value.push(i);
            }
        }
    } else if (event.ctrlKey || event.metaKey) {
        const existingIndex = selectedTracks.value.indexOf(index);
        if (existingIndex === -1) {
            selectedTracks.value.push(index);
        } else {
            selectedTracks.value.splice(existingIndex, 1);
        }
    } else {
        const existingIndex = selectedTracks.value.indexOf(index);
        if (existingIndex === -1) {
            selectedTracks.value = [index];
        } else {
            selectedTracks.value = [];
        }
    }

    lastSelectedIndex = index;
};

// 将选中歌曲添加到播放队列
const appendSelectedToQueue = async () => {
    $message.warning('还未完善'); return;
    if (selectedTracks.value.length === 0) return;
    const selectedSongs = selectedTracks.value.map(index => filteredTracks.value[index]);
    if (props.playerControl) {
        console.log('[LocalMusic] 添加选中的本地歌曲到播放列表:', selectedSongs.length, '首');
        await props.playerControl.addLocalPlaylistToQueue(selectedSongs, true);
        console.log('[LocalMusic] 选中歌曲添加到播放列表成功');
    }
    isBatchMenuVisible.value = false;
    // 清空选择
    selectedTracks.value = [];
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
const sortTracks = (field) => {
    if (sortField.value === field) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortField.value = field;
        sortOrder.value = 'asc';
    }

    filteredTracks.value = [...filteredTracks.value].sort((a, b) => {
        let valueA, valueB;

        if (field === 'timelen') {
            valueA = a.duration || 0;
            valueB = b.duration || 0;
        } else if (field === 'size') {
            valueA = a.size || 0;
            valueB = b.size || 0;
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
.detail-page {
    padding: 20px;
}

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

.folder-info {
    margin: 10px 0;
}

.folder-path {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #666;
    font-size: 14px;

    i {
        color: var(--primary-color);
    }
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

.primary-btn,
.upload-btn {
    background-color: var(--primary-color);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
}

.upload-btn {
    background-color: var(--primary-color);
}

.primary-btn,
.upload-btn {
    i {
        margin-right: 5px;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
}

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
        background-color: var(--primary-color);
        color: white;
    }
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

    &::-webkit-scrollbar {
        width: 8px !important;
        display: block !important;
    }

    &:hover {
        scrollbar-color: var(--primary-color) transparent;
    }
}

.li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #eee;
    border-radius: 5px;
    cursor: pointer;

    &:hover {
        background-color: var(--background-color);
    }

    &.selected {
        background-color: rgba(var(--primary-color-rgb), 0.1);
    }

    &.cover-view {
        height: 60px;
        padding: 5px 10px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid #eee;
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

        .track-album {
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

.icon {
    margin-left: 5px;
    border: 1px solid;
    border-radius: 5px;
    font-size: 10px;
    padding-left: 6px;
    padding-right: 6px;
}

.hq-icon {
    color: #0094ff;
    border-color: #0094ff;
}

.hr-icon {
    color: #ff6d00;
    border-color: #ff6d00;
}

.queue-play-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--primary-color);
    cursor: pointer;
}

.location-arrow {
    position: fixed;
    bottom: 168px;
    right: 14px;
    z-index: 1;
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
    z-index: 1;
    cursor: pointer;
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

.track-list-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid var(--primary-color);
    font-weight: bold;
    background-color: rgba(var(--primary-color-rgb), 0.1);
    border-radius: 5px 5px 0 0;

    &:hover {
        background-color: rgba(var(--primary-color-rgb), 0.15);
    }
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

    i {
        margin-left: 5px;
        font-size: 14px;
    }
}

.track-artist-header {
    flex: 1;
    padding: 0 10px;

    i {
        margin-left: 5px;
        font-size: 14px;
    }
}

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
    color: white;
    font-size: 20px;
}

.li.cover-view:hover .track-cover-overlay {
    opacity: 1;
}

.track-cover-overlay.playing {
    opacity: 1;
}

.empty-state,
.welcome-state {
    text-align: center;
    padding: 60px 20px;
    color: #666;

    i {
        font-size: 48px;
        color: #ddd;
        margin-bottom: 20px;
    }
}

.welcome-state {
    h3 {
        margin: 0px 0 10px;
        color: #333;
    }

    p {
        margin-bottom: 30px;
        color: #666;
    }
}

.hint {
    font-size: 12px;
    color: #999;
    margin-top: 10px;
}

.loading-state {
    text-align: center;
    padding: 60px 20px;
    color: #666;

    p {
        margin-top: 20px;
    }
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
</style>
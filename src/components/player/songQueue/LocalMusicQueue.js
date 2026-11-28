import { toRaw } from 'vue';
import { parseBlob } from 'music-metadata';
import { buildCoverUrl, buildMediaUrl } from '@/utils/localMedia';
import { PLACEHOLDER_COVER, isPlaceholderCover, sizeCover } from '@/utils/localCover';

/**
 * 路径型歌曲的封面：列表里已经匹配到在线封面就用它（大图用 480），
 * 否则交给协议按需从音频文件里抽取（抽不到由播放器兜底成在线封面/占位图）
 */
const resolvePathCover = (item) => {
    if (item.coverTemplate && !isPlaceholderCover(item.coverTemplate)) return sizeCover(item.coverTemplate, 480);
    return buildCoverUrl(item.filePath);
};

// 给歌曲对象补上封面/歌词匹配需要的字段
const toMatchFields = (localItem) => ({
    cacheKey: localItem.cacheKey || (localItem.filePath ? `fs:${localItem.filePath}` : ''),
    fileName: localItem.name || '',
    duration: Number(localItem.duration) || 0
});

const getLocalSongHash = (item) => {
    if (item.hash) return item.hash;
    // 全盘扫描/下载目录的歌曲：路径是稳定标识
    if (item.filePath) return `local_fs_${item.filePath}`;
    if (!item.file) return '';
    return `local_${item.name}_${item.file.size}_${item.file.lastModified}`;
};

// 来自主进程扫描（有磁盘路径、没有 File 句柄）的歌曲
const isPathTrack = (item) => Boolean(toRaw(item)?.filePath) && !isLocalFile(toRaw(item)?.file);

const isLocalFile = (file) => typeof Blob !== 'undefined' && toRaw(file) instanceof Blob;

const getLocalSongCover = (item) => {
    const coverBlob = toRaw(item.coverBlob);
    if (isLocalFile(coverBlob) && coverBlob.size > 0) {
        return URL.createObjectURL(coverBlob);
    }
    return item.cover || item.img || PLACEHOLDER_COVER;
};

const LOCAL_MUSIC_DB_NAME = 'LocalMusicDB';
const LOCAL_MUSIC_STORE_NAME = 'folderHandles';
const LOCAL_SONG_KEY_PREFIX = 'localSong:';

const openLocalMusicDB = () => {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB is not available'));
            return;
        }

        const request = indexedDB.open(LOCAL_MUSIC_DB_NAME);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => db.close();
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(LOCAL_MUSIC_STORE_NAME)) {
                db.createObjectStore(LOCAL_MUSIC_STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

const getLocalStoreItem = async (key) => {
    const db = await openLocalMusicDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([LOCAL_MUSIC_STORE_NAME], 'readonly');
        const store = transaction.objectStore(LOCAL_MUSIC_STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const putLocalStoreItem = async (item) => {
    const db = await openLocalMusicDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([LOCAL_MUSIC_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(LOCAL_MUSIC_STORE_NAME);
        const request = store.put(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveLocalSongHandle = async (hash, item) => {
    const handle = toRaw(item.handle);
    if (!hash || !handle || typeof handle.getFile !== 'function') return;

    try {
        await putLocalStoreItem({
            id: `${LOCAL_SONG_KEY_PREFIX}${hash}`,
            hash,
            handle,
            name: item.name,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('[SongQueue] 保存本地歌曲句柄失败:', error);
    }
};

const getFileFromHandle = async (handle, shouldRequestPermission = true) => {
    const rawHandle = toRaw(handle);
    if (!rawHandle || typeof rawHandle.getFile !== 'function') return null;

    if (typeof rawHandle.queryPermission === 'function') {
        const permission = await rawHandle.queryPermission({ mode: 'read' });
        if (permission !== 'granted') {
            if (!shouldRequestPermission) return null;
            const nextPermission = await rawHandle.requestPermission({ mode: 'read' });
            if (nextPermission !== 'granted') return null;
        }
    }

    return rawHandle.getFile();
};

const resolveLocalSongFile = async (item, hash, shouldRequestPermission = true) => {
    const file = toRaw(item.file);
    if (isLocalFile(file)) return file;

    const handleFile = await getFileFromHandle(item.handle, shouldRequestPermission);
    if (handleFile) return handleFile;

    try {
        const storedSong = await getLocalStoreItem(`${LOCAL_SONG_KEY_PREFIX}${hash}`);
        return await getFileFromHandle(storedSong?.handle, shouldRequestPermission);
    } catch (error) {
        console.error('[SongQueue] 读取本地歌曲句柄失败:', error);
        return null;
    }
};

const readLocalSongCover = async (file) => {
    try {
        const metadata = await parseBlob(file);
        const picture = metadata.common.picture?.[0];
        if (!picture) return PLACEHOLDER_COVER;

        const blob = new Blob([picture.data], { type: picture.format });
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('[SongQueue] 读取本地歌曲封面失败:', error);
        return PLACEHOLDER_COVER;
    }
};

export default function useLocalMusicQueue(t, musicQueueStore, currentSong, timeoutId) {
    const restoreLocalSongCover = async (localItem) => {
        const localHash = getLocalSongHash(localItem);
        if (!localHash) return '';

        if (isPathTrack(localItem)) {
            return resolvePathCover(localItem);
        }

        const localFile = await resolveLocalSongFile(localItem, localHash, false);
        if (!localFile) return '';

        return readLocalSongCover(localFile);
    };

    // 添加本地音乐到队列并播放
    const addLocalMusicToQueue = async (localItem, isReset = true) => {

        const currentSongHash = currentSong.value.hash;
        const localHash = getLocalSongHash(localItem);
        if (!localHash) return { error: true };

        if (typeof window !== 'undefined' && typeof window.electron !== 'undefined') {
            window.electron.ipcRenderer.send('set-tray-title', (localItem.displayName || localItem.name) + ' - ' + (localItem.author || '未知艺术家'));
        }

        try {
            clearTimeout(timeoutId.value);
            const pathTrack = isPathTrack(localItem);
            const hasCurrentFile = isLocalFile(localItem.file);
            let localFile = null;
            let url = '';

            if (pathTrack) {
                // 主进程扫描到的歌曲：直接用自定义协议流式播放，避免整首读入内存
                url = buildMediaUrl(localItem.filePath);
            } else {
                localFile = await resolveLocalSongFile(localItem, localHash);
                if (!localFile) return { error: true };
                await saveLocalSongHandle(localHash, localItem);
                url = URL.createObjectURL(localFile);
            }

            const hasCachedCover = isLocalFile(localItem.coverBlob) || localItem.coverState === 'none';
            let localCover;
            if (pathTrack) {
                localCover = resolvePathCover(localItem);
            } else {
                localCover = hasCurrentFile || hasCachedCover
                    ? getLocalSongCover(localItem)
                    : await readLocalSongCover(localFile);
            }

            // 设置当前歌曲信息
            const matchFields = toMatchFields(localItem);
            currentSong.value.author = localItem.author || '未知艺术家';
            currentSong.value.name = localItem.displayName || localItem.name;
            currentSong.value.img = localCover;
            currentSong.value.hash = localHash;
            currentSong.value.cacheKey = matchFields.cacheKey;
            currentSong.value.fileName = matchFields.fileName;
            currentSong.value.duration = matchFields.duration;
            currentSong.value.qualityLabel = '';
            currentSong.value.qualityOptions = [];

            currentSong.value.url = url;
            console.log('[SongQueue] 创建本地音乐URL:', url);

            // 创建歌曲对象
            const song = {
                id: localItem.id || musicQueueStore.queue.length + 1,
                hash: currentSong.value.hash,
                name: currentSong.value.name,
                img: currentSong.value.img,
                author: currentSong.value.author,
                timeLength: localItem.timelen || (localItem.duration * 1000) || localItem.timeLength || 0,
                ...matchFields,
                url: url,
                isLocal: true,
                file: localFile,
                filePath: localItem.filePath || '',
                handle: localItem.handle
            };

            // 根据是否需要重置播放位置
            if (isReset) {
                localStorage.setItem('player_progress', 0);
            }

            // 更新队列
            const existingSongIndex = musicQueueStore.queue.findIndex(song => song.hash === currentSong.value.hash);
            if (existingSongIndex === -1) {
                const currentIndex = musicQueueStore.queue.findIndex(song => song.hash == currentSongHash);
                if (currentIndex !== -1) {
                    musicQueueStore.queue.splice(currentIndex + 1, 0, song);
                } else {
                    musicQueueStore.addSong(song);
                }
            } else {
                musicQueueStore.queue[existingSongIndex] = {
                    ...musicQueueStore.queue[existingSongIndex],
                    ...song,
                    id: musicQueueStore.queue[existingSongIndex].id
                };
                currentSong.value = musicQueueStore.queue[existingSongIndex];
            }

            // 返回歌曲对象
            return { song };
        } catch (error) {
            console.error('[SongQueue] 获取本地音乐地址出错:', error);
            currentSong.value.author = currentSong.value.name = '获取本地音乐失败';
            // if (musicQueueStore.queue.length === 0) return { error: true };
            currentSong.value.author = t('3-miao-hou-zi-dong-qie-huan-xia-yi-shou');

            // 返回需要切换到下一首的标志，而不是直接调用playSongFromQueue
            return { error: true, shouldPlayNext: true };
        }
    };

    // 批量添加本地音乐到播放列表
    const addLocalPlaylistToQueue = async (localSongs, append = false) => {
        console.log('[SongQueue] 添加本地播放列表:', localSongs.length, '首歌曲');
        
        try {
            let queueSongs = [];
            if (!append) {
                musicQueueStore.clearQueue();
            } else {
                queueSongs = [...musicQueueStore.queue];
            }
            
            const addedHashes = new Set(queueSongs.map(song => song.hash));
            const newSongs = [];
            for (const item of localSongs) {
                const localHash = getLocalSongHash(item);
                if (!localHash || addedHashes.has(localHash)) continue;
                addedHashes.add(localHash);

                // 路径型歌曲不需要提前读文件，播放时由协议按需读取
                if (isPathTrack(item)) {
                    newSongs.push({
                        id: queueSongs.length + newSongs.length + 1,
                        hash: localHash,
                        name: item.displayName || item.name,
                        author: item.author || '未知艺术家',
                        img: resolvePathCover(item),
                        timeLength: item.timelen || (item.duration * 1000) || item.timeLength || 0,
                        ...toMatchFields(item),
                        url: buildMediaUrl(item.filePath),
                        isLocal: true,
                        file: null,
                        filePath: item.filePath,
                        handle: null
                    });
                    continue;
                }

                const localFile = await resolveLocalSongFile(item, localHash);
                if (!localFile) continue;
                await saveLocalSongHandle(localHash, item);

                const localSong = {
                    id: queueSongs.length + newSongs.length + 1,
                    hash: localHash,
                    name: item.displayName || item.name,
                    author: item.author || '未知艺术家',
                    img: getLocalSongCover(item),
                    timeLength: item.timelen || (item.duration * 1000) || item.timeLength || 0,
                    url: item.url || '',
                    isLocal: true,
                    file: localFile,
                    handle: item.handle
                };
                newSongs.push(localSong);
            }
            
            // 添加到队列
            if (append) {
                musicQueueStore.queue = [...queueSongs, ...newSongs].map((song, index) => ({
                    ...song,
                    id: index + 1
                }));
            } else {
                musicQueueStore.queue = newSongs;
            }
            
            return newSongs;
        } catch (error) {
            console.error('[SongQueue] 添加本地播放列表失败:', error);
            return [];
        }
    };

    return {
        addLocalMusicToQueue,
        addLocalPlaylistToQueue,
        restoreLocalSongCover
    };
}

import { ref, toRaw } from 'vue';
import { parseBlob } from 'music-metadata';
import { get } from '../../utils/request';
import { MoeAuthStore } from '../../stores/store';

const QUALITY_LEVELS = ['128', '320', 'flac', 'high', 'viper_atmos', 'viper_clear', 'viper_tape'];
const QUALITY_LABELS = {
    '128': '标准',
    '320': '高品',
    flac: 'FLAC',
    high: 'Hi-Res',
    viper_atmos: '全景声',
    viper_clear: '超清',
    viper_tape: '母带'
};

const normalizeQuality = (quality) => {
    return QUALITY_LEVELS.includes(quality) ? quality : '128';
};

const getFallbackChain = (quality) => QUALITY_LEVELS.slice(0, QUALITY_LEVELS.indexOf(normalizeQuality(quality)) + 1).reverse();

const getQualityLabel = (quality) => QUALITY_LABELS[quality] || '';

const getPrivilegeVariants = (response) => {
    const variants = [];

    for (const item of response?.data || []) {
        for (const variant of [item, ...(item?.relate_goods || [])]) {
            if (!variant?.hash || variant?.level === 0 || !QUALITY_LEVELS.includes(variant?.quality)) continue;
            variants.push(variant);
        }
    }

    return variants;
};

const getQualityOptions = (response) => {
    const qualityOptions = new Map();

    for (const variant of getPrivilegeVariants(response)) {
        if (qualityOptions.has(variant.quality)) continue;
        qualityOptions.set(variant.quality, {
            value: variant.quality,
            hash: variant.hash,
            label: getQualityLabel(variant.quality)
        });
    }

    return [...qualityOptions.values()].sort((a, b) => QUALITY_LEVELS.indexOf(b.value) - QUALITY_LEVELS.indexOf(a.value));
};

const getPrivilegeCandidates = (qualityOptions, quality, originalHash) => {
    const candidatesByQuality = new Map();

    for (const option of qualityOptions) {
        if (!candidatesByQuality.has(option.value)) {
            candidatesByQuality.set(option.value, {
                hash: option.hash,
                quality: option.value
            });
        }
    }

    const fallbackChain = getFallbackChain(quality);
    const candidates = fallbackChain.map(itemQuality => candidatesByQuality.get(itemQuality)).filter(Boolean);

    return candidates.length > 0 ? candidates : fallbackChain.map(itemQuality => ({
        hash: originalHash,
        quality: itemQuality
    }));
};

const getLocalSongHash = (item) => {
    if (item.hash) return item.hash;
    if (!item.file) return '';
    return `local_${item.name}_${item.file.size}_${item.file.lastModified}`;
};

const getLocalSongCover = (item) => item.cover || item.img || './assets/images/ico.png';

const LOCAL_MUSIC_DB_NAME = 'LocalMusicDB';
const LOCAL_MUSIC_STORE_NAME = 'folderHandles';
const LOCAL_SONG_KEY_PREFIX = 'localSong:';

const isLocalFile = (file) => typeof Blob !== 'undefined' && toRaw(file) instanceof Blob;

const openLocalMusicDB = () => {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB is not available'));
            return;
        }

        const request = indexedDB.open(LOCAL_MUSIC_DB_NAME);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
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
        if (!picture) return './assets/images/ico.png';

        const blob = new Blob([picture.data], { type: picture.format });
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('[SongQueue] 读取本地歌曲封面失败:', error);
        return './assets/images/ico.png';
    }
};

const restoreLocalSongCover = async (localItem) => {
    const localHash = getLocalSongHash(localItem);
    if (!localHash) return '';

    const localFile = await resolveLocalSongFile(localItem, localHash, false);
    if (!localFile) return '';

    return readLocalSongCover(localFile);
};

export default function useSongQueue(t, musicQueueStore, queueList = null) {
    const currentSong = ref({
        name: '',
        author: '',
        img: '',
        url: '',
        hash: '',
        playHash: '',
        resolvedQuality: '',
        qualityLabel: '',
        qualityOptions: []
    });
    const NextSong = ref([]);
    const timeoutId = ref(null);
    let activeSongRequestId = 0;

    // 添加歌曲到队列并播放
    const addSongToQueue = async (hash, name, img, author, isReset = true, qualityOverride = '', cachedQualityOptions = []) => {
        if(!hash) return { error: true };
        const requestId = ++activeSongRequestId;
        const isStaleRequest = () => requestId !== activeSongRequestId;
        const currentSongHash = currentSong.value.hash;
        if (typeof window !== 'undefined' && typeof window.electron !== 'undefined') {
            window.electron.ipcRenderer.send('set-tray-title', name + ' - ' + author);
        }

        try {
            clearTimeout(timeoutId.value);
            currentSong.value.author = author;
            currentSong.value.name = name;
            currentSong.value.img = img;
            currentSong.value.hash = hash;
            currentSong.value.playHash = hash;
            currentSong.value.resolvedQuality = '';
            currentSong.value.qualityLabel = '';
            currentSong.value.qualityOptions = [];

            console.log('[SongQueue] 获取歌曲:', hash, name);

            const settings = JSON.parse(localStorage.getItem('settings') || '{}');
            const data = {
                hash: hash
            };

            // 根据用户设置确定请求参数
            const MoeAuth = typeof MoeAuthStore === 'function' ? MoeAuthStore() : { isAuthenticated: false };
            const isAuth = !!MoeAuth.isAuthenticated;

            let response = null;
            let selectedCandidate = { hash, quality: '' };
            let qualityOptions = [];

            if (!isAuth) {
                data.free_part = 1;
                response = await get('/song/url', data);
                if (isStaleRequest()) return { stale: true };
            } else {
                const q = normalizeQuality(qualityOverride || settings?.quality);
                const fallbackCandidates = getFallbackChain(q).map(itemQuality => ({
                    hash,
                    quality: itemQuality
                }));
                let candidates = fallbackCandidates;
                qualityOptions = Array.isArray(cachedQualityOptions) ? cachedQualityOptions.map(option => ({ ...option })) : [];

                try {
                    if (qualityOptions.length === 0) {
                        const privilegeResponse = await get(`/privilege/lite`, { hash: hash });
                        if (isStaleRequest()) return { stale: true };
                        qualityOptions = getQualityOptions(privilegeResponse);
                    }
                    candidates = getPrivilegeCandidates(qualityOptions, q, hash);
                } catch (error) {
                    if (error.response?.data?.error?.includes('验证')) {
                        throw error;
                    }
                    if (error.response?.data?.status == 2) {
                        throw error;
                    }
                    console.error('[SongQueue] 获取歌曲详情失败，回退到原始哈希请求:', error);
                }

                for (const candidate of candidates) {
                    try {
                        const candidateResponse = await get('/song/url', {
                            hash: candidate.hash,
                            quality: candidate.quality,
                            ppage_id: '356753938'
                        });
                        if (isStaleRequest()) return { stale: true };

                        if (candidateResponse.status !== 1) {
                            response = candidateResponse;
                            continue;
                        }

                        if (candidateResponse.extName == 'mp4') {
                            console.log('[SongQueue] 歌曲格式为MP4，尝试获取下一档音质');
                            response = candidateResponse;
                            continue;
                        }

                        if (!candidateResponse.url || !candidateResponse.url[0]) {
                            response = candidateResponse;
                            continue;
                        }

                        response = candidateResponse;
                        selectedCandidate = candidate;
                        break;
                    } catch (error) {
                        if (error.response?.data?.error?.includes('验证')) {
                            throw error;
                        }
                        if (error.response?.data?.status == 2) {
                            throw error;
                        }
                        console.error('[SongQueue] 获取候选音质失败:', error);
                    }
                }
            }

            if (isStaleRequest()) return { stale: true };

            if (!response || response.status !== 1) {
                console.error('[SongQueue] 获取音乐URL失败:', response);
                currentSong.value.author = currentSong.value.name = t('huo-qu-yin-le-shi-bai');
                if (response?.status == 3) {
                    currentSong.value.name = t('gai-ge-qu-zan-wu-ban-quan');
                }
                if (musicQueueStore.queue.length === 0) return { error: true };
                currentSong.value.author = t('3-miao-hou-zi-dong-qie-huan-xia-yi-shou');

                // 返回需要切换到下一首的标志，而不是直接调用playSongFromQueue
                return { error: true, shouldPlayNext: true };
            }

            // 设置URL
            if (response.url && response.url[0]) {
                currentSong.value.url = response.url[0];
                currentSong.value.playHash = selectedCandidate.hash || hash;
                currentSong.value.resolvedQuality = selectedCandidate.quality || '';
                currentSong.value.qualityLabel = getQualityLabel(selectedCandidate.quality);
                currentSong.value.qualityOptions = qualityOptions.map(option => ({ ...option }));
                console.log('[SongQueue] 获取到音乐URL:', currentSong.value.url);
            } else {
                console.error('[SongQueue] 未获取到音乐URL');
                currentSong.value.author = currentSong.value.name = t('huo-qu-yin-le-shi-bai');
                return { error: true };
            }

            // 创建歌曲对象
            const song = {
                id: musicQueueStore.queue.length + 1,
                hash: hash,
                playHash: selectedCandidate.hash || hash,
                resolvedQuality: selectedCandidate.quality || '',
                qualityLabel: getQualityLabel(selectedCandidate.quality),
                qualityOptions: qualityOptions.map(option => ({ ...option })),
                name: name,
                img: img,
                author: author,
                timeLength: response.timeLength,
                url: response.url[0],
                // 响度规格化参数
                loudnessNormalization: {
                    volume: response.volume || 0,
                    volumeGain: response.volume_gain || 0,
                    volumePeak: response.volume_peak || 1
                }
            };

            // 根据是否需要重置播放位置
            if (isReset) {
                localStorage.setItem('player_progress', 0);
            }

            // 更新队列
            const existingSongIndex = musicQueueStore.queue.findIndex(song => song.hash === hash);
            if (existingSongIndex === -1) {
                const currentIndex = musicQueueStore.queue.findIndex(song => song.hash == currentSongHash);
                if (currentIndex !== -1) {
                    musicQueueStore.queue.splice(currentIndex + 1, 0, song);
                } else {
                    musicQueueStore.addSong(song);
                }
            } else {
                // 如果歌曲已存在，只更新当前歌曲的信息，不修改队列
                currentSong.value = song;
            }

            // 返回歌曲对象
            return { song };
        } catch (error) {
            if (isStaleRequest()) return { stale: true };
            console.error('[SongQueue] 获取音乐地址出错:', error);
            currentSong.value.author = currentSong.value.name = t('huo-qu-yin-le-di-zhi-shi-bai');
            if (error.response?.data?.error?.includes('验证')) {
                window.$modal.alert('账户风控,请稍候重试!');
                return { error: true};
            }
            if (error.response?.data?.status == 2) {
                window.$modal.alert(t('deng-lu-shi-xiao-qing-zhong-xin-deng-lu'));
                return { error: true};
            }
            if (musicQueueStore.queue.length === 0) return { error: true };
            currentSong.value.author = t('3-miao-hou-zi-dong-qie-huan-xia-yi-shou');

            // 返回需要切换到下一首的标志，而不是直接调用playSongFromQueue
            return { error: true, shouldPlayNext: true };
        }
    };

    // 添加云盘歌曲到播放列表
    const addCloudMusicToQueue = async (hash, name, author, timeLength, cover, isReset = true) => {
        const currentSongHash = currentSong.value.hash;
        if (typeof window !== 'undefined' && typeof window.electron !== 'undefined') {
            window.electron.ipcRenderer.send('set-tray-title', name + ' - ' + author);
        }

        try {
            clearTimeout(timeoutId.value);
            currentSong.value.author = author;
            currentSong.value.name = name;
            currentSong.value.hash = hash;
            currentSong.value.img = cover;
            currentSong.value.qualityLabel = '';
            currentSong.value.qualityOptions = [];

            console.log('[SongQueue] 获取云盘歌曲:', hash, name);

            const response = await get('/user/cloud/url', { hash });
            if (response.status !== 1) {
                console.error('[SongQueue] 获取云盘音乐URL失败:', response);
                currentSong.value.author = currentSong.value.name = t('huo-qu-yin-le-shi-bai');
                if (musicQueueStore.queue.length === 0) return { error: true };
                currentSong.value.author = t('3-miao-hou-zi-dong-qie-huan-xia-yi-shou');

                // 返回需要切换到下一首的标志，而不是直接调用playSongFromQueue
                return { error: true, shouldPlayNext: true };
            }

            // 设置URL
            if (response.data && response.data.url) {
                currentSong.value.url = response.data.url;
                console.log('[SongQueue] 获取到云盘音乐URL:', currentSong.value.url);
            } else {
                console.error('[SongQueue] 未获取到云盘音乐URL');
                currentSong.value.author = currentSong.value.name = t('huo-qu-yin-le-shi-bai');
                return { error: true };
            }

            // 创建歌曲对象
            const song = {
                id: musicQueueStore.queue.length + 1,
                hash: hash,
                name: name,
                author: author,
                img: cover,
                timeLength: timeLength || 0,
                url: response.data.url,
                isCloud: true
            };

            // 根据是否需要重置播放位置
            if (isReset) {
                localStorage.setItem('player_progress', 0);
            }

            // 更新队列
            const existingSongIndex = musicQueueStore.queue.findIndex(song => song.hash === hash);
            if (existingSongIndex === -1) {
                const currentIndex = musicQueueStore.queue.findIndex(song => song.hash == currentSongHash);
                if (currentIndex !== -1) {
                    musicQueueStore.queue.splice(currentIndex + 1, 0, song);
                } else {
                    musicQueueStore.addSong(song);
                }
            } else {
                // 如果歌曲已存在，只更新当前歌曲的信息，不修改队列
                currentSong.value = song;
            }

            // 返回歌曲对象
            return { song };
        } catch (error) {
            console.error('[SongQueue] 获取云盘音乐地址出错:', error);
            currentSong.value.author = currentSong.value.name = t('huo-qu-yin-le-di-zhi-shi-bai');
            if (musicQueueStore.queue.length === 0) return { error: true };
            currentSong.value.author = t('3-miao-hou-zi-dong-qie-huan-xia-yi-shou');

            // 返回需要切换到下一首的标志，而不是直接调用playSongFromQueue
            return { error: true, shouldPlayNext: true };
        }
    };

    // 添加下一首
    const addToNext = (hash, name, img, author, timeLength) => {
        const existingSongIndex = musicQueueStore.queue.findIndex(song => song.hash === hash);
        if (existingSongIndex !== -1 && typeof queueList?.value?.removeSongFromQueue === 'function') {
            queueList.value.removeSongFromQueue(existingSongIndex);
        }

        const currentIndex = musicQueueStore.queue.findIndex(song => song.hash === currentSong.value.hash);
        musicQueueStore.queue.splice(currentIndex !== -1 ? currentIndex + 1 : musicQueueStore.queue.length, 0, {
            id: musicQueueStore.queue.length + 1,
            hash: hash,
            name: name,
            img: img,
            author: author,
            timeLength: timeLength,
        });

        NextSong.value.push({
            id: musicQueueStore.queue.length + 1,
            hash: hash,
            name: name,
            img: img,
            author: author,
            timeLength: timeLength,
        });
    };

    // 获取歌单全部歌曲
    const getPlaylistAllSongs = async (id) => {
        try {
            let allSongs = [];
            for (let page = 1; page <= 4; page++) {
                const url = `/playlist/track/all?id=${id}&pagesize=300&page=${page}`;
                const response = await get(url);
                if (response.status !== 1) {
                    window.$modal.alert(t('huo-qu-ge-dan-shi-bai'));
                    return;
                }
                if (Object.keys(response.data.info).length === 0) break;
                allSongs = allSongs.concat(response.data.info);
                if (response.data.info.length < 300) break;
            }
            return allSongs;
        } catch (error) {
            console.error(error);
            window.$modal.alert(t('huo-qu-ge-dan-shi-bai'));
            return null;
        }
    };

    // 添加歌单到播放列表
    const addPlaylistToQueue = async (info, append = false) => {
        let songs = [];
        if (!append) {
            musicQueueStore.clearQueue();
        } else {
            songs = [...musicQueueStore.queue];
        }

        const newSongs = info.map((song, index) => {
            return {
                id: songs.length + index + 1,
                hash: song.hash,
                name: song.name,
                img: song.cover?.replace("{size}", 480) || './assets/images/ico.png',
                author: song.author,
                timeLength: song.timelen
            };
        });

        if (append) {
            songs = [...songs, ...newSongs];
        } else {
            songs = newSongs;
        }

        musicQueueStore.queue = songs;
        return songs;
    };

    // 批量添加云盘歌曲到播放列表
    const addCloudPlaylistToQueue = async (songs, append = false) => {
        let queueSongs = [];
        if (!append) {
            musicQueueStore.clearQueue();
        } else {
            queueSongs = [...musicQueueStore.queue];
        }

        const newSongs = songs.map((song, index) => {
            return {
                id: queueSongs.length + index + 1,
                hash: song.hash,
                name: song.name,
                author: song.author,
                timeLength: song.timelen || 0,
                url: song.url,
                isCloud: true
            };
        });

        if (append) {
            queueSongs = [...queueSongs, ...newSongs];
        } else {
            queueSongs = newSongs;
        }

        musicQueueStore.queue = queueSongs;
        return queueSongs;
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
            const hasCurrentFile = isLocalFile(localItem.file);
            const localFile = await resolveLocalSongFile(localItem, localHash);
            if (!localFile) return { error: true };
            await saveLocalSongHandle(localHash, localItem);
            const localCover = hasCurrentFile ? getLocalSongCover(localItem) : await readLocalSongCover(localFile);
            
            // 设置当前歌曲信息
            currentSong.value.author = localItem.author || '未知艺术家';
            currentSong.value.name = localItem.displayName || localItem.name;
            currentSong.value.img = localCover;
            currentSong.value.hash = localHash;
            currentSong.value.qualityLabel = '';
            currentSong.value.qualityOptions = [];

            // 创建本地文件的 URL
            const url = URL.createObjectURL(localFile);
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
                url: url,
                isLocal: true,
                file: localFile,
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
            currentSong.value.author = currentSong.value.name = t('huo-qu-ben-di-yin-le-di-zhi-shi-bai');
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
            
            const newSongs = [];
            for (const [index, item] of localSongs.entries()) {
                const localHash = getLocalSongHash(item);
                if (!localHash) continue;

                const localFile = await resolveLocalSongFile(item, localHash);
                if (!localFile) continue;
                await saveLocalSongHandle(localHash, item);

                const localSong = {
                    id: queueSongs.length + index + 1,
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

    // 获取歌曲详情
    const privilegeSong = async (hash) => {
        const response = await get(`/privilege/lite`,{hash:hash});
        return response;
    }

    return {
        currentSong,
        NextSong,
        addSongToQueue,
        addCloudMusicToQueue,
        addLocalMusicToQueue,
        addLocalPlaylistToQueue,
        addToNext,
        getPlaylistAllSongs,
        addPlaylistToQueue,
        addCloudPlaylistToQueue,
        restoreLocalSongCover,
        privilegeSong
    };
}

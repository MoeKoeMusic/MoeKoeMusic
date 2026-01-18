import { ref } from 'vue';
import { get } from '../../utils/request';
import { MoeAuthStore } from '../../stores/store';


export default function useSongQueue(t, musicQueueStore, queueList = null) {
    const currentSong = ref({ name: '', author: '', img: '', url: '', hash: '' });
    const NextSong = ref([]);
    const timeoutId = ref(null);

    // 添加歌曲到队列并播放
    const addSongToQueue = async (hash, name, img, author, isReset = true) => {
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

            console.log('[SongQueue] 获取歌曲:', hash, name);

            const settings = JSON.parse(localStorage.getItem('settings') || '{}');
            const data = {
                hash: hash
            };

            // 根据用户设置确定请求参数
            const MoeAuth = typeof MoeAuthStore === 'function' ? MoeAuthStore() : { isAuthenticated: false };
            const isAuth = !!MoeAuth.isAuthenticated;

            if (!isAuth) {
                data.free_part = 1;
            } else {
                const qualityMap = {
                    normal: '128',
                    high: '320',
                    lossless: 'flac',
                    hires: 'high',
                    viper: 'viper_clear',
                };

                const q = settings?.quality;
                const mapped = qualityMap[q];
                if (mapped) data.quality = mapped;
            }

            const response = await get('/song/url', data);
            if (response.status !== 1) {
                console.error('[SongQueue] 获取音乐URL失败:', response);
                currentSong.value.author = currentSong.value.name = t('huo-qu-yin-le-shi-bai');
                if (response.status == 3) {
                    currentSong.value.name = t('gai-ge-qu-zan-wu-ban-quan');
                }
                if (musicQueueStore.queue.length === 0) return { error: true };
                currentSong.value.author = t('3-miao-hou-zi-dong-qie-huan-xia-yi-shou');

                // 返回需要切换到下一首的标志，而不是直接调用playSongFromQueue
                return { error: true, shouldPlayNext: true };
            }

            if (response.extName == 'mp4') {
                console.log('[SongQueue] 歌曲格式为MP4，尝试获取其他格式');
                return addSongToQueue(hash, name, img, author, false);
            }

            // 设置URL
            if (response.url && response.url[0]) {
                currentSong.value.url = response.url[0];
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

        if (typeof window !== 'undefined' && typeof window.electron !== 'undefined') {
            window.electron.ipcRenderer.send('set-tray-title', (localItem.displayName || localItem.name) + ' - ' + (localItem.author || '未知艺术家'));
        }

        try {
            clearTimeout(timeoutId.value);
            
            // 设置当前歌曲信息
            currentSong.value.author = localItem.author || '未知艺术家';
            currentSong.value.name = localItem.displayName || localItem.name;
            currentSong.value.img = localItem.cover || './assets/images/ico.png';
            currentSong.value.hash = `local_${localItem.name}_${localItem.file.size}_${localItem.file.lastModified}`;

            // 创建本地文件的 URL
            const url = URL.createObjectURL(localItem.file);
            currentSong.value.url = url;
            console.log('[SongQueue] 创建本地音乐URL:', url);

            // 创建歌曲对象
            const song = {
                // id: musicQueueStore.queue.length + 1,
                hash: currentSong.value.hash,
                name: currentSong.value.name,
                img: currentSong.value.img,
                author: currentSong.value.author,
                timeLength: localItem.timelen || (localItem.duration * 1000),
                url: url,
                isLocal: true
            };

            // 根据是否需要重置播放位置
            // if (isReset) {
            //     localStorage.setItem('player_progress', 0);
            // }

            // // 更新队列
            // const existingSongIndex = musicQueueStore.queue.findIndex(song => song.hash === currentSong.value.hash);
            // if (existingSongIndex === -1) {
            //     const currentIndex = musicQueueStore.queue.findIndex(song => song.hash == currentSongHash);
            //     if (currentIndex !== -1) {
            //         musicQueueStore.queue.splice(currentIndex + 1, 0, song);
            //     } else {
            //         musicQueueStore.addSong(song);
            //     }
            // } else {
            //     // 如果歌曲已存在，只更新当前歌曲的信息，不修改队列
            //     currentSong.value = song;
            // }

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
            // if (!append) {
            //     musicQueueStore.clearQueue();
            // }
            
            const queueSongs = [];
            for (const item of localSongs) {
                const localSong = {
                    // id: musicQueueStore.queue.length + queueSongs.length + 1,
                    hash: `local_${item.name}_${item.file.size}_${item.file.lastModified}`,
                    name: item.displayName || item.name,
                    author: item.author || '未知艺术家',
                    img: item.cover || './assets/images/ico.png',
                    timeLength: item.timelen || (item.duration * 1000),
                    isLocal: true,
                    file: item.file
                };
                queueSongs.push(localSong);
            }
            
            // 添加到队列
            // if (append) {
            //     musicQueueStore.queue = [...musicQueueStore.queue, ...queueSongs];
            // } else {
            //     musicQueueStore.queue = queueSongs;
            // }
            
            return queueSongs;
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
        privilegeSong
    };
} 
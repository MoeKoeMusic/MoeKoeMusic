import { ref } from 'vue';
import { get } from '../../utils/request';

export default function useSongQueue(t, musicQueueStore) {
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
            if (!MoeAuth.isAuthenticated) data.free_part = 1;
            if (MoeAuth.isAuthenticated && settings?.quality === 'lossless' && settings?.qualityCompatibility === 'off') data.quality = 'flac';
            if (MoeAuth.isAuthenticated && settings?.quality === 'hires' && settings?.qualityCompatibility === 'off') data.quality = 'high';

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
                currentSong.value.url = response.url[0].replace('http://', 'https://');
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
                img: img.replace('http://', 'https://'),
                author: author,
                timeLength: response.timeLength,
                url: response.url[0].replace('http://', 'https://')
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
            if (musicQueueStore.queue.length === 0) return { error: true };
            currentSong.value.author = t('3-miao-hou-zi-dong-qie-huan-xia-yi-shou');

            // 返回需要切换到下一首的标志，而不是直接调用playSongFromQueue
            return { error: true, shouldPlayNext: true };
        }
    };

    // 添加云盘歌曲到播放列表
    const addCloudMusicToQueue = async (hash, name, author, timeLength, isReset = true) => {
        const currentSongHash = currentSong.value.hash;
        if (typeof window !== 'undefined' && typeof window.electron !== 'undefined') {
            window.electron.ipcRenderer.send('set-tray-title', name + ' - ' + author);
        }

        try {
            clearTimeout(timeoutId.value);
            currentSong.value.author = author;
            currentSong.value.name = name;
            currentSong.value.hash = hash;

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
                timeLength: timeLength || 0,
                url: response.data.url.replace('http://', 'https://'),
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
            img: img.replace('http://', 'https://'),
            author: author,
            timeLength: timeLength,
        });

        NextSong.value.push({
            id: musicQueueStore.queue.length + 1,
            hash: hash,
            name: name,
            img: img.replace('http://', 'https://'),
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
                img: song.cover?.replace("{size}", 480).replace('http://', 'https://') || './assets/images/ico.png',
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
        addToNext,
        getPlaylistAllSongs,
        addPlaylistToQueue,
        addCloudPlaylistToQueue,
        privilegeSong
    };
} 
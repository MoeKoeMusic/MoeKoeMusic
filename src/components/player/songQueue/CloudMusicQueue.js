import { get } from '../../../utils/request';

export default function useCloudMusicQueue(t, musicQueueStore, currentSong, timeoutId) {
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

    // 批量添加云盘歌曲到播放列表
    const addCloudPlaylistToQueue = async (songs, append = false) => {
        let queueSongs = [];
        if (!append) {
            musicQueueStore.clearQueue();
        } else {
            queueSongs = [...musicQueueStore.queue];
        }

        const addedHashes = new Set(queueSongs.map(song => song.hash));
        const newSongs = songs.reduce((list, song) => {
            if (!song.hash || addedHashes.has(song.hash)) return list;
            addedHashes.add(song.hash);
            list.push({
                id: queueSongs.length + list.length + 1,
                hash: song.hash,
                name: song.name,
                author: song.author,
                timeLength: song.timelen || 0,
                url: song.url,
                isCloud: true
            });
            return list;
        }, []);

        if (append) {
            queueSongs = [...queueSongs, ...newSongs];
        } else {
            queueSongs = newSongs;
        }

        musicQueueStore.queue = queueSongs;
        return queueSongs;
    };

    return {
        addCloudMusicToQueue,
        addCloudPlaylistToQueue
    };
}

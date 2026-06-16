import { get } from '../../../utils/request';
import { MoeAuthStore } from '../../../stores/store';

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

export default function useOnlineMusicQueue(t, musicQueueStore, currentSong, timeoutId) {
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

        const addedHashes = new Set(songs.map(song => song.hash));
        const newSongs = info.reduce((list, song) => {
            if (!song.hash || addedHashes.has(song.hash)) return list;
            addedHashes.add(song.hash);
            list.push({
                id: songs.length + list.length + 1,
                hash: song.hash,
                name: song.name,
                img: song.cover?.replace("{size}", 480) || './assets/images/ico.png',
                author: song.author,
                timeLength: song.timelen
            });
            return list;
        }, []);

        if (append) {
            songs = [...songs, ...newSongs];
        } else {
            songs = newSongs;
        }

        musicQueueStore.queue = songs;
        return songs;
    };

    // 获取歌曲详情
    const privilegeSong = async (hash) => {
        const response = await get(`/privilege/lite`,{hash:hash});
        return response;
    };

    return {
        addSongToQueue,
        getPlaylistAllSongs,
        addPlaylistToQueue,
        privilegeSong
    };
}

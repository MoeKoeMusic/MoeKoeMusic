import { ref } from 'vue';
import useOnlineMusicQueue from './songQueue/OnlineMusicQueue';
import useCloudMusicQueue from './songQueue/CloudMusicQueue';
import useLocalMusicQueue from './songQueue/LocalMusicQueue';

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

    const onlineMusicQueue = useOnlineMusicQueue(t, musicQueueStore, currentSong, timeoutId);
    const cloudMusicQueue = useCloudMusicQueue(t, musicQueueStore, currentSong, timeoutId);
    const localMusicQueue = useLocalMusicQueue(t, musicQueueStore, currentSong, timeoutId);

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

    return {
        currentSong,
        NextSong,
        addToNext,
        ...onlineMusicQueue,
        ...cloudMusicQueue,
        ...localMusicQueue
    };
}

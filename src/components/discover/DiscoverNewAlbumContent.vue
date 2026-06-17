<template>
    <div class="discover-new-album-content">
        <div class="category-container">
            <div class="sub-categories album-categories">
                <button v-for="type in newAlbumTypes" :key="type.value || 'recommend'" @click="selectAlbumType(type.value)"
                    :class="{ active: selectedAlbumType === type.value }">
                    {{ type.label }}
                </button>
            </div>
        </div>

        <CommonSkeleton v-if="isLoading" variant="card-grid" :count="10" />

        <div v-else class="music-grid">
            <div class="music-card" v-for="card in cardItems" :key="card.key">
                <router-link :to="card.to">
                    <img :src="$getCover(card.cover, 240)" class="music-image" />
                    <div class="music-info">
                        <h3>{{ card.title }}</h3>
                        <p>{{ card.description }}</p>
                    </div>
                </router-link>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CommonSkeleton from '../CommonSkeleton.vue';
import { get } from '../../utils/request';

const route = useRoute();
const router = useRouter();

const newAlbumTypes = [
    { label: '推荐', value: '' },
    { label: '华语', value: '1' },
    { label: '欧美', value: '2' },
    { label: '日本', value: '3' },
    { label: '韩国', value: '4' }
];

const albumTypeMap = {
    1: 'chn',
    2: 'eur',
    3: 'jpn',
    4: 'kor'
};

const selectedAlbumType = ref('');
const albumList = ref([]);
const isLoading = ref(true);

const cardItems = computed(() => {
    return albumList.value.map(album => ({
        key: `album-${album.albumid}`,
        to: {
            path: '/PlaylistDetail',
            query: { albumid: album.albumid }
        },
        cover: album.imgurl,
        title: album.albumname,
        description: [album.singername, album.publishtime?.split(' ')[0], album.songcount ? `${album.songcount}首` : '']
            .filter(Boolean)
            .join(' · ')
    }));
});

const normalizeAlbumType = (type) => {
    const normalizedType = type == null ? '' : String(type);
    return newAlbumTypes.some(option => option.value === normalizedType) ? normalizedType : '';
};

const getAlbumListFromResponse = (data, type) => {
    if (!type) {
        return ['chn', 'eur', 'jpn', 'kor'].flatMap(key => Array.isArray(data?.[key]) ? data[key] : []);
    }

    return data?.[albumTypeMap[type]] || [];
};

const fetchNewAlbums = async () => {
    isLoading.value = true;
    albumList.value = [];

    try {
        const response = await get('/top/album');
        if (response.status === 1) {
            albumList.value = getAlbumListFromResponse(response.data, selectedAlbumType.value);
        }
    } catch (error) {
        console.error('获取新碟上架失败:', error);
    } finally {
        isLoading.value = false;
    }
};

const selectAlbumType = (type) => {
    const nextType = type == null ? '' : String(type);
    if (selectedAlbumType.value === nextType) return;

    const nextQuery = { ...route.query };
    if (nextType) {
        nextQuery.albumType = nextType;
    } else {
        delete nextQuery.albumType;
    }

    router.replace({
        path: '/discover',
        query: nextQuery
    });
};

watch(() => route.query.albumType, async (albumType) => {
    selectedAlbumType.value = normalizeAlbumType(albumType);
    await fetchNewAlbums();
}, { immediate: true });
</script>

<style lang="scss" scoped>
.discover-new-album-content {
    --discover-category-bg: rgba(255, 255, 255, 0.72);
    --discover-category-border: #eceff5;
    --discover-category-shadow: 0 10px 28px rgba(31, 41, 55, 0.06);
    --discover-sub-bg: #f7f8fb;
    --discover-sub-text: #555f6f;
    --discover-sub-border: #edf0f5;
    --discover-card-bg: #fff;
    --discover-card-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    --discover-title-text: var(--text-color);
    --discover-meta-text: #666;

    &:is(.dark .discover-new-album-content) {
        --discover-category-bg: rgba(29, 29, 29, 0.74);
        --discover-category-border: rgba(255, 255, 255, 0.08);
        --discover-category-shadow: 0 14px 30px rgba(0, 0, 0, 0.22);
        --discover-sub-bg: #2a2a2a;
        --discover-sub-text: rgba(255, 255, 255, 0.82);
        --discover-sub-border: rgba(255, 255, 255, 0.08);
        --discover-card-bg: #1d1d1d;
        --discover-card-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
        --discover-title-text: rgba(255, 255, 255, 0.86);
        --discover-meta-text: rgba(255, 255, 255, 0.62);
    }
}

.category-container {
    margin-bottom: 24px;
    padding: 12px;
    background: var(--discover-category-bg);
    border: 1px solid var(--discover-category-border);
    border-radius: 8px;
    box-shadow: var(--discover-category-shadow);
}

.sub-categories {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    button {
        height: 32px;
        padding: 0 13px;
        background-color: var(--discover-sub-bg) !important;
        color: var(--discover-sub-text) !important;
        border: 1px solid var(--discover-sub-border) !important;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

        &:hover {
            color: var(--primary-color) !important;
            transform: translateY(-1px);
        }

        &.active {
            color: var(--primary-color) !important;
            background-color: rgba(var(--primary-color-rgb), 0.1) !important;
            border-color: rgba(var(--primary-color-rgb), 0.32) !important;
        }
    }
}

.album-categories {
    margin-bottom: 0;
}

.music-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(156px, 1fr));
    gap: 18px;
}

.music-card {
    background-color: var(--discover-card-bg);
    border-radius: 8px;
    box-shadow: var(--discover-card-shadow);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    padding: 10px;
    text-align: center;
    min-width: 0;

    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px var(--color-box-shadow);
    }

    a {
        display: block;
        color: inherit;
        text-decoration: none;
    }

    img {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: 6px;
    }
}

.music-info {
    h3 {
        font-size: 16px;
        margin: 10px 0 5px;
        color: var(--discover-title-text);
    }

    p {
        font-size: 12px;
        color: var(--discover-meta-text);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        max-height: 50px;
        line-height: 25px;
    }
}

@media (max-width: 768px) {
    .category-container {
        padding: 10px;
        margin-bottom: 18px;
    }

    .music-grid {
        grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
        gap: 12px;
    }

    .music-card {
        padding: 8px;
    }

    .music-info {
        h3 {
            font-size: 14px;
        }

        p {
            line-height: 20px;
            max-height: 40px;
        }
    }
}
</style>

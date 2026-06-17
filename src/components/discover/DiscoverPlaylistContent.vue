<template>
    <div class="discover-playlist-content">
        <div class="category-container">
            <div class="main-categories" ref="mainCategoryRef" :style="mainCategoryIndicatorStyle">
                <button v-for="(category, index) in categories" :key="index" class="main-category-button"
                    @click="selectMainCategory(index)"
                    :class="{ active: selectedMainCategory === index }">
                    {{ category.tag_name }}
                </button>
            </div>

            <div class="sub-categories">
                <button v-for="(tab, index) in currentSubCategories" :key="index" class="sub-category-button"
                    @click="selectSubCategory(index)"
                    :class="{ active: selectedSubCategory === index }">
                    {{ tab.tag_name }}
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CommonSkeleton from '../CommonSkeleton.vue';
import { get } from '../../utils/request';

const route = useRoute();
const router = useRouter();

const categories = ref([]);
const selectedMainCategory = ref(0);
const selectedSubCategory = ref(0);
const tagId = ref(0);
const playlistList = ref([]);
const isLoading = ref(true);
const mainCategoryRef = ref(null);
const mainCategoryIndicatorStyle = ref({
    '--main-indicator-x': '4px',
    '--main-indicator-width': '0px'
});

const currentSubCategories = computed(() => {
    return categories.value[selectedMainCategory.value]?.son || [];
});

const cardItems = computed(() => {
    return playlistList.value.map(playlist => ({
        key: `playlist-${playlist.global_collection_id}`,
        to: {
            path: '/PlaylistDetail',
            query: { global_collection_id: playlist.global_collection_id }
        },
        cover: playlist.flexible_cover,
        title: playlist.specialname,
        description: playlist.intro
    }));
});

const normalizeIndex = (value, max) => {
    const index = parseInt(value, 10);
    if (Number.isNaN(index) || index < 0 || index >= max) return 0;
    return index;
};

const fetchPlaylistTags = async () => {
    const response = await get('/playlist/tags');
    if (response.status !== 1) return;

    categories.value = response.data;
};

const fetchPlaylistList = async () => {
    const response = await get(`/top/playlist?withsong=0&category_id=${tagId.value}`);
    if (response.status === 1) {
        playlistList.value = response.data.special_list;
    }
};

const syncSelectionFromRoute = () => {
    if (categories.value.length === 0) return;

    const mainIndex = normalizeIndex(route.query.main, categories.value.length);
    const subList = categories.value[mainIndex]?.son || [];
    const subIndex = normalizeIndex(route.query.sub, subList.length);
    const nextTagId = subList[subIndex]?.tag_id || categories.value[0]?.son?.[0]?.tag_id || 0;

    selectedMainCategory.value = mainIndex;
    selectedSubCategory.value = subIndex;
    tagId.value = nextTagId;
};

const ensurePlaylistData = async () => {
    isLoading.value = true;
    playlistList.value = [];

    if (categories.value.length === 0) {
        await fetchPlaylistTags();
    }

    syncSelectionFromRoute();
    await fetchPlaylistList();
    isLoading.value = false;
};

const updatePlaylistQuery = (main, sub, nextTagId) => {
    router.replace({
        path: '/discover',
        query: {
            ...route.query,
            main,
            sub,
            tag: nextTagId
        }
    });
};

const selectMainCategory = (index) => {
    const subList = categories.value[index]?.son || [];
    if (subList.length === 0) return;

    updatePlaylistQuery(index, 0, subList[0].tag_id);
};

const selectSubCategory = (index) => {
    const nextTagId = currentSubCategories.value[index]?.tag_id;
    if (!nextTagId) return;

    updatePlaylistQuery(selectedMainCategory.value, index, nextTagId);
};

const updateMainCategoryIndicator = async () => {
    await nextTick();

    const activeButton = mainCategoryRef.value?.querySelector('.main-category-button.active');
    if (!activeButton) return;

    mainCategoryIndicatorStyle.value = {
        '--main-indicator-x': `${activeButton.offsetLeft}px`,
        '--main-indicator-width': `${activeButton.offsetWidth}px`
    };
};

watch(() => [route.query.main, route.query.sub], async () => {
    await ensurePlaylistData();
}, { immediate: true });

watch([selectedMainCategory, () => categories.value.length], updateMainCategoryIndicator, { flush: 'post' });

onMounted(() => {
    updateMainCategoryIndicator();
    window.addEventListener('resize', updateMainCategoryIndicator);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', updateMainCategoryIndicator);
});
</script>

<style lang="scss" scoped>
.discover-playlist-content {
    --discover-category-bg: rgba(255, 255, 255, 0.72);
    --discover-category-border: #eceff5;
    --discover-category-shadow: 0 10px 28px rgba(31, 41, 55, 0.06);
    --discover-main-bg: #f3f5f8;
    --discover-main-text: #6b7280;
    --discover-sub-bg: #f7f8fb;
    --discover-sub-text: #555f6f;
    --discover-sub-border: #edf0f5;
    --discover-card-bg: #fff;
    --discover-card-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    --discover-title-text: var(--text-color);
    --discover-meta-text: #666;

    &:is(.dark .discover-playlist-content) {
        --discover-category-bg: rgba(29, 29, 29, 0.74);
        --discover-category-border: rgba(255, 255, 255, 0.08);
        --discover-category-shadow: 0 14px 30px rgba(0, 0, 0, 0.22);
        --discover-main-bg: #25272e;
        --discover-main-text: rgba(255, 255, 255, 0.6);
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
    display: grid;
    gap: 14px;
    margin-bottom: 24px;
    padding: 12px;
    background: var(--discover-category-bg);
    border: 1px solid var(--discover-category-border);
    border-radius: 8px;
    box-shadow: var(--discover-category-shadow);
}

.main-categories {
    position: relative;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
    padding: 4px;
    overflow: hidden;
    background: var(--discover-main-bg);
    border-radius: 8px;

    &::before {
        content: "";
        position: absolute;
        top: 4px;
        bottom: 4px;
        left: 0;
        z-index: 0;
        width: var(--main-indicator-width);
        background: var(--primary-color);
        border-radius: 6px;
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
        transform: translateX(var(--main-indicator-x));
        transition: width 0.26s cubic-bezier(0.22, 1, 0.36, 1), transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
    }
}

.sub-categories {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.main-category-button,
.sub-category-button {
    border: none !important;
    cursor: pointer;
    transition: color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.main-category-button {
    position: relative;
    z-index: 1;
    min-width: 0;
    height: 34px;
    padding: 0 12px;
    background: transparent !important;
    color: var(--discover-main-text) !important;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;

    &:hover {
        color: var(--primary-color) !important;
    }

    &.active {
        color: #fff !important;
    }
}

.sub-category-button {
    height: 32px;
    padding: 0 13px;
    background-color: var(--discover-sub-bg) !important;
    color: var(--discover-sub-text) !important;
    border: 1px solid var(--discover-sub-border) !important;
    border-radius: 8px;
    font-size: 13px;

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
        gap: 12px;
        padding: 10px;
        margin-bottom: 18px;
    }

    .main-categories {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    .main-category-button {
        flex: 0 0 auto;
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

<template>
    <div class="discover-page">
        <h2 class="section-title">{{ $t('fa-xian') }}</h2>

        <div class="category-container">
            <div class="main-categories">
                <button v-for="(category, index) in categories" :key="index" @click="selectMainCategory(index)"
                    :class="{ active: selectedMainCategory === index }">
                    {{ category.tag_name }}
                </button>
            </div>

            <div class="sub-categories">
                <button v-for="(tab, index) in currentSubCategories" :key="index" @click="selectSubCategory(index)"
                    :class="{ active: selectedSubCategory === index }" :tag_id="tab.tag_id">
                    {{ tab.tag_name }}
                </button>
            </div>
        </div>

        <div v-if="isLoading" class="skeleton-grid">
            <div class="skeleton-card" v-for="n in 10" :key="n">
                <div class="skeleton-image"></div>
                <div class="skeleton-info">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-text"></div>
                </div>
            </div>
        </div>

        <div v-else class="music-grid">
            <div class="music-card" v-for="(playlist, index) in playlistList" :key="index">
                <router-link :to="{
                    path: '/PlaylistDetail',
                    query: { global_collection_id: playlist.global_collection_id }
                }">
                    <img :src="$getCover(playlist.flexible_cover, 240)" class="music-image" />
                    <div class="music-info">
                        <h3>{{ playlist.specialname }}</h3>
                        <p>{{ playlist.intro }}</p>
                    </div>
                </router-link>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { get } from '../utils/request';
import { useRouter } from 'vue-router';
const router = useRouter();
const categories = ref([]);
const selectedMainCategory = ref(0);
const selectedSubCategory = ref(0);
const tag_id = ref(0);
const playlistList = ref([]);
const isLoading = ref(true);
const currentSubCategories = computed(() => {
    if (categories.value.length === 0) return [];
    return categories.value[selectedMainCategory.value]?.son || [];
});

onMounted(() => {
    tags();
});

const tags = async () => {
    const response = await get('/playlist/tags');
    if (response.status == 1) {
        categories.value = response.data;
        if (categories.value.length > 0) {
            const query = router.currentRoute.value.query;
            if (query.main && query.sub) {
                selectedMainCategory.value = parseInt(query.main);
                selectedSubCategory.value = parseInt(query.sub);
                if (categories.value[selectedMainCategory.value]?.son?.[selectedSubCategory.value]) {
                    tag_id.value = categories.value[selectedMainCategory.value].son[selectedSubCategory.value].tag_id;
                }
            } else {
                tag_id.value = categories.value[0].son[0].tag_id;
            }
            playlist();
        }
    }
}

const selectMainCategory = (index) => {
    playlistList.value = [];
    isLoading.value = true;
    selectedMainCategory.value = index;
    selectedSubCategory.value = 0;
    if (currentSubCategories.value.length > 0) {
        tag_id.value = currentSubCategories.value[0].tag_id;
        router.replace({
            path: '/discover',
            query: {
                main: index,
                sub: 0,
                tag: currentSubCategories.value[0].tag_id
            }
        });
        playlist();
    }
};

const selectSubCategory = (index) => {
    playlistList.value = [];
    isLoading.value = true;
    selectedSubCategory.value = index;
    tag_id.value = currentSubCategories.value[index].tag_id;
    router.replace({
        path: '/discover',
        query: {
            main: selectedMainCategory.value,
            sub: index,
            tag: currentSubCategories.value[index].tag_id
        }
    });
    playlist();
};

const playlist = async () => {
    const response = await get(`/top/playlist?withsong=0&category_id=${tag_id.value}`);
    if (response.status == 1) {
        playlistList.value = response.data.special_list
    }
    isLoading.value = false;
}
</script>

<style lang="scss" scoped>
.discover-page {
    padding: 20px;
}

.section-title {
    font-size: 28px;
    font-weight: bold;
    margin-bottom: 30px;
    color: var(--primary-color);
}

.category-container {
    margin-bottom: 30px;
}

.main-categories {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;

    button {
        background-color: var(--secondary-color);
        color: #fff;
        border: none;
        padding: 10px 20px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 15px;

        &.active {
            background-color: var(--primary-color);
        }
    }
}

.sub-categories {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 20px;

    button {
        background-color: #f5f5f5;
        border: none;
        padding: 8px 15px;
        border-radius: 15px;
        cursor: pointer;
        font-size: 14px;

        &.active {
            background-color: var(--secondary-color);
            color: #fff;
        }
    }
}

.music-grid {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
    justify-content: space-evenly;
}

.music-card {
    background-color: #fff;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    padding: 10px;
    text-align: center;
    width: 180px;

    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px var(--color-box-shadow);
    }

    img {
        width: 100%;
        border-radius: 8px;
    }
}

.music-info {
    h3 {
        font-size: 16px;
        margin: 10px 0 5px;
    }

    p {
        font-size: 12px;
        color: #666;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        max-height: 50px;
        line-height: 25px;
    }
}

.skeleton-grid {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
    justify-content: space-evenly;
}

.skeleton-card {
    background-color: #f0f0f0;
    border-radius: 10px;
    padding: 10px;
    width: 200px;
    text-align: center;
    height: 250px;
}

.skeleton-image {
    width: 100%;
    height: 200px;
    background-color: #e0e0e0;
    border-radius: 8px;
}

.skeleton-info {
    margin-top: 10px;
}

.skeleton-title {
    width: 60%;
    height: 16px;
    background-color: #e0e0e0;
    margin: 10px auto;
    border-radius: 4px;
}

.skeleton-text {
    width: 80%;
    height: 12px;
    background-color: #e0e0e0;
    margin: 5px auto;
    border-radius: 4px;
}
</style>
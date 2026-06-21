<template>
    <div class="discover-page">
        <img class="discover-floating-arona" src="/assets/images/arona.png" alt="Arona" />

        <div class="discover-switch" :style="discoverSwitchStyle">
            <button v-for="tab in discoverTabs" :key="tab.key" class="switch-item"
                :class="{ active: activeDiscoverTab === tab.key }" @click="handleDiscoverTabClick(tab)">
                {{ tab.label }}
            </button>
        </div>

        <DiscoverPlaylistContent v-if="activeDiscoverTab === 'playlist'" />

        <RankingContent v-else-if="activeDiscoverTab === 'ranking'" :player-control="props.playerControl" />

        <DiscoverNewAlbumContent v-else-if="activeDiscoverTab === 'newAlbum'" />

        <DiscoverNewSongContent v-else-if="activeDiscoverTab === 'newSong'" :player-control="props.playerControl" />
    </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from 'vue-router';
import DiscoverNewAlbumContent from '../components/discover/DiscoverNewAlbumContent.vue';
import DiscoverNewSongContent from '../components/discover/DiscoverNewSongContent.vue';
import DiscoverPlaylistContent from '../components/discover/DiscoverPlaylistContent.vue';
import RankingContent from '../components/discover/RankingContent.vue';

const route = useRoute();
const router = useRouter();

const props = defineProps({
    playerControl: Object
});

const discoverTabs = [
    { key: 'playlist', label: '发现歌单' },
    { key: 'ranking', label: '音乐榜单' },
    { key: 'newAlbum', label: '新碟上架' },
    { key: 'newSong', label: '新歌速递' }
];

const normalizeDiscoverTab = (view) => {
    return discoverTabs.some(tab => tab.key === view) ? view : 'playlist';
};

const activeDiscoverTab = computed(() => {
    return normalizeDiscoverTab(route.query.view);
});

const activeDiscoverTabIndex = computed(() => {
    return discoverTabs.findIndex(tab => tab.key === activeDiscoverTab.value);
});

const discoverSwitchStyle = computed(() => {
    return {
        '--discover-slider-x': `${activeDiscoverTabIndex.value * 100}%`
    };
});

const handleDiscoverTabClick = (tab) => {
    const nextQuery = { ...route.query };

    if (tab.key === 'playlist') {
        delete nextQuery.view;
    } else {
        nextQuery.view = tab.key;
    }

    router.replace({
        path: '/discover',
        query: nextQuery
    });
};
</script>

<style lang="scss" scoped>
.discover-page {
    position: relative;
    padding: 40px 20px 20px;
    --discover-switch-bg: #f3f4f7;
    --discover-switch-border: #e8eaf0;
    --discover-switch-text: #8b8f9c;
    --discover-switch-active-bg: #fff;
    --discover-switch-active-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);

    &:is(.dark .discover-page) {
        --discover-switch-bg: #1d1f24;
        --discover-switch-border: rgba(255, 255, 255, 0.08);
        --discover-switch-text: rgba(255, 255, 255, 0.62);
        --discover-switch-active-bg: #2a2d35;
        --discover-switch-active-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
    }
}

.discover-floating-arona {
    position: absolute;
    top: -80px;
    left: 50%;
    z-index: 26;
    width: clamp(128px, 20vw, 200px);
    height: auto;
    transform: translateX(-50%);
    pointer-events: none;
    user-select: none;
}

.discover-switch {
    position: relative;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    padding: 5px;
    margin-bottom: 24px;
    background: var(--discover-switch-bg);
    border: 1px solid var(--discover-switch-border);
    border-radius: 14px;

    &::before {
        content: "";
        position: absolute;
        top: 5px;
        bottom: 5px;
        left: 5px;
        z-index: 0;
        width: calc((100% - 10px) / 4);
        background: var(--discover-switch-active-bg);
        border-radius: 10px;
        box-shadow: var(--discover-switch-active-shadow);
        transform: translateX(var(--discover-slider-x));
        transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.2s ease, box-shadow 0.2s ease;
    }
}

.switch-item {
    position: relative;
    z-index: 1;
    flex: 1;
    min-width: 0;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--discover-switch-text);
    font-size: 14px;
    font-weight: 600;
    line-height: 40px;
    cursor: pointer;
    transition: all 0.2s ease;

    &.active {
        color: var(--primary-color);
    }
}

@media (max-width: 768px) {
    .discover-switch {
        padding: 4px;

        &::before {
            top: 4px;
            bottom: 4px;
            left: 4px;
            width: calc((100% - 8px) / 4);
        }
    }

    .switch-item {
        font-size: 12px;
        line-height: 36px;
    }
}
</style>

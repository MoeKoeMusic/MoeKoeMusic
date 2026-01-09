<template>
    <div id="app">
        <TitleBar v-if="showTitleBar && !isLyricsRoute" />
        <RouterView />
        <Disclaimer v-if="!isLyricsRoute" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Disclaimer from '@/components/Disclaimer.vue';
import TitleBar from '@/components/TitleBar.vue';
import { MoeAuthStore } from '@/stores/store';

const route = useRoute();
const isLyricsRoute = computed(() => route.path === '/lyrics');

// 动态控制 TitleBar 的显示
const showTitleBar = ref(true);

onMounted(async () => {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    showTitleBar.value = settings.nativeTitleBar !== 'on'; // 如果值为 'on'，则不显示 TitleBar

    // Initialize device dfid for API authentication
    const MoeAuth = MoeAuthStore();
    await MoeAuth.initDfid();
});
</script>

<style scoped>
.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}
</style>
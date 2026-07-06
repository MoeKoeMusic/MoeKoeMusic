<template>
    <div class="recommended-search-page">
        <div class="ambient" aria-hidden="true">
            <span class="halo"></span>
            <span class="orb orb-a"></span>
            <span class="orb orb-b"></span>
            <span class="orb orb-c"></span>
            <i class="fas fa-music float-note note-a"></i>
            <i class="fas fa-headphones float-note note-b"></i>
            <i class="fas fa-compact-disc float-note note-c"></i>
        </div>

        <section class="hero">
            <h1 class="hero-title">今天想听<em>什么</em>？</h1>
            <p class="hero-subtitle">搜索歌曲、歌手、专辑与歌单，或者从热搜榜单里找点灵感</p>

            <div ref="searchAreaRef" class="query-area">
                <form class="query-pill" @submit.prevent="submitSearch(searchKeyword)">
                    <i class="fas fa-magnifying-glass query-icon"></i>
                    <input v-model.trim="searchKeyword" type="text" placeholder="搜索歌曲、歌手、专辑、歌单"
                        @focus="handleSearchFocus" autofocus @keydown.down.prevent="highlightNextSuggestion"
                        @keydown.up.prevent="highlightPrevSuggestion"
                        @keydown.enter.prevent="submitSearch(searchKeyword, true)" />
                    <button v-if="searchKeyword" type="button" class="query-clear" title="清空"
                        @mousedown.prevent="clearKeyword">
                        <i class="fas fa-xmark"></i>
                    </button>
                    <button class="query-submit" type="submit">
                        <span>搜索</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </form>

                <transition name="suggest-pop">
                    <div v-if="showSuggestions" class="suggest-panel">
                        <div v-if="isSuggestLoading" class="suggest-state">
                            <i class="fas fa-circle-notch fa-spin"></i>
                            正在获取搜索建议...
                        </div>
                        <template v-else>
                            <button v-for="(item, index) in suggestions" :key="`${item.keyword}-${index}`"
                                :class="['suggest-item', { active: index === activeSuggestionIndex }]"
                                @mouseenter="activeSuggestionIndex = index"
                                @mousedown.prevent="applySuggestion(item.keyword)">
                                <span class="suggest-ico"><i class="fas fa-magnifying-glass"></i></span>
                                <span class="suggest-word">{{ item.keyword }}</span>
                                <i class="fas fa-arrow-right suggest-go"></i>
                            </button>
                        </template>
                    </div>
                </transition>
            </div>

            <div v-if="hotKeywords.length" class="hot-chips">
                <span class="chips-label">
                    <i class="fas fa-fire"></i>
                    大家都在搜
                </span>
                <button v-for="(item, index) in hotKeywords" :key="`${item.keyword}-${index}`"
                    :class="['hot-chip', { blazing: index < 3 }]" @click="selectKeyword(item.keyword)">
                    <i v-if="index < 3" class="fas fa-fire"></i>
                    <span>{{ item.keyword }}</span>
                </button>
            </div>
        </section>

        <section class="trend-section">
            <div v-if="isLoading" class="trend-skeleton">
                <div class="sk-bar sk-title"></div>
                <div class="sk-tabs">
                    <span v-for="n in 4" :key="n" class="sk-bar sk-tab"></span>
                </div>
                <div class="sk-grid">
                    <span v-for="n in 10" :key="n" class="sk-bar sk-row"></span>
                </div>
            </div>

            <template v-else-if="boards.length">
                <div class="trend-head">
                    <h2>
                        <span class="trend-head-ico"><i class="fas fa-arrow-trend-up"></i></span>
                        热搜榜单
                    </h2>
                    <span class="live-pill">
                        <span class="live-dot"></span>
                        实时更新
                    </span>
                </div>

                <div class="trend-tabs">
                    <button v-for="(board, index) in boards" :key="`${board.name}-${index}`"
                        :class="['trend-tab', { active: index === activeBoardIndex }]"
                        @click="activeBoardIndex = index">
                        {{ board.name }}
                    </button>
                </div>

                <div :key="activeBoard?.name ?? 'trend'" class="trend-grid">
                    <button v-for="(item, index) in activeBoardKeywords" :key="`${item.keyword}-${index}`"
                        class="trend-item" :style="{ '--i': index }" @click="selectKeyword(item.keyword)">
                        <span :class="['trend-rank', medalClass(index)]">{{ index + 1 }}</span>
                        <span class="trend-copy">
                            <span class="trend-word">{{ item.keyword }}</span>
                            <span v-if="shouldShowReason(item)" class="trend-note">{{ item.reason }}</span>
                        </span>
                        <i v-if="index < 3" class="fas fa-fire trend-flame"></i>
                        <i class="fas fa-angles-right trend-go"></i>
                    </button>
                </div>
            </template>

            <div v-else class="trend-empty">
                <span class="empty-ico"><i class="fas fa-headphones"></i></span>
                <h3>暂无热搜数据</h3>
                <p>网络似乎开小差了，稍后再试试</p>
                <button class="retry-btn" @click="fetchHotBoards">
                    <i class="fas fa-arrow-rotate-right"></i>
                    重新加载
                </button>
            </div>
        </section>
    </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { get } from '../utils/request';
import { useActivatedWatch } from '../composables/useActivatedWatch';

const route = useRoute();
const router = useRouter();

const getRouteKeyword = (value) => typeof value === 'string' ? value : '';
const normalizeKeyword = (value) => String(value ?? '').trim();

const searchKeyword = ref(getRouteKeyword(route.query.q));
const boards = ref([]);
const isLoading = ref(false);
const activeBoardIndex = ref(0);
const suggestions = ref([]);
const isSuggestLoading = ref(false);
const showSuggestions = ref(false);
const activeSuggestionIndex = ref(-1);
const searchAreaRef = ref(null);
let suggestTimer = null;

const setSuggestions = (list = [], visible = list.length > 0) => {
    suggestions.value = list;
    activeSuggestionIndex.value = list.length ? 0 : -1;
    showSuggestions.value = visible;
};

const normalizeBoards = (list = []) => {
    if (!Array.isArray(list)) return [];

    return list
        .map((board) => ({
            name: board?.name || '热门榜单',
            keywords: Array.isArray(board?.keywords)
                ? board.keywords
                    .map((item) => ({
                        keyword: item?.keyword || '',
                        reason: item?.reason || '',
                        icon: Number(item?.icon) || 0,
                        jumpurl: item?.jumpurl || '',
                        json_url: item?.json_url || '',
                        type: item?.type ?? 0
                    }))
                    .filter((item) => item.keyword)
                : []
        }))
        .filter((board) => board.keywords.length);
};

const hotBoard = computed(() => {
    return boards.value.find((board) => board.name.includes('热搜')) || boards.value[0] || null;
});

const hotKeywords = computed(() => {
    return hotBoard.value?.keywords?.slice(0, 10) || [];
});

const activeBoard = computed(() => {
    return boards.value[activeBoardIndex.value] || null;
});

const normalizeSuggestions = (response) => {
    const records = response?.data?.[0]?.RecordDatas;
    if (!Array.isArray(records)) return [];

    const seen = new Set();
    return records
        .map((item) => {
            const keyword = normalizeKeyword(item?.HintInfo);
            return {
                keyword,
                reason: keyword,
                subtitle: item?.subtitle || '',
                hot: Number(item?.Hot) || 0,
                icon: Number(item?.icon) || 0
            };
        })
        .filter((item) => {
            if (!item.keyword || seen.has(item.keyword)) return false;
            seen.add(item.keyword);
            return true;
        });
};

const fetchHotBoards = async () => {
    isLoading.value = true;

    try {
        const response = await get('/search/hot');

        if (response?.status !== 1) {
            throw new Error('热门搜索数据加载失败');
        }

        boards.value = normalizeBoards(response?.data?.list);
    } catch (error) {
        boards.value = [];
    } finally {
        isLoading.value = false;
    }
};

const fetchSuggestions = async (keyword) => {
    const normalizedKeyword = normalizeKeyword(keyword);
    if (!normalizedKeyword) {
        setSuggestions([], false);
        return;
    }

    isSuggestLoading.value = true;
    showSuggestions.value = true;

    try {
        const response = await get('/search/suggest', {
            keywords: normalizedKeyword,
            musicTipCount: 6,
            albumTipCount: 0,
            mvTipCount: 0,
            correctTipCount: 0
        });

        if (response?.status !== 1) {
            setSuggestions([], false);
            return;
        }

        setSuggestions(normalizeSuggestions(response));
    } catch (error) {
        setSuggestions([], false);
        console.error('加载搜索建议失败', error);
    } finally {
        isSuggestLoading.value = false;
    }
};

const getBoardKeywords = (board, limit = null) => {
    if (!board?.keywords) return [];
    return typeof limit === 'number' ? board.keywords.slice(0, limit) : board.keywords;
};

const activeBoardKeywords = computed(() => getBoardKeywords(activeBoard.value, 10));

const medalClass = (index) => ['gold', 'silver', 'bronze'][index] || '';

const shouldShowReason = (item) => {
    const reason = normalizeKeyword(item?.reason);
    return !!reason && reason !== normalizeKeyword(item?.keyword);
};

const submitSearch = (keyword = searchKeyword.value, preferSuggestion = false) => {
    const selectedKeyword = preferSuggestion
        ? suggestions.value[activeSuggestionIndex.value]?.keyword
        : '';
    const normalizedKeyword = normalizeKeyword(selectedKeyword || keyword || searchKeyword.value);
    if (!normalizedKeyword) return;
    showSuggestions.value = false;

    if (normalizedKeyword.includes('collection_')) {
        router.push({
            path: '/PlaylistDetail',
            query: { global_collection_id: normalizedKeyword }
        });
        return;
    }

    router.push({
        path: '/search',
        query: { q: normalizedKeyword }
    });
};

const selectKeyword = (keyword) => {
    searchKeyword.value = keyword;
    submitSearch(keyword);
};

const applySuggestion = (keyword) => selectKeyword(keyword);

const clearKeyword = () => {
    searchKeyword.value = '';
    setSuggestions([], false);
    focusSearchInput();
};

const handleSearchFocus = () => {
    if (suggestions.value.length) {
        showSuggestions.value = true;
    }
};

const highlightNextSuggestion = () => {
    if (!suggestions.value.length) return;
    showSuggestions.value = true;
    activeSuggestionIndex.value = activeSuggestionIndex.value >= suggestions.value.length - 1
        ? 0
        : activeSuggestionIndex.value + 1;
};

const highlightPrevSuggestion = () => {
    if (!suggestions.value.length) return;
    showSuggestions.value = true;
    activeSuggestionIndex.value = activeSuggestionIndex.value <= 0
        ? suggestions.value.length - 1
        : activeSuggestionIndex.value - 1;
};

const handleClickOutside = (event) => {
    if (!searchAreaRef.value?.contains(event.target)) {
        showSuggestions.value = false;
    }
};

const focusSearchInput = () => {
    nextTick(() => {
        searchAreaRef.value?.querySelector('input')?.focus();
    });
};

useActivatedWatch(() => route.query.q, (value) => {
    searchKeyword.value = getRouteKeyword(value);
});

watch(searchKeyword, (value) => {
    clearTimeout(suggestTimer);

    const normalizedKeyword = normalizeKeyword(value);
    if (!normalizedKeyword) {
        setSuggestions([], false);
        return;
    }

    suggestTimer = setTimeout(() => {
        fetchSuggestions(normalizedKeyword);
    }, 220);
});

watch(boards, (value) => {
    if (!value.length || activeBoardIndex.value >= value.length) {
        activeBoardIndex.value = 0;
    }
}, { immediate: true });

onMounted(() => {
    fetchHotBoards();
    focusSearchInput();
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    clearTimeout(suggestTimer);
    document.removeEventListener('click', handleClickOutside);
});
</script>

<style lang="scss" scoped>
.recommended-search-page {
    --rsp-violet: #8b5cf6;
    --rsp-amber: #ff9f43;
    --rsp-panel: rgba(255, 255, 255, 0.8);
    --rsp-panel-solid: #fff;
    --rsp-border: rgba(31, 24, 40, 0.08);
    --rsp-border-strong: rgba(var(--primary-color-rgb), 0.4);
    --rsp-text: var(--text-color);
    --rsp-muted: rgba(51, 51, 51, 0.58);
    --rsp-faint: rgba(51, 51, 51, 0.36);
    --rsp-glow: rgba(var(--primary-color-rgb), 0.24);
    --rsp-shadow-soft: 0 6px 16px rgba(63, 32, 72, 0.05);
    --rsp-shadow-hover: 0 14px 30px rgba(var(--primary-color-rgb), 0.14);
    position: relative;
    min-height: calc(100vh - 240px);
    padding: 42px 24px 64px;
    color: var(--rsp-text);

    .dark & {
        --rsp-panel: rgba(30, 30, 36, 0.76);
        --rsp-panel-solid: #212127;
        --rsp-border: rgba(255, 255, 255, 0.08);
        --rsp-border-strong: rgba(var(--primary-color-rgb), 0.5);
        --rsp-text: rgba(255, 255, 255, 0.92);
        --rsp-muted: rgba(255, 255, 255, 0.58);
        --rsp-faint: rgba(255, 255, 255, 0.34);
        --rsp-shadow-soft: 0 6px 16px rgba(0, 0, 0, 0.22);
        --rsp-shadow-hover: 0 14px 30px rgba(0, 0, 0, 0.36);
    }
}

/* ---------- 背景氛围 ---------- */
.ambient {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
}

.halo {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: min(940px, 100%);
    height: 520px;
    background: radial-gradient(closest-side, rgba(var(--primary-color-rgb), 0.14), transparent);

    .dark & {
        background: radial-gradient(closest-side, rgba(var(--primary-color-rgb), 0.13), transparent);
    }
}

.orb {
    position: absolute;
    border-radius: 50%;
    opacity: 0.55;
    animation: orb-drift 18s ease-in-out infinite alternate;

    .dark & {
        opacity: 0.3;
    }
}

.orb-a {
    top: 30px;
    left: 3%;
    width: min(440px, 56vw);
    height: min(440px, 56vw);
    background: radial-gradient(circle closest-side, rgba(var(--primary-color-rgb), 0.34), transparent);
}

.orb-b {
    top: 120px;
    right: 4%;
    width: min(380px, 52vw);
    height: min(380px, 52vw);
    background: radial-gradient(circle closest-side, rgba(139, 92, 246, 0.26), transparent);
    animation-delay: -6s;
}

.orb-c {
    top: 56%;
    left: 26%;
    width: min(360px, 48vw);
    height: min(360px, 48vw);
    background: radial-gradient(circle closest-side, rgba(56, 191, 210, 0.22), transparent);
    animation-delay: -12s;
}

@keyframes orb-drift {
    from {
        transform: translate3d(0, 0, 0) scale(1);
    }

    to {
        transform: translate3d(-28px, 22px, 0) scale(1.06);
    }
}

.float-note {
    position: absolute;
    color: rgba(var(--primary-color-rgb), 0.3);
    animation: note-bob 6s ease-in-out infinite;
}

.note-a {
    top: 18%;
    left: 11%;
    font-size: 20px;
    animation-delay: -1s;
}

.note-b {
    top: 30%;
    right: 13%;
    font-size: 24px;
    animation-delay: -3s;
}

.note-c {
    top: 60%;
    left: 7%;
    font-size: 18px;
    animation-delay: -5s;
}

@keyframes note-bob {

    0%,
    100% {
        transform: translateY(0) rotate(-8deg);
    }

    50% {
        transform: translateY(-14px) rotate(8deg);
    }
}

/* ---------- Hero ---------- */
.hero {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: min(820px, 100%);
    margin: 0 auto;
    text-align: center;
}

.hero-title {
    margin: 18px 0 0;
    font-size: clamp(32px, 5vw, 46px);
    font-weight: 900;
    line-height: 1.15;
    letter-spacing: 1px;
    color: var(--rsp-text);
    animation: rise-in 0.55s 0.06s ease both;

    em {
        font-style: normal;
        background: linear-gradient(120deg, var(--primary-color), var(--rsp-violet));
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
    }
}

.hero-subtitle {
    margin: 14px 0 0;
    color: var(--rsp-muted);
    font-size: 15px;
    line-height: 1.6;
    animation: rise-in 0.55s 0.12s ease both;
}

/* ---------- 搜索 ---------- */
.query-area {
    position: relative;
    z-index: 20;
    width: min(680px, 100%);
    margin-top: 30px;
    animation: rise-in 0.55s 0.18s ease both;
}

.query-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    box-sizing: border-box;
    height: 62px;
    padding: 7px 7px 7px 24px;
    border: 1.5px solid var(--rsp-border);
    border-radius: 999px;
    background: var(--rsp-panel-solid);
    box-shadow: 0 18px 44px rgba(63, 32, 72, 0.12);
    transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;

    .dark & {
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.4);
    }

    &:focus-within {
        border-color: var(--rsp-border-strong);
        box-shadow: 0 18px 44px var(--rsp-glow), 0 0 0 5px rgba(var(--primary-color-rgb), 0.12);
        transform: translateY(-1px);
    }

    .query-icon {
        flex: 0 0 auto;
        color: var(--primary-color);
        font-size: 17px;
    }

    input {
        flex: 1;
        min-width: 0;
        height: 100%;
        border: none !important;
        outline: none;
        background: transparent !important;
        color: var(--rsp-text) !important;
        font-size: 16px;

        &::placeholder {
            color: var(--rsp-faint);
        }
    }
}

.query-clear {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--rsp-faint);
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover {
        background: rgba(var(--primary-color-rgb), 0.1);
        color: var(--primary-color);
    }
}

.query-submit {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 48px;
    padding: 0 26px;
    border: none;
    border-radius: 999px;
    background: linear-gradient(130deg, var(--primary-color) 20%, var(--rsp-violet) 120%);
    color: #fff;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 2px;
    cursor: pointer;
    box-shadow: 0 10px 24px var(--rsp-glow);
    transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease;

    i {
        font-size: 13px;
        transition: transform 0.22s ease;
    }

    &:hover {
        transform: translateY(-1px);
        filter: brightness(1.06);
        box-shadow: 0 14px 30px var(--rsp-glow);

        i {
            transform: translateX(3px);
        }
    }

    &:active {
        transform: translateY(0) scale(0.98);
    }
}

.suggest-panel {
    position: absolute;
    top: calc(100% + 12px);
    right: 10px;
    left: 10px;
    z-index: 40;
    max-height: 340px;
    overflow-y: auto;
    padding: 8px;
    border: 1px solid var(--rsp-border);
    border-radius: 22px;
    background: var(--rsp-panel-solid);
    box-shadow: 0 24px 56px rgba(63, 32, 72, 0.18);

    .dark & {
        box-shadow: 0 24px 56px rgba(0, 0, 0, 0.5);
    }
}

.suggest-pop-enter-active,
.suggest-pop-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
}

.suggest-pop-enter-from,
.suggest-pop-leave-to {
    opacity: 0;
    transform: translateY(-8px) scale(0.99);
}

.suggest-state {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 12px;
    color: var(--rsp-muted);
    font-size: 13px;

    i {
        color: var(--primary-color);
    }
}

.suggest-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 46px;
    padding: 8px 14px;
    border: none;
    border-radius: 14px;
    background: transparent;
    color: var(--rsp-text);
    text-align: left;
    cursor: pointer;
    transition: background-color 0.16s ease;
}

.suggest-ico {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 10px;
    background: rgba(var(--primary-color-rgb), 0.1);
    color: var(--primary-color);
    font-size: 12px;
    transition: background-color 0.16s ease, color 0.16s ease;
}

.suggest-word {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: 14px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.suggest-go {
    flex: 0 0 auto;
    color: var(--primary-color);
    font-size: 12px;
    opacity: 0;
    transform: translateX(-4px);
    transition: opacity 0.16s ease, transform 0.16s ease;
}

.suggest-item.active {
    background: rgba(var(--primary-color-rgb), 0.1);

    .suggest-ico {
        background: var(--primary-color);
        color: #fff;
    }

    .suggest-go {
        opacity: 1;
        transform: translateX(0);
    }
}

/* ---------- 热搜词 ---------- */
.hot-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 26px;
    animation: rise-in 0.55s 0.26s ease both;
}

.chips-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-right: 2px;
    color: var(--rsp-muted);
    font-size: 13px;
    font-weight: 700;

    i {
        color: var(--rsp-amber);
    }
}

.hot-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 190px;
    padding: 8px 16px;
    border: 1px solid var(--rsp-border);
    border-radius: 999px;
    background: var(--rsp-panel);
    backdrop-filter: blur(8px);
    color: var(--rsp-text);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;

    span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    i {
        flex: 0 0 auto;
        color: var(--rsp-amber);
        font-size: 12px;
    }

    &:hover {
        transform: translateY(-2px);
        border-color: var(--rsp-border-strong);
        color: var(--primary-color);
        box-shadow: 0 10px 22px rgba(var(--primary-color-rgb), 0.16);
    }

    &.blazing {
        border-color: rgba(255, 159, 67, 0.4);
        background: linear-gradient(135deg, rgba(255, 159, 67, 0.12), rgba(var(--primary-color-rgb), 0.12));

        &:hover {
            border-color: var(--rsp-amber);
            color: #e8590c;
            box-shadow: 0 10px 22px rgba(255, 159, 67, 0.24);

            .dark & {
                color: #ffb066;
            }
        }
    }
}

/* ---------- 热搜榜单 ---------- */
.trend-section {
    position: relative;
    z-index: 1;
    width: min(880px, 100%);
    margin: 46px auto 0;
    animation: rise-in 0.55s 0.34s ease both;
}

.trend-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;

    h2 {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin: 0;
        color: var(--rsp-text);
        font-size: 22px;
        font-weight: 800;
    }
}

.trend-head-ico {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 11px;
    background: linear-gradient(135deg, var(--primary-color), var(--rsp-violet));
    color: #fff;
    font-size: 14px;
    box-shadow: 0 8px 18px var(--rsp-glow);
}

.live-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 12px;
    border: 1px solid var(--rsp-border);
    border-radius: 999px;
    background: var(--rsp-panel);
    color: var(--rsp-muted);
    font-size: 12px;
    font-weight: 700;
}

.live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #2ecc71;
    animation: live-pulse 2s ease-out infinite;
}

@keyframes live-pulse {
    0% {
        box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.5);
    }

    70% {
        box-shadow: 0 0 0 6px rgba(46, 204, 113, 0);
    }

    100% {
        box-shadow: 0 0 0 0 rgba(46, 204, 113, 0);
    }
}

.trend-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
}

.trend-tab {
    flex: 0 0 auto;
    padding: 9px 18px;
    border: 1px solid var(--rsp-border);
    border-radius: 999px;
    background: var(--rsp-panel);
    color: var(--rsp-muted);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;

    &:hover:not(.active) {
        transform: translateY(-1px);
        border-color: var(--rsp-border-strong);
        color: var(--primary-color);
    }

    &.active {
        border-color: transparent;
        background: linear-gradient(130deg, var(--primary-color) 20%, var(--rsp-violet) 120%);
        color: #fff;
        box-shadow: 0 10px 22px var(--rsp-glow);
    }
}

.trend-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(5, auto);
    grid-auto-flow: column;
    gap: 10px 14px;
}

.trend-item {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 62px;
    padding: 10px 16px 10px 12px;
    border: 1px solid var(--rsp-border);
    border-radius: 16px;
    background: var(--rsp-panel);
    backdrop-filter: blur(8px);
    text-align: left;
    cursor: pointer;
    box-shadow: var(--rsp-shadow-soft);
    transition: transform 0.22s ease, border-color 0.22s ease, background-color 0.22s ease, box-shadow 0.22s ease;
    animation: rise-in 0.4s ease both;
    animation-delay: calc(var(--i, 0) * 45ms);

    &:hover {
        transform: translateY(-2px);
        border-color: var(--rsp-border-strong);
        background: var(--rsp-panel-solid);
        box-shadow: var(--rsp-shadow-hover);

        .trend-word {
            color: var(--primary-color);
        }

        .trend-go {
            opacity: 1;
            transform: translateX(0);
        }
    }
}

.trend-rank {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 11px;
    background: rgba(var(--primary-color-rgb), 0.08);
    color: var(--rsp-muted);
    font-size: 14px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;

    &.gold {
        background: linear-gradient(135deg, #ffd76f, #ff9f43);
        color: #7a4a00;
        box-shadow: 0 6px 14px rgba(255, 159, 67, 0.35);
    }

    &.silver {
        background: linear-gradient(135deg, #f0f3f9, #bfc9da);
        color: #4a5568;
        box-shadow: 0 6px 14px rgba(148, 163, 184, 0.35);
    }

    &.bronze {
        background: linear-gradient(135deg, #f3c3a2, #d98850);
        color: #6b3c12;
        box-shadow: 0 6px 14px rgba(217, 136, 80, 0.35);
    }
}

.trend-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.trend-word {
    overflow: hidden;
    color: var(--rsp-text);
    font-size: 15px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.2s ease;
}

.trend-note {
    overflow: hidden;
    color: var(--rsp-muted);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.trend-flame {
    flex: 0 0 auto;
    color: var(--rsp-amber);
    font-size: 13px;
    animation: flame-flicker 1.6s ease-in-out infinite;
}

@keyframes flame-flicker {

    0%,
    100% {
        transform: scale(1);
        opacity: 1;
    }

    50% {
        transform: scale(1.18);
        opacity: 0.8;
    }
}

.trend-go {
    flex: 0 0 auto;
    color: var(--primary-color);
    font-size: 12px;
    opacity: 0;
    transform: translateX(-6px);
    transition: opacity 0.2s ease, transform 0.2s ease;
}

/* ---------- 骨架屏 ---------- */
.trend-skeleton {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.sk-bar {
    position: relative;
    overflow: hidden;
    border-radius: 12px;
    background: rgba(63, 32, 72, 0.06);

    .dark & {
        background: rgba(255, 255, 255, 0.06);
    }

    &::after {
        content: '';
        position: absolute;
        inset: 0;
        transform: translateX(-100%);
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
        animation: shimmer 1.4s ease infinite;
    }

    .dark &::after {
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
    }
}

@keyframes shimmer {
    to {
        transform: translateX(100%);
    }
}

.sk-title {
    width: 190px;
    height: 32px;
}

.sk-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .sk-tab {
        width: 96px;
        height: 38px;
        border-radius: 999px;
    }
}

.sk-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 14px;

    .sk-row {
        height: 62px;
        border-radius: 16px;
    }
}

/* ---------- 空状态 ---------- */
.trend-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 52px 20px;
    border: 1px dashed rgba(var(--primary-color-rgb), 0.3);
    border-radius: 22px;
    background: var(--rsp-panel);
    text-align: center;

    h3 {
        margin: 0;
        color: var(--rsp-text);
        font-size: 18px;
        font-weight: 800;
    }

    p {
        margin: 0;
        color: var(--rsp-muted);
        font-size: 13px;
    }
}

.empty-ico {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 68px;
    height: 68px;
    margin-bottom: 8px;
    border-radius: 50%;
    background: rgba(var(--primary-color-rgb), 0.1);
    color: var(--primary-color);
    font-size: 26px;
}

.retry-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
    padding: 10px 22px;
    border: none;
    border-radius: 999px;
    background: linear-gradient(130deg, var(--primary-color) 20%, var(--rsp-violet) 120%);
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 10px 22px var(--rsp-glow);
    transition: transform 0.2s ease, filter 0.2s ease;

    &:hover {
        transform: translateY(-1px);
        filter: brightness(1.06);
    }
}

/* ---------- 通用动画 ---------- */
@keyframes rise-in {
    from {
        opacity: 0;
        transform: translateY(14px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes spin-slow {
    to {
        transform: rotate(360deg);
    }
}

/* ---------- 响应式 ---------- */
@media (max-width: 860px) {
    .trend-grid {
        grid-template-columns: 1fr;
        grid-template-rows: none;
        grid-auto-flow: row;
    }

    .sk-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 640px) {
    .recommended-search-page {
        padding: 28px 14px 48px;
    }

    .float-note {
        display: none;
    }

    .query-pill {
        height: 56px;
        padding-left: 18px;
    }

    .query-submit {
        height: 44px;
        padding: 0 16px;
        letter-spacing: 0;

        span {
            display: none;
        }

        i {
            font-size: 15px;
        }
    }

    .hot-chips {
        gap: 8px;

        .chips-label {
            width: 100%;
            justify-content: center;
            margin-right: 0;
        }
    }

    .hot-chip {
        max-width: 150px;
        padding: 7px 13px;
    }

    .trend-section {
        margin-top: 36px;
    }

    .trend-head h2 {
        font-size: 19px;
    }

    .trend-item {
        gap: 11px;
        min-height: 56px;
        padding: 9px 13px 9px 10px;
    }
}

@media (prefers-reduced-motion: reduce) {

    *,
    *::before,
    *::after {
        animation: none !important;
        transition: none !important;
    }
}
</style>

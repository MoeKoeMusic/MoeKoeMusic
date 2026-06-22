<template>
    <div class="recommended-search-page">
        <section class="search-hero">
            <div class="hero-copy">
                <span class="hero-kicker">推荐搜索</span>
                <h1>今天想听什么？</h1>
                <div class="hero-stats">
                    <span><strong>{{ isLoading ? '--' : boards.length }}</strong> 榜单</span>
                    <span><strong>{{ isLoading ? '--' : hotKeywords.length }}</strong> 热词</span>
                </div>
            </div>

            <div class="search-dock">
                <div ref="searchAreaRef" class="search-area">
                    <form class="search-box" @submit.prevent="submitSearch(searchKeyword)">
                        <i class="fas fa-search"></i>
                        <input v-model.trim="searchKeyword" type="text" placeholder="搜索歌曲、歌手、专辑、歌单"
                            @focus="handleSearchFocus" autofocus @keydown.down.prevent="highlightNextSuggestion"
                            @keydown.up.prevent="highlightPrevSuggestion"
                            @keydown.enter.prevent="submitSearch(searchKeyword, true)" />
                        <button class="search-submit" type="submit">
                            <span>搜索</span>
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </form>

                    <div v-if="showSuggestions" class="suggestion-dropdown">
                        <div v-if="isSuggestLoading" class="suggestion-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            正在获取搜索建议...
                        </div>
                        <button v-for="(item, index) in suggestions" v-else :key="`${item.keyword}-${index}`"
                            :class="index === activeSuggestionIndex ? 'suggestion-item active' : 'suggestion-item'"
                            @mouseenter="activeSuggestionIndex = index"
                            @mousedown.prevent="applySuggestion(item.keyword)">
                            <span class="suggestion-icon">
                                <i class="fas fa-search"></i>
                            </span>
                            <div class="suggestion-main">
                                <span class="suggestion-keyword">{{ item.keyword }}</span>
                                <span v-if="shouldShowReason(item)" class="suggestion-reason">{{ item.reason }}</span>
                            </div>
                            <i class="fas fa-arrow-right suggestion-arrow"></i>
                        </button>
                    </div>
                </div>

                <div v-if="hotKeywords.length" class="quick-tags">
                    <button v-for="item in hotKeywords" :key="item.keyword" class="quick-tag"
                        @click="selectKeyword(item.keyword)">
                        {{ item.keyword }}
                    </button>
                </div>
            </div>
        </section>

        <div v-if="isLoading" class="status-card">
            <i class="fas fa-spinner fa-spin"></i>
            <span>正在加载热门搜索榜单...</span>
        </div>

        <div v-else-if="fixedBoard" class="boards-layout">
            <article class="board-card fixed-board">
                <div class="board-header">
                    <div>
                        <span class="board-label">热度最高</span>
                        <h2>{{ fixedBoard.name }}</h2>
                    </div>
                    <span class="board-count">{{ fixedBoard.keywords.length }} 项</span>
                </div>

                <div class="rank-list feature-rank-list">
                    <button v-for="(item, index) in fixedBoardKeywords"
                        :key="`${fixedBoard.name}-${item.keyword}-${index}`" class="rank-item"
                        @click="selectKeyword(item.keyword)">
                        <span :class="index < 3 ? 'rank-index top' : 'rank-index'">{{ index + 1 }}</span>
                        <div class="rank-info">
                            <span class="rank-keyword">{{ item.keyword }}</span>
                            <span v-if="shouldShowReason(item)" class="rank-meta">{{ item.reason }}</span>
                        </div>
                        <span v-if="index < 3" class="rank-badge">HOT</span>
                        <i class="fas fa-angle-right rank-arrow"></i>
                    </button>
                </div>
            </article>

            <div class="switchable-board-panel">
                <div v-if="switchableBoards.length" class="side-board-switcher">
                    <button v-for="(board, boardIndex) in switchableBoards" :key="`${board.name}-${boardIndex}-tab`"
                        :class="boardIndex === activeSideBoardIndex ? 'switcher-button active' : 'switcher-button'"
                        @click="activeSideBoardIndex = boardIndex">
                        <span>{{ board.name }}</span>
                        <small>{{ board.keywords.length }}</small>
                    </button>
                </div>

                <article v-if="activeBoard" class="board-card compact-board">
                    <div class="board-header compact-header">
                        <div>
                            <span class="board-label">榜单切换</span>
                            <h2>{{ activeBoard.name }}</h2>
                        </div>
                        <span class="board-count">{{ activeBoard.keywords.length }} 项</span>
                    </div>

                    <div class="rank-list">
                        <button v-for="(item, index) in activeBoardKeywords"
                            :key="`${activeBoard.name}-${item.keyword}-${index}`" class="rank-item compact-rank-item"
                            @click="selectKeyword(item.keyword)">
                            <span :class="index < 3 ? 'rank-index top' : 'rank-index'">{{ index + 1 }}</span>
                            <div class="rank-info">
                                <span class="rank-keyword">{{ item.keyword }}</span>
                                <span v-if="shouldShowReason(item)" class="rank-meta">{{ item.reason }}</span>
                            </div>
                            <i class="fas fa-angle-right rank-arrow"></i>
                        </button>
                    </div>
                </article>

                <article v-else class="board-card compact-board empty-board">
                    <div class="empty-state">
                        <i class="fas fa-music"></i>
                        <div>
                            <h2>暂无可切换榜单</h2>
                            <span>稍后再来看看</span>
                        </div>
                    </div>
                </article>
            </div>
        </div>

        <div v-else class="status-card">
            <i class="fas fa-music"></i>
            <span>暂无可切换的榜单数据</span>
        </div>
    </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { get } from '../utils/request';

const route = useRoute();
const router = useRouter();

const getRouteKeyword = (value) => typeof value === 'string' ? value : '';
const normalizeKeyword = (value) => String(value ?? '').trim();

const searchKeyword = ref(getRouteKeyword(route.query.q));
const boards = ref([]);
const isLoading = ref(false);
const activeSideBoardIndex = ref(0);
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

const fixedBoard = computed(() => {
    return boards.value[0] || null;
});

const hotKeywords = computed(() => {
    return hotBoard.value?.keywords?.slice(0, 12) || [];
});

const switchableBoards = computed(() => {
    return boards.value.slice(1);
});

const activeBoard = computed(() => {
    return switchableBoards.value[activeSideBoardIndex.value] || null;
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

const fixedBoardKeywords = computed(() => getBoardKeywords(fixedBoard.value, 10));
const activeBoardKeywords = computed(() => getBoardKeywords(activeBoard.value, 10));

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

watch(() => route.query.q, (value) => {
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

watch(switchableBoards, (value) => {
    if (!value.length || activeSideBoardIndex.value >= value.length) {
        activeSideBoardIndex.value = 0;
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
    --page-panel: rgba(255, 255, 255, 0.88);
    --page-panel-strong: #fff;
    --page-border: rgba(24, 28, 37, 0.08);
    --page-border-strong: rgba(var(--primary-color-rgb), 0.28);
    --page-text: var(--text-color);
    --page-muted: rgba(51, 51, 51, 0.62);
    --page-subtle: rgba(51, 51, 51, 0.42);
    --page-shadow: 0 18px 45px rgba(29, 35, 53, 0.1);
    --page-shadow-strong: 0 22px 55px rgba(29, 35, 53, 0.14);
    --accent-cyan: #38bfd2;
    min-height: calc(100vh - 90px);
    padding: 34px 24px 48px;
    position: relative;
    overflow-x: hidden;
    color: var(--page-text);
    letter-spacing: 0;
    background: linear-gradient(180deg, #fbfcff 0%, #f7f8fb 46%, #f3f0f7 100%);

    .dark & {
        --page-panel: rgba(25, 25, 30, 0.84);
        --page-panel-strong: rgba(32, 32, 38, 0.96);
        --page-border: rgba(255, 255, 255, 0.08);
        --page-border-strong: rgba(var(--primary-color-rgb), 0.36);
        --page-text: rgba(255, 255, 255, 0.9);
        --page-muted: rgba(255, 255, 255, 0.62);
        --page-subtle: rgba(255, 255, 255, 0.38);
        --page-shadow: 0 18px 45px rgba(0, 0, 0, 0.24);
        --page-shadow-strong: 0 22px 55px rgba(0, 0, 0, 0.34);
        background: linear-gradient(180deg, #121214 0%, #18191d 56%, #121316 100%);
    }
}

.search-hero,
.status-card,
.boards-layout {
    position: relative;
    z-index: 1;
}

.search-hero {
    width: min(1120px, 100%);
    margin: 0 auto 22px;
    display: grid;
    grid-template-columns: minmax(240px, 0.72fr) minmax(0, 1.28fr);
    gap: 22px;
    align-items: end;
    z-index: 3;
}

.hero-copy {
    display: grid;
    gap: 14px;
    padding-bottom: 8px;

    h1 {
        margin: 0;
        color: var(--page-text);
        font-size: 38px;
        font-weight: 800;
        line-height: 1.12;
        letter-spacing: 0;
    }
}

.hero-kicker {
    width: fit-content;
    padding: 5px 10px;
    border-left: 3px solid var(--primary-color);
    border-radius: 4px;
    background: rgba(var(--primary-color-rgb), 0.08);
    color: var(--primary-color);
    font-size: 13px;
    font-weight: 800;
    line-height: 1.2;
}

.hero-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    span {
        display: inline-flex;
        align-items: baseline;
        gap: 5px;
        padding: 7px 10px;
        border: 1px solid var(--page-border);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.5);
        color: var(--page-muted);
        font-size: 13px;
        line-height: 1;

        .dark & {
            background: rgba(255, 255, 255, 0.04);
        }
    }

    strong {
        color: var(--page-text);
        font-size: 18px;
        font-variant-numeric: tabular-nums;
    }
}

.search-dock,
.board-card,
.status-card {
    border: 1px solid var(--page-border);
    border-radius: 8px;
    background: var(--page-panel);
    box-shadow: var(--page-shadow);
    backdrop-filter: blur(14px);
}

.search-dock {
    min-width: 0;
    padding: 16px;
    box-shadow: var(--page-shadow-strong);
}

.search-box {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 58px;
    padding: 6px 6px 6px 14px;
    border: 1px solid var(--page-border);
    border-radius: 8px;
    background: var(--page-panel-strong);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &:focus-within {
        border-color: var(--page-border-strong);
        box-shadow: 0 0 0 4px rgba(var(--primary-color-rgb), 0.1);
    }

    > i {
        color: var(--primary-color);
        font-size: 17px;
        text-align: center;
    }

    input {
        min-width: 0;
        height: 44px;
        border: none !important;
        background: transparent !important;
        color: var(--page-text);
        font-size: 16px;
        outline: none;

        &::placeholder {
            color: var(--page-subtle);
        }
    }
}

.search-submit {
    min-width: 104px;
    height: 46px;
    border: none !important;
    border-radius: 8px;
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: linear-gradient(135deg, var(--primary-color), var(--accent-cyan)) !important;
    color: #fff !important;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 12px 24px rgba(var(--primary-color-rgb), 0.24);
    transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;

    i {
        font-size: 12px;
    }

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 16px 28px rgba(var(--primary-color-rgb), 0.28);
    }

    &:active {
        transform: translateY(0);
        opacity: 0.9;
    }
}

.search-area {
    position: relative;
    width: 100%;
    z-index: 2;
}

.suggestion-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    right: 0;
    z-index: 30;
    max-height: 330px;
    overflow-y: auto;
    padding: 8px;
    border: 1px solid var(--page-border);
    border-radius: 8px;
    background: var(--page-panel-strong);
    box-shadow: var(--page-shadow-strong);
    backdrop-filter: blur(18px);
}

.suggestion-state {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 12px;
    color: var(--page-muted);
    font-size: 13px;
}

.suggestion-item {
    width: 100%;
    min-height: 48px;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid transparent !important;
    border-radius: 8px;
    background: transparent !important;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

    &:hover,
    &.active {
        transform: translateX(2px);
        background: rgba(var(--primary-color-rgb), 0.08) !important;
        border-color: var(--page-border-strong) !important;
    }
}

.suggestion-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--primary-color-rgb), 0.1);
    color: var(--primary-color);
    font-size: 12px;
}

.suggestion-main {
    min-width: 0;
    display: grid;
    gap: 3px;
}

.suggestion-keyword {
    overflow: hidden;
    color: var(--page-text);
    font-size: 14px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.suggestion-reason {
    overflow: hidden;
    color: var(--page-muted);
    font-size: 12px;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.suggestion-arrow {
    color: var(--page-subtle);
    font-size: 12px;
}

.quick-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
}

.quick-tag {
    max-width: 176px;
    overflow: hidden;
    border: 1px solid var(--page-border) !important;
    border-radius: 8px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.58) !important;
    color: var(--page-text) !important;
    font-size: 13px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    transition: transform 0.22s ease, background-color 0.22s ease, border-color 0.22s ease;

    .dark & {
        background: rgba(255, 255, 255, 0.05) !important;
    }

    &:hover {
        transform: translateY(-1px);
        background: rgba(var(--primary-color-rgb), 0.1) !important;
        border-color: var(--page-border-strong) !important;
        color: var(--primary-color) !important;
    }
}

.status-card {
    width: min(1120px, 100%);
    min-height: 220px;
    margin: 0 auto;
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--page-muted);
    font-weight: 700;

    i {
        color: var(--primary-color);
    }
}

.boards-layout {
    width: min(1120px, 100%);
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
    gap: 18px;
    align-items: start;
}

.switchable-board-panel {
    min-width: 0;
    display: grid;
    gap: 14px;
}

.side-board-switcher {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
}

.switcher-button {
    min-width: 0;
    min-height: 46px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border: 1px solid var(--page-border) !important;
    border-radius: 8px;
    padding: 10px;
    background: var(--page-panel) !important;
    color: var(--page-text) !important;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.35;
    text-align: left;
    cursor: pointer;
    transition: transform 0.22s ease, border-color 0.22s ease, background-color 0.22s ease, color 0.22s ease;

    span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    small {
        flex: 0 0 auto;
        color: var(--page-subtle);
        font-size: 12px;
        font-variant-numeric: tabular-nums;
    }

    &:hover {
        transform: translateY(-1px);
        background: rgba(var(--primary-color-rgb), 0.1) !important;
        border-color: var(--page-border-strong) !important;
    }

    &.active {
        background: rgba(var(--primary-color-rgb), 0.12) !important;
        color: var(--primary-color) !important;
        border-color: var(--page-border-strong) !important;

        small {
            color: var(--primary-color);
        }
    }
}

.board-card {
    min-width: 0;
    padding: 18px;
    overflow: hidden;
}

.fixed-board {
    background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(var(--primary-color-rgb), 0.06)),
        var(--page-panel);

    .dark & {
        background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(var(--primary-color-rgb), 0.12)),
            var(--page-panel);
    }
}

.compact-board {
    background: var(--page-panel);
}

.board-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;

    h2 {
        margin: 4px 0 0;
        color: var(--page-text);
        font-size: 22px;
        font-weight: 800;
        line-height: 1.18;
        letter-spacing: 0;
    }
}

.compact-header h2 {
    font-size: 18px;
}

.board-label {
    display: inline-flex;
    color: var(--page-muted);
    font-size: 12px;
    font-weight: 800;
    line-height: 1;
}

.board-count {
    flex: 0 0 auto;
    padding: 6px 8px;
    border: 1px solid var(--page-border);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.48);
    color: var(--page-muted);
    font-size: 12px;
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;

    .dark & {
        background: rgba(255, 255, 255, 0.05);
    }
}

.rank-list {
    display: grid;
    gap: 8px;
}

.feature-rank-list {
    gap: 9px;
}

.rank-item {
    width: 100%;
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 12px;
    min-height: 56px;
    padding: 10px 12px;
    border: 1px solid transparent !important;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.68) !important;
    text-align: left;
    cursor: pointer;
    transition: transform 0.22s ease, border-color 0.22s ease, background-color 0.22s ease, box-shadow 0.22s ease;

    .dark & {
        background: rgba(255, 255, 255, 0.05) !important;
    }

    &:hover {
        transform: translateY(-1px);
        border-color: var(--page-border-strong) !important;
        background: rgba(var(--primary-color-rgb), 0.08) !important;
        box-shadow: 0 12px 24px rgba(29, 35, 53, 0.08);

        .dark & {
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
        }
    }
}

.compact-rank-item {
    grid-template-columns: 34px minmax(0, 1fr) auto;
    min-height: 52px;
}

.rank-index {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--primary-color-rgb), 0.1);
    color: var(--primary-color);
    font-weight: 800;
    font-size: 13px;
    font-variant-numeric: tabular-nums;

    &.top {
        background: linear-gradient(135deg, var(--primary-color), var(--accent-cyan));
        color: #fff;
        box-shadow: 0 8px 18px rgba(var(--primary-color-rgb), 0.22);
    }
}

.rank-info {
    display: grid;
    gap: 3px;
    min-width: 0;
}

.rank-keyword {
    overflow: hidden;
    color: var(--page-text);
    font-size: 15px;
    font-weight: 700;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.rank-meta {
    overflow: hidden;
    color: var(--page-muted);
    font-size: 12px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}

.rank-badge {
    padding: 5px 7px;
    border: 1px solid rgba(240, 179, 66, 0.34);
    border-radius: 6px;
    background: rgba(240, 179, 66, 0.13);
    color: #9a6500;
    font-size: 11px;
    font-weight: 900;
    line-height: 1;

    .dark & {
        color: #ffd783;
    }
}

.rank-arrow {
    color: var(--page-subtle);
    font-size: 12px;
}

.empty-board {
    min-height: 240px;
    display: flex;
    align-items: center;
}

.empty-state {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--page-muted);

    i {
        width: 42px;
        height: 42px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(var(--primary-color-rgb), 0.1);
        color: var(--primary-color);
    }

    h2 {
        margin: 0 0 4px;
        color: var(--page-text);
        font-size: 18px;
        line-height: 1.2;
    }

    span {
        font-size: 13px;
    }
}

@media (max-width: 980px) {
    .search-hero,
    .boards-layout {
        grid-template-columns: 1fr;
    }

    .hero-copy {
        padding-bottom: 0;
    }
}

@media (max-width: 640px) {
    .recommended-search-page {
        padding: 22px 12px 34px;
    }

    .search-hero {
        gap: 14px;
        margin-bottom: 16px;
    }

    .hero-copy {
        gap: 12px;
    }

    .hero-copy h1 {
        font-size: 30px;
    }

    .search-dock,
    .board-card,
    .status-card {
        padding: 12px;
    }

    .status-card {
        min-height: 180px;
    }

    .search-box {
        grid-template-columns: 32px minmax(0, 1fr);
        gap: 8px;
        padding: 8px;
    }

    .search-submit {
        grid-column: 1 / -1;
        width: 100%;
    }

    .quick-tags {
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-bottom: 2px;
    }

    .quick-tag {
        flex: 0 0 auto;
        max-width: 150px;
    }

    .side-board-switcher {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .board-header {
        gap: 10px;
    }

    .rank-item {
        grid-template-columns: 34px minmax(0, 1fr) auto;
        gap: 10px;
        padding: 10px;
    }

    .rank-badge {
        display: none;
    }
}
</style>

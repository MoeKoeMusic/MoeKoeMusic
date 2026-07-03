<template>
    <div v-if="variant === 'song-list'" class="skeleton-song-list">
        <div v-for="index in count" :key="index" class="song-item">
            <div class="cover"></div>
            <div class="song-info">
                <div class="line"></div>
                <div class="line short"></div>
            </div>
            <div class="song-meta">
                <div class="line tiny"></div>
                <div class="line tiny"></div>
            </div>
        </div>
    </div>

    <div v-else-if="variant === 'search-grid'" :class="['skeleton-search-grid', { avatar }]">
        <div v-for="index in count" :key="index" class="search-grid-card">
            <div :class="['grid-cover', { avatar }]"></div>
            <div class="line"></div>
            <div v-if="!avatar" class="line short"></div>
        </div>
    </div>

    <div v-else-if="variant === 'compact-grid'" class="skeleton-compact-grid">
        <div v-for="index in count" :key="index" class="compact-item">
            <div class="compact-cover"></div>
            <div class="compact-info">
                <div class="line"></div>
                <div class="line short"></div>
            </div>
        </div>
    </div>

    <div v-else-if="variant === 'detail-header'" class="skeleton-detail-header">
        <div :class="['detail-cover', { avatar }]"></div>
        <div class="detail-content">
            <div class="detail-line title"></div>
            <div class="detail-line subtitle"></div>
            <div class="detail-line meta"></div>
            <div class="detail-line description"></div>
            <div class="detail-actions">
                <div class="detail-button primary"></div>
                <div class="detail-button secondary"></div>
                <div class="detail-icon"></div>
                <div class="detail-icon"></div>
            </div>
        </div>
    </div>

    <div v-else class="skeleton-card-grid">
        <div v-for="index in count" :key="index" class="card">
            <div class="card-cover"></div>
            <div class="card-info">
                <div class="card-title"></div>
                <div class="card-text"></div>
            </div>
        </div>
    </div>
</template>

<script setup>
defineProps({
    variant: {
        type: String,
        default: 'card-grid'
    },
    count: {
        type: Number,
        default: 10
    },
    avatar: {
        type: Boolean,
        default: false
    }
});
</script>

<style lang="scss" scoped>
@keyframes shimmer {
    0% {
        background-position: -468px 0;
    }

    100% {
        background-position: 468px 0;
    }
}

.line,
.cover,
.grid-cover,
.compact-cover,
.detail-cover,
.detail-line,
.detail-button,
.detail-icon,
.card-cover,
.card-title,
.card-text {
    background: linear-gradient(
        to right,
        var(--skeleton-shimmer-start) 8%,
        var(--skeleton-shimmer-middle) 18%,
        var(--skeleton-shimmer-end) 33%
    );
    background-size: 800px 104px;
    animation: shimmer 1.5s linear infinite forwards;
}

.skeleton-card-grid,
.skeleton-song-list,
.skeleton-search-grid,
.skeleton-detail-header,
.skeleton-compact-grid {
    --skeleton-surface: #f5f5f5;
    --skeleton-surface-strong: #f0f0f0;
    --skeleton-border: #f0f0f0;
    --skeleton-shimmer-start: #f0f0f0;
    --skeleton-shimmer-middle: #e0e0e0;
    --skeleton-shimmer-end: #f0f0f0;

    &:is(.dark .skeleton-card-grid),
    &:is(.dark .skeleton-song-list),
    &:is(.dark .skeleton-search-grid),
    &:is(.dark .skeleton-detail-header),
    &:is(.dark .skeleton-compact-grid) {
        --skeleton-surface: #1d1d1d;
        --skeleton-surface-strong: #242424;
        --skeleton-border: #333;
        --skeleton-shimmer-start: #2a2a2a;
        --skeleton-shimmer-middle: #353535;
        --skeleton-shimmer-end: #2a2a2a;
    }
}

.skeleton-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(156px, 1fr));
    gap: 18px;
}

.card {
    background-color: var(--skeleton-surface);
    border-radius: 8px;
    padding: 10px;
    text-align: center;
    min-width: 0;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.card-cover {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 6px;
}

.card-info {
    margin-top: 10px;
}

.card-title {
    width: 60%;
    height: 16px;
    margin: 10px auto;
    border-radius: 4px;
}

.card-text {
    width: 80%;
    height: 12px;
    margin: 5px auto;
    border-radius: 4px;
}

.skeleton-song-list {
    width: 100%;
}

.song-item {
    display: flex;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid var(--skeleton-border);
    border-radius: 5px;
    gap: 10px;
    min-width: 0;
    margin-bottom: 10px;
}

.cover {
    width: 50px;
    height: 50px;
    border-radius: 5px;
}

.song-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
}

.song-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 120px;
    align-items: flex-end;
}

.line {
    height: 16px;
    border-radius: 3px;
    width: 100%;
    margin-bottom: 7px;

    &.short {
        width: 60%;
    }

    &.tiny {
        width: 40%;
        height: 12px;
    }
}

.skeleton-search-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;

    &.avatar {
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 15px;
    }
}

.skeleton-compact-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
    margin-top: 20px;
    margin-bottom: 34px;
}

.skeleton-detail-header {
    display: flex;
    align-items: stretch;
    gap: 20px;
    width: 100%;
    min-height: 200px;
}

.detail-cover {
    flex: 0 0 auto;
    width: 200px;
    height: 200px;
    border-radius: 10px;

    &.avatar {
        border-radius: 50%;
    }
}

.detail-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
}

.detail-line {
    height: 16px;
    border-radius: 4px;

    &.title {
        width: min(520px, 72%);
        height: 42px;
        margin-bottom: 14px;
    }

    &.subtitle {
        width: 220px;
        margin-bottom: 10px;
    }

    &.meta {
        width: 38%;
        margin-bottom: 12px;
    }

    &.description {
        width: 88%;
        height: 44px;
        margin-bottom: 16px;
    }
}

.detail-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: auto;
}

.detail-button {
    height: 40px;
    border-radius: 5px;

    &.primary {
        width: 120px;
    }

    &.secondary {
        width: 96px;
    }
}

.detail-icon {
    width: 40px;
    height: 40px;
    border-radius: 5px;
}

.compact-item {
    display: flex;
    align-items: center;
    min-width: 0;
    min-height: 64px;
    padding: 7px 40px 7px 8px;
    border-radius: 8px;
    background-color: var(--skeleton-surface);
    box-shadow: 0 6px 18px rgba(31, 41, 55, 0.07);
}

.compact-cover {
    width: 50px;
    height: 50px;
    flex: 0 0 auto;
    margin-right: 10px;
    border-radius: 8px;
}

.compact-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 190px;
    flex: 1;
}

.search-grid-card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 15px;
    background-color: var(--skeleton-surface-strong);
    border-radius: 10px;
    min-width: 0;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.grid-cover {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 8px;
    margin: 0 0 12px;

    &.avatar {
        width: 150px;
        height: 150px;
        aspect-ratio: auto;
        border-radius: 50%;
        margin: 15px auto 12px;
    }
}

@media (max-width: 768px) {
    .skeleton-card-grid {
        grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
        gap: 12px;
    }

    .card {
        padding: 8px;
    }

    .skeleton-compact-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 28px;
    }

    .compact-item {
        min-height: 62px;
        padding: 7px 10px 7px 7px;
    }

    .compact-cover {
        width: 48px;
        height: 48px;
    }

    .skeleton-search-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));

        &.avatar {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    .skeleton-detail-header {
        gap: 14px;
    }

    .detail-cover {
        width: 160px;
        height: 160px;
    }

    .detail-line.title {
        width: 88%;
        height: 34px;
    }

    .detail-line.meta,
    .detail-line.description {
        width: 100%;
    }
}

@media (max-width: 576px) {
    .skeleton-compact-grid,
    .skeleton-search-grid.avatar {
        grid-template-columns: 1fr;
    }

    .skeleton-detail-header {
        flex-direction: column;
        min-height: 0;
    }

    .detail-cover {
        width: 136px;
        height: 136px;
    }

    .detail-content {
        width: 100%;
    }

    .detail-actions {
        flex-wrap: wrap;
    }
}
</style>

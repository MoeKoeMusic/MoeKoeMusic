<template>
    <div class="download-root">
        <!-- 收起状态下的悬浮提示 -->
        <transition name="download-fade">
            <button v-if="!store.panelOpen && store.activeCount > 0" type="button" class="download-pill"
                @click="store.openPanel()">
                <i class="fas fa-download"></i>
                <span>{{ store.activeCount }}</span>
            </button>
        </transition>

        <transition name="download-slide">
            <div v-if="store.panelOpen" class="download-panel">
                <div class="download-header">
                    <div class="download-title">
                        <i class="fas fa-download"></i>
                        <span>{{ $t('xia-zai-ren-wu') }}</span>
                        <span v-if="store.activeCount" class="download-count">{{ store.activeCount }}</span>
                    </div>
                    <div class="download-header-actions">
                        <button v-if="isElectron" type="button" class="icon-btn" :title="$t('da-kai-wen-jian-jia')"
                            @click="openDirectory">
                            <i class="fas fa-folder-open"></i>
                        </button>
                        <button v-if="isElectron" type="button" class="icon-btn" :title="$t('geng-huan-xia-zai-mu-lu')"
                            @click="chooseDirectory">
                            <i class="fas fa-folder-tree"></i>
                        </button>
                        <button v-if="store.finishedCount > 0" type="button" class="icon-btn"
                            :title="$t('qing-kong-yi-wan-cheng')" @click="store.clearFinished()">
                            <i class="fas fa-broom"></i>
                        </button>
                        <button type="button" class="icon-btn" :title="$t('guan-bi')" @click="store.closePanel()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div v-if="store.tasks.length === 0" class="download-empty">
                    <i class="fas fa-music"></i>
                    <span>{{ $t('zan-wu-xia-zai-ren-wu') }}</span>
                </div>

                <ul v-else class="download-list">
                    <li v-for="task in store.tasks" :key="task.id" class="download-item" :class="task.status">
                        <div class="download-item-main">
                            <div class="download-item-title" :title="task.fileName || task.name">
                                {{ task.name || task.fileName || '-' }}
                            </div>
                            <div class="download-item-sub">
                                <span v-if="task.author" class="download-item-author">{{ task.author }}</span>
                                <span v-if="task.qualityLabel" class="download-quality">{{ task.qualityLabel }}</span>
                                <span class="download-status">{{ statusText(task) }}</span>
                            </div>
                        </div>

                        <div class="download-item-side">
                            <template v-if="task.status === 'pending' || task.status === 'downloading'">
                                <span v-if="task.status === 'downloading' && task.total > 0"
                                    class="download-percent">{{ percent(task) }}%</span>
                                <button type="button" class="icon-btn danger" :title="$t('qu-xiao')"
                                    @click="cancel(task)">
                                    <i class="fas fa-times"></i>
                                </button>
                            </template>
                            <template v-else-if="task.status === 'done'">
                                <button v-if="task.filePath" type="button" class="icon-btn" :title="$t('da-kai-wen-jian-jia')"
                                    @click="showFile(task.filePath)">
                                    <i class="fas fa-folder-open"></i>
                                </button>
                            </template>
                            <template v-else-if="task.status === 'error' || task.status === 'canceled'">
                                <button type="button" class="icon-btn" :title="$t('zhong-shi')" @click="retry(task)">
                                    <i class="fas fa-redo"></i>
                                </button>
                                <button type="button" class="icon-btn" :title="$t('shan-chu')"
                                    @click="store.removeTask(task.id)">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </template>
                        </div>

                        <div class="download-progress-track">
                            <div class="download-progress-inner"
                                :class="{ indeterminate: task.status === 'downloading' && !task.total }"
                                :style="{ width: progressWidth(task) }"></div>
                        </div>
                    </li>
                </ul>

                <div v-if="directory" class="download-footer" :title="directory">
                    <i class="fas fa-folder"></i>
                    <span>{{ directory }}</span>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDownloadStore } from '@/stores/download';
import { downloadSong, cancelDownload } from '@/utils/download';

const store = useDownloadStore();
const { t } = useI18n();
const directory = ref('');
const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

const percent = (task) => {
    if (!task.total) return 0;
    return Math.min(100, Math.round((task.received / task.total) * 100));
};

const progressWidth = (task) => {
    if (task.status === 'done') return '100%';
    if (!task.total) return task.status === 'downloading' ? '100%' : '0%';
    return `${percent(task)}%`;
};

const statusText = (task) => {
    switch (task.status) {
        case 'pending':
            return t('deng-dai-zhong');
        case 'downloading':
            if (!task.total) return t('zheng-zai-xia-zai');
            return `${(task.received / 1024 / 1024).toFixed(1)}MB / ${(task.total / 1024 / 1024).toFixed(1)}MB`;
        case 'done':
            return t('xia-zai-wan-cheng');
        case 'canceled':
            return t('yi-qu-xiao-xia-zai');
        case 'error':
            return t('xia-zai-shi-bai');
        default:
            return '';
    }
};

const cancel = (task) => {
    cancelDownload(task.id);
    store.updateTask(task.id, { status: 'canceled' });
};

const retry = (task) => {
    store.removeTask(task.id);
    const option = task.quality ? { value: task.quality, hash: task.hash, label: task.qualityLabel } : null;
    downloadSong({ hash: task.hash, name: task.name, author: task.author }, option);
};

const refreshDirectory = async () => {
    if (!isElectron) return;
    const result = await window.electronAPI.getDownloadDirectory();
    directory.value = result?.directory || '';
};

const openDirectory = () => {
    window.electronAPI?.openDownloadDirectory?.();
};

const showFile = (filePath) => {
    window.electronAPI?.showDownloadedFile?.(filePath);
};

const chooseDirectory = async () => {
    const result = await window.electronAPI?.chooseDownloadDirectory?.();
    if (result && !result.canceled) {
        directory.value = result.directory || '';
        window.$message?.success?.(result.directory || '');
    }
};

onMounted(() => {
    store.initProgressListener();
    refreshDirectory();
});
</script>

<style lang="scss" scoped>
.download-root {
    position: relative;
    z-index: 30;
}

.download-pill {
    position: fixed;
    right: 20px;
    bottom: 100px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border: none;
    border-radius: 999px;
    background: var(--primary-color);
    color: #fff;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
    z-index: 30;
}

.download-panel {
    position: fixed;
    right: 20px;
    bottom: 100px;
    width: 320px;
    max-height: 420px;
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid #eee;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    overflow: hidden;
    z-index: 30;
}

.download-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
}

.download-title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: #333;

    i {
        color: var(--primary-color);
    }
}

.download-count {
    min-width: 18px;
    height: 18px;
    line-height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--primary-color);
    color: #fff;
    font-size: 11px;
    text-align: center;
}

.download-header-actions {
    display: inline-flex;
    align-items: center;
    gap: 2px;
}

.icon-btn {
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #888;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.18s ease, color 0.18s ease;

    &:hover {
        background: #f2f2f2;
        color: var(--primary-color);
    }

    &.danger:hover {
        color: #e35d5d;
    }
}

.download-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 36px 0;
    color: #bbb;
    font-size: 13px;

    i {
        font-size: 22px;
    }
}

.download-list {
    list-style: none;
    margin: 0;
    padding: 4px 0;
    overflow-y: auto;
    max-height: 340px;
}

.download-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px 10px;
    overflow: hidden;

    & + .download-item {
        border-top: 1px solid #f7f7f7;
    }
}

.download-item-main {
    min-width: 0;
    flex: 1;
}

.download-item-title {
    font-size: 13px;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.download-item-sub {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
    font-size: 11px;
    color: #999;
    min-width: 0;
}

.download-item-author {
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.download-quality {
    padding: 0 5px;
    border: 1px solid #e2e2e2;
    border-radius: 4px;
    color: #999;
    font-size: 10px;
    line-height: 15px;
}

.download-status {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.download-item.error .download-status,
.download-item.canceled .download-status {
    color: #e35d5d;
}

.download-item.done .download-status {
    color: #4caf7d;
}

.download-item-side {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
}

.download-percent {
    font-size: 11px;
    color: #999;
}

.download-progress-track {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    background: transparent;
}

.download-progress-inner {
    height: 100%;
    width: 0;
    background: var(--primary-color);
    transition: width 0.2s ease;

    &.indeterminate {
        width: 35% !important;
        animation: download-indeterminate 1.1s ease-in-out infinite;
    }
}

.download-item.done .download-progress-inner {
    background: #4caf7d;
}

.download-item.error .download-progress-inner,
.download-item.canceled .download-progress-inner {
    background: #e35d5d;
}

.download-footer {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-top: 1px solid #f0f0f0;
    font-size: 11px;
    color: #aaa;
    white-space: nowrap;
    overflow: hidden;

    span {
        overflow: hidden;
        text-overflow: ellipsis;
    }
}

@keyframes download-indeterminate {
    0% {
        transform: translateX(-100%);
    }

    100% {
        transform: translateX(300%);
    }
}

.download-fade-enter-active,
.download-fade-leave-active {
    transition: opacity 0.18s ease;
}

.download-fade-enter-from,
.download-fade-leave-to {
    opacity: 0;
}

.download-slide-enter-active,
.download-slide-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
}

.download-slide-enter-from,
.download-slide-leave-to {
    opacity: 0;
    transform: translateY(8px);
}
</style>

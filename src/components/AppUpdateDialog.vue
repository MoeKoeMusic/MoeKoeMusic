<template>
    <div v-if="showUpdateDialog" class="modal-overlay" @click="closeUpdateDialog">
        <div class="modal-content update-dialog" @click.stop>
            <h2>发现新版本 V{{ latestVersion }}</h2>
            <MarkdownContent class="update-log-box" :content="updateLog" :repo-url="projectRepoUrl" />
            <div v-if="isStartingUpdate || isDownloadingUpdate || isUpdateDownloaded || updateStatusText" class="update-progress-inline">
                <div class="update-progress-bar">
                    <div class="update-progress-fill" :style="{ width: `${updateProgress}%` }"></div>
                </div>
                <span class="update-progress-percent">{{ updateProgress.toFixed(1) }}%</span>
            </div>
            <div class="update-dialog-actions">
                <button @click="startOnlineUpdate" :disabled="isStartingUpdate || isDownloadingUpdate || isUpdateDownloaded">
                    {{ isUpdateDownloaded ? '下载完成' : isDownloadingUpdate ? '下载中...' : isStartingUpdate ? '正在启动...' : '在线更新' }}
                </button>
                <button @click="openManualUpdatePage">手动更新</button>
                <button class="secondary-button" @click="closeUpdateDialog">取消更新</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import MarkdownContent from './MarkdownContent.vue';
import { openRegisterUrl } from '../utils/utils';

const props = defineProps({
    appVersion: {
        type: String,
        default: ''
    },
    platform: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['badge-change']);

const projectRepoUrl = 'https://github.com/MoeKoeMusic/MoeKoeMusic';
const repoUrl = `${projectRepoUrl}/releases`;
const showUpdateDialog = ref(false);
const showNewBadge = ref(false);
const downloadUrl = ref('');
const updateLog = ref('暂无更新日志');
const latestVersion = ref('');
const isStartingUpdate = ref(false);
const isDownloadingUpdate = ref(false);
const isUpdateDownloaded = ref(false);
const updateProgress = ref(0);
const updateStatusText = ref('');
const updateSpeedText = ref('');
const updateSizeText = ref('');

const setShowNewBadge = (value) => {
    showNewBadge.value = value;
    emit('badge-change', value);
};

const formatBytes = (bytes = 0) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / (1024 ** index);
    return `${value.toFixed(value >= 100 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const isVersionLower = (current, latest) => {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
        if ((latestParts[i] || 0) > (currentParts[i] || 0)) {
            return true;
        } else if ((latestParts[i] || 0) < (currentParts[i] || 0)) {
            return false;
        }
    }
    return false;
};

const getPlatformDownloadUrl = (release) => {
    const assets = Array.isArray(release?.assets) ? release.assets : [];
    if (!assets.length) {
        return release?.html_url || repoUrl;
    }

    const platformMatchers = {
        win32: [/\.exe$/i, /\.msi$/i],
        darwin: [/\.dmg$/i, /\.zip$/i],
        linux: [/\.AppImage$/i, /\.deb$/i, /\.rpm$/i]
    };

    const matchers = platformMatchers[props.platform] || [];
    const asset = assets.find(item => matchers.some(matcher => matcher.test(item.name)));
    return asset?.browser_download_url || release?.html_url || repoUrl;
};

const fetchLatestVersion = async () => {
    if (!props.appVersion) {
        return;
    }

    try {
        const response = await fetch('https://api.github.com/repos/iAJue/MoeKoeMusic/releases/latest');
        const data = await response.json();
        downloadUrl.value = getPlatformDownloadUrl(data);
        latestVersion.value = data.tag_name.replace(/^v/, '');
        updateLog.value = data.body?.trim() || '暂无更新日志';
        setShowNewBadge(isVersionLower(props.appVersion, latestVersion.value));
    } catch (error) {
        console.error('获取最新版本号失败:', error);
    }
};

const closeUpdateDialog = () => {
    showUpdateDialog.value = false;
};

const openManualUpdatePage = () => {
    openRegisterUrl(downloadUrl.value || repoUrl);
};

const handleEntryClick = () => {
    if (!showNewBadge.value && !isStartingUpdate.value && !isDownloadingUpdate.value && !isUpdateDownloaded.value) {
        openRegisterUrl(repoUrl);
        return;
    }
    showUpdateDialog.value = true;
};

const handleUpdateProgress = (_event, progressObj) => {
    isStartingUpdate.value = false;
    isDownloadingUpdate.value = true;
    isUpdateDownloaded.value = false;
    updateProgress.value = Math.max(0, Math.min(100, Number(progressObj?.percent || 0)));
    updateStatusText.value = '正在下载更新';
    updateSpeedText.value = progressObj?.bytesPerSecond ? `${formatBytes(progressObj.bytesPerSecond)}/s` : '';
    if (progressObj?.transferred || progressObj?.total) {
        updateSizeText.value = `${formatBytes(progressObj.transferred || 0)} / ${formatBytes(progressObj.total || 0)}`;
    } else {
        updateSizeText.value = '';
    }
};

const handleUpdateDownloaded = () => {
    isStartingUpdate.value = false;
    isDownloadingUpdate.value = false;
    isUpdateDownloaded.value = true;
    updateProgress.value = 100;
    updateStatusText.value = '更新包已下载完成，请等待安装提示';
    updateSpeedText.value = '';
};

const handleUpdateError = (_event, payload) => {
    isStartingUpdate.value = false;
    isDownloadingUpdate.value = false;
    if (!isUpdateDownloaded.value) {
        updateStatusText.value = payload?.message || '更新失败，请稍后重试';
    }
    updateSpeedText.value = '';
};

const startOnlineUpdate = async () => {
    if (isStartingUpdate.value || isDownloadingUpdate.value || isUpdateDownloaded.value) {
        return;
    }

    if (!window.electronAPI?.startUpdateDownload) {
        await window.$modal.alert('当前环境暂不支持在线更新，请前往官网或应用市场下载最新版本。');
        return;
    }

    isStartingUpdate.value = true;
    updateStatusText.value = '正在启动在线更新...';
    updateSpeedText.value = '';
    updateSizeText.value = '';
    try {
        const result = await window.electronAPI.startUpdateDownload();
        if (result?.success) {
            isDownloadingUpdate.value = true;
            updateStatusText.value = '已开始在线更新，正在等待下载进度...';
            return;
        }

        isStartingUpdate.value = false;
        isDownloadingUpdate.value = false;

        if (result?.reason === 'unsupported') {
            updateStatusText.value = '当前环境暂不支持在线更新';
            await window.$modal.alert('当前环境暂不支持在线更新，请前往官网或应用市场下载最新版本。');
            return;
        }

        if (result?.reason === 'not-available') {
            setShowNewBadge(false);
            updateStatusText.value = '当前没有可用更新';
            await window.$modal.alert('当前没有可用更新，请前往仓库查看最新发布状态。');
            return;
        }

        updateStatusText.value = result?.message || '启动在线更新失败，请稍后重试。';
        await window.$modal.alert(result?.message || '启动在线更新失败，请稍后重试。');
    } finally {
        isStartingUpdate.value = false;
    }
};

watch(() => [props.appVersion, props.platform], ([appVersion]) => {
    if (appVersion) {
        fetchLatestVersion();
    }
}, { immediate: true });

onMounted(() => {
    if (window.electron) {
        window.electron.ipcRenderer.on('update-progress', handleUpdateProgress);
        window.electron.ipcRenderer.on('update-downloaded', handleUpdateDownloaded);
        window.electron.ipcRenderer.on('update-error', handleUpdateError);
    }
});

onUnmounted(() => {
    if (window.electron) {
        window.electron.ipcRenderer.removeListener('update-progress', handleUpdateProgress);
        window.electron.ipcRenderer.removeListener('update-downloaded', handleUpdateDownloaded);
        window.electron.ipcRenderer.removeListener('update-error', handleUpdateError);
    }
});

defineExpose({
    handleEntryClick
});
</script>

<style lang="scss" scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    position: relative;
    background: #fff;
    padding: 20px;
    border-radius: 8px;
    max-width: 700px;
    width: 90%;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    text-align: left;
    animation: fadeIn 0.3s ease;

    h2 {
        margin-top: 20px;
        color: var(--primary-color);
    }

    button {
        margin-top: 15px;
        padding: 8px 12px;
        background-color: var(--primary-color);
        color: #fff;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }
}

.update-dialog {
    max-width: 600px;

    .update-log-box {
        max-height: 250px;
        overflow-y: auto;
        margin-top: 16px;
        padding: 14px 16px;
        border-radius: 10px;
        background: #faf7fb;
        border: 1px solid rgba(var(--primary-color-rgb), 0.18);
    }

    .update-dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 18px;
        flex-wrap: wrap;
    }

    .update-progress-inline {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .update-progress-bar {
        flex: 1;
        height: 6px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(var(--primary-color-rgb), 0.12);
    }

    .update-progress-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--primary-color), #ff8ac2);
        transition: width 0.2s ease;
    }

    .update-progress-percent {
        min-width: 52px;
        text-align: right;
        font-size: 13px;
        color: #555;
        font-variant-numeric: tabular-nums;
    }

    button {
        min-width: 124px;
        border-radius: 999px;
        padding: 10px 18px;
        margin-top: 0;
    }

    .secondary-button {
        background: #eef1f6;
        color: #333;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}
</style>

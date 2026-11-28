import { defineStore } from 'pinia';

let taskSeed = 0;
let unsubscribeProgress = null;

export const useDownloadStore = defineStore('Download', {
    state: () => ({
        tasks: [], // 下载任务列表（仅保存在内存中）
        panelOpen: false
    }),
    getters: {
        // 正在进行的任务数量
        activeCount: (state) => state.tasks.filter(task => task.status === 'pending' || task.status === 'downloading').length,
        finishedCount: (state) => state.tasks.filter(task => task.status !== 'pending' && task.status !== 'downloading').length
    },
    actions: {
        createTask(payload = {}) {
            taskSeed += 1;
            const task = {
                id: `dl-${Date.now()}-${taskSeed}`,
                hash: payload.hash || '',
                name: payload.name || '',
                author: payload.author || '',
                fileName: '',
                quality: payload.quality || '',
                qualityLabel: payload.qualityLabel || '',
                status: 'pending', // pending | downloading | done | error | canceled
                received: 0,
                total: 0,
                filePath: '',
                error: '',
                createdAt: Date.now()
            };
            this.tasks.unshift(task);
            return task;
        },
        updateTask(id, patch = {}) {
            const task = this.tasks.find(item => item.id === id);
            if (task) Object.assign(task, patch);
        },
        removeTask(id) {
            this.tasks = this.tasks.filter(task => task.id !== id);
        },
        clearFinished() {
            this.tasks = this.tasks.filter(task => task.status === 'pending' || task.status === 'downloading');
        },
        openPanel() {
            this.panelOpen = true;
        },
        closePanel() {
            this.panelOpen = false;
        },
        togglePanel() {
            this.panelOpen = !this.panelOpen;
        },
        // 只注册一次主进程的下载进度监听
        initProgressListener() {
            if (unsubscribeProgress) return;
            const api = window.electronAPI;
            if (!api?.onDownloadProgress) return;

            unsubscribeProgress = api.onDownloadProgress((payload) => {
                if (!payload?.id) return;
                const patch = {};
                if (Number.isFinite(payload.received)) patch.received = payload.received;
                if (Number.isFinite(payload.total) && payload.total > 0) patch.total = payload.total;
                if (payload.completed) {
                    patch.status = 'done';
                    if (payload.total) patch.total = payload.total;
                } else if (payload.canceled) {
                    patch.status = 'canceled';
                } else if (payload.failed) {
                    patch.status = 'error';
                    patch.error = payload.error || '';
                }
                this.updateTask(payload.id, patch);
            });
        }
    }
});

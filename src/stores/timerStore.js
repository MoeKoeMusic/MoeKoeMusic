import { defineStore } from 'pinia';

export const VALID_MODES = ['stop', 'exit', 'sleep', 'shutdown'];
export const WARNING_THRESHOLD_MS = 30000;

export const useTimerStore = defineStore('timer', {
    state: () => ({
        isRunning: false,
        selectedMode: 'stop',
        totalDuration: 0,
        remainingTime: 0,
        startedAt: null,
        isPanelOpen: false,
        isPanelVisible: false,
        quickOptions: [15, 30, 45, 60, 90, 120],
        customTime: { hours: 0, minutes: 0, seconds: 0 },
        customPresets: [],
        lastUsedMode: 'stop',
        lastUsedTime: 1800,
    }),

    getters: {
        formattedRemainingTime: (state) => {
            if (!state.isRunning || state.remainingTime <= 0) return '00:00:00';
            const totalSeconds = Math.ceil(state.remainingTime / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
        },

        progressPercent: (state) => {
            if (!state.totalDuration || state.totalDuration === 0) return 0;
            return Math.max(0, Math.min(100,
                ((state.totalDuration - state.remainingTime) / state.totalDuration) * 100
            ));
        },

        isWarningPhase: (state) => {
            return state.isRunning && state.remainingTime <= WARNING_THRESHOLD_MS && state.remainingTime > 0;
        },
    },

    actions: {
        startTimer(mode, durationMs) {
            if (!VALID_MODES.includes(mode)) {
                console.warn('[TimerStore] Invalid mode:', mode, 'fallback to stop');
                mode = 'stop';
            }
            this.selectedMode = mode;
            this.totalDuration = durationMs;
            this.remainingTime = durationMs;
            this.startedAt = Date.now();
            this.isRunning = true;
            this.lastUsedMode = mode;
            this.lastUsedTime = Math.round(durationMs / 1000);
        },

        updateRemainingTime(remainingMs) {
            this.remainingTime = Math.max(0, remainingMs);
            if (this.remainingTime <= 0 && this.isRunning) {
                this.isRunning = false;
                this.triggerTimer();
            }
        },

        triggerTimer() {
            this.isRunning = false;
            this.remainingTime = 0;
        },

        cancelTimer() {
            this.isRunning = false;
            this.remainingTime = 0;
            this.totalDuration = 0;
            this.startedAt = null;
        },

        togglePanel() {
            this.isPanelOpen = !this.isPanelOpen;
        },

        setCustomTime({ hours, minutes, seconds }) {
            this.customTime = {
                hours: Math.max(0, Math.min(23, hours || 0)),
                minutes: Math.max(0, Math.min(59, minutes || 0)),
                seconds: Math.max(0, Math.min(59, seconds || 0)),
            };
        },

        getCustomDurationMs() {
            const { hours, minutes, seconds } = this.customTime;
            return (hours * 3600 + minutes * 60 + seconds) * 1000;
        },

        setSelectedMode(mode) {
            if (VALID_MODES.includes(mode)) {
                this.selectedMode = mode;
            } else {
                console.warn('[TimerStore] Invalid mode:', mode);
                this.selectedMode = 'stop';
            }
        },

        addCustomPreset(durationSeconds) {
            const seconds = Math.round(durationSeconds);
            
            if (!Number.isFinite(seconds) || seconds <= 0) {
                console.warn('[TimerStore] Invalid preset duration:', durationSeconds);
                return false;
            }
            
            const existingMins = Math.round(seconds / 60);
            if (this.quickOptions.some(p => p === existingMins)) {
                console.warn('[TimerStore] Preset conflicts with system preset:', existingMins, 'min');
                return false;
            }

            if (this.customPresets.some(p => Math.round(p / 60) === existingMins)) {
                console.warn('[TimerStore] Preset already exists:', existingMins, 'min');
                return false;
            }
            
            if (this.customPresets.length >= 6) {
                console.warn('[TimerStore] Preset limit reached (max 6)');
                return false;
            }
            
            this.customPresets.push(seconds);
            this.customPresets.sort((a, b) => a - b);
            return true;
        },

        removeCustomPreset(durationSeconds) {
            const index = this.customPresets.indexOf(Math.round(durationSeconds));
            if (index !== -1) {
                this.customPresets.splice(index, 1);
            }
        },
    },

    persist: {
        enabled: true,
        strategies: [{
            key: 'moekoemusic-timer',
            storage: localStorage,
            paths: [
                'lastUsedMode', 'lastUsedTime', 'selectedMode', 
                'customTime', 'customPresets'
            ],
        }],
    },
});

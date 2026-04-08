import { computed, onUnmounted } from 'vue';
import { useTimerStore } from '../../stores/timerStore';
import { useI18n } from 'vue-i18n';

const SECOND_MS = 1000;
const MIN_DURATION_MS = 60000;
const WARNING_TIME_MS = 30000;

export default function useTimerControl() {
    const timerStore = useTimerStore();
    const { t } = useI18n();
    let countdownInterval = null;
    let timerExecuteHandler = null;
    let isDestroyed = false;
    let hasShownWarning = false;

    const timerModes = computed(() => [
        {
            value: 'stop',
            label: t('ting-zhi-bo-fang'),
            icon: 'fas fa-pause-circle',
            description: t('jin-ting-zhi-bo-fang'),
        },
        {
            value: 'exit',
            label: t('ting-zhi-bing-tui-chu'),
            icon: 'fas fa-sign-out-alt',
            description: t('ting-zhi-bo-fang-bing-tui-chu-ying-yong'),
        },
        {
            value: 'sleep',
            label: t('ting-zhi-bing-shui-mian'),
            icon: 'fas fa-moon',
            description: t('ting-zhi-bo-fang-bing-ru-shui-mian'),
        },
        {
            value: 'shutdown',
            label: t('ting-zhi-bing-guan-ji'),
            icon: 'fas fa-power-off',
            description: t('ting-zhi-bo-fang-bing-guan-bi-dian-nao'),
        },
    ]);

    const currentMode = computed(() =>
        timerModes.value.find(m => m.value === timerStore.selectedMode) || timerModes.value[0]
    );

    const canStart = computed(() => {
        const duration = getSelectedDuration();
        return duration >= MIN_DURATION_MS && !timerStore.isRunning;
    });

    function getSelectedDuration() {
        const customDuration = timerStore.getCustomDurationMs();
        if (customDuration > 0) return customDuration;
        return 0;
    }

    function selectQuickTime(minutes) {
        timerStore.setCustomTime({
            hours: Math.floor(minutes / 60),
            minutes: minutes % 60,
            seconds: 0,
        });
    }

    async function checkPermissionBeforeStart(mode) {
        if (mode !== 'sleep' && mode !== 'shutdown') return true;
        if (!window.electron?.ipcRenderer) return false;

        try {
            const result = await window.electron.ipcRenderer.invoke('check-timer-permission', mode);
            if (!result.canExecute) {
                window.dispatchEvent(new CustomEvent('timer-error', {
                    detail: 'permission-denied',
                    warnings: result.warnings
                }));
                return false;
            }
            if (result.warnings && result.warnings.length > 0) {
                console.warn('[TimerControl] 权限警告:', result.warnings.join('; '));
            }
            return true;
        } catch (error) {
            console.error('[TimerControl] 权限检查失败:', error);
            return true;
        }
    }

    async function startTimer() {
        const duration = getSelectedDuration();
        if (duration < MIN_DURATION_MS) return;

        const hasPermission = await checkPermissionBeforeStart(timerStore.selectedMode);
        if (!hasPermission) return;

        hasShownWarning = false;
        timerStore.startTimer(timerStore.selectedMode, duration);
        startCountdown();
        if (window.electron?.ipcRenderer) {
            try {
                window.electron.ipcRenderer.send('timer-action', {
                    action: 'start',
                    mode: timerStore.selectedMode,
                    duration: duration,
                });
            } catch (error) {
                console.error('[TimerControl] IPC send failed:', error);
                window.dispatchEvent(new CustomEvent('timer-error', {
                    detail: 'ipc-communication-failed'
                }));
            }
        }
    }

    function cancelTimer() {
        stopCountdown();
        hasShownWarning = false;
        timerStore.cancelTimer();
        if (window.electron?.ipcRenderer) {
            try {
                window.electron.ipcRenderer.send('timer-action', { action: 'cancel' });
            } catch (error) {
                console.error('[TimerControl] IPC cancel send failed:', error);
            }
        }
    }

    function showWarningNotification() {
        const mode = timerStore.selectedMode;
        if (mode !== 'sleep' && mode !== 'shutdown') return;
        
        if (window.electron?.ipcRenderer) {
            try {
                window.electron.ipcRenderer.send('timer-action', {
                    action: 'warning',
                    mode: mode,
                });
            } catch (error) {
                console.error('[TimerControl] IPC warning send failed:', error);
            }
        }
    }

    function startCountdown() {
        stopCountdown();
        countdownInterval = setInterval(() => {
            if (isDestroyed || !timerStore.isRunning || !timerStore.startedAt) {
                stopCountdown();
                return;
            }
            const elapsed = Date.now() - timerStore.startedAt;
            const remaining = Math.max(0, timerStore.totalDuration - elapsed);
            timerStore.updateRemainingTime(remaining);
            
            if (remaining <= WARNING_TIME_MS && remaining > 0 && !hasShownWarning) {
                hasShownWarning = true;
                showWarningNotification();
            }
            
            if (remaining <= 0) {
                handleTimerComplete();
            }
        }, SECOND_MS);
    }

    function stopCountdown() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }

    function dispatchTimerStopPlayback() {
        window.dispatchEvent(new CustomEvent('timer-stop-playback'));
    }

    function handleTimerComplete() {
        stopCountdown();
        const mode = timerStore.selectedMode;
        switch (mode) {
            case 'stop':
                dispatchTimerStopPlayback();
                if (window.electron?.ipcRenderer) {
                    try {
                        window.electron.ipcRenderer.send('timer-action', { action: 'timer-completed' });
                    } catch (error) {
                        console.error('[TimerControl] IPC timer-completed send failed:', error);
                    }
                }
                break;
            case 'exit':
            case 'sleep':
            case 'shutdown':
                if (window.electron?.ipcRenderer) {
                    try {
                        window.electron.ipcRenderer.send('timer-action', {
                            action: 'trigger',
                            mode: mode,
                        });
                    } catch (error) {
                        console.error('[TimerControl] IPC trigger send failed:', error);
                        dispatchTimerStopPlayback();
                    }
                } else {
                    dispatchTimerStopPlayback();
                }
                break;
        }
        timerStore.triggerTimer();
    }

    function togglePanel() {
        timerStore.isPanelVisible = !timerStore.isPanelVisible;
        timerStore.isPanelOpen = timerStore.isPanelVisible;
    }

    function showPanel() {
        timerStore.isPanelVisible = true;
        timerStore.isPanelOpen = true;
    }

    function hidePanel() {
        timerStore.isPanelVisible = false;
        timerStore.isPanelOpen = false;
    }

    function initTimer() {
        if (timerStore.isRunning && timerStore.startedAt) {
            const elapsed = Date.now() - timerStore.startedAt;
            const remaining = timerStore.totalDuration - elapsed;
            if (remaining > 0) {
                timerStore.updateRemainingTime(remaining);
                startCountdown();
            } else {
                handleTimerComplete();
            }
        }
        if (window.electron?.ipcRenderer) {
            timerExecuteHandler = (_event, data) => {
                if (isDestroyed) return;
                if (data.mode === 'stop') {
                    dispatchTimerStopPlayback();
                }
                if (data.error) {
                    window.dispatchEvent(new CustomEvent('timer-error', { detail: data.error }));
                }
            };
            window.electron.ipcRenderer.on('timer-execute', timerExecuteHandler);
        }
    }

    function destroyTimer() {
        isDestroyed = true;
        stopCountdown();
        if (window.electron?.ipcRenderer && timerExecuteHandler) {
            try {
                window.electron.ipcRenderer.removeListener('timer-execute', timerExecuteHandler);
            } catch (error) {
                console.error('[TimerControl] 移除IPC监听器失败:', error);
            }
            timerExecuteHandler = null;
        }
    }

    onUnmounted(() => {
        destroyTimer();
    });

    return {
        timerModes,
        currentMode,
        canStart,
        timerStore,
        selectQuickTime,
        startTimer,
        cancelTimer,
        togglePanel,
        showPanel,
        hidePanel,
        initTimer,
        destroyTimer,
    };
}

<template>
    <transition name="timer-panel">
        <div v-if="timerStore.isPanelVisible" class="timer-panel-overlay" @click.self="hidePanel">
            <div class="timer-panel" :class="{ 'warning-phase': timerStore.isWarningPhase }">
                <div class="panel-header">
                    <h3><i class="fas fa-clock"></i> {{ t('ding-shi-qi') }}</h3>
                    <button class="close-btn" @click="hidePanel" :title="t('guan-bi')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="panel-section">
                    <label class="section-label">{{ t('gong-neng') }}</label>
                    <div class="mode-selection">
                        <div
                            v-for="mode in timerModes"
                            :key="mode.value"
                            class="mode-card"
                            :class="{ active: timerStore.selectedMode === mode.value }"
                            @click="selectMode(mode.value)"
                        >
                            <i :class="mode.icon"></i>
                            <span class="mode-label">{{ mode.label }}</span>
                        </div>
                    </div>
                </div>

                <div v-if="!timerStore.isRunning" class="panel-section">
                    <label class="section-label">{{ t('shi-jian') }}</label>

                    <div class="time-picker">
                        <div class="time-unit">
                            <button class="time-arrow" @mousedown="startAdjust('hours', 1)" @mouseup="stopAdjust" @mouseleave="stopAdjust">
                                <i class="fas fa-chevron-up"></i>
                            </button>
                            <input type="number" v-model.number="hours" min="0" max="23" 
                                placeholder="00"
                                :title="t('shi') + ' (0-23)'"
                                @input="validateInput('hours')"
                                @blur="validateInput('hours')"
                                @keydown="handleKeyDown($event, 'hours')"
                                @wheel="handleWheel($event, 'hours')" />
                            <button class="time-arrow" @mousedown="startAdjust('hours', -1)" @mouseup="stopAdjust" @mouseleave="stopAdjust">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                            <span class="time-label">{{ t('shi') }}</span>
                        </div>
                        <span class="time-dot">:</span>
                        <div class="time-unit">
                            <button class="time-arrow" @mousedown="startAdjust('minutes', 1)" @mouseup="stopAdjust" @mouseleave="stopAdjust">
                                <i class="fas fa-chevron-up"></i>
                            </button>
                            <input type="number" v-model.number="minutes" min="0" max="59"
                                placeholder="00"
                                :title="t('fen') + ' (0-59)'"
                                @input="validateInput('minutes')"
                                @blur="validateInput('minutes')"
                                @keydown="handleKeyDown($event, 'minutes')"
                                @wheel="handleWheel($event, 'minutes')" />
                            <button class="time-arrow" @mousedown="startAdjust('minutes', -1)" @mouseup="stopAdjust" @mouseleave="stopAdjust">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                            <span class="time-label">{{ t('fen') }}</span>
                        </div>
                        <span class="time-dot">:</span>
                        <div class="time-unit">
                            <button class="time-arrow" @mousedown="startAdjust('seconds', 1)" @mouseup="stopAdjust" @mouseleave="stopAdjust">
                                <i class="fas fa-chevron-up"></i>
                            </button>
                            <input type="number" v-model.number="seconds" min="0" max="59"
                                placeholder="00"
                                :title="t('miao') + ' (0-59)'"
                                @input="validateInput('seconds')"
                                @blur="validateInput('seconds')"
                                @keydown="handleKeyDown($event, 'seconds')"
                                @wheel="handleWheel($event, 'seconds')" />
                            <button class="time-arrow" @mousedown="startAdjust('seconds', -1)" @mouseup="stopAdjust" @mouseleave="stopAdjust">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                            <span class="time-label">{{ t('miao') }}</span>
                        </div>
                    </div>
                </div>

                <div v-if="!timerStore.isRunning" class="preset-section">
                    <div class="quick-buttons">
                        <button
                            v-for="mins in timerStore.quickOptions"
                            :key="'sys-'+mins"
                            class="quick-btn sys-preset"
                            :class="{ active: isActivePreset(mins) }"
                            @click="selectQuickTime(mins)"
                        >{{ formatPresetLabel(mins) }}</button>

                        <button
                            v-for="(preset, idx) in timerStore.customPresets"
                            :key="'custom-'+idx"
                            class="quick-btn user-preset"
                            :class="{ active: isActivePreset(Math.round(preset / 60)) && seconds === 0 }"
                            @click="selectCustomPreset(preset)"
                        >
                            <span class="preset-text">{{ formatPresetLabel(preset / 60) }}</span>
                            <span class="preset-delete" @click.stop="removePreset(preset, $event)" :title="t('shan-chu')">
                                <i class="fas fa-times"></i>
                            </span>
                        </button>

                        <button 
                            class="quick-btn add-btn" 
                            :class="{ disabled: !canAddPreset }" 
                            :disabled="!canAddPreset"
                            :title="t('bao-cun-ding-shi')"
                            @click="saveAsPreset"
                        ><i class="fas fa-plus"></i></button>
                    </div>
                </div>

                <div v-if="timerStore.isRunning" class="countdown-section">
                    <div class="countdown-ring-container">
                        <svg viewBox="0 0 120 120" class="countdown-svg">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--timer-track-color, rgba(255,255,255,0.12))" stroke-width="6"/>
                            <circle
                                cx="60" cy="60" r="54" fill="none"
                                stroke="var(--primary-color, #00e5ff)"
                                stroke-width="6"
                                stroke-linecap="round"
                                :stroke-dasharray="339.292"
                                :stroke-dashoffset="339.292 * (1 - timerStore.progressPercent / 100)"
                                transform="rotate(-90 60 60)"
                                class="progress-arc"
                            />
                        </svg>
                        <div class="countdown-text" :class="{ warning: timerStore.isWarningPhase }">
                            {{ timerStore.formattedRemainingTime }}
                        </div>
                    </div>
                    <div class="countdown-info">
                        <p class="current-mode-name">
                            <i :class="currentMode.icon"></i> {{ currentMode.label }}
                        </p>
                        <button class="cancel-timer-btn" @click="cancelTimer">
                            <i class="fas fa-stop"></i> {{ t('qu-xiao') }}
                        </button>
                    </div>
                </div>

                <div v-if="!timerStore.isRunning" class="panel-actions">
                    <div v-if="!canStart" class="hint-text">
                        <i class="fas fa-info-circle"></i> {{ t('timer-min-duration-hint') }}
                    </div>
                    <button class="start-btn" :disabled="!canStart" @click="startTimer">
                        <i class="fas fa-play"></i> {{ t('kai-shi') }}
                    </button>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTimerControl } from './player';

const { t } = useI18n();
const timer = useTimerControl();

const {
    timerModes,
    currentMode,
    canStart,
    timerStore,
    selectQuickTime,
    startTimer,
    cancelTimer,
    showPanel,
    hidePanel,
} = timer;

const hours = ref(timerStore.customTime.hours);
const minutes = ref(timerStore.customTime.minutes);
const seconds = ref(timerStore.customTime.seconds);

let adjustInterval = null;

watch([hours, minutes, seconds], () => {
    timerStore.setCustomTime({
        hours: hours.value,
        minutes: minutes.value,
        seconds: seconds.value,
    });
});

watch(
    () => ({ 
        hours: timerStore.customTime.hours, 
        minutes: timerStore.customTime.minutes, 
        seconds: timerStore.customTime.seconds 
    }),
    (val) => {
        hours.value = val.hours;
        minutes.value = val.minutes;
        seconds.value = val.seconds;
    }
);

function selectMode(mode) {
    timerStore.setSelectedMode(mode);
}

function adjustTime(field, delta) {
    const maxValues = { hours: 23, minutes: 59, seconds: 59 };
    const refs = { hours, minutes, seconds };
    
    let newValue = (refs[field].value || 0) + delta;
    if (newValue < 0) newValue = maxValues[field];
    if (newValue > maxValues[field]) newValue = 0;
    refs[field].value = newValue;
}

function startAdjust(field, delta) {
    adjustTime(field, delta);
    adjustInterval = setInterval(() => {
        adjustTime(field, delta);
    }, 150);
}

function stopAdjust() {
    if (adjustInterval) {
        clearInterval(adjustInterval);
        adjustInterval = null;
    }
}

function handleWheel(event, field) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -1 : 1;
    adjustTime(field, delta);
}

function handleKeyDown(event, field) {
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        adjustTime(field, 1);
    } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        adjustTime(field, -1);
    } else if (event.key === 'Enter') {
        event.target.blur();
    }
}

function validateInput(field) {
    const maxValues = { hours: 23, minutes: 59, seconds: 59 };
    const refs = { hours, minutes, seconds };
    const value = refs[field].value;
    
    if (value === null || value === undefined || value === '') {
        refs[field].value = 0;
        return;
    }
    
    const numValue = Number(value);
    if (isNaN(numValue)) {
        refs[field].value = 0;
        return;
    }
    
    const clampedValue = Math.max(0, Math.min(maxValues[field], Math.floor(numValue)));
    refs[field].value = clampedValue;
}

function isActivePreset(mins) {
    return hours.value * 60 + minutes.value === Math.round(mins) && seconds.value === 0;
}

function selectCustomPreset(totalSeconds) {
    const totalMins = Math.round(totalSeconds / 60);
    timerStore.setCustomTime({
        hours: Math.floor(totalMins / 60),
        minutes: totalMins % 60,
        seconds: 0,
    });
}

function formatPresetLabel(mins) {
    mins = Math.round(mins);
    if (mins < 60) return `${mins}${t('fen')}`;
    if (mins % 60 === 0) return `${mins / 60}${t('shi')}`;
    return `${Math.floor(mins / 60)}${t('shi')}${mins % 60}${t('fen')}`;
}

const canAddPreset = computed(() => {
    const totalSecs = hours.value * 3600 + minutes.value * 60 + seconds.value;
    if (totalSecs <= 0) return false;
    const totalMins = totalSecs / 60;
    if (timerStore.quickOptions.some(p => p === Math.round(totalMins))) return false;
    if (timerStore.customPresets.some(p => Math.round(p / 60) === Math.round(totalMins))) return false;
    if (timerStore.customPresets.length >= 6) return false;
    return true;
});

function saveAsPreset() {
    if (!canAddPreset.value) return;
    const totalSecs = hours.value * 3600 + minutes.value * 60 + seconds.value;
    timerStore.addCustomPreset(totalSecs);
}

function removePreset(totalSeconds, event) {
    event.stopPropagation();
    timerStore.removeCustomPreset(totalSeconds);
}

function handleTimerError(event) {
    console.warn('[TimerPanel] 定时器操作失败:', event.detail);
}

onMounted(() => {
    window.addEventListener('timer-error', handleTimerError);
});

onUnmounted(() => {
    window.removeEventListener('timer-error', handleTimerError);
    stopAdjust();
});

defineExpose({
    show: showPanel,
    hide: hidePanel,
    toggle: () => { timer.togglePanel(); },
    init: timer.initTimer,
    destroy: timer.destroyTimer,
});
</script>

<style scoped>
@import '@/assets/style/TimerPanel.css';
</style>

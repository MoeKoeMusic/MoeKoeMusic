<template>
    <div
        class="fullscreen-lyrics-settings"
        :class="{ open: isOpen }"
        @mouseleave="closePanel"
        @focusout="handleFocusOut"
    >
        <span class="settings-guide-anchor" aria-hidden="true"></span>
        <button type="button" class="settings-handle" :title="t('she-zhi')" :aria-label="t('she-zhi')" @mouseenter="openPanel" @focus="openPanel"></button>
        <div class="settings-panel">
            <div class="settings-row">
                <span class="settings-label">{{ t('ge-ci-bei-jing') }}</span>
                <div class="setting-options">
                    <button
                        v-for="option in backgroundOptions"
                        :key="option.value"
                        type="button"
                        :class="{ active: currentSettings.background === option.value }"
                        :title="t(option.labelKey)"
                        @click="updateSetting({ background: option.value })"
                    >
                        <i :class="option.icon"></i>
                    </button>
                </div>
            </div>
            <div class="settings-row">
                <span class="settings-label">{{ t('ge-ci-zi-ti-da-xiao') }}</span>
                <div class="setting-options">
                    <button
                        v-for="option in fontSizeOptions"
                        :key="option.value"
                        type="button"
                        :class="{ active: currentSettings.fontSize === option.value }"
                        :title="t('ge-ci-zi-ti-da-xiao') + ': ' + t(option.labelKey)"
                        @click="updateSetting({ fontSize: option.value })"
                    >
                        {{ t(option.labelKey) }}
                    </button>
                </div>
            </div>
            <div class="settings-row">
                <span class="settings-label">{{ t('ge-ci') }}</span>
                <div class="setting-options">
                    <button
                        v-for="option in displayModeOptions"
                        :key="option.value"
                        type="button"
                        :class="{ active: currentSettings.displayMode === option.value }"
                        :title="t(option.labelKey)"
                        @click="updateSetting({ displayMode: option.value })"
                    >
                        {{ t(option.labelKey) }}
                    </button>
                </div>
            </div>
            <div class="settings-row">
                <span class="settings-label">{{ t('ge-ci-gao-liang-fang-shi') }}</span>
                <div class="setting-options">
                    <button
                        v-for="option in highlightModeOptions"
                        :key="option.value"
                        type="button"
                        :class="{ active: currentSettings.highlightMode === option.value }"
                        :title="t(option.labelKey)"
                        @click="updateSetting({ highlightMode: option.value })"
                    >
                        {{ t(option.labelKey) }}
                    </button>
                </div>
            </div>
            <div class="settings-row">
                <span class="settings-label">{{ t('dui-qi-fang-shi') }}</span>
                <div class="setting-options">
                    <button
                        v-for="option in alignOptions"
                        :key="option.value"
                        type="button"
                        :class="{ active: currentSettings.align === option.value }"
                        :title="t(option.labelKey)"
                        @click="updateSetting({ align: option.value })"
                    >
                        <i :class="option.icon"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    modelValue: {
        type: Object,
        default: () => ({
            background: 'on',
            fontSize: '24px',
            align: 'center',
            highlightMode: 'char',
            displayMode: 'scroll'
        })
    }
});

const emit = defineEmits(['update:modelValue', 'change']);

const { t } = useI18n();
const isOpen = ref(false);
const storageKey = 'fullscreen-lyrics-settings';
const defaultSettings = {
    background: 'on',
    fontSize: '24px',
    align: 'center',
    highlightMode: 'char',
    displayMode: 'scroll'
};

const backgroundOptions = [
    { labelKey: 'da-kai', value: 'on', icon: 'fas fa-image' },
    { labelKey: 'feng-mian', value: 'cover', icon: 'fas fa-images' },
    { labelKey: 'guan-bi', value: 'off', icon: 'fas fa-ban' }
];
const fontSizeOptions = [
    { labelKey: 'xiao', value: '20px' },
    { labelKey: 'zhong', value: '24px' },
    { labelKey: 'da', value: '32px' }
];
const alignOptions = [
    { labelKey: 'ju-zuo', value: 'left', icon: 'fas fa-align-left' },
    { labelKey: 'ju-zhong', value: 'center', icon: 'fas fa-align-center' }
];
const highlightModeOptions = [
    { labelKey: 'zhu-zi', value: 'char' },
    { labelKey: 'zhu-hang', value: 'line' }
];
const displayModeOptions = [
    { labelKey: 'gun-dong', value: 'scroll' },
    { labelKey: 'dan-hang', value: 'single' }
];

const normalizeSettings = (settings = {}) => ({
    background: settings.background === 'off' || settings.background === 'cover' ? settings.background : defaultSettings.background,
    fontSize: fontSizeOptions.some(option => option.value === settings.fontSize) ? settings.fontSize : defaultSettings.fontSize,
    align: settings.align === 'left' ? 'left' : defaultSettings.align,
    highlightMode: settings.highlightMode === 'line' ? 'line' : defaultSettings.highlightMode,
    displayMode: settings.displayMode === 'single' ? 'single' : defaultSettings.displayMode
});

const currentSettings = computed(() => normalizeSettings(props.modelValue));

const openPanel = () => {
    isOpen.value = true;
};

const closePanel = () => {
    isOpen.value = false;
};

const handleFocusOut = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) closePanel();
};

const updateSetting = (partialSettings) => {
    const settings = normalizeSettings({
        ...currentSettings.value,
        ...partialSettings
    });

    localStorage.setItem(storageKey, JSON.stringify(settings));
    emit('update:modelValue', settings);
    emit('change', settings);
};

onMounted(() => {
    let savedSettings = {};
    try {
        savedSettings = JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
    } catch {
        savedSettings = {};
    }

    const settings = normalizeSettings(savedSettings);
    emit('update:modelValue', settings);
    emit('change', settings);
});
</script>

<style scoped lang="scss">
.fullscreen-lyrics-settings {
    position: absolute;
    top: 50%;
    right: 0;
    z-index: 101;
    display: flex;
    align-items: center;
    width: 294px;
    transform: translateY(-50%) translateX(280px);
    transition: transform 0.28s ease;

    &.open {
        transform: translateY(-50%) translateX(0);

        .settings-panel {
            opacity: 1;
            pointer-events: auto;
            box-shadow: -12px 12px 30px rgba(0, 0, 0, 0.28);
        }
    }
}

.settings-handle {
    box-sizing: border-box;
    width: 14px;
    height: 56px;
    flex-shrink: 0;
    border: 0;
    border-radius: 6px 0 0 6px;
    padding: 0;
    background: rgba(255, 255, 255, 0.18);
    cursor: pointer;
    position: relative;
    transition: background-color 0.2s;

    &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 4px;
        width: 0;
        height: 0;
        border-top: 5px solid transparent;
        border-bottom: 5px solid transparent;
        border-right: 6px solid rgba(255, 255, 255, 0.66);
        transform: translateY(-50%);
    }

    &:hover,
    &:focus {
        background: rgba(255, 255, 255, 0.28);
        outline: none;
    }
}

.settings-guide-anchor {
    position: absolute;
    top: 50%;
    left: -30px;
    width: 44px;
    height: 76px;
    transform: translateY(-50%);
    pointer-events: none;
}

.settings-panel {
    box-sizing: border-box;
    width: 280px;
    padding: 12px;
    border-radius: 8px 0 0 8px;
    background: rgba(18, 18, 18, 0.82);
    backdrop-filter: blur(16px);
    color: #fff;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.16s ease, box-shadow 0.16s ease;
}

.settings-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    margin-bottom: 10px;

    &:last-child {
        margin-bottom: 0;
    }
}

.settings-label {
    font-size: 12px;
    line-height: 1.3;
    color: rgba(255, 255, 255, 0.72);
}

.setting-options {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);

    button {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 36px;
        height: 28px;
        border: 0;
        border-radius: 6px;
        padding: 0 8px;
        color: rgba(255, 255, 255, 0.8);
        background: transparent;
        cursor: pointer;
        font-size: 13px;
        white-space: nowrap;
        transition: background-color 0.2s, color 0.2s;

        &:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.12);
        }

        &.active {
            color: #161616;
            background: #fff;
        }
    }
}
</style>

<template>
    <div class="settings-page">
        <div class="settings-sidebar">
            <div v-for="(section, sectionIndex) in settingSections" :key="sectionIndex" class="sidebar-item"
                :class="{ active: activeTab === sectionIndex }" @click="activeTab = sectionIndex">
                <i :class="section.icon"></i>
                <span>{{ section.title }}</span>
            </div>
        </div>

        <div class="settings-content">
            <div v-for="(section, sectionIndex) in settingSections" :key="sectionIndex" class="setting-section"
                v-show="activeTab === sectionIndex">
                <h3>{{ section.title }}</h3>
                <ExtensionManager v-if="section.title === t('cha-jian')" />
                <div v-else class="settings-cards">
                    <div v-for="(item, itemIndex) in getVisibleItems(section)" :key="itemIndex" class="setting-card"
                        @click="item.action ? item.action(item.helpLink) : openSelection(item.key, item.helpLink)">
                        <div class="setting-card-header">
                            <i :class="item.itemIcon || 'fas fa-sliders-h'"></i>
                            <span>{{ item.label }}</span>
                            <span v-if="item.showRefreshHint && showRefreshHint[item.key]" class="refresh-hint">
                                {{ item.refreshHintText }}
                            </span>
                        </div>
                        <div class="setting-card-value">
                            <span>{{ item.icon }}{{ item.customText || selectedSettings[item.key]?.displayText }}</span>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div class="reset-settings-container">
                <button @click="openResetConfirmation" class="reset-settings-button">
                    <i class="fas fa-sync-alt"></i>
                    {{ $t('hui-fu-chu-chang-she-zhi') }}
                </button>
            </div>
            <div class="version-info">
                <p>© MoeKoe Music</p>
                <span v-if="appVersion">V{{ appVersion }} - {{ platform }}</span>
            </div>
        </div>

        <div v-if="isSelectionOpen" class="modal" @click.self="closeSelection">
            <div class="modal-content">
                <a v-if="currentHelpLink" class="help-link" @click="openHelpLink" :title="$t('bang-zhu')"
                    :aria-label="$t('bang-zhu')">
                    <i class="fas fa-question-circle"></i>
                </a>
                <h3>{{ getSettingItem(selectionType)?.selectionTitle }}</h3>
                <ul v-if="selectionType !== 'font' && selectionType !== 'audioOutputDevice'">
                    <li v-for="option in getSettingItem(selectionType)?.options || []" :key="option.value"
                        @click="selectOption(option)">
                        {{ option.displayText }}
                    </li>
                </ul>

                <ul v-else-if="selectionType === 'audioOutputDevice'">
                    <li v-if="audioOutputDevicesLoading">正在获取设备列表...</li>
                    <li v-else-if="audioOutputDeviceOptions.length === 0">未检测到音频输出设备</li>
                    <li v-else v-for="option in audioOutputDeviceOptions" :key="option.value"
                        @click="selectOption(option)">
                        {{ option.displayText }}
                    </li>
                </ul>

                <ul v-else-if="selectionType === 'font'" class="font-list">
                    <li v-if="fontOptionsLoading">{{ $t('jia-zai-zhong') }}</li>
                    <li v-else-if="fontOptions.length === 0">{{ $t('mo-ren-zi-ti') }}</li>
                    <li v-else v-for="option in fontOptions" :key="option.value" :style="{ fontFamily: option.value }"
                        @click="selectFontOption(option)">
                        {{ option.displayText }}
                    </li>
                </ul>

                <div v-if="selectionType === 'highDpi'" class="scale-slider-container">
                    <div class="scale-slider-label">{{ $t('suo-fang-yin-zi') }}: {{ dpiScale }} <span
                            class="scale-slider-hint">{{ $t('tiao-zheng-hou-xu-zhong-qi') }}</span></div>
                    <div class="scale-slider-wrapper">
                        <input type="range" min="0.5" max="2" step="0.1" v-model="dpiScale" class="scale-slider" />
                        <div class="scale-marks">
                            <span>0.5</span>
                            <span>1.0</span>
                            <span>1.5</span>
                            <span>2.0</span>
                        </div>
                    </div>
                </div>

                <div v-if="selectionType === 'apiMode' && selectedSettings.apiMode.value === 'on'"
                    class="api-settings-container">
                    <div class="api-setting-item">
                        <label>{{ $t('api-di-zhi') }}</label>
                        <input type="text" :value="defaultApiBaseUrl" readonly class="api-input" />
                    </div>
                    <div class="api-setting-item">
                        <label>{{ $t('websocket-di-zhi') }}</label>
                        <input type="text" value="ws://127.0.0.1:6520" readonly class="api-input" />
                    </div>
                    <div class="api-hint">
                        {{ $t('mo-ren-api-ti-shi') }}
                    </div>
                </div>
                <div v-if="selectionType === 'apiBaseUrlMode' && selectedSettings.apiBaseUrlMode.value === 'custom'"
                    class="api-settings-container">
                    <div class="api-setting-item">
                        <input type="text" v-model="apiBaseUrlForm.url" class="api-input"
                            :placeholder="`RPC地址（留空使用默认：${defaultApiBaseUrl}）`" />
                    </div>
                    <div class="proxy-actions">
                        <button @click="testApiBaseUrl" :disabled="apiBaseUrlForm.testing" class="test-button">
                            {{ apiBaseUrlForm.testing ? $t('zheng-zai-ce-shi') : $t('ce-shi-lian-jie') }}
                        </button>
                        <button class="primary" @click="saveApiBaseUrl">
                            {{ $t('bao-cun-she-zhi-an-niu') }}
                        </button>
                    </div>
                    <div v-if="apiBaseUrlForm.testResult" :class="['proxy-test-result', apiBaseUrlForm.testStatus]">
                        {{ apiBaseUrlForm.testResult }}
                    </div>
                </div>
                <div v-if="selectionType === 'proxy' && selectedSettings.proxy.value === 'on'"
                    class="proxy-settings-container">
                    <div class="api-setting-item">
                        <input type="text" v-model="proxyForm.url" class="api-input"
                            :placeholder="$t('dai-li-placeholder')" />
                    </div>
                    <div class="proxy-actions">
                        <button @click="testProxyConnection" :disabled="proxyForm.testing" class="test-button">
                            {{ proxyForm.testing ? $t('zheng-zai-ce-shi') : $t('ce-shi-lian-jie') }}
                        </button>
                        <button class="primary" @click="saveProxy">
                            {{ $t('bao-cun-she-zhi-an-niu') }}
                        </button>
                    </div>
                    <div v-if="proxyForm.testResult" :class="['proxy-test-result', proxyForm.testStatus]">
                        {{ proxyForm.testResult }}
                    </div>
                </div>
                <button @click="closeSelection">{{ $t('guan-bi-an-niu') }}</button>
            </div>
        </div>

        <!-- 快捷键设置弹窗 -->
        <div v-if="showShortcutModal" class="shortcut-modal" @click.self="closeShortcutSettings">
            <div class="shortcut-modal-content">
                <h3>{{ $t('kuai-jie-jian-she-zhi') }}</h3>
                <div class="shortcut-list">
                    <div class="shortcut-item" v-for="(config, key) in shortcutConfigs" :key="key">
                        <span>{{ config.label }}</span>
                        <div class="shortcut-input" @click="startRecording(key)"
                            :class="{ 'recording': recordingKey === key }">
                            <!-- {{ displayShortcut(key) || $t('dian-ji-she-zhi-kuai-jie-jian') }} -->
                            <span v-html="displayShortcut(key) || $t('dian-ji-she-zhi-kuai-jie-jian')" />
                            <div v-if="shortcuts[key]" class="clear-shortcut" @click.stop="clearShortcut(key)">
                                ×
                            </div>
                        </div>
                    </div>
                </div>
                <div class="shortcut-modal-footer">
                    <button @click="closeShortcutSettings">{{ $t('qu-xiao') }}</button>
                    <button @click="saveShortcuts" class="primary">{{ $t('bao-cun') }}</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, getCurrentInstance, onUnmounted, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { MoeAuthStore } from '../stores/store';
import ExtensionManager from '@/components/ExtensionManager.vue';
import { applyCustomFont, requestMicrophonePermission } from '../utils/utils';
import { DEFAULT_API_BASE_URL, validateApiBaseUrl, testApiBaseUrl as testApiBaseUrlRequest } from '@/utils/apiBaseUrl';
import { useSettingsConfig } from '@/config/settings';
import { ONBOARDING_GUIDE_EVENT } from '@/config/onboardingGuide';

const MoeAuth = MoeAuthStore();
const { t } = useI18n();
const { proxy } = getCurrentInstance();
const appVersion = ref('');
const platform = ref('');
const activeTab = ref(0);
const defaultApiBaseUrl = DEFAULT_API_BASE_URL;

const {
    settingSections,
    shortcutConfigs
} = useSettingsConfig(t, {
    openShortcutSettings: () => openShortcutSettings(),
    installPWA: () => installPWA(),
    openOnboardingGuide: () => openOnboardingGuide()
});

const createSelectedSettings = (sections) => {
    const selectedSettings = {};

    sections.forEach(section => {
        section.items.forEach(item => {
            if (!Object.prototype.hasOwnProperty.call(item, 'defaultValue')) return;
            const option = item.options?.find(option => option.value === item.defaultValue);
            selectedSettings[item.key] = {
                displayText: item.defaultDisplayText ?? option?.displayText ?? '',
                value: item.defaultValue
            };
        });
    });

    return selectedSettings;
};

const selectedSettings = ref(createSelectedSettings(settingSections.value));

const isSelectionOpen = ref(false);
const currentHelpLink = ref('');
const selectionType = ref('');
const fontOptions = ref([]);
const fontOptionsLoading = ref(false);

const showRefreshHint = ref({});

const audioOutputDeviceOptions = ref([]);
const audioOutputDevicesLoading = ref(false);

const updateAudioOutputDeviceDisplayText = async (deviceId) => {
    if (!deviceId || deviceId === 'default') {
        selectedSettings.value.audioOutputDevice = { displayText: '默认', value: 'default' };
        return;
    }

    let displayText = `已选择设备 (${deviceId.slice(0, 8)}...)`;
    try {
        if (navigator?.mediaDevices?.enumerateDevices) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const matched = devices.find(d => d.kind === 'audiooutput' && d.deviceId === deviceId);
            if (matched?.label) displayText = matched.label;
        }
    } catch {
        // 忽略枚举失败
    }

    selectedSettings.value.audioOutputDevice = { displayText, value: deviceId };
};

const loadAudioOutputDevices = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
        audioOutputDeviceOptions.value = [];
        return;
    }

    audioOutputDevicesLoading.value = true;

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter(d => d.kind === 'audiooutput');

        const options = [{ displayText: '默认', value: 'default' }];
        let unnamedIndex = 1;

        for (const output of outputs) {
            if (!output.deviceId) continue;
            const displayText = output.label || `输出设备 ${unnamedIndex++}`;
            options.push({ displayText, value: output.deviceId });
        }

        const seen = new Set();
        audioOutputDeviceOptions.value = options.filter(opt => {
            if (seen.has(opt.value)) return false;
            seen.add(opt.value);
            return true;
        });
    } catch {
        audioOutputDeviceOptions.value = [{ displayText: '默认', value: 'default' }];
    } finally {
        audioOutputDevicesLoading.value = false;
    }
};

const loadLocalFonts = async () => {
    fontOptionsLoading.value = true;

    try {
        if (!window.queryLocalFonts) {
            fontOptions.value = [];
            return;
        }

        const fonts = await window.queryLocalFonts();
        const families = [...new Set(fonts.map(font => font.family).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b)
        );
        fontOptions.value = [
            { displayText: t('mo-ren-zi-ti'), value: '' },
            ...families.map(family => ({ displayText: family, value: family }))
        ];
    } catch {
        fontOptions.value = [];
    } finally {
        fontOptionsLoading.value = false;
    }
};

const openSelection = (type, helpLink) => {
    isSelectionOpen.value = true;
    selectionType.value = type;
    currentHelpLink.value = helpLink || getSettingItem(type)?.helpLink || '';

    if (type === 'highDpi') {
        dpiScale.value = parseFloat(selectedSettings.value.dpiScale?.value || '1.0');
    }

    if (type === 'font') void loadLocalFonts();

    if (type === 'proxy') {
        proxyForm.url = selectedSettings.value.proxyUrl?.value || '';
    }

    if (type === 'apiBaseUrlMode') {
        apiBaseUrlForm.url = selectedSettings.value.apiBaseUrl?.value || '';
        apiBaseUrlForm.testResult = '';
        apiBaseUrlForm.testStatus = '';
    }

    if (type === 'audioOutputDevice') {
        void loadAudioOutputDevices();
    }
};

const openHelpLink = () => {
    const url = currentHelpLink.value;
    if (!url) return;
    if (isElectron()) {
        window.electron.ipcRenderer.send('open-url', url);
    } else {
        window.open(url, '_blank');
    }
};

const getSettingItem = (key) => {
    for (const section of settingSections.value) {
        const item = section.items.find(item => item.key === key);
        if (item) return item;
    }
    return null;
};

const getVisibleItems = (section) => section.items.filter(item => !item.hidden && !getUnavailableSettingText(item));

const markRefreshHint = (key) => {
    if (getSettingItem(key)?.showRefreshHint) {
        showRefreshHint.value[key] = true;
    }
};

const shouldKeepSelectionOpen = (key) => {
    return settingSections.value.some(section => section.items.some(item =>
        item.keepOpen && item.key === key
    ));
};

const getUnavailableSettingText = (item) => {
    const available = item?.available?.toLowerCase();
    if (!available) return '';
    const currentPlatform = isElectron() ? window.electron.platform : 'web';
    if (available === currentPlatform || available === 'client' && isElectron()) return '';
    return item.unavailableText || t('fei-ke-hu-duan-huan-jing-wu-fa-qi-yong');
};

const selectActions = {
    applyThemeColor: (option) => proxy.$applyColorTheme(option.value),
    applyTheme: (option) => proxy.$setTheme(option.value),
    applyLanguage: (option) => {
        proxy.$i18n.locale = option.value;
        document.documentElement.lang = option.value;
    },
    checkQualityAuth: () => {
        if (!MoeAuth.isAuthenticated) {
            window.$modal.alert(t('gao-pin-zhi-yin-le-xu-yao-deng-lu-hou-cai-neng-bo-fango'));
        }
    },
    saveDpiScale: () => {
        selectedSettings.value.dpiScale = {
            value: dpiScale.value.toString(),
            displayText: dpiScale.value.toString()
        };
    },
    toggleDesktopLyrics: (option) => {
        const action = option.value === 'on' ? 'display-lyrics' : 'close-lyrics';
        window.electron.ipcRenderer.send('desktop-lyrics-action', action);
    },
    dispatchLoudnessNormalization: (option) => {
        window.dispatchEvent(new CustomEvent('loudness-normalization-change', {
            detail: { enabled: option.value === 'on' }
        }));
    },
    updateAudioOutputWatch: async (option) => {
        if (option.value === 'on') {
            const granted = await requestMicrophonePermission();
            if (!granted) {
                selectedSettings.value.pauseOnAudioOutputChange = {
                    displayText: t('guan-bi'),
                    value: 'off'
                };
                window.dispatchEvent(new CustomEvent('audio-output-device-watch-change', {
                    detail: { enabled: false }
                }));
                window.$modal.alert('音频权限申请失败，无法启用该功能');
                return;
            }
        }

        window.dispatchEvent(new CustomEvent('audio-output-device-watch-change', {
            detail: { enabled: option.value === 'on' }
        }));
    },
    resetApiBaseUrl: (option) => {
        if (option.value === 'default') {
            selectedSettings.value.apiBaseUrl = { displayText: '', value: '' };
        }
    },
    dispatchAudioOutputDevice: (option) => {
        window.dispatchEvent(new CustomEvent('audio-output-device-change', {
            detail: { deviceId: option.value }
        }));
    },
    handleLogAction: async (option) => {
        let result;
        switch (option.value) {
            case 'open-path':
                result = await window.electronAPI.openLogPath();
                break;
            case 'export-log':
                result = await window.electronAPI.exportLog();
                break;
            default:
                break;
        }
        if (result?.error) {
            console.error(`日志操作 ${option.value} 失败:`, result.error);
            window.$modal.alert(`日志操作失败，详细信息请查看控制台`);
        }
        if (option.value === 'export-log' && result?.filePath) {
            await window.$modal.alert(`日志(已脱敏)已导出到:\n${result.filePath}`);
        }
    }
};

const runSelectAction = async (item, option) => {
    if (!item?.selectAction) return;
    await selectActions[item.selectAction]?.(option);
};

const selectOption = async (option) => {
    const settingItem = getSettingItem(selectionType.value);
    const unavailableText = getUnavailableSettingText(settingItem);
    if (unavailableText) {
        window.$modal.alert(unavailableText);
        return;
    }
    selectedSettings.value[selectionType.value] = option;
    await runSelectAction(settingItem, option);
    saveSettings();
    if (!shouldKeepSelectionOpen(selectionType.value)) closeSelection();
    markRefreshHint(selectionType.value);
};

const selectFontOption = (option) => {
    selectedSettings.value.font = {
        displayText: option.displayText,
        value: option.value
    };
    applyCustomFont(option.value);
    saveSettings();
    closeSelection();
    markRefreshHint('font');
};

const isElectron = () => {
    return typeof window !== 'undefined' && typeof window.electron !== 'undefined';
};
const saveSettings = () => {
    const settingsToSave = Object.fromEntries(
        Object.entries(selectedSettings.value).map(([key, setting]) => [key, setting.value])
    );
    settingsToSave.shortcuts = shortcuts.value;
    localStorage.setItem('settings', JSON.stringify(settingsToSave));
    window.dispatchEvent(new CustomEvent('settings-change', {
        detail: { settings: settingsToSave }
    }));
    isElectron() && window.electron.ipcRenderer.send('save-settings', JSON.parse(JSON.stringify(settingsToSave)));
};

const closeSelection = () => {
    isSelectionOpen.value = false;
};

onMounted(() => {
    const savedSettings = JSON.parse(localStorage.getItem('settings'));

    if (savedSettings) {
        if (savedSettings.apiBaseUrlMode === undefined) {
            const legacyUrl = savedSettings.apiBaseUrl || '';
            savedSettings.apiBaseUrlMode = legacyUrl ? 'custom' : 'default';
        }
        for (const key in savedSettings) {
            if (key === 'shortcuts') continue;
            if (key === 'audioOutputDevice') continue;
            const settingItem = getSettingItem(key);
            if (key === 'quality') {
                const option = settingItem.options.find(option => option.value === savedSettings[key]) || settingItem.options[0];
                selectedSettings.value[key] = { ...option };
                continue;
            }
            if (key === 'apiBaseUrlMode') {
                const value = savedSettings[key] || 'default';
                selectedSettings.value[key] = {
                    displayText: value === 'custom' ? '自定义' : '默认',
                    value: value
                };
                continue;
            }
            if (key === 'apiBaseUrl') {
                const value = savedSettings[key] || '';
                selectedSettings.value[key] = { displayText: '', value: value };
                continue;
            }
            if (key === 'dpiScale') {
                const value = savedSettings[key] || '1.0';
                selectedSettings.value[key] = { displayText: value, value: value };
                continue;
            }
            if (key === 'font') {
                const value = savedSettings[key] || '';
                selectedSettings.value[key] = {
                    displayText: value || t('mo-ren-zi-ti'),
                    value: value
                };
                continue;
            }
            if (key === 'proxyUrl') {
                const value = savedSettings[key];
                selectedSettings.value[key] = {
                    displayText: value,
                    value: value
                };
                continue;
            }
            if (settingItem?.options) {
                // Always get displayText from current translation, not from localStorage
                const option = settingItem.options.find(
                    (opt) => opt.value === savedSettings[key]
                );
                const displayText = option?.displayText || '🌏 ' + t('zi-dong');
                selectedSettings.value[key] = { displayText, value: savedSettings[key] };
            }
        }
    }
    if (savedSettings?.shortcuts) {
        shortcuts.value = savedSettings.shortcuts;
    } else {
        shortcuts.value = Object.entries(shortcutConfigs).reduce((acc, [key, config]) => {
            acc[key] = config.defaultValue;
            return acc;
        }, {});
    }
    if (isElectron()) {
        appVersion.value = localStorage.getItem('version');
        platform.value = window.electron.platform;
    } else {
        appVersion.value = __VERSION__ || '';
        platform.value = 'Web';
    }

    if (savedSettings?.audioOutputDevice !== undefined) {
        void updateAudioOutputDeviceDisplayText(savedSettings.audioOutputDevice);
    }
});

const showShortcutModal = ref(false);
const recordingKey = ref('');
const shortcuts = ref({});
const proxyForm = reactive({ url: '', testing: false, testResult: '', testStatus: '' });
const apiBaseUrlForm = reactive({ url: '', testing: false, testResult: '', testStatus: '' });

const testApiBaseUrl = async () => {
    const validation = validateApiBaseUrl(apiBaseUrlForm.url);
    if (!validation.ok) {
        apiBaseUrlForm.testResult = validation.error;
        apiBaseUrlForm.testStatus = 'error';
        return;
    }

    const candidate = validation.value || defaultApiBaseUrl;
    apiBaseUrlForm.testing = true;
    apiBaseUrlForm.testResult = t('zheng-zai-ce-shi');
    apiBaseUrlForm.testStatus = 'testing';

    const result = await testApiBaseUrlRequest(candidate, { path: '/register/dev' });
    apiBaseUrlForm.testing = false;

    if (result.ok) {
        apiBaseUrlForm.testResult = '连接成功';
        apiBaseUrlForm.testStatus = 'success';
    } else if (result.error === 'timeout') {
        apiBaseUrlForm.testResult = t('lian-jie-chao-shi');
        apiBaseUrlForm.testStatus = 'error';
    } else if (result.error === 'no_dfid') {
        apiBaseUrlForm.testResult = 'RPC端点协议不符合';
        apiBaseUrlForm.testStatus = 'error';
    } else if (typeof result.status === 'number') {
        apiBaseUrlForm.testResult = `连接失败：${result.status} ${result.statusText || ''}`.trim();
        apiBaseUrlForm.testStatus = 'error';
    } else {
        apiBaseUrlForm.testResult = `连接错误：${result.error || ''}`.trim();
        apiBaseUrlForm.testStatus = 'error';
    }
};

const saveApiBaseUrl = () => {
    const validation = validateApiBaseUrl(apiBaseUrlForm.url);
    if (!validation.ok) {
        window.$modal.alert(validation.error);
        return;
    }

    const value = validation.value;
    if (!value) {
        selectedSettings.value.apiBaseUrlMode = { displayText: '默认', value: 'default' };
        selectedSettings.value.apiBaseUrl = { displayText: '', value: '' };
    } else {
        selectedSettings.value.apiBaseUrlMode = { displayText: '自定义', value: 'custom' };
        selectedSettings.value.apiBaseUrl = { displayText: '', value: value };
    }
    saveSettings();
    markRefreshHint('apiBaseUrlMode');
    closeSelection();
};

const testProxyConnection = async () => {
    const proxyUrl = proxyForm.url.trim();
    if (!proxyUrl) {
        proxyForm.testResult = t('qing-shu-ru-dai-li-di-zhi');
        proxyForm.testStatus = 'error';
        return;
    }

    try {
        const url = new URL(proxyUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
            proxyForm.testResult = t('zhi-chi-http-https-dai-li');
            proxyForm.testStatus = 'error';
            return;
        }
    } catch (e) {
        proxyForm.testResult = t('qing-shu-ru-you-xiao-de-url');
        proxyForm.testStatus = 'error';
        return;
    }

    proxyForm.testing = true;
    proxyForm.testResult = t('zheng-zai-ce-shi');
    proxyForm.testStatus = 'testing';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const proxyUrl = new URL(proxyForm.url.trim());
        const fetchOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Proxy-Authorization': `Basic ${btoa(`${proxyUrl.username || ''}:${proxyUrl.password || ''}`)}`,
            },
            signal: controller.signal,
            agent: {
                protocol: proxyUrl.protocol,
                host: proxyUrl.hostname,
                port: proxyUrl.port,
                auth: proxyUrl.username && proxyUrl.password ?
                    `${proxyUrl.username}:${proxyUrl.password}` : undefined
            }
        };

        const response = await fetch('https://api.ipify.org?format=json', fetchOptions);
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            proxyForm.testResult = t('dai-li-lian-jie-cheng-gong') + data.ip;
            proxyForm.testStatus = 'success';
        } else {
            proxyForm.testResult = t('dai-li-lian-jie-shi-bai') + response.statusText;
            proxyForm.testStatus = 'error';
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            proxyForm.testResult = t('lian-jie-chao-shi');
        } else {
            proxyForm.testResult = t('lian-jie-cuo-wu') + error.message;
        }
        proxyForm.testStatus = 'error';
    } finally {
        proxyForm.testing = false;
    }
};

const saveProxy = () => {
    const proxyUrl = proxyForm.url.trim();

    try {
        if (proxyUrl) {
            const url = new URL(proxyUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
                window.$modal.alert(t('zhi-chi-http-https-dai-li'));
                return;
            }
        }
    } catch (e) {
        window.$modal.alert(t('qing-shu-ru-you-xiao-de-url'));
        return;
    }

    // 更新代理状态
    selectedSettings.value.proxy = {
        displayText: proxyUrl ? t('qi-yong') : t('jin-yong'),
        value: proxyUrl ? 'on' : 'off'
    };

    // 更新代理地址
    selectedSettings.value.proxyUrl = {
        displayText: proxyUrl,
        value: proxyUrl
    };

    saveSettings();
    closeSelection();
};

const openOnboardingGuide = () => {
    window.dispatchEvent(new CustomEvent(ONBOARDING_GUIDE_EVENT, {
        detail: { reset: true }
    }));
};

const openShortcutSettings = () => {
    showShortcutModal.value = true;
};

const closeShortcutSettings = () => {
    showShortcutModal.value = false;
    recordingKey.value = '';
};

const displayShortcut = (key) => {
    if (!shortcuts.value?.[key]) return false;
    const keys = {
        'Meta': isElectron() ?
            window?.electron.platform === 'darwin' ? '⌘' : '<i class="fab fa-windows"></i>' :
            '⌘/<i class="fab fa-windows"></i>',
        'num0': 'Num0',
        'num1': 'Num1',
        'num2': 'Num2',
        'num3': 'Num3',
        'num4': 'Num4',
        'num5': 'Num5',
        'num6': 'Num6',
        'num7': 'Num7',
        'num8': 'Num8',
        'num9': 'Num9',
        'numdec': 'Num.',
        'numadd': 'Num+',
        'numsub': 'Num-',
        'nummult': 'Num*',
        'numdiv': 'Num/',
    };
    let display = shortcuts.value[key];
    Object.keys(keys).forEach(k => {
        display = display.replace(k, keys[k]);
    });
    return display;
};

const startRecording = (key) => {
    recordingKey.value = key;
    shortcuts.value[key] = t('qing-an-xia-xiu-shi-jian');
    window.addEventListener('keydown', recordShortcut);
};

const recordShortcut = (e) => {
    if (!recordingKey.value) return;

    e.preventDefault();
    const keys = [];

    // 修饰键
    if (e.metaKey) keys.push('Meta');
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');

    // 如果按下了修饰键，更新提示
    if (keys.length > 0 && ['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        shortcuts.value[recordingKey.value] = keys.join('+') + t('qing-an-xia-qi-ta-jian');
        return;
    }

    // 特殊键映射
    const specialKeys = {
        'Space': 'Space',
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right',
        'Escape': 'Esc',
        'Backspace': 'Backspace',
        'Delete': 'Delete',
        'Enter': 'Return',
        'Tab': 'Tab',
        'PageUp': 'PageUp',
        'PageDown': 'PageDown',
        'Home': 'Home',
        'End': 'End',

        // Numpad
        'Numpad0': 'num0',
        'Numpad1': 'num1',
        'Numpad2': 'num2',
        'Numpad3': 'num3',
        'Numpad4': 'num4',
        'Numpad5': 'num5',
        'Numpad6': 'num6',
        'Numpad7': 'num7',
        'Numpad8': 'num8',
        'Numpad9': 'num9',
        'NumpadDecimal': 'numdec',
        'NumpadAdd': 'numadd',
        'NumpadSubtract': 'numsub',
        'NumpadMultiply': 'nummult',
        'NumpadDivide': 'numdiv',
    };

    const key = specialKeys[e.code] || e.key.toUpperCase();

    // 只有当按下的不是单独的修饰键时才结束记录
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        keys.push(key);

        if (keys.length > 0) {
            // 检查是否包含必要的修饰键
            if (!keys.some(k => ['Ctrl', 'Alt', 'Shift', 'Meta'].includes(k))) {
                window.$modal.alert(t('kuai-jie-jian-bi-xu-bao-han-zhi-shao-yi-ge-xiu-shi-jian-ctrlaltshiftcommand'));
                return;
            }

            // 检查快捷键冲突
            const newShortcut = keys.join('+');
            const conflictKey = Object.entries(shortcuts.value).find(([k, v]) =>
                v === newShortcut && k !== recordingKey.value
            );

            if (conflictKey) {
                window.$modal.alert(t('gai-kuai-jie-jian-yu') + conflictKey[0] + t('de-kuai-jie-jian-chong-tu'));
                return;
            }

            shortcuts.value[recordingKey.value] = newShortcut;
            recordingKey.value = '';
            window.removeEventListener('keydown', recordShortcut);
        }
    }
};

// 添加快捷键验证函数
const validateShortcut = (shortcut) => {
    const keys = shortcut.split('+');
    return keys.some(k => ['Ctrl', 'Alt', 'Shift', 'Meta'].includes(k));
};

// 修改 saveShortcuts 函数，添加检查
const saveShortcuts = () => {
    if (!isElectron()) {
        window.$modal.alert(t('fei-ke-hu-duan-huan-jing-wu-fa-qi-yong'));
        return;
    }

    // 验证所有快捷键
    const invalidShortcuts = Object.entries(shortcuts.value).filter(([key, value]) =>
        value && !validateShortcut(value)
    );

    if (invalidShortcuts.length > 0) {
        window.$modal.alert(t('cun-zai-wu-xiao-de-kuai-jie-jian-she-zhi-qing-que-bao-mei-ge-kuai-jie-jian-du-bao-han-xiu-shi-jian'));
        return;
    }

    try {
        let settingsToSave = JSON.parse(localStorage.getItem('settings')) || {};
        settingsToSave.shortcuts = shortcuts.value;
        localStorage.setItem('settings', JSON.stringify(settingsToSave));
        window.electron.ipcRenderer.send('save-settings', JSON.parse(JSON.stringify(settingsToSave)));
        window.electron.ipcRenderer.send('custom-shortcut');
    } catch (error) {
        console.error('保存设置失败:', error);
        window.$modal.alert(t('bao-cun-she-zhi-shi-bai'));
    }

    closeShortcutSettings();
};

onUnmounted(() => {
    window.removeEventListener('keydown', recordShortcut);
});

const clearShortcut = (key) => {
    shortcuts.value[key] = '';
};

const dpiScale = ref(1.0);

const openResetConfirmation = async () => {
    const result = await window.$modal.confirm(t('ni-que-ren-hui-fu-chu-chang'));
    if (result) {
        localStorage.clear();
        isElectron() && window.electron.ipcRenderer.send('clear-settings');
        window.$modal.alert(t('hui-fu-chu-chang-she-zhi-cheng-gong'));
    }
};

let deferredPrompt;
if (!isElectron()) {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });
}

const installPWA = async () => {
    if (isElectron()) {
        window.$modal.alert(t('qing-zai-web-huan-jing-xia-an-zhuang'));
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
        console.log('User accepted the PWA installation');
        deferredPrompt = null;
    } else {
        console.log('User declined the PWA installation');
    }
};
</script>

<style lang="scss" scoped>
$primary: var(--color-primary);
$primary-light: var(--color-primary-light);
$text-muted: #666;
$border-light: #eaeaea;
$shadow-light: rgba(0, 0, 0, 0.15);
$shadow-medium: rgba(0, 0, 0, 0.18);

.settings-page {
    display: flex;
    height: 100vh;
    overflow: hidden;
    box-shadow: 0 0 30px $shadow-light;
    border-radius: 8px;
    margin-bottom: -80px;
}

.settings-sidebar {
    width: 220px;
    box-shadow: 0 0 10px $shadow-light;
    padding: 20px 0;
    overflow-y: auto;
}

.sidebar-item {
    padding: 12px 20px;
    margin: 4px 10px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;

    i {
        margin-right: 12px;
        font-size: 16px;
        width: 20px;
        text-align: center;
    }

    &.active {
        background-color: $primary-light;
        color: $primary;
        font-weight: 500;
    }

    &:hover:not(.active) {
        background-color: var(--hover-color, #efefef);
    }
}

.settings-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
}

.setting-section {
    animation: fadeIn 0.3s ease;

    h3 {
        font-size: 22px;
        font-weight: 600;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid $border-light;
    }
}

.settings-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;

    .setting-card-header i {
        color: var(--primary-color);
    }
}

.setting-card {
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 4px 16px $shadow-light;
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px $shadow-medium;
    }

    &-header {
        display: flex;
        align-items: center;
        margin-bottom: 12px;

        i {
            color: $primary;
            margin-right: 10px;
            font-size: 16px;
        }
    }

    &-value {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 14px;
        border: 1px solid $border-light;

        i {
            color: #999;
            font-size: 12px;
        }
    }
}

.refresh-hint {
    color: #ff4d4f;
    font-size: 12px;
    margin-left: 8px;
}

.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-in-out;
    z-index: 999;
}

.modal-content {
    background: white;
    padding: 25px;
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    animation: slideIn 0.3s ease-in-out;
    position: relative;
    max-height: 80vh;
    overflow: hidden;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;

    h3 {
        flex: 0 0 auto;
        font-size: 20px;
        margin-bottom: 20px;
        color: #333;
    }

    ul {
        flex: 1 1 auto;
        min-height: 0;
        max-height: 46vh;
        overflow-y: auto;
        list-style: none;
        padding: 0 4px 0 0;
        margin: 0;
        overscroll-behavior: contain;
    }

    li {
        padding: 12px;
        margin: 6px 0;
        background-color: var(--background-color);
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
            background-color: var(--secondary-color);
        }
    }

    button {
        flex: 0 0 auto;
        margin-top: 20px;
        padding: 10px 20px;
        background-color: $primary;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        transition: background-color 0.3s;

        &:hover {
            background-color: $primary;
        }
    }

    > button {
        align-self: center;
        min-width: 96px;
    }
}

.help-link {
    position: absolute;
    top: 12px;
    right: 12px;
    color: $primary;
    cursor: pointer;
    text-decoration: none;
    font-size: 18px;

    &:hover {
        opacity: 0.85;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes slideIn {
    from {
        transform: translateY(-20px);
    }

    to {
        transform: translateY(0);
    }
}

.shortcut-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.shortcut-modal-content {
    background: white;
    border-radius: 12px;
    padding: 20px;
    width: 90%;
    max-width: 500px;

    h3 {
        margin: 0 0 20px 0;
        font-size: 18px;
        text-align: center;
    }
}

.shortcut-list {
    margin-bottom: 20px;
    max-height: 60vh;
    overflow-y: auto;
}

.shortcut-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #eee;
}

.shortcut-input {
    position: relative;
    background: #f5f5f5;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    min-width: 150px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 15px;

    &.recording {
        background: $primary;
        color: white;

        .clear-shortcut {
            background: rgba(255, 255, 255, 0.2);
            color: white;

            &:hover {
                background: rgba(255, 255, 255, 0.3);
                color: white;
            }
        }
    }
}

.clear-shortcut {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.1);
    cursor: pointer;
    font-size: 14px;
    color: $text-muted;
    transition: all 0.2s;
    position: absolute;
    right: 5px;
}

.shortcut-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;

    button {
        padding: 8px 20px;
        border-radius: 6px;
        border: none;
        cursor: pointer;

        &.primary {
            background: $primary;
            color: white;
        }
    }
}

.version-info {
    text-align: center;
    margin-top: 20px;
    font-size: 14px;
    color: $text-muted;
}

.reset-settings-container {
    display: flex;
    justify-content: center;
    margin: 30px 0 20px 0;
}

.reset-settings-button {
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.3s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    gap: 8px;

    &:hover {
        background-color: #e53935;
    }
}

.scale-slider-container {
    margin-top: 15px;
    text-align: left;
    padding: 15px;
    background-color: var(--background-color);
    border-radius: 8px;
}

.scale-slider-label {
    font-weight: bold;
    margin-bottom: 10px;
}

.scale-slider-hint {
    font-size: 12px;
    color: $text-muted;
}

.scale-slider-wrapper {
    position: relative;
    padding-bottom: 20px;
}

.scale-slider {
    width: 100%;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: #ddd;
    outline: none;
    border-radius: 3px;

    &::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: $primary;
        cursor: pointer;
    }

    &::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: $primary;
        cursor: pointer;
        border: none;
    }
}

.scale-marks {
    display: flex;
    justify-content: space-between;
    margin-top: 5px;
    font-size: 12px;
    color: $text-muted;
}

.api-settings-container,
.proxy-settings-container {
    display: flex;
    flex-direction: column;
    align-items: center;

    .api-setting-item {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        margin-bottom: 10px;
        width: 100%;

        label {
            font-size: 14px;
            color: #333;
            margin-bottom: 5px;
        }

        .api-input {
            width: 100%;
            height: 35px;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 5px;
            padding-left: 10px;
            box-sizing: border-box;
        }
    }

    .api-hint {
        font-size: 12px;
        color: #999;
        text-align: center;
    }
}

.proxy-actions {
    display: flex;
    gap: 12px;
    width: 100%;

    button {
        flex: 1;
        min-width: 0;
        padding: 8px 0;
        border-radius: 6px;
    }
}

.proxy-test-result {
    font-size: 13px;
    line-height: 18px;
    margin-top: 5px;

    &.success {
        color: #4caf50;
    }

    &.error {
        color: #e53935;
    }
}
</style>

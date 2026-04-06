<template>
    <div class="settings-page">
        <div class="settings-sidebar">
            <div v-for="(section, sectionIndex) in settingSections" :key="sectionIndex" class="sidebar-item"
                :class="{ active: activeTab === sectionIndex }" @click="activeTab = sectionIndex">
                <i :class="getSectionIcon(section.title)"></i>
                <span>{{ section.title }}</span>
            </div>
        </div>

        <div class="settings-content">
            <div v-for="(section, sectionIndex) in settingSections" :key="sectionIndex" class="setting-section"
                v-show="activeTab === sectionIndex">
                <h3>{{ section.title }}</h3>
                <ExtensionManager v-if="section.title === t('cha-jian')" />
                <div v-else class="settings-cards">
                    <div v-for="(item, itemIndex) in section.items" :key="itemIndex" class="setting-card"
                        @click="item.action ? item.action(item.helpLink) : openSelection(item.key, item.helpLink)">
                        <div class="setting-card-header">
                            <i :class="getItemIcon(item.key)"></i>
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

        <div v-if="isSelectionOpen" class="modal">
            <div class="modal-content">
                <a v-if="currentHelpLink" class="help-link" @click="openHelpLink" :title="$t('bang-zhu')"
                    :aria-label="$t('bang-zhu')">
                    <i class="fas fa-question-circle"></i>
                </a>
                <h3>{{ selectionTypeMap[selectionType].title }}</h3>
                <ul v-if="selectionType !== 'font' && selectionType !== 'audioOutputDevice'">
                    <li v-for="option in selectionTypeMap[selectionType].options" :key="option"
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

                <div v-if="selectionType === 'font'" class="api-settings-container" @focusout="handleFontFocusOut">
                    <div class="api-setting-item">
                        <label>{{ $t('zi-ti-url-di-zhi') }}</label>
                        <input type="text" v-model="fontUrlInput" class="api-input"
                            :placeholder="$t('qing-shu-ru-zi-ti-url-di-zhi')" />
                    </div>
                    <div class="api-setting-item">
                        <label>{{ $t('zi-ti-ming-cheng') }}</label>
                        <input type="text" v-model="fontFamilyInput" class="api-input"
                            :placeholder="$t('qing-shu-ru-zi-ti-ming-cheng')" />
                    </div>
                </div>

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
        <div v-if="showShortcutModal" class="shortcut-modal">
            <div class="shortcut-modal-content">
                <h3>{{ $t('kuai-jie-jian-she-zhi') }}</h3>
                <div class="shortcut-list">
                    <div class="shortcut-item" v-for="(config, key) in shortcutConfigs" :key="key">
                        <span>{{ config.label }}</span>
                        <div class="shortcut-input" @click="startRecording(key)"
                            :class="{ 'recording': recordingKey === key }">
                            {{ shortcuts[key] || $t('dian-ji-she-zhi-kuai-jie-jian') }}
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
import { ref, onMounted, getCurrentInstance, onUnmounted, computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { MoeAuthStore } from '../stores/store';
import ExtensionManager from '@/components/ExtensionManager.vue';
import { requestMicrophonePermission } from '../utils/utils';
import { DEFAULT_API_BASE_URL, validateApiBaseUrl, testApiBaseUrl as testApiBaseUrlRequest } from '@/utils/apiBaseUrl';

const MoeAuth = MoeAuthStore();
const { t } = useI18n();
const { proxy } = getCurrentInstance();
const appVersion = ref('');
const platform = ref('');
const activeTab = ref(0);
const defaultApiBaseUrl = DEFAULT_API_BASE_URL;

// 设置配置
const selectedSettings = ref({
    language: { displayText: '🌏 ' + t('zi-dong'), value: '' },
    themeColor: { displayText: t('shao-nv-fen'), value: 'pink' },
    theme: { displayText: '☀️ ' + t('qian-se'), value: 'light' },
    nativeTitleBar: { displayText: t('guan-bi'), value: 'off' },
    quality: { displayText: '标准音质 - 128Kbps', value: '128' },
    lyricsBackground: { displayText: t('da-kai'), value: 'on' },
    desktopLyrics: { displayText: t('guan-bi'), value: 'off' },
    statusBarLyrics: { displayText: t('guan-bi'), value: 'off' },
    lyricsFontSize: { displayText: t('zhong'), value: '24px' },
    lyricsTranslation: { displayText: t('da-kai'), value: 'on' },
    lyricsAlign: { displayText: t('ju-zhong'), value: 'center' },
    font: { displayText: t('mo-ren-zi-ti'), value: '' },
    fontUrl: { displayText: t('mo-ren-zi-ti'), value: '' },
    greetings: { displayText: t('kai-qi'), value: 'on' },
    gpuAcceleration: { displayText: t('guan-bi'), value: 'off' },
    minimizeToTray: { displayText: t('da-kai'), value: 'on' },
    highDpi: { displayText: t('guan-bi'), value: 'off' },
    dpiScale: { displayText: '1.0', value: '1.0' },
    apiMode: { displayText: t('guan-bi'), value: 'off' },
    touchBar: { displayText: t('guan-bi'), value: 'off' },
    autoStart: { displayText: t('guan-bi'), value: 'off' },
    startMinimized: { displayText: t('guan-bi'), value: 'off' },
    preventAppSuspension: { displayText: t('guan-bi'), value: 'off' },
    networkMode: { displayText: t('zhu-wang'), value: 'mainnet' },
    proxy: { displayText: t('guan-bi'), value: 'off' },
    proxyUrl: { displayText: '', value: '' },
    apiBaseUrlMode: { displayText: '默认', value: 'default' },
    apiBaseUrl: { displayText: '', value: '' },
    dataSource: { displayText: t('gai-nian-ban-xuan-xiang'), value: 'concept' },
    loudnessNormalization: { displayText: t('guan-bi'), value: 'off' },
    pauseOnAudioOutputChange: { displayText: t('guan-bi'), value: 'off' },
    audioOutputDevice: { displayText: '默认', value: 'default' },
});

// 设置分区配置
const settingSections = computed(() => [
    {
        title: t('jie-mian'),
        items: [
            {
                key: 'language',
                label: t('yu-yan')
            },
            {
                key: 'themeColor',
                label: t('zhu-se-tiao'),
                icon: '🎨 '
            },
            {
                key: 'theme',
                label: t('wai-guan')
            },
            {
                key: 'nativeTitleBar',
                label: t('native-title-bar'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao')
            },
            {
                key: 'font',
                label: t('zi-ti-she-zhi'),
                showRefreshHint: true,
                refreshHintText: t('shua-xin-hou-sheng-xiao'),
                helpLink: 'https://music.moekoe.cn/guide/font-settings.html'
            }
        ]
    },
    {
        title: t('sheng-yin'),
        items: [
            {
                key: 'quality',
                label: t('yin-zhi-xuan-ze'),
                icon: '🎧 '
            },
            {
                key: 'loudnessNormalization',
                label: t('ping-heng-yin-pin-xiang-du'),
                icon: '🎚️ ',
                showRefreshHint: true,
                refreshHintText: t('shua-xin-hou-sheng-xiao')
            },
            {
                key: 'pauseOnAudioOutputChange',
                label: '输出设备变化自动暂停',
                icon: '🎧 ',
                helpLink: 'https://music.moekoe.cn/guide/auto-pause-on-output-device-change.html'
            },
            {
                key: 'audioOutputDevice',
                label: '音频输出设备',
                icon: '🔊 ',
                helpLink: 'https://music.moekoe.cn/guide/audio-output-device.html'
            },
            {
                key: 'greetings',
                label: t('qi-dong-wen-hou-yu'),
                icon: '👋 '
            },
            {
                key: 'dataSource',
                label: t('shu-ju-yuan'),
                icon: '🔌 ',
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao'),
                helpLink: 'https://music.moekoe.cn/guide/data-source.html'
            }
        ]
    },
    {
        title: t('ge-ci'),
        items: [
            {
                key: 'lyricsBackground',
                label: t('xian-shi-ge-ci-bei-jing'),
                showRefreshHint: true,
                refreshHintText: t('shua-xin-hou-sheng-xiao')
            },
            {
                key: 'lyricsFontSize',
                label: t('ge-ci-zi-ti-da-xiao'),
                showRefreshHint: true,
                refreshHintText: t('shua-xin-hou-sheng-xiao')
            },
            {
                key: 'desktopLyrics',
                label: t('xian-shi-zhuo-mian-ge-ci')
            },
            {
                key: 'statusBarLyrics',
                label: t('zhuang-tai-lan-ge-ci'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao')
            },
            {
                key: 'lyricsTranslation',
                label: t('ge-ci-fan-yi')
            },
            {
                key: 'lyricsAlign',
                label: t('dui-qi-fang-shi'),
            }
        ]
    },
    {
        title: t('cha-jian'),
        items: []
    },
    {
        title: t('xi-tong'),
        items: [
            {
                key: 'gpuAcceleration',
                label: t('jin-yong-gpu-jia-su-zhong-qi-sheng-xiao'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao')
            },
            {
                key: 'highDpi',
                label: t('shi-pei-gao-dpi'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao')
            },
            {
                key: 'minimizeToTray',
                label: t('guan-bi-shi-minimize-to-tray')
            },
            {
                key: 'autoStart',
                label: t('kai-ji-zi-qi-dong')
            },
            {
                key: 'networkMode',
                label: t('wang-luo-mo-shi'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao'),
                helpLink: 'https://music.moekoe.cn/guide/network-modes.html'
            },
            {
                key: 'startMinimized',
                label: t('qi-dong-shi-zui-xiao-hua')
            },
            {
                key: 'preventAppSuspension',
                label: t('zu-zhi-xi-tong-xiu-mian'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao')
            },
            {
                key: 'apiMode',
                label: t('api-mo-shi'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao')
            },
            {
                key: 'apiBaseUrlMode',
                label: 'RPC地址',
                showRefreshHint: true,
                refreshHintText: t('shua-xin-hou-sheng-xiao'),
                helpLink: 'https://music.moekoe.cn/guide/rpc-api-base-url.html'
            },
            {
                key: 'touchBar',
                label: 'TouchBar',
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao')
            },
            {
                key: 'shortcuts',
                label: t('quan-ju-kuai-jie-jian'),
                customText: t('zi-ding-yi-kuai-jie-jian'),
                action: openShortcutSettings
            },
            {
                key: 'pwa',
                label: t('pwa-app'),
                customText: t('install'),
                action: installPWA
            },
            {
                key: 'proxy',
                label: t('wang-luo-dai-li'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao'),
                helpLink: 'https://music.moekoe.cn/guide/proxy-settings.html'
            }
        ]
    }
]);

// 获取每个部分的图标
const getSectionIcon = (title) => {
    const iconMap = {
        [t('jie-mian')]: 'fas fa-palette',
        [t('sheng-yin')]: 'fas fa-volume-up',
        [t('ge-ci')]: 'fas fa-music',
        [t('cha-jian')]: 'fas fa-puzzle-piece',
        [t('xi-tong')]: 'fas fa-cog'
    };
    return iconMap[title] || 'fas fa-cog';
};

// 获取每个设置项的图标
const getItemIcon = (key) => {
    const iconMap = {
        'language': 'fas fa-language',
        'themeColor': 'fas fa-paint-brush',
        'theme': 'fas fa-moon',
        'nativeTitleBar': 'fas fa-window-maximize',
        'font': 'fas fa-font',
        'quality': 'fas fa-headphones',
        'loudnessNormalization': 'fas fa-sliders-h',
        'pauseOnAudioOutputChange': 'fas fa-exchange-alt',
        'audioOutputDevice': 'fas fa-volume-up',
        'greetings': 'fas fa-comment',
        'lyricsBackground': 'fas fa-image',
        'lyricsFontSize': 'fas fa-text-height',
        'desktopLyrics': 'fas fa-desktop',
        'statusBarLyrics': 'fas fa-align-justify',
        'lyricsTranslation': 'fas fa-language',
        'lyricsAlign': 'fas fa-align-center',
        'gpuAcceleration': 'fas fa-microchip',
        'highDpi': 'fas fa-expand',
        'minimizeToTray': 'fas fa-window-minimize',
        'autoStart': 'fas fa-power-off',
        'startMinimized': 'fas fa-compress',
        'preventAppSuspension': 'fas fa-clock',
        'apiMode': 'fas fa-code',
        'apiBaseUrlMode': 'fas fa-link',
        'touchBar': 'fas fa-tablet-alt',
        'shortcuts': 'fas fa-keyboard',
        'pwa': 'fas fa-mobile-alt',
        'proxy': 'fas fa-random'
    };
    return iconMap[key] || 'fas fa-sliders-h';
};

const isSelectionOpen = ref(false);
const currentHelpLink = ref('');
const selectionType = ref('');
const fontUrlInput = ref('');
const fontFamilyInput = ref('');

// 选项配置
const selectionTypeMap = {
    language: {
        title: t('xuan-ze-yu-yan'),
        options: [
            { displayText: '🇨🇳 简体中文', value: 'zh-CN' },
            { displayText: '🇨🇳 繁體中文', value: 'zh-TW' },
            { displayText: '🇺🇸 English', value: 'en' },
            { displayText: '🇷🇺 Русский', value: 'ru' },
            { displayText: '🇯🇵 日本語', value: 'ja' },
            { displayText: '🇰🇷 한국어', value: 'ko' }
        ]
    },
    themeColor: {
        title: t('xuan-ze-zhu-se-tiao'),
        options: [
            { displayText: t('shao-nv-fen'), value: 'pink' },
            { displayText: t('nan-nan-lan'), value: 'blue' },
            { displayText: t('tou-ding-lv'), value: 'green' },
            { displayText: t('mi-gan-cheng'), value: 'orange' }
        ]
    },
    theme: {
        title: t('xuan-ze-wai-guan'),
        options: [
            { displayText: '🌗 ' + t('zi-dong'), value: 'auto' },
            { displayText: '☀️ ' + t('qian-se'), value: 'light' },
            { displayText: '🌙 ' + t('shen-se'), value: 'dark' }
        ]
    },
    nativeTitleBar: {
        title: t('native-title-bar'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    quality: {
        title: t('yin-zhi-xuan-ze'),
        options: [
            { displayText: '标准音质 - 128Kbps', value: '128' },
            { displayText: '高品音质 - 320Kbps', value: '320' },
            { displayText: 'FLAC 无损', value: 'flac' },
            { displayText: 'Hi-Res 无损', value: 'high' },
            { displayText: '蝰蛇全景', value: 'viper_atmos' },
            { displayText: '蝰蛇超清', value: 'viper_clear' },
            { displayText: '蝰蛇母带', value: 'viper_tape' }
        ]
    },
    lyricsBackground: {
        title: t('xian-shi-ge-ci-bei-jing'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    desktopLyrics: {
        title: t('xian-shi-zhuo-mian-ge-ci'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    statusBarLyrics: {
        title: t('zhuang-tai-lan-ge-ci'),
        options: [
            { displayText: t('da-kai') + t('jin-zhi-chi-mac'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    lyricsFontSize: {
        title: t('ge-ci-zi-ti-da-xiao'),
        options: [
            { displayText: t('xiao'), value: '20px' },
            { displayText: t('zhong'), value: '24px' },
            { displayText: t('da'), value: '32px' }
        ]
    },
    greetings: {
        title: t('qi-dong-wen-hou-yu'),
        options: [
            { displayText: t('kai-qi'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    gpuAcceleration: {
        title: t('jin-yong-gpu-jia-su-zhong-qi-sheng-xiao'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    minimizeToTray: {
        title: t('guan-bi-shi-minimize-to-tray'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    highDpi: {
        title: t('shi-pei-gao-dpi'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    lyricsTranslation: {
        title: t('ge-ci-fan-yi'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    lyricsAlign: {
        title: t('dui-qi-fang-shi'),
        options: [
            { displayText: t('ju-zuo'), value: 'left' },
            { displayText: t('ju-zhong'), value: 'center' },
        ]
    },
    dpiScale: {
        title: t('suo-fang-yin-zi'),
        options: [
            { displayText: '1.0', value: '1.0' }
        ]
    },
    font: {
        title: t('zi-ti-she-zhi'),
        options: [
            { displayText: t('mo-ren-zi-ti'), value: '' }
        ]
    },
    fontUrl: {
        title: t('zi-ti-wen-jian-di-zhi'),
        options: [
            { displayText: t('mo-ren-zi-ti'), value: '' }
        ]
    },
    apiMode: {
        title: t('api-mo-shi'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    apiBaseUrlMode: {
        title: 'RPC地址',
        options: [
            { displayText: '默认', value: 'default' },
            { displayText: '自定义', value: 'custom' }
        ]
    },
    touchBar: {
        title: 'TouchBar',
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    autoStart: {
        title: t('kai-ji-zi-qi-dong'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    startMinimized: {
        title: t('qi-dong-shi-zui-xiao-hua'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    preventAppSuspension: {
        title: t('zu-zhi-xi-tong-xiu-mian'),
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    networkMode: {
        title: t('wang-luo-jie-dian'),
        options: [
            { displayText: t('zhu-wang'), value: 'mainnet' },
            { displayText: t('ce-wang'), value: 'testnet' },
            { displayText: t('kai-fa-wang'), value: 'devnet' }
        ]
    },
    proxy: {
        title: t('wang-luo-dai-li'),
        options: [
            { displayText: t('qi-yong'), value: 'on' },
            { displayText: t('jin-yong'), value: 'off' }
        ]
    },
    proxyUrl: {
        title: t('dai-li-di-zhi'),
        options: []
    },
    dataSource: {
        title: t('shu-ju-yuan'),
        options: [
            { displayText: t('gai-nian-ban-xuan-xiang'), value: 'concept' },
            { displayText: t('zheng-shi-ban'), value: 'official' }
        ]
    },
    loudnessNormalization: {
        title: t('ping-heng-yin-pin-xiang-du') + '(实验性)',
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    pauseOnAudioOutputChange: {
        title: '输出设备变化自动暂停(实验性)',
        options: [
            { displayText: t('da-kai'), value: 'on' },
            { displayText: t('guan-bi'), value: 'off' }
        ]
    },
    audioOutputDevice: {
        title: '音频输出设备(实验性)',
        options: []
    },

};

const showRefreshHint = ref({
    nativeTitleBar: false,
    lyricsBackground: false,
    lyricsFontSize: false,
    lyricsAlign: false,
    gpuAcceleration: false,
    highDpi: false,
    font: false,
    touchBar: false,
    preventAppSuspension: false,
    networkMode: false,
    apiMode: false,
    apiBaseUrlMode: false,
    proxy: false,
    dataSource: false,
    statusBarLyrics: false,
});

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

const openSelection = (type, helpLink) => {
    isSelectionOpen.value = true;
    selectionType.value = type;
    currentHelpLink.value = helpLink || selectionTypeMap[type]?.helpLink || '';

    if (type === 'highDpi') {
        dpiScale.value = parseFloat(selectedSettings.value.dpiScale?.value || '1.0');
    }

    if (type === 'font') {
        fontUrlInput.value = selectedSettings.value.fontUrl?.value || '';
        fontFamilyInput.value = selectedSettings.value.font?.value || '';
    }

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

const selectOption = async (option) => {
    const electronFeatures = ['desktopLyrics', 'statusBarLyrics', 'gpuAcceleration', 'minimizeToTray', 'highDpi', 'nativeTitleBar', 'touchBar', 'autoStart', 'startMinimized', 'preventAppSuspension', 'networkMode', 'poxySettings', 'apiMode', 'dataSource', 'statusBarLyrics'];
    if (!isElectron() && electronFeatures.includes(selectionType.value)) {
        window.$modal.alert(t('fei-ke-hu-duan-huan-jing-wu-fa-qi-yong'));
        return;
    }
    if (selectionType.value == 'touchBar' && window.electron.platform != 'darwin') {
        window.$modal.alert(t('fei-mac-bu-zhi-chi-touchbar'));
        return;
    }
    if (selectionType.value == 'statusBarLyrics' && window.electron.platform != 'darwin') {
        window.$modal.alert(t('zhuang-tai-lan-ge-ci-jin-zhi-chi-mac'));
        return;
    }
    selectedSettings.value[selectionType.value] = option;
    const actions = {
        'themeColor': () => proxy.$applyColorTheme(option.value),
        'theme': () => proxy.$setTheme(option.value),
        'language': () => {
            proxy.$i18n.locale = option.value;
            document.documentElement.lang = option.value;
        },
        'quality': () => {
            if (!MoeAuth.isAuthenticated) {
                window.$modal.alert(t('gao-pin-zhi-yin-le-xu-yao-deng-lu-hou-cai-neng-bo-fango'));
                return;
            }
        },
        'highDpi': () => {
            selectedSettings.value.dpiScale = {
                value: dpiScale.value.toString(),
                displayText: dpiScale.value.toString()
            };
        },
        'desktopLyrics': () => {
            const action = option.value === 'on' ? 'display-lyrics' : 'close-lyrics';
            window.electron.ipcRenderer.send('desktop-lyrics-action', action);
        },
        'loudnessNormalization': () => {
            // 触发响度规格化开关变更事件
            window.dispatchEvent(new CustomEvent('loudness-normalization-change', {
                detail: { enabled: option.value === 'on' }
            }));
        },
        'pauseOnAudioOutputChange': async () => {
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
        'apiBaseUrlMode': () => {
            if (option.value === 'default') {
                selectedSettings.value.apiBaseUrl = { displayText: '', value: '' };
            }
        },
        'audioOutputDevice': async () => {
            window.dispatchEvent(new CustomEvent('audio-output-device-change', {
                detail: { deviceId: option.value }
            }));
        }
    };
    await actions[selectionType.value]?.();
    saveSettings();
    if (!['apiMode', 'font', 'fontUrl', 'proxy', 'apiBaseUrlMode'].includes(selectionType.value)) closeSelection();
    const refreshHintTypes = ['nativeTitleBar', 'lyricsBackground', 'lyricsFontSize', 'gpuAcceleration', 'highDpi', 'apiMode', 'apiBaseUrlMode', 'touchBar', 'preventAppSuspension', 'networkMode', 'font', 'proxy', 'dataSource', 'loudnessNormalization', 'statusBarLyrics'];
    if (refreshHintTypes.includes(selectionType.value)) {
        showRefreshHint.value[selectionType.value] = true;
    }
};

const updateFontSetting = async (key) => {
    const prevType = selectionType.value;
    const value = key === 'font' ? (fontFamilyInput.value || '') : (fontUrlInput.value || '');
    const displayText = key === 'font' ? (value || t('mo-ren-zi-ti')) : (value || t('mo-ren-zi-ti'));
    selectionType.value = key;
    await selectOption({ displayText, value });
    selectionType.value = prevType;
};

const handleFontFocusOut = async (e) => {
    const container = e.currentTarget;
    if (container && e.relatedTarget && container.contains(e.relatedTarget)) return;
    await updateFontSetting('fontUrl');
    await updateFontSetting('font');
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
            if (key === 'quality') {
                const option = selectionTypeMap[key].options.find(option => option.value === savedSettings[key]) || selectionTypeMap[key].options[0];
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
            if (key === 'proxyUrl') {
                const value = savedSettings[key];
                selectedSettings.value[key] = {
                    displayText: value,
                    value: value
                };
                continue;
            }
            if (selectionTypeMap[key] && selectionTypeMap[key].options) {
                if (key === 'font') {
                    const value = savedSettings[key];
                    selectedSettings.value[key] = {
                        displayText: value || t('mo-ren-zi-ti'),
                        value: value
                    };
                } else {
                    // Always get displayText from current translation, not from localStorage
                    const option = selectionTypeMap[key].options.find(
                        (opt) => opt.value === savedSettings[key]
                    );
                    const displayText = option?.displayText || '🌏 ' + t('zi-dong');
                    selectedSettings.value[key] = { displayText, value: savedSettings[key] };
                }
            }
        }
    }
    if (savedSettings?.shortcuts) {
        shortcuts.value = savedSettings.shortcuts;
    } else {
        shortcuts.value = Object.entries(shortcutConfigs.value).reduce((acc, [key, config]) => {
            acc[key] = config.defaultValue;
            return acc;
        }, {});
    }
    if (isElectron()) {
        appVersion.value = localStorage.getItem('version');
        platform.value = window.electron.platform;
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
    showRefreshHint.value.apiBaseUrlMode = true;
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

const shortcutConfigs = ref({
    mainWindow: {
        label: t('xian-shi-yin-cang-zhu-chuang-kou'),
        defaultValue: 'Ctrl+Shift+S'
    },
    quitApp: {
        label: t('tui-chu-zhu-cheng-xu'),
        defaultValue: 'Ctrl+Q'
    },
    prevTrack: {
        label: t('shang-yi-shou'),
        defaultValue: 'Alt+Ctrl+Left'
    },
    nextTrack: {
        label: t('xia-yi-shou'),
        defaultValue: 'Alt+Ctrl+Right'
    },
    playPause: {
        label: t('zan-ting-bo-fang'),
        defaultValue: 'Alt+Ctrl+Space'
    },
    volumeUp: {
        label: t('yin-liang-zeng-jia'),
        defaultValue: 'Alt+Ctrl+Up'
    },
    volumeDown: {
        label: t('yin-liang-jian-xiao'),
        defaultValue: 'Alt+Ctrl+Down'
    },
    mute: {
        label: t('jing-yin'),
        defaultValue: 'Alt+Ctrl+M'
    },
    like: {
        label: t('tian-jia-wo-xi-huan'),
        defaultValue: 'Alt+Ctrl+L'
    },
    mode: {
        label: t('qie-huan-bo-fang-mo-shi'),
        defaultValue: 'Alt+Ctrl+P'
    },
    toggleDesktopLyrics: {
        label: t('xian-shi-yin-cang-zhuo-mian-ge-ci'),
        defaultValue: 'Alt+Ctrl+D'
    }
});

const openShortcutSettings = () => {
    showShortcutModal.value = true;
};

const closeShortcutSettings = () => {
    showShortcutModal.value = false;
    recordingKey.value = '';
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
    if (e.metaKey) keys.push('CommandOrControl');
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
        ' ': 'Space',
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
        '+': 'numadd',
        '-': 'numsub',
        '*': 'nummult',
        '/': 'numdiv',
        '=': 'Equal',
        '.': 'Dot',
        'NumpadDecimal': 'numdec'
    };

    const key = specialKeys[e.key] || e.key.toUpperCase();

    // 只有当按下的不是单独的修饰键时才结束记录
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        keys.push(key);

        if (keys.length > 0) {
            // 检查是否包含必要的修饰键
            if (!keys.some(k => ['Ctrl', 'Alt', 'Shift', 'CommandOrControl'].includes(k))) {
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
    return keys.some(k => ['Ctrl', 'Alt', 'Shift', 'Command'].includes(k));
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
    z-index: 9;
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

    h3 {
        font-size: 20px;
        margin-bottom: 20px;
        color: #333;
    }

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
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

.api-settings-container {
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
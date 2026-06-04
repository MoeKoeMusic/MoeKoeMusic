import { computed, ref } from 'vue';

export const ELECTRON_FEATURES = [
    'desktopLyrics',
    'statusBarLyrics',
    'gpuAcceleration',
    'minimizeToTray',
    'customTrayMenu',
    'highDpi',
    'nativeTitleBar',
    'touchBar',
    'autoStart',
    'startMinimized',
    'preventAppSuspension',
    'networkMode',
    'poxySettings',
    'apiMode',
    'dataSource',
    'statusBarLyrics',
    'log'
];

export const REFRESH_HINT_TYPES = [
    'nativeTitleBar',
    'lyricsBackground',
    'lyricsFontSize',
    'gpuAcceleration',
    'highDpi',
    'apiMode',
    'apiBaseUrlMode',
    'touchBar',
    'preventAppSuspension',
    'networkMode',
    'font',
    'proxy',
    'dataSource',
    'loudnessNormalization',
    'statusBarLyrics'
];

export const SETTINGS_SAVE_IGNORE_KEYS = ['log'];

export const createRefreshHintState = () => ({
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
    log: false,
});

export const createSelectedSettings = (t) => ({
    searchMode: { displayText: '快速搜索', value: 'quick' },
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
    customTrayMenu: { displayText: t('da-kai'), value: 'on' },
    highDpi: { displayText: t('guan-bi'), value: 'off' },
    dpiScale: { displayText: '1.0', value: '1.0' },
    apiMode: { displayText: t('guan-bi'), value: 'off' },
    touchBar: { displayText: t('guan-bi'), value: 'off' },
    autoStart: { displayText: t('guan-bi'), value: 'off' },
    startMinimized: { displayText: t('guan-bi'), value: 'off' },
    preventAppSuspension: { displayText: t('guan-bi'), value: 'off' },
    networkMode: { displayText: t('zhu-wang'), value: 'mainnet' },
    startupPage: { displayText: t('shou-ye'), value: 'Index' },
    proxy: { displayText: t('guan-bi'), value: 'off' },
    proxyUrl: { displayText: '', value: '' },
    apiBaseUrlMode: { displayText: '默认', value: 'default' },
    apiBaseUrl: { displayText: '', value: '' },
    dataSource: { displayText: t('gai-nian-ban-xuan-xiang'), value: 'concept' },
    loudnessNormalization: { displayText: t('guan-bi'), value: 'off' },
    pauseOnAudioOutputChange: { displayText: t('guan-bi'), value: 'off' },
    audioOutputDevice: { displayText: '默认', value: 'default' },
});

export const createSettingSections = (t, actions = {}) => computed(() => [
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
                key: 'searchMode',
                label: '搜索模式'
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
            },
            {
                key: 'startupPage',
                label: '启动页'
            },
            {
                key: 'customTrayMenu',
                label: '高级托盘菜单'
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
                action: actions.openShortcutSettings
            },
            {
                key: 'pwa',
                label: t('pwa-app'),
                customText: t('install'),
                action: actions.installPWA
            },
            {
                key: 'proxy',
                label: t('wang-luo-dai-li'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao'),
                helpLink: 'https://music.moekoe.cn/guide/proxy-settings.html'
            },
            {
                key: 'log',
                label: '日志',
                customText: '操作'
            }
        ]
    }
]);

export const createSectionIconGetter = (t) => {
    return (title) => {
        const iconMap = {
            [t('jie-mian')]: 'fas fa-palette',
            [t('sheng-yin')]: 'fas fa-volume-up',
            [t('ge-ci')]: 'fas fa-music',
            [t('cha-jian')]: 'fas fa-puzzle-piece',
            [t('xi-tong')]: 'fas fa-cog'
        };
        return iconMap[title] || 'fas fa-cog';
    };
};

export const getItemIcon = (key) => {
    const iconMap = {
        'language': 'fas fa-language',
        'themeColor': 'fas fa-paint-brush',
        'theme': 'fas fa-moon',
        'searchMode': 'fas fa-search',
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
        'customTrayMenu': 'fas fa-window-restore',
        'autoStart': 'fas fa-power-off',
        'startMinimized': 'fas fa-compress',
        'preventAppSuspension': 'fas fa-clock',
        'apiMode': 'fas fa-code',
        'apiBaseUrlMode': 'fas fa-link',
        'touchBar': 'fas fa-tablet-alt',
        'shortcuts': 'fas fa-keyboard',
        'pwa': 'fas fa-mobile-alt',
        'proxy': 'fas fa-random',
        'startupPage': 'fas fa-home',
        log: 'fas fa-file-lines'
    };
    return iconMap[key] || 'fas fa-sliders-h';
};

export const createSelectionTypeMap = (t) => ({
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
    searchMode: {
        title: '搜索模式',
        options: [
            { displayText: '快速搜索', value: 'quick' },
            { displayText: '推荐搜索', value: 'recommend' }
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
    customTrayMenu: {
        title: '高级托盘菜单',
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
    startupPage: {
        title: '启动页',
        options: [
            { displayText: t('shou-ye'), value: 'Index' },
            { displayText: t('fa-xian'), value: 'Discover' },
            { displayText: t('yin-le-ku'), value: 'Library' }
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
    log: {
        title: '日志',
        options: [
            { displayText: '打开目录', value: 'open-path' },
            { displayText: '导出日志', value: 'export-log' },
        ]
    }
});

export const createShortcutConfigs = (t) => ({
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

export const useSettingsConfig = (t, actions = {}) => {
    const selectedSettings = ref(createSelectedSettings(t));
    const settingSections = createSettingSections(t, actions);
    const selectionTypeMap = createSelectionTypeMap(t);
    const shortcutConfigs = ref(createShortcutConfigs(t));
    const getSectionIcon = createSectionIconGetter(t);

    return {
        selectedSettings,
        settingSections,
        selectionTypeMap,
        shortcutConfigs,
        getSectionIcon,
        getItemIcon
    };
};

import { computed } from 'vue';

export const createSettingSections = (t, actions = {}) => computed(() => [
    {
        title: t('jie-mian'),
        icon: 'fas fa-palette',
        items: [
            {
                key: 'language',
                selectAction: 'applyLanguage',
                defaultValue: '',
                defaultDisplayText: '🌏 ' + t('zi-dong'),
                itemIcon: 'fas fa-language',
                selectionTitle: t('xuan-ze-yu-yan'),
                options: [
                    { displayText: '🇨🇳 简体中文', value: 'zh-CN' },
                    { displayText: '🇨🇳 繁體中文', value: 'zh-TW' },
                    { displayText: '🇺🇸 English', value: 'en' },
                    { displayText: '🇷🇺 Русский', value: 'ru' },
                    { displayText: '🇯🇵 日本語', value: 'ja' },
                    { displayText: '🇰🇷 한국어', value: 'ko' }
                ],
                label: t('yu-yan')
            },
            {
                key: 'themeColor',
                selectAction: 'applyThemeColor',
                defaultValue: 'pink',
                itemIcon: 'fas fa-paint-brush',
                selectionTitle: t('xuan-ze-zhu-se-tiao'),
                options: [
                    { displayText: t('shao-nv-fen'), value: 'pink' },
                    { displayText: t('nan-nan-lan'), value: 'blue' },
                    { displayText: t('tou-ding-lv'), value: 'green' },
                    { displayText: t('mi-gan-cheng'), value: 'orange' }
                ],
                label: t('zhu-se-tiao'),
                icon: '🎨 '
            },
            {
                key: 'theme',
                selectAction: 'applyTheme',
                defaultValue: 'light',
                itemIcon: 'fas fa-moon',
                selectionTitle: t('xuan-ze-wai-guan'),
                options: [
                    { displayText: '🌗 ' + t('zi-dong'), value: 'auto' },
                    { displayText: '☀️' + t('qian-se'), value: 'light' },
                    { displayText: '🌙 ' + t('shen-se'), value: 'dark' }
                ],
                label: t('wai-guan')
            },
            {
                key: 'searchMode',
                defaultValue: 'quick',
                itemIcon: 'fas fa-search',
                selectionTitle: '搜索模式',
                options: [
                    { displayText: '快速搜索', value: 'quick' },
                    { displayText: '推荐搜索', value: 'recommend' }
                ],
                label: '搜索模式'
            },
            {
                key: 'navigationMode',
                defaultValue: 'top',
                itemIcon: 'fas fa-bars',
                selectionTitle: '导航方式',
                options: [
                    { displayText: '顶部', value: 'top' },
                    { displayText: '左侧', value: 'side' }
                ],
                label: '导航方式'
            },
            {
                key: 'playerBarLayout',
                defaultValue: 'full',
                itemIcon: 'fas fa-window-maximize',
                selectionTitle: '播放栏布局',
                options: [
                    { displayText: '底部通栏', value: 'full' },
                    { displayText: '右侧对齐', value: 'content' }
                ],
                label: '播放栏布局'
            },
            {
                key: 'nativeTitleBar',
                defaultValue: 'off',
                itemIcon: 'fas fa-window-maximize',
                selectionTitle: t('native-title-bar'),
                options: [
                    { displayText: t('da-kai'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                available: 'client',
                label: t('native-title-bar'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao')
            },
            {
                key: 'font',
                defaultValue: '',
                defaultDisplayText: t('mo-ren-zi-ti'),
                itemIcon: 'fas fa-font',
                selectionTitle: t('zi-ti-she-zhi'),
                keepOpen: true,
                label: t('zi-ti-she-zhi'),
                helpLink: 'https://music.moekoe.cn/guide/font-settings.html'
            },
            {
                key: 'startupPage',
                defaultValue: 'Index',
                itemIcon: 'fas fa-home',
                selectionTitle: '启动页',
                options: [
                    { displayText: t('shou-ye'), value: 'Index' },
                    { displayText: t('fa-xian'), value: 'Discover' },
                    { displayText: t('yin-le-ku'), value: 'Library' }
                ],
                label: '启动页'
            },
            {
                key: 'onboardingGuide',
                itemIcon: 'fas fa-map',
                label: '新手引导',
                customText: '重新查看',
                action: actions.openOnboardingGuide
            },
            {
                key: 'customTrayMenu',
                defaultValue: 'native',
                itemIcon: 'fas fa-window-restore',
                selectionTitle: '托盘菜单',
                options: [
                    { displayText: '原生', value: 'native' },
                    { displayText: '高级', value: 'custom' }
                ],
                available: 'client',
                label: '托盘菜单'
            }
        ]
    },
    {
        title: t('sheng-yin'),
        icon: 'fas fa-volume-up',
        items: [
            {
                key: 'quality',
                selectAction: 'checkQualityAuth',
                defaultValue: '128',
                itemIcon: 'fas fa-headphones',
                selectionTitle: t('yin-zhi-xuan-ze'),
                options: [
                    { displayText: '标准音质 - 128Kbps', value: '128' },
                    { displayText: '高品音质 - 320Kbps', value: '320' },
                    { displayText: 'FLAC 无损', value: 'flac' },
                    { displayText: 'Hi-Res 无损', value: 'high' },
                    { displayText: '蝰蛇全景', value: 'viper_atmos' },
                    { displayText: '蝰蛇超清', value: 'viper_clear' },
                    { displayText: '蝰蛇母带', value: 'viper_tape' }
                ],
                label: t('yin-zhi-xuan-ze'),
                icon: '🎧 '
            },
            {
                key: 'loudnessNormalization',
                selectAction: 'dispatchLoudnessNormalization',
                defaultValue: 'off',
                itemIcon: 'fas fa-sliders-h',
                selectionTitle: t('ping-heng-yin-pin-xiang-du') + '(实验性)',
                options: [
                    { displayText: t('da-kai'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                label: t('ping-heng-yin-pin-xiang-du'),
                icon: '🎚️ ',
                showRefreshHint: true,
                refreshHintText: t('shua-xin-hou-sheng-xiao')
            },
            {
                key: 'pauseOnAudioOutputChange',
                selectAction: 'updateAudioOutputWatch',
                defaultValue: 'off',
                itemIcon: 'fas fa-exchange-alt',
                selectionTitle: '输出设备变化自动暂停(实验性)',
                options: [
                    { displayText: t('da-kai'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                label: '输出设备变化自动暂停',
                icon: '🎧 ',
                helpLink: 'https://music.moekoe.cn/guide/auto-pause-on-output-device-change.html'
            },
            {
                key: 'audioOutputDevice',
                selectAction: 'dispatchAudioOutputDevice',
                defaultValue: 'default',
                defaultDisplayText: '默认',
                itemIcon: 'fas fa-volume-up',
                selectionTitle: '音频输出设备(实验性)',
                options: [],
                label: '音频输出设备',
                icon: '🔊 ',
                helpLink: 'https://music.moekoe.cn/guide/audio-output-device.html'
            },
            {
                key: 'greetings',
                defaultValue: 'on',
                itemIcon: 'fas fa-comment',
                selectionTitle: t('qi-dong-wen-hou-yu'),
                options: [
                    { displayText: t('kai-qi'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                label: t('qi-dong-wen-hou-yu'),
                icon: '👋 '
            },
            {
                key: 'dataSource',
                defaultValue: 'concept',
                itemIcon: 'fas fa-sliders-h',
                selectionTitle: t('shu-ju-yuan'),
                options: [
                    { displayText: t('gai-nian-ban-xuan-xiang'), value: 'concept' },
                    { displayText: t('zheng-shi-ban'), value: 'official' }
                ],
                available: 'client',
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
        icon: 'fas fa-music',
        items: [
            {
                key: 'desktopLyrics',
                selectAction: 'toggleDesktopLyrics',
                defaultValue: 'off',
                itemIcon: 'fas fa-desktop',
                selectionTitle: t('xian-shi-zhuo-mian-ge-ci'),
                options: [
                    { displayText: t('da-kai'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                available: 'client',
                label: t('xian-shi-zhuo-mian-ge-ci')
            },
            {
                key: 'statusBarLyrics',
                defaultValue: 'off',
                itemIcon: 'fas fa-align-justify',
                selectionTitle: t('zhuang-tai-lan-ge-ci'),
                options: [
                    { displayText: t('da-kai') + t('jin-zhi-chi-mac'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                available: 'darwin',
                unavailableText: t('zhuang-tai-lan-ge-ci-jin-zhi-chi-mac'),
                label: t('zhuang-tai-lan-ge-ci'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao')
            },
            {
                key: 'lyricsTranslation',
                defaultValue: 'on',
                itemIcon: 'fas fa-language',
                selectionTitle: t('ge-ci-fan-yi'),
                options: [
                    { displayText: t('da-kai'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                label: t('ge-ci-fan-yi'),
                showRefreshHint: true,
                refreshHintText: t('shua-xin-hou-sheng-xiao')
            }
        ]
    },
    {
        title: t('cha-jian'),
        icon: 'fas fa-puzzle-piece',
        items: []
    },
    {
        title: t('xi-tong'),
        icon: 'fas fa-cog',
        items: [
            {
                key: 'gpuAcceleration',
                defaultValue: 'off',
                itemIcon: 'fas fa-microchip',
                selectionTitle: t('jin-yong-gpu-jia-su-zhong-qi-sheng-xiao'),
                options: [
                    { displayText: t('da-kai'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                available: 'client',
                label: t('jin-yong-gpu-jia-su-zhong-qi-sheng-xiao'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao')
            },
            {
                key: 'highDpi',
                selectAction: 'saveDpiScale',
                defaultValue: 'off',
                itemIcon: 'fas fa-expand',
                selectionTitle: t('shi-pei-gao-dpi'),
                options: [
                    { displayText: t('da-kai'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                available: 'client',
                label: t('shi-pei-gao-dpi'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao')
            },
            {
                key: 'dpiScale',
                hidden: true,
                defaultValue: '1.0',
                defaultDisplayText: '1.0'
            },
            {
                key: 'minimizeToTray',
                defaultValue: 'on',
                itemIcon: 'fas fa-window-minimize',
                selectionTitle: t('guan-bi-shi-minimize-to-tray'),
                options: [
                    { displayText: t('da-kai'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                available: 'client',
                label: t('guan-bi-shi-minimize-to-tray')
            },
            {
                key: 'autoStart',
                defaultValue: 'off',
                itemIcon: 'fas fa-power-off',
                selectionTitle: t('kai-ji-zi-qi-dong'),
                options: [
                    { displayText: t('da-kai'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                available: 'client',
                label: t('kai-ji-zi-qi-dong')
            },
            {
                key: 'networkMode',
                defaultValue: 'mainnet',
                itemIcon: 'fas fa-sliders-h',
                selectionTitle: t('wang-luo-jie-dian'),
                options: [
                    { displayText: t('zhu-wang'), value: 'mainnet' },
                    { displayText: t('ce-wang'), value: 'testnet' },
                    { displayText: t('kai-fa-wang'), value: 'devnet' }
                ],
                available: 'client',
                label: t('wang-luo-mo-shi'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao'),
                helpLink: 'https://music.moekoe.cn/guide/network-modes.html'
            },
            {
                key: 'startMinimized',
                defaultValue: 'off',
                itemIcon: 'fas fa-compress',
                selectionTitle: t('qi-dong-shi-zui-xiao-hua'),
                options: [
                    { displayText: t('da-kai'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                available: 'client',
                label: t('qi-dong-shi-zui-xiao-hua')
            },
            {
                key: 'preventAppSuspension',
                defaultValue: 'off',
                itemIcon: 'fas fa-clock',
                selectionTitle: t('zu-zhi-xi-tong-xiu-mian'),
                options: [
                    { displayText: t('da-kai'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                available: 'client',
                label: t('zu-zhi-xi-tong-xiu-mian'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao')
            },
            {
                key: 'apiMode',
                defaultValue: 'off',
                itemIcon: 'fas fa-code',
                selectionTitle: t('api-mo-shi'),
                options: [
                    { displayText: t('da-kai'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                available: 'client',
                keepOpen: true,
                label: t('api-mo-shi'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao')
            },
            {
                key: 'apiBaseUrlMode',
                available: 'client',
                selectAction: 'resetApiBaseUrl',
                defaultValue: 'default',
                itemIcon: 'fas fa-link',
                selectionTitle: 'RPC地址',
                options: [
                    { displayText: '默认', value: 'default' },
                    { displayText: '自定义', value: 'custom' }
                ],
                keepOpen: true,
                label: 'RPC地址',
                showRefreshHint: true,
                refreshHintText: t('shua-xin-hou-sheng-xiao'),
                helpLink: 'https://music.moekoe.cn/guide/rpc-api-base-url.html'
            },
            {
                key: 'apiBaseUrl',
                hidden: true,
                defaultValue: '',
                defaultDisplayText: ''
            },
            {
                key: 'touchBar',
                defaultValue: 'off',
                itemIcon: 'fas fa-tablet-alt',
                selectionTitle: 'TouchBar',
                options: [
                    { displayText: t('da-kai'), value: 'on' },
                    { displayText: t('guan-bi'), value: 'off' }
                ],
                available: 'darwin',
                unavailableText: t('fei-mac-bu-zhi-chi-touchbar'),
                label: 'TouchBar',
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao')
            },
            {
                key: 'shortcuts',
                available: 'client',
                itemIcon: 'fas fa-keyboard',
                label: t('quan-ju-kuai-jie-jian'),
                customText: t('zi-ding-yi-kuai-jie-jian'),
                action: actions.openShortcutSettings
            },
            {
                key: 'pwa',
                itemIcon: 'fas fa-mobile-alt',
                label: t('pwa-app'),
                customText: t('install'),
                action: actions.installPWA
            },
            {
                key: 'proxy',
                available: 'client',
                defaultValue: 'off',
                itemIcon: 'fas fa-random',
                selectionTitle: t('wang-luo-dai-li'),
                options: [
                    { displayText: t('qi-yong'), value: 'on' },
                    { displayText: t('jin-yong'), value: 'off' }
                ],
                keepOpen: true,
                label: t('wang-luo-dai-li'),
                showRefreshHint: true,
                refreshHintText: t('zhong-qi-hou-sheng-xiao'),
                helpLink: 'https://music.moekoe.cn/guide/proxy-settings.html'
            },
            {
                key: 'proxyUrl',
                hidden: true,
                defaultValue: '',
                defaultDisplayText: ''
            },
            {
                key: 'log',
                selectAction: 'handleLogAction',
                itemIcon: 'fas fa-file-lines',
                selectionTitle: '日志',
                options: [
                    { displayText: '打开目录', value: 'open-path' },
                    { displayText: '导出日志', value: 'export-log' },
                ],
                available: 'client',
                label: '日志',
                customText: '操作'
            }
        ]
    }
]);

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

export const useSettingsConfig = (t, actions = {}) => ({
    settingSections: createSettingSections(t, actions),
    shortcutConfigs: createShortcutConfigs(t)
});

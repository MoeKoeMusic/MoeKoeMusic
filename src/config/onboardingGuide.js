export const ONBOARDING_GUIDE_VERSION = '1';
export const ONBOARDING_GUIDE_STORAGE_KEY = 'moekoe:onboarding-guide-version';
export const ONBOARDING_GUIDE_INTRO_STORAGE_KEY = 'moekoe:onboarding-guide-intro-version';
export const ONBOARDING_GUIDE_STORAGE_PREFIX = 'moekoe:onboarding-guide:';
export const ONBOARDING_GUIDE_EVENT = 'moekoe-open-onboarding-guide';

export const onboardingGuideSteps = [
    {
        selector: '.app-header .nav-links',
        title: '快速切换页面',
        description: '首页、发现和音乐库是最常用的入口。你可以从这里浏览推荐内容、发现新歌，或进入自己的音乐库。'
    },
    {
        selector: '.app-header .search-bar input',
        title: '搜索音乐',
        description: '在这里输入歌曲、歌手或歌单关键词。按回车即可搜索，搜索模式可以在设置中进行切换。'
    },
    {
        selector: '.app-header .profile',
        title: '账号与设置',
        description: '点击头像可以登录账号、打开设置、检查更新和查看关于信息。'
    },
    {
        selector: '.player-container .controls',
        title: '播放控制',
        description: '底部中间可以切换上一首、播放或暂停、下一首。播放中的歌曲信息也会显示在这里。'
    },
    {
        selector: '.player-container .extra-controls',
        title: '更多播放功能',
        description: '这里可以收藏、分享、调整播放速度、切换播放模式、打开队列和调节音量。'
    }
];

export const onboardingGuideGroups = [
    {
        key: 'main',
        version: ONBOARDING_GUIDE_VERSION,
        storageKey: ONBOARDING_GUIDE_STORAGE_KEY,
        routeNames: ['Index', 'Discover', 'Library', 'Settings', 'PlaylistDetail', 'Search', 'RecommendedSearch', 'Ranking', 'CloudDrive', 'LocalMusic'],
        triggerSelector: '.app-header',
        steps: onboardingGuideSteps
    },
    {
        key: 'home',
        version: '2',
        routeNames: ['Index'],
        triggerSelector: '.recommendations',
        steps: [
            {
                selector: '.recommend-title',
                title: '切换推荐卡片样式',
                description: '点击“推荐”标题可以在图片卡片和图标卡片之间切换，如果你不喜欢胡桃的话。'
            },
            {
                selector: '.recommendations .radio-card',
                title: 'MoeKoe Radio',
                description: '这里可以快速播放一组推荐歌曲，适合不知道听什么时直接开始。'
            },
            {
                selector: '.radio-title .shuffle-icon',
                title: '切换电台类型',
                description: '点这里可以在私人推荐、经典怀旧、热门歌曲、小众发现等模式之间切换。'
            },
            {
                selector: '.ranking-entry',
                title: '排行榜入口',
                description: '这里可以进入排行榜，快速查看当前热门和高热度歌曲。'
            },
            {
                selector: '.playlist-entry',
                title: '阿珏酱的歌单',
                description: '这个卡片是作者放在首页的推荐歌单入口，喜欢可以收藏哦~'
            },
            {
                selector: '.section-title .mama',
                title: '每日推荐一键加入',
                description: '每日推荐标题旁边这个隐藏入口可以把当前推荐歌曲一次性加入播放队列。'
            },
            {
                selector: '.song-list .song-item',
                title: '每日推荐歌曲',
                description: '点击歌曲会直接加入播放；右键可以打开更多操作菜单。'
            },
            {
                selector: '.playlist-grid .playlist-item',
                title: '推荐歌单',
                description: '这里展示推荐歌单，点击卡片可以进入歌单详情继续浏览和播放。'
            }
        ]
    },
    {
        key: 'discover',
        version: '1',
        routeNames: ['Discover'],
        triggerSelector: '.discover-page',
        steps: [
            {
                selector: '.discover-switch',
                title: '发现页分类',
                description: '这里可以在发现歌单、音乐榜单、新碟上架和新歌速递之间切换。'
            },
            {
                selector: '.discover-page',
                title: '发现更多内容',
                description: '不同分类会加载不同音乐内容，适合找新歌、榜单和主题歌单。'
            }
        ]
    },
    {
        key: 'library',
        version: '1',
        routeNames: ['Library'],
        triggerSelector: '.library-page',
        steps: [
            {
                selector: '.library-page .profile-header',
                title: '音乐库资料卡',
                description: '这里会显示你的头像、昵称、等级、听歌时长和关注数据，也会根据资料背景自动调整卡片氛围。'
            },
            {
                selector: '.favorite-header .section-title',
                title: '我喜欢听',
                description: '这里展示最近常听的歌曲。点击标题可以把这一组歌曲一次性加入播放队列。'
            },
            {
                selector: '.favorite-header .favorite-close-button',
                title: '隐藏常听区域',
                description: '标题右侧有一个默认透明的关闭入口，鼠标移上去才会显现。点它可以隐藏“我喜欢听”区域。'
            },
            {
                selector: '.library-page .category-tabs',
                title: '音乐库分类',
                description: '这里可以切换我创建的歌单、收藏的歌单、收藏的专辑、关注的歌手和关注的好友。'
            },
            {
                selector: '.music-grid .create-playlist-button',
                title: '云盘和本地音乐',
                description: '前两个快捷卡片分别进入我的云盘和本地音乐，方便管理在线云盘歌曲和本地文件。'
            },
            {
                selector: '.music-grid .music-card:not(.create-playlist-button)',
                title: '歌单和收藏内容',
                description: '这里展示你创建或收藏的内容。点击卡片可以进入详情页继续播放、收藏或管理歌曲。'
            },
            {
                selector: '.music-grid .create-playlist-button:last-child',
                title: '创建歌单',
                description: '这个入口可以新建歌单，创建成功后会自动刷新音乐库列表。'
            }
        ]
    },
    {
        key: 'playlistDetail',
        version: '1',
        routeNames: ['PlaylistDetail'],
        triggerSelector: '.detail-page',
        steps: [
            {
                selector: '.detail-page .header',
                title: '歌单信息',
                description: '这里显示歌单、专辑或歌手的信息，包括封面、简介和基础数据。'
            },
            {
                selector: '.detail-page .actions',
                title: '播放和收藏',
                description: '这里可以一键播放整个列表，也可以收藏、关注或打开更多操作。'
            },
            {
                selector: '.track-list-actions',
                title: '列表工具',
                description: '歌曲列表支持批量操作、视图切换和列表内搜索。'
            },
            {
                selector: '.batch-action-btn',
                title: '批量操作',
                description: '开启后可以一次选择多首歌曲加入队列或添加到歌单。'
            },
            {
                selector: '.track-list',
                title: '歌曲列表',
                description: '点击歌曲播放，右键歌曲可以打开更多操作，表头也支持排序。'
            }
        ]
    },
    {
        key: 'playerLyrics',
        version: '2',
        triggerSelector: '.lyrics-bg .lyrics-screen',
        steps: [
            {
                selector: '.lyrics-bg .lyrics-screen',
                title: '全屏歌词',
                description: '全屏歌词打开时，可以使用 Ctrl+C 或 Command+C 复制当前歌曲歌词。'
            },
            {
                selector: '.lyrics-bg .album-art-container',
                title: '切换唱片模式',
                description: '点击左侧封面可以在普通封面和唱片播放器模式之间切换，播放时唱片会跟随状态旋转。'
            },
            {
                selector: '.fullscreen-lyrics-settings .settings-guide-anchor',
                title: '全屏歌词快捷设置',
                description: '鼠标移到右侧小箭头上可以滑出设置面板，快速调整歌词背景、字号、高亮方式和对齐方式。'
            },
            {
                selector: '.lyrics-mode-btn',
                title: '切换歌词模式',
                description: '如果歌曲包含翻译或音译，这个按钮可以在不同歌词模式之间切换。'
            },
            {
                selector: '#lyrics-container',
                title: '歌词滚动区域',
                description: '歌词会跟随播放进度滚动；点击某一行可以跳转到对应播放位置。'
            },
            {
                selector: '.lyrics-bg .close-btn',
                title: '退出全屏歌词',
                description: '点这里或按 ESC 键退出全屏歌词界面。'
            }
        ]
    },
    {
        key: 'settings',
        version: '1',
        routeNames: ['Settings'],
        triggerSelector: '.settings-page',
        steps: [
            {
                selector: '.settings-sidebar',
                title: '设置分类',
                description: '左侧可以切换界面、声音、歌词、插件和系统等设置分类。'
            },
            {
                selector: '.settings-cards .setting-card',
                title: '设置项卡片',
                description: '每个卡片都是一个配置入口，部分配置修改后需要刷新或重启才会生效。'
            },
            {
                selector: '.reset-settings-button',
                title: '恢复出厂设置',
                description: '如果配置混乱或者出现奇怪的问题，可以在这里清空本地设置并恢复默认状态。'
            }
        ]
    }
];

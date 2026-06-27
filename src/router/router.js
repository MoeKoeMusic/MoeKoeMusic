import { createRouter, createWebHashHistory } from 'vue-router';
import HomeLayout from '@/layouts/HomeLayout.vue';
import Home from '@/views/Home.vue';
import Discover from '@/views/Discover.vue';
import Library from '@/views/Library.vue';
import Login from '@/views/Login.vue';
import Settings from '@/views/Settings.vue';
import PlaylistDetail from '@/views/PlaylistDetail.vue';
import Search from '@/views/Search.vue';
import RecommendedSearch from '@/views/RecommendedSearch.vue';
import Lyrics from '@/views/Lyrics.vue';
import Ranking from '@/views/Ranking.vue';
import CloudDrive from '@/views/CloudDrive.vue';
import LocalMusic from '@/views/LocalMusic.vue';
import VideoPlayer from '@/views/VideoPlayer.vue';
import Recognize from '@/views/Recognize.vue';
import { MoeAuthStore } from '@/stores/store';


const routes = [
    {
        path: '/',
        component: HomeLayout,
        children: [
            { path: '', name: 'Index', component: Home },
            { path: '/share', name: 'Share', component: Home },
            { path: '/discover', name: 'Discover', component: Discover },
            { path: '/library', name: 'Library', component: Library, meta: { requiresAuth: true } },
            { path: '/login', name: 'Login', component: Login },
            { path: '/settings', name: 'Settings', component: Settings },
            { path: '/playlistDetail', name: 'PlaylistDetail', component: PlaylistDetail },
            { path: '/search', name: 'Search', component: Search, meta: { requiresAuth: true } },
            { path: '/search/recommend', name: 'RecommendedSearch', component: RecommendedSearch, meta: { requiresAuth: true } },
            { path: '/ranking', name: 'Ranking', component: Ranking },
            { path: '/CloudDrive', name: 'CloudDrive', component: CloudDrive },
            { path: '/LocalMusic', name: 'LocalMusic', component: LocalMusic },
            { path: '/recognize', name: 'Recognize', component: Recognize },
        ],
    },
    { path: '/lyrics', name: 'Lyrics', component: Lyrics },
    { path: '/video', name: 'VideoPlayer', component: VideoPlayer },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

// 全局导航守卫
router.beforeEach((to, from, next) => {
    console.log('完整的路由地址:', to.fullPath);

    const MoeAuth = MoeAuthStore();
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    const allowedStartupPages = ['Index', 'Discover', 'Library'];
    const startupPage = allowedStartupPages.includes(settings.startupPage) ? settings.startupPage : 'Index';

    const isFirstEnter = from.matched.length === 0;

    if (isFirstEnter && to.path === '/' && startupPage !== 'Index') {
        return next({ name: startupPage });
    }

    if (to.matched.some(record => record.meta.requiresAuth)) {
        if (!MoeAuth.isAuthenticated) {
            return next({
                name: 'Login',
                query: { redirect: to.fullPath }
            });
        }
    }

    next();
});

export default router;

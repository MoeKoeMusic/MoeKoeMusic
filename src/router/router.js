import { createRouter, createWebHashHistory } from 'vue-router';
import HomeLayout from '@/layouts/HomeLayout.vue';
import Home from '@/views/Home.vue';
import Discover from '@/views/Discover.vue';
import Library from '@/views/Library.vue';
import Login from '@/views/Login.vue';
import Settings from '@/views/Settings.vue';
import PlaylistDetail from '@/views/PlaylistDetail.vue';
import Search from '@/views/Search.vue';
import Lyrics from '@/views/Lyrics.vue';
import Ranking from '@/views/Ranking.vue';
import CloudDrive from '@/views/CloudDrive.vue';
import LocalMusic from '@/views/LocalMusic.vue';
import VideoPlayer from '@/views/VideoPlayer.vue';
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
            { path: '/search', name: 'Search', component: Search },
            { path: '/ranking', name: 'Ranking', component: Ranking },
            { path: '/CloudDrive', name: 'CloudDrive', component: CloudDrive },
            { path: '/LocalMusic', name: 'LocalMusic', component: LocalMusic },
        ],
    },
    { path: '/lyrics', name: 'Lyrics', component: Lyrics },
    { path: '/video', name: 'VideoPlayer', component: VideoPlayer },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        ...savedPosition,
                        behavior: 'smooth'
                    });
                }, 100);
            });
        }
        if (to.hash) {
            return {
                el: to.hash,
                behavior: 'smooth',
                top: 80, 
            };
        }
        if (to.path === from.path && JSON.stringify(to.params) === JSON.stringify(from.params)) {
            return false;
        }
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ top: 0, behavior: 'smooth' });
            }, 50);
        });
    }
});

const VALID_START_PAGES = routes[0].children
    .filter(r => !r.meta?.requiresAuth || r.path === '/library')
    .map(r => r.path === '' ? '/' : r.path);
VALID_START_PAGES.push('/library');

const getStartPageFromStorage = () => {
    try {
        const stored = localStorage.getItem('settings');
        if (stored) {
            const settings = JSON.parse(stored);
            const page = settings.startPage;
            if (page && VALID_START_PAGES.includes(page)) {
                return page;
            }
            if (page && !VALID_START_PAGES.includes(page)) {
                console.warn(`[StartPage] 无效的启动页路径: "${page}"，将使用默认首页`);
            }
        }
    } catch (error) {
        console.error('[StartPage] 解析设置失败:', error);
    }
    return '/';
};

let cachedStartPage = null;
let cachedStartPageTimestamp = 0;

export const clearStartPageCache = () => {
    cachedStartPage = null;
    cachedStartPageTimestamp = 0;
};

export const updateStartPageCache = (newPage) => {
    if (newPage && VALID_START_PAGES.includes(newPage)) {
        cachedStartPage = newPage;
    } else {
        cachedStartPage = '/';
    }
    cachedStartPageTimestamp = Date.now();
};

if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === 'settings') {
            cachedStartPage = getStartPageFromStorage();
            cachedStartPageTimestamp = Date.now();
        }
    });
}

router.beforeEach(async (to, from, next) => {
    console.log('完整的路由地址:', to.fullPath);

    if (to.path === '/' && !from.name) {
        if (cachedStartPage === null) {
            cachedStartPage = getStartPageFromStorage();
        }

        const startPage = cachedStartPage;

        if (startPage && startPage !== '/') {
            const targetRoute = router.resolve(startPage);
            const requiresAuth = targetRoute.matched.some(record => record.meta.requiresAuth);

            if (requiresAuth) {
                try {
                    const MoeAuth = MoeAuthStore();
                    await MoeAuth.$state;
                    if (MoeAuth.isAuthenticated) {
                        next({ path: startPage, replace: true });
                        return;
                    }
                } catch (e) {
                    console.warn('[StartPage] 登录状态验证失败，跳转到登录页');
                }
            } else {
                next({ path: startPage, replace: true });
                return;
            }
        }
    }

    const MoeAuth = MoeAuthStore();
    if (to.matched.some(record => record.meta.requiresAuth)) {
        if (!MoeAuth.isAuthenticated) {
            next({
                path: '/login',
                query: { redirect: to.fullPath }
            });
            return;
        }
    }
    next();
});

export default router;
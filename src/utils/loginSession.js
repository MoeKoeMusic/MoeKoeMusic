import { get } from './request';
import { MoeAuthStore } from '../stores/store';

// 酷狗侧表示「未登录 / 会话过期」的错误码：51002 未登录，20018 会话过期
const LOGIN_INVALID_CODES = [20018, 51002];

// 续期间隔：酷狗 token 有服务端生命周期，定期调用 /login/token 可以延长有效期
const REFRESH_INTERVAL = 12 * 60 * 60 * 1000;
const LAST_REFRESH_KEY = 'lastTokenRefreshAt';
// 多窗口（主窗口 + 歌词窗口）共用 localStorage，用一个短期锁避免并发续期把 token 轮换两次
const REFRESH_LOCK_KEY = 'loginTokenRefreshingAt';
const REFRESH_LOCK_TTL = 60 * 1000;

let refreshing = null;

export const isLoginInvalidPayload = (response) => {
    const code = Number(response?.error_code);
    return Number(response?.status) === 2 || LOGIN_INVALID_CODES.includes(code);
};

/**
 * 调用 /login/token 续期当前登录态
 * 成功后会写回新的 token / t1 / vip 信息，无需用户重新扫码
 */
export const refreshLoginToken = async () => {
    if (refreshing) return refreshing;

    const MoeAuth = MoeAuthStore();
    const info = MoeAuth.UserInfo;
    if (!info?.token || !info?.userid) return { skipped: true };

    refreshing = (async () => {
        try {
            const response = await get('/login/token', {
                token: info.token,
                userid: info.userid
            });

            if (response?.status === 1 && response?.data?.token) {
                MoeAuth.setData({ UserInfo: { ...info, ...response.data } });
                localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
                console.log('[auth] 登录态续期成功');
                return { ok: true };
            }

            if (isLoginInvalidPayload(response)) {
                console.warn('[auth] 登录态已失效，需要重新登录:', response);
                return { ok: false, invalid: true };
            }

            console.warn('[auth] 登录态续期返回异常:', response);
            return { ok: false, response };
        } catch (error) {
            // 网络问题等不视为登录失效，下次再试
            console.warn('[auth] 登录态续期请求失败:', error);
            return { ok: false, error };
        } finally {
            refreshing = null;
        }
    })();

    return refreshing;
};

/**
 * 按需续期：距上次成功续期超过间隔才真正发请求
 * @param {{ force?: boolean }} options force 为 true 时忽略间隔
 */
export const ensureLoginSession = async ({ force = false } = {}) => {
    const MoeAuth = MoeAuthStore();
    if (!MoeAuth.isAuthenticated) return { skipped: true };

    const now = Date.now();
    const lastRefreshAt = Number(localStorage.getItem(LAST_REFRESH_KEY) || 0);
    if (!force && now - lastRefreshAt < REFRESH_INTERVAL) {
        return { skipped: true };
    }

    const lockAt = Number(localStorage.getItem(REFRESH_LOCK_KEY) || 0);
    if (now - lockAt < REFRESH_LOCK_TTL) {
        return { skipped: true };
    }
    localStorage.setItem(REFRESH_LOCK_KEY, String(now));

    // 错开多窗口的启动时刻，然后重新确认一次是否已被其它窗口续期
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 800));
    const latestRefreshAt = Number(localStorage.getItem(LAST_REFRESH_KEY) || 0);
    if (!force && Date.now() - latestRefreshAt < REFRESH_INTERVAL) {
        return { skipped: true };
    }

    return refreshLoginToken();
};

/**
 * 启动后保持登录态：立即检查一次，之后每小时检查一次（内部按 12 小时节流）
 * @returns {() => void} 清理函数
 */
export const startLoginSessionKeeper = () => {
    ensureLoginSession();

    const timer = setInterval(() => {
        ensureLoginSession();
    }, 60 * 60 * 1000);

    return () => clearInterval(timer);
};

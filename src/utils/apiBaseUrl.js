const DEV_API_BASE_URL = 'http://127.0.0.1:6521';
const SAME_ORIGIN_API_BASE_URL = '/api';
const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//i;
const NON_PROXY_AUDIO_URL_PATTERN = /^(blob:|data:|mediastream:|file:)/i;

function resolveDefaultApiBaseUrl() {
    if (import.meta.env.VITE_APP_API_URL) return import.meta.env.VITE_APP_API_URL;
    if (import.meta.env.DEV) return DEV_API_BASE_URL;

    if (typeof window !== 'undefined') {
        const protocol = window.location?.protocol;
        if (protocol === 'file:' || typeof window.electron !== 'undefined') {
            return DEV_API_BASE_URL;
        }
    }

    return SAME_ORIGIN_API_BASE_URL;
}

export const DEFAULT_API_BASE_URL = resolveDefaultApiBaseUrl();

export function normalizeApiBaseUrl(input) {
    const result = validateApiBaseUrl(input);
    return result.ok ? result.value : '';
}

export function validateApiBaseUrl(input) {
    const raw = (input ?? '').toString().trim();
    if (!raw) return { ok: true, value: '' };

    if (raw.startsWith('/')) {
        return { ok: true, value: raw.replace(/\/+$/, '') };
    }

    let url;
    try {
        url = new URL(raw);
    } catch {
        return { ok: false, value: '', error: '请输入完整的 http(s):// 地址' };
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
        return { ok: false, value: '', error: '仅支持 http:// 或 https://' };
    }

    return { ok: true, value: raw.replace(/\/+$/, '') };
}

export function getApiBaseUrl() {
    try {
        const settingsRaw = localStorage.getItem('settings');
        const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
        const custom = normalizeApiBaseUrl(settings?.apiBaseUrl);
        return custom || DEFAULT_API_BASE_URL;
    } catch {
        return DEFAULT_API_BASE_URL;
    }
}

export function joinApiUrl(baseUrl, path = '/') {
    const base = (baseUrl || '').replace(/\/+$/, '');
    const rel = (path || '').replace(/^\/+/, '');
    return rel ? `${base}/${rel}` : `${base}/`;
}

export function shouldProxyAudioUrl(input) {
    const raw = (input ?? '').toString().trim();
    if (!raw) return false;
    if (NON_PROXY_AUDIO_URL_PATTERN.test(raw)) return false;
    return ABSOLUTE_HTTP_URL_PATTERN.test(raw);
}

export function toPlayableAudioUrl(input, baseUrl = getApiBaseUrl()) {
    const raw = (input ?? '').toString().trim();
    if (!raw) return '';
    if (!shouldProxyAudioUrl(raw)) return raw;

    const endpoint = joinApiUrl(baseUrl, '/audio/proxy');
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${endpoint}${separator}url=${encodeURIComponent(raw)}`;
}

export async function testApiBaseUrl(baseUrl, options = {}) {
    const { path = '/register/dev', timeoutMs = 8000 } = options;
    const target = joinApiUrl(baseUrl, path);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(target, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
        });

        if (!response.ok) {
            return { ok: false, status: response.status, statusText: response.statusText };
        }

        const data = await response.json().catch(() => null);

        const dfid = data?.data?.dfid;
        if (typeof dfid !== 'string' || !dfid) {
            return { ok: false, error: 'no_dfid', data };
        }

        return { ok: true, data, dfid };
    } catch (error) {
        if (error?.name === 'AbortError') return { ok: false, error: 'timeout' };
        return { ok: false, error: error?.message || String(error) };
    } finally {
        clearTimeout(timeoutId);
    }
}

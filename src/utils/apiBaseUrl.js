export const DEFAULT_API_BASE_URL =
    import.meta.env.VITE_APP_API_URL || 'http://127.0.0.1:6521';

export function normalizeApiBaseUrl(input) {
    const result = validateApiBaseUrl(input);
    return result.ok ? result.value : '';
}

export function validateApiBaseUrl(input) {
    const raw = (input ?? '').toString().trim();
    if (!raw) return { ok: true, value: '' };

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

export async function testApiBaseUrl(baseUrl, options = {}) {
    const { path = '/', timeoutMs = 8000 } = options;
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

        return { ok: true, data };
    } catch (error) {
        if (error?.name === 'AbortError') return { ok: false, error: 'timeout' };
        return { ok: false, error: error?.message || String(error) };
    } finally {
        clearTimeout(timeoutId);
    }
}

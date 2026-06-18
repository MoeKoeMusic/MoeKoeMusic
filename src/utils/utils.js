import i18n from '@/utils/i18n';

const appFontStyleId = 'moekoe-custom-font';
const defaultFontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";

const escapeCssString = (value) => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

export const applyCustomFont = (fontFamily) => {
    if (typeof document === 'undefined') return;

    document.getElementById(appFontStyleId)?.remove();
    if (!fontFamily) return;

    const safeFontFamily = escapeCssString(fontFamily);
    const style = document.createElement('style');
    style.id = appFontStyleId;
    style.textContent = `
body, html, button, input, textarea, select {
    font-family: "${safeFontFamily}", ${defaultFontFamily} !important;
}`;
    document.head.appendChild(style);
};

export const applyColorTheme = (theme) => {
    let colors;
    if (theme === 'blue') {
        colors = {
            '--primary-color': '#4A90E2',
            '--primary-color-rgb': '74, 144, 226',
            '--secondary-color': '#AEDFF7',
            '--background-color': '#E8F4FA',
            '--background-color-secondary': '#D9EEFA',
            '--color-primary': '#2A6DAF',
            '--color-primary-light': 'rgba(74, 144, 226, 0.1)',
            '--border-color': '#C5E0F5',
            '--hover-color': '#D1E9F9',
            '--color-secondary-bg-for-transparent': 'rgba(174, 223, 247, 0.28)',
            '--color-box-shadow': 'rgba(74, 144, 226, 0.2)',
        };
    } else if (theme === 'green') {
        colors = {
            '--primary-color': '#34C759',
            '--primary-color-rgb': '52, 199, 89',
            '--secondary-color': '#A7F3D0',
            '--background-color': '#E5F9F0',
            '--background-color-secondary': '#D0F5E6',
            '--color-primary': '#28A745',
            '--color-primary-light': 'rgba(52, 199, 89, 0.1)',
            '--border-color': '#B8ECD7',
            '--hover-color': '#C9F2E2',
            '--color-secondary-bg-for-transparent': 'rgba(167, 243, 208, 0.28)',
            '--color-box-shadow': 'rgba(52, 199, 89, 0.2)',
        };
    } else if (theme === 'orange') {
        colors = {
            '--primary-color': '#ff6b6b',
            '--primary-color-rgb': '255, 107, 107',
            '--secondary-color': '#FFB6C1',
            '--background-color': '#FFF0F5',
            '--background-color-secondary': '#FFE6EC',
            '--color-primary': '#f36868',
            '--color-primary-light': 'rgba(255, 107, 107, 0.1)',
            '--border-color': '#FFDCE3',
            '--hover-color': '#FFE9EF',
            '--color-secondary-bg-for-transparent': 'rgba(209, 209, 214, 0.28)',
            '--color-box-shadow': 'rgba(255, 105, 180, 0.2)',
        };
    } else {
        colors = {
            '--primary-color': '#FF69B4',
            '--primary-color-rgb': '255, 105, 180',
            '--secondary-color': '#FFB6C1',
            '--background-color': '#FFF0F5',
            '--background-color-secondary': '#FFE6F0',
            '--color-primary': '#f167ac',
            '--color-primary-light': 'rgba(255, 105, 180, 0.1)',
            '--border-color': '#FFD9E6',
            '--hover-color': '#FFE9F2',
            '--color-secondary-bg-for-transparent': 'rgba(209, 209, 214, 0.28)',
            '--color-box-shadow': 'rgba(255, 105, 180, 0.2)',
        };
    }

    Object.keys(colors).forEach(key => {
        document.documentElement.style.setProperty(key, colors[key]);
    });
};


export const getCover = (coverUrl, size) => {
    if (!coverUrl) return './assets/images/ico.png';
    return coverUrl.replace("{size}", size);
};

export const getProfileBgColor = (src, tone = 0.52) => new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) {
                reject(new Error('Canvas context unavailable'));
                return;
            }
            const sampleWidth = Math.max(8, Math.floor(image.naturalWidth * 0.12));
            const sampleHeight = Math.max(8, image.naturalHeight);
            canvas.width = 24;
            canvas.height = 24;
            context.drawImage(image, 0, 0, sampleWidth, sampleHeight, 0, 0, canvas.width, canvas.height);
            const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
            let red = 0;
            let green = 0;
            let blue = 0;
            let alphaTotal = 0;
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3] / 255;
                red += data[i] * alpha;
                green += data[i + 1] * alpha;
                blue += data[i + 2] * alpha;
                alphaTotal += alpha;
            }
            if (!alphaTotal) {
                reject(new Error('No visible pixels'));
                return;
            }
            const averageRed = Math.round((red / alphaTotal) * tone);
            const averageGreen = Math.round((green / alphaTotal) * tone);
            const averageBlue = Math.round((blue / alphaTotal) * tone);
            resolve(`rgb(${averageRed}, ${averageGreen}, ${averageBlue})`);
        } catch (error) {
            reject(error);
        }
    };
    image.onerror = () => reject(new Error('Image load failed'));
    image.src = src;
});

export const formatMilliseconds = (time) => {
    const milliseconds = time > 3600 ? time : time * 1000;
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}分${seconds}秒`;
};

export const formatTimestampToAgo = (timestamp) => {
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || ts <= 0) return '';

    const now = Math.floor(Date.now() / 1000);
    const diff = now - Math.floor(ts);

    if (diff <= 0) return '刚刚';
    if (diff < 60) return `${diff}秒前`;

    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes}分钟前`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}周前`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months}个月前`;

    const years = Math.floor(months / 12);
    return `${years}年前`;
};

export const requestMicrophonePermission = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;

    try {
        if (navigator.permissions?.query) {
            const status = await navigator.permissions.query({ name: 'microphone' });

            if (status.state === 'granted') {
                // 不会弹窗
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                return true;
            }

            if (status.state === 'denied') return false;
        }
    } catch {
        // permissions API 在部分环境不可用/会抛错（例如 Safari），直接走 getUserMedia
    }

    try {
        // 可能弹窗申请权限
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch {
        return false;
    }
};

export const getAudioOutputDeviceSignature = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return null;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const signatures = devices
        .filter(device => device.kind === 'audiooutput')
        .map(device => `${device.deviceId || ''}:${device.groupId || ''}`)
        .sort();
    return signatures.join('|');
};

let themeMediaQueryListener = null;
export const setTheme = (theme) => {
    const html = document.documentElement;
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    if (themeMediaQueryListener) {
        prefersDarkScheme.removeEventListener('change', themeMediaQueryListener);
        themeMediaQueryListener = null;
    }

    const applyTheme = (isDark) => {
        if (isDark) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
    };

    switch (theme) {
        case 'dark':
            applyTheme(true);
            localStorage.setItem('theme', 'dark');
            break;
        case 'light':
            applyTheme(false);
            localStorage.setItem('theme', 'light');
            break;
        case 'auto':
            localStorage.setItem('theme', 'auto');
            applyTheme(prefersDarkScheme.matches);
            themeMediaQueryListener = (e) => {
                applyTheme(e.matches);
            };
            prefersDarkScheme.addEventListener('change', themeMediaQueryListener);
            break;
    }
};

export const openRegisterUrl = (registerUrl) => {
    if (window.electron) {
        window.electron.ipcRenderer.send('open-url', registerUrl);
    } else {
        window.open(registerUrl, '_blank');
    }
};

export const openMvPlayer = async (router, hash, title = '视频播放') => {
    const resolved = router.resolve({
        path: '/video',
        query: { hash, title }
    });
    const base = window.location.href.split('#')[0];
    const href = resolved.href || '';
    const fullUrl = href.startsWith('#')
        ? `${base}${href}`
        : `${base}#${href.startsWith('/') ? href : `/${href}`}`;

    if (window.electronAPI) {
        await window.electronAPI.openMvWindow(fullUrl);
        return;
    }

    const width = 960;
    const height = 620;
    const left = Math.max(0, Math.round((window.screen.width - width) / 2));
    const top = Math.max(0, Math.round((window.screen.height - height) / 2));
    const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`;

    const popup = window.open(fullUrl, 'moekoe-mv', features);
    if (popup) {
        popup.focus?.();
        return;
    }

    await router.push(resolved);
};

// 分享
import { MoeAuthStore } from '../stores/store';
export const share = (songName, id, type = 0, songDesc = '') => {
    let text = '';
    const MoeAuth = MoeAuthStore();
    let userName = '萌音';
    if(MoeAuth.isAuthenticated) {
        userName = MoeAuth.UserInfo?.nickname || '萌音';
    };
    // 客户端分享
    let shareUrl = '';
    if (window.electron) {
        if(type == 0){
            // 歌曲
            shareUrl = `https://music.moekoe.cn/share/?hash=${id}`;
        }else{
            // 歌单
            shareUrl = `moekoe://share?listid=${id}`;
        }
    } else {
        //  Web / H5 逻辑
        shareUrl = (window.location.host + '/#/') + (type == 0 ? `share/?hash=${id}` : `share?listid=${id}`);
    }
    text = `你的好友@${userName}分享了${songDesc}《${songName}》给你,快去听听吧! ${shareUrl}`;

    navigator.clipboard.writeText(text);
    $message.success(
        i18n.global.t('kou-ling-yi-fu-zhi,kuai-ba-ge-qu-fen-xiang-gei-peng-you-ba')
    );
};

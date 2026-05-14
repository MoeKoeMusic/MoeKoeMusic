import i18n from '@/utils/i18n';

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

export const formatMilliseconds = (time) => {
    const milliseconds = time > 3600 ? time : time * 1000;
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}分${seconds}秒`;
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

const QUALITY_LEVELS = ['128', '320', 'flac', 'high', 'viper_atmos', 'viper_clear', 'viper_tape'];
const QUALITY_LABELS = {
    '128': '标准品质',
    '320': '高品质',
    flac: '无损 FLAC',
    high: 'Hi-Res',
    viper_atmos: '全景声',
    viper_clear: '超清',
    viper_tape: '母带'
};

const getQualityLabel = (quality) => QUALITY_LABELS[quality] || quality;

const getPrivilegeVariants = (response) => {
    const variants = [];
    for (const item of response?.data || []) {
        for (const variant of [item, ...(item?.relate_goods || [])]) {
            if (!variant?.hash || variant?.level === 0 || !QUALITY_LEVELS.includes(variant?.quality)) continue;
            variants.push(variant);
        }
    }
    return variants;
};

const getQualityOptions = (response) => {
    const qualityOptions = new Map();
    for (const variant of getPrivilegeVariants(response)) {
        if (qualityOptions.has(variant.quality)) continue;
        qualityOptions.set(variant.quality, {
            value: variant.quality,
            hash: variant.hash,
            label: getQualityLabel(variant.quality)
        });
    }
    return [...qualityOptions.values()].sort((a, b) => QUALITY_LEVELS.indexOf(b.value) - QUALITY_LEVELS.indexOf(a.value));
};

export const downloadSong = async (song, quality = '320') => {
    try {
        const { get } = await import('../utils/request');
        
        const response = await get('/song/url', {
            hash: song.hash,
            quality: quality,
            ppage_id: '356753938'
        });

        if (response.status !== 1 || !response.url || !response.url[0]) {
            throw new Error('获取下载链接失败');
        }

        const downloadUrl = response.url[0];
        const ext = response.extName || 'mp3';
        const filename = `${song.name} - ${song.author}.${ext}`;

        const blob = await fetch(downloadUrl).then(res => res.blob());
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        return { success: true };
    } catch (error) {
        console.error('下载歌曲失败:', error);
        return { success: false, error: error.message };
    }
};

export const getSongQualityOptions = async (hash) => {
    try {
        const { get } = await import('../utils/request');
        const MoeAuthStore = (await import('../stores/store')).MoeAuthStore;
        const MoeAuth = MoeAuthStore();
        
        if (!MoeAuth.isAuthenticated) {
            return [{ value: '128', label: '标准品质', hash: hash }];
        }

        const privilegeResponse = await get('/privilege/lite', { hash: hash });
        const qualityOptions = getQualityOptions(privilegeResponse);
        
        if (qualityOptions.length === 0) {
            return [{ value: '128', label: '标准品质', hash: hash }];
        }

        return qualityOptions;
    } catch (error) {
        console.error('获取音质选项失败:', error);
        return [{ value: '128', label: '标准品质', hash: hash }];
    }
};

export const showQualitySelector = async (song, qualityOptions) => {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.background = 'rgba(0,0,0,0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '9999';
        modal.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        const modalContent = document.createElement('div');
        modalContent.style.padding = '24px';
        modalContent.style.maxWidth = '360px';
        modalContent.style.width = '90%';
        modalContent.style.background = '#fff';
        modalContent.style.borderRadius = '12px';
        modalContent.style.boxShadow = '0 10px 40px rgba(0,0,0,0.2)';

        modalContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">选择音质下载</div>
                <div style="font-size: 14px; color: #666; line-height: 1.4;">歌曲: ${escapeHtml(song.name)}</div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto;">
                ${qualityOptions.map((q, i) => `
                    <button 
                        style="padding: 12px 16px; text-align: left; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.2s; background: #fff; font-size: 14px; color: #333;"
                        onclick="this.style.background='#f5f5f5'; window.__downloadQualityResolve({ quality: '${q.value}', hash: '${q.hash}' });"
                    >
                        ${q.label}
                    </button>
                `).join('')}
            </div>
        `;

        window.__downloadQualityResolve = (result) => {
            resolve(result);
            document.body.removeChild(modal);
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                resolve(null);
                document.body.removeChild(modal);
            }
        };

        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    });
};

const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

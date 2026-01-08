import i18n from '@/utils/i18n';

export const applyColorTheme = (theme) => {
    let colors;
    if (theme === 'blue') {
        colors = {
            '--primary-color': '#4A90E2',
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
            '--secondary-color': '#FFB6C1',
            '--background-color': '#FFF0F5',
            '--background-color-secondary': '#FFE6EC',
            '--color-primary': '#ea33e4',
            '--color-primary-light': 'rgba(255, 107, 107, 0.1)',
            '--border-color': '#FFDCE3',
            '--hover-color': '#FFE9EF',
            '--color-secondary-bg-for-transparent': 'rgba(209, 209, 214, 0.28)',
            '--color-box-shadow': 'rgba(255, 105, 180, 0.2)',
        };
    } else {
        colors = {
            '--primary-color': '#FF69B4',
            '--secondary-color': '#FFB6C1',
            '--background-color': '#FFF0F5',
            '--background-color-secondary': '#FFE6F0',
            '--color-primary': '#ea33e4',
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

export const getQuality = (hashs, data) => {
    const savedConfig = JSON.parse(localStorage.getItem('settings'));
    if (savedConfig?.quality === 'high') {
        if(hashs){
            return hashs[1]?.hash || hashs[0].hash;
        }
        return data['hash_320'] || data['hash_192'] || data['hash_128'] || data['hash'];
    } else if (savedConfig?.quality === 'lossless') {
        if(hashs){
            return hashs[hashs.length - 1]?.hash || hashs[1]?.hash || hashs[0].hash;
        }
        return data['hash_flac'] || data['hash_ape'] || data['hash'];
    } else if (savedConfig?.quality === 'hires') {
        if(hashs){
            return hashs[hashs.length - 1]?.hash;
        }
        return data['hash_flac'] || data['hash_sq'] || data['hash_ape'] || data['hash'];
    }
    if(hashs){
        return hashs[0].hash;
    }
    return data['hash'];
}

export const formatMilliseconds = (time) => {
    const milliseconds = time > 3600 ? time : time * 1000;
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}分${seconds}秒`;
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

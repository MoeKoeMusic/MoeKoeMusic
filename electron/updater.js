import { app, dialog } from 'electron';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
import Store from 'electron-store';
import { t } from './i18n.js';

const store = new Store();
autoUpdater.autoDownload = false; // 自动下载更新
autoUpdater.autoInstallOnAppQuit = false; // 自动安装更新
// 开发环境模拟打包状态
Object.defineProperty(app, 'isPackaged', {
    get() {
        return true;
    }
});
// 设置更新服务器地址
export function setupAutoUpdater(mainWindow) {
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'iAJue',
        repo: 'MoeKoeMusic',
        releaseType: 'release'
    });

    autoUpdater.channel = 'latest';
    // 检查更新错误
    autoUpdater.on('error', (error) => {
        console.error('Update check failed:', error.message);
        dialog.showMessageBox({
        type: 'error',
        message: error.message.includes('ETIMEDOUT')
            ? t('update-timeout')
            : t('update-failed')
        });
    });
    // 检查到新版本
    autoUpdater.on('update-available', (info) => {
        const notes = info.releaseNotes?.replace(/<[^>]*>/g, '') || t('no-release-notes');
        const msg = t('new-version-msg').replace('{version}', info.version).replace('{notes}', notes);
        dialog.showMessageBox({
            type: 'info',
            title: t('new-version'),
            message: msg,
            buttons: [t('update-now'), t('later')],
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    });
    // 当前已是最新版本
    autoUpdater.on('update-not-available', () => {
        const settings = store.get('settings') || {};
        if (!settings.silentCheck) {
            dialog.showMessageBox({
                type: 'info',
                title: t('update-hint'),
                message: t('already-latest'),
                buttons: [t('ok')]
            });
        }
    });
    // 更新下载进度
    autoUpdater.on('download-progress', (progressObj) => {
        mainWindow.setProgressBar(progressObj.percent / 100);
        mainWindow.webContents.send('update-progress', progressObj);
    });
    // 更新下载完成
    autoUpdater.on('update-downloaded', () => {
        mainWindow.setProgressBar(-1);
        dialog.showMessageBox({
            type: 'info',
            title: t('update-ready'),
            message: t('update-ready-msg'),
            buttons: [t('install-now'), t('install-later')],
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall(false, true);
            }
        });
    });
}
// 检查更新
export function checkForUpdates(silent = false) {
    if (process.platform !== 'win32') {
        if (!silent) {
            dialog.showMessageBox({
                type: 'info',
                title: t('update-hint'),
                message: t('non-windows-update'),
                buttons: [t('ok')]
            });
        }
        return;
    }

    const settings = store.get('settings') || {};
    if (silent) {
        settings.silentCheck = true;
        store.set('settings', settings);
    } else {
        settings.silentCheck = false;
        store.set('settings', settings);
    }

    autoUpdater.checkForUpdates().catch(error => {
        console.error('Update check error:', error);
    });
}

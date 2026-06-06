import { app, dialog } from 'electron';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
import { t } from '../language/i18n.js';

let silentCheck = false;
let suppressUpdateAvailableDialog = 0;
autoUpdater.autoDownload = false; // 自动下载更新
autoUpdater.autoInstallOnAppQuit = false; // 自动安装更新
// 开发环境模拟打包状态
Object.defineProperty(app, 'isPackaged', {
    get() {
        return true;
    }
});

function showUpdateUnavailableMessage() {
    dialog.showMessageBox({
        type: 'info',
        title: t('update-hint'),
        message: t('non-update'),
        buttons: [t('ok')]
    });
}
async function checkForUpdatesSilently() {
    suppressUpdateAvailableDialog += 1;
    try {
        return await autoUpdater.checkForUpdates();
    } finally {
        suppressUpdateAvailableDialog -= 1;
    }
}

// 设置更新服务器地址
export function setupAutoUpdater(mainWindow) {
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'MoeKoeMusic',
        repo: 'MoeKoeMusic',
        releaseType: 'release'
    });

    autoUpdater.channel = 'latest';
    // 检查更新错误
    autoUpdater.on('error', (error) => {
        console.error('Update check failed:', error.message);
        mainWindow.webContents.send('update-error', {
            message: error.message
        });
        dialog.showMessageBox({
            type: 'error',
            message: error.message.includes('ETIMEDOUT')
                ? t('update-timeout')
                : (error.message || t('update-failed'))
        });
    });
    // 检查到新版本
    autoUpdater.on('update-available', (info) => {
        if (suppressUpdateAvailableDialog > 0) {
            return;
        }
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
        if (!silentCheck) {
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
        mainWindow.webContents.send('update-downloaded');
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
    silentCheck = silent;

    if (!autoUpdater.isUpdaterActive()) {
        if (!silent) {
            showUpdateUnavailableMessage();
        }
        return;
    }

    autoUpdater.checkForUpdates()
        .then(result => {
            if (!result && !silent) {
                showUpdateUnavailableMessage();
            }
        })
        .catch(error => {
            console.error('Update check error:', error);
        });
}

export async function startUpdateDownload() {
    silentCheck = true;

    if (!autoUpdater.isUpdaterActive()) {
        return {
            success: false,
            reason: 'unsupported'
        };
    }

    try {
        if (!autoUpdater.updateInfoAndProvider) {
            const result = await checkForUpdatesSilently();
            if (!result?.isUpdateAvailable) {
                return {
                    success: false,
                    reason: 'not-available'
                };
            }
        }

        await autoUpdater.downloadUpdate();
        return {
            success: true
        };
    } catch (error) {
        console.error('Start update download error:', error);
        return {
            success: false,
            reason: 'error',
            message: error?.message || String(error)
        };
    }
}

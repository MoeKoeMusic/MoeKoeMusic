import { app, ipcMain, globalShortcut, dialog, Notification, shell, session, powerSaveBlocker } from 'electron';
import {
    createWindow, createTray, createTouchBar, startApiServer,
    stopApiServer, registerShortcut,
    playStartupSound, createLyricsWindow, setThumbarButtons,
    registerProtocolHandler, sendHashAfterLoad, getTray, createMvWindow
} from './appServices.js';
import { initializeExtensions, cleanupExtensions } from './extensions.js';
import { setupAutoUpdater } from './updater.js';
import apiService from './apiService.js';
import Store from 'electron-store';
import path from 'path';
import { fileURLToPath } from 'url';
import { t } from './i18n.js';

let mainWindow = null;
let blockerId = null;
let lastStatusBarLyric = ''; // 缓存上一次的状态栏歌词
const store = new Store();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
} else {
    let protocolHandler;
    app.on('second-instance', (event, commandLine) => {
        if (!protocolHandler) {
            protocolHandler = registerProtocolHandler(null);
        }
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show(); 
            mainWindow.focus(); 
        }
        protocolHandler.handleProtocolArgv(commandLine);
    });
}

app.on('ready', () => {
    startApiServer().then(() => {
        try {
            mainWindow = createWindow();
            createTray(mainWindow);
            if (process.platform === "darwin" && store.get('settings')?.touchBar == 'on') createTouchBar(mainWindow);
            playStartupSound();
            registerShortcut();
            setupAutoUpdater(mainWindow);
            apiService.init(mainWindow);
            registerProtocolHandler(mainWindow);
            sendHashAfterLoad(mainWindow);
            initializeExtensions();
        } catch (error) {
            console.log('初始化应用时发生错误:', error);
            createTray(null);
            dialog.showMessageBox({
                type: 'error',
                title: t('error'),
                message: t('init-error'),
                buttons: [t('ok')]
            }).then(result => {
                if (result.response === 0) {
                    app.isQuitting = true;
                    app.quit();
                }
            });
        }
    }).catch((error) => {
        console.log('API 服务启动失败:', error);
        createTray(null);
        dialog.showMessageBox({
            type: 'error',
            title: t('error'),
            message: t('api-error'),
            buttons: [t('ok')]
        }).then(result => {
            if (result.response === 0) {
                app.isQuitting = true;
                app.quit();
            }
            return;
        });
    });
});

const settings = store.get('settings');
if (settings?.gpuAcceleration === 'on') {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('enable-transparent-visuals');
    app.commandLine.appendSwitch('disable-gpu-compositing');
}

if (settings?.preventAppSuspension === 'on') {
    blockerId = powerSaveBlocker.start('prevent-display-sleep');
}

if (settings?.highDpi === 'on') {
    app.commandLine.appendSwitch('high-dpi-support', '1');
    app.commandLine.appendSwitch('force-device-scale-factor', settings?.dpiScale || '1');
}

if (settings?.apiMode === 'on') {
    apiService.start();
}

// 即将退出
app.on('before-quit', () => {
    if (mainWindow && !mainWindow.isMaximized()) {
        const windowBounds = mainWindow.getBounds();
        store.set('windowState', windowBounds);
    }
    if (blockerId !== null) {
        powerSaveBlocker.stop(blockerId);
    }
    stopApiServer();
    apiService.stop();
    cleanupExtensions();
});
// 关闭所有窗口
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.isQuitting = true;
        app.quit(); // 非 macOS 系统上关闭所有窗口后退出应用
    }
});
// 图标被点击
app.on('activate', () => {
    if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show();
    } else if (!mainWindow) {
        mainWindow = createWindow();
    }
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('Unhandled Exception:', error);
});

// 监听渲染进程发送的免责声明结果
ipcMain.on('disclaimer-response', (event, accepted) => {
    if (accepted) {
        store.set('disclaimerAccepted', true);
    } else {
        app.quit();
    }
});

ipcMain.on('window-control', (event, action) => {
    switch (action) {
        case 'close':
            if (store.get('settings')?.minimizeToTray === 'off') {
                app.isQuitting = true;
                app.quit();
            } else {
                mainWindow.close();
            }
            break;
        case 'minimize':
            mainWindow.minimize();
            break;
        case 'maximize':
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
                store.set('maximize', false);
            } else {
                mainWindow.maximize();
                store.set('maximize', true);
            }
            break;
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
ipcMain.on('save-settings', (event, settings) => {
    store.set('settings', settings);
    if (['on', 'off'].includes(settings?.autoStart)) {
        app.setLoginItemSettings({
            openAtLogin: settings?.autoStart === 'on',
            path: app.getPath('exe'),
        });
    }
});
ipcMain.on('clear-settings', (event) => {
    store.clear();
    session.defaultSession.clearCache();
    session.defaultSession.clearStorageData();
    const userDataPath = app.getPath('userData');
    shell.openPath(userDataPath);
});
ipcMain.on('custom-shortcut', (event) => {
    registerShortcut();
});

ipcMain.on('lyrics-data', (event, lyricsData) => {
    const lyricsWindow = mainWindow.lyricsWindow;
    if (lyricsWindow) {
        lyricsWindow.webContents.send('lyrics-data', lyricsData);
    }

    // 状态栏歌词功能（仅支持Mac系统）
    if (process.platform === 'darwin') {
        const settings = store.get('settings');
        if (settings?.statusBarLyrics === 'on') {
            const tray = getTray();
            if (tray) {
                const currentLyric = lyricsData?.currentLyric || '';
                // 只在歌词文本发生变化时才更新状态栏，减少不必要的调用
                if (currentLyric !== lastStatusBarLyric) {
                    tray.setTitle(currentLyric);
                    lastStatusBarLyric = currentLyric;
                }
            }
        } else if (lastStatusBarLyric !== '') {
            // 如果关闭了状态栏歌词功能，清空状态栏文本和缓存
            const tray = getTray();
            if (tray) {
                tray.setTitle('');
                lastStatusBarLyric = '';
            }
        }
    }
});
ipcMain.on('server-lyrics', (event, lyricsData) => {
    apiService.updateLyrics(lyricsData);
});

// 监听桌面歌词操作
ipcMain.on('desktop-lyrics-action', (event, action) => {
    switch (action) {
        case 'previous-song':
            mainWindow.webContents.send('play-previous-track');
            break;
        case 'next-song':
            mainWindow.webContents.send('play-next-track');
            break;
        case 'toggle-play':
            mainWindow.webContents.send('toggle-play-pause');
            break;
        case 'close-lyrics':
            const lyricsWindow = mainWindow.lyricsWindow;
            if (lyricsWindow) {
                lyricsWindow.close();
                new Notification({
                    title: t('desktop-lyrics-closed'),
                    body: t('this-time-only'),
                    icon: path.join(__dirname, '../build/icons/logo.png')
                }).show();
                mainWindow.lyricsWindow = null;
            }
            break;
        case 'display-lyrics':
            if (!mainWindow.lyricsWindow) createLyricsWindow();
            break;
    }
});

ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
    const lyricsWindow = mainWindow.lyricsWindow;
    if (lyricsWindow) {
        lyricsWindow.setIgnoreMouseEvents(ignore, { forward: true });
    }
});

ipcMain.on('window-drag', (event, { mouseX, mouseY }) => {
    const lyricsWindow = mainWindow.lyricsWindow;
    if (!lyricsWindow) return
    lyricsWindow.setPosition(mouseX, mouseY)
    store.set('lyricsWindowPosition', { x: mouseX, y: mouseY });
})

ipcMain.on('play-pause-action', (event, playing, currentTime) => {
    const lyricsWindow = mainWindow.lyricsWindow;
    if (lyricsWindow) {
        lyricsWindow.webContents.send('playing-status', playing);
    }
    apiService.updatePlayerState({ isPlaying: playing, currentTime: currentTime });
    setThumbarButtons(mainWindow, playing);
})

ipcMain.on('open-url', (event, url) => {
    shell.openExternal(url);
})

ipcMain.on('set-tray-title', (event, title) => {
    createTray(mainWindow, t('now-playing') + title);
    mainWindow.setTitle(title);
})


ipcMain.handle('open-mv-window', (e, url) => {
    const mvWindow = createMvWindow();
    mvWindow.loadURL(url).then(() => {
        mvWindow.show();
    });
});

import { app, ipcMain, globalShortcut, dialog, Notification, shell, session, powerSaveBlocker, nativeImage } from 'electron';
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
let clearLyricsTimeout = null; // 用于歌词清空的防抖定时器
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
            const currentLyric = lyricsData?.currentLyric || '';

            if (currentLyric) {
                // 有歌词时：立即清除之前的清空定时器，并立即更新
                if (clearLyricsTimeout) {
                    clearTimeout(clearLyricsTimeout);
                    clearLyricsTimeout = null;
                }

                if (currentLyric !== lastStatusBarLyric) {
                    mainWindow.webContents.send('generate-statusbar-image', currentLyric);
                    lastStatusBarLyric = currentLyric;
                }
            } else {
                // 无歌词时：不要立即清空，而是设置防抖定时器
                // 只有当 2000ms 内都没有新歌词来，才真正清空
                if (!clearLyricsTimeout && lastStatusBarLyric !== '') {
                    clearLyricsTimeout = setTimeout(() => {
                        // 再次检查设置，确保在这段时间内没关闭功能
                        const currentSettings = store.get('settings');
                        if (currentSettings?.statusBarLyrics === 'on') {
                            mainWindow.webContents.send('generate-statusbar-image', ''); // 发送空字符串触发占位符
                            lastStatusBarLyric = '';
                        }
                        clearLyricsTimeout = null;
                    }, 2000); // 2秒防抖
                }
            }
        } else if (lastStatusBarLyric !== '') {
            // 功能关闭时：立即清理
            if (clearLyricsTimeout) {
                clearTimeout(clearLyricsTimeout);
                clearLyricsTimeout = null;
            }
            const tray = getTray();
            if (tray) {
                tray.setTitle('');
                tray.setImage(nativeImage.createEmpty());
                createTray(mainWindow);
                lastStatusBarLyric = '';
            }
        }
    }
});

// 监听渲染进程生成的图片并更新 Tray
ipcMain.on('update-statusbar-image', (event, dataUrl) => {
    const tray = getTray();
    if (tray && dataUrl) {
        try {
            // 解析 Base64 数据
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');

            // 创建空的 nativeImage
            const image = nativeImage.createEmpty();

            // 添加 @2x 资源 (scaleFactor: 2.0)
            // 逻辑尺寸 200x22, 实际 Buffer 是 400x44 (由前端 Canvas 生成)
            image.addRepresentation({
                scaleFactor: 2.0,
                width: 200,
                height: 22,
                buffer: buffer
            });

            image.setTemplateImage(true);

            tray.setImage(image);
            tray.setTitle('');
        } catch (e) {
            console.error('Failed to set tray image:', e);
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
    const tray = getTray();
    if (tray) {
        const settings = store.get('settings');
        // 如果状态栏歌词功能开启，不设置标题，使用歌词图片
        if (settings?.statusBarLyrics === 'on') {
            return;
        }
        // 否则设置标题
        tray.setTitle(t('now-playing') + title);
    }
    mainWindow.setTitle(title);
})


ipcMain.handle('open-mv-window', (e, url) => {
    const mvWindow = createMvWindow();
    mvWindow.loadURL(url).then(() => {
        mvWindow.show();
    });
});

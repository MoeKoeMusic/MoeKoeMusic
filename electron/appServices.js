import { app, BrowserWindow, screen, Tray, Menu, globalShortcut, dialog, shell } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import log from 'electron-log';
import Store from 'electron-store';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import fs from 'fs';
import { exec } from 'child_process';
import { checkForUpdates } from './updater.js';
import { Notification } from 'electron';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const store = new Store();
let mainWindow = null;
let apiProcess = null;
let tray = null;

// 创建主窗口
export function createWindow() {
    const savedConfig = store.get('settings');
    const useNativeTitleBar = savedConfig?.nativeTitleBar === 'on' ? true : false;
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    const windowWidth = Math.min(1200, screenWidth * 0.8);
    const windowHeight = Math.min(938, screenHeight * 0.9);
    const lastWindowState = store.get('windowState') || {};
    mainWindow = new BrowserWindow({
        width: lastWindowState.width || windowWidth,
        height: lastWindowState.height || windowHeight,
        x: lastWindowState.x || Math.floor((screenWidth - windowWidth) / 2),
        y: lastWindowState.y || Math.floor((screenHeight - windowHeight) / 2),
        minWidth: 890,
        minHeight: 750,
        frame: useNativeTitleBar,
        titleBarStyle: useNativeTitleBar ? 'default' : 'hiddenInset',
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: true,
            zoomFactor: 1.0
        },
        icon: isDev
            ? path.join(__dirname, '../build/icons/icon.ico')
            : path.join(process.resourcesPath, 'icons', 'icon.ico')
    });

    if (store.get('maximize')) {
        mainWindow.maximize();
    }

    if (isDev) {
        mainWindow.loadURL('http://localhost:8080');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.webContents.on('dom-ready', () => {
        console.log('DOM Ready');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Page Loaded Successfully');
        mainWindow.webContents.insertCSS('::-webkit-scrollbar { display: none; }');
        if (!store.get('disclaimerAccepted')) {
            mainWindow.webContents.send('show-disclaimer');
        }
        mainWindow.webContents.send('version', app.getVersion());
    });

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    if (process.platform === 'win32') {
        setThumbarButtons(mainWindow);
    }

    if (savedConfig?.desktopLyrics === 'on') {
        createLyricsWindow();
    }
    return mainWindow;
}

let lyricsWindow;

export function createLyricsWindow() {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = Math.floor(screenWidth * 0.7);
    const windowHeight = 200;

    const savedLyricsPosition = store.get('lyricsWindowPosition') || {
        x: Math.floor((screenWidth - windowWidth) / 2),
        y: screenHeight - windowHeight
    };

    lyricsWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x: savedLyricsPosition.x,
        y: savedLyricsPosition.y,
        alwaysOnTop: true,
        frame: false,
        transparent: true,
        resizable: false,
        skipTaskbar: true,
        hasShadow: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: true,
            backgroundThrottling: false,
            zoomFactor: 1.0
        }
    });
    mainWindow.lyricsWindow = lyricsWindow;
    lyricsWindow.on('closed', () => {
        mainWindow.lyricsWindow = null;
    });
    if (isDev) {
        lyricsWindow.loadURL('http://localhost:8080/#/lyrics');
        lyricsWindow.webContents.openDevTools();
    } else {
        lyricsWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
            hash: 'lyrics'
        });
    }

    // 监听窗口移动事件，限制窗口位置
    let moveTimer;
    lyricsWindow.on('move', () => {
        if (moveTimer) return;
        moveTimer = setTimeout(() => {
            const bounds = lyricsWindow.getBounds();
            const { height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
            if (bounds.y + bounds.height > screenHeight) {
                lyricsWindow.setPosition(bounds.x, screenHeight - bounds.height);
            }
            if (bounds.y < 0) {
                lyricsWindow.setPosition(bounds.x, 0);
            }
            clearTimeout(moveTimer);
            moveTimer = null;
        }, 3000);
    });

    // 设置窗口置顶级别
    lyricsWindow.setAlwaysOnTop(true, 'screen-saver');
    lyricsWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // 允许窗口透明
    lyricsWindow.setBackgroundColor('#00000000');
}

// 创建托盘图标及菜单
export function createTray(mainWindow, title='') {
    if(tray && title) {
        tray.setToolTip(title);
        return tray;
    }
    const trayIconPath = isDev
        ? path.join(__dirname, '../build/icons/tray-icon.png')
        : ((process.platform === 'win32') ? path.join(process.resourcesPath, 'icons', 'tray-icon.ico') : path.join(process.resourcesPath, 'icons', 'tray-icon.png'));

    tray = new Tray(trayIconPath);
    tray.setToolTip('MoeKoe Music');

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '项目主页',
            icon: isDev ? path.join(__dirname, '../build/icons/menu/home.png') : path.join(process.resourcesPath, 'icons', 'menu', 'home.png'),
            click: () => {
                shell.openExternal('https://github.com/iAJue/');
            }
        },
        {
            label: '反馈bug',
            icon: isDev ? path.join(__dirname, '../build/icons/menu/bug.png') : path.join(process.resourcesPath, 'icons', 'menu', 'bug.png'),
            click: () => {
                shell.openExternal('https://github.com/iAJue/MoeKoeMusic/issues');
            }
        },
        {
            label: '上一首',
            icon: isDev ? path.join(__dirname, '../build/icons/menu/prev.png') : path.join(process.resourcesPath, 'icons', 'menu', 'prev.png'), accelerator: 'Alt+CommandOrControl+Left',
            click: () => {
                mainWindow.webContents.send('play-previous-track');
            }
        },
        {
            label: '暂停', accelerator: 'Alt+CommandOrControl+Space',
            icon: isDev ? path.join(__dirname, '../build/icons/menu/play.png') : path.join(process.resourcesPath, 'icons', 'menu', 'play.png'),
            click: () => {
                mainWindow.webContents.send('toggle-play-pause');
            }
        },
        {
            label: '下一首', accelerator: 'Alt+CommandOrControl+Right',
            icon: isDev ? path.join(__dirname, '../build/icons/menu/next.png') : path.join(process.resourcesPath, 'icons', 'menu', 'next.png'),
            click: () => {
                mainWindow.webContents.send('play-next-track');
            }
        },
        {
            label: '检查更新',
            icon: isDev ? path.join(__dirname, '../build/icons/menu/update.png') : path.join(process.resourcesPath, 'icons', 'menu', 'update.png'),
            click: () => {
                checkForUpdates(false);
            }
        },
        {
            label: '显示/隐藏', accelerator: 'CmdOrCtrl+Shift+S',
            icon: isDev ? path.join(__dirname, '../build/icons/menu/show.png') : path.join(process.resourcesPath, 'icons', 'menu', 'show.png'),
            click: () => {
                if (mainWindow) {
                    if (mainWindow.isVisible()) {
                        mainWindow.hide();
                    } else {
                        mainWindow.show();
                    }
                }
            }
        },
        {
            label: '退出程序', accelerator: 'CmdOrCtrl+Q',
            icon: isDev ? path.join(__dirname, '../build/icons/menu/quit.png') : path.join(process.resourcesPath, 'icons', 'menu', 'quit.png'),
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    switch (process.platform) {
        case 'linux':
            tray.setContextMenu(contextMenu);
            break;
        default:
            tray.on('right-click', () => {
                tray.popUpContextMenu(contextMenu);
            });
    }
    tray.on('click', () => {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
    tray.on('double-click', () => {
        mainWindow.show();
    });
    return tray;
}

// 启动 API 服务器
export function startApiServer() {
    return new Promise((resolve, reject) => {
        let apiPath = '';
        if (isDev) {
            return resolve();
            // apiPath = path.join(__dirname, '../api/app_api');
        } else {
            switch (process.platform) {
                case 'win32':
                    apiPath = path.join(process.resourcesPath, '../api', 'app_win.exe');
                    break;
                case 'darwin':
                    apiPath = path.join(process.resourcesPath, '../api', 'app_macos');
                    break;
                case 'linux':
                    apiPath = path.join(process.resourcesPath, '../api', 'app_linux');
                    break;
                default:
                    reject(new Error(`Unsupported platform: ${process.platform}`));
                    return;
            }
        }

        log.info(`API路径: ${apiPath}`);

        if (!fs.existsSync(apiPath)) {
            const error = new Error(`API可执行文件未找到：${apiPath}`);
            log.error(error.message);
            reject(error);
            return;
        }

        // 启动 API 服务器进程
        apiProcess = spawn(apiPath, [], { windowsHide: true });

        apiProcess.stdout.on('data', (data) => {
            log.info(`API输出: ${data}`);
            if (data.toString().includes('running')) {
                console.log('API服务器已启动');
                resolve();
            }
        });

        apiProcess.stderr.on('data', (data) => {
            log.error(`API 错误: ${data}`);
        });

        apiProcess.on('close', (code) => {
            log.info(`API 关闭，退出码: ${code}`);
        });

        apiProcess.on('error', (error) => {
            log.error('启动 API 失败:', error);
            reject(error);
        });
    });
}

// 停止 API 服务器
export function stopApiServer() {
    if (apiProcess) {
        process.kill(apiProcess.pid, 'SIGKILL');
        apiProcess = null;
    }
}

// 注册快捷键
export function registerShortcut() {
    try {
        const settings = store.get('settings');
        globalShortcut.unregisterAll();
        let clickFunc = () => { app.isQuitting = true; };
        if (process.platform === 'darwin') {
            app.on('before-quit', clickFunc);
        } else {
            clickFunc = () => {
                app.isQuitting = true;
                app.quit();
            };
            if (settings?.shortcuts?.quitApp) {
                globalShortcut.register(settings?.shortcuts?.quitApp, clickFunc);
            } else if (!settings?.shortcuts) {
                globalShortcut.register('CmdOrCtrl+Q', clickFunc);
            }
        }

        clickFunc = () => {
            if (mainWindow) {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                }
            }
        }
        if (settings?.shortcuts?.mainWindow) {
            globalShortcut.register(settings?.shortcuts?.mainWindow, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('CmdOrCtrl+Shift+S', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('play-previous-track');
        if (settings?.shortcuts?.prevTrack) {
            globalShortcut.register(settings?.shortcuts?.prevTrack, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+Left', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('play-next-track');
        if (settings?.shortcuts?.nextTrack) {
            globalShortcut.register(settings?.shortcuts?.nextTrack, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+Right', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('volume-up');
        if (settings?.shortcuts?.volumeUp) {
            globalShortcut.register(settings?.shortcuts?.volumeUp, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+Up', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('volume-down');
        if (settings?.shortcuts?.volumeDown) {
            globalShortcut.register(settings?.shortcuts?.volumeDown, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+Down', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('toggle-play-pause');
        if (settings?.shortcuts?.playPause) {
            globalShortcut.register(settings?.shortcuts?.playPause, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+Space', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('toggle-mute');
        if (settings?.shortcuts?.mute) {
            globalShortcut.register(settings?.shortcuts?.mute, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+M', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('toggle-like');
        if (settings?.shortcuts?.like) {
            globalShortcut.register(settings?.shortcuts?.like, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+L', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('toggle-mode');
        if (settings?.shortcuts?.mode) {
            globalShortcut.register(settings?.shortcuts?.mode, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+P', clickFunc);
        }

        clickFunc = () => {
            if (mainWindow.lyricsWindow) {
                mainWindow.lyricsWindow.close();
                mainWindow.lyricsWindow = null;
                new Notification({
                    title: '桌面歌词已关闭',
                    body: '仅本次生效',
                    icon: isDev ? path.join(__dirname, '../build/icons/logo.png') : path.join(process.resourcesPath, 'icons', 'logo.png')
                }).show();
            } else {
                createLyricsWindow();
            }
        }
        if (settings?.shortcuts?.toggleDesktopLyrics) {
            globalShortcut.register(settings.shortcuts.toggleDesktopLyrics, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+Ctrl+D', clickFunc);
        }
    } catch{
        dialog.showMessageBox({
            type: 'error',
            title: '提示',
            message: '快捷键注册失败，请重新尝试',
            buttons: ['确定']
        });
    }
}

// 播放启动问候语
export function playStartupSound() {
    const savedConfig = store.get('settings');
    if (!savedConfig || (savedConfig['greetings'] !== 'on' && savedConfig['greetings'] !== 'null')) {
        return;
    }
    const audioFiles = [
        '/assets/sound/yise-jp.mp3',
        '/assets/sound/qiqi-jp.mp3',
        '/assets/sound/qiqi-zh.mp3'
    ];
    const randomIndex = Math.floor(Math.random() * audioFiles.length);
    const soundPath = isDev
        ? path.join(__dirname, '..', 'public', audioFiles[randomIndex])
        : path.join(process.resourcesPath, 'public', audioFiles[randomIndex]);
    try {
        switch (process.platform) {
            case 'win32':
                const escapedPath = soundPath.replace(/'/g, "''");
                exec(`powershell -c "Add-Type -AssemblyName PresentationCore; $player = New-Object System.Windows.Media.MediaPlayer; $player.Open('${escapedPath}'); $player.Play(); Start-Sleep -s 3; $player.Stop()"`);
                break;
            case 'darwin':
                exec(`afplay "${soundPath}"`);
                break;
            case 'linux':
                exec(`paplay "${soundPath}"`, (error) => {
                    if (error) {
                        exec(`play "${soundPath}"`);
                    }
                });
                break;
        }
    } catch (error) {
        log.error('播放启动问候语失败:', error);
    }
}

// 设置任务栏缩略图工具栏
export function setThumbarButtons(mainWindow, isPlaying = false) {
    const buttons = [
        {
            tooltip: '上一首',
            icon: isDev
                ? path.join(__dirname, '../build/icons/prev.png')
                : path.join(process.resourcesPath, 'icons', 'prev.png'),
            click: () => {
                mainWindow.webContents.send('play-previous-track');
                setThumbarButtons(mainWindow, true);
            }
        },
        {
            tooltip: '暂停',
            icon: isDev
                ? path.join(__dirname, '../build/icons/pause.png')
                : path.join(process.resourcesPath, 'icons', 'pause.png'),
            click: () => {
                mainWindow.webContents.send('toggle-play-pause');
                setThumbarButtons(mainWindow, false);
            }
        },
        {
            tooltip: '下一首',
            icon: isDev
                ? path.join(__dirname, '../build/icons/next.png')
                : path.join(process.resourcesPath, 'icons', 'next.png'),
            click: () => {
                mainWindow.webContents.send('play-next-track');
                setThumbarButtons(mainWindow, true);
            }
        }
    ];

    if (!isPlaying) {
        buttons[1] = {
            tooltip: '播放',
            icon: isDev
                ? path.join(__dirname, '../build/icons/play.png')
                : path.join(process.resourcesPath, 'icons', 'play.png'),
            click: () => {
                mainWindow.webContents.send('toggle-play-pause');
                setThumbarButtons(mainWindow, true);
            }
        };
    }

    mainWindow.setThumbarButtons(buttons);
}

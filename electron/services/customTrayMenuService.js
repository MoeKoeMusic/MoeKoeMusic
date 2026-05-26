import { app, BrowserWindow, ipcMain, screen, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkForUpdates } from './updater.js';
import { t } from '../language/i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRAY_MENU_WIDTH = 300;
const TRAY_MENU_HEIGHT = 480;

class CustomTrayMenuService {
    constructor() {
        this.menuWindow = null;
        this.getMainWindow = null;
        this.getTray = null;
        this.initialized = false;
        this.pendingState = null;
        this.renderToken = 0;
        this.pendingRenderResolve = null;
        this.pendingRenderTimer = null;
        this.playbackState = {
            isPlaying: false,
            currentTime: 0
        };
    }

    init(getMainWindow, getTray) {
        this.getMainWindow = getMainWindow;
        this.getTray = getTray;

        if (this.initialized) return;
        this.initialized = true;

        ipcMain.on('tray-menu-ready', () => {
            if (this.pendingState) {
                this.pushState(this.pendingState);
            } else {
                void this.refresh();
            }
        });

        ipcMain.on('tray-menu-hide', () => {
            this.hide();
        });

        ipcMain.on('tray-menu-action', (_event, action) => {
            void this.handleAction(action);
        });

        ipcMain.on('tray-menu-rendered', (_event, token) => {
            if (token !== this.renderToken || !this.pendingRenderResolve) return;
            this.finishRenderWait();
        });

    }

    isVisible() {
        return !!this.menuWindow && !this.menuWindow.isDestroyed() && this.menuWindow.isVisible();
    }

    async toggle() {
        if (this.isVisible()) {
            this.hide();
            return;
        }
        await this.show();
    }

    async show() {
        const tray = this.getTray?.();
        const mainWindow = this.getMainWindow?.();

        if (!tray || !mainWindow || mainWindow.isDestroyed()) return;

        await this.ensureWindow();
        this.pendingState = await this.getMenuState(mainWindow);
        const renderPromise = this.waitForRender();
        this.pushState({
            ...this.pendingState,
            renderToken: this.renderToken
        });
        await renderPromise;

        if (!this.menuWindow || this.menuWindow.isDestroyed()) return;

        this.positionWindow(tray);
        this.menuWindow.show();
        this.menuWindow.focus();
    }

    hide() {
        if (this.menuWindow && !this.menuWindow.isDestroyed()) {
            this.menuWindow.destroy();
        }
        this.menuWindow = null;
        this.finishRenderWait();
    }

    cleanup() {
        if (this.menuWindow && !this.menuWindow.isDestroyed()) {
            this.menuWindow.destroy();
        }
        this.menuWindow = null;
    }

    updatePlaybackState(isPlaying, currentTime = 0) {
        this.playbackState = {
            isPlaying: !!isPlaying,
            currentTime: Number.isFinite(Number(currentTime)) ? Number(currentTime) : 0
        };

        if (this.isVisible()) {
            void this.refresh();
        }
    }

    async refresh() {
        if (!this.isVisible()) return;
        const mainWindow = this.getMainWindow?.();
        if (!mainWindow || mainWindow.isDestroyed()) return;

        this.pendingState = await this.getMenuState(mainWindow);
        this.pushState(this.pendingState);
    }

    async ensureWindow() {
        if (this.menuWindow && !this.menuWindow.isDestroyed()) return;

        this.menuWindow = new BrowserWindow({
            width: TRAY_MENU_WIDTH,
            height: TRAY_MENU_HEIGHT,
            show: false,
            frame: false,
            transparent: true,
            hasShadow: true,
            resizable: false,
            minimizable: false,
            maximizable: false,
            fullscreenable: false,
            skipTaskbar: true,
            alwaysOnTop: true,
            roundedCorners: true,
            backgroundColor: '#00000000',
            webPreferences: {
                preload: path.join(__dirname, '../preload.cjs'),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: false,
                webSecurity: false,
                allowRunningInsecureContent: true
            }
        });

        this.menuWindow.setAlwaysOnTop(true, 'pop-up-menu');
        this.menuWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

        this.menuWindow.on('blur', () => {
            this.hide();
        });

        this.menuWindow.on('closed', () => {
            this.menuWindow = null;
            this.finishRenderWait();
        });

        await this.menuWindow.loadFile(path.join(__dirname, '../view/index.html'));
    }

    positionWindow(tray) {
        if (!this.menuWindow || this.menuWindow.isDestroyed()) return;

        const trayBounds = tray.getBounds();
        const display = screen.getDisplayMatching(trayBounds);
        const workArea = display.workArea;
        const isBottomTray = trayBounds.y > workArea.y + workArea.height / 2;

        let x = trayBounds.x + Math.round(trayBounds.width / 2) - Math.round(TRAY_MENU_WIDTH / 2);
        let y = isBottomTray
            ? trayBounds.y - TRAY_MENU_HEIGHT - 10
            : trayBounds.y + trayBounds.height + 10;

        x = Math.max(workArea.x + 8, Math.min(x, workArea.x + workArea.width - TRAY_MENU_WIDTH - 8));
        y = Math.max(workArea.y + 8, Math.min(y, workArea.y + workArea.height - TRAY_MENU_HEIGHT - 8));

        this.menuWindow.setBounds({
            x,
            y,
            width: TRAY_MENU_WIDTH,
            height: TRAY_MENU_HEIGHT
        });
    }

    pushState(state) {
        if (!this.menuWindow || this.menuWindow.isDestroyed()) return;
        this.menuWindow.webContents.send('tray-menu-state', state);
    }

    waitForRender() {
        this.renderToken += 1;
        if (this.pendingRenderTimer) {
            clearTimeout(this.pendingRenderTimer);
            this.pendingRenderTimer = null;
        }

        return new Promise((resolve) => {
            this.pendingRenderResolve = resolve;
            this.pendingRenderTimer = setTimeout(() => {
                this.finishRenderWait();
            }, 120);
        });
    }

    finishRenderWait() {
        if (this.pendingRenderTimer) {
            clearTimeout(this.pendingRenderTimer);
            this.pendingRenderTimer = null;
        }
        const resolve = this.pendingRenderResolve;
        this.pendingRenderResolve = null;
        resolve?.();
    }

    async getMenuState(mainWindow) {
        const storage = await mainWindow.webContents.executeJavaScript(`
            (() => {
                try {
                    return {
                        currentSong: localStorage.getItem('current_song'),
                        playerProgress: localStorage.getItem('player_progress'),
                        theme: localStorage.getItem('theme')
                    };
                } catch (error) {
                    return {
                        currentSong: null,
                        playerProgress: null,
                        theme: null
                    };
                }
            })();
        `, true).catch(() => ({
            currentSong: null,
            playerProgress: null,
            theme: null
        }));

        return {
            theme: this.getTheme(storage.theme),
            isPlaying: this.playbackState.isPlaying,
            song: this.normalizeSong(storage.currentSong, storage.playerProgress),
            labels: this.getLabels(),
            shortcuts: this.getShortcuts()
        };
    }

    normalizeSong(currentSongRaw, playerProgressRaw) {
        if (!currentSongRaw) return null;

        try {
            const currentSong = JSON.parse(currentSongRaw);
            const duration = Number(currentSong?.timeLength) || 0;
            const progress = Number(playerProgressRaw);
            const currentTime = Math.max(0, Math.min(
                Number.isFinite(progress) ? progress : this.playbackState.currentTime,
                duration || Number.MAX_SAFE_INTEGER
            ));
            const progressPercent = duration > 0 ? Math.max(0, Math.min((currentTime / duration) * 100, 100)) : 0;

            return {
                title: currentSong?.displayName || currentSong?.name || 'MoeKoe Music',
                artist: currentSong?.author || 'MoeJue',
                cover: currentSong?.img || '',
                qualityLabel: currentSong?.qualityLabel || '',
                currentTime,
                duration,
                currentTimeText: this.formatTime(currentTime),
                durationText: this.formatTime(duration),
                progressPercent
            };
        } catch {
            return null;
        }
    }

    formatTime(seconds) {
        const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
        const minutes = Math.floor(safeSeconds / 60);
        const remainSeconds = safeSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`;
    }

    getTheme(themeCache) {
        return themeCache === 'dark' ? 'dark' : 'light';
    }

    getLabels() {
        return {
            noSong: t('mei-you-zheng-zai-bo-fang-de-ge-qu'),
            projectHome: t('project-home'),
            reportBug: t('report-bug'),
            prevTrack: t('prev-track'),
            playPause: t('zan-ting-bo-fang'),
            nextTrack: t('next-track'),
            checkUpdates: t('check-updates'),
            restartApp: t('restart-app'),
            showHide: t('show-hide'),
            quit: t('quit')
        };
    }

    getShortcuts() {
        const isMac = process.platform === 'darwin';
        return {
            prevTrack: isMac ? 'Alt + Command + Left' : 'Alt + Ctrl + Left',
            playPause: isMac ? 'Alt + Command + Space' : 'Alt + Ctrl + Space',
            nextTrack: isMac ? 'Alt + Command + Right' : 'Alt + Ctrl + Right',
            showHide: isMac ? 'Command + Shift + S' : 'Ctrl + Shift + S',
            quit: isMac ? 'Command + Q' : 'Ctrl + Q'
        };
    }

    async handleAction(action) {
        const mainWindow = this.getMainWindow?.();
        const keepOpenActions = new Set(['prev-track', 'toggle-play-pause', 'next-track']);

        switch (action) {
            case 'project-home':
                shell.openExternal('https://Music.MoeKoe.cn');
                break;
            case 'report-bug':
                shell.openExternal('https://github.com/iAJue/MoeKoeMusic/issues');
                break;
            case 'prev-track':
                mainWindow?.webContents.send('play-previous-track');
                break;
            case 'toggle-play-pause':
                mainWindow?.webContents.send('toggle-play-pause');
                break;
            case 'next-track':
                mainWindow?.webContents.send('play-next-track');
                break;
            case 'check-updates':
                checkForUpdates(false);
                break;
            case 'restart-app':
                app.relaunch();
                app.isQuitting = true;
                app.quit();
                return;
            case 'show-hide':
                if (mainWindow) {
                    if (mainWindow.isVisible()) {
                        mainWindow.hide();
                    } else {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                }
                break;
            case 'quit':
                app.isQuitting = true;
                app.quit();
                return;
            default:
                return;
        }

        if (keepOpenActions.has(action)) {
            setTimeout(() => {
                void this.refresh();
            }, 180);
            return;
        }

        this.hide();
    }
}

export default new CustomTrayMenuService();

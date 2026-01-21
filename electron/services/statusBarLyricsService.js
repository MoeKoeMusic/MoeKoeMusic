import { ipcMain, nativeImage } from 'electron';

class StatusBarLyricsService {
    constructor() {
        this.mainWindow = null;
        this.store = null;
        this.tray = null;
        this.clearLyricsTimeout = null;
        this.lastStatusBarLyric = '';
        this.lastTrayUpdateTime = 0;
        this.lastTrayImageHash = '';
        this.TRAY_UPDATE_THROTTLE = 30; // 30ms 节流
        this.getTrayCallback = null;
        this.createTrayCallback = null;
    }

    init(mainWindow, store, getTrayCallback, createTrayCallback) {
        this.mainWindow = mainWindow;
        this.store = store;
        this.getTrayCallback = getTrayCallback;
        this.createTrayCallback = createTrayCallback;

        if (process.platform === 'darwin') {
            this.registerListeners();
            this.initializeOnStartup();  // 自动初始化
        }
    }

    // 判断状态栏歌词是否开启 (macOS 默认开启)
    isStatusBarLyricsEnabled() {
        if (process.platform !== 'darwin') return false;

        const settings = this.store.get('settings') || {};
        // 首次安装时 (undefined) 或明确设为 'on' 时开启
        return settings.statusBarLyrics === undefined || settings.statusBarLyrics === 'on';
    }

    registerListeners() {
        // 监听渲染进程生成的图片并更新 Tray
        ipcMain.on('update-statusbar-image', (event, dataUrl) => {
            this.handleUpdateImage(dataUrl);
        });
    }

    // 处理歌词数据 (供 main.js 调用)
    handleLyricsData(lyricsData) {
        if (!this.isStatusBarLyricsEnabled()) {
            this.handleDisabledState();
            return;
        }

        const currentLyric = lyricsData?.currentLyric || '';

        if (currentLyric) {
            // 有歌词：清除防抖定时器，立即更新
            if (this.clearLyricsTimeout) {
                clearTimeout(this.clearLyricsTimeout);
                this.clearLyricsTimeout = null;
            }

            if (currentLyric !== this.lastStatusBarLyric) {
                if (this.mainWindow?.webContents) {
                    this.mainWindow.webContents.send('generate-statusbar-image', currentLyric);
                }
                this.lastStatusBarLyric = currentLyric;
            }
        } else {
            // 无歌词 (间奏)：启动 5秒 防抖
            if (!this.clearLyricsTimeout && this.lastStatusBarLyric !== '') {
                this.clearLyricsTimeout = setTimeout(() => {
                    // 再次检查设置，确保这段时间没被关闭
                    if (this.isStatusBarLyricsEnabled()) {
                        if (this.mainWindow?.webContents) {
                            this.mainWindow.webContents.send('generate-statusbar-image', ''); // 发送空字符触发占位符
                        }
                        this.lastStatusBarLyric = '';
                    }
                    this.clearLyricsTimeout = null;
                }, 5000);
            }
        }
    }

    // 处理功能关闭时的状态清理
    handleDisabledState() {
        if (this.lastStatusBarLyric !== '') {
            if (this.clearLyricsTimeout) {
                clearTimeout(this.clearLyricsTimeout);
                this.clearLyricsTimeout = null;
            }

            const tray = this.getTrayCallback ? this.getTrayCallback() : null;
            if (tray && !tray.isDestroyed()) {
                tray.setTitle(''); // 清除文字
                tray.setImage(nativeImage.createEmpty()); // 清除图片

                // 如果需要恢复原始 Tray 图标，这里可能需要重新调用 createTray
                if (this.createTrayCallback) {
                    this.createTrayCallback(this.mainWindow);
                }

                this.lastStatusBarLyric = '';
            }
        }
    }

    // 处理图片更新 (更新 Tray)
    handleUpdateImage(dataUrl) {
        // 节流
        const now = Date.now();
        if (now - this.lastTrayUpdateTime < this.TRAY_UPDATE_THROTTLE) return;

        // Tray 检查
        const tray = this.getTrayCallback ? this.getTrayCallback() : null;
        if (!tray || tray.isDestroyed()) return;

        if (!dataUrl) return;

        // 哈希去重
        const imageHash = dataUrl.slice(-100);
        if (imageHash === this.lastTrayImageHash) return;

        this.lastTrayUpdateTime = now;
        this.lastTrayImageHash = imageHash;

        try {
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const image = nativeImage.createEmpty();

            // 逻辑尺寸 200x22, 实际 Buffer 400x44 (@2x)
            image.addRepresentation({
                scaleFactor: 2.0,
                width: 200,
                height: 22,
                buffer: buffer
            });

            image.setTemplateImage(true);

            if (tray && !tray.isDestroyed()) {
                tray.setImage(image);
                tray.setTitle(''); // 确保不显示文字
            }
        } catch (e) {
            console.error('[StatusBarService] Failed to set tray image:', e);
        }
    }

    // 应用启动时初始化状态栏歌词（私有方法）
    initializeOnStartup() {
        if (!this.isStatusBarLyricsEnabled()) {
            return;
        }

        // 等待窗口准备好后触发渲染
        this.mainWindow.webContents.once('did-finish-load', () => {
            setTimeout(() => {
                if (this.mainWindow?.webContents) {
                    console.log('[StatusBarLyricsService] 启动时主动触发状态栏歌词渲染');
                    this.mainWindow.webContents.send('generate-statusbar-image', '');
                }
            }, 1000);
        });
    }

    // 清理资源（应用退出时调用）
    cleanup() {
        // 清理定时器
        if (this.clearLyricsTimeout) {
            clearTimeout(this.clearLyricsTimeout);
            this.clearLyricsTimeout = null;
        }

        // 清理 Tray（防止退出后闪烁）
        const tray = this.getTrayCallback ? this.getTrayCallback() : null;
        if (tray && !tray.isDestroyed()) {
            try {
                tray.setImage(nativeImage.createEmpty());
                tray.setTitle('');
                tray.destroy();
            } catch (e) {
                console.error('[StatusBarLyricsService] Error cleaning up tray:', e);
            }
        }
    }
}

export default new StatusBarLyricsService();

import { ipcMain, shell, BrowserWindow, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import extensionManager from './extensionManager.js';

// 获取插件图标数据
function getExtensionIconData(extension, extensionPath) {
    if (extension.manifest?.icons) {
        const icons = extension.manifest.icons;
        const iconSizes = Object.keys(icons);
        if (iconSizes.length > 0) {
            const iconSize = iconSizes[0];
            const iconPath = icons[iconSize];
            const fullIconPath = path.join(extensionPath, iconPath);
            
            try {
                if (fs.existsSync(fullIconPath)) {
                    const iconData = fs.readFileSync(fullIconPath);
                    const ext = path.extname(iconPath).toLowerCase();
                    let mimeType = 'image/png';
                    if (ext === '.jpg' || ext === '.jpeg') {
                        mimeType = 'image/jpeg';
                    }
                    return `data:${mimeType};base64,${iconData.toString('base64')}`;
                }
            } catch (error) {
                log.error('读取插件图标失败:', error);
            }
        }
    }
    return null;
}

/**
 * 注册插件相关的 IPC 处理程序
 */
export function registerExtensionIPC() {
    // 获取插件列表
    ipcMain.handle('get-extensions', () => {
        try {
            const loadedExtensions = extensionManager.getLoadedExtensions();
            const scannedExtensions = extensionManager.scanExtensions();
            
            const extensions = loadedExtensions.map(ext => {
                const scannedExt = scannedExtensions.find(scanned => scanned.name === ext.name);
                let iconData = null;
                
                if (scannedExt?.path) {
                    iconData = getExtensionIconData(ext, scannedExt.path);
                }
                
                return {
                    id: ext.id,
                    name: ext.name,
                    version: ext.version,
                    enabled: true,
                    description: ext.manifest?.description || '',
                    permissions: ext.manifest?.permissions || [],
                    iconData: iconData,
                    moeKoeAdapted: ext.manifest?.moekoe === true || scannedExt?.manifest?.moekoe === true
                };
            });
            
            return {
                success: true,
                extensions: extensions
            };
        } catch (error) {
            log.error('获取插件列表失败:', error);
            return {
                success: false,
                error: error.message,
                extensions: []
            };
        }
    });

    // 获取详细插件信息
    ipcMain.handle('get-extensions-detailed', () => {
        try {
            return extensionManager.scanExtensions();
        } catch (error) {
            log.error('获取详细插件信息失败:', error);
            return [];
        }
    });

    // 重新加载插件
    ipcMain.handle('reload-extensions', () => {
        try {
            const result = extensionManager.reloadExtensions();
            return result;
        } catch (error) {
            log.error('重新加载插件失败:', error);
            return { success: false, message: error.message };
        }
    });

    // 打开插件目录
    ipcMain.handle('open-extensions-dir', () => {
        try {
            const extensionsDir = extensionManager.getExtensionsDirectory();
            shell.openPath(extensionsDir);
            return { success: true, path: extensionsDir };
        } catch (error) {
            log.error('打开插件目录失败:', error);
            return { success: false, message: error.message };
        }
    });

    // 打开插件弹窗
    ipcMain.handle('open-extension-popup', (event, extensionId, extensionName) => {
        try {
            
            // 创建新的弹窗窗口
            const popupWindow = new BrowserWindow({
                width: 400,
                height: 600,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    enableRemoteModule: false,
                    webSecurity: false // 允许加载插件内容
                },
                title: extensionName || '插件弹窗',
                resizable: true,
                minimizable: true,
                maximizable: false,
                alwaysOnTop: false,
                show: false,
                autoHideMenuBar: true, // 隐藏菜单栏
                menuBarVisible: false  // 不显示菜单栏
            });

            // 完全移除菜单栏
            popupWindow.setMenuBarVisibility(false);
            popupWindow.removeMenu();

            // 构建插件弹窗URL
            const popupUrl = `chrome-extension://${extensionId}/popup.html`;
            
            popupWindow.loadURL(popupUrl).then(() => {
                popupWindow.show();
            }).catch((error) => {
                log.error('加载插件弹窗失败:', error);
                popupWindow.close();
            });

            return { success: true, extensionId };
        } catch (error) {
            log.error('打开插件弹窗失败:', error);
            return { success: false, message: error.message };
        }
    });

    // 安装插件
    ipcMain.handle('install-extension', async (event, extensionPath) => {
        try {
            const result = await extensionManager.installExtension(extensionPath);
            return result;
        } catch (error) {
            log.error('手动安装插件失败:', error);
            return { success: false, message: error.message };
        }
    });

    // 卸载插件
    ipcMain.handle('uninstall-extension', (event, extensionId) => {
        try {
            const result = extensionManager.uninstallExtension(extensionId);
            return result;
        } catch (error) {
            log.error('卸载插件失败:', error);
            return { success: false, message: error.message };
        }
    });

    // 验证插件清单
    ipcMain.handle('validate-extension', async (event, extensionPath) => {
        try {
            const manifestPath = path.join(extensionPath, 'manifest.json');
            const validation = extensionManager.validateManifest(manifestPath);
            return validation;
        } catch (error) {
            log.error('验证插件失败:', error);
            return { valid: false, error: error.message };
        }
    });

    // 获取插件目录路径
    ipcMain.handle('get-extensions-directory', () => {
        try {
            return {
                success: true,
                path: extensionManager.getExtensionsDirectory()
            };
        } catch (error) {
            log.error('获取插件目录路径失败:', error);
            return { success: false, message: error.message };
        }
    });

    // 从zip安装插件
    ipcMain.handle('install-plugin-from-zip', async (event, zipPath) => {
        try {
            const result = await extensionManager.installPluginFromZip(zipPath);
            return result;
        } catch (error) {
            log.error('安装插件失败:', error);
            return { success: false, message: error.message };
        }
    });

    // 显示文件选择对话框
    ipcMain.handle('show-open-dialog', async (event, options) => {
        try {
            const result = await dialog.showOpenDialog({
                ...options,
                properties: [...(options.properties || [])],
                filters: [...(options.filters || [])]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                return { success: true, filePath: result.filePaths[0] };
            }
            return { success: false, message: '未选择文件' };
        } catch (error) {
            log.error('打开文件对话框失败:', error);
            return { success: false, message: error.message };
        }
    });

    // 确保插件目录存在
    ipcMain.handle('ensure-extensions-directory', () => {
        try {
            const path = extensionManager.ensureExtensionsDirectory();
            return { success: true, path };
        } catch (error) {
            log.error('创建插件目录失败:', error);
            return { success: false, message: error.message };
        }
    });

    log.info('插件 IPC 处理程序已注册');
}

/**
 * 注销插件相关的 IPC 处理程序
 */
export function unregisterExtensionIPC() {
    const channels = [
        'get-extensions',
        'get-extensions-detailed',
        'reload-extensions',
        'open-extensions-dir',
        'open-extension-popup',
        'install-extension',
        'uninstall-extension',
        'validate-extension',
        'get-extensions-directory',
        'ensure-extensions-directory'
    ];

    channels.forEach(channel => {
        ipcMain.removeHandler(channel);
    });

    log.info('插件 IPC 处理程序已注销');
}

export default {
    registerExtensionIPC,
    unregisterExtensionIPC
};
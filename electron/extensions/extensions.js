// 插件系统统一入口文件
import extensionManager from './extensionManager.js';
import { registerExtensionIPC, unregisterExtensionIPC } from './extensionIPC.js';
import nativeHostManager from './nativeHostManager.js';
import log from 'electron-log';

/**
 * 初始化插件系统
 */
export async function initializeExtensions() {
    try {
        // 确保插件目录存在
        extensionManager.ensureExtensionsDirectory();
        
        // 注册 IPC 处理程序
        registerExtensionIPC();
        
        // 加载插件
        await extensionManager.loadChromeExtensions();

        // 同步本地程序索引
        syncNativeHosts();
        
        return { success: true };
    } catch (error) {
        log.error('插件系统初始化失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 清理插件系统
 */
export async function cleanupExtensions() {
    try {
        // 先停止所有本地程序并等待其退出，再卸载扩展
        // 顺序至关重要：若先卸载扩展，WebSocket 断开后 EXE 会自行退出，
        // 但 stopAll 的 await 可保证 restartExtensions 不会在旧进程存活时启动新进程。
        await nativeHostManager.stopAll();
        extensionManager.unloadChromeExtensions();
        
        // 注销 IPC 处理程序
        unregisterExtensionIPC();
        
        return { success: true };
    } catch (error) {
        log.error('插件系统清理失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 重启插件系统
 */
export async function restartExtensions() {
    try {
        const cleanupResult = cleanupExtensions();
        if (!cleanupResult.success) {
            return cleanupResult;
        }
        
        const initResult = await initializeExtensions();
        return initResult;
    } catch (error) {
        log.error('重启插件系统失败:', error);
        return { success: false, error: error.message };
    }
}

function syncNativeHosts() {
    try {
        nativeHostManager.syncExtensions(
            extensionManager.getLoadedExtensions(),
            extensionManager.scanExtensions()
        );
        nativeHostManager.startAuthorizedAutoHosts();
    } catch (error) {
        log.error('同步本地程序索引失败:', error);
    }
}

export {
    extensionManager,
    registerExtensionIPC,
    unregisterExtensionIPC
};

export default {
    initializeExtensions,
    cleanupExtensions,
    restartExtensions,
    extensionManager,
    registerExtensionIPC,
    unregisterExtensionIPC
};

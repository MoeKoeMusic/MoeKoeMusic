const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        send: (channel, ...args) => ipcRenderer.send(channel, ...args),
        on: (channel, listener) => ipcRenderer.on(channel, listener),
        once: (channel, listener) => ipcRenderer.once(channel, listener),
        removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
        removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
    },
    platform: process.platform
});

// 添加插件管理 API
contextBridge.exposeInMainWorld('electronAPI', {
    // 插件管理
    getExtensions: () => ipcRenderer.invoke('get-extensions'),
    getExtensionsDetailed: () => ipcRenderer.invoke('get-extensions-detailed'),
    reloadExtensions: () => ipcRenderer.invoke('reload-extensions'),
    openExtensionsDir: () => ipcRenderer.invoke('open-extensions-dir'),
    openExtensionPopup: (extensionId) => ipcRenderer.invoke('open-extension-popup', extensionId),
    installExtension: (extensionPath) => ipcRenderer.invoke('install-extension', extensionPath),
    uninstallExtension: (extensionId, extensionDir) => ipcRenderer.invoke('uninstall-extension', extensionId, extensionDir),
    validateExtension: (extensionPath) => ipcRenderer.invoke('validate-extension', extensionPath),
    getExtensionsDirectory: () => ipcRenderer.invoke('get-extensions-directory'),
    ensureExtensionsDirectory: () => ipcRenderer.invoke('ensure-extensions-directory'),
    installPluginFromZip: (zipPath) => ipcRenderer.invoke('install-plugin-from-zip', zipPath),
    installPluginFromUrl: (downloadUrl, extensionId = '', extensionDir = '') => ipcRenderer.invoke('install-plugin-from-url', {
        downloadUrl,
        extensionId,
        extensionDir,
    }),
    setNativeHostAuthorization: (extensionId, hostId, authorized) => ipcRenderer.invoke('set-native-host-authorization', extensionId, hostId, authorized),
    nativeHost: {
        getStatus: (hostId) => ipcRenderer.invoke('native-host-get-status', hostId),
        send: (hostId, payload) => ipcRenderer.invoke('native-host-send', hostId, payload),
        onMessage: (listener) => {
            const wrapped = (_event, payload) => listener(payload);
            ipcRenderer.on('native-host-message', wrapped);
            return () => ipcRenderer.removeListener('native-host-message', wrapped);
        }
    },
    startUpdateDownload: () => ipcRenderer.invoke('start-update-download'),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    openMvWindow: (url) => ipcRenderer.invoke('open-mv-window', url),
    openLogPath: () => ipcRenderer.invoke('open-log-path'),
    exportLog: () => ipcRenderer.invoke('export-log'),
});

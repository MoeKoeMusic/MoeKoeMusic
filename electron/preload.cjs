const { contextBridge, ipcRenderer } = require('electron');

const moekoeAPI = {
    electron: {
        ipcRenderer: {
            send: (channel, ...args) => ipcRenderer.send(channel, ...args),
            invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
            on: (channel, listener) => ipcRenderer.on(channel, listener),
            once: (channel, listener) => ipcRenderer.once(channel, listener),
            removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
            removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
        },
        platform: process.platform
    },
    electronAPI: {
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
        // 歌曲下载
        downloadSong: (payload) => ipcRenderer.invoke('download-song', payload),
        cancelDownload: (id) => ipcRenderer.invoke('download-cancel', id),
        getDownloadDirectory: () => ipcRenderer.invoke('download-get-dir'),
        chooseDownloadDirectory: () => ipcRenderer.invoke('download-choose-dir'),
        openDownloadDirectory: () => ipcRenderer.invoke('download-open-dir'),
        showDownloadedFile: (filePath) => ipcRenderer.invoke('download-show-item', filePath),
        onDownloadProgress: (listener) => {
            const wrapped = (_event, payload) => listener(payload);
            ipcRenderer.on('download-progress', wrapped);
            return () => ipcRenderer.removeListener('download-progress', wrapped);
        },
        openMvWindow: (url) => ipcRenderer.invoke('open-mv-window', url),
        openLogPath: () => ipcRenderer.invoke('open-log-path'),
        exportLog: () => ipcRenderer.invoke('export-log'),
        getApiModeUrl: () => ipcRenderer.invoke('get-api-service-endpoint'),
        requestMicrophoneAccess: () => ipcRenderer.invoke('request-microphone-access'),
        openMicrophoneSettings: () => ipcRenderer.invoke('open-microphone-settings'),
        requestSystemAudioAccess: () => ipcRenderer.invoke('request-system-audio-access'),
        // 本地媒体（全盘扫描 / 元数据 / 歌词读取）
        localMedia: {
            listDrives: () => ipcRenderer.invoke('local-media:list-drives'),
            scanAll: (options = {}) => ipcRenderer.invoke('local-media:scan-all', options),
            cancelScan: () => ipcRenderer.invoke('local-media:cancel-scan'),
            scanDirectory: (dir) => ipcRenderer.invoke('local-media:scan-dir', dir),
            readMetadata: (filePaths) => ipcRenderer.invoke('local-media:read-metadata', filePaths),
            readText: (filePath) => ipcRenderer.invoke('local-media:read-text', filePath),
            getDownloadDirectory: () => ipcRenderer.invoke('local-media:get-download-dir'),
            isFileExists: (filePath) => ipcRenderer.invoke('local-media:is-file-exists', filePath),
            fileMd5: (filePath) => ipcRenderer.invoke('local-media:file-md5', filePath),
            showInFolder: (filePath) => ipcRenderer.invoke('local-media:show-in-folder', filePath),
            onScanProgress: (listener) => {
                const wrapped = (_event, payload) => listener(payload);
                ipcRenderer.on('local-media:scan-progress', wrapped);
                return () => ipcRenderer.removeListener('local-media:scan-progress', wrapped);
            }
        },
    },
    kugouapi: {
        generateNewDevice: () => ipcRenderer.invoke('kugouapi:generate-new-device'),
        getDevice: () => ipcRenderer.invoke('kugouapi:get-device'),
        request: (path, payload) => ipcRenderer.invoke('kugouapi:request', path, payload)
    }
}

Object.entries(moekoeAPI).forEach(([apiKey, api]) => {
    contextBridge.exposeInMainWorld(apiKey, api);
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        send: (channel, data) => ipcRenderer.send(channel, data),
        on: (channel, listener) => ipcRenderer.on(channel, (event, ...args) => listener(...args)),
        once: (channel, listener) => ipcRenderer.once(channel, (event, ...args) => listener(...args)),
        removeListener: (channel, func) => {
            ipcRenderer.removeListener(channel, func);
        },
        removeAllListeners: (channel) => {
            ipcRenderer.removeAllListeners(channel);
        }
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
    openExtensionPopup: (extensionId, extensionName) => ipcRenderer.invoke('open-extension-popup', extensionId, extensionName),
    installExtension: (extensionPath) => ipcRenderer.invoke('install-extension', extensionPath),
    uninstallExtension: (extensionId) => ipcRenderer.invoke('uninstall-extension', extensionId),
    validateExtension: (extensionPath) => ipcRenderer.invoke('validate-extension', extensionPath),
    getExtensionsDirectory: () => ipcRenderer.invoke('get-extensions-directory'),
    ensureExtensionsDirectory: () => ipcRenderer.invoke('ensure-extensions-directory'),
});


contextBridge.exposeInMainWorld('mprisApi', {
  // 切换循环模式
  switchRepeatMode: (mode) => ipcRenderer.send('switchRepeatMode', mode), // mode: 'off' | 'one' | 'on'
  // 保存歌词到 Osdlyric
  sendLyrics: (track, lyrics) => ipcRenderer.send('sendLyrics', {track, lyrics}),
  // 切换随机播放
  switchShuffle: (shuffle) => ipcRenderer.send('switchShuffle', shuffle), // shuffle: true/false
  sendMetaData,
  sendPlayerCurrentTrackTime,
  onSetPosition: (callback) => {
    ipcRenderer.on('setPosition', (_, positionUs) => {
      callback(positionUs)
    })
  },
  onNext: (callback) => ipcRenderer.on('next', callback),
  onPrevious: (callback) => ipcRenderer.on('previous', callback),
  onPlayM: (callback) => ipcRenderer.on('play', callback),
  onPlayPause: (callback) => ipcRenderer.on('playpause', callback),
  onPauseM: (callback) => ipcRenderer.on('pause', callback),
  onRepeat: (callback) => ipcRenderer.on('repeat', callback),
  onShuffle: (callback) => ipcRenderer.on('shuffle', callback),
  setVolume: (volume) => ipcRenderer.send('setVolume', volume),
  onVolumeChanged: (callback) => ipcRenderer.on('volume_changed', (_, volume) => {
    callback(volume)
  }),
});

function sendMetaData(metadata) {
  ipcRenderer.send('metadata', metadata);
}

function sendPlayerCurrentTrackTime(t) {
  ipcRenderer.send("playerCurrentTrackTime", t)
}

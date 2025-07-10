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
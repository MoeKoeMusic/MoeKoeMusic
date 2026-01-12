<template>
  <div class="titlebar">
    <div class="window-controls" v-if="isElectron && !isMac && $route.name !== 'VideoPlayer'">
      <button class="control-button" @click="minimizeWindow" id="minBtn"></button>
      <button class="control-button" @click="maximizeWindow" id="maxBtn"></button>
      <button class="control-button" @click="closeWindow" id="closeBtn"></button>
    </div>
  </div>
</template>

<script setup>
const isElectron = typeof window !== 'undefined' && typeof window.electron !== 'undefined';
const isMac = isElectron && window.electron.platform == 'darwin';
const closeWindow = () => window.electron.ipcRenderer.send('window-control', 'close');
const minimizeWindow = () => window.electron.ipcRenderer.send('window-control', 'minimize');
const maximizeWindow = () => window.electron.ipcRenderer.send('window-control', 'maximize');
</script>

<style scoped>
.titlebar {
  -webkit-app-region: drag;
  height: 32px;
  padding: 0 12px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  z-index: 10;
  position: fixed;
  width: 100%;
}

.window-controls {
  -webkit-app-region: no-drag;
  display: flex;
  gap: 8px;
  margin-right: 30px;
  margin-bottom: 8px;
}

.control-button {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: transparent;
  background-size: 10px;
  background-repeat: no-repeat;
  background-position: center;
}

#closeBtn {
  background-color: #ff5f57 !important;
}

#minBtn {
  background-color: #ffbd2e !important;
}

#maxBtn {
  background-color: #28c940 !important;
}

.control-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.control-button:hover#closeBtn {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 16 16"><path fill="black" d="M5 5l6 6M5 11l6-6" stroke="black" stroke-width="1.5" stroke-linecap="round"/></svg>');
}

.control-button:hover#minBtn {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="black" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2 8a1 1 0 011-1h10a1 1 0 110 2H3a1 1 0 01-1-1z"/></svg>');
}

.control-button:hover#maxBtn {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 16 16"><path fill="none" stroke="black" stroke-width="1.5" d="M3 3 L6 3 L3 6 M3 3 L3 6 M13 3 L10 3 L13 6 M13 3 L13 6 M3 13 L6 13 L3 10 M3 13 L3 10 M13 13 L10 13 L13 10 M13 13 L13 10"/></svg>');
}

.control-button:focus {
  outline: none;
}

.content {
  padding: 20px;
}

.content h1 {
  margin-bottom: 15px;
  color: #2f3241;
}

.content p {
  color: #444;
  line-height: 1.6;
  margin-bottom: 10px;
}

.titlebar-text {
  flex-grow: 1;
  margin-left: 12px;
  font-size: 13px;
  color: #333;
}
</style>
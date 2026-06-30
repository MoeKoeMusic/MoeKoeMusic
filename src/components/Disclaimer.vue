<template>
    <div v-if="showModal" class="modal-overlay">
        <div class="modal-content user-agreement-guide">
            <img class="modal-banner" :src="DISCLAIMER_BANNER_SRC" alt="Banner">
            <h2>{{ $t('yong-hu-tiao-kuan') }}</h2>
            <p v-for="key in USER_AGREEMENT_KEYS" :key="key">{{ $t(key) }}</p>
            <div class="button-group">
                <button @click="agree">{{ $t('tong-yi') }}</button>
                <button @click="disagree">{{ $t('bu-tong-yi') }}</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { DISCLAIMER_BANNER_SRC, USER_AGREEMENT_KEYS } from '../config/disclaimer';

const showModal = ref(false);

onMounted(() => {
    if(isElectron()){
        window.electron.ipcRenderer.on('show-disclaimer', () => {
            showModal.value = true;
        });
        return
    }
    if(!localStorage.getItem('disclaimerAccepted')){
        showModal.value = true;
    }
});
const isElectron = () => {
    return typeof window !== 'undefined' && typeof window.electron !== 'undefined';
};
const agree = () => {
    showModal.value = false;
    if(isElectron()){
        window.electron.ipcRenderer.send('disclaimer-response', true);
        return;
    }
    localStorage.setItem('disclaimerAccepted', true);
};

const disagree = () => {
    if(isElectron()){
        window.electron.ipcRenderer.send('disclaimer-response', false);
    }
    window.location.href = 'about:blank';
    window.close();
};
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    position: relative;
    background: #fff;
    padding: 20px;
    border-radius: 8px;
    max-width: 750px;
    width: 80%;
}

.modal-banner {
    position: absolute;
    top: 0;
    right: 15px;
    width: 180px;
    max-width: 35%;
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
}

.button-group {
    display: flex;
    justify-content: space-around;
    margin-top: 15px;
}

button {
    padding: 10px 20px;
    border: none;
    cursor: pointer;
    border-radius: 5px;
    background-color:var(--primary-color);
    color: white;
}

</style>

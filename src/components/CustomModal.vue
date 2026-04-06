<template>
    <div>
        <!-- Alert 模态框 -->
        <div v-if="showAlert" class="modal-overlay">
            <div class="modal">
                <h3>{{ alertMessage }}</h3>
                <button @click="confirmAlert" class="btn">{{ i18n.global.t('que-ding') }}</button>
            </div>
        </div>

        <!-- Confirm 模态框 -->
        <div v-if="showConfirm" class="modal-overlay">
            <div class="modal">
                <h3>{{ confirmMessage }}</h3>
                <div class="buttons">
                    <button @click="confirmAction(true)" class="btn">{{ i18n.global.t('que-ding') }}</button>
                    <button @click="confirmAction(false)" class="btn">{{ i18n.global.t('qu-xiao') }}</button>
                </div>
            </div>
        </div>

        <!-- Prompt 模态框 -->
        <div v-if="showPrompt" class="modal-overlay">
            <div class="modal">
                <h3>{{ promptMessage }}</h3>
                <input type="text" v-model="promptInput" class="prompt-input" />
                <div class="buttons">
                    <button @click="submitPrompt" class="btn">{{ i18n.global.t('que-ding') }}</button>
                    <button @click="closePrompt" class="btn">{{ i18n.global.t('qu-xiao') }}</button>
                </div>
            </div>
        </div>

        <!-- Loading 遮罩 -->
        <div v-if="showLoading" class="loading-overlay">
            <div class="loading-spinner"></div>
            <p class="loading-text">{{ i18n.global.t('shao-nv-qi-dao-zhong') }}</p>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import i18n from '@/utils/i18n';
// 该组件代码来自萌音商城(MoeKoe.cn) © 阿珏酱
// window.$modal.alert('这是一个 Alert'); // 直接调用 window.$modal
// const result = await window.$modal.confirm('这是一个 Confirm');
// const result = await window.$modal.prompt('请输入内容：', '默认值');
// window.$modal.showLoading(); //开启
// window.$modal.hideLoading(); //关闭

// 控制模态框的状态
const showAlert = ref(false);
const showConfirm = ref(false);
const showPrompt = ref(false);
const showLoading = ref(false);

// 消息内容
const alertMessage = ref('');
const confirmMessage = ref('');
const promptMessage = ref('');
const promptInput = ref('');

// Alert 方法
let alertResolve;
const customAlert = (message) => {
    alertMessage.value = message;
    showAlert.value = true;
    return new Promise((resolve) => {
        alertResolve = resolve;
    });
};

const confirmAlert = () => {
    showAlert.value = false;
    alertResolve(); // 在点击确定按钮时，执行 resolve 以继续后续代码
};

// Confirm 方法
let confirmResolve;
const customConfirm = (message) => {
    confirmMessage.value = message;
    showConfirm.value = true;
    return new Promise((resolve) => {
        confirmResolve = resolve;
    });
};

const confirmAction = (confirmed) => {
    showConfirm.value = false;
    confirmResolve(confirmed);
};

// Prompt 方法
let promptResolve;
const customPrompt = (message, defaultValue = '') => {
    promptMessage.value = message;
    promptInput.value = defaultValue;
    showPrompt.value = true;
    return new Promise((resolve) => {
        promptResolve = resolve;
    });
};

const submitPrompt = () => {
    showPrompt.value = false;
    promptResolve(promptInput.value);
};

const closePrompt = () => {
    showPrompt.value = false;
};

// Loading 方法
const showCustomLoading = () => {
    showLoading.value = true;
};

const hideCustomLoading = () => {
    showLoading.value = false;
};

// 暴露方法供父组件使用
defineExpose({
    customAlert,
    customConfirm,
    customPrompt,
    showCustomLoading,
    hideCustomLoading
});
</script>

<style lang="scss" scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999999;
}

.modal {
    background-color: white;
    padding: 30px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    width: 400px;

    h3 {
        overflow-wrap: anywhere;
        color: var(--primary-color);
    }
}

.buttons {
    display: flex;
    justify-content: space-around;
    margin-top: 15px;
}

.prompt-input {
    width: 379px;
    padding: 10px;
    margin-top: 15px;
    border-radius: 5px;
    border: 1px solid var(--primary-color);
}

.btn {
    background-color: var(--primary-color);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s;
    margin-top: 10px;
    font-size: 20px;
    width: auto;
}

.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    flex-direction: column;
}

.loading-spinner {
    border: 8px solid rgba(255, 255, 255, 0.3);
    border-top: 8px solid var(--primary-color);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
}

.loading-text {
    margin-top: 11px;
    font-size: 1.1rem;
    color: #ff85a2;
    font-weight: bold;
    font-family: 'Poppins', sans-serif;
    text-align: center;
    letter-spacing: 1px;
    margin-left: 24px;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
</style>
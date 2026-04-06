<template>
    <transition-group name="message-fade" tag="div" class="message-container" v-show="messages.length">
        <div v-for="msg in messages" :key="msg.id" :class="['message', `message-${msg.type}`]"
            @click="removeMessage(msg.id)">
            <div class="message-content">
                <div class="message-icon" v-if="msg.type !== 'default'">
                    <div v-if="msg.type === 'success'" class="icon-success"></div>
                    <div v-else-if="msg.type === 'error'" class="icon-error"></div>
                    <div v-else-if="msg.type === 'warning'" class="icon-warning"></div>
                    <div v-else-if="msg.type === 'info'" class="icon-info"></div>
                </div>
                <span>{{ msg.content }}</span>
            </div>
        </div>
    </transition-group>
</template>

<script setup>
import { ref } from 'vue';

const messages = ref([]);
let messageId = 0;

// 添加消息
const addMessage = (content, type = 'default', duration = 3000) => {
    const id = messageId++;
    messages.value.push({ id, content, type, duration });

    // 设置自动移除
    setTimeout(() => {
        removeMessage(id);
    }, duration);

    return id;
};

// 移除消息
const removeMessage = (id) => {
    const index = messages.value.findIndex(msg => msg.id === id);
    if (index !== -1) {
        const msg = messages.value[index];
        msg.isLeaving = true;

        // 添加一个短暂的延迟，让离开动画有时间播放
        setTimeout(() => {
            messages.value = messages.value.filter(m => m.id !== id);
        }, 300);
    }
};

// 暴露方法
defineExpose({
    addMessage,
    removeMessage,
    success: (content, duration) => addMessage(content, 'success', duration),
    error: (content, duration) => addMessage(content, 'error', duration),
    warning: (content, duration) => addMessage(content, 'warning', duration),
    info: (content, duration) => addMessage(content, 'info', duration),
});
</script>

<style lang="scss" scoped>
.message-container {
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
}

.message {
    margin-bottom: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    background-color: white;
    color: #333;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    backdrop-filter: blur(10px);
    min-width: 200px;
    max-width: 480px;
    width: auto;

    &:hover {
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
    }
}

.message-content {
    display: flex;
    align-items: center;
    width: 100%;
}

.message-icon {
    margin-right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.message-success {
    background-color: rgba(240, 249, 235, 0.95);
    border-left: 4px solid #67c23a;
    color: #67c23a;

    .message-progress {
        background-color: #67c23a;
    }
}

.message-error {
    background-color: rgba(254, 240, 240, 0.95);
    border-left: 4px solid #f56c6c;
    color: #f56c6c;

    .message-progress {
        background-color: #f56c6c;
    }
}

.message-warning {
    background-color: rgba(253, 246, 236, 0.95);
    border-left: 4px solid #e6a23c;
    color: #e6a23c;

    .message-progress {
        background-color: #e6a23c;
    }
}

.message-info {
    background-color: rgba(244, 244, 245, 0.95);
    border-left: 4px solid #909399;
    color: #909399;

    .message-progress {
        background-color: #909399;
    }
}

.message-default {
    border-left: 4px solid #409eff;

    .message-progress {
        background-color: #409eff;
    }
}

.icon-success,
.icon-error,
.icon-warning,
.icon-info {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.icon-success {
    background-color: #67c23a;

    &::before {
        content: '';
        position: absolute;
        width: 10px;
        height: 6px;
        border-left: 2px solid white;
        border-bottom: 2px solid white;
        transform: rotate(-45deg);
    }
}

.icon-error {
    background-color: #f56c6c;

    &::before,
    &::after {
        content: '';
        position: absolute;
        width: 12px;
        height: 2px;
        background-color: white;
    }

    &::before {
        transform: rotate(45deg);
    }

    &::after {
        transform: rotate(-45deg);
    }
}

.icon-warning {
    background-color: #e6a23c;

    &::before {
        content: '!';
        color: white;
        font-weight: bold;
        font-size: 14px;
    }
}

.icon-info {
    background-color: #909399;

    &::before {
        content: 'i';
        color: white;
        font-weight: bold;
        font-size: 14px;
    }
}

.message-fade-enter-active {
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.message-fade-leave-active {
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    position: absolute;
}

.message-fade-enter-from {
    opacity: 0;
    transform: translateY(-100%);
}

.message-fade-leave-to {
    opacity: 0;
    transform: translateY(-100%);
}

.message-fade-move {
    transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}
</style>
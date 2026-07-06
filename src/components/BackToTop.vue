<template>
    <transition name="btt">
        <button v-show="visible" class="back-to-top" type="button" :title="t('fan-hui-ding-bu')"
            :style="{ bottom, right }" @click="scrollToTop">
            <i class="fas fa-arrow-up"></i>
        </button>
    </transition>
</template>

<script setup>
import { nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    // 监听的滚动容器选择器
    target: { type: String, default: '.app-main-scroll' },
    // 下滑多少距离后显示按钮
    threshold: { type: Number, default: 360 },
    // 按钮定位,可按页面覆盖
    bottom: { type: String, default: '172px' },
    right: { type: String, default: '22px' }
});

const { t } = useI18n();
const visible = ref(false);
let container = null;

const syncVisible = () => {
    visible.value = (container?.scrollTop ?? 0) > props.threshold;
};

const bind = () => {
    const next = document.querySelector(props.target);
    if (!next) return;
    if (next !== container) {
        container?.removeEventListener('scroll', syncVisible);
        container = next;
        container.addEventListener('scroll', syncVisible, { passive: true });
    }
    syncVisible();
};

const unbind = () => {
    container?.removeEventListener('scroll', syncVisible);
    container = null;
};

const scrollToTop = () => {
    container?.scrollTo({ top: 0, behavior: 'smooth' });
};

onMounted(() => nextTick(bind));
onActivated(() => nextTick(bind));
onDeactivated(unbind);
onBeforeUnmount(unbind);
</script>

<style lang="scss" scoped>
.back-to-top {
    position: fixed;
    z-index: 96;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(var(--primary-color-rgb), 0.28);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.92);
    color: var(--primary-color);
    font-size: 16px;
    cursor: pointer;
    box-shadow: 0 10px 26px rgba(var(--primary-color-rgb), 0.28);
    backdrop-filter: blur(8px);
    transition: transform 0.22s ease, background-color 0.22s ease, color 0.22s ease, box-shadow 0.22s ease;

    .dark & {
        background: rgba(40, 40, 46, 0.92);
        border-color: rgba(var(--primary-color-rgb), 0.4);
    }

    &:hover {
        transform: translateY(-3px);
        background: var(--primary-color);
        color: #fff;
        box-shadow: 0 14px 30px rgba(var(--primary-color-rgb), 0.4);
    }

    &:active {
        transform: translateY(-1px);
    }
}

.btt-enter-active,
.btt-leave-active {
    transition: opacity 0.24s ease, transform 0.24s ease;
}

.btt-enter-from,
.btt-leave-to {
    opacity: 0;
    transform: translateY(14px) scale(0.85);
}
</style>

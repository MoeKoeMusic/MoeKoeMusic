<template>
    <div v-show="scrollable" ref="trackRef" class="page-scrollbar"
        :class="{ 'is-visible': isVisible, 'is-dragging': dragging }" :style="trackStyle"
        @mouseenter="hovering = true" @mouseleave="hovering = false" @pointerdown="onTrackPointerDown">
        <div class="page-scrollbar-thumb" :style="thumbStyle" @pointerdown="onThumbPointerDown"></div>
    </div>
</template>

<script setup>
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue';

const props = defineProps({
    // 要接管的滚动容器选择器
    target: { type: String, default: '.app-main-scroll' },
    // 停止滚动后多久隐藏(毫秒)
    hideDelay: { type: Number, default: 1200 },
    minThumb: { type: Number, default: 42 }
});

const trackRef = ref(null);
const scrollable = ref(false);
const revealed = ref(false);
const hovering = ref(false);
const dragging = ref(false);
const thumbHeight = ref(0);
const thumbOffset = ref(0);
const trackTop = ref(0);
const trackHeight = ref(0);
const trackRight = ref(0);

let container = null;
let hideTimer = null;
let frame = null;
let resizeObserver = null;
let dragStartY = 0;
let dragStartScrollTop = 0;

const isVisible = computed(() => revealed.value || hovering.value || dragging.value);

const trackStyle = computed(() => ({
    top: `${trackTop.value}px`,
    height: `${trackHeight.value}px`,
    right: `${trackRight.value}px`
}));

const thumbStyle = computed(() => ({
    height: `${thumbHeight.value}px`,
    transform: `translateY(${thumbOffset.value}px)`
}));

const scheduleHide = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        revealed.value = false;
    }, props.hideDelay);
};

const reveal = () => {
    revealed.value = true;
    scheduleHide();
};

const sync = () => {
    if (!container) return;
    const scrollSpace = container.scrollHeight - container.clientHeight;
    scrollable.value = scrollSpace > 4 && trackHeight.value > props.minThumb;
    if (!scrollable.value) {
        hovering.value = false;
        return;
    }

    const height = Math.min(
        trackHeight.value,
        Math.max(props.minThumb, trackHeight.value * container.clientHeight / container.scrollHeight)
    );
    thumbHeight.value = height;
    thumbOffset.value = (container.scrollTop / scrollSpace) * (trackHeight.value - height);
};

const requestSync = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
        frame = null;
        sync();
    });
};

// 轨道对齐滚动容器的内容可视区(扣除顶部导航与底部播放器的 padding)
const measure = () => {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const style = getComputedStyle(container);
    const padTop = parseFloat(style.paddingTop) || 0;
    const padBottom = parseFloat(style.paddingBottom) || 0;
    trackTop.value = rect.top + padTop + 6;
    trackHeight.value = Math.max(0, rect.height - padTop - padBottom - 12);
    trackRight.value = Math.max(0, window.innerWidth - rect.right) + 2;
    sync();
};

const remeasure = () => requestAnimationFrame(measure);

const onScroll = () => {
    requestSync();
    if (!dragging.value) reveal();
};

const dragTo = (clientY) => {
    if (!container) return;
    const space = trackHeight.value - thumbHeight.value;
    const scrollSpace = container.scrollHeight - container.clientHeight;
    if (space <= 0 || scrollSpace <= 0) return;
    container.scrollTop = dragStartScrollTop + (clientY - dragStartY) / space * scrollSpace;
};

const onPointerMove = (event) => dragTo(event.clientY);

const stopDrag = () => {
    if (!dragging.value) return;
    dragging.value = false;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDrag);
    window.removeEventListener('pointercancel', stopDrag);
    scheduleHide();
};

const startDrag = (event) => {
    dragging.value = true;
    dragStartY = event.clientY;
    dragStartScrollTop = container?.scrollTop ?? 0;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
};

const onThumbPointerDown = (event) => {
    if (event.button !== 0 || !container) return;
    event.preventDefault();
    event.stopPropagation();
    startDrag(event);
};

// 点击轨道空白处:滑块中心跳到点击位置,并可继续按住拖动
const onTrackPointerDown = (event) => {
    if (event.button !== 0 || !container || !trackRef.value) return;
    event.preventDefault();
    const rect = trackRef.value.getBoundingClientRect();
    const space = trackHeight.value - thumbHeight.value;
    const scrollSpace = container.scrollHeight - container.clientHeight;
    if (space <= 0 || scrollSpace <= 0) return;
    const targetOffset = Math.min(space, Math.max(0, event.clientY - rect.top - thumbHeight.value / 2));
    container.scrollTop = targetOffset / space * scrollSpace;
    startDrag(event);
};

const unbind = () => {
    container?.removeEventListener('scroll', onScroll);
    resizeObserver?.disconnect();
    resizeObserver = null;
    container = null;
};

const bind = () => {
    const next = document.querySelector(props.target);
    if (!next) return;
    if (next === container) {
        measure();
        return;
    }
    unbind();
    container = next;
    container.addEventListener('scroll', onScroll, { passive: true });
    // 同时观察容器与其内容,歌曲分页加载撑高内容后滑块比例能实时修正
    resizeObserver = new ResizeObserver(requestSync);
    resizeObserver.observe(container);
    for (const child of container.children) {
        resizeObserver.observe(child);
    }
    measure();
};

onMounted(() => {
    nextTick(bind);
    window.addEventListener('resize', measure);
    window.addEventListener('settings-change', remeasure);
    window.addEventListener('sidebar-collapse-change', remeasure);
});

onActivated(() => {
    nextTick(bind);
});

onDeactivated(() => {
    stopDrag();
    revealed.value = false;
    hovering.value = false;
});

onBeforeUnmount(() => {
    stopDrag();
    clearTimeout(hideTimer);
    if (frame) cancelAnimationFrame(frame);
    unbind();
    window.removeEventListener('resize', measure);
    window.removeEventListener('settings-change', remeasure);
    window.removeEventListener('sidebar-collapse-change', remeasure);
});
</script>

<style lang="scss" scoped>
.page-scrollbar {
    position: fixed;
    width: 12px;
    z-index: 99;
    border-radius: 999px;
    opacity: 0;
    cursor: pointer;
    touch-action: none;
    transition: opacity 0.24s ease, background-color 0.2s ease;

    &.is-visible {
        opacity: 1;
    }

    &:hover,
    &.is-dragging {
        background: rgba(var(--primary-color-rgb), 0.08);

        .dark & {
            background: rgba(255, 255, 255, 0.06);
        }
    }
}

.page-scrollbar-thumb {
    position: absolute;
    top: 0;
    right: 2px;
    width: 5px;
    border-radius: 999px;
    background: rgba(var(--primary-color-rgb), 0.45);
    will-change: transform;
    transition: width 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;

    .dark & {
        background: rgba(var(--primary-color-rgb), 0.55);
    }
}

.page-scrollbar:hover .page-scrollbar-thumb,
.page-scrollbar.is-dragging .page-scrollbar-thumb {
    width: 8px;
    background: linear-gradient(180deg, var(--primary-color), var(--secondary-color));
    box-shadow: 0 2px 10px rgba(var(--primary-color-rgb), 0.35);
}
</style>

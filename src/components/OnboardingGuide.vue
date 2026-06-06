<template>
    <teleport to="body">
        <div v-if="showOnboardingGuide && currentSteps.length" class="onboarding-overlay">
            <div v-if="hasTarget" class="onboarding-highlight" :style="highlightStyle"></div>
            <img class="onboarding-mascot" :class="{ intro: isIntroStep }" :style="mascotStyle"
                src="/assets/images/mascotGirl.png" alt="MoeKoe 看板娘">
            <section class="onboarding-card" :class="{ centered: !hasTarget, intro: isIntroStep }" :style="cardStyle">
                <div class="onboarding-progress">{{ progressText }}</div>
                <template v-if="isIntroStep">
                    <h3>Hi，I'm 萌音酱!</h3>
                    <p>这里是新手引导，我会用几个简短步骤介绍常用入口和一些隐藏功能。你可以随时跳过，也可以之后在设置里重新查看。</p>
                </template>
                <template v-else>
                    <h3>{{ currentStep.title }}</h3>
                    <p>{{ currentStep.description }}</p>
                </template>
                <div class="onboarding-actions">
                    <button class="text-button" type="button" @click="skip">跳过</button>
                    <div class="step-actions">
                        <button v-if="!isIntroStep" type="button" :disabled="currentIndex === 0" @click="previousStep">上一步</button>
                        <button class="primary" type="button" @click="nextStep">
                            {{ primaryButtonText }}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    </teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
    ONBOARDING_GUIDE_EVENT,
    ONBOARDING_GUIDE_INTRO_STORAGE_KEY,
    ONBOARDING_GUIDE_STORAGE_PREFIX,
    ONBOARDING_GUIDE_VERSION,
    onboardingGuideGroups
} from '@/config/onboardingGuide';

const route = useRoute();
const showOnboardingGuide = ref(false);
const currentGuide = ref(null);
const currentIndex = ref(-1);
const targetRect = ref(null);
const viewportSize = ref({
    width: window.innerWidth,
    height: window.innerHeight
});
let onboardingGuideTimer = null;
let mutationObserver = null;
let lastCompletedAt = 0;
let scrollingToTarget = false;
let scrollTargetTimer = null;

const currentSteps = computed(() => currentGuide.value?.steps || []);
const currentStep = computed(() => currentSteps.value[currentIndex.value] || {});
const isIntroStep = computed(() => currentIndex.value < 0);
const isLastStep = computed(() => !isIntroStep.value && currentIndex.value === currentSteps.value.length - 1);
const hasTarget = computed(() => !isIntroStep.value && !!targetRect.value);
const progressText = computed(() => isIntroStep.value ? '新手引导' : `${currentIndex.value + 1} / ${currentSteps.value.length}`);
const primaryButtonText = computed(() => {
    if (isIntroStep.value) return '开始引导';
    return isLastStep.value ? '完成' : '下一步';
});

const highlightStyle = computed(() => {
    if (!targetRect.value) return {};
    return {
        top: `${targetRect.value.top}px`,
        left: `${targetRect.value.left}px`,
        width: `${targetRect.value.width}px`,
        height: `${targetRect.value.height}px`
    };
});

const cardRect = computed(() => {
    if (!targetRect.value) return null;

    const cardWidth = Math.min(360, viewportSize.value.width - 32);
    const cardHeight = 220;
    let top = targetRect.value.top + targetRect.value.height + 16;
    if (top + cardHeight > viewportSize.value.height) {
        top = targetRect.value.top - cardHeight - 16;
    }
    top = Math.max(16, Math.min(top, viewportSize.value.height - cardHeight - 16));

    let left = targetRect.value.left + targetRect.value.width / 2 - cardWidth / 2;
    left = Math.max(16, Math.min(left, viewportSize.value.width - cardWidth - 16));

    return {
        top,
        left,
        width: cardWidth,
        height: cardHeight
    };
});

const cardStyle = computed(() => {
    if (!cardRect.value) return {};
    return {
        top: `${cardRect.value.top}px`,
        left: `${cardRect.value.left}px`,
        width: `${cardRect.value.width}px`
    };
});

const getCenteredCardRect = () => {
    const cardWidth = Math.min(isIntroStep.value ? 420 : 360, viewportSize.value.width - 32);
    const cardHeight = isIntroStep.value ? 210 : 220;
    return {
        top: viewportSize.value.height / 2 - cardHeight / 2,
        left: viewportSize.value.width / 2 - cardWidth / 2,
        width: cardWidth,
        height: cardHeight
    };
};

const isOverlapping = (a, b) => {
    return a.left < b.left + b.width &&
        a.left + a.width > b.left &&
        a.top < b.top + b.height &&
        a.top + a.height > b.top;
};

const getMascotPosition = (card, size) => {
    const gap = 14;
    const blockers = [card, targetRect.value].filter(Boolean);
    const candidates = isIntroStep.value ? [
        { left: card.left + card.width - size * 0.6, top: card.top - size - gap },
        { left: card.left + card.width + gap, top: card.top + 8 },
        { left: card.left - size - gap, top: card.top + 8 }
    ] : [
        { left: card.left + card.width + gap, top: card.top + card.height - size },
        { left: card.left - size - gap, top: card.top + card.height - size },
        { left: card.left + card.width - size, top: card.top - size - gap },
        { left: card.left + card.width - size, top: card.top + card.height + gap }
    ];

    const position = candidates.find(item => {
        const rect = { ...item, width: size, height: size };
        const inViewport = rect.left >= 16 &&
            rect.top >= 16 &&
            rect.left + size <= viewportSize.value.width - 16 &&
            rect.top + size <= viewportSize.value.height - 16;
        return inViewport && !blockers.some(blocker => isOverlapping(rect, blocker));
    });

    if (position) return position;

    return {
        left: Math.max(16, viewportSize.value.width - size - 22),
        top: Math.max(16, viewportSize.value.height - size - 22)
    };
};

const mascotStyle = computed(() => {
    const size = Math.min(isIntroStep.value ? 200 : 160, Math.max(96, viewportSize.value.width * 0.24));
    const position = getMascotPosition(cardRect.value || getCenteredCardRect(), size);
    return {
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${size}px`
    };
});

const updateViewportSize = () => {
    viewportSize.value = {
        width: window.innerWidth,
        height: window.innerHeight
    };
};

const isTargetInViewport = (rect) => {
    const margin = 16;
    const visibleTop = Math.max(rect.top, margin);
    const visibleLeft = Math.max(rect.left, margin);
    const visibleBottom = Math.min(rect.bottom, viewportSize.value.height - margin);
    const visibleRight = Math.min(rect.right, viewportSize.value.width - margin);
    const visibleWidth = Math.max(0, visibleRight - visibleLeft);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    if (!visibleWidth || !visibleHeight) return false;

    const viewportWidth = viewportSize.value.width - margin * 2;
    const viewportHeight = viewportSize.value.height - margin * 2;
    if (rect.width >= viewportWidth || rect.height >= viewportHeight) return true;

    const visibleArea = visibleWidth * visibleHeight;
    const targetArea = Math.max(1, rect.width * rect.height);
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const centerVisible = centerX >= margin &&
        centerX <= viewportSize.value.width - margin &&
        centerY >= margin &&
        centerY <= viewportSize.value.height - margin;

    return centerVisible || visibleArea / targetArea >= 0.6;
};

const scrollTargetIntoView = (target) => {
    if (scrollingToTarget) return;
    scrollingToTarget = true;
    targetRect.value = null;
    target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
    });

    if (scrollTargetTimer) clearTimeout(scrollTargetTimer);
    scrollTargetTimer = setTimeout(() => {
        scrollingToTarget = false;
        refreshTarget();
    }, 500);
};

const refreshTarget = () => {
    if (!showOnboardingGuide.value) return;
    updateViewportSize();
    if (scrollingToTarget) return;
    if (isIntroStep.value) {
        targetRect.value = null;
        return;
    }

    const selector = currentStep.value.selector;
    const target = selector ? document.querySelector(selector) : null;
    if (!target) {
        skipCurrentStep();
        return;
    }

    const rect = target.getBoundingClientRect();
    if (!rect.width && !rect.height) {
        skipCurrentStep();
        return;
    }

    if (!isTargetInViewport(rect)) {
        scrollTargetIntoView(target);
        return;
    }

    targetRect.value = {
        top: Math.max(8, rect.top - 6),
        left: Math.max(8, rect.left - 6),
        width: rect.width + 12,
        height: rect.height + 12
    };
};

const refreshAfterRender = async () => {
    await nextTick();
    requestAnimationFrame(refreshTarget);
};

const skipCurrentStep = () => {
    if (isIntroStep.value) return;
    targetRect.value = null;
    if (isLastStep.value) {
        completeOnboardingGuide();
        return;
    }
    currentIndex.value += 1;
};

const previousStep = () => {
    if (currentIndex.value === 0) return;
    currentIndex.value -= 1;
};

const nextStep = () => {
    if (isIntroStep.value) {
        completeGuideIntro();
        currentIndex.value = 0;
        return;
    }
    if (isLastStep.value) {
        completeOnboardingGuide();
        return;
    }
    currentIndex.value += 1;
};

const skip = () => {
    completeOnboardingGuide();
};

const handleKeydown = (event) => {
    if (!showOnboardingGuide.value) return;
    if (event.key === 'Escape') skip();
    if (event.key === 'Enter') nextStep();
};

const getGuideStorageKey = (guide) => {
    return guide.storageKey || `${ONBOARDING_GUIDE_STORAGE_PREFIX}${guide.key}:version`;
};

const isGuideCompleted = (guide) => {
    return localStorage.getItem(getGuideStorageKey(guide)) === guide.version;
};

const isGuideIntroCompleted = () => {
    return localStorage.getItem(ONBOARDING_GUIDE_INTRO_STORAGE_KEY) === ONBOARDING_GUIDE_VERSION;
};

const completeGuideIntro = () => {
    localStorage.setItem(ONBOARDING_GUIDE_INTRO_STORAGE_KEY, ONBOARDING_GUIDE_VERSION);
};

const getGuideStartIndex = () => {
    return isGuideIntroCompleted() ? 0 : -1;
};

const resetOnboardingGuideStorage = () => {
    localStorage.removeItem(ONBOARDING_GUIDE_INTRO_STORAGE_KEY);
    onboardingGuideGroups.forEach(guide => {
        localStorage.removeItem(getGuideStorageKey(guide));
    });
};

const matchesRoute = (guide) => {
    const names = guide.routeNames || [];
    const paths = guide.paths || [];
    if (!names.length && !paths.length) return true;
    return names.includes(route.name) || paths.includes(route.path);
};

const isTriggerReady = (guide) => {
    if (!guide.triggerSelector) return true;
    return !!document.querySelector(guide.triggerSelector);
};

const getPendingGuideForCurrentRoute = () => {
    return onboardingGuideGroups.find(guide => matchesRoute(guide) && !isGuideCompleted(guide));
};

const findGuideByKey = (key) => {
    return onboardingGuideGroups.find(guide => guide.key === key);
};

const findNextGuide = () => {
    if (Date.now() - lastCompletedAt < 1200) return null;
    return onboardingGuideGroups.find(guide => {
        return matchesRoute(guide) && !isGuideCompleted(guide) && isTriggerReady(guide);
    });
};

const openOnboardingGuide = (guide) => {
    if (!guide?.steps?.length) return;
    currentGuide.value = guide;
    currentIndex.value = getGuideStartIndex();
    showOnboardingGuide.value = true;
    mutationObserver?.disconnect();
    mutationObserver = null;
};

const syncMutationObserver = () => {
    const shouldObserve = !showOnboardingGuide.value && !!getPendingGuideForCurrentRoute();

    if (shouldObserve) {
        if (!mutationObserver) {
            mutationObserver = new MutationObserver(() => scheduleGuideCheck(450));
            mutationObserver.observe(document.body, { childList: true, subtree: true });
        }
        return;
    }

    mutationObserver?.disconnect();
    mutationObserver = null;
};

const scheduleGuideCheck = (delay = 300) => {
    if (showOnboardingGuide.value) return;
    syncMutationObserver();
    if (onboardingGuideTimer) clearTimeout(onboardingGuideTimer);
    onboardingGuideTimer = setTimeout(() => {
        const guide = findNextGuide();
        if (guide) openOnboardingGuide(guide);
    }, delay);
};

const completeOnboardingGuide = () => {
    if (isIntroStep.value) {
        completeGuideIntro();
    }
    if (currentGuide.value) {
        localStorage.setItem(getGuideStorageKey(currentGuide.value), currentGuide.value.version);
    }
    lastCompletedAt = Date.now();
    showOnboardingGuide.value = false;
    currentGuide.value = null;
    syncMutationObserver();
};

const handleOpenGuideEvent = (event) => {
    if (event.detail?.reset) {
        resetOnboardingGuideStorage();
        lastCompletedAt = 0;
    }

    const guideKey = event.detail?.guideKey || 'main';
    const guide = findGuideByKey(guideKey);
    if (guide) openOnboardingGuide(guide);
};

watch(showOnboardingGuide, (visible) => {
    if (visible) {
        currentIndex.value = getGuideStartIndex();
        refreshAfterRender();
    } else {
        targetRect.value = null;
        syncMutationObserver();
    }
});

watch(currentIndex, refreshAfterRender);

watch(() => route.fullPath, () => {
    showOnboardingGuide.value = false;
    currentGuide.value = null;
    syncMutationObserver();
    scheduleGuideCheck(450);
});

onMounted(() => {
    window.addEventListener('resize', refreshTarget);
    window.addEventListener('scroll', refreshTarget, true);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener(ONBOARDING_GUIDE_EVENT, handleOpenGuideEvent);

    syncMutationObserver();
    scheduleGuideCheck(300);
});

onUnmounted(() => {
    window.removeEventListener('resize', refreshTarget);
    window.removeEventListener('scroll', refreshTarget, true);
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener(ONBOARDING_GUIDE_EVENT, handleOpenGuideEvent);
    mutationObserver?.disconnect();
    if (onboardingGuideTimer) clearTimeout(onboardingGuideTimer);
    if (scrollTargetTimer) clearTimeout(scrollTargetTimer);
});
</script>

<style lang="scss" scoped>
.onboarding-overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    pointer-events: auto;
}

.onboarding-highlight {
    position: fixed;
    border: 2px solid var(--primary-color);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.58), 0 0 24px rgba(255, 105, 180, 0.42);
    transition: all 0.2s ease;
    pointer-events: none;
}

.onboarding-card {
    position: fixed;
    z-index: 2;
    box-sizing: border-box;
    padding: 18px;
    border-radius: 8px;
    background: #fff;
    color: #333;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
    transition: all 0.2s ease;

    &.centered {
        top: 50%;
        left: 50%;
        width: min(360px, calc(100vw - 32px));
        transform: translate(-50%, -50%);
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.58), 0 12px 32px rgba(0, 0, 0, 0.24);
    }

    &.intro {
        width: min(420px, calc(100vw - 32px));
        padding: 20px 22px 18px;
    }

    h3 {
        margin: 8px 0 10px;
        color: var(--primary-color);
        font-size: 20px;
        line-height: 1.3;
    }

    p {
        margin: 0;
        color: #555;
        font-size: 14px;
        line-height: 1.7;
    }
}

.onboarding-mascot {
    position: fixed;
    z-index: 1;
    display: block;
    height: auto;
    filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.22));
    pointer-events: none;
    user-select: none;
    transition: top 0.2s ease, left 0.2s ease, width 0.2s ease;

    &.intro {
        z-index: 3;
        -webkit-mask-image: linear-gradient(to bottom,
                rgba(0, 0, 0, 1) 0%,
                rgba(0, 0, 0, 1) 58%,
                rgba(0, 0, 0, 0) 64%,
                rgba(0, 0, 0, 0) 100%);
        mask-image: linear-gradient(to bottom,
                rgba(0, 0, 0, 1) 0%,
                rgba(0, 0, 0, 1) 58%,
                rgba(0, 0, 0, 0) 64%,
                rgba(0, 0, 0, 0) 100%);
        mask-size: 100% 100%;
        mask-repeat: no-repeat;
        filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.22));
    }
}

.onboarding-progress {
    color: #999;
    font-size: 12px;
}

.onboarding-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 18px;

    button {
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 14px;
        white-space: nowrap;
        transition: opacity 0.2s, transform 0.2s;

        &:disabled {
            cursor: not-allowed;
            opacity: 0.45;
        }

        &:not(:disabled):active {
            transform: scale(0.96);
        }
    }

    .primary {
        background: var(--primary-color);
        color: #fff;
    }

    .text-button {
        background: transparent;
        color: #777;
    }
}

.step-actions {
    display: flex;
    gap: 8px;

    button:not(.primary) {
        background: #f2f2f2;
        color: #333;
    }
}

@media (max-width: 480px) {
    .onboarding-actions {
        align-items: stretch;
        flex-direction: column;

        .text-button,
        .step-actions,
        .step-actions button {
            width: 100%;
        }
    }
}
</style>

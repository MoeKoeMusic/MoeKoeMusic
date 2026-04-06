<template>
    <span v-if="isBirthdayToday" class="birthday-badge">
        <i class="fas fa-birthday-cake"></i>
        生日快乐
    </span>

    <teleport to="body">
        <div v-if="show" class="birthday-fullscreen" aria-hidden="true">
            <canvas ref="confettiCanvas" class="birthday-confetti-canvas"></canvas>
            <div class="ribbon-wrapper">
                <div class="ribbon-fold-left"></div>
                <div class="ribbon-fold-right"></div>
                <div class="ribbon">
                    <h1><span v-if="nickname">{{ nickname }},</span>生日快乐</h1>
                    <p>愿你拥有美好的一天！</p>
                </div>
            </div>
        </div>
    </teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
    birthday: String,
    nickname: String,
    playerControl: Object,
    songHash: {
        type: String,
        default: '0F41D9534CA951FD50E98D187FD2F3BD',
    },
});

const show = ref(false);
const confettiCanvas = ref(null);
let hideTimer = null;
let confettiInstance = null;

const confettiCdnUrl = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';

const parseMonthDay = (birthday) => {
    if (!birthday || typeof birthday !== 'string') return null;
    const parts = birthday.trim().slice(0, 10).split('-');
    if (parts.length < 3) return null;
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    return { month, day };
};

const isBirthdayToday = computed(() => {
    const md = parseMonthDay(props.birthday);
    if (!md) return false;
    const now = new Date();
    return now.getMonth() + 1 === md.month && now.getDate() === md.day;
});

const loadConfetti = () => {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (window.confetti) return Promise.resolve(window.confetti);

    const existing = document.querySelector('script[data-canvas-confetti="1"]');
    if (existing) {
        return new Promise((resolve, reject) => {
            existing.addEventListener('load', () => resolve(window.confetti), { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load canvas-confetti')), { once: true });
        });
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = confettiCdnUrl;
        script.async = true;
        script.defer = true;
        script.dataset.canvasConfetti = '1';
        script.onload = () => resolve(window.confetti);
        script.onerror = () => reject(new Error('Failed to load canvas-confetti'));
        document.head.appendChild(script);
    });
};

const fireConfettiFromBottom = async () => {
    const confetti = await loadConfetti();
    if (!confettiCanvas.value || typeof confetti?.create !== 'function') return;

    if (!confettiInstance) {
        confettiInstance = confetti.create(confettiCanvas.value, { resize: true, useWorker: true });
    }

    const base = {
        origin: { x: 0.5, y: 1 },
        angle: 90,
        spread: 70,
        startVelocity: 55,
        gravity: 1,
        ticks: 240,
        scalar: 1,
    };

    confettiInstance({ ...base, particleCount: 160 });
    window.setTimeout(() => confettiInstance?.({ ...base, particleCount: 110, spread: 95, startVelocity: 48 }), 170);
    window.setTimeout(() => confettiInstance?.({ ...base, particleCount: 80, spread: 115, startVelocity: 40, gravity: 1.15 }), 360);
};

const tryAutoPlay = async () => {
    const add = props.playerControl?.addSongToQueue;
    if (typeof add !== 'function') return;
    try {
        await add(props.songHash, `祝${props.nickname || '你'}生日快乐 🎉`, './assets/images/ico.png');
    } catch {
    }
};

const playIntroOnce = async () => {
    if (!isBirthdayToday.value) return;

    const key = `birthday_egg_intro`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');

    show.value = true;
    fireConfettiFromBottom();
    await tryAutoPlay();

    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
        show.value = false;
    }, 6500);
};

watch(() => props.birthday, playIntroOnce, { immediate: true });

onBeforeUnmount(() => {
    if (hideTimer) window.clearTimeout(hideTimer);
    confettiInstance?.reset?.();
});
</script>

<style lang="scss" scoped>
.birthday-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: 10px;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 12px;
    line-height: 1;
    color: #fff;
    user-select: none;
    background: linear-gradient(90deg, rgba(255, 77, 77, 0.35), rgba(255, 214, 10, 0.35), rgba(96, 165, 250, 0.35));
    border: 1px solid rgba(255, 255, 255, 0.35);
    backdrop-filter: blur(6px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
}

.birthday-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 9998;
    pointer-events: none;
    background: radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.75), transparent 45%),
        radial-gradient(circle at 80% 30%, rgba(255, 255, 255, 0.7), transparent 40%),
        radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.65), transparent 45%),
        linear-gradient(180deg, rgba(163, 214, 255, 0.45), rgba(255, 255, 255, 0.2));
    animation: birthdayFade 6500ms ease-in-out forwards;
}

.birthday-confetti-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.ribbon-wrapper {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
}

.ribbon {
    background: linear-gradient(to bottom, #ffb3c7 0%, #ffe3ec 55%, #fff 100%);
    padding: 15px 60px;
    position: relative;
    z-index: 2;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
    border-radius: 8px;
    text-align: center;
    transform: perspective(700px) rotateX(6deg);
    animation: ribbonIn 520ms cubic-bezier(0.2, 0.9, 0.2, 1);

    h1 {
        margin: 0;
        color: #ff4d6d;
        font-size: 2.4rem;
        font-weight: 800;
        letter-spacing: 3px;
        text-shadow: 1px 1px 0 rgba(255, 238, 245, 0.95);
    }

    p {
        margin: 0;
        margin-top: -6px;
        color: #ff7fa0;
        font-size: 1rem;
        font-family: 'Arial', sans-serif;
        font-weight: 700;
    }

    &::before,
    &::after {
        content: '';
        position: absolute;
        top: 60%;
        height: 100%;
        width: 80px;
        background: linear-gradient(to bottom, #ffb3c7 0%, #ffe3ec 55%, #fff 100%);
        z-index: -1;
        clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 20% 50%);
        box-shadow: 0 10px 22px rgba(0, 0, 0, 0.12);
    }

    &::before {
        left: -40px;
        transform: translateY(-60%) rotate(-10deg);
        border-right: none;
    }

    &::after {
        right: -40px;
        transform: translateY(-60%) scaleX(-1) rotate(-10deg);
        border-left: none;
    }
}

.ribbon-fold-left,
.ribbon-fold-right {
    position: absolute;
    top: 100%;
    width: 0;
    height: 0;
    border-style: solid;
    z-index: 0;
}

.ribbon-fold-left {
    left: -8px;
    border-width: 0 15px 15px 0;
    border-color: transparent rgba(0, 0, 0, 0.16) transparent transparent;
    top: 100%;
}

.ribbon-fold-right {
    right: -8px;
    border-width: 15px 15px 0 0;
    border-color: rgba(0, 0, 0, 0.16) transparent transparent transparent;
    top: 100%;
}

@keyframes ribbonIn {
    0% {
        transform: perspective(700px) rotateX(6deg) translateY(-18px);
        opacity: 0;
    }

    100% {
        transform: perspective(700px) rotateX(6deg) translateY(0);
        opacity: 1;
    }
}

@keyframes birthdayFade {
    0% {
        opacity: 0;
    }

    10% {
        opacity: 1;
    }

    85% {
        opacity: 1;
    }

    100% {
        opacity: 0;
    }
}
</style>
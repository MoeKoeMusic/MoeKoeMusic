<template>
    <teleport to="body">
        <div v-if="showPanel" class="risk-verify-overlay">
            <div class="risk-verify-card">
                <h3>安全验证</h3>

                <p v-if="loading" class="risk-verify-tip">{{ loadingText }}</p>

                <template v-else-if="verifyType === 32">
                    <p class="risk-verify-tip">请输入短信验证码</p>
                    <input
                        ref="smsInputRef"
                        v-model.trim="smsCode"
                        class="risk-verify-input"
                        autocomplete="one-time-code"
                        placeholder="请输入验证码"
                        @keydown.enter="submitSms"
                    />
                    <button class="risk-verify-btn" :disabled="submitting" @click="submitSms">
                        {{ submitting ? '提交中...' : '提交验证码' }}
                    </button>
                </template>

                <template v-else>
                    <p class="risk-verify-tip">{{ errorMessage || '正在准备安全验证...' }}</p>
                    <button v-if="errorMessage" class="risk-verify-btn" :disabled="loading" @click="startVerify">
                        重试
                    </button>
                </template>

                <p v-if="verifyType === 32 && errorMessage" class="risk-verify-error">{{ errorMessage }}</p>

                <button class="risk-verify-btn risk-verify-btn-ghost" :disabled="submitting" @click="cancel">
                    取消
                </button>
            </div>
        </div>
    </teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
    eventId: {
        type: String,
        required: true,
    },
    requestRiskApi: {
        type: Function,
        required: true,
    },
});

const emit = defineEmits(['success', 'cancel']);

const verifyInfo = ref(null);
const loading = ref(false);
const submitting = ref(false);
const smsCode = ref('');
const errorMessage = ref('');
const loadingText = ref('正在获取验证信息...');
const smsInputRef = ref(null);

let tCaptchaLoader = null;
let closed = false;

const tencentCaptchaBodyClass = 'risk-verify-tencent-active';

const verifyType = computed(() => Number(verifyInfo.value?.v_type || 23));
const txAppId = computed(() => String(verifyInfo.value?.txappid || '').trim());
const showPanel = computed(() => verifyType.value === 32 || Boolean(errorMessage.value));

const normalizeResult = (response) => {
    if (!response) return null;
    return Number(response.status) === 1 ? response : response?.data;
};

const loadTencentCaptcha = () => {
    if (window.TencentCaptcha) {
        return Promise.resolve();
    }

    if (tCaptchaLoader) {
        return tCaptchaLoader;
    }

    tCaptchaLoader = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://turing.captcha.qcloud.com/TCaptcha.js';
        script.async = true;
        script.onload = () => {
            if (window.TencentCaptcha) {
                resolve();
                return;
            }

            tCaptchaLoader = null;
            reject(new Error('腾讯验证码加载失败'));
        };
        script.onerror = () => {
            tCaptchaLoader = null;
            script.remove();
            reject(new Error('腾讯验证码加载失败'));
        };
        document.head.appendChild(script);
    });

    return tCaptchaLoader;
};

const openTencentCaptcha = (appId) => {
    return new Promise((resolve, reject) => {
        try {
            const captcha = new window.TencentCaptcha(
                appId,
                (result) => {
                    if (Number(result?.ret) === 0 && result.ticket && result.randstr) {
                        resolve(result);
                        return;
                    }

                    const suffix = result?.ret === undefined ? '' : `（ret=${result.ret}）`;
                    const error = new Error(`验证码未通过${suffix}`);
                    error.cancelled = true;
                    reject(error);
                },
                { type: '', showHeader: false }
            );

            captcha.show();
        } catch (error) {
            reject(error);
        }
    });
};

const loadVerifyInfo = async () => {
    const res = await props.requestRiskApi('/get/verify/info', { eventid: props.eventId });
    if (Number(res?.status) !== 1) {
        throw new Error(String(res?.msg || '未能获取验证信息'));
    }

    verifyInfo.value = res.data || res;
};

const submitVerify = async (verifyCode) => {
    const code = String(verifyCode || '').trim();
    if (!code) {
        throw new Error('验证码为空');
    }

    const res = await props.requestRiskApi('/sidedt', {
        eventid: props.eventId,
        v_type: verifyType.value,
        verifycode: encodeURIComponent(code),
    });
    const result = normalizeResult(res);

    if (Number(result?.status) !== 1) {
        throw new Error(String(result?.msg || result?.data || '验证失败'));
    }
};

const submitTencent = async () => {
    const appId = txAppId.value;
    if (!appId) {
        throw new Error('缺少腾讯验证码配置');
    }

    loading.value = true;
    loadingText.value = '正在打开验证码...';
    await loadTencentCaptcha();
    if (closed) return;

    document.body.classList.add(tencentCaptchaBodyClass);
    const result = await openTencentCaptcha(appId);
    if (closed) return;

    const verifyCode = `KGCodeTX|${JSON.stringify({
        ticket: result.ticket,
        randstr: result.randstr,
        txappid: appId,
    })}`;

    loadingText.value = '正在提交验证结果...';
    await submitVerify(verifyCode);
};

const success = () => {
    if (closed) return;
    closed = true;
    document.body.classList.remove(tencentCaptchaBodyClass);
    emit('success');
};

const cancelWith = (error) => {
    if (closed) return;
    closed = true;
    document.body.classList.remove(tencentCaptchaBodyClass);
    emit('cancel', error instanceof Error ? error : new Error(String(error || '已取消安全验证')));
};

const startVerify = async () => {
    try {
        loading.value = true;
        submitting.value = false;
        errorMessage.value = '';
        smsCode.value = '';
        loadingText.value = '正在获取验证信息...';

        await loadVerifyInfo();

        if (verifyType.value === 23) {
            await submitTencent();
            success();
            return;
        }

        if (verifyType.value === 32) {
            loading.value = false;
            await nextTick();
            smsInputRef.value?.focus();
            return;
        }

        throw new Error(`暂不支持该验证类型：${verifyType.value}`);
    } catch (error) {
        if (error?.cancelled) {
            cancelWith(error);
            return;
        }

        errorMessage.value = error?.message || '安全验证失败';
        loading.value = false;
    }
};

const submitSms = async () => {
    if (submitting.value) return;

    try {
        const code = smsCode.value.trim();
        if (!code) {
            errorMessage.value = '请输入验证码';
            return;
        }

        submitting.value = true;
        errorMessage.value = '';
        await submitVerify(code);
        success();
    } catch (error) {
        errorMessage.value = error?.message || '提交失败';
    } finally {
        submitting.value = false;
    }
};

const cancel = () => {
    cancelWith(new Error('已取消安全验证'));
};

onMounted(startVerify);

onBeforeUnmount(() => {
    document.body.classList.remove(tencentCaptchaBodyClass);
});
</script>

<style scoped>
.risk-verify-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
}

.risk-verify-card {
    width: min(380px, calc(100vw - 40px));
    box-sizing: border-box;
    padding: 22px;
    border-radius: 8px;
    background: var(--background-color, #fff);
    color: var(--text-color, #222);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
}

.risk-verify-card h3 {
    margin: 0 0 10px;
    font-size: 18px;
    font-weight: 600;
}

.risk-verify-tip {
    margin: 0 0 16px;
    color: var(--secondary-text-color, #666);
    font-size: 14px;
    line-height: 1.6;
}

.risk-verify-input {
    width: 100%;
    height: 40px;
    box-sizing: border-box;
    margin-bottom: 12px;
    padding: 0 12px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 6px;
    outline: none;
    background: transparent;
    color: inherit;
}

.risk-verify-btn {
    width: 100%;
    height: 40px;
    border: 0;
    border-radius: 6px;
    color: #fff;
    background: var(--primary-color, #ff4f89);
    cursor: pointer;
}

.risk-verify-btn + .risk-verify-btn {
    margin-top: 10px;
}

.risk-verify-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.risk-verify-btn-ghost {
    margin-top: 10px;
    color: var(--text-color, #222);
    background: var(--button-background-color, #f2f2f2);
}

.risk-verify-error {
    min-height: 18px;
    margin: 0 0 10px;
    color: #f56c6c;
    font-size: 13px;
    line-height: 1.4;
}
</style>

<style>
body.risk-verify-tencent-active::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.5);
}

body.risk-verify-tencent-active #tcaptcha_transform_dy,
body.risk-verify-tencent-active [id^="tcaptcha_transform"],
body.risk-verify-tencent-active .tcaptcha_transform {
    position: fixed !important;
    inset: auto !important;
    top: 50% !important;
    left: 50% !important;
    z-index: 10000 !important;
    width: min(420px, calc(100vw - 40px)) !important;
    height: min(360px, calc(100vh - 80px)) !important;
    overflow: hidden !important;
    display: block !important;
    opacity: 1 !important;
    transform: translate(-50%, -50%) !important;
    border-radius: 8px !important;
    background: #fff !important;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24) !important;
}

body.risk-verify-tencent-active #tcaptcha_transform_dy iframe,
body.risk-verify-tencent-active [id^="tcaptcha_transform"] iframe,
body.risk-verify-tencent-active .tcaptcha_transform iframe {
    position: static !important;
    width: 100% !important;
    height: 100% !important;
    display: block !important;
    border: 0 !important;
}
</style>

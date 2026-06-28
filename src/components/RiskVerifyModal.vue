<template>
    <teleport to="body">
        <div v-if="visible" class="risk-verify-overlay">
            <div class="risk-verify-card">
                <h3>安全验证</h3>

                <p v-if="loading" class="risk-verify-tip">正在获取验证信息...</p>

                <template v-if="!loading && verifyType === 23 && txAppId">
                    <button class="risk-verify-btn" :disabled="verifying" @click="startTencentCaptcha">腾讯验证</button>
                    <p class="risk-verify-tip">如页面内未弹出验证码，可重试或手动关闭后重新登录再试</p>
                </template>

                <template v-else-if="!loading && verifyType === 32">
                    <p class="risk-verify-tip">已发送短信验证码，请输入验证码后提交。</p>
                    <input v-model="smsCode" class="risk-verify-input" placeholder="请输入验证码" />
                    <button class="risk-verify-btn" :disabled="verifying" @click="submitSms">提交验证码</button>
                </template>

                <template v-else-if="!loading">
                    <p class="risk-verify-tip">该验证类型不支持自动处理，建议稍后重试。</p>
                    <button class="risk-verify-btn" :disabled="verifying" @click="reloadInfo">刷新验证方式</button>
                </template>

                <p v-if="errorMessage" class="risk-verify-error">{{ errorMessage }}</p>

                <div class="risk-verify-actions">
                    <button class="risk-verify-btn risk-verify-btn-ghost" :disabled="verifying" @click="cancel">取消</button>
                </div>
            </div>
        </div>
    </teleport>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { bindRiskVerifyService } from '@/utils/riskVerify';
import { get } from '@/utils/request';

const visible = ref(false);
const eventId = ref('');
const verifyInfo = ref(null);
const loading = ref(false);
const verifying = ref(false);
const smsCode = ref('');
const errorMessage = ref('');

let resolveFn = null;
let rejectFn = null;

const verifyType = computed(() => Number(verifyInfo.value?.v_type || 23));
const txAppId = computed(() => String(verifyInfo.value?.txappid || '').trim());

const normalizeResult = (response) => {
    if (!response) return null;
    return Number(response.status) === 1 ? response : response?.data;
};

const setResult = (message = '') => {
    errorMessage.value = message;
};

const rejectChallenge = (message) => {
    const reject = rejectFn;
    resolveFn = null;
    rejectFn = null;
    if (reject) {
        reject(new Error(message || '验证已取消'));
    }
    visible.value = false;
    loading.value = false;
    verifying.value = false;
    smsCode.value = '';
};

const loadVerifyInfo = async () => {
    const res = await get('/get/verify/info', { eventid: eventId.value }, { __skipRisk: true });
    if (!res || Number(res.status) !== 1) {
        throw new Error('未能获取到验证信息');
    }
    verifyInfo.value = res.data || res;
};

const submitVerify = async (verifyCode) => {
    const code = String(verifyCode || '').trim();
    if (!code) {
        throw new Error('验证码为空');
    }

    const res = await get(
        '/sidedt',
        {
            eventid: eventId.value,
            v_type: verifyType.value,
            verifycode: encodeURIComponent(code),
        },
        { __skipRisk: true }
    );

    const normalized = normalizeResult(res);
    if (Number(normalized?.status) !== 1) {
        throw new Error(String(normalized?.msg || normalized?.data || '验证失败'));
    }

    return true;
};

const startTencentCaptcha = () => {
    if (!txAppId.value) {
        setResult('缺少腾讯验证码配置');
        return;
    }

    if (!window.TencentCaptcha) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://turing.captcha.qcloud.com/TCaptcha.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('腾讯验证码加载失败'));
            document.head.appendChild(script);
        })
            .then(() => startTencentCaptcha())
            .catch((error) => {
                setResult(error.message || '腾讯验证码加载失败');
            });
    }

    const verifyCode = (result) => {
        const payload = `KGCodeTX|${JSON.stringify({
            ticket: result.ticket,
            randstr: result.randstr,
            txappid: txAppId.value,
        })}`;

        return submitVerify(payload);
    };

    verifying.value = true;
    errorMessage.value = '';

    try {
        const captcha = new window.TencentCaptcha(
            txAppId.value,
            async (res) => {
                if (res?.ret !== 0) {
                    setResult(`验证码已取消或失败（ret=${res?.ret || 0}）`);
                    verifying.value = false;
                    rejectChallenge(`验证码未通过（ret=${res?.ret || 0}）`);
                    return;
                }

                try {
                    await verifyCode(res);
                    onResolved();
                } catch (error) {
                    setResult(error?.message || '校验失败，请重试');
                    verifying.value = false;
                }
            },
            {
                type: '',
                showHeader: false,
                ready: () => {},
            }
        );

        captcha.show();
    } catch (error) {
        setResult(error?.message || '验证初始化失败');
        verifying.value = false;
    }
};

const onResolved = () => {
    if (!resolveFn) return;
    const resolve = resolveFn;
    resolveFn = null;
    rejectFn = null;
    visible.value = false;
    loading.value = false;
    verifying.value = false;
    smsCode.value = '';
    resolve(true);
};

const submitSms = async () => {
    try {
        verifying.value = true;
        errorMessage.value = '';
        await submitVerify(smsCode.value);
        onResolved();
    } catch (error) {
        setResult(error?.message || '提交失败');
    } finally {
        verifying.value = false;
    }
};

const reloadInfo = async () => {
    try {
        loading.value = true;
        setResult('');
        await loadVerifyInfo();
        loading.value = false;
    } catch (error) {
        loading.value = false;
        setResult(error?.message || '刷新验证信息失败');
    }
};

const cancel = () => {
    rejectChallenge('已取消安全验证');
};

const start = async ({ eventId: nextEventId }) => {
    eventId.value = String(nextEventId || '').trim();
    if (!eventId.value) {
        throw new Error('缺少安全验证事件 ID');
    }

    loading.value = true;
    verifyInfo.value = null;
    setResult('');
    smsCode.value = '';

    await loadVerifyInfo();
    visible.value = true;
    loading.value = false;

    return new Promise((resolve, reject) => {
        resolveFn = resolve;
        rejectFn = reject;
        if (!verifyInfo.value?.v_type) {
            const err = new Error('缺少验证参数');
            resolveFn = null;
            rejectFn = null;
            throw err;
        }
    });
};

onMounted(() => {
    bindRiskVerifyService({
        start: ({ eventId: challengeEventId }) => start({ eventId: challengeEventId }),
    });
});
</script>

<style scoped>
.risk-verify-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
}

.risk-verify-card {
    width: min(420px, calc(100vw - 48px));
    background: #fff;
    border-radius: 10px;
    padding: 24px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    text-align: center;
}

.risk-verify-card h3 {
    margin: 0 0 12px;
}

.risk-verify-tip {
    margin: 0 0 16px;
    color: #666;
    font-size: 14px;
}

.risk-verify-input {
    width: 100%;
    height: 40px;
    border: 1px solid #e6e6e6;
    border-radius: 8px;
    margin-bottom: 12px;
    padding: 0 12px;
    box-sizing: border-box;
}

.risk-verify-btn {
    border: none;
    width: 100%;
    border-radius: 8px;
    height: 42px;
    color: #fff;
    background: var(--primary-color, #ff4f89);
    cursor: pointer;
    margin-bottom: 10px;
}

.risk-verify-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.risk-verify-btn-ghost {
    background: #f2f2f2;
    color: #333;
}

.risk-verify-error {
    color: #f56c6c;
    margin: 8px 0 12px;
    font-size: 13px;
}

.risk-verify-actions {
    margin-top: 8px;
}
</style>

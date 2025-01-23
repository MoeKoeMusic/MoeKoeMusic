<template>
    <div class="login-page">
        <div class="blur-background"></div>
        <el-card class="login-container" shadow="hover">
            <div class="header">
                <el-button class="close-btn" link @click="handleClose">
                    <el-icon>
                        <Close />
                    </el-icon>
                </el-button>
            </div>
            <img src="https://www.kugou.com/yy/static/images/play/logo.png" alt="App Logo" class="logo" />
            <h2>{{ $t('deng-lu-ni-de-ku-gou-zhang-hao') }}</h2>
            <div class="logintype-menu">
                <el-segmented v-model="loginType" :options="options" size="default" @change="handleTabSwitch" block />
            </div>
            <div v-if="loginType === t('shou-ji-hao-deng-lu')">
                <el-form :model="phoneForm" :rules="rules" @submit.prevent class="login-form">
                    <el-form-item prop="mobile">
                        <el-input v-model="phoneForm.mobile" :placeholder="$t('qing-shu-ru-shou-ji-hao')" clearable />
                    </el-form-item>
                    <el-form-item prop="code">
                        <el-input v-model="phoneForm.code" :placeholder="$t('qing-shu-ru-yan-zheng-ma')" clearable>
                            <template #append>
                                <el-button type="primary" @click="sendCaptcha" :loading="isSendingCaptcha"
                                    :disabled="!phoneForm.mobile || countdown > 0">
                                    {{ countdown > 0 ? `${countdown}s` : $t('fa-song-yan-zheng-ma') }}
                                </el-button>
                            </template>
                        </el-input>
                    </el-form-item>
                    <el-button type="primary" @click="phoneLogin" :loading="isPhoneLoginLoading">{{ $t('li-ji-deng-lu')
                        }}</el-button>
                </el-form>
            </div>

            <div v-if="loginType === t('you-xiang-deng-lu')">
                <el-form :model="emailForm" :rules="rules" @submit.prevent class="login-form">
                    <el-form-item prop="email">
                        <el-input v-model="emailForm.email" :placeholder="$t('qing-shu-ru-deng-lu-you-xiang')"
                            clearable />
                    </el-form-item>
                    <el-form-item prop="password">
                        <el-input v-model="emailForm.password" type="password" show-password
                            :placeholder="$t('qing-shu-ru-mi-ma')" clearable />
                    </el-form-item>
                    <el-button type="primary" @click="emailLogin" :loading="isEmailLoginLoading">{{
                        $t('you-xiang-deng-lu')
                        }}</el-button>
                </el-form>
            </div>

            <div v-if="loginType === t('sao-ma-deng-lu')" class="qr-container">
                <div class="qr-login">
                    <p>{{ tips }}</p>
                    <img :src="qrCode" v-if="qrCode" :alt="$t('er-wei-ma')" class="qr-code" />
                    <div v-else class="qr-skeleton">
                        <el-skeleton-item variant="image" />
                        <el-skeleton-item variant="p" style="width: 60%" />
                    </div>
                </div>
            </div>

            <p class="disclaimer">
                {{
                    $t('meng-yin-cheng-nuo-bu-hui-bao-cun-ni-de-ren-he-zhang-hao-xin-xi-dao-yun-duan-ni-de-mi-ma-hui-zai-ben-di-jin-hang-jia-mi-hou-zai-chuan-shu-dao-ku-gou-guan-fang-meng-yin-bing-fei-ku-gou-guan-fang-wang-zhan-shu-ru-zhang-hao-xin-xi-qian-qing-shen-zhong-kao-lv-er-wei-ma-sao-ma-hou-xu-yao-deng-dai-ji-fen-zhong-cai-hui-deng-lu-cheng-gong')
                }}<b>{{ $t('tui-jian') }}</b>{{ $t('shi-yong-yan-zheng-ma-deng-lu') }}
            </p>
        </el-card>
    </div>
</template>


<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { get } from '../utils/request';
import { MoeAuthStore } from '../stores/store';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { Close } from '@element-plus/icons-vue'
const { t } = useI18n();
const loginType = ref(t('shou-ji-hao-deng-lu'));

const options = [t('shou-ji-hao-deng-lu'), t('you-xiang-deng-lu'), t('sao-ma-deng-lu')];

const MoeAuth = MoeAuthStore();
const router = useRouter();
const route = useRoute();

const emailForm = reactive({
    email: '',
    password: ''
});

const phoneForm = reactive({
    mobile: '',
    code: ''
});

const rules = {
    code: [{ required: true, message: t('qing-shu-ru-yan-zheng-ma'), trigger: "blur" }],
    password: [{ required: true, message: t('qing-shu-ru-mi-ma'), trigger: "blur" }],
    mobile: [
        { required: true, message: t('qing-shu-ru-shou-ji-hao-ma'), trigger: "blur" },
        {
            validator: (rule, value, callback) => {
                if (/^1\d{10}$/.test(value) === false) {
                    callback(new Error(t('shou-ji-hao-ge-shi-cuo-wu')));
                } else {
                    callback();
                }
            },
            trigger: "blur"
        }
    ],
    email: [
        { required: true, message: t('qing-shu-ru-you-xiang'), trigger: "blur" },
        {
            validator: (rule, value, callback) => {
                if (/^\w{1,64}@[a-z0-9\-]{1,256}(\.[a-z]{2,6}){1,2}$/i.test(value) === false) {
                    callback(new Error(t('you-xiang-ge-shi-cuo-wu')));
                } else {
                    callback();
                }
            },
            trigger: "blur"
        }
    ]
};

const qrKey = ref('');
const qrCode = ref('');
const tips = ref(t('qing-shi-yong-ku-gou-sao-miao-er-wei-ma-deng-lu'));
const isSendingCaptcha = ref(false);
const isPhoneLoginLoading = ref(false);
const isEmailLoginLoading = ref(false);
const countdown = ref(0);
let qrCheckInterval = null;

// 邮箱登录
const emailLogin = async () => {
    if (!emailForm.email) {
        ElMessage.error(t('qing-shu-ru-you-xiang'));
        return;
    }
    // 验证邮箱格式
    const emailPattern = /^\w{1,64}@[a-z0-9\-]{1,256}(\.[a-z]{2,6}){1,2}$/i;
    if (!emailPattern.test(emailForm.email)) {
        ElMessage.error(t('you-xiang-ge-shi-cuo-wu'));
        return;
    }
    if (!emailForm.password) {
        ElMessage.error(t('qing-shu-ru-mi-ma'));
        return;
    }
    isEmailLoginLoading.value = true;
    try {
        const response = await get(`/login?username=${emailForm.email}&password=${emailForm.password}`);
        if (response.status === 1) {
            MoeAuth.setData({ UserInfo: response.data });
            router.push(route.query.redirect || '/library');
            ElMessage.success(t('deng-lu-cheng-gong'));
        } else {
            console.error('登录失败:', response.data);
            ElMessage.error(t('deng-lu-shi-bai-0') + `${response.data}`);
        }
    } catch (error) {
        ElMessage.error(error.message || t('deng-lu-shi-bai'));
    } finally {
        isEmailLoginLoading.value = false;
    }
};

// 发送验证码
const sendCaptcha = async () => {
    if (!phoneForm.mobile) {
        ElMessage.warning(t('qing-shu-ru-shou-ji-hao'));
        return;
    }
    // 验证手机号格式
    const mobilePattern = /^1\d{10}$/;
    if (!mobilePattern.test(phoneForm.mobile)) {
        ElMessage.warning(t('shou-ji-hao-ge-shi-cuo-wu'));
        return;
    }
    isSendingCaptcha.value = true;
    try {
        const response = await get(`/captcha/sent?mobile=${phoneForm.mobile}`);
        if (response.status === 1) {
            ElMessage.success(t('yan-zheng-ma-yi-fa-song'));
            startCountdown();
        } else {
            console.error('验证码发送失败:', response.data);
            ElMessage.error(t('yan-zheng-ma-fa-song-shi-bai-0') + `${response.data}`);
        }
    } catch (error) {
        ElMessage.error(error.message || t('yan-zheng-ma-fa-song-shi-bai'));
    } finally {
        isSendingCaptcha.value = false;
    }
};

const startCountdown = () => {
    countdown.value = 30;
    const timer = setInterval(() => {
        countdown.value--;
        if (countdown.value <= 0) {
            clearInterval(timer);
        }
    }, 1000);
};

const phoneLogin = async () => {
    if (!phoneForm.mobile) {
        ElMessage.warning(t('qing-shu-ru-shou-ji-hao'));
        return;
    }
    if (!phoneForm.code) {
        ElMessage.warning(t('qing-shu-ru-yan-zheng-ma'));
        return;
    }
    isPhoneLoginLoading.value = true;
    try {
        const response = await get(`/login/cellphone?mobile=${phoneForm.mobile}&code=${phoneForm.code}`);
        if (response && response.status === 1) {
            MoeAuth.setData({ UserInfo: response.data });
            router.push(route.query.redirect || '/library');
            ElMessage.success(t('deng-lu-cheng-gong'));
        } else {
            console.error('登录失败:', response ? response.data : '无响应数据');
            ElMessage.error(t('deng-lu-shi-bai-0') + `${response ? response.data : t('wu-xiang-ying-shu-ju')}`);
        }
    } catch (error) {
        console.error('登录失败:', error.response.data.data || '未知错误');
        ElMessage.error(error.response.data.data || t('deng-lu-shi-bai'));
    } finally {
        isPhoneLoginLoading.value = false;
    }
};

// 切换登录方式
const handleTabSwitch = (value) => {
    clearQrCheck();
    if (value === t('sao-ma-deng-lu')) {
        getQrCode();
    }
};

// 获取二维码
const getQrCode = async () => {
    try {
        // 获取二维码 key
        const keyResponse = await get('/login/qr/key');
        if (keyResponse.status === 1) {
            qrKey.value = keyResponse.data.qrcode;

            // 使用 key 创建二维码
            const qrResponse = await get(`/login/qr/create?key=${qrKey.value}&qrimg=true`);
            if (qrResponse.code === 200) {
                qrCode.value = qrResponse.data.base64;
                console.log(qrCode.value);

                checkQrStatus();
            } else {
                ElMessage.error(t('huo-qu-er-wei-ma-shi-bai'));
            }
        } else {
            ElMessage.error(t('er-wei-ma-sheng-cheng-shi-bai'));
        }
    } catch {
        ElMessage.error(t('er-wei-ma-sheng-cheng-shi-bai'));
    }
};

const clearQrCheck = () => {
    if (qrCheckInterval) {
        clearInterval(qrCheckInterval);
        qrCheckInterval = null;
    }
};

// 检查二维码扫描状态
const checkQrStatus = async () => {
    clearQrCheck();
    qrCheckInterval = setInterval(async () => {
        if (loginType.value !== t('sao-ma-deng-lu')) {
            clearQrCheck();
            return;
        }

        try {
            const response = await get(`/login/qr/check?key=${qrKey.value}`);
            if (response.status === 1) {
                if (response.data.status === 2) {
                    tips.value = t('yong-hu') + ` ${response.data.nickname} ` + t('yi-sao-ma-deng-dai-que-ren');
                } else if (response.data.status === 4) {
                    clearQrCheck();
                    MoeAuth.setData({ UserInfo: response.data });
                    ElMessage.success(t('er-wei-ma-deng-lu-cheng-gong'));
                    router.push(route.query.redirect || '/library');
                } else if (response.data.status === 0) {
                    clearQrCheck();
                    ElMessage.error(t('er-wei-ma-yi-guo-qi-qing-zhong-xin-sheng-cheng'));
                }
            }
        } catch {
            clearQrCheck();
            ElMessage.error(t('er-wei-ma-jian-ce-shi-bai'));
        }
    }, 5000);
};

// 处理关闭登录框
const handleClose = () => {
    router.push('/');
};

onMounted(() => {
    if (loginType.value === t('sao-ma-deng-lu')) {
        getQrCode();
    }
});

onUnmounted(() => {
    clearQrCheck();
});
</script>

<style scoped>
.login-page {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
}

.blur-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    z-index: -1;
}

.login-container {
    background-color: #fff;
    border-radius: 12px;
    padding: 20px;
    width: 400px;
    min-height: 500px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    text-align: center;
    display: flex;
    flex-direction: column;
}

.logo {
    width: 60px;
    margin-bottom: 10px;
}

h2 {
    color: #333;
    margin-bottom: 20px;
}

.login-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.el-form-item {
    margin-bottom: 10px;
}

.qr-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    max-height: 200px;
}

.qr-login {
    text-align: center;
}

.qr-code {
    width: 150px;
    height: 150px;
    border-radius: 10px;
    border: 1px solid #eaeaea;
    object-fit: contain;
    margin-top: 10px;
}

.disclaimer {
    font-size: 12px;
    color: #666;
    margin-top: 20px;
    line-height: 1.5;
    border-top: 1px solid #ddd;
    padding-top: 10px;
    text-align: left;
}

.logintype-menu {
    margin-bottom: 20px;
}

.logintype-menu .el-segmented {
    --el-segmented-item-selected-color: #fff;
    --el-segmented-item-selected-bg-color: var(--primary-color);
    --el-border-radius-base: 16px;
}

.el-button {
    --el-button-bg-color: var(--primary-color);
    --el-button-border-color: var(--primary-color);
    --el-button-hover-bg-color: var(--primary-color);
    --el-button-hover-border-color: var(--primary-color);
    --el-button-active-bg-color: var(--primary-color);
    --el-button-active-border-color: var(--primary-color);

}

.header {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: flex-end;
    margin-bottom: 10px;
}

.close-btn {
    padding: 8px;
    color: #666;
    font-size: 18px;
}

.close-btn:hover {
    color: var(--primary-color);
}

.qr-skeleton {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}
</style>
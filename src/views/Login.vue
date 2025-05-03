<template>
    <div class="login-page">
        <el-card class="login-container" shadow="hover">
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
                        <el-input
                            v-model="phoneForm.code"
                            :placeholder="$t('qing-shu-ru-yan-zheng-ma')"
                            clearable
                        >
                            <template #append>
                                <el-button
                                    type="primary"
                                    @click="sendCaptcha"
                                    :loading="isSendingCaptcha"
                                    :disabled="!phoneForm.mobile || countdown > 0"
                                >
                                    {{ countdown > 0 ? `${countdown}s` : $t('fa-song-yan-zheng-ma') }}
                                </el-button>
                            </template>
                        </el-input>
                    </el-form-item>
                    <el-button type="primary" @click="phoneLogin" :loading="isPhoneLoginLoading">{{ $t('li-ji-deng-lu') }}</el-button>
                </el-form>
            </div>

            <div v-if="loginType === t('you-xiang-deng-lu')">
                <el-form :model="emailForm" :rules="rules" @submit.prevent class="login-form">
                    <el-form-item prop="email">
                        <el-input v-model="emailForm.email" :placeholder="$t('qing-shu-ru-deng-lu-you-xiang')" clearable />
                    </el-form-item>
                    <el-form-item prop="password">
                        <el-input v-model="emailForm.password" type="password" show-password :placeholder="$t('qing-shu-ru-mi-ma')" clearable />
                    </el-form-item>
                    <el-button type="primary" @click="emailLogin" :loading="isEmailLoginLoading">{{ $t('you-xiang-deng-lu') }}</el-button>
                </el-form>
            </div>

            <div v-if="loginType === t('sao-ma-deng-lu')">
                <div class="qr-login">
                    <p>{{ tips }}</p>
                    <img :src="qrCode" v-if="qrCode" :alt="$t('er-wei-ma')" class="qr-code" />
                    <el-empty :description="t('zheng-zai-sheng-cheng-er-wei-ma')" v-else />
                </div>
            </div>

            <p class="disclaimer">
                {{ $t('meng-yin-cheng-nuo-bu-hui-bao-cun-ni-de-ren-he-zhang-hao-xin-xi-dao-yun-duan-ni-de-mi-ma-hui-zai-ben-di-jin-hang-jia-mi-hou-zai-chuan-shu-dao-ku-gou-guan-fang-meng-yin-bing-fei-ku-gou-guan-fang-wang-zhan-shu-ru-zhang-hao-xin-xi-qian-qing-shen-zhong-kao-lv-er-wei-ma-sao-ma-hou-xu-yao-deng-dai-ji-fen-zhong-cai-hui-deng-lu-cheng-gong') }}<b>{{ $t('tui-jian') }}</b>{{ $t('shi-yong-yan-zheng-ma-deng-lu') }}
            </p>
            <p class="register-link">
                <a @click="openRegisterUrl('https://activity.kugou.com/getvips/v-4163b2d0/index.html')" href="#">{{ $t('zhu-ce') }}</a>
            </p>
        </el-card>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { get } from '../utils/request';
import { MoeAuthStore } from '../stores/store';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { openRegisterUrl } from '../utils/utils';
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
        { required: true, message: t('qing-shu-ru-you-xiang'), trigger: "blur" }
    ]
};

const qrKey = ref('');
const qrCode = ref('');
const tips = ref(t('qing-shi-yong-ku-gou-sao-miao-er-wei-ma-deng-lu'));
const isSendingCaptcha = ref(false);
const countdown = ref(0);
const isPhoneLoginLoading = ref(false);
const isEmailLoginLoading = ref(false);
const interval = ref(null);

// 账号密码登录
const emailLogin = async () => {
    if (!emailForm.email) {
        ElMessage.error(t('qing-shu-ru-you-xiang'));
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
        }
    } catch (error) {
        console.error(error.response.data);
        ElMessage.error(error.response?.data?.data || t('deng-lu-shi-bai'));
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
            countdown.value = 60;
            const timer = setInterval(() => {
                countdown.value--;
                if (countdown.value <= 0) {
                    clearInterval(timer);
                }
            }, 1000);
        }
    } catch (error) {
        console.error(error.response.data);
        ElMessage.error(error.response.data.data || t('yan-zheng-ma-fa-song-shi-bai'));
    } finally {
        isSendingCaptcha.value = false;
    }
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
        if (response.status === 1) {
            MoeAuth.setData({ UserInfo: response.data });
            router.push(route.query.redirect || '/library');
            ElMessage.success(t('deng-lu-cheng-gong'));
        }
    } catch (error) {
        if (error.response.data?.data?.info_list) {
            ElMessage.error(t('zhan-bu-zhi-chi-duo-zhang-hao-ding-yi-shou-ji-deng-lu'));
        } else {
            ElMessage.error(error.response.data?.data || t('deng-lu-shi-bai'));
        }
        console.error(error.response.data);
    } finally {
        isPhoneLoginLoading.value = false;
    }
};

// 切换登录方式
const handleTabSwitch = (value) => {
    clearInterval(interval.value);
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

// 检查二维码扫描状态
const checkQrStatus = async () => {
    interval.value = setInterval(async () => {
        try {
            const response = await get(`/login/qr/check?key=${qrKey.value}&timestamp=${Date.now()}`, {} ,{
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            if (response.status === 1) {
                if (response.data.status === 2) {
                    tips.value = t('yong-hu')+` ${response.data.nickname} `+ t('yi-sao-ma-deng-dai-que-ren');
                } else if (response.data.status === 4) {
                    clearInterval(interval.value);
                    MoeAuth.setData({ UserInfo: response.data });
                    router.push(route.query.redirect || '/library');
                    ElMessage.success(t('er-wei-ma-deng-lu-cheng-gong'));
                } else if (response.data.status === 0) {
                    clearInterval(interval.value);
                    ElMessage.error(t('er-wei-ma-yi-guo-qi-qing-zhong-xin-sheng-cheng'));
                }
            }
        } catch {
            clearInterval(interval.value);
            ElMessage.error(t('er-wei-ma-jian-ce-shi-bai'));
        }
    }, 1000);
};

</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 85vh;
}

.login-container {
  background-color: #fff;
  border-radius: 12px;
  width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
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


.qr-login {
  text-align: center;
  margin-top: 20px;
}

.qr-code {
  width: 200px;
  height: 200px;
  border-radius: 10px;
  border: 1px solid #eaeaea;
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

.el-button{
    --el-button-bg-color: var(--primary-color);
    --el-button-border-color: var(--primary-color);
    --el-button-hover-bg-color: var(--primary-color);
    --el-button-hover-border-color: var(--primary-color);
    --el-button-active-bg-color:var(--primary-color);
    --el-button-active-border-color: var(--primary-color);

}
.register-link {
    text-align: center;
    color: #606266;
}
</style>
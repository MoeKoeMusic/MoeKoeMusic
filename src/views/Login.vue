<template>
  <div class="login-page">
    <div class="login-container">
      <img src="https://www.kugou.com/yy/static/images/play/logo.png" alt="App Logo" class="logo" />
      <h2>{{ $t('deng-lu-ni-de-ku-gou-zhang-hao') }}</h2>
      <div class="logintype-menu">
        <div class="segmented-control">
          <button v-for="option in options" :key="option"
            :class="['segmented-button', { active: loginType === option }]"
            @click="loginType = option; handleTabSwitch(option);">
            {{ option }}
          </button>
        </div>
      </div>
      <div v-if="loginType === t('shou-ji-hao-deng-lu')">
        <!-- 账号选择界面 -->
        <div v-if="showAccountSelection" class="account-selection">
          <p class="selection-tip">该手机绑定多个账号，请选择要登录的账号</p>
          <div class="account-list">
            <div v-for="account in accountList" :key="account.userid" class="account-item"
              @click="selectAccount(account)">
              <div class="account-avatar">
                <img :src="account.pic || './assets/images/profile.jpg'" :alt="account.nickname" />
              </div>
              <div class="account-info">
                <div class="account-name">{{ account.nickname || '未命名用户' }}</div>
                <div class="account-status">
                  <span class="svip-badge">Lv {{ account.p_grade }}</span>
                  <span class="user-level">UID：{{ account.userid }}</span>
                </div>
              </div>
              <div class="select-arrow">→</div>
            </div>
          </div>
          <button type="button" class="back-button" @click="backToLogin">
            返回登录
          </button>
        </div>

        <!-- 原登录表单 -->
        <form v-else @submit.prevent class="login-form">
          <div class="form-item" :class="{ 'has-error': phoneFormErrors.mobile }">
            <div class="input-wrapper">
              <input v-model="phoneForm.mobile" :placeholder="$t('qing-shu-ru-shou-ji-hao')" class="form-input"
                @blur="validateField('mobile', phoneForm.mobile)" />
              <button type="button" class="clear-button" @click="phoneForm.mobile = ''"
                v-if="phoneForm.mobile">×</button>
            </div>
            <div class="error-message" v-if="phoneFormErrors.mobile">{{ phoneFormErrors.mobile }}</div>
          </div>
          <div class="form-item" :class="{ 'has-error': phoneFormErrors.code }">
            <div class="input-wrapper with-button">
              <input v-model="phoneForm.code" :placeholder="$t('qing-shu-ru-yan-zheng-ma')" class="form-input form-code"
                @blur="validateField('code', phoneForm.code)" />
              <button type="button" class="clear-button" @click="phoneForm.code = ''" v-if="phoneForm.code">×</button>
              <button type="button" class="append-button" @click="sendCaptcha"
                :disabled="!phoneForm.mobile || countdown > 0 || isSendingCaptcha">
                <span v-if="isSendingCaptcha" class="loading-spinner"></span>
                {{ countdown > 0 ? `${countdown}s` : $t('fa-song-yan-zheng-ma') }}
              </button>
            </div>
            <div class="error-message" v-if="phoneFormErrors.code">{{ phoneFormErrors.code }}</div>
          </div>
          <button type="button" class="primary-button" @click="phoneLogin" :disabled="isPhoneLoginLoading">
            <span v-if="isPhoneLoginLoading" class="loading-spinner"></span>
            {{ $t('li-ji-deng-lu') }}
          </button>
        </form>
      </div>

      <div v-if="loginType === t('you-xiang-deng-lu')">
        <form @submit.prevent class="login-form">
          <div class="form-item" :class="{ 'has-error': emailFormErrors.email }">
            <div class="input-wrapper">
              <input v-model="emailForm.email" :placeholder="$t('qing-shu-ru-deng-lu-you-xiang')" class="form-input"
                @blur="validateField('email', emailForm.email)" />
              <button type="button" class="clear-button" @click="emailForm.email = ''" v-if="emailForm.email">×</button>
            </div>
            <div class="error-message" v-if="emailFormErrors.email">{{ emailFormErrors.email }}</div>
          </div>
          <div class="form-item" :class="{ 'has-error': emailFormErrors.password }">
            <div class="input-wrapper">
              <input v-model="emailForm.password" type="password" :placeholder="$t('qing-shu-ru-mi-ma')"
                class="form-input" @blur="validateField('password', emailForm.password)" />
              <button type="button" class="clear-button" @click="emailForm.password = ''"
                v-if="emailForm.password">×</button>
            </div>
            <div class="error-message" v-if="emailFormErrors.password">{{ emailFormErrors.password }}</div>
          </div>
          <button type="button" class="primary-button" @click="emailLogin" :disabled="isEmailLoginLoading">
            <span v-if="isEmailLoginLoading" class="loading-spinner"></span>
            {{ $t('you-xiang-deng-lu') }}
          </button>
        </form>
      </div>

      <div v-if="loginType === t('sao-ma-deng-lu')">
        <div class="qr-login">
          <p>{{ tips }}</p>
          <img :src="qrCode" v-if="qrCode" :alt="$t('er-wei-ma')" class="qr-code" />
          <div class="empty-container" v-else>
            <div class="empty-icon"><i class="fa fa-qrcode"></i></div>
            <div class="empty-text">{{ t('zheng-zai-sheng-cheng-er-wei-ma') }}</div>
          </div>
        </div>
      </div>

      <p class="disclaimer">
        {{ $t('login-tips') }}<b>{{ $t('tui-jian') }}</b>{{ $t('shi-yong-yan-zheng-ma-deng-lu') }}
      </p>
      <p class="register-link">
        <a @click.prevent="openRegisterUrl('https://activity.kugou.com/getvips/v-4163b2d0/index.html')" href="#">{{
          $t('zhu-ce') }}</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { get } from '../utils/request';
import { MoeAuthStore } from '../stores/store';
import { useRouter, useRoute } from 'vue-router';
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

const showAccountSelection = ref(false);
const accountList = ref([]);

// 表单验证错误信息
const phoneFormErrors = reactive({
  mobile: '',
  code: ''
});

const emailFormErrors = reactive({
  email: '',
  password: ''
});

// 验证字段
const validateField = (field, value) => {
  if (field === 'mobile') {
    if (!value) {
      phoneFormErrors.mobile = t('qing-shu-ru-shou-ji-hao-ma');
    } else if (!/^1\d{10}$/.test(value)) {
      phoneFormErrors.mobile = t('shou-ji-hao-ge-shi-cuo-wu');
    } else {
      phoneFormErrors.mobile = '';
    }
  } else if (field === 'code') {
    if (!value) {
      phoneFormErrors.code = t('qing-shu-ru-yan-zheng-ma');
    } else {
      phoneFormErrors.code = '';
    }
  } else if (field === 'email') {
    if (!value) {
      emailFormErrors.email = t('qing-shu-ru-you-xiang');
    } else {
      emailFormErrors.email = '';
    }
  } else if (field === 'password') {
    if (!value) {
      emailFormErrors.password = t('qing-shu-ru-mi-ma');
    } else {
      emailFormErrors.password = '';
    }
  }
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
    $message.error(t('qing-shu-ru-you-xiang'));
    return;
  }
  if (!emailForm.password) {
    $message.error(t('qing-shu-ru-mi-ma'));
    return;
  }
  isEmailLoginLoading.value = true;
  try {
    const response = await get(`/login?username=${emailForm.email}&password=${emailForm.password}`);
    if (response.status === 1) {
      MoeAuth.setData({ UserInfo: response.data });
      router.push(route.query.redirect || '/library');
      $message.success(t('deng-lu-cheng-gong'));
    }
  } catch (error) {
    console.error(error.response.data);
    $message.error(error.response?.data?.data || t('deng-lu-shi-bai'));
  } finally {
    isEmailLoginLoading.value = false;
  }
};

// 发送验证码
const sendCaptcha = async () => {
  if (!phoneForm.mobile) {
    $message.warning(t('qing-shu-ru-shou-ji-hao'));
    return;
  }
  // 验证手机号格式
  const mobilePattern = /^1\d{10}$/;
  if (!mobilePattern.test(phoneForm.mobile)) {
    $message.warning(t('shou-ji-hao-ge-shi-cuo-wu'));
    return;
  }
  isSendingCaptcha.value = true;
  try {
    const response = await get(`/captcha/sent?mobile=${phoneForm.mobile}`);
    if (response.status === 1) {
      $message.success(t('yan-zheng-ma-yi-fa-song'));
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
    $message.error(error.response.data.data || t('yan-zheng-ma-fa-song-shi-bai'));
  } finally {
    isSendingCaptcha.value = false;
  }
};

const phoneLogin = async (selectedUserId = null) => {
  if (!phoneForm.mobile) {
    $message.warning(t('qing-shu-ru-shou-ji-hao'));
    return;
  }
  if (!phoneForm.code) {
    $message.warning(t('qing-shu-ru-yan-zheng-ma'));
    return;
  }
  isPhoneLoginLoading.value = true;
  try {
    let url = `/login/cellphone?mobile=${phoneForm.mobile}&code=${phoneForm.code}`;
    if (selectedUserId) {
      url += `&userid=${selectedUserId}`;
    }
    const response = await get(url);
    if (response.status === 1) {
      MoeAuth.setData({ UserInfo: response.data });
      router.push(route.query.redirect || '/library');
      $message.success(t('deng-lu-cheng-gong'));
    }
  } catch (error) {
    if (error.response.data?.data?.info_list && !selectedUserId) {
      accountList.value = error.response.data.data.info_list;
      showAccountSelection.value = true;
    } else {
      $message.error(error.response.data?.data || t('deng-lu-shi-bai'));
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
        $message.error(t('huo-qu-er-wei-ma-shi-bai'));
      }
    } else {
      $message.error(t('er-wei-ma-sheng-cheng-shi-bai'));
    }
  } catch {
    $message.error(t('er-wei-ma-sheng-cheng-shi-bai'));
  }
};

// 选择账号登录
const selectAccount = async (account) => {
  isPhoneLoginLoading.value = true;
  await phoneLogin(account.userid);
};

// 返回登录界面
const backToLogin = () => {
  showAccountSelection.value = false;
  accountList.value = [];
};

// 检查二维码扫描状态
const checkQrStatus = async () => {
  interval.value = setInterval(async () => {
    try {
      const response = await get(`/login/qr/check?key=${qrKey.value}&timestamp=${Date.now()}`, {}, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (response.status === 1) {
        if (response.data.status === 2) {
          tips.value = t('yong-hu') + ` ${response.data.nickname} ` + t('yi-sao-ma-deng-dai-que-ren');
        } else if (response.data.status === 4) {
          clearInterval(interval.value);
          MoeAuth.setData({ UserInfo: response.data });
          router.push(route.query.redirect || '/library');
          $message.success(t('er-wei-ma-deng-lu-cheng-gong'));
        } else if (response.data.status === 0) {
          clearInterval(interval.value);
          $message.error(t('er-wei-ma-yi-guo-qi-qing-zhong-xin-sheng-cheng'));
        }
      }
    } catch {
      clearInterval(interval.value);
      $message.error(t('er-wei-ma-jian-ce-shi-bai'));
    }
  }, 1000);
};

</script>

<style lang="scss" scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  margin-top: 100px;
}

.login-container {
  background-color: #fff;
  border-radius: 20px;
  width: 400px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
  text-align: center;
  padding: 30px 25px;
  position: relative;
  overflow: hidden;
  z-index: 1;
  transition: all 0.4s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 0px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: var(--primary-color);
    border-radius: 3px;
  }
}

.logo {
  width: 65px;
  margin: 0 auto 0px;
  display: block;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
  transition: all 0.5s ease;

  &:hover {
    transform: scale(1.1) rotate(5deg);
    filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.15));
  }
}

h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  font-weight: 600;
  font-size: 1.4rem;
  position: relative;
  display: inline-block;

  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 30%;
    width: 40%;
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
    border-radius: 3px;
  }
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 8px;
}

.form-item {
  margin-bottom: 12px;
  text-align: left;
  position: relative;

  &.has-error .form-input {
    border-color: #f56c6c;
    box-shadow: 0 0 0 2px rgba(245, 108, 108, 0.1);
  }

  .form-code {
    border-radius: 10px 0 0 10px;
  }
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;

  &.with-button {
    display: flex;

    .clear-button {
      right: 110px;
    }
  }
}

.form-input {
  width: 100%;
  height: 42px;
  line-height: 42px;
  padding: 0 14px;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  transition: all 0.3s;
  outline: none;
  box-sizing: border-box;
  font-size: 14px;
  background-color: #f9fafc;

  &:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--color-box-shadow);
    background-color: #fff;
  }
}

.clear-button {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  color: #c0c4cc;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  z-index: 1;
  transition: all 0.2s;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #909399;
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.append-button {
  min-width: 100px;
  height: 42px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 0 10px 10px 0;
  cursor: pointer;
  padding: 0 12px;
  white-space: nowrap;
  font-weight: 500;
  transition: all 0.3s;
  font-size: 13px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: all 0.6s;
  }

  &:hover:not(:disabled)::before {
    left: 100%;
  }

  &:hover:not(:disabled) {
    background: var(--primary-color);
    box-shadow: 0 4px 10px var(--color-box-shadow);
  }
}

.error-message {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  animation: fadeIn 0.3s ease;

  &::before {
    content: '!';
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    background-color: #f56c6c;
    color: white;
    border-radius: 50%;
    margin-right: 6px;
    font-size: 10px;
    font-weight: bold;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.primary-button {
  width: 100%;
  height: 42px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  position: relative;
  transition: all 0.3s;
  box-shadow: 0 6px 12px var(--color-box-shadow);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: all 0.6s;
  }

  &:hover:not(:disabled)::before {
    left: 100%;
  }

  &:hover:not(:disabled) {
    background: var(--primary-color);
    box-shadow: 0 8px 16px var(--color-box-shadow);
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 4px 8px var(--color-box-shadow);
  }

  &:disabled {
    background: linear-gradient(90deg, #a0cfff, #b8dcff);
    cursor: not-allowed;
    box-shadow: none;
  }
}

.loading-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
  margin-right: 6px;
  vertical-align: middle;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.qr-login {
  text-align: center;
  margin-top: 15px;
  padding: 8px;

  p {
    margin-bottom: 12px;
    color: #606266;
    font-size: 14px;
  }
}

.qr-code {
  width: 180px;
  height: 180px;
  border-radius: 14px;
  border: 1px solid #eaeaea;
  padding: 10px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);
  transition: all 0.4s;
  background-color: white;
  margin: 0 auto;

  &:hover {
    transform: scale(1.03);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  }
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  border: 1px solid #eaeaea;
  border-radius: 14px;
  margin: 0 auto;
  width: 200px;
  background-color: #f9fafc;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
    transform: translateY(-3px);
  }
}

.empty-icon {
  font-size: 50px;
  margin-bottom: 14px;
  color: var(--primary-color);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
    transform: scale(0.95);
  }

  50% {
    opacity: 1;
    transform: scale(1.05);
  }

  100% {
    opacity: 0.6;
    transform: scale(0.95);
  }
}

.empty-text {
  color: #606266;
  font-size: 14px;
  font-weight: 500;
}

.disclaimer {
  font-size: 12px;
  color: #909399;
  margin-top: 20px;
  line-height: 1.5;
  border-top: 1px solid #ebeef5;
  padding-top: 14px;
  text-align: left;
  background-color: #f9fafc;
  padding: 14px;
  border-radius: 10px;
  position: relative;

  &::before {
    content: '!';
    position: absolute;
    top: -10px;
    left: 20px;
    width: 18px;
    height: 18px;
    background-color: var(--primary-color);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 11px;
  }
}

.logintype-menu {
  margin-bottom: 20px;
}

.segmented-control {
  display: flex;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 1;
}

.segmented-button {
  flex: 1;
  padding: 10px 0;
  text-align: center;
  background: #f5f7fa;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  color: #606266;
  position: relative;
  overflow: hidden;
  font-weight: 500;

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 20%;
    height: 60%;
    width: 1px;
    background-color: #e4e7ed;
  }

  &:hover:not(.active) {
    background-color: #ebeef5;
    color: #303133;
  }

  &.active {
    background: var(--primary-color);
    color: white;
    font-weight: 600;
    box-shadow: 0 4px 8px var(--color-box-shadow);

    &::after {
      display: none;
    }
  }
}

.register-link {
  text-align: center;
  color: #606266;
  margin-top: 18px;
  font-size: 13px;

  a {
    color: var(--primary-color);
    text-decoration: none;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s;
    border-radius: 6px;
    display: inline-block;
    margin-top: 3px;

    &:hover {
      color: var(--primary-color);
      background-color: var(--color-secondary-bg-for-transparent);
      transform: translateY(-2px);
      box-shadow: 0 4px 8px var(--color-box-shadow);
    }
  }
}

.account-selection {
  text-align: center;
  margin-top: 8px;

  h3 {
    color: var(--text-color);
    margin-bottom: 8px;
    font-weight: 600;
    font-size: 1.2rem;
  }
}

.selection-tip {
  color: var(--text-color);
  opacity: 0.7;
  font-size: 13px;
  margin-bottom: 20px;
  line-height: 1.4;
}

.account-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.account-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, var(--color-primary-light), transparent);
    transition: all 0.6s;
  }

  &:hover {
    border-color: var(--primary-color);
    background-color: var(--hover-color);
    box-shadow: 0 4px 12px var(--color-box-shadow);
    transform: translateY(-2px);

    &::before {
      left: 100%;
    }

    .account-avatar {
      border-color: var(--primary-color);
      transform: scale(1.05);
    }

    .select-arrow {
      transform: translateX(4px);
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px var(--color-box-shadow);
  }
}

.account-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-right: 12px;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid var(--border-color);
  transition: all 0.3s;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.account-info {
  flex: 1;
  text-align: left;
}

.account-name {
  font-weight: 600;
  color: var(--text-color);
  font-size: 15px;
  margin-bottom: 4px;
}

.account-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.vip-badge {
  background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 10px;
}

.svip-badge {
  background: linear-gradient(45deg, var(--color-primary), var(--primary-color));
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 10px;
}

.user-level {
  color: var(--text-color);
  opacity: 0.6;
  font-size: 11px;
}

.select-arrow {
  color: var(--primary-color);
  font-size: 18px;
  font-weight: bold;
  transition: all 0.3s;
}

.back-button {
  width: 100%;
  height: 40px;
  background: var(--background-color-secondary);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;

  &:hover {
    background: var(--hover-color);
    color: var(--text-color);
    border-color: var(--primary-color);
  }
}

@media (max-width: 480px) {
  .login-container {
    width: 100%;
    padding: 25px 18px;
    border-radius: 18px;
  }

  .form-input,
  .primary-button,
  .append-button {
    height: 40px;
  }

  h2 {
    font-size: 1.3rem;
  }

  .qr-code,
  .empty-container {
    width: 170px;
    height: 170px;
  }
}
</style>
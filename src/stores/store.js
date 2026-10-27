import { defineStore } from 'pinia';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiBaseUrl';

const registerDeviceApi = import.meta.env.VITE_APP_ENV === 'client'?
{ get: async(path) => {
    const res = await window.kugouapi?.request(path);
    if(res.body) return res.body;
} }:
// 用于设备注册的独立 axios 实例（不带拦截器，避免循环依赖）
axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000,
});

export const MoeAuthStore = defineStore('MoeData', {
    state: () => ({
        UserInfo: null, // 用户信息
        Config: null, // 配置信息
        Device: null, // 设备信息
    }),
    actions: {
        fetchConfig(key) {
            if (!this.Config) return null;
            const configItem = this.Config.find(item => item.key === key);
            return configItem ? configItem.value : null;
        },
        async setData(data) {
            if (data.UserInfo) this.UserInfo = data.UserInfo;
            if (data.Config) this.Config = data.Config;
        },
        clearData() {
            this.UserInfo = null; // 清除用户信息
        },
        async initDevice() {
            if (this.Device) return this.Device;
            try {
                const response = await registerDeviceApi.get('/register/dev');
                const device = import.meta.env.VITE_APP_ENV === 'client'?
                               response?.data: response?.data?.data;
                if (device) {
                    this.Device = device;
                    return device;
                }
            } catch (error) {
                console.error('Failed to register device:', error);
            }
            return null;
        }
    },
    getters: {
        isAuthenticated: (state) => !!state.UserInfo && !!state.UserInfo, // 是否已登录
    },
    persist: {
        enabled: true,
        strategies: [
            {
                key: 'MoeData',
                storage: localStorage,
                paths: ['UserInfo', 'Config', 'Device'],
            },
        ],
    },
});
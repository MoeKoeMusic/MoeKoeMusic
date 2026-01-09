import { defineStore } from 'pinia';
import axios from 'axios';

// Separate axios instance for device registration (without interceptors to avoid circular dependency)
const registerDeviceApi = axios.create({
    baseURL: import.meta.env.VITE_APP_API_URL || 'http://127.0.0.1:6521',
    timeout: 10000,
});

export const MoeAuthStore = defineStore('MoeData', {
    state: () => ({
        UserInfo: null, // 用户信息
        Config: null, // 配置信息
    }),
    actions: {
        fetchConfig(key) {
            if (!this.Config) return null;
            const configItem = this.Config.find(item => item.key === key);
            return configItem ? configItem.value : null;
        },
        async setData(data) {
            if (data.UserInfo) {
                // Preserve existing dfid when updating UserInfo
                const existingDfid = this.UserInfo?.dfid;
                this.UserInfo = data.UserInfo;
                if (existingDfid && !this.UserInfo.dfid) {
                    this.UserInfo.dfid = existingDfid;
                }
                // Ensure dfid exists after login
                if (!this.UserInfo.dfid) {
                    await this.initDfid();
                }
            }
            if (data.Config) this.Config = data.Config;
        },
        clearData() {
            this.UserInfo = null; // 清除用户信息
        },
        setDfid(dfid) {
            if (!this.UserInfo) {
                this.UserInfo = { dfid };
            } else {
                this.UserInfo.dfid = dfid;
            }
        },
        async initDfid() {
            // Skip if dfid already exists
            if (this.UserInfo?.dfid) {
                console.log('dfid already exists:', this.UserInfo.dfid);
                return this.UserInfo.dfid;
            }
            // Register device to get dfid
            console.log('Registering device to get dfid...');
            try {
                const response = await registerDeviceApi.get('/register/dev');
                const dfid = response?.data?.data?.dfid;
                if (dfid) {
                    this.setDfid(dfid);
                    console.log('Device registered, dfid:', dfid);
                    return dfid;
                }
            } catch (error) {
                console.error('Failed to register device:', error);
            }
            return null;
        }
    },
    getters: {
        isAuthenticated: (state) => !!state.UserInfo && !!state.UserInfo, // 判断是否已认证
    },
    persist: {
        enabled: true, 
        strategies: [
            {
                key: 'MoeData', 
                storage: localStorage,
                paths: ['UserInfo', 'Config'], 
            },
        ],
    },
});
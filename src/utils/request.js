// src/services/request.js
import axios from 'axios';
import { MoeAuthStore } from '../stores/store';

// 创建一个 axios 实例
const httpClient = axios.create({
    baseURL: import.meta.env.VITE_APP_API_URL || 'http://127.0.0.1:6521',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// 请求拦截器
httpClient.interceptors.request.use(
    config => {
        const MoeAuth = MoeAuthStore();
        const token = MoeAuth.UserInfo?.token;
        const userid = MoeAuth.UserInfo?.userid;
        const dfid = MoeAuth.UserInfo?.dfid;

        const authParts = [];
        if (token) authParts.push(`token=${encodeURIComponent(token)}`);
        if (userid) authParts.push(`userid=${encodeURIComponent(userid)}`);
        if (dfid) authParts.push(`dfid=${encodeURIComponent(dfid)}`);

        if (authParts.length > 0) {
            config.headers = {
                ...config.headers,
                Authorization: authParts.join(';')
            };
        }
        return config;
    },
    error => Promise.reject(error)
);

// 响应拦截器
httpClient.interceptors.response.use(
    response => {
        return response.data;
    },
    error => {
        if (error.response) {
            console.error(`http error status:${error.response.status}`,error.response.data);
            if (error.response?.data?.data) {
                console.error(error.response.data.data);
            // } else {
            //     $message.error('服务器错误,请稍后再试!');
            }
        } else if (error.request) {
            console.error('No response received:', error.request);
            $message.error('服务器未响应,请稍后再试!');
        } else {
            console.error('Error:', error.message);
            $message.error('请求错误,请稍后再试!');
        }
        return Promise.reject(error);
    }
);

// 封装 GET 请求
export const get = async (url, params = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = await httpClient.get(url, { params, ...config });
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// 封装 POST 请求
export const post = async (url, data = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = await httpClient.post(url, data, config);
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// 封装 PUT 请求
export const put = async (url, data = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = await httpClient.put(url, data, config);
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// 封装 DELETE 请求
export const del = async (url, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = await httpClient.delete(url, config);
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// 封装 PATCH 请求
export const patch = async (url, data = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = await httpClient.patch(url, data, config);
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// 封装上传图片请求
export const uploadImage = async (url, file, additionalData = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        // 如果有其他数据（如关联的商品信息等），也可以添加到 formData
        for (const key in additionalData) {
            if (Object.prototype.hasOwnProperty.call(additionalData, key)) {
                formData.append(key, additionalData[key]);
            }
        }

        // 需要确保 Content-Type 被设置为 multipart/form-data
        const response = await httpClient.post(url, formData, {
            ...config,
            headers: {
                ...config.headers,
                'Content-Type': 'multipart/form-data'
            }
        });

        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// 导出 httpClient 以便在需要的时候直接使用 axios 实例
export default httpClient;
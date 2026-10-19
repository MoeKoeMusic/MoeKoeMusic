import logger from 'electron-log';
import api from 'kugoumusicapi';
import apiUtils from 'kugoumusicapi/util/util.js';
import { getDevice } from './deviceUtil.js';

const coventPath = (p) => p.split('?')[0].slice(1).replace(/\//g, '_');

const getParamsFromSearch = (path) => {
	const url = new URL(path, 'moekoe://parse');
	return url.search ? Object.fromEntries(url.searchParams.entries()) : {};
}

const parseCookieStr = (cookie) => {
	if (!cookie) return {};
	if (typeof cookie !== 'string') return cookie;
	return apiUtils.cookieToJson(cookie);
}

/**
 * 创建 api 请求
 * @param {string} path 路径
 * @param {object} payload 载荷
 * @param {Record<string, any> | string | null | undefined} payload.cookie 认证 cookie
 * @param {Record<string, any> | null | undefined} payload.params api 请求体
 * @param {Record<string, string> | null | undefined} payload.headers 请求标头
 * @returns {unknown}
 */
const createRequest = async (path, payload) => {
	/** @type {undefined | api[keyof api]} */
	const module = api[coventPath(path)];

	if(!module) {
		return {
			status: 404,
			body: {
				data: null,
				status: 0,
				error_code: 0,
				error_msg: 'Not Found'
			},
			cookie: [],
			headers: {}
		}
	}

	const device = getDevice();
	const params = {
		...getParamsFromSearch(path),
		...payload?.params,
		cookie: {
			...device,
			// 部分接口必须调用 KUGOU_API_* 关键字
			// 所以保留以保证兼容性
			KUGOU_API_DEV: device.dev,
			KUGOU_API_GUID: device.uuid,
			KUGOU_API_MAC: device.mac,
			KUGOU_API_MID: device.mid,
			KUGOU_API_PLATFORM: process.env.platform || (store.get('settings')?.dataSource || 'concept') === 'concept'? 'lite': '',
			KUGOU_API_WEBGL: device.webgl,
			...parseCookieStr(getParamsFromSearch(path)?.cookie),
			...parseCookieStr(payload?.cookie),
			...parseCookieStr(payload?.headers.authorization || payload?.headers.Authorization)
		}
	}

	try {
		const result = await module(params);
		logger.log('内置 API 输出: [OK]', path);
		return result;
	} catch (e) {
		logger.error('内置 API 输出: [ERR]', path, e);
		return e;
	}
}

export default createRequest;
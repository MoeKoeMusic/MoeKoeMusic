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

	const params = {
		...getParamsFromSearch(path),
		...payload?.params,
		cookie: {
			...getDevice(),
			...parseCookieStr(getParamsFromSearch(path)?.cookie),
			...parseCookieStr(payload?.cookie),
			...parseCookieStr(payload?.headers.authorization || payload?.headers.Authorization)
		}
	}

	try {
		const result = await module?.(params);
		logger.log('内置 API 输出: [OK]', path, result);
		return result;
	} catch (e) {
		logger.error('内置 API 输出: [ERR]', path, e);
		return e;
	}
}

export default createRequest;
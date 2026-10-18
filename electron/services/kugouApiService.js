import { ipcMain } from 'electron';
import Store from 'electron-store';
import logger from 'electron-log';
import api from 'kugoumusicapi';
import apiUtils from 'kugoumusicapi/util/util.js';

const generateNewDevice = () => {
	const guid = apiUtils.getGuid();
	return {
		dev: apiUtils.randomString(10).toUpperCase(),
		guid,
		mac: '02:00:00:00:00:00',
		mid: apiUtils.calculateMid(guid),
		webgl: apiUtils.generateWebGLHash()
	}
}

const store = new Store();
/** @type {ReturnType<typeof generateNewDevice>} */
let device = store.get('device');

if(!device || !device.dev || !device.guid || !device.mac || !device.mid || !device.webgl) {
	device = generateNewDevice();
	store.set('device', device);
}

const coventPath = (p) => p.split('?')[0].slice(1).replace(/\//g, '_');

const getPayloadFromSearch = (path) => {
	const url = new URL(path, 'moekoe://parse');
	return url.search? Object.fromEntries(url.searchParams.entries()): {};
}

const parseCookieStr = (cookie) => {
	if(!cookie) return {};
	if(typeof cookie !== 'string') return cookie;
	return apiUtils.cookieToJson(cookie);
}

export const registerKuGouApiHandler = () => {
	ipcMain.handle('kugouapi:request', async (_, path, payload) => {
		/** @type {undefined | api[keyof api]} */
		const func = api[coventPath(path)];

		const params = {
			...getPayloadFromSearch(path),
			...payload?.params,
			cookie: {
				...device,
				uuid: device.guid.replace(/-/g, ''),
				KUGOU_API_DEV: device.dev,
				KUGOU_API_GUID: device.guid.replace(/-/g, ''),
				KUGOU_API_MAC: device.mac,
				KUGOU_API_MID: device.mid,
				KUGOU_API_PLATFORM: process.env.platform || (store.get('settings')?.dataSource || 'concept') === 'concept'? 'lite': '',
				KUGOU_API_WEBGL: device.webgl,
				...parseCookieStr(getPayloadFromSearch(path)?.cookie),
				...parseCookieStr(payload?.cookie),
				...parseCookieStr(payload?.headers.authorization || payload?.headers.Authorization)
			}
		}

		logger.log('[kugouapi] new request:', path, params);
		try {
			const result = await func?.(params);
			console.log('[kugouapi] request result:', result);
			return result;
		} catch(e) {
			logger.error('[kugouapi] error while request:', e);
			return e;
		}
	});

	ipcMain.handle('kugouapi:get-device', () => device);

	ipcMain.handle('kugouapi:generate-new-device', () => {
		device = generateNewDevice();
		store.set('device', device);
		return device;
	});
}
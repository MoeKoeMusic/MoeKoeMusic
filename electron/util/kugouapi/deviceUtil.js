import Store from 'electron-store';
import apiUtils from 'kugoumusicapi/util/util.js';

const store = new Store();

export const generateNewDevice = () => {
	const uuid = apiUtils.getGuid();
	const device = {
		dev: apiUtils.randomString(10).toUpperCase(),
		uuid,
		mac: '02:00:00:00:00:00',
		mid: apiUtils.calculateMid(uuid),
		webgl: apiUtils.generateWebGLHash()
	}
	store.set('device', device);
	return device;
}

/** @returns {ReturnType<typeof generateNewDevice>} */
export const getDevice = () => {
	return store.get('device') || generateNewDevice();
}
import { ipcMain } from 'electron';
import createRequest from '../util/kugouapi/createRequest.js';
import { generateNewDevice, getDevice } from '../util/kugouapi/deviceUtil.js';

export const registerKuGouApiHandler = () => {
	ipcMain.handle('kugouapi:request', async (_, path, payload) => createRequest(path, payload));

	ipcMain.handle('kugouapi:get-device', getDevice);

	ipcMain.handle('kugouapi:generate-new-device', generateNewDevice);
}
import { ipcMain } from 'electron';
import createRequest from '../util/kugouapi/createRequest.js';
import { generateNewDevice, getDevice } from '../util/kugouapi/deviceUtil.js';
import { getSenderExtensionId } from '../extensions/extensionIPC.js';

export const registerKuGouApiHandler = () => {
	ipcMain.handle('kugouapi:request', async (_, path, payload) => createRequest(path, payload));

	ipcMain.handle('kugouapi:get-device', getDevice);

	ipcMain.handle('kugouapi:generate-new-device', (event) => {
		if(getSenderExtensionId(event)) {
			return { success: false, message: '重置设备只能在萌音设置页操作' }
		} else {
			return { success: true, device: generateNewDevice() }
		}
	});
}
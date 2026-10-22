import extensionManager from './extensionManager.js';

const ValidMoekoePermissions = ['moekoe:nativeHost', 'nativeHost', 'moekoe:apiMode', 'apiMode'];

export const parsePermissions = (manifest) => {
	const result = {
		all: [],
		chrome: [],
		moekoe: [],
		moekoe_invalid: []
	}
	const { permissions, moekoe_permissions } = manifest;
	if(Array.isArray(permissions) && permissions.length >= 1) {
		permissions.forEach(k => {
			if(k.startsWith('moekoe:')) {
				if(ValidMoekoePermissions.includes(k)) {
					result.all.push(k), result.moekoe.push(k);
				} else result.moekoe_invalid.push(k);
			} else {
				result.all.push(k), result.chrome.push(k);
			}
		});
	}
	if(Array.isArray(moekoe_permissions) && moekoe_permissions.length >= 1) {
		moekoe_permissions.forEach(k => {
			if(ValidMoekoePermissions.includes(k)) {
				const fullKey = k.startsWith('moekoe:')? k: `moekoe:${k}`;
				result.all.push(fullKey), result.moekoe.push(fullKey);
			} else result.moekoe_invalid.push(k);
		});
	}
	return result;
}

/**
 * @param {'all' | 'chrome' | 'moekoe' | 'moekoe_invalid'} type
 * @param {string} permission
 * @returns {Electron.Extension[]}
 */
export const getExtensionsFromPermissions = (type, permission) => {
	const extensions = extensionManager.scanExtensions(true);
	const matchedExtensions = [];

	extensions.forEach(ext => {
		if(ext.permissions?.[type].includes(permission)) matchedExtensions.push(ext);
	});

	return matchedExtensions;
}
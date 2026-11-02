import Store from 'electron-store';
import defaultSettings from '../defaultSettings.json' with { type: 'json' };

const store = new Store();

export const useStore = () => store;

/** @returns {typeof defaultSettings} */
export const getSettings = () => Object.assign({}, defaultSettings, store.get('settings'));

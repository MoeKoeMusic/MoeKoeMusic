import { getSettings } from '../store.js';

const settings = getSettings();

// 初始化 KuGouAPI 环境变量并注册 IPC 通道
if(settings.proxy === 'on') process.env.KUGOU_API_PROXY = settings.proxyUrl;
process.env.platform = settings.dataSource === 'concept'? 'lite': '';

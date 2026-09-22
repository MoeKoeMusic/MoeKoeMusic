import fs from 'fs';
import path from 'path';
import { app, dialog, shell } from 'electron';
import log from 'electron-log';
import AdmZip from 'adm-zip';

const openLogPath = () =>
    shell.openPath(app.getPath('logs'));

const createExportFileName = () => {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `MoeKoeMusic-logs-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.zip`;
};

/**
 * @param {string} content
 */
const cleanLogs = (content) => {
    const matchs = [
        /\b(mobile)=1[3-9]\d{9}/gm,
        /\b(token)=[A-Za-z0-9]+/gm,
        /(key)=[A-Za-z0-9]+/gm,
        /\b(userid)=\d+/gm,
        /\b(username)=[^\s&]+/gim,
        /\b(password)=[^\s&]+/gim
    ];
    matchs.forEach((match) => {
        content = content.replace(match, '$1=***');
    });
    return content;
};

const exportLog = async () => {
    const logFile = path.join(app.getPath('logs'), 'main.log');
    if (!fs.existsSync(logFile)) {
        log.warn('日志文件不存在');
        throw new Error('日志文件不存在');
    }

    try {
        const zip = new AdmZip();
        const logContent = fs.readFileSync(logFile, 'utf-8');
        const cleanedContent = cleanLogs(logContent);
        zip.addFile('main.log', Buffer.from(cleanedContent, 'utf-8'));

        const { canceled, filePath } = await dialog.showSaveDialog({
            title: '导出日志',
            defaultPath: path.join(app.getPath('downloads'), createExportFileName()),
            filters: [
                { name: 'Zip Archive', extensions: ['zip'] }
            ]
        });

        if (canceled || !filePath) {
            return { canceled: true };
        }

        fs.writeFileSync(filePath, zip.toBuffer());
        return {
            canceled: false,
            filePath
        };
    } catch (err) {
        log.error('导出日志文件失败', err);
        throw err;
    }
}

export { openLogPath, exportLog };

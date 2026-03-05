import { shell } from 'electron';

export function shouldOpenExternally(targetUrl, currentUrl = '') {
    try {
        const target = new URL(targetUrl);
        if (target.protocol === 'mailto:' || target.protocol === 'tel:') {
            return true;
        }
        if (target.protocol !== 'http:' && target.protocol !== 'https:') {
            return false;
        }

        if (!currentUrl) {
            return true;
        }

        const current = new URL(currentUrl);
        return target.origin !== current.origin;
    } catch {
        return false;
    }
}

export function bindExternalLinkHandler(win, openExternalPredicate = shouldOpenExternally) {
    const { webContents } = win;

    webContents.setWindowOpenHandler(({ url }) => {
        if (openExternalPredicate(url, webContents.getURL())) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    webContents.on('will-navigate', (event, url) => {
        if (openExternalPredicate(url, webContents.getURL())) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });
}


import { session, app } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import AdmZip from 'adm-zip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Chrome 插件管理 - 根据环境选择正确的路径
const EXTENSIONS_DIR = !isDev
    ? path.join(app.getPath('userData'), 'extensions')
    : path.join(__dirname, '../../plugins/extensions');

/**
 * 加载 Chrome 插件
 */
export function loadChromeExtensions() {
    if (!fs.existsSync(EXTENSIONS_DIR)) {
        fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });
        log.info('创建插件目录:', EXTENSIONS_DIR);
    }

    try {
        const extensionDirs = fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const extensionDir of extensionDirs) {
            const extensionPath = path.join(EXTENSIONS_DIR, extensionDir);
            const manifestPath = path.join(extensionPath, 'manifest.json');
            
            if (fs.existsSync(manifestPath)) {
                try {
                    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                    
                    // 验证 manifest 格式
                    if (manifest.manifest_version && manifest.name && manifest.version) {
                        session.defaultSession.loadExtension(extensionPath, {
                            allowFileAccess: true
                        }).then((extension) => {
                            log.info(`成功加载插件: ${manifest.name} (${extension.id})`);
                        }).catch((error) => {
                            log.error(`加载插件失败 ${extensionDir}:`, error);
                        });
                    } else {
                        log.warn(`插件 ${extensionDir} 的 manifest.json 格式不正确`);
                    }
                } catch (error) {
                    log.error(`解析插件 ${extensionDir} 的 manifest.json 失败:`, error);
                }
            } else {
                log.warn(`插件目录 ${extensionDir} 缺少 manifest.json 文件`);
            }
        }
    } catch (error) {
        log.error('扫描插件目录失败:', error);
    }
}

/**
 * 卸载所有插件
 */
export function unloadChromeExtensions() {
    try {
        const extensions = session.defaultSession.getAllExtensions();
        extensions.forEach(extension => {
            session.defaultSession.removeExtension(extension.id);
            log.info(`卸载插件: ${extension.name}`);
        });
    } catch (error) {
        log.error('卸载插件失败:', error);
    }
}

/**
 * 获取已加载的插件列表
 */
export function getLoadedExtensions() {
    try {
        return session.defaultSession.getAllExtensions();
    } catch (error) {
        log.error('获取插件列表失败:', error);
        return [];
    }
}

/**
 * 安装单个插件
 * @param {string} extensionPath 插件路径
 */
export async function installExtension(extensionPath) {
    try {
        const extension = await session.defaultSession.loadExtension(extensionPath, {
            allowFileAccess: true
        });
        log.info(`手动安装插件成功: ${extension.name}`);
        return { success: true, extension: { id: extension.id, name: extension.name } };
    } catch (error) {
        log.error('手动安装插件失败:', error);
        return { success: false, message: error.message };
    }
}

/**
 * 卸载单个插件
 * @param {string} extensionId 插件ID
 */
export function uninstallExtension(extensionId, extensionDir = '') {
    try {
        let removedFromSession = false;
        let removedFiles = false;
        let targetDirPath = '';

        targetDirPath = path.join(EXTENSIONS_DIR, path.basename(extensionDir.trim()));
        try {
            session.defaultSession.removeExtension(extensionId);
            removedFromSession = true;
            log.info(`卸载插件会话: ${extensionId}`);
        } catch (error) {
            log.warn(`卸载插件会话失败 ${extensionId}:`, error);
        }

        if (targetDirPath && fs.existsSync(targetDirPath)) {
            fs.rmSync(targetDirPath, { recursive: true, force: true });
            removedFiles = true;
            log.info(`删除插件目录: ${targetDirPath}`);
        }

        if (!removedFromSession && !removedFiles) {
            return { success: false, message: '未找到可卸载的插件会话或目录' };
        }

        return {
            success: true,
            removedFromSession,
            removedFiles,
            path: targetDirPath || ''
        };
    } catch (error) {
        log.error('卸载插件失败:', error);
        return { success: false, message: error.message };
    }
}

/**
 * 重新加载所有插件
 */
export function reloadExtensions() {
    try {
        unloadChromeExtensions();
        loadChromeExtensions();
        return { success: true, message: '插件重新加载成功' };
    } catch (error) {
        log.error('重新加载插件失败:', error);
        return { success: false, message: error.message };
    }
}

/**
 * 获取插件目录路径
 */
export function getExtensionsDirectory() {
    return EXTENSIONS_DIR;
}

/**
 * 检查插件目录是否存在
 */
export function ensureExtensionsDirectory() {
    if (!fs.existsSync(EXTENSIONS_DIR)) {
        fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });
        log.info('创建插件目录:', EXTENSIONS_DIR);
    }
    return EXTENSIONS_DIR;
}

/**
 * 验证插件清单文件
 * @param {string} manifestPath manifest.json 文件路径
 */
export function validateManifest(manifestPath) {
    try {
        if (!fs.existsSync(manifestPath)) {
            return { valid: false, error: 'manifest.json 文件不存在' };
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // 检查必需字段
        const requiredFields = ['manifest_version', 'name', 'version'];
        for (const field of requiredFields) {
            if (!manifest[field]) {
                return { valid: false, error: `缺少必需字段: ${field}` };
            }
        }

        // 检查 manifest 版本
        if (manifest.manifest_version !== 3) {
            return { valid: false, error: '仅支持 Manifest V3 格式' };
        }

        return { valid: true, manifest };
    } catch (error) {
        return { valid: false, error: `解析 manifest.json 失败: ${error.message}` };
    }
}

/**
 * 获取插件详细信息
 * @param {string} extensionDir 插件目录名
 */
export function getExtensionInfo(extensionDir) {
    const extensionPath = path.join(EXTENSIONS_DIR, extensionDir);
    const manifestPath = path.join(extensionPath, 'manifest.json');
    
    const validation = validateManifest(manifestPath);
    if (!validation.valid) {
        return { error: validation.error };
    }

    const manifest = validation.manifest;
    const stats = fs.statSync(extensionPath);
    
    return {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description || '',
        author: manifest.author || '',
        permissions: manifest.permissions || [],
        path: extensionPath,
        size: getDirectorySize(extensionPath),
        lastModified: stats.mtime,
        manifest: manifest
    };
}

/**
 * 获取目录大小
 * @param {string} dirPath 目录路径
 */
function getDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
                totalSize += getDirectorySize(filePath);
            } else {
                totalSize += stats.size;
            }
        }
    } catch (error) {
        log.error('计算目录大小失败:', error);
    }
    
    return totalSize;
}

/**
 * 从zip文件安装插件
 * @param {string} zipPath zip文件路径
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function installPluginFromZip(zipPath) {
    try {
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();

        // 确保插件目录存在
        ensureExtensionsDirectory();

        // 查找包含 manifest.json 的第一级目录
        let pluginEntry = null;
        let manifestEntry = null;
        for (const entry of zipEntries) {
            const parts = entry.entryName.split('/');
            if (parts.length === 2 && parts[1] === 'manifest.json') {
                manifestEntry = entry;
                pluginEntry = parts[0];
                break;
            }
        }

        if (!manifestEntry || !pluginEntry) {
            return { success: false, message: '无效的插件包格式：未找到 manifest.json' };
        }

        // 验证 manifest
        const manifestContent = zip.readAsText(manifestEntry);
        try {
            const manifest = JSON.parse(manifestContent);
            // 直接验证 manifest 对象而不是文件路径
            if (!manifest.manifest_version || !manifest.name || !manifest.version) {
                return { success: false, message: '清单文件缺少必需字段' };
            }
            if (manifest.manifest_version !== 3) {
                return { success: false, message: '仅支持 Manifest V3 格式' };
            }
        } catch (error) {
            return { success: false, message: `manifest.json 解析失败: ${error.message}` };
        }

        // 获取真实的插件目录名（去除可能的 -main 后缀）
        const pluginName = pluginEntry.replace(/-main$/, '');
        const targetDir = path.join(EXTENSIONS_DIR, pluginName);
        
        // 如果目标目录已存在，先删除
        if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
        }

        // 创建目标目录
        fs.mkdirSync(targetDir, { recursive: true });

        // 解压所有文件，保持目录结构
        for (const entry of zipEntries) {
            const entryName = entry.entryName;
            // 检查是否属于目标插件目录
            if (entryName.startsWith(pluginEntry + '/')) {
                // 计算相对路径
                const relativePath = entryName.substring(pluginEntry.length + 1);
                if (relativePath) {  // 跳过空路径
                    const targetPath = path.join(targetDir, relativePath);
                    if (entry.isDirectory) {
                        // 创建目录
                        fs.mkdirSync(targetPath, { recursive: true });
                    } else {
                        // 解压文件
                        const targetDirPath = path.dirname(targetPath);
                        fs.mkdirSync(targetDirPath, { recursive: true });
                        fs.writeFileSync(targetPath, entry.getData());
                    }
                }
            }
        }

        // 加载新插件
        const result = await installExtension(targetDir);
        if (!result.success) {
            // 如果加载失败，清理已解压的文件
            if (fs.existsSync(targetDir)) {
                fs.rmSync(targetDir, { recursive: true, force: true });
            }
            return { success: false, message: '插件加载失败：' + result.message };
        }

        return { 
            success: true, 
            message: `插件安装成功`,
            extension: result.extension
        };
    } catch (error) {
        log.error('安装插件失败:', error);
        return { success: false, message: '安装插件失败：' + error.message };
    }
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 扫描并获取所有插件信息
 */
export function scanExtensions() {
    ensureExtensionsDirectory();
    
    try {
        const extensionDirs = fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        const extensions = [];
        
        for (const extensionDir of extensionDirs) {
            const info = getExtensionInfo(extensionDir);
            if (!info.error) {
                extensions.push({
                    ...info,
                    directory: extensionDir,
                    installed: isExtensionInstalled(info.name)
                });
            } else {
                log.warn(`插件 ${extensionDir} 信息获取失败:`, info.error);
            }
        }
        
        return extensions;
    } catch (error) {
        log.error('扫描插件失败:', error);
        return [];
    }
}

/**
 * 检查插件是否已安装
 * @param {string} extensionName 插件名称
 */
function isExtensionInstalled(extensionName) {
    try {
        const loadedExtensions = getLoadedExtensions();
        return loadedExtensions.some(ext => ext.name === extensionName);
    } catch (error) {
        return false;
    }
}

// 默认导出所有功能
export default {
    loadChromeExtensions,
    unloadChromeExtensions,
    getLoadedExtensions,
    installExtension,
    uninstallExtension,
    reloadExtensions,
    getExtensionsDirectory,
    ensureExtensionsDirectory,
    validateManifest,
    getExtensionInfo,
    formatFileSize,
    scanExtensions,
    installPluginFromZip
};

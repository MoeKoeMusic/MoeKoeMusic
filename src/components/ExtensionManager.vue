<template>
    <div class="extensions-content" v-if="isElectron()">
        <div class="extensions-actions">
            <button @click="refreshExtensions" class="extension-btn primary" :disabled="extensionsLoading">
                <i class="fas fa-sync-alt"></i>
                {{ extensionsLoading ? t('jia-zai-zhong') : t('shua-xin-cha-jian') }}
            </button>
            <button @click="openExtensionsDir" class="extension-btn secondary">
                <i class="fas fa-folder-open"></i>
                {{ t('da-kai-cha-jian-mu-lu') }}
            </button>
            <button @click="installPlugin" class="extension-btn success" :disabled="extensionsLoading">
                <i class="fas fa-upload"></i>
                {{ t('an-zhuang-cha-jian') }}
            </button>
            <input
                type="file"
                ref="fileInput"
                style="display: none"
                accept=".zip"
                webkitdirectory="false"
                @change="handleFileSelect"
            />
        </div>

        <!-- 插件列表 -->
        <div v-if="!extensionsLoading && extensions.length > 0" class="extensions-list">
            <div v-for="extension in extensions" :key="extension.id" class="extension-item">
                <div class="extension-info">
                    <div class="extension-icon">
                        <img v-if="extension.iconData" :src="extension.iconData" :alt="extension.name" 
                             @error="handleIconError" class="extension-icon-img" />
                        <i v-else class="fas fa-puzzle-piece"></i>
                    </div>
                    <div class="extension-details">
                        <h4>{{ extension.name }}</h4>
                        <p class="extension-version">{{ t('ban-ben') }}: {{ extension.version }}</p>
                        <p class="extension-id">ID: {{ extension.id }}</p>
                        <p v-if="extension.description" class="extension-description">{{ extension.description }}</p>
                        <p v-if="!extension.moeKoeAdapted" class="extension-compatibility-warning">
                            <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                            <span>该插件未对萌音适配，可能存在兼容性问题</span>
                        </p>
                    </div>
                </div>
                <div class="extension-actions">
                    <span class="extension-status enabled">{{ t('yi-qi-yong') }}</span>
                    <button @click="openExtensionPopup(extension.id, extension.name)" class="extension-btn secondary small"
                        :disabled="extensionsLoading">
                        {{ t('da-kai-tan-chuang') }}
                    </button>
                    <button @click="uninstallExtension(extension.id, extension.name)" class="extension-btn danger small"
                        :disabled="extensionsLoading">
                        {{ t('xie-zai') }}
                    </button>
                </div>
            </div>
        </div>

        <div v-else-if="!extensionsLoading && extensions.length === 0" class="extensions-empty">
            <div class="empty-icon">
                <i class="fas fa-puzzle-piece"></i>
            </div>
            <h4>{{ t('zan-wu-cha-jian') }}</h4>
            <p>{{ t('jiang-cha-jian-wen-jian-jia-fang-ru-cha-jian-mu-lu') }}</p>
        </div>

        <!-- Loading state -->
        <div v-if="extensionsLoading" class="extensions-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>{{ t('zheng-zai-jia-zai-cha-jian') }}</p>
        </div>
    </div>
    <div v-else class="extensions-empty">
        <div class="empty-icon">
            <i class="fas fa-puzzle-piece"></i>
        </div>
        <h4>{{ t('web-cha-jian-ti-shi') }}</h4>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const extensions = ref([])
const extensionsLoading = ref(false)
const fileInput = ref(null)

// 刷新插件 Refresh plugins
const refreshExtensions = async () => {
    extensionsLoading.value = true
    try {
        const result = await window.electronAPI?.getExtensions()
        if (result?.success) {
            extensions.value = result.extensions || []
        } else {
            console.error('Failed to get plugins:', result?.error)
        }
    } catch (error) {
        console.error('Error refreshing plugins:', error)
    } finally {
        extensionsLoading.value = false
    }
}

// 打开插件目录 Open plugins directory
const openExtensionsDir = async () => {
    try {
        const result = await window.electronAPI?.openExtensionsDir()
        if (result?.success) {
        } else {
            console.error('Failed to open plugins directory:', result?.error)
        }
    } catch (error) {
        console.error('Error opening plugins directory:', error)
    }
}

// 打开插件弹窗 Open plugin popup
const openExtensionPopup = async (extensionId, extensionName) => {
    try {
        const result = await window.electronAPI.openExtensionPopup(extensionId, extensionName)
        if (result?.success) {
        } else {
            alert(t('da-kai-tan-chuang-shi-bai') + ': ' + (result?.message || t('wei-zhi-cuo-wu')))
        }
    } catch (error) {
        alert(t('da-kai-tan-chuang-shi-bai') + ': ' + error.message)
    }
}

// 卸载插件 Uninstall plugin
const uninstallExtension = async (extensionId, extensionName) => {
    try {
        if (confirm(t('que-ren-xie-zai-cha-jian').replace('{name}', extensionName))) {
            const result = await window.electronAPI?.uninstallExtension(extensionId)
            if (result?.success) {
                await refreshExtensions()
            } else {
                alert(t('xie-zai-cha-jian-shi-bai') + ': ' + (result?.error || t('wei-zhi-cuo-wu')))
            }
        }
    } catch (error) {
        alert(t('xie-zai-cha-jian-shi-bai') + ': ' + error.message)
    }
}

// 处理图标加载错误 Handle icon loading error
const handleIconError = (event) => {
    event.target.style.display = 'none'
    const iconContainer = event.target.parentElement
    if (iconContainer) {
        const fallbackIcon = iconContainer.querySelector('i')
        if (!fallbackIcon) {
            const icon = document.createElement('i')
            icon.className = 'fas fa-puzzle-piece'
            iconContainer.appendChild(icon)
        }
    }
}

// 触发文件选择 Trigger file selection for plugin installation
const installPlugin = async () => {
    try {
        const result = await window.electronAPI?.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: t('cha-jian-bao'), extensions: ['zip'] }
            ]
        });

        if (result?.filePath) {
            await handlePluginInstall(result.filePath);
        }
    } catch (error) {
        alert(t('xuan-ze-wen-jian-shi-bai') + ': ' + error.message);
    }
};

// 处理插件安装 Handle plugin installation
const handlePluginInstall = async (filePath) => {
    try {
        extensionsLoading.value = true;
        const result = await window.electronAPI?.installPluginFromZip(filePath);
        if (result?.success) {
            alert(t('cha-jian-an-zhuang-cheng-gong'));
            await refreshExtensions();
        } else {
            alert(t('an-zhuang-cha-jian-shi-bai') + ': ' + (result?.message || t('wei-zhi-cuo-wu')));
        }
    } catch (error) {
        alert(t('an-zhuang-cha-jian-chu-cuo') + ': ' + error.message);
    } finally {
        extensionsLoading.value = false;
    }
};

const isElectron = () => {
    return typeof window !== 'undefined' && typeof window.electron !== 'undefined';
};

onMounted(() => {
    if(isElectron()){
        refreshExtensions()
    }
})
</script>

<style scoped>
.extensions-content {
    padding: 20px;
}

.extensions-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
}

.extension-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
}

.extension-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.extension-btn.primary {
    background: #007bff;
    color: white;
}

.extension-btn.primary:hover:not(:disabled) {
    background: #0056b3;
}

.extension-btn.success {
    background: #28a745;
    color: white;
}

.extension-btn.success:hover:not(:disabled) {
    background: #218838;
}

.extension-btn.secondary {
    background: #6c757d;
    color: white;
}

.extension-btn.secondary:hover:not(:disabled) {
    background: #545b62;
}

.extension-btn.danger {
    background: #dc3545;
    color: white;
}

.extension-btn.danger:hover:not(:disabled) {
    background: #c82333;
}

.extension-btn.small {
    padding: 4px 8px;
    font-size: 12px;
}

.extensions-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 32px;
}

.extension-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #f8f9fa;
}

.extension-info {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
}

.extension-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    border-radius: 8px;
    font-size: 20px;
    overflow: hidden;
}

.extension-icon-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
}

.extension-details h4 {
    margin: 0 0 4px 0;
    font-size: 16px;
    color: #333;
}

.extension-details p {
    margin: 2px 0;
    font-size: 12px;
    color: #666;
}

.extension-description {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.extension-compatibility-warning {
    margin-top: 6px!important;
    color: #b45309!important;
    font-size: 12px!important;
    display: flex!important;
    align-items: center!important;
    gap: 6px!important;
}

.extension-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.extension-status {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
}

.extension-status.enabled {
    background: #d4edda;
    color: #155724;
}

.extensions-empty {
    text-align: center;
    padding: 40px 20px;
    color: #666;
}

.empty-icon {
    font-size: 48px;
    color: #ccc;
    margin-bottom: 16px;
}

.extensions-empty h4 {
    margin: 0 0 8px 0;
    color: #333;
}

.extensions-empty p {
    margin: 0 0 20px 0;
}

.extensions-loading {
    text-align: center;
    padding: 40px 20px;
    color: #666;
}

.extensions-loading i {
    font-size: 24px;
    margin-bottom: 12px;
}

</style>
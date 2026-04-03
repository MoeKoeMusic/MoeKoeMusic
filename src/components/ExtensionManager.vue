<template>
    <template v-if="isElectron()">
        <div class="extensions-toolbar">
            <div class="extensions-tabs">
                <button class="tab-btn" :class="{ active: currentView === 'installed' }" @click="currentView = 'installed'">
                    已安装插件
                </button>
                <button class="tab-btn" :class="{ active: currentView === 'market' }" @click="currentView = 'market'">
                    插件市场
                </button>
            </div>

            <div v-if="currentView === 'installed'" class="extensions-actions">
                <button @click="refreshExtensions(true)" class="extension-btn primary" :disabled="extensionsLoading">
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
            </div>

            <div v-else class="market-actions">
                <div class="market-search">
                    <i class="fas fa-search"></i>
                    <input v-model.trim="marketSearch" type="text" placeholder="搜索插件名称、作者或描述" />
                </div>
                <button @click="fetchMarketPlugins(true)" class="extension-btn primary" :disabled="marketLoading">
                    <i class="fas fa-rotate-right"></i>
                    {{ marketLoading ? '加载中' : '刷新市场' }}
                </button>
                <button @click="openPluginsRepo" class="extension-btn secondary">
                    <i class="fas fa-arrow-up-right-from-square"></i>
                    上架&举报
                </button>
            </div>
        </div>

        <div v-if="currentView === 'installed'">
            <div v-if="!extensionsLoading && extensions.length > 0" class="extensions-list">
                <div v-for="extension in extensions" :key="extension.id" class="market-item installed-item">
                    <div class="market-item-header">
                        <div class="market-title-group">
                            <div class="extension-icon">
                            <img
                                v-if="extension.iconData"
                                :src="extension.iconData"
                                :alt="extension.name"
                                @error="handleIconError"
                                class="extension-icon-img"
                            />
                            <i v-else class="fas fa-puzzle-piece"></i>
                            </div>
                            <div class="market-title-text">
                                <h4>{{ extension.name }}</h4>
                                <p>{{ extension.description || '暂无描述' }}</p>
                            </div>
                        </div>
                        <div class="market-status-group">
                            <span class="market-badge installed">已安装</span>
                            <button @click="openExtensionPopup(extension.id, extension.name)" class="extension-btn secondary" :disabled="extensionsLoading">
                                <i class="fas fa-up-right-from-square"></i>
                                {{ t('da-kai-tan-chuang') }}
                            </button>
                            <button @click="uninstallExtension(extension.id, extension.name, extension.directory)" class="extension-btn danger" :disabled="extensionsLoading">
                                <i class="fas fa-trash"></i>
                                {{ t('xie-zai') }}
                            </button>
                        </div>
                    </div>

                    <div class="market-meta">
                        <span>{{ t('ban-ben') }} {{ extension.version || '未知' }}</span>
                        <span class="author-meta">
                            作者
                            <a :href="extension.authorUrl || 'javascript:void(0)'" :target="extension.authorUrl ? '_blank' : '_self'" rel="noopener noreferrer">
                                {{ extension.author || '未知' }}
                            </a>
                        </span>
                        <span>ID {{ extension.pluginId || extension.id }}</span>
                    </div>

                    <p v-if="!extension.moeKoeAdapted" class="extension-compatibility-warning installed-warning">
                        <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                        <span>该插件未对萌音适配，可能存在兼容性问题</span>
                    </p>
                    <p v-if="isCurrentAppVersionLowerThanMin(extension.minversion)" class="extension-compatibility-warning installed-warning">
                        <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                        <span>当前萌音版本较低，插件最低支持 V{{ extension.minversion }}</span>
                    </p>
                </div>
            </div>

            <div v-else-if="!extensionsLoading && extensions.length === 0" class="extensions-empty">
                <div class="empty-icon">
                    <i class="fas fa-puzzle-piece"></i>
                </div>
                <h4>{{ t('zan-wu-cha-jian') }}</h4>
                <p>{{ t('jiang-cha-jian-wen-jian-jia-fang-ru-cha-jian-mu-lu') }}</p>
            </div>

            <div v-if="extensionsLoading" class="extensions-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>{{ t('zheng-zai-jia-zai-cha-jian') }}</p>
            </div>
        </div>

        <div v-else class="market-panel">
            <div v-if="marketLoading" class="extensions-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>正在加载插件市场...</p>
            </div>

            <div v-else-if="marketError" class="market-feedback error">
                <div class="empty-icon">
                    <i class="fas fa-circle-exclamation"></i>
                </div>
                <h4>插件市场加载失败</h4>
                <p>{{ marketError }}</p>
            </div>

            <div v-else-if="pagedMarketPlugins.length > 0" class="market-list">
                <div v-for="plugin in pagedMarketPlugins" :key="plugin.uniqueKey" class="market-item">
                    <div class="market-item-header">
                        <div class="market-title-group">
                            <div class="extension-icon market-icon">
                                <img
                                    v-if="plugin.icon"
                                    :src="plugin.icon"
                                    :alt="plugin.name"
                                    @error="handleMarketIconError"
                                    class="extension-icon-img"
                                />
                                <i v-else class="fas fa-store"></i>
                            </div>
                            <div class="market-title-text">
                                <h4>
                                    {{ plugin.name }}
                                    <span v-if="isCurrentAppVersionLowerThanMin(plugin.minversion)" class="market-min-version-inline">
                                        需V{{ plugin.minversion }}+
                                    </span>
                                </h4>
                                <p>{{ plugin.description || '暂无描述' }}</p>
                            </div>
                        </div>
                        <div class="market-status-group">
                            <span class="market-badge" :class="resolveMarketState(plugin).badgeClass">
                                {{ resolveMarketState(plugin).badgeText }}
                            </span>
                            <button
                                class="extension-btn"
                                :class="resolveMarketState(plugin).buttonClass"
                                :disabled="marketActionLoading === plugin.uniqueKey || !plugin.downloadUrl"
                                @click="handleMarketInstall(plugin)"
                            >
                                <i v-if="marketActionLoading === plugin.uniqueKey" class="fas fa-spinner fa-spin"></i>
                                <i v-else :class="resolveMarketState(plugin).buttonIcon"></i>
                                {{ marketActionLoading === plugin.uniqueKey ? '处理中' : resolveMarketState(plugin).buttonText }}
                            </button>
                        </div>
                    </div>

                    <div class="market-meta">
                        <span>版本 {{ plugin.version || '未知' }}</span>
                        <span class="author-meta">作者 <span>{{ plugin.author || '未知' }}</span></span>
                        <span v-if="plugin.repositoryUrl">
                            <a :href="plugin.repositoryUrl" target="_blank" rel="noopener noreferrer">项目地址</a>
                        </span>
                    </div>

                    <div v-if="plugin.tags.length > 0" class="market-tags">
                        <span v-for="tag in plugin.tags" :key="tag" class="market-tag">{{ tag }}</span>
                    </div>
                </div>

                <div v-if="marketTotalPages > 1" class="market-pagination">
                    <button class="extension-btn secondary small" :disabled="marketPage === 1" @click="marketPage -= 1">
                        上一页
                    </button>
                    <span>第 {{ marketPage }} / {{ marketTotalPages }} 页</span>
                    <button class="extension-btn secondary small" :disabled="marketPage === marketTotalPages" @click="marketPage += 1">
                        下一页
                    </button>
                </div>
            </div>

            <div v-else class="market-feedback">
                <div class="empty-icon">
                    <i class="fas fa-store-slash"></i>
                </div>
                <h4>{{ marketPlugins.length === 0 ? '暂无可用插件' : '没有匹配的插件' }}</h4>
                <p>{{ marketPlugins.length === 0 ? '插件市场当前没有可展示的插件。' : '换个关键词试试。' }}</p>
            </div>
        </div>
    </template>
    <div v-else class="extensions-empty">
        <div class="empty-icon">
            <i class="fas fa-puzzle-piece"></i>
        </div>
        <h4>{{ t('web-cha-jian-ti-shi') }}</h4>
    </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const MARKET_URL = 'https://raw.githubusercontent.com/MoeKoeMusic/MoeKoeMusic-Plugins/refs/heads/main/plugins.json'
const MARKET_PAGE_SIZE = 5

const extensions = ref([])
const extensionsLoading = ref(false)
const currentView = ref('installed')
const marketPlugins = ref([])
const marketLoading = ref(false)
const marketLoaded = ref(false)
const marketError = ref('')
const marketSearch = ref('')
const marketPage = ref(1)
const marketActionLoading = ref('')
const currentAppVersion = ref('')

const normalizedInstalledExtensions = computed(() => extensions.value)

const filteredMarketPlugins = computed(() => {
    const keyword = marketSearch.value.trim().toLowerCase()
    if (!keyword) {
        return marketPlugins.value
    }

    return marketPlugins.value.filter(plugin => {
        const text = [
            plugin.name,
            plugin.description,
            plugin.author,
            plugin.id,
            plugin.directory,
            ...(plugin.tags || [])
        ].filter(Boolean).join(' ').toLowerCase()

        return text.includes(keyword)
    })
})

const marketTotalPages = computed(() => {
    return Math.max(1, Math.ceil(filteredMarketPlugins.value.length / MARKET_PAGE_SIZE))
})

const pagedMarketPlugins = computed(() => {
    const start = (marketPage.value - 1) * MARKET_PAGE_SIZE
    return filteredMarketPlugins.value.slice(start, start + MARKET_PAGE_SIZE)
})

watch(marketSearch, () => {
    marketPage.value = 1
})

watch(filteredMarketPlugins, () => {
    if (marketPage.value > marketTotalPages.value) {
        marketPage.value = marketTotalPages.value
    }
})

watch(currentView, async view => {
    if (view === 'market' && !marketLoaded.value && !marketLoading.value) {
        await fetchMarketPlugins()
    }
})

const refreshExtensions = async (reload = false) => {
    extensionsLoading.value = true
    try {
        if (reload) {
            const reloadResult = await window.electronAPI?.reloadExtensions()
            if (!reloadResult?.success) {
                console.error('Failed to reload plugins:', reloadResult?.message)
            }
        }

        await new Promise(resolve => setTimeout(resolve, 300))
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

const fetchMarketPlugins = async (force = false) => {
    if (!force && marketLoaded.value) {
        return
    }

    marketLoading.value = true
    marketError.value = ''

    try {
        const response = await fetch(MARKET_URL, {
            method: 'GET',
            cache: 'no-store'
        })

        if (!response.ok) {
            throw new Error(`请求失败: ${response.status} ${response.statusText || ''}`.trim())
        }

        const payload = await response.json()
        const normalized = normalizeMarketPayload(payload)

        marketPlugins.value = normalized.filter(plugin => plugin.status === 'active')
        marketLoaded.value = true
        marketPage.value = 1
    } catch (error) {
        marketPlugins.value = []
        marketLoaded.value = false
        marketError.value = error?.message || '无法读取插件市场数据'
        console.error('Failed to fetch plugin market:', error)
    } finally {
        marketLoading.value = false
    }
}

const normalizeMarketPayload = payload => {
    const list = Array.isArray(payload)
        ? payload
        : payload?.plugins || payload?.items || payload?.data || []

    if (!Array.isArray(list)) {
        throw new Error('插件市场数据格式不正确')
    }

    return list.map((item, index) => normalizeMarketPlugin(item, index)).filter(Boolean)
}

const normalizeMarketPlugin = (item, index) => {
    if (!item || typeof item !== 'object') {
        return null
    }

    const snapshot = item.snapshot && typeof item.snapshot === 'object' ? item.snapshot : {}
    const repositoryValue = item.repositoryUrl || ''
    const downloadUrl = normalizeUrl(item.downloadUrl)

    const plugin = {
        uniqueKey: item.id,
        id: String(item.id).trim(),
        name: String(item.name).trim(),
        directory: String(item.id).trim(),
        version: String(item.version).trim(),
        description: String(item.description).trim(),
        author: String(item.author).trim(),
        status: String(item.status || '').trim().toLowerCase(),
        icon: normalizeUrl(item.iconUrl),
        tags: Array.isArray(item.tags) ? item.tags.map(tag => String(tag).trim()).filter(Boolean) : [],
        repositoryUrl: normalizeUrl(repositoryValue),
        downloadUrl,
        branch: String(snapshot.branch).trim(),
        commitSha: String(snapshot.commitSha).trim(),
        minversion: item.minversion
    }

    if (!plugin.name) {
        return null
    }

    return plugin
}

const normalizeUrl = value => {
    if (typeof value !== 'string') {
        return ''
    }

    const trimmed = value.trim()
    if (!trimmed) {
        return ''
    }

    if (trimmed.includes('github.com') && trimmed.includes('/blob/')) {
        return trimmed.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/blob/', '/')
    }

    return trimmed
}

const resolvePluginDownloadUrl = plugin => {
    const normalized = normalizeUrl(plugin?.downloadUrl)
    if (!normalized) {
        return ''
    }

    if (/\.zip($|\?)/i.test(normalized)) {
        return normalized
    }

    try {
        const url = new URL(normalized)
        if (url.hostname !== 'github.com') {
            return normalized
        }

        const segments = url.pathname.split('/').filter(Boolean)
        if (segments.length < 2) {
            return normalized
        }

        const [owner, repo, type, ...rest] = segments
        const ref = rest.join('/')
        const fallbackBranch = plugin?.branch || 'main'
        const archiveRef = value => {
            const resolvedRef = String(value || '').trim()
            if (!resolvedRef) {
                return ''
            }

            if (/^[0-9a-f]{7,40}$/i.test(resolvedRef)) {
                return `https://github.com/${owner}/${repo}/archive/${resolvedRef}.zip`
            }

            return `https://github.com/${owner}/${repo}/archive/refs/heads/${encodeURIComponent(resolvedRef)}.zip`
        }

        if (!type) {
            return archiveRef(plugin?.commitSha || fallbackBranch) || normalized
        }

        if (type === 'tree') {
            return archiveRef(ref) || normalized
        }

        if (type === 'blob') {
            const rawUrl = normalized.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/blob/', '/')
            return /\.zip($|\?)/i.test(rawUrl) ? rawUrl : normalized
        }
    } catch (error) {
        console.error('Failed to resolve plugin download url:', error)
    }

    return normalized
}

const findInstalledExtension = plugin => {
    const pluginId = String(plugin?.id || '').trim().toLowerCase()
    if (!pluginId) {
        return null
    }

    return normalizedInstalledExtensions.value.find(extension => {
        return String(extension?.pluginId || '').trim().toLowerCase() === pluginId
    }) || null
}

const compareVersions = (currentVersion, latestVersion) => {
    const currentTokens = tokenizeVersion(currentVersion)
    const latestTokens = tokenizeVersion(latestVersion)
    const length = Math.max(currentTokens.length, latestTokens.length)

    for (let index = 0; index < length; index += 1) {
        const currentToken = currentTokens[index] ?? 0
        const latestToken = latestTokens[index] ?? 0

        if (typeof currentToken === 'number' && typeof latestToken === 'number') {
            if (currentToken !== latestToken) {
                return currentToken > latestToken ? 1 : -1
            }
            continue
        }

        const currentText = String(currentToken)
        const latestText = String(latestToken)
        const result = currentText.localeCompare(latestText)
        if (result !== 0) {
            return result > 0 ? 1 : -1
        }
    }

    return 0
}

const tokenizeVersion = version => {
    return version
        .split(/[\.\-_]/)
        .filter(Boolean)
        .map(part => (/^\d+$/.test(part) ? Number(part) : part.toLowerCase()))
}

const isCurrentAppVersionLowerThanMin = minVersion => {
    const required = minVersion
    const current = currentAppVersion.value

    if (!required || !current) {
        return false
    }

    return compareVersions(current, required) < 0
}

const resolveMarketState = plugin => {
    const installedExtension = findInstalledExtension(plugin)

    if (!plugin.downloadUrl) {
        return {
            badgeClass: 'unknown',
            badgeText: '缺少下载地址',
            buttonClass: 'secondary',
            buttonIcon: 'fas fa-ban',
            buttonText: '无法安装'
        }
    }

    if (!installedExtension) {
        return {
            badgeClass: 'available',
            badgeText: '未安装',
            buttonClass: 'success',
            buttonIcon: 'fas fa-download',
            buttonText: '安装'
        }
    }

    const versionDiff = compareVersions(installedExtension.version, plugin.version)
    if (versionDiff < 0) {
        return {
            badgeClass: 'update',
            badgeText: `可更新 ${installedExtension.version} -> ${plugin.version}`,
            buttonClass: 'primary',
            buttonIcon: 'fas fa-arrow-up',
            buttonText: '更新'
        }
    }

    return {
        badgeClass: 'installed',
        badgeText: `已安装 ${installedExtension.version}`,
        buttonClass: 'secondary',
        buttonIcon: 'fas fa-check',
        buttonText: '重新安装'
    }
}

const handleMarketInstall = async plugin => {
    const installedExtension = findInstalledExtension(plugin)
    const state = resolveMarketState(plugin)

    const resolvedDownloadUrl = resolvePluginDownloadUrl(plugin)

    if (!resolvedDownloadUrl) {
        showAlert('该插件缺少下载地址，无法安装。')
        return
    }

    if (installedExtension && state.buttonText === '重新安装') {
        const confirmed = await showConfirm(`插件 ${plugin.name} 已是最新版本，仍然重新安装吗？`)
        if (!confirmed) {
            return
        }
    }

    marketActionLoading.value = plugin.uniqueKey

    try {
        const result = await window.electronAPI?.installPluginFromUrl(
            resolvedDownloadUrl,
            installedExtension?.id || '',
            installedExtension?.directory || ''
        )

        if (!result?.success) {
            throw new Error(result?.message || '安装失败')
        }

        await refreshExtensions(true)
        showAlert(installedExtension ? `插件 ${plugin.name} 更新成功` : `插件 ${plugin.name} 安装成功`)
    } catch (error) {
        console.error('Failed to install plugin from market:', error)
        showAlert(`插件 ${plugin.name} ${installedExtension ? '更新' : '安装'}失败: ${error?.message || '未知错误'}`)
    } finally {
        marketActionLoading.value = ''
    }
}

const openExtensionsDir = async () => {
    try {
        const result = await window.electronAPI?.openExtensionsDir()
        if (!result?.success) {
            console.error('Failed to open plugins directory:', result?.error)
        }
    } catch (error) {
        console.error('Error opening plugins directory:', error)
    }
}

const openPluginsRepo = () => {
    window.open('https://github.com/MoeKoeMusic/MoeKoeMusic-Plugins', '_blank', 'noopener,noreferrer')
}

const openExtensionPopup = async (extensionId, extensionName) => {
    try {
        const result = await window.electronAPI?.openExtensionPopup(extensionId, extensionName)
        if (!result?.success) {
            showAlert(`${t('da-kai-tan-chuang-shi-bai')}: ${result?.message || t('wei-zhi-cuo-wu')}`)
        }
    } catch (error) {
        showAlert(`${t('da-kai-tan-chuang-shi-bai')}: ${error.message}`)
    }
}

const uninstallExtension = async (extensionId, extensionName, extensionDir) => {
    try {
        const confirmed = await showConfirm(t('que-ren-xie-zai-cha-jian').replace('name', extensionName))
        if (!confirmed) {
            return
        }

        const result = await window.electronAPI?.uninstallExtension(extensionId, extensionDir)
        if (result?.success) {
            await refreshExtensions()
        } else {
            showAlert(`${t('xie-zai-cha-jian-shi-bai')}: ${result?.error || t('wei-zhi-cuo-wu')}`)
        }
    } catch (error) {
        showAlert(`${t('xie-zai-cha-jian-shi-bai')}: ${error.message}`)
    }
}

const handleIconError = event => {
    event.target.style.display = 'none'
    const iconContainer = event.target.parentElement
    if (iconContainer && !iconContainer.querySelector('i')) {
        const icon = document.createElement('i')
        icon.className = 'fas fa-puzzle-piece'
        iconContainer.appendChild(icon)
    }
}

const handleMarketIconError = event => {
    event.target.style.display = 'none'
    const iconContainer = event.target.parentElement
    if (iconContainer && !iconContainer.querySelector('i')) {
        const icon = document.createElement('i')
        icon.className = 'fas fa-store'
        iconContainer.appendChild(icon)
    }
}

const installPlugin = async () => {
    try {
        const result = await window.electronAPI?.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: t('cha-jian-bao'), extensions: ['zip'] }
            ]
        })

        if (result?.filePath) {
            await handlePluginInstall(result.filePath)
        }
    } catch (error) {
        showAlert(`${t('xuan-ze-wen-jian-shi-bai')}: ${error.message}`)
    }
}

const handlePluginInstall = async filePath => {
    try {
        extensionsLoading.value = true
        const result = await window.electronAPI?.installPluginFromZip(filePath)
        if (result?.success) {
            showAlert(t('cha-jian-an-zhuang-cheng-gong'))
            await refreshExtensions()
        } else {
            showAlert(`${t('an-zhuang-cha-jian-shi-bai')}: ${result?.message || t('wei-zhi-cuo-wu')}`)
        }
    } catch (error) {
        showAlert(`${t('an-zhuang-cha-jian-chu-cuo')}: ${error.message}`)
    } finally {
        extensionsLoading.value = false
    }
}

const showAlert = message => {
    return window.$modal.alert(message)
}

const showConfirm = async message => {
    return window.$modal.confirm(message)
}

const isElectron = () => {
    return typeof window !== 'undefined' && typeof window.electron !== 'undefined'
}

onMounted(async () => {
    if (isElectron()) {
        currentAppVersion.value = localStorage.getItem('version')
        await refreshExtensions()
    }
})
</script>

<style lang="scss" scoped>
$primary: #2563eb;
$primary-hover: #1d4ed8;
$success: #16a34a;
$success-hover: #15803d;
$secondary: #6b7280;
$secondary-hover: #4b5563;
$danger: #dc2626;
$danger-hover: #b91c1c;
$text-muted: #666;
$border-light: #e5e7eb;
$border-dark: #232527;
$gradient-pink-blue: linear-gradient(135deg, #fb7185, #2563eb);
$gradient-orange: linear-gradient(135deg, #f59e0b, #f97316);

.extensions-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 5px;
    margin-bottom: 24px;
    flex-wrap: wrap;
}

.extensions-tabs {
    display: flex;
    gap: 8px;
    padding: 6px;
    border-radius: 10px;
    background: rgba(127, 127, 127, 0.12);

    .tab-btn {
        border: none;
        background: transparent;
        color: var(--text-color, #333);
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s ease;

        &.active {
            background: var(--color-primary, #ff69b4);
            color: #fff;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
        }
    }
}

.extensions-actions,
.market-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
}

.market-search {
    display: flex;
    align-items: center;
    padding: 0 14px;
    height: 40px;
    border-radius: 10px;
    border: 1px solid var(--border-color, #d9d9d9);
    background: var(--background-color, #fff);

    i {
        color: #888;
    }

    input {
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        color: var(--text-color, #333);
        font-size: 14px;
    }

    &:is(.dark .market-search) {
        background-color: #222;
        border-color: $border-dark;

        i,
        input {
            color: #f3f4f6;
        }
    }
}

.extension-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s ease;

    &:disabled {
        opacity: 0.65;
        cursor: not-allowed;
    }

    &.primary {
        background: $primary;
        color: white;

        &:hover:not(:disabled) {
            background: $primary-hover;
        }
    }

    &.success {
        background: $success;
        color: white;

        &:hover:not(:disabled) {
            background: $success-hover;
        }
    }

    &.secondary {
        background: $secondary;
        color: white;

        &:hover:not(:disabled) {
            background: $secondary-hover;
        }
    }

    &.danger {
        background: $danger;
        color: white;

        &:hover:not(:disabled) {
            background: $danger-hover;
        }
    }

    &.small {
        padding: 6px 10px;
        font-size: 12px;
    }
}

.extensions-list,
.market-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.extension-item,
.market-item {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 18px;
    border: 1px solid var(--border-color, $border-light);
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(247, 247, 247, 0.98));
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);

    &:is(.dark .extension-item, .dark .market-item) {
        border-color: $border-dark;
        background: linear-gradient(135deg, rgba(23, 23, 23, 0.92), rgba(32, 32, 32, 0.98));
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
    }
}

.extension-info,
.market-title-group {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
    min-width: 0;
}

.extension-icon {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    border-radius: 12px;
    font-size: 22px;
    background: $gradient-pink-blue;
    overflow: hidden;
    flex-shrink: 0;

    &.market-icon {
        background: $gradient-orange;
    }

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
}

.extension-details,
.market-title-text {
    min-width: 0;

    h4 {
        margin: 0 0 6px 0;
        font-size: 16px;
        color: var(--text-color, #222);

    }

    p {
        margin: 0;
        font-size: 13px;
        color: $text-muted;
    }

    &:is(.dark .extension-details, .dark .market-title-text) {
        h4 {
            color: rgba(255, 255, 255, 0.8);
        }
    }
}

.market-min-version-inline {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    margin-left: 8px;
    border-radius: 999px;
    border: 1px solid rgba(180, 83, 9, 0.28);
    background: rgba(180, 83, 9, 0.12);
    color: #b45309;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    position: relative;
    top: -3px;
}

.extension-description {
    max-width: 480px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.extension-version {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;

    a {
        color: $primary;
        text-decoration: none;
    }
}

.extension-compatibility-warning {
    color: #b45309 !important;
    font-size: 12px !important;
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
}

.installed-warning {
    margin: 0;
}

.extension-actions,
.market-status-group {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.extension-status,
.market-badge {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;

    &.enabled,
    &.installed {
        background: #dcfce7;
        color: #166534;
    }

    &.available {
        background: #e0f2fe;
        color: #075985;
    }

    &.update {
        background: #fef3c7;
        color: #92400e;
    }

    &.unknown {
        background: #f3f4f6;
        color: #4b5563;
    }

    &:is(.dark .extension-status, .dark .market-badge) {

        &.enabled,
        &.installed {
            background: #166534;
            color: #dcfce7;
        }

        &.available {
            background: #075985;
            color: #e0f2fe;
        }

        &.update {
            background: #92400e;
            color: #fef3c7;
        }

        &.unknown {
            background: #4b5563;
            color: #f3f4f6;
        }
    }
}

.market-panel {
    min-height: 240px;
}

.market-item {
    flex-direction: column;

    &-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
    }
}

.market-meta {
    margin: 0;
    font-size: 13px;
    color: $text-muted;
    display: flex;
    gap: 16px;
    flex-wrap: wrap;

    span {
        min-width: 0;
    }

    .author-meta {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        max-width: 220px;
        white-space: nowrap;

        a {
            color: $primary;
            text-decoration: none;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }

    a {
        color: $primary;
        text-decoration: none;
    }
}

.market-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.market-tag {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    background: rgba(37, 99, 235, 0.1);
    color: #1d4ed8;
}

.market-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 8px;
}

.extensions-empty,
.extensions-loading,
.market-feedback {
    text-align: center;
    padding: 48px 20px;
    color: $text-muted;

    h4 {
        margin: 0 0 8px 0;
        color: var(--text-color, #333);
    }

    p {
        margin: 0 0 20px 0;
    }
}

.market-feedback.error {
    border: 1px solid rgba(220, 38, 38, 0.15);
    border-radius: 14px;
    background: rgba(254, 242, 242, 0.85);
}

.empty-icon {
    font-size: 48px;
    color: #c4c4c4;
    margin-bottom: 16px;
}

.extensions-loading i {
    font-size: 24px;
    margin-bottom: 12px;
}

@media (max-width: 768px) {

    .extensions-toolbar,
    .market-item-header {
        flex-direction: column;
        align-items: stretch;
    }

    .extensions-tabs,
    .market-actions,
    .extensions-actions,
    .market-search {
        width: 100%;
    }

    .market-search {
        min-width: 0;
    }

    .extension-actions,
    .market-status-group {
        justify-content: flex-start;
    }
}
</style>
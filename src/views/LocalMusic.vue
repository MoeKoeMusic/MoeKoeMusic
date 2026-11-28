<template>
    <div class="detail-page">
        <div class="header detail-sliver-header" :style="headerStyle">
            <CommonSkeleton v-if="loading" variant="detail-header" />
            <template v-else>
                <img class="cover-art" :style="coverStyle" :src="`./assets/images/local.png`" />
            <div class="info" :style="infoStyle">
                <h1 class="title" :style="titleStyle">本地音乐</h1>
                <div class="expanded-info" :style="detailsStyle">
                    <p class="subtitle">本地歌曲数: {{ musicFiles.length }}<span v-if="lyricsMatchedCount"> ·
                            已匹配歌词: {{ lyricsMatchedCount }}</span></p>
                    <div class="folder-info" v-if="hasSource">
                        <div class="folder-path">
                            <i class="fas" :class="sourceIconClass"></i>
                            <span>{{ sourceName }}</span>
                            <span class="source-path" v-if="sourcePath">{{ sourcePath }}</span>
                        </div>
                    </div>
                    <div class="actions">
                        <button class="primary-btn" @click="addPlaylistToQueue($event)" v-if="musicFiles.length > 0">
                            <i class="fas fa-play"></i> 播放全部
                        </button>
                        <button class="upload-btn" @click="selectFolder" :disabled="loading">
                            <i class="fas fa-folder-open"></i> {{ hasSource ? '重新选择文件夹' : '选择音乐文件夹' }}
                        </button>
                        <button class="upload-btn" :disabled="diskScanning" @click="scanWholeDisk"
                            title="遍历所有磁盘查找音乐文件，扫描中可随时取消">
                            <i class="fas" :class="diskScanning ? 'fa-spinner fa-spin' : 'fa-hard-drive'"></i>
                            {{ diskScanning ? '扫描中…' : '扫描整块硬盘' }}
                        </button>
                        <button class="upload-btn ghost" :disabled="lyricMatching || musicFiles.length === 0"
                            @click="runLyricsMatching()"
                            :title="lyricsMatchedCount > 0 ? `已匹配 ${lyricsMatchedCount} 首，继续匹配剩余歌曲` : '为歌单批量匹配歌词（按歌名+歌手搜索）'">
                            <i class="fas" :class="lyricMatching ? 'fa-spinner fa-spin' : 'fa-closed-captioning'"></i>
                            {{ lyricMatching ? `匹配中 ${lyricMatchProgress.done}/${lyricMatchProgress.total}` : '匹配歌词' }}
                        </button>
                        <button class="upload-btn ghost"
                            @click="switchLibraryView(libraryView === 'tracks' ? 'playlists' : 'tracks')">
                            <i class="fas" :class="libraryView === 'tracks' ? 'fa-compact-disc' : 'fa-music'"></i>
                            {{ libraryView === 'tracks' ? '我的歌单' : '全部歌曲' }}
                        </button>
                        <div class="more-actions-container">
                            <button class="upload-btn ghost" :class="{ 'is-on': moreMenuOpen }" @click.stop="toggleMoreMenu">
                                <i class="fas fa-ellipsis-h"></i> 更多
                            </button>
                            <div class="more-actions-menu" v-if="moreMenuOpen" @click.stop>
                                <button v-if="hasSource" :disabled="refreshing || diskScanning"
                                    @click="closeMoreMenu(); refreshFolder()">
                                    <i class="fas fa-sync-alt" :class="{ 'fa-spin': refreshing }"></i> 扫描更新
                                </button>
                                <button @click="closeMoreMenu(); openCreatePlaylist()">
                                    <i class="fas fa-folder-plus"></i> 新建歌单
                                </button>
                                <button @click="toggleAutoPlaylist()"
                                    :title="autoPlaylistEnabled ? '扫描后按文件夹自动生成歌单（已开启）' : '扫描后不再自动生成文件夹歌单（已关闭）'">
                                    <i class="fas" :class="autoPlaylistEnabled ? 'fa-check-square' : 'fa-square'"></i>
                                    自动生成文件夹歌单
                                </button>
                                <button @click="toggleDurationPanel">
                                    <i class="fas fa-filter"></i>
                                    音轨过滤{{ mediaFilter.enabled ? `（≥${mediaFilter.minSeconds} 秒 / ≥${mediaFilter.minSizeMB} MB）` : '（关）' }}
                                </button>
                                <button @click="closeMoreMenu(); openDirReview('settings')"
                                    title="全盘扫描后逐个目录勾选保留，剔除的目录不再出现在歌曲列表和文件夹歌单里">
                                    <i class="fas fa-folder-minus"></i>
                                    剔除目录{{ excludedDirs.size ? `（已剔除 ${excludedDirs.size} 个）` : '' }}
                                </button>
                                <template v-if="folderHistory.length > 0">
                                    <div class="more-menu-label">切换文件夹</div>
                                    <div class="more-folder-item" v-for="folder in folderHistory" :key="folder.id"
                                        :class="{ active: currentFolder?.name === folder.name }">
                                        <button class="more-folder-name" :title="folder.name"
                                            @click="switchFolder(folder); closeMoreMenu()">
                                            <i class="fas fa-folder"></i><span>{{ folder.name }}</span>
                                        </button>
                                        <button class="more-folder-delete" @click.stop="removeFolderHistory(folder.id)"
                                            title="移除记录">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </template>
                            </div>
                            <!-- 音轨过滤设置（时长 + 文件大小） -->
                            <div class="duration-filter-menu" v-if="durationFilterPanel" @click.stop>
                                <div class="df-head">
                                    <span>音轨过滤</span>
                                    <button class="df-close" @click="durationFilterPanel = false" title="关闭">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <label class="df-row">
                                    <input type="checkbox" v-model="mediaFilter.enabled" @change="applyMediaFilter()" />
                                    启用过滤（同时按下面两个条件）
                                </label>
                                <label class="df-row">
                                    最短时长
                                    <input type="number" min="1" max="3600" v-model.number="mediaFilter.minSeconds"
                                        @change="applyMediaFilter()" />
                                    秒
                                </label>
                                <label class="df-row">
                                    最小文件
                                    <input type="number" min="0" max="200" step="0.5" v-model.number="mediaFilter.minSizeMB"
                                        @change="applyMediaFilter()" />
                                    MB
                                </label>
                                <p class="df-hint">扫描/刷新时自动跳过铃声、demo、试听片段等短小音频；低于任一条件的不显示在列表里（时长或大小解析失败的会保留）</p>
                                <div class="df-actions">
                                    <button class="upload-btn" @click="durationFilterPanel = false">取消</button>
                                    <button class="primary-btn" @click="applyMediaFilter(true)">应用</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <button v-if="musicFiles.length > 0" class="collapsed-play-btn" :style="collapsedActionsStyle"
                @click="addPlaylistToQueue($event)" title="播放全部">
                <i class="far fa-play-circle"></i>
            </button>
            </template>
        </div>
        <div class="detail-sliver-spacer" :style="spacerStyle"></div>

        <!-- 导航按钮 -->
        <i class="location-arrow fas fa-crosshairs" @click="scrollToItem" title="当前播放歌曲"></i>

        <!-- 扫描进度 -->
        <div class="scan-progress" v-if="diskScanning || scanProgress.active">
            <i class="fas fa-spinner fa-spin"></i>
            <template v-if="diskScanning">
                <span>{{ diskScanInfo.phase }}<template v-if="diskScanInfo.scanned"> · 已找到 {{ diskScanInfo.scanned }} 首</template><template
                        v-if="diskScanInfo.metaTotal"> · 解析 {{ diskScanInfo.metaDone }}/{{ diskScanInfo.metaTotal }}</template></span>
                <button class="scan-cancel" @click="cancelCurrentScan">取消扫描</button>
            </template>
            <template v-else>正在扫描本地文件… 已处理 {{ scanProgress.done }} 个</template>
        </div>

        <!-- 我的歌单 -->
        <div class="playlist-view" v-if="!loading && libraryView === 'playlists'">
            <template v-if="!activePlaylist">
                <div class="playlist-toolbar">
                    <h2>我的歌单 ( {{ playlists.length + 1 }} )</h2>
                    <button class="upload-btn" @click="openCreatePlaylist">
                        <i class="fas fa-plus"></i> 新建歌单
                    </button>
                </div>

                <div class="playlist-grid">
                    <div class="playlist-card create" @click="openCreatePlaylist">
                        <div class="playlist-cover new"><i class="fas fa-plus"></i></div>
                        <div class="playlist-meta">
                            <h3>新建歌单</h3>
                            <p>把喜欢的本地歌曲整理成歌单</p>
                        </div>
                    </div>
                    <div class="playlist-card builtin" @click="openDownloadPlaylist">
                        <div class="playlist-cover download">
                            <i class="fas fa-download"></i>
                            <span>{{ downloadTracks.length }}</span>
                        </div>
                        <div class="playlist-meta">
                            <h3>下载歌单</h3>
                            <p>自动同步软件下载的音乐</p>
                        </div>
                        <div class="playlist-actions">
                            <button @click.stop="loadDownloadPlaylist()" title="重新同步下载歌单">
                                <i class="fas fa-sync-alt" :class="{ 'fa-spin': downloadRefreshing }"></i>
                            </button>
                        </div>
                    </div>
                    <div class="playlist-card" v-for="playlist in playlists" :key="playlist.id"
                        @click="activePlaylistId = playlist.id">
                        <div class="playlist-cover">
                        <i class="fas fa-compact-disc"></i>
                        <span>{{ playlistVisibleTracks(playlist).length }}</span>
                    </div>
                    <div class="playlist-meta">
                        <h3 :title="playlist.name">{{ playlist.name }}</h3>
                        <p>{{ playlistVisibleTracks(playlist).length }} 首<template v-if="playlist.folderKey"> · 文件夹</template></p>
                        </div>
                        <div class="playlist-actions">
                            <button @click.stop="playPlaylist(playlist)" title="播放歌单">
                                <i class="fas fa-play"></i>
                            </button>
                            <button @click.stop="renamePlaylist(playlist)" title="重命名">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button @click.stop="removePlaylist(playlist)" title="删除歌单">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <p class="playlist-empty" v-if="playlists.length === 0">
                    还没有本地歌单。新建一个，然后在「全部歌曲」里右键（或批量操作）把歌加进来。
                </p>
            </template>

            <template v-else>
                <div class="playlist-detail-head">
                    <button class="upload-btn" @click="activePlaylistId = ''">
                        <i class="fas fa-arrow-left"></i> 返回歌单
                    </button>
                    <div class="playlist-detail-title">
                        <h2>{{ activePlaylist.name }}</h2>
                        <p>{{ playlistVisibleTracks(activePlaylist).length }} 首<template v-if="activePlaylist.builtin"> ·
                            自动同步 {{ downloadDir || '应用下载目录' }}</template><template v-else-if="activePlaylist.folderKey"> ·
                            来自文件夹</template></p>
                    </div>
                    <div class="playlist-detail-actions">
                        <button class="primary-btn" :disabled="!playlistVisibleTracks(activePlaylist).length"
                            @click="playPlaylist(activePlaylist)">
                            <i class="fas fa-play"></i> 播放全部
                        </button>
                        <button class="upload-btn" v-if="activePlaylist.builtin" :disabled="downloadRefreshing"
                            @click="loadDownloadPlaylist()">
                            <i class="fas fa-sync-alt" :class="{ 'fa-spin': downloadRefreshing }"></i> 重新同步
                        </button>
                        <button class="upload-btn" v-else @click="renamePlaylist(activePlaylist)">重命名</button>
                    </div>
                </div>

                <div class="playlist-track-list">
                    <div class="playlist-track" v-for="(item, index) in playlistVisibleTracks(activePlaylist)"
                        :key="item.cacheKey"
                        :class="{ playing: isPlaylistTrackPlaying(item) }"
                        @click="playPlaylistTrack(item)"
                        @contextmenu.prevent="openPlaylistTrackMenu($event, item)">
                        <span class="playlist-track-index">
                            <i v-if="isPlaylistTrackPlaying(item)" class="fas fa-volume-up"></i>
                            <template v-else>{{ index + 1 }}</template>
                        </span>
                        <div class="playlist-track-info">
                            <span class="playlist-track-name">{{ item.displayName || item.name }}</span>
                            <span class="playlist-track-author">{{ item.author }}</span>
                        </div>
                        <span class="playlist-track-duration">{{ formatDuration(item.duration) }}</span>
                        <button v-if="!activePlaylist.builtin" class="playlist-track-remove"
                            @click.stop="removeTrackFromPlaylist(activePlaylist, item)" title="从歌单移除">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <p class="playlist-empty" v-if="!playlistVisibleTracks(activePlaylist).length">
                        {{ activePlaylist.tracks.length
                            ? '歌单里的歌曲都已被「目录剔除」或「音轨过滤」隐藏，恢复后会自动出现'
                            : '歌单还是空的，回到「全部歌曲」右键歌曲加入' }}
                    </p>
                </div>

                <p class="playlist-hint" v-if="playlistHintText">{{ playlistHintText }}</p>
            </template>
        </div>

        <!-- 歌曲列表 -->
        <div class="track-list-container" v-if="!loading && libraryView === 'tracks'">
            <div class="track-list-header" :style="listHeaderStyle">
                <h2 class="track-list-title" :style="listTitleStyle"><span>本地歌曲</span> ( {{ filteredTracks.length }} )</h2>
                <div class="track-list-actions">
                    <div class="batch-action-container">
                        <button class="batch-action-btn" @click="toggleBatchSelection"
                            :class="{ 'active': batchSelectionMode }">
                            <input type="checkbox" v-model="batchSelectionMode" /> 批量操作
                            <span v-if="selectedTracks.length > 0" class="selected-count">{{ selectedTracks.length
                                }}</span>
                        </button>
                        <div v-if="batchSelectionMode && isBatchMenuVisible && selectedTracks.length > 0"
                            class="batch-actions-menu">
                            <ul>
                                <li @click="appendSelectedToQueue"><i class="fas fa-list"></i> 添加到播放列表</li>
                                <li @click="addSelectedToPlaylist"><i class="fas fa-folder-plus"></i> 加入本地歌单</li>
                                <li @click="runLyricsMatching(selectedTracks.map(index => filteredTracks[index])); isBatchMenuVisible = false">
                                    <i class="fas fa-closed-captioning"></i> 匹配选中歌词
                                </li>
                            </ul>
                        </div>
                    </div>
                    <button class="view-mode-btn" @click="toggleListMode"
                        :title="listMode === 'list' ? '切换到网格视图' : '切换到列表视图'">
                        <i class="fas" :class="listMode === 'list' ? 'fa-th' : 'fa-list'"></i>
                    </button>
                    <input type="text" v-model="searchQuery" @keyup.enter="searchTracks" placeholder="搜索歌曲"
                        class="search-input" />
                </div>
            </div>

            <!-- 表头 -->
            <div class="track-list-header-row" v-if="musicFiles.length > 0" :style="trackHeaderStyle">
                <div class="track-checkbox-header" v-if="batchSelectionMode">
                    <input type="checkbox" :checked="isAllSelected" @click="toggleSelectAll">
                </div>
                <div class="track-number-header" v-else>♪</div>
                <div class="track-title-header" @click="sortTracks('name')">
                    文件名 <i class="fas" :class="getSortIconClass('name')"></i>
                </div>
                <div class="track-artist-header" @click="sortTracks('author')">
                    歌手 <i class="fas" :class="getSortIconClass('author')"></i>
                </div>
                <div class="track-album-header" @click="sortTracks('album')">
                    专辑 <i class="fas" :class="getSortIconClass('album')"></i>
                </div>
                <div class="track-size-header" @click="sortTracks('size')">
                    文件大小 <i class="fas" :class="getSortIconClass('size')"></i>
                </div>
                <div class="track-timelen-header" @click="sortTracks('timelen')">
                    时间 <i class="fas" :class="getSortIconClass('timelen')"></i>
                </div>
            </div>

            <RecycleScroller ref="recycleScrollerRef" :key="`list-${listVersion}`" :items="filteredTracks" :item-size="listMode === 'list' ? 50 : 70"
                class="track-list" key-field="cacheKey" page-mode :buffer="400" v-if="musicFiles.length > 0">
                <template #default="{ item, index }">
                    <div class="li" :key="item.cacheKey"
                        :class="{ 'cover-view': listMode === 'grid', 'selected': batchSelectionMode && selectedTracks.includes(index) }"
                        @contextmenu="openRowMenu($event, item)"
                        @click="batchSelectionMode ? selectTrack(index, $event) : playSong(item)">

                        <!-- 复选框或序号 -->
                        <div class="track-checkbox" v-if="batchSelectionMode">
                            <input type="checkbox" :checked="selectedTracks.includes(index)"
                                @click.stop="selectTrack(index, $event)">
                        </div>
                        <div class="track-number" v-else>{{ index + 1 }}</div>

                        <!-- 网格模式封面 -->
                        <div class="track-cover" v-if="listMode === 'grid'">
                            <img :src="item.cover || DEFAULT_COVER" alt="Cover" @error="handleCoverError(item, $event)">
                            <div class="track-cover-overlay"
                                :class="{ 'playing': props.playerControl?.currentSong.name == item.name }">
                                <i
                                    :class="props.playerControl?.currentSong.name == item.name ? 'fas fa-music' : 'fas fa-play'"></i>
                            </div>
                        </div>

                        <!-- 歌曲信息 -->
                        <div class="track-title" :title="item.name">{{ item.displayName }}
                            <span v-if="item.qualityInfo" class="icon" :class="item.qualityInfo.class">{{
                                item.qualityInfo.text }}</span>
                            <i v-if="lyricsStatus.has(item.cacheKey)" class="fas fa-closed-captioning lyric-badge"
                                :title="`歌词来源：${lyricsStatus.get(item.cacheKey).sourceLabel || '已匹配'}`"></i>
                        </div>
                        <div class="track-artist" :title="item.author">{{ item.author }}</div>
                        <div class="track-album" :title="item.album">{{ item.album }}</div>
                        <div class="track-size" :title="item.filesize">{{ item.filesize }}</div>
                        <div class="track-timelen">
                            <button v-if="props.playerControl?.currentSong.name == item.name && listMode === 'list'"
                                class="queue-play-btn fas fa-music"></button>
                            {{ formatDuration(item.duration) }}
                        </div>
                    </div>
                </template>
            </RecycleScroller>

            <!-- 空状态 -->
            <div v-if="musicFiles.length === 0 && hasSource" class="empty-state">
                <img src="/assets/images/empty1.png">
                <p>{{ hasMusicCache ? '该文件夹中没有找到音乐文件' : '该文件夹尚未建立本地音乐缓存' }}</p>
                <p class="hint">{{ hasMusicCache ? '支持的格式: MP3, FLAC, WAV, AAC, OGG, M4A' : '点击刷新按钮扫描音乐文件' }}</p>
            </div>

            <!-- 欢迎状态 -->
            <div v-if="!hasSource" class="welcome-state">
                <img src="/assets/images/empty1.png">
                <h3>欢迎使用MoeKoe Music</h3>
                <p>请选择并授权以访问您的本地音乐文件夹</p>
            </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>正在加载本地音乐...</p>
        </div>

        <div class="note-container">
            <transition-group name="fly-note">
                <div v-for="note in flyingNotes" :key="note.id" class="flying-note" :style="note.style">♪</div>
            </transition-group>
        </div>

        <!-- 歌曲行右键菜单 -->
        <div v-if="rowMenu.visible" class="local-row-menu" :style="{ left: `${rowMenu.x}px`, top: `${rowMenu.y}px` }"
            @click.stop>
            <button v-for="(item, index) in rowMenu.items" :key="index" :class="{ danger: item.danger }"
                @click="closeRowMenu(); item.action && item.action()">
                <i class="fas" :class="item.icon"></i> {{ item.label }}
            </button>
        </div>

        <!-- 加入歌单浮层 -->
        <div v-if="playlistPicker.visible" class="playlist-picker-mask" @click.self="closePlaylistPicker">
            <div class="playlist-picker">
                <div class="playlist-picker-head">
                    <h3>加入歌单</h3>
                    <span>{{ playlistPicker.tracks.length }} 首</span>
                </div>
                <div class="playlist-picker-list">
                    <button v-for="playlist in playlists" :key="playlist.id" class="playlist-picker-item"
                        @click="choosePlaylist(playlist)">
                        <i class="fas fa-compact-disc"></i>
                        <span class="name">{{ playlist.name }}</span>
                        <span class="count">{{ playlistVisibleTracks(playlist).length }}</span>
                    </button>
                    <p class="playlist-picker-empty" v-if="playlists.length === 0">还没有歌单，先新建一个吧</p>
                </div>
                <div class="playlist-picker-actions">
                    <button class="upload-btn" @click="closePlaylistPicker">取消</button>
                    <button class="primary-btn" @click="createPlaylistAndAdd">
                        <i class="fas fa-plus"></i> 新建歌单并加入
                    </button>
                </div>
            </div>
        </div>

        <!-- 目录剔除：全盘扫描完成后 / 「更多 → 剔除目录」 -->
        <div v-if="dirReview.visible" class="playlist-picker-mask dir-review-mask"
            :style="{ paddingTop: `${dirReview.padTop || 0}px`, paddingBottom: `${dirReview.padBottom || 0}px` }"
            @click.self="dirReview.visible = false">
            <div class="playlist-picker dir-review-dialog" :style="{ maxHeight: `${dirReview.maxHeight}px` }">
                <div class="playlist-picker-head">
                    <h3>{{ dirReview.mode === 'scan' ? '扫描完成 · 选择要保留的目录' : '剔除目录' }}</h3>
                    <span>{{ dirReviewSummary.dirs }} 个目录</span>
                </div>
                <p class="dir-review-hint">
                    勾选 = 保留。取消勾选的目录不会出现在歌曲列表和文件夹歌单里，硬盘上的文件不会被删除。
                    点目录左侧的箭头可以展开，看看目录里有哪些歌。
                    <template v-if="dirReview.filteredOut">
                        另有 {{ dirReview.filteredOut }} 个短小音频已被「音轨过滤」隐藏，不计入下面的数字。
                    </template>
                </p>
                <div class="dir-review-summary" :class="{ 'has-dropped': dirReviewSummary.dropped }">
                    <span><i class="fas fa-check"></i>保留 {{ dirReviewSummary.kept }} 首</span>
                    <span v-if="dirReviewSummary.dropped"><i class="fas fa-ban"></i>剔除 {{ dirReviewSummary.dropped }} 首</span>
                </div>
                <div class="dir-review-tools">
                    <input class="search-input dir-review-search" type="text" v-model="dirReview.query"
                        placeholder="搜索目录名或歌曲名" />
                    <button class="upload-btn" :disabled="Boolean(dirReview.query)" @click="dirExpanded = new Set()">
                        全部收起
                    </button>
                    <button class="upload-btn" @click="dirDraft = new Set()">全部保留</button>
                </div>
                <div class="dir-review-list">
                    <div v-for="row in dirReviewRows" :key="row.key" class="dir-row"
                        :class="[row.kind, { excluded: row.kind === 'dir' && row.excluded }]"
                        :style="{ paddingLeft: `${10 + row.depth * 18}px` }">
                        <template v-if="row.kind === 'dir'">
                            <button class="dir-toggle" :disabled="Boolean(dirReview.query)"
                                @click="toggleDirExpand(row)" :title="row.open ? '收起' : '展开'">
                                <i class="fas" :class="row.open ? 'fa-caret-down' : 'fa-caret-right'"></i>
                            </button>
                            <label class="dir-check" :class="{ disabled: row.inherited }"
                                :title="row.inherited ? '上级目录已剔除，先恢复上级目录' : ''">
                                <input type="checkbox" :checked="!row.excluded" :disabled="row.inherited"
                                    @change="toggleDirExcluded(row)" />
                            </label>
                            <i class="fas fa-folder dir-icon"></i>
                            <span class="dir-name" :title="row.node.path">{{ row.node.name }}</span>
                            <span class="dir-count">{{ row.node.total }} 首</span>
                        </template>
                        <template v-else-if="row.kind === 'track'">
                            <i class="fas fa-music dir-icon"></i>
                            <span class="dir-track-name" :title="row.track.filePath">{{ row.track.displayName }}</span>
                            <span class="dir-track-author">{{ row.track.author }}</span>
                        </template>
                        <template v-else>
                            <span class="dir-more">还有 {{ row.more }} 首未显示</span>
                        </template>
                    </div>
                    <p class="playlist-picker-empty" v-if="!dirReviewRows.length">没有匹配的目录或歌曲</p>
                </div>
                <div class="playlist-picker-actions">
                    <button class="upload-btn" @click="dirReview.visible = false">取消</button>
                    <button class="primary-btn" @click="confirmDirReview">确定</button>
                </div>
            </div>
        </div>

        <!-- 歌单命名弹窗 -->
        <div v-if="playlistDialog.visible" class="playlist-picker-mask" @click.self="closePlaylistDialog">
            <div class="playlist-picker playlist-name-dialog">
                <div class="playlist-picker-head">
                    <h3>{{ playlistDialog.mode === 'rename' ? '重命名歌单' : '新建本地歌单' }}</h3>
                    <span v-if="playlistDialog.pendingTracks?.length">{{ playlistDialog.pendingTracks.length }} 首</span>
                </div>
                <input class="playlist-name-input" v-model="playlistDialog.name" maxlength="40" placeholder="输入歌单名称"
                    @keyup.enter="submitPlaylistDialog" />
                <div class="playlist-picker-actions">
                    <button class="upload-btn" @click="closePlaylistDialog">取消</button>
                    <button class="primary-btn" @click="submitPlaylistDialog">确定</button>
                </div>
            </div>
        </div>
    </div>
    <PageScrollbar />
    <BackToTop bottom="100px" right="12px" />
</template>

<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, computed, toRaw, nextTick } from 'vue';
import { RecycleScroller } from 'vue3-virtual-scroller';
import CommonSkeleton from '../components/CommonSkeleton.vue';
import PageScrollbar from '../components/PageScrollbar.vue';
import BackToTop from '../components/BackToTop.vue';
import { parseBlob } from 'music-metadata';
import { useStickyDetailHeader } from '@/composables/useStickyDetailHeader';
import {
    openLocalMusicDb,
    getLocalPlaylists,
    saveLocalPlaylist,
    deleteLocalPlaylist
} from '@/utils/localMusicDb';
import {
    matchAndStoreLyrics,
    getLyricsStatusMap,
    looksLikeLrc
} from '@/utils/localLyrics';
import { extractEmbeddedLyrics } from '@/utils/lrc';
import {
    scanAllDisks,
    scanLocalDirectory,
    buildFsTracks,
    isLocalMediaSupported,
    cancelDiskScan,
    buildCoverUrl,
    showInFolder
} from '@/utils/localMedia';
import {
    PLACEHOLDER_COVER,
    coverCacheKey,
    isCoverRecordExpired,
    isPlaceholderCover,
    loadKnownCovers,
    resolveTrackCover,
    sizeCover
} from '@/utils/localCover';

// Props
const props = defineProps({
    playerControl: Object
});

// 通用状态
const currentFolder = shallowRef(null);
const currentFolderId = ref('');
const musicFiles = ref([]);
const filteredTracks = ref([]);
const searchQuery = ref('');
const recycleScrollerRef = ref(null);
// vue3-virtual-scroller 在列表变短时不会回收旧行，用版本号强制重建
const listVersion = ref(0);
const bumpListVersion = () => { listVersion.value += 1; };
const loading = ref(false);
const refreshing = ref(false);
const hasMusicCache = ref(false);
const flyingNotes = ref([]);
const folderHistory = shallowRef([]);
const isFolderHistoryVisible = ref(false);
let noteId = 0;

// 批量选择相关状态
const batchSelectionMode = ref(false);
const isBatchMenuVisible = ref(false);
const selectedTracks = ref([]);
let lastSelectedIndex = -1;

// 排序状态
const sortField = ref('');
const sortOrder = ref('asc');

// 列表模式状态
const listMode = ref(localStorage.getItem('localMusicListMode') || 'list');

// 支持的音乐文件格式
const supportedFormats = ['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma'];
const DEFAULT_COVER = PLACEHOLDER_COVER;

// IndexedDB 相关（数据库版本与 store 定义统一放在 utils/localMusicDb.js）
const STORE_NAME = 'folderHandles';
const TRACK_STORE_NAME = 'musicTracks';
const TRACK_FOLDER_INDEX = 'folderId';
const LAST_FOLDER_ID = 'lastSelectedFolder';
const FOLDER_HISTORY_ID = 'folderHistory';
const MUSIC_CACHE_KEY_PREFIX = 'musicCache:';
const MAX_FOLDER_HISTORY = 10;
const coverUrls = new Map();
// 在线封面：cacheKey -> { cacheKey, cover }（cover 为空表示没匹配到）
let knownCovers = new Map();
const coverPending = new Set();
// 在线封面加载失败过的歌曲，本次会话不再重试
const coverFailedOnline = new Set();
const coverQueue = [];
let activeCoverTasks = 0;
// 在线接口有频控，封面匹配并发控制在 2
const MAX_COVER_TASKS = 2;

const pumpCoverQueue = () => {
    while (activeCoverTasks < MAX_COVER_TASKS && coverQueue.length) {
        const { task, resolve } = coverQueue.shift();
        activeCoverTasks += 1;
        task().then(resolve, resolve).finally(() => {
            activeCoverTasks -= 1;
            setTimeout(pumpCoverQueue, 120 + Math.random() * 180);
        });
    }
};

const scheduleCoverTask = (task) => new Promise(resolve => {
    coverQueue.push({ task, resolve });
    pumpCoverQueue();
});

// 视图：tracks 全部歌曲 / playlists 我的歌单（默认进歌单页）
const libraryView = ref('playlists');
const playlists = ref([]);
const activePlaylistId = ref('');
// 加入歌单的浮层
const playlistPicker = ref({ visible: false, track: null, tracks: [] });
// 歌曲行右键菜单（通用：菜单项由触发处动态生成）
const rowMenu = ref({ visible: false, x: 0, y: 0, track: null, items: [] });
// 扫描进度
const scanProgress = ref({ active: false, done: 0, total: 0 });

// 数据来源：handle（手选文件夹）/ disk（真·全盘扫描）/ downloads（下载目录）
const DISK_FOLDER_ID = 'full-disk';
const DOWNLOAD_FOLDER_ID = 'downloads';
const DOWNLOAD_PLAYLIST_ID = 'builtin-downloads';
const LAST_SOURCE_KEY = 'localMusicLastSource';
const currentSourceKind = ref('handle');
const currentSourceName = ref('');
const currentSourcePath = ref('');
const diskScanning = ref(false);
const diskScanInfo = ref({ phase: '正在遍历磁盘', scanned: 0, metaDone: 0, metaTotal: 0 });
const downloadTracks = ref([]);
const downloadDir = ref('');
const downloadRefreshing = ref(false);
let downloadRefreshTimer = null;
let offDownloadProgress = null;

/* ---------------- 扫描后自动生成文件夹歌单 ---------------- */
const AUTO_PLAYLIST_KEY = 'localMusicAutoPlaylist';
const FOLDER_PLAYLIST_PREFIX = 'folder-';
const AUTO_PLAYLIST_MAX_GROUPS = 30;
const autoPlaylistEnabled = ref(localStorage.getItem(AUTO_PLAYLIST_KEY) !== 'off');
const syncingPlaylists = ref(false);
// 歌词状态：cacheKey -> 歌词记录
const lyricsStatus = ref(new Map());
const lyricMatching = ref(false);
const lyricMatchProgress = ref({ done: 0, total: 0, ok: 0, fail: 0 });

/* ---------------- 音轨过滤（时长 + 文件大小） ---------------- */
const MEDIA_FILTER_KEY = 'localMusicMediaFilter';
const DEFAULT_MEDIA_FILTER = { enabled: true, minSeconds: 60, minSizeMB: 1 };
const durationFilterPanel = ref(false);
const moreMenuOpen = ref(false);
const mediaFilter = ref(loadMediaFilter());
// 未过滤的原始列表，切换过滤条件时不用重新扫描
const rawMusicFiles = ref([]);
const rawDownloadTracks = ref([]);

function loadMediaFilter() {
    try {
        const saved = JSON.parse(localStorage.getItem(MEDIA_FILTER_KEY) || 'null');
        if (saved && typeof saved === 'object' && saved.minSizeMB !== undefined) {
            const minSeconds = Number(saved.minSeconds);
            const minSizeMB = Number(saved.minSizeMB);
            return {
                enabled: Boolean(saved.enabled),
                minSeconds: Number.isFinite(minSeconds) && minSeconds > 0 ? minSeconds : DEFAULT_MEDIA_FILTER.minSeconds,
                minSizeMB: Number.isFinite(minSizeMB) && minSizeMB >= 0 ? minSizeMB : DEFAULT_MEDIA_FILTER.minSizeMB
            };
        }
    } catch {
        /* 忽略损坏的本地配置 */
    }
    // 首次使用（或旧版只存了时长）默认开启：≥60 秒 且 ≥1 MB
    return { ...DEFAULT_MEDIA_FILTER };
}

const passesMediaFilter = (track) => {
    if (!mediaFilter.value.enabled) return true;

    const duration = Number(track?.duration) || 0;
    const size = Number(track?.size) || 0;
    const minSeconds = Number(mediaFilter.value.minSeconds) || 0;
    const minBytes = (Number(mediaFilter.value.minSizeMB) || 0) * 1024 * 1024;

    // 解析不到时长/大小的保留，避免误伤
    if (duration > 0 && duration < minSeconds) return false;
    if (size > 0 && minBytes > 0 && size < minBytes) return false;
    return true;
};

const filterByMediaFilter = (tracks = []) => tracks.filter(passesMediaFilter);

const applyMediaFilter = (notify = false) => {
    const minSeconds = Number(mediaFilter.value.minSeconds);
    const minSizeMB = Number(mediaFilter.value.minSizeMB);
    mediaFilter.value = {
        enabled: Boolean(mediaFilter.value.enabled),
        minSeconds: Number.isFinite(minSeconds) && minSeconds > 0 ? minSeconds : DEFAULT_MEDIA_FILTER.minSeconds,
        minSizeMB: Number.isFinite(minSizeMB) && minSizeMB >= 0 ? minSizeMB : DEFAULT_MEDIA_FILTER.minSizeMB
    };

    try {
        localStorage.setItem(MEDIA_FILTER_KEY, JSON.stringify(mediaFilter.value));
    } catch {
        /* 忽略存储失败 */
    }

    if (rawMusicFiles.value.length) applyMusicFiles(rawMusicFiles.value);
    if (rawDownloadTracks.value.length) {
        releaseDownloadCoverUrls();
        downloadTracks.value = sortMusicFiles(filterByMediaFilter(rawDownloadTracks.value).map(createRuntimeTrack));
    }

    if (searchQuery.value.trim()) searchTracks();

    // 文件夹歌单同步跟上：被音轨过滤掉的歌从歌单里去掉
    if (rawMusicFiles.value.length) void syncPlaylistsAfterVisibilityChange();

    if (notify) {
        window.$message?.success?.(
            mediaFilter.value.enabled
                ? `已过滤掉短于 ${mediaFilter.value.minSeconds} 秒或小于 ${mediaFilter.value.minSizeMB} MB 的音频，当前 ${musicFiles.value.length} 首`
                : '已关闭音轨过滤'
        );
    }
};

/* ---------------- 目录剔除（全盘扫描结果按目录勾选保留） ---------------- */
const EXCLUDED_DIRS_KEY = 'localMusicExcludedDirs';
const DIR_REVIEW_TRACK_LIMIT = 50;

/**
 * 目录比较键：小写、反斜杠、无结尾斜杠；盘符根保留为 "d:\"
 */
const normalizeDirPath = (value) => {
    const text = String(value || '').replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
    return /^[a-z]:$/.test(text) ? `${text}\\` : text;
};

function loadExcludedDirs() {
    try {
        const list = JSON.parse(localStorage.getItem(EXCLUDED_DIRS_KEY) || '[]');
        return new Set(Array.isArray(list) ? list.map(normalizeDirPath).filter(Boolean) : []);
    } catch {
        return new Set();
    }
}

const saveExcludedDirs = (set) => {
    try {
        localStorage.setItem(EXCLUDED_DIRS_KEY, JSON.stringify([...set]));
    } catch {
        /* 忽略存储失败 */
    }
};

// 已剔除的目录（比较键），全盘扫描结果里这些目录下的歌曲不显示
const excludedDirs = ref(loadExcludedDirs());

/** 文件的任一上级目录被剔除 → 不显示 */
const isPathExcluded = (filePath, set = excludedDirs.value) => {
    if (!set?.size || !filePath) return false;
    const parts = String(filePath).split(/[\\/]+/).filter(Boolean);
    if (!parts.length) return false;
    // ['D:', '音乐', '周杰伦', 'a.mp3'] → 依次检查 D:\ 、D:\音乐、D:\音乐\周杰伦
    let current = normalizeDirPath(parts[0]);
    if (set.has(current)) return true;
    for (let index = 1; index < parts.length - 1; index += 1) {
        current = `${current}\\${parts[index].toLowerCase()}`;
        if (set.has(current)) return true;
    }
    return false;
};

const isTrackDirKept = (track) => !isPathExcluded(track?.filePath);

/**
 * 按磁盘目录把歌曲组织成树：盘符 → 一级目录 → 子目录
 * @returns {Array<{ key, path, name, children, tracks, total }>} total 是子树内的歌曲数
 */
const buildDirTree = (tracks = []) => {
    const roots = new Map();
    const getDir = (map, key, path, name) => {
        let node = map.get(key);
        if (!node) {
            node = { key, path, name, searchKey: path.toLowerCase(), dirs: new Map(), tracks: [], children: [], total: 0 };
            map.set(key, node);
        }
        return node;
    };

    tracks.forEach((track) => {
        const filePath = String(track?.filePath || '');
        const parts = filePath.split(/[\\/]+/).filter(Boolean);
        if (parts.length < 2) return;
        track.searchName = `${track.displayName || track.name || ''} ${track.author || ''}`.toLowerCase();

        let node = getDir(roots, `${parts[0].toLowerCase()}\\`, `${parts[0]}\\`, `${parts[0]}\\`);
        for (let index = 1; index < parts.length - 1; index += 1) {
            node = getDir(node.dirs, `${node.key}\\${parts[index].toLowerCase()}`, `${node.path}\\${parts[index]}`, parts[index]);
        }
        node.tracks.push(track);
    });

    const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });
    const finalize = (map) => [...map.values()]
        .sort((a, b) => collator.compare(a.name, b.name))
        .map((node) => {
            node.children = finalize(node.dirs);
            node.dirs = null;
            node.total = node.tracks.length + node.children.reduce((sum, child) => sum + child.total, 0);
            node.dirCount = 1 + node.children.reduce((sum, child) => sum + child.dirCount, 0);
            return node;
        });

    return finalize(roots);
};

/* 弹窗状态：mode = scan（扫描完成后）| settings（更多菜单里重新设置） */
const dirReview = ref({ visible: false, mode: 'settings', query: '' });
const dirTree = ref([]);
const dirExpanded = ref(new Set());
const dirDraft = ref(new Set());

const dirReviewSummary = computed(() => {
    let dirs = 0;
    let kept = 0;
    let dropped = 0;
    // 被剔除的目录整棵子树一起算，不再往下累加，避免重复计数
    const walk = (nodes) => nodes.forEach((node) => {
        if (dirDraft.value.has(node.key)) {
            dirs += node.dirCount;
            dropped += node.total;
        } else {
            dirs += 1;
            kept += node.tracks.length;
            walk(node.children);
        }
    });
    walk(dirTree.value);
    return { dirs, kept, dropped };
});

/** 当前可见的行：已展开的目录 + 目录里的歌曲（搜索时自动展开并只留匹配项） */
const dirReviewRows = computed(() => {
    const query = dirReview.value.query.trim().toLowerCase();
    const rows = [];
    const hitCache = new Map();
    const nodeHit = (node) => {
        if (hitCache.has(node)) return hitCache.get(node);
        let hit = node.searchKey.includes(query)
            || node.tracks.some(track => track.searchName.includes(query));
        if (!hit) hit = node.children.some(nodeHit);
        hitCache.set(node, hit);
        return hit;
    };

    const walk = (nodes, depth, inherited) => nodes.forEach((node) => {
        if (query && !nodeHit(node)) return;
        const excluded = inherited || dirDraft.value.has(node.key);
        const open = Boolean(query) || dirExpanded.value.has(node.key);
        rows.push({ kind: 'dir', key: node.key, node, depth, open, excluded, inherited });

        if (!open) return;
        const tracks = query ? node.tracks.filter(track => track.searchName.includes(query)) : node.tracks;
        tracks.slice(0, DIR_REVIEW_TRACK_LIMIT).forEach(track => {
            rows.push({ kind: 'track', key: track.cacheKey, track, depth: depth + 1 });
        });
        if (tracks.length > DIR_REVIEW_TRACK_LIMIT) {
            rows.push({ kind: 'more', key: `${node.key}:more`, more: tracks.length - DIR_REVIEW_TRACK_LIMIT, depth: depth + 1 });
        }
        walk(node.children, depth + 1, excluded);
    });

    walk(dirTree.value, 0, false);
    return rows;
});

const toggleDirExpand = (row) => {
    const next = new Set(dirExpanded.value);
    if (next.has(row.key)) next.delete(row.key);
    else next.add(row.key);
    dirExpanded.value = next;
};

const removeSubtreeKeys = (node, set) => {
    node.children.forEach((child) => {
        set.delete(child.key);
        removeSubtreeKeys(child, set);
    });
};

const toggleDirExcluded = (row) => {
    if (row.kind !== 'dir' || row.inherited) return;
    const next = new Set(dirDraft.value);
    if (row.excluded) {
        next.delete(row.key);
    } else {
        next.add(row.key);
        // 上级整体剔除后，下级的单独标记已无意义
        removeSubtreeKeys(row.node, next);
    }
    dirDraft.value = next;
};

/**
 * 弹窗可用的区域：这个页面的弹层层级在应用顶栏和播放栏之下，
 * 所以要按「顶栏底边 → 播放栏顶边」之间的实际空间来居中和限高，否则标题和按钮会被盖住
 * @returns {{ maxHeight: number, padTop: number, padBottom: number }}
 */
const measureDirReviewSpace = () => {
    const headerBottom = document.querySelector('.app-header')?.getBoundingClientRect().bottom || 0;
    const playerTop = document.querySelector('.player-container')?.getBoundingClientRect().top || window.innerHeight;
    const top = Math.max(0, Math.round(headerBottom));
    const bottom = Math.max(0, Math.round(window.innerHeight - playerTop));
    return {
        maxHeight: Math.max(280, Math.floor(window.innerHeight - top - bottom - 24)),
        padTop: top > 0 ? top + 12 : 0,
        padBottom: bottom > 0 ? bottom + 12 : 0
    };
};

/**
 * 打开目录剔除弹窗
 * @param {'scan'|'settings'} mode
 * @param {Array|null} [tracks] 扫描完成时传入本次扫到的全部歌曲；不传则读全盘扫描缓存
 */
const openDirReview = async (mode = 'settings', tracks = null) => {
    let source = Array.isArray(tracks) && tracks.length ? tracks : null;
    if (!source) {
        try {
            source = await getMusicCacheRecords(DISK_FOLDER_ID);
        } catch (error) {
            source = null;
        }
    }
    if (!source?.length) {
        window.$message?.info?.('还没有全盘扫描结果，先点击「扫描整块硬盘」');
        return;
    }

    // 只统计会在列表里出现的歌：被「音轨过滤」隐藏的短小音频不参与，避免数字误导
    const visible = source.filter(passesMediaFilter);
    dirTree.value = buildDirTree(visible);
    dirDraft.value = new Set(excludedDirs.value);

    // 默认展开到盘符；已剔除目录的上级也展开，方便找到并恢复
    const expanded = new Set(dirTree.value.map(node => node.key));
    const revealExcluded = (nodes) => nodes.some((node) => {
        const inside = revealExcluded(node.children);
        if (inside) expanded.add(node.key);
        return dirDraft.value.has(node.key) || inside;
    });
    revealExcluded(dirTree.value);
    dirExpanded.value = expanded;
    dirReview.value = {
        visible: true,
        mode,
        query: '',
        filteredOut: source.length - visible.length,
        ...measureDirReviewSpace()
    };
};

/** 文件夹歌单跟着剔除结果走：被剔除的歌从歌单里去掉，恢复的目录重新生成 */
const syncAutoPlaylistsWithExclusion = () => syncPlaylistsAfterVisibilityChange();

const confirmDirReview = async () => {
    const summary = dirReviewSummary.value;
    const next = new Set(dirDraft.value);
    const unchanged = next.size === excludedDirs.value.size && [...next].every(key => excludedDirs.value.has(key));

    dirReview.value = { ...dirReview.value, visible: false };
    if (unchanged) return;

    excludedDirs.value = next;
    saveExcludedDirs(next);

    try {
        if (currentSourceKind.value === 'disk' && rawMusicFiles.value.length) {
            applyMusicFiles(rawMusicFiles.value);
            if (searchQuery.value.trim()) searchTracks();
        }
        await syncAutoPlaylistsWithExclusion();
    } catch (error) {
        console.error('[LocalMusic] 应用目录剔除失败:', error);
        window.$modal?.alert?.(`应用目录剔除失败：${error?.message || error}`);
        return;
    }

    window.$message?.success?.(summary.dropped
        ? `已剔除 ${summary.dropped} 首，可在「更多 → 剔除目录」里恢复`
        : '已恢复显示全部目录');
};

const hasSource = computed(() => Boolean(currentFolder.value) || Boolean(currentSourceName.value));

const sourceName = computed(() => currentFolder.value?.name || currentSourceName.value);

const sourcePath = computed(() => currentSourcePath.value);

const descriptionText = computed(() => {
    if (currentSourceKind.value === 'disk') {
        return '已扫描整块硬盘（自动跳过系统目录），支持 MP3、FLAC、WAV、AAC、OGG、M4A 等格式';
    }
    if (currentSourceKind.value === 'downloads') {
        return '这里是应用下载目录中的歌曲，下载新歌后会自动同步进来';
    }
    return '这里存放着你授权的文件夹中的歌曲，支持 MP3、FLAC、WAV、AAC、OGG、M4A 等格式';
});

const sourceIconClass = computed(() => {
    if (currentSourceKind.value === 'disk') return 'fa-hard-drive';
    if (currentSourceKind.value === 'downloads') return 'fa-download';
    return 'fa-folder';
});

// 内置「下载歌单」：跟随应用下载目录自动同步
const downloadPlaylist = computed(() => ({
    id: DOWNLOAD_PLAYLIST_ID,
    name: '下载歌单',
    builtin: true,
    dir: downloadDir.value,
    tracks: downloadTracks.value.map(toPlaylistTrack)
}));

/**
 * 这首歌现在是否显示：被「目录剔除」或「音轨过滤」掉的都不显示。
 * 列表、文件夹歌单、播放全部统一用它判断
 */
const isShownInLibrary = (track) => !isPathExcluded(track?.filePath) && passesMediaFilter(track);

/** 每个歌单当前显示的歌（按歌单缓存）。歌单里保存的条目不动，恢复目录/关闭过滤后会重新出现 */
const visiblePlaylistItems = computed(() => {
    const map = new Map();
    playlists.value.forEach((playlist) => {
        map.set(playlist, (playlist.tracks || []).filter(isShownInLibrary));
    });
    return map;
});

const playlistVisibleTracks = (playlist) => {
    if (!playlist) return [];
    return visiblePlaylistItems.value.get(playlist) || (playlist.tracks || []).filter(isShownInLibrary);
};

const activePlaylist = computed(() => {
    if (activePlaylistId.value === DOWNLOAD_PLAYLIST_ID) return downloadPlaylist.value;
    return playlists.value.find(item => item.id === activePlaylistId.value) || null;
});

const activePlaylistTracks = computed(() => {
    const playlist = activePlaylist.value;
    if (!playlist) return [];
    if (playlist.builtin) return downloadTracks.value;

    return playlistVisibleTracks(playlist)
        .map(item => resolvePlaylistTrack(item))
        .filter(Boolean);
});

/** 歌单详情下方的一行说明：被隐藏的 / 不在当前文件夹里的 */
const playlistHintText = computed(() => {
    const playlist = activePlaylist.value;
    if (!playlist || playlist.builtin) return '';
    const shown = playlistVisibleTracks(playlist).length;
    const hidden = (playlist.tracks || []).length - shown;
    const missing = shown - activePlaylistTracks.value.length;
    const parts = [];
    // 一首不剩时上面的空状态已经说明了原因，这里不再重复
    if (hidden > 0 && shown > 0) parts.push(`有 ${hidden} 首已被「目录剔除」或「音轨过滤」隐藏，恢复后自动出现`);
    if (missing > 0) parts.push(`有 ${missing} 首不在当前文件夹中，播放时会自动跳过`);
    return parts.join('；');
});

const lyricsMatchedCount = computed(() => lyricsStatus.value.size);

// 判断是否全选
const isAllSelected = computed(() => {
    return selectedTracks.value.length === filteredTracks.value.length && filteredTracks.value.length > 0;
});

const {
    headerStyle,
    spacerStyle,
    coverStyle,
    infoStyle,
    titleStyle,
    detailsStyle,
    listTitleStyle,
    collapsedActionsStyle,
    listHeaderStyle,
    trackHeaderStyle
} = useStickyDetailHeader();

onMounted(async () => {
    document.addEventListener('click', handleClickOutside);
    // 之前匹配过的在线封面先读进内存，列表重建时直接用
    knownCovers = await loadKnownCovers();
    loadLastFolder();
    loadPlaylists();

    if (isLocalMediaSupported()) {
        // 下载歌单随应用下载目录自动同步
        void loadDownloadPlaylist({ silent: true });
        offDownloadProgress = window.electronAPI.onDownloadProgress((payload) => {
            if (!payload?.completed) return;
            clearTimeout(downloadRefreshTimer);
            downloadRefreshTimer = setTimeout(() => loadDownloadPlaylist({ silent: true }), 1500);
        });
    }
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
    releaseCoverUrls();
    coverQueue.length = 0;
    coverPending.clear();
    coverFailedOnline.clear();
    clearTimeout(downloadRefreshTimer);
    offDownloadProgress?.();
    offDownloadProgress = null;
    // 离开页面就停止遍历，避免后台一直读盘
    if (diskScanning.value) void cancelDiskScan();
});

// 初始化 IndexedDB（统一由 utils/localMusicDb.js 管理，保证版本一致）
const initDB = () => openLocalMusicDb();

const getStoreItem = (store, key) => {
    return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const waitForTransaction = (transaction) => {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
};

const getMusicCacheRecords = async (folderId) => {
    if (!folderId) return [];
    const db = await initDB();
    const transaction = db.transaction([TRACK_STORE_NAME], 'readonly');
    const store = transaction.objectStore(TRACK_STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.index(TRACK_FOLDER_INDEX).getAll(folderId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

const getMusicCacheInfo = async (folderId) => {
    if (!folderId) return null;
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    return getStoreItem(transaction.objectStore(STORE_NAME), `${MUSIC_CACHE_KEY_PREFIX}${folderId}`);
};

const releaseCoverUrls = () => {
    coverUrls.forEach(url => URL.revokeObjectURL(url));
    coverUrls.clear();
};

const createRuntimeTrack = (track) => {
    let cover = DEFAULT_COVER;
    let coverTemplate = '';
    if (track.coverBlob instanceof Blob && track.coverBlob.size > 0) {
        cover = URL.createObjectURL(track.coverBlob);
        coverUrls.set(track.cacheKey, cover);
    } else if (track.filePath) {
        const known = knownCovers.get(track.cacheKey);
        if (known?.cover) {
            // 已知没有内嵌封面、且在线匹配到过封面的，直接用在线封面
            coverTemplate = known.cover;
            cover = sizeCover(known.cover, 240);
        } else if (known && !isCoverRecordExpired(known)) {
            // 内嵌、在线都没有封面：直接用占位图，不用再让协议去 404 一次
            cover = DEFAULT_COVER;
        } else {
            // 全盘扫描的歌曲不把封面存库，用协议按需从音频文件里取
            cover = buildCoverUrl(track.filePath);
        }
    }

    const extension = track.extension || `.${getFileExtension(track.name)}`.toLowerCase();

    return {
        ...track,
        handle: toRaw(track.handle),
        filesize: formatFileSize(track.size),
        cover,
        coverTemplate,
        qualityInfo: track.qualityInfo || getQualityInfo(extension, track.bitrate, track.sampleRate)
    };
};

const sortMusicFiles = (files) => {
    files.sort((a, b) => {
        const artistCompare = a.author.localeCompare(b.author);
        if (artistCompare !== 0) return artistCompare;
        return a.displayName.localeCompare(b.displayName);
    });
    return files;
};

const applyMusicFiles = (tracks) => {
    releaseCoverUrls();
    rawMusicFiles.value = tracks;
    // 目录剔除 → 音轨过滤 → 运行时对象；原始列表保持完整，取消剔除后不用重扫
    const files = sortMusicFiles(filterByMediaFilter(tracks.filter(isTrackDirKept)).map(createRuntimeTrack));
    musicFiles.value = files;
    filteredTracks.value = files;
    bumpListVersion();
};

const loadMusicCache = async (folderId) => {
    const cacheInfo = await getMusicCacheInfo(folderId);
    hasMusicCache.value = Boolean(cacheInfo);
    if (!cacheInfo) {
        applyMusicFiles([]);
        lyricsStatus.value = new Map();
        return false;
    }

    applyMusicFiles(await getMusicCacheRecords(folderId));
    refreshLyricsStatus();
    return true;
};

const saveMusicCache = async (folderId, tracks) => {
    const cachedTracks = await getMusicCacheRecords(folderId);
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME, TRACK_STORE_NAME], 'readwrite');
    const folderStore = transaction.objectStore(STORE_NAME);
    const trackStore = transaction.objectStore(TRACK_STORE_NAME);

    cachedTracks.forEach(track => trackStore.delete(track.cacheKey));
    tracks.forEach(track => trackStore.put({
        ...track,
        handle: toRaw(track.handle)
    }));
    folderStore.put({
        id: `${MUSIC_CACHE_KEY_PREFIX}${folderId}`,
        folderId,
        trackCount: tracks.length,
        timestamp: Date.now()
    });

    await waitForTransaction(transaction);
    hasMusicCache.value = true;
};

const deleteMusicCache = async (folderId) => {
    if (!folderId) return;
    const cachedTracks = await getMusicCacheRecords(folderId);
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME, TRACK_STORE_NAME], 'readwrite');
    const folderStore = transaction.objectStore(STORE_NAME);
    const trackStore = transaction.objectStore(TRACK_STORE_NAME);

    cachedTracks.forEach(track => trackStore.delete(track.cacheKey));
    folderStore.delete(`${MUSIC_CACHE_KEY_PREFIX}${folderId}`);
    await waitForTransaction(transaction);
};

const markCoverCacheStale = async (track) => {
    try {
        const cacheTrack = { ...toRaw(track) };
        delete cacheTrack.cover;
        delete cacheTrack.file;
        delete cacheTrack.filesize;
        const db = await initDB();
        const transaction = db.transaction([TRACK_STORE_NAME], 'readwrite');
        transaction.objectStore(TRACK_STORE_NAME).put({
            ...cacheTrack,
            handle: toRaw(track.handle),
            coverBlob: null,
            coverState: 'stale'
        });
        await waitForTransaction(transaction);
    } catch (error) {
        console.error('更新封面缓存状态失败:', error);
    }
};

const handleCoverError = (track, event) => {
    const coverUrl = coverUrls.get(track.cacheKey);
    const failedSrc = event.currentTarget.src || '';
    const defaultCoverUrl = new URL(DEFAULT_COVER, window.location.href).href;
    if (!coverUrl && failedSrc === defaultCoverUrl) return;

    if (coverUrl) {
        URL.revokeObjectURL(coverUrl);
        coverUrls.delete(track.cacheKey);
    }
    event.currentTarget.src = DEFAULT_COVER;
    track.cover = DEFAULT_COVER;

    // 在线封面本身加载失败（断网等）：保持占位图，本次不再重试，避免死循环
    if (/^https?:\/\//i.test(failedSrc)) {
        coverFailedOnline.add(coverCacheKey(track));
        return;
    }

    if (track.coverState === 'ready') {
        track.coverState = 'stale';
        track.coverBlob = null;
        markCoverCacheStale(track);
    }

    // 音频里没有内嵌封面：试在线封面，找不到就保持占位图
    void requestOnlineCover(track);
};

/**
 * 没有内嵌封面的歌曲去在线找封面（结果会落库，下次直接命中缓存）
 */
const requestOnlineCover = async (track) => {
    const key = coverCacheKey(track);
    if (!key || coverPending.has(key) || coverFailedOnline.has(key)) return;
    coverPending.add(key);

    try {
        const template = await resolveTrackCover(track, { schedule: scheduleCoverTask });
        if (coverFailedOnline.has(key)) return;
        if (isPlaceholderCover(template)) {
            // 记下「没有在线封面」，列表重建时直接用占位图
            knownCovers.set(key, { cacheKey: key, cover: '', updatedAt: Date.now() });
            return;
        }
        knownCovers.set(key, { cacheKey: key, cover: template, updatedAt: Date.now() });
        track.cover = sizeCover(template, 240);
        track.coverTemplate = template;
    } finally {
        coverPending.delete(key);
    }
};

const normalizeFolder = (folder) => {
    const handle = toRaw(folder?.handle);
    if (!handle) return null;
    return {
        id: folder.id,
        handle,
        name: folder.name || handle.name,
        timestamp: folder.timestamp || Date.now()
    };
};

const normalizeFolderHistory = (folders) => {
    return folders.map(normalizeFolder).filter(Boolean);
};

const findSameFolderIndex = async (folders, handle) => {
    const rawHandle = toRaw(handle);
    for (let i = 0; i < folders.length; i++) {
        const folderHandle = toRaw(folders[i].handle);
        if (!folderHandle) continue;
        if (typeof folderHandle.isSameEntry === 'function') {
            if (await folderHandle.isSameEntry(rawHandle)) return i;
            continue;
        }
        if (folderHandle.name === rawHandle.name) return i;
    }
    return -1;
};

// 保存文件夹句柄到 IndexedDB
const saveFolderHandle = async (handle) => {
    try {
        const rawHandle = toRaw(handle);
        const folders = await getFolderHistory();
        const sameFolderIndex = await findSameFolderIndex(folders, rawHandle);
        const now = Date.now();
        const nextFolder = {
            id: sameFolderIndex > -1 ? folders[sameFolderIndex].id : `${now}-${Math.random().toString(36).slice(2)}`,
            handle: rawHandle,
            name: rawHandle.name,
            timestamp: now
        };
        const nextFolders = normalizeFolderHistory([
            nextFolder,
            ...folders.filter((_, index) => index !== sameFolderIndex)
        ]).slice(0, MAX_FOLDER_HISTORY);

        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        await store.put({
            id: LAST_FOLDER_ID,
            handle: rawHandle,
            name: rawHandle.name,
            timestamp: now
        });
        await store.put({
            id: FOLDER_HISTORY_ID,
            folders: nextFolders,
            timestamp: now
        });
        folderHistory.value = nextFolders;

        console.log('文件夹句柄已保存');
        return nextFolder;
    } catch (error) {
        console.error('保存文件夹句柄失败:', error);
        return null;
    }
};

const getFolderHistory = async () => {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const history = await getStoreItem(store, FOLDER_HISTORY_ID);
    return history?.folders || [];
};

const loadFolderHistory = async () => {
    try {
        folderHistory.value = await getFolderHistory();
    } catch (error) {
        console.error('读取文件夹历史失败:', error);
        folderHistory.value = [];
    }
};

const saveFolderHistory = async (folders) => {
    try {
        const nextFolders = normalizeFolderHistory(folders);
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        await store.put({
            id: FOLDER_HISTORY_ID,
            folders: nextFolders,
            timestamp: Date.now()
        });
        folderHistory.value = nextFolders;
    } catch (error) {
        console.error('保存文件夹历史失败:', error);
    }
};

const saveLastFolderHandle = async (handle) => {
    try {
        const rawHandle = toRaw(handle);
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        if (rawHandle) {
            await store.put({
                id: LAST_FOLDER_ID,
                handle: rawHandle,
                name: rawHandle.name,
                timestamp: Date.now()
            });
        } else {
            await store.delete(LAST_FOLDER_ID);
        }
    } catch (error) {
        console.error('保存最近文件夹失败:', error);
    }
};

// 从 IndexedDB 读取文件夹句柄
const loadFolderHandle = async () => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get(LAST_FOLDER_ID);
            request.onsuccess = () => {
                const result = request.result;
                if (result && result.handle) {
                    resolve(result.handle);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('读取文件夹句柄失败:', error);
        return null;
    }
};

// 检查是否支持 File System Access API
const checkFileSystemSupport = () => {
    if (!('showDirectoryPicker' in window)) {
        window.$modal.alert('您的浏览器不支持 File System Access API，请使用 Chrome 86+ 或 Edge 86+');
        return false;
    }
    return true;
};

// 加载上次选择的文件夹 / 扫描来源
const loadLastFolder = async () => {
    try {
        loading.value = true;
        await loadFolderHistory();

        const lastSource = readLastSource();
        if (lastSource?.kind === 'disk') {
            currentSourceKind.value = 'disk';
            currentFolderId.value = DISK_FOLDER_ID;
            currentSourceName.value = lastSource.name || '整块硬盘';
            currentSourcePath.value = lastSource.path || '';
            await loadMusicCache(DISK_FOLDER_ID);
            // 打开页面时把文件夹歌单和缓存结果对齐一次（清掉已剔除/已过滤的）
            void syncFolderPlaylists(musicFiles.value);
            loading.value = false;
            return;
        }

        if (!checkFileSystemSupport()) {
            loading.value = false;
            return;
        }

        const savedHandle = await loadFolderHandle();
        if (savedHandle) {
            currentFolder.value = savedHandle;
            const folderIndex = await findSameFolderIndex(folderHistory.value, savedHandle);
            const folder = folderHistory.value[folderIndex] || await saveFolderHandle(savedHandle);
            currentFolderId.value = folder?.id || '';
            await loadMusicCache(currentFolderId.value);
            console.log('已加载上次选择的文件夹缓存:', savedHandle.name);
        }
    } catch (error) {
        console.error('自动加载文件夹失败:', error);
    }
    loading.value = false;
};

const toggleFolderHistory = () => {
    isFolderHistoryVisible.value = !isFolderHistoryVisible.value;
};

/* ---------------- 「更多」菜单 ---------------- */

const closeMoreMenu = () => {
    moreMenuOpen.value = false;
};

const toggleMoreMenu = () => {
    moreMenuOpen.value = !moreMenuOpen.value;
    if (moreMenuOpen.value) durationFilterPanel.value = false;
};

const toggleDurationPanel = () => {
    durationFilterPanel.value = !durationFilterPanel.value;
    moreMenuOpen.value = false;
};

const switchFolder = async (folder) => {
    if (!folder?.handle || !checkFileSystemSupport()) return;

    try {
        const handle = toRaw(folder.handle);
        loading.value = true;
        isFolderHistoryVisible.value = false;
        currentFolder.value = handle;
        const savedFolder = await saveFolderHandle(handle);
        currentFolderId.value = savedFolder?.id || folder.id;
        await loadMusicCache(currentFolderId.value);
        console.log('已切换文件夹:', folder.name);
    } catch (error) {
        console.error('切换文件夹失败:', error);
    } finally {
        loading.value = false;
    }
};

const removeFolderHistory = async (folderId) => {
    const folders = normalizeFolderHistory(folderHistory.value.filter(folder => folder.id !== folderId));
    await saveFolderHistory(folders);
    await saveLastFolderHandle(folders[0]?.handle || null);
    await deleteMusicCache(folderId);
    if (folders.length === 0) {
        isFolderHistoryVisible.value = false;
    }
};

/* ---------------- 歌词匹配 ---------------- */

// 读取列表中已匹配的歌词状态
const refreshLyricsStatus = async () => {
    try {
        lyricsStatus.value = await getLyricsStatusMap(musicFiles.value);
    } catch (error) {
        console.error('[LocalMusic] 读取歌词状态失败:', error);
    }
};

const updateLyricsStatus = (record) => {
    if (!record?.cacheKey) return;
    const next = new Map(lyricsStatus.value);
    next.set(record.cacheKey, record);
    lyricsStatus.value = next;
};

/**
 * 一键匹配歌词（默认整张列表，也可只匹配选中/单曲）
 * 来源优先级：同名 .lrc > 音频内嵌歌词 > 在线搜索（歌名 + 歌手）
 * @param {Array|null} tracks 指定歌曲，为空则匹配当前列表
 * @param {{ force?: boolean }} options force=true 时忽略已有歌词，重新匹配
 */
const runLyricsMatching = async (tracks = null, { force = false } = {}) => {
    if (lyricMatching.value) return;

    const source = (Array.isArray(tracks) && tracks.length ? tracks : filteredTracks.value).filter(Boolean);
    const target = force
        ? source
        : source.filter(track => !lyricsStatus.value.has(track.cacheKey));

    if (target.length === 0) {
        window.$modal?.alert?.('当前列表的歌曲都已匹配过歌词；如需重新匹配，可右键单曲选择「匹配歌词」');
        return;
    }

    lyricMatching.value = true;
    lyricMatchProgress.value = { done: 0, total: target.length, ok: 0, fail: 0 };

    let cursor = 0;
    const worker = async () => {
        while (cursor < target.length) {
            const index = cursor;
            cursor += 1;
            const track = target[index];

            try {
                const record = await matchAndStoreLyrics(track);
                if (record) {
                    updateLyricsStatus(record);
                    lyricMatchProgress.value = { ...lyricMatchProgress.value, ok: lyricMatchProgress.value.ok + 1 };
                } else {
                    lyricMatchProgress.value = { ...lyricMatchProgress.value, fail: lyricMatchProgress.value.fail + 1 };
                }
            } catch (error) {
                console.error('[LocalMusic] 匹配歌词失败:', track?.name, error);
                lyricMatchProgress.value = { ...lyricMatchProgress.value, fail: lyricMatchProgress.value.fail + 1 };
            }

            lyricMatchProgress.value = { ...lyricMatchProgress.value, done: lyricMatchProgress.value.done + 1 };

            // 在线匹配会走搜索接口，稍微间隔一下，降低被风控的概率
            await new Promise(resolve => setTimeout(resolve, 120 + Math.random() * 200));
        }
    };

    // 在线接口有频控，并发控制在 2
    await Promise.all([worker(), worker()]);

    lyricMatching.value = false;
    const { ok, fail } = lyricMatchProgress.value;
    window.$message?.success?.(`歌词匹配完成：成功 ${ok} 首，未找到 ${fail} 首`);
};

/* ---------------- 自定义本地歌单 ---------------- */

const loadPlaylists = async () => {
    try {
        playlists.value = await getLocalPlaylists();
    } catch (error) {
        console.error('[LocalMusic] 读取本地歌单失败:', error);
    }
};

const switchLibraryView = (view) => {
    libraryView.value = view;
    if (view === 'playlists') {
        loadPlaylists();
        if (isLocalMediaSupported()) void loadDownloadPlaylist({ silent: true });
    } else {
        activePlaylistId.value = '';
    }
};

const toPlaylistTrack = (track) => ({
    cacheKey: track.cacheKey,
    folderId: track.folderId,
    hash: track.hash || `local_${track.cacheKey}`,
    name: track.name,
    displayName: track.displayName,
    author: track.author,
    album: track.album,
    duration: track.duration,
    timelen: track.timelen || (track.duration ? track.duration * 1000 : 0),
    size: track.size || 0,
    extension: track.extension || '',
    // 保留磁盘路径，这样歌单里的歌即使不在当前扫描结果中也能直接播放/定位
    filePath: track.filePath || '',
    lrcPath: track.lrcPath || ''
});

/**
 * 把歌单里的条目还原成可播放的歌曲对象
 * 优先用内存中已构建好的对象，其次用条目里保存的磁盘路径重建
 */
const resolvePlaylistTrack = (item) => {
    if (!item) return null;
    const key = item.cacheKey;

    const fromLibrary = musicFiles.value.find(track => track.cacheKey === key)
        || rawMusicFiles.value.find(track => track.cacheKey === key);
    if (fromLibrary) return fromLibrary;

    const fromDownloads = downloadTracks.value.find(track => track.cacheKey === key)
        || rawDownloadTracks.value.find(track => track.cacheKey === key);
    if (fromDownloads) return fromDownloads;

    if (item.filePath) {
        return {
            ...item,
            source: 'fs',
            folderId: item.folderId || DOWNLOAD_FOLDER_ID,
            coverState: 'protocol'
        };
    }

    return null;
};

const isPlaylistTrackPlaying = (item) => {
    const currentHash = props.playerControl?.currentSong?.hash;
    return Boolean(currentHash && item?.hash && currentHash === item.hash);
};

const playPlaylistTrack = async (item) => {
    const track = resolvePlaylistTrack(item);
    if (!track) {
        window.$message?.warning?.('这首歌曲不在当前扫描结果中，请切换到它所在的文件夹或重新扫描');
        return;
    }
    await playSong(track);
};

const matchSinglePlaylistTrack = async (item) => {
    const track = resolvePlaylistTrack(item);
    if (!track) {
        window.$message?.warning?.('这首歌曲不在当前扫描结果中，无法匹配歌词');
        return;
    }
    await runLyricsMatching([track], { force: true });
};

const playlistDialog = ref({ visible: false, mode: 'create', playlistId: '', name: '', pendingTracks: null });

const openPlaylistDialog = (mode = 'create', playlist = null, pendingTracks = null) => {
    playlistDialog.value = {
        visible: true,
        mode,
        playlistId: playlist?.id || '',
        name: mode === 'rename' ? (playlist?.name || '') : `我的歌单 ${playlists.value.length + 1}`,
        pendingTracks
    };
};

const closePlaylistDialog = () => {
    playlistDialog.value = { ...playlistDialog.value, visible: false };
};

const submitPlaylistDialog = async () => {
    const name = playlistDialog.value.name.trim();
    if (!name) {
        window.$message?.warning?.('请输入歌单名称');
        return;
    }

    const { mode, playlistId, pendingTracks } = playlistDialog.value;

    if (mode === 'rename') {
        const playlist = playlists.value.find(item => item.id === playlistId);
        if (playlist) {
            // autoName=false：之后重新扫描也不会把名字改回去
            await saveLocalPlaylist({ ...playlist, name, autoName: false });
            await loadPlaylists();
        }
        closePlaylistDialog();
        return;
    }

    const playlist = await saveLocalPlaylist({
        id: `pl-${Date.now()}`,
        name,
        createdAt: Date.now(),
        tracks: []
    });
    await loadPlaylists();
    closePlaylistDialog();

    if (pendingTracks?.length) {
        await addTracksToPlaylist({ ...playlist, tracks: [] }, pendingTracks);
        libraryView.value = 'playlists';
        return;
    }

    libraryView.value = 'playlists';
    activePlaylistId.value = playlist.id;
};

const openCreatePlaylist = () => openPlaylistDialog('create');

/* ---------------- 扫描后自动按文件夹生成歌单 ---------------- */

const DELETED_AUTO_PLAYLIST_KEY = 'localMusicDeletedAutoPlaylists';

const hashString = (value) => {
    const text = String(value || '');
    let hash = 5381;
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
};

const readDeletedAutoPlaylists = () => {
    try {
        const list = JSON.parse(localStorage.getItem(DELETED_AUTO_PLAYLIST_KEY) || '[]');
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
};

const writeDeletedAutoPlaylists = (list) => {
    try {
        localStorage.setItem(DELETED_AUTO_PLAYLIST_KEY, JSON.stringify(list.slice(-200)));
    } catch {
        /* 忽略存储失败 */
    }
};

const toggleAutoPlaylist = () => {
    autoPlaylistEnabled.value = !autoPlaylistEnabled.value;
    try {
        localStorage.setItem(AUTO_PLAYLIST_KEY, autoPlaylistEnabled.value ? 'on' : 'off');
    } catch {
        /* 忽略存储失败 */
    }
    window.$message?.info?.(autoPlaylistEnabled.value
        ? '已开启：扫描/刷新后自动按文件夹生成歌单'
        : '已关闭：扫描后不再自动生成文件夹歌单');
    // 刚开启时按当前列表马上生成一次，不用等下一次扫描
    if (autoPlaylistEnabled.value) void syncPlaylistsAfterVisibilityChange();
};

/**
 * 按磁盘上的文件夹给歌曲分组
 * 全盘扫描：按「盘符 + 一级目录」分组，例如 D:\音乐\周杰伦\xx.mp3 → 歌单「音乐」
 * 手选文件夹：整批归到当前文件夹名下的歌单
 */
const groupTracksByFolder = (tracks = []) => {
    const groups = new Map();
    const pushToGroup = (key, name, track) => {
        if (!groups.has(key)) groups.set(key, { key, name, tracks: [] });
        groups.get(key).tracks.push(track);
    };

    tracks.forEach((track) => {
        const filePath = String(track?.filePath || '');
        if (!filePath) {
            const name = currentSourceName.value || currentFolder.value?.name || '本地文件夹';
            pushToGroup(`folder:${currentFolderId.value || name}`, name, track);
            return;
        }

        const parts = filePath.split(/[\\/]+/).filter(Boolean); // ['D:', '音乐', '周杰伦', 'a.mp3']
        const drive = parts[0] || '';
        const firstDir = parts.length > 2 ? parts[1] : '';
        const name = firstDir || `${drive.replace(/:$/, '') || '磁盘'}盘根目录`;
        pushToGroup(`dir:${drive}\\${firstDir}`.toLowerCase(), name, track);
    });

    const list = [...groups.values()].sort((a, b) => b.tracks.length - a.tracks.length);
    if (list.length <= AUTO_PLAYLIST_MAX_GROUPS) return list;

    // 分组过多时只保留歌曲最多的若干组，剩下的并到「其他文件夹」
    const kept = list.slice(0, AUTO_PLAYLIST_MAX_GROUPS - 1);
    const rest = list.slice(AUTO_PLAYLIST_MAX_GROUPS - 1);
    kept.push({
        key: 'dir:__others__',
        name: '其他文件夹',
        tracks: rest.flatMap(group => group.tracks)
    });
    return kept;
};

/**
 * 扫描完成后同步「文件夹歌单」，让它和「现在还显示的歌」保持一致
 * - 被目录剔除、被音轨过滤的歌一律不进歌单
 * - 歌单名默认取文件夹名；用户改过名的歌单不再被覆盖
 * - 重复扫描时按最新结果覆盖曲目
 * - 歌曲全被剔除/过滤掉的自动歌单会被删掉（恢复后重新生成，不算用户手动删除）
 * - complete = true 表示 tracks 是一次没被取消的完整全盘扫描结果：
 *   结果里已经不存在的自动歌单一起清掉（文件夹从硬盘上删了、歌曲被并进「其他文件夹」等）
 */
let playlistSyncQueued = null;

const syncFolderPlaylists = async (tracks = [], { complete = false } = {}) => {
    if (!autoPlaylistEnabled.value || !isLocalMediaSupported()) return;
    // 上一轮还没写完：先记下，等它结束后用最新这一次再同步，后到的变更不会被丢掉
    if (syncingPlaylists.value) {
        playlistSyncQueued = { tracks, complete };
        return;
    }

    syncingPlaylists.value = true;
    try {
        const groups = groupTracksByFolder(tracks.filter(isShownInLibrary));
        const existing = await getLocalPlaylists();
        const deleted = readDeletedAutoPlaylists();
        const groupIds = new Set(groups.map(group => `${FOLDER_PLAYLIST_PREFIX}${hashString(group.key)}`));
        let created = 0;
        let removed = 0;

        for (const group of groups) {
            const id = `${FOLDER_PLAYLIST_PREFIX}${hashString(group.key)}`;
            if (deleted.includes(id)) continue;

            const current = existing.find(item => item.id === id);
            if (!current) created += 1;

            const keepCustomName = Boolean(current && current.autoName === false && current.name);
            await saveLocalPlaylist({
                id,
                name: keepCustomName ? current.name : group.name,
                autoName: !keepCustomName,
                autoGenerated: true,
                folderKey: group.key,
                createdAt: current?.createdAt || Date.now(),
                tracks: group.tracks.map(toPlaylistTrack)
            });
        }

        // 这次结果里没有的自动歌单
        for (const playlist of existing) {
            if (groupIds.has(playlist.id) || !playlist.autoGenerated) continue;

            const items = playlist.tracks || [];
            const autoNamed = playlist.autoName !== false;
            const allHidden = items.length > 0 && !items.some(isShownInLibrary);
            const gone = complete && autoNamed && String(playlist.folderKey || '').startsWith('dir:');

            if (!autoNamed || (!allHidden && !gone)) continue;
            await deleteLocalPlaylist(playlist.id);
            if (activePlaylistId.value === playlist.id) activePlaylistId.value = '';
            removed += 1;
        }

        await loadPlaylists();
        const summary = [];
        if (created > 0) summary.push(`按文件夹生成 ${created} 个歌单`);
        if (removed > 0) summary.push(`清理 ${removed} 个已剔除或已失效的文件夹歌单`);
        if (summary.length) {
            window.$message?.success?.(`歌单已自动更新：${summary.join('，')}`);
        }
    } catch (error) {
        console.error('[LocalMusic] 同步文件夹歌单失败:', error);
    } finally {
        syncingPlaylists.value = false;
    }

    if (playlistSyncQueued) {
        const next = playlistSyncQueued;
        playlistSyncQueued = null;
        await syncFolderPlaylists(next.tracks, next);
    }
};

/**
 * 目录剔除 / 音轨过滤发生变化后，让文件夹歌单按「现在还显示的歌」重新对齐。
 * 整块硬盘的缓存非空时按缓存对齐（和当前停留在哪个来源无关），手选文件夹的按当前列表对齐
 */
const syncPlaylistsAfterVisibilityChange = async () => {
    if (currentSourceKind.value === 'handle' && currentFolderId.value !== DISK_FOLDER_ID) {
        let diskTracks = [];
        try {
            diskTracks = await getMusicCacheRecords(DISK_FOLDER_ID);
        } catch {
            diskTracks = [];
        }
        if (diskTracks.length) await syncFolderPlaylists(diskTracks);
    }
    await syncFolderPlaylists(musicFiles.value);
};

const renamePlaylist = (playlist) => openPlaylistDialog('rename', playlist);

const removePlaylist = async (playlist) => {
    if (!playlist) return;
    const confirmed = await window.$modal?.confirm?.(`删除歌单「${playlist.name}」？\n（只删除歌单，不会删除硬盘上的音乐文件）`);
    if (!confirmed) return;

    await deleteLocalPlaylist(playlist.id);
    // 自动生成的歌单记住「已删除」，重新扫描时不再自动重建
    if (playlist.autoGenerated) {
        writeDeletedAutoPlaylists([...readDeletedAutoPlaylists(), playlist.id]);
    }
    if (activePlaylistId.value === playlist.id) activePlaylistId.value = '';
    await loadPlaylists();
    window.$message?.success?.(`已删除歌单「${playlist.name}」`);
};

const addTracksToPlaylist = async (playlist, tracks) => {
    if (!playlist || !tracks?.length) return;

    const existing = new Set((playlist.tracks || []).map(item => item.cacheKey));
    const added = tracks.filter(track => !existing.has(track.cacheKey)).map(toPlaylistTrack);

    if (added.length === 0) {
        window.$message?.info?.('这些歌曲已经在歌单中了');
        return;
    }

    await saveLocalPlaylist({ ...playlist, tracks: [...(playlist.tracks || []), ...added] });
    await loadPlaylists();
    window.$message?.success?.(`已添加 ${added.length} 首到「${playlist.name}」`);
};

const removeTrackFromPlaylist = async (playlist, track) => {
    const tracks = (playlist.tracks || []).filter(item => item.cacheKey !== track.cacheKey);
    await saveLocalPlaylist({ ...playlist, tracks });
    await loadPlaylists();
};

const playPlaylist = async (playlist) => {
    if (playlist?.builtin) {
        if (downloadTracks.value.length === 0) {
            window.$modal?.alert?.('下载歌单还是空的，先去下载几首歌曲吧');
            return;
        }
        await props.playerControl?.addLocalPlaylistToQueue?.(downloadTracks.value);
        return;
    }

    const tracks = playlistVisibleTracks(playlist).map(item => resolvePlaylistTrack(item)).filter(Boolean);

    if (tracks.length === 0) {
        window.$modal?.alert?.('这个歌单里的歌曲不在当前文件夹中，请先切换到对应文件夹再播放');
        return;
    }

    await props.playerControl?.addLocalPlaylistToQueue?.(tracks);
};

// 加入歌单浮层
const openPlaylistPicker = async (tracks) => {
    await loadPlaylists();
    playlistPicker.value = { visible: true, track: tracks.length === 1 ? tracks[0] : null, tracks };
};

const closePlaylistPicker = () => {
    playlistPicker.value = { visible: false, track: null, tracks: [] };
};

const choosePlaylist = async (playlist) => {
    await addTracksToPlaylist(playlist, playlistPicker.value.tracks);
    closePlaylistPicker();
};

const createPlaylistAndAdd = () => {
    const tracks = playlistPicker.value.tracks;
    closePlaylistPicker();
    openPlaylistDialog('create', null, tracks);
};

// 批量把选中歌曲加入歌单
const addSelectedToPlaylist = async () => {
    const tracks = selectedTracks.value.map(index => filteredTracks.value[index]).filter(Boolean);
    if (tracks.length === 0) return;
    await openPlaylistPicker(tracks);
    isBatchMenuVisible.value = false;
};

/* ---------------- 歌曲行菜单 ---------------- */

const showRowMenu = (event, track, items) => {
    event.preventDefault();
    const menuWidth = 190;
    const menuHeight = items.length * 36 + 16;
    rowMenu.value = {
        visible: true,
        x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 12)),
        y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 12)),
        track,
        items
    };
};

const buildOpenFolderItem = (track) => ({
    icon: 'fa-folder-open',
    label: '打开所在目录',
    action: () => openTrackFolder(track)
});

const openRowMenu = (event, track) => {
    const items = [
        { icon: 'fa-play', label: '播放', action: () => playSong(track) },
        { icon: 'fa-folder-plus', label: '加入歌单', action: () => openPlaylistPicker([track]) },
        { icon: 'fa-closed-captioning', label: '匹配歌词', action: () => runLyricsMatching([track]) },        ...(track?.filePath ? [buildOpenFolderItem(track)] : []),
        { icon: 'fa-unlink', label: '从列表移除', danger: true, action: () => removeTrackFromLibrary(track) }
    ];
    showRowMenu(event, track, items);
};

// 歌单详情里某一行的右键菜单
const openPlaylistTrackMenu = (event, item) => {
    const playlist = activePlaylist.value;
    const items = [
        { icon: 'fa-play', label: '播放', action: () => playPlaylistTrack(item) },
        { icon: 'fa-closed-captioning', label: '匹配歌词', action: () => matchSinglePlaylistTrack(item) },
        ...(item?.filePath ? [buildOpenFolderItem(item)] : []),
        ...(!playlist?.builtin
            ? [{ icon: 'fa-times', label: '从歌单移除', danger: true, action: () => removeTrackFromPlaylist(playlist, item) }]
            : [])
    ];
    showRowMenu(event, item, items);
};

const closeRowMenu = () => {
    rowMenu.value = { ...rowMenu.value, visible: false };
};

/** 打开歌曲所在的文件夹（仅扫描硬盘 / 下载歌单里的歌有绝对路径） */
const openTrackFolder = async (track) => {
    const filePath = track?.filePath;
    if (!filePath) {
        window.$message?.warning?.('这首歌没有记录磁盘路径（来自手选文件夹），无法定位到文件夹');
        return;
    }
    const ok = await showInFolder(filePath);
    if (!ok) {
        window.$message?.warning?.('打开所在目录失败，文件可能已被移动或删除');
    }
};

const toStoredTrack = (track) => {
    const { cover, filesize, ...rest } = toRaw(track);
    return rest;
};

// 仅从本地列表移除索引，不动硬盘文件
const removeTrackFromLibrary = async (track) => {
    closeRowMenu();
    const confirmed = await window.$modal?.confirm?.(`从本地音乐列表移除「${track.displayName || track.name}」？\n（只移除索引，不会删除硬盘上的文件）`);
    if (!confirmed) return;

    const nextTracks = musicFiles.value.filter(item => item.cacheKey !== track.cacheKey);
    applyMusicFiles(nextTracks);

    try {
        await saveMusicCache(currentFolderId.value, nextTracks.map(toStoredTrack));
    } catch (error) {
        console.error('[LocalMusic] 保存移除结果失败:', error);
    }

    if (searchQuery.value.trim()) {
        searchTracks();
    }
};

// 选择文件夹
const selectFolder = async () => {
    if (!checkFileSystemSupport()) return;

    try {
        loading.value = true;
        const dirHandle = await window.showDirectoryPicker();
        currentFolder.value = dirHandle;
        currentSourceKind.value = 'handle';
        currentSourceName.value = '';
        currentSourcePath.value = '';
        writeLastSource(null);

        // 保存句柄到 IndexedDB
        const folder = await saveFolderHandle(dirHandle);
        currentFolderId.value = folder?.id || '';

        const cacheLoaded = await loadMusicCache(currentFolderId.value);
        if (!cacheLoaded) {
            await scanMusicFiles(dirHandle, currentFolderId.value);
        }

        console.log(`已选择文件夹: ${dirHandle.name}`);
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('选择文件夹失败:', error);
        }
    } finally {
        loading.value = false;
    }
};

// 刷新文件夹 / 重新扫描当前来源
const refreshFolder = async () => {
    if (diskScanning.value) return;
    if (currentSourceKind.value === 'disk') {
        await scanWholeDisk({ skipConfirm: true });
        return;
    }
    if (currentSourceKind.value === 'downloads') {
        await loadDownloadPlaylist({ silent: false });
        return;
    }
    if (!currentFolder.value) return;

    try {
        refreshing.value = true;
        const handle = toRaw(currentFolder.value);
        const permission = await handle.queryPermission({ mode: 'read' });
        const nextPermission = permission === 'granted'
            ? permission
            : await handle.requestPermission({ mode: 'read' });
        if (nextPermission !== 'granted') {
            window.$modal?.alert('没有该文件夹的读取权限，请重新授权');
            return;
        }

        if (!currentFolderId.value) {
            const folder = await saveFolderHandle(handle);
            currentFolderId.value = folder?.id || '';
        }
        const stats = await scanMusicFiles(handle, currentFolderId.value);
        if (stats) {
            window.$message?.success?.(`扫描完成：共 ${stats.total} 首，新增 ${stats.added} 首，移除 ${stats.removed} 首`);
        }
        console.log('刷新完成');
    } catch (error) {
        console.error('刷新失败:', error);
    } finally {
        refreshing.value = false;
    }
};


/* ---------------- 真·全盘扫描 ---------------- */

const readLastSource = () => {
    try {
        return JSON.parse(localStorage.getItem(LAST_SOURCE_KEY) || 'null');
    } catch {
        return null;
    }
};

const writeLastSource = (source) => {
    try {
        if (!source) localStorage.removeItem(LAST_SOURCE_KEY);
        else localStorage.setItem(LAST_SOURCE_KEY, JSON.stringify(source));
    } catch (error) {
        console.warn('[LocalMusic] 保存音乐来源失败:', error);
    }
};

const applyDiskSource = (name, path = '') => {
    currentFolder.value = null;
    currentFolderId.value = DISK_FOLDER_ID;
    currentSourceKind.value = 'disk';
    currentSourceName.value = name;
    currentSourcePath.value = path;
    writeLastSource({ kind: 'disk', name, path });
};

const cancelCurrentScan = async () => {
    if (!diskScanning.value) return;
    await cancelDiskScan();
    window.$message?.info?.('已请求取消，正在收尾…');
};

/**
 * 真·全盘扫描：遍历所有磁盘 + 批量解析元数据
 */
const scanWholeDisk = async ({ skipConfirm = false } = {}) => {
    if (diskScanning.value) return;

    if (!isLocalMediaSupported()) {
        window.$modal?.alert?.('全盘扫描需要桌面客户端支持，网页版请使用「选择音乐文件夹」');
        return;
    }

    if (!skipConfirm) {
        const confirmed = await window.$modal?.confirm?.(
            '将遍历电脑上所有磁盘查找音乐文件（自动跳过系统目录）。\n首次扫描需要解析歌曲信息，文件较多时可能要几分钟，过程中可以随时取消；之后再次扫描会直接复用缓存。是否继续？'
        );
        if (!confirmed) return;
    }

    try {
        diskScanning.value = true;
        diskScanInfo.value = { phase: '正在遍历磁盘', scanned: 0, metaDone: 0, metaTotal: 0 };

        const cachedTracks = await getMusicCacheRecords(DISK_FOLDER_ID);
        const cachedMap = new Map(cachedTracks.map(track => [track.cacheKey, track]));

        const { files, canceled } = await scanAllDisks({
            onProgress: (payload) => {
                diskScanInfo.value = {
                    ...diskScanInfo.value,
                    phase: payload?.root ? `正在扫描 ${payload.root}` : '正在遍历磁盘',
                    scanned: payload?.scanned || 0
                };
            }
        });

        if (!files.length) {
            window.$message?.warning?.(canceled ? '扫描已取消，没有找到音乐文件' : '没有找到音乐文件');
            return;
        }

        diskScanInfo.value = {
            phase: canceled ? '扫描已取消，正在整理结果' : '正在解析歌曲信息',
            scanned: files.length,
            metaDone: 0,
            metaTotal: files.length
        };

        const tracks = await buildFsTracks(files, {
            folderId: DISK_FOLDER_ID,
            cached: cachedMap,
            onProgress: (done, total) => {
                diskScanInfo.value = { ...diskScanInfo.value, metaDone: done, metaTotal: total };
            }
        });

        await saveMusicCache(DISK_FOLDER_ID, tracks);
        applyDiskSource('整块硬盘', '');
        await loadMusicCache(DISK_FOLDER_ID);
        await refreshLyricsStatus();

        // 扫描完成后让文件夹歌单自动跟上最新结果（被取消的扫描只有一部分结果，不做清理）
        await syncFolderPlaylists(musicFiles.value, { complete: !canceled });

        window.$message?.success?.(`扫描完成：共找到 ${tracks.length} 首歌曲`);

        // 扫描完成后让用户逐个目录确认，把不要的目录剔除掉（「扫描更新」不打扰）
        if (!skipConfirm) void openDirReview('scan', tracks);
    } catch (error) {
        console.error('[LocalMusic] 全盘扫描失败:', error);
        window.$modal?.alert?.(`扫描失败：${error?.message || error}`);
    } finally {
        diskScanning.value = false;
        diskScanInfo.value = { phase: '正在遍历磁盘', scanned: 0, metaDone: 0, metaTotal: 0 };
    }
};

/* ---------------- 下载歌单（自动同步下载目录） ---------------- */

const loadDownloadPlaylist = async ({ silent = true } = {}) => {
    if (!isLocalMediaSupported() || downloadRefreshing.value) return;

    try {
        downloadRefreshing.value = true;
        const { files, directory } = await scanLocalDirectory();
        downloadDir.value = directory || '';
        const cachedTracks = await getMusicCacheRecords(DOWNLOAD_FOLDER_ID);

        if (!files.length) {
            downloadTracks.value = [];
            rawDownloadTracks.value = [];
            if (cachedTracks.length) await saveMusicCache(DOWNLOAD_FOLDER_ID, []);
            if (!silent) window.$message?.info?.('下载目录里还没有音乐');
            return;
        }

        const cachedMap = new Map(cachedTracks.map(track => [track.cacheKey, track]));
        const tracks = await buildFsTracks(files, { folderId: DOWNLOAD_FOLDER_ID, cached: cachedMap });

        const changed = tracks.length !== cachedTracks.length
            || tracks.some(track => !cachedMap.has(track.cacheKey))
            || cachedTracks.some(track => !tracks.find(next => next.cacheKey === track.cacheKey));

        if (changed) await saveMusicCache(DOWNLOAD_FOLDER_ID, tracks);

        releaseDownloadCoverUrls();
        rawDownloadTracks.value = sortMusicFiles(tracks);
        downloadTracks.value = sortMusicFiles(filterByMediaFilter(rawDownloadTracks.value).map(createRuntimeTrack));
        if (!silent) window.$message?.success?.(`下载歌单已同步：${tracks.length} 首`);
    } catch (error) {
        console.error('[LocalMusic] 同步下载歌单失败:', error);
        if (!silent) window.$modal?.alert?.(`同步下载歌单失败：${error?.message || error}`);
    } finally {
        downloadRefreshing.value = false;
    }
};

const releaseDownloadCoverUrls = () => {
    downloadTracks.value.forEach((track) => {
        const url = coverUrls.get(track.cacheKey);
        if (url) {
            URL.revokeObjectURL(url);
            coverUrls.delete(track.cacheKey);
        }
    });
};

const openDownloadPlaylist = async () => {
    libraryView.value = 'playlists';
    activePlaylistId.value = DOWNLOAD_PLAYLIST_ID;
    await loadDownloadPlaylist({ silent: true });
};


// 读取音频元数据
const readAudioMetadata = async (file) => {
    try {
        const metadata = await parseBlob(file);

        let coverBlob = null;

        // 提取封面图片
        if (metadata.common.picture && metadata.common.picture.length > 0) {
            const picture = metadata.common.picture[0];
            coverBlob = new Blob([picture.data], { type: picture.format });
        }

        return {
            title: file.name || '未知',
            artist: metadata.common.artist || '未知',
            album: metadata.common.album || '本地音乐',
            year: metadata.common.year || null,
            genre: metadata.common.genre ? metadata.common.genre.join(', ') : null,
            track: metadata.common.track ? metadata.common.track.no : null,
            duration: metadata.format.duration || 0,
            bitrate: metadata.format.bitrate || null,
            sampleRate: metadata.format.sampleRate || null,
            embeddedLyrics: extractEmbeddedLyrics(metadata.common.lyrics),
            coverBlob,
            coverState: coverBlob ? 'ready' : 'none'
        };
    } catch (error) {
        console.warn('parseBlob读取失败，跳过该歌曲:', error);
        return null;
    }
};

// 递归扫描目录
const scanDirectory = async (dirHandle, folderId, cachedTracks, files = [], parentPath = '', onProgress = null) => {
    try {
        // 先收集本目录条目：需要一次性知道有哪些 .lrc 才能和音频文件配对
        const entries = [];
        for await (const entry of dirHandle.values()) {
            entries.push(entry);
        }

        const lrcHandles = new Map();
        entries.forEach((entry) => {
            if (entry.kind === 'file' && /\.lrc$/i.test(entry.name)) {
                lrcHandles.set(entry.name.replace(/\.lrc$/i, '').toLowerCase(), entry);
            }
        });

        for (const entry of entries) {
            if (entry.kind === 'file') {
                const extension = '.' + getFileExtension(entry.name).toLowerCase();
                if (!supportedFormats.includes(extension)) continue;

                const file = await entry.getFile();
                const relativePath = parentPath ? `${parentPath}/${file.name}` : file.name;
                const cacheKey = `${folderId}:${relativePath}`;
                const cachedTrack = cachedTracks.get(cacheKey);
                const lrcHandle = lrcHandles.get(file.name.replace(/\.[^.]+$/, '').toLowerCase());

                if (onProgress) onProgress();

                const canReuseCache = cachedTrack
                    && cachedTrack.size === file.size
                    && cachedTrack.lastModified === file.lastModified
                    && cachedTrack.coverState !== 'stale';

                if (canReuseCache) {
                    files.push({
                        ...cachedTrack,
                        handle: entry,
                        lrcHandle: lrcHandle || cachedTrack.lrcHandle || null,
                        type: file.type || cachedTrack.type
                    });
                    continue;
                }

                // 读取音频元数据
                const metadata = await readAudioMetadata(file);

                if (metadata === null) {
                    console.log(`跳过无法解析的歌曲: ${file.name}`);
                    continue;
                }

                files.push({
                    cacheKey,
                    folderId,
                    relativePath,
                    hash: cachedTrack?.hash || `local_${cacheKey}`,
                    name: file.name,
                    displayName: metadata.title,
                    author: metadata.artist,
                    album: metadata.album,
                    year: metadata.year,
                    genre: metadata.genre,
                    track: metadata.track,
                    size: file.size,
                    lastModified: file.lastModified,
                    type: file.type,
                    handle: entry,
                    lrcHandle: lrcHandle || null,
                    embeddedLyrics: metadata.embeddedLyrics || '',
                    duration: metadata.duration,
                    timelen: metadata.duration * 1000, // 转换为毫秒
                    bitrate: metadata.bitrate,
                    sampleRate: metadata.sampleRate,
                    coverBlob: metadata.coverBlob,
                    coverState: metadata.coverState,
                    qualityInfo: getQualityInfo(extension, metadata.bitrate, metadata.sampleRate)
                });
            } else if (entry.kind === 'directory') {
                // 递归扫描子文件夹
                const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
                await scanDirectory(entry, folderId, cachedTracks, files, relativePath, onProgress);
            }
        }
    } catch (error) {
        console.error('扫描目录失败:', error);
        throw error;
    }

    return files;
};

// 扫描音乐文件
const scanMusicFiles = async (dirHandle, folderId) => {
    try {
        if (!folderId) throw new Error('无法确定本地音乐文件夹标识');
        const cachedTracks = await getMusicCacheRecords(folderId);
        const beforeKeys = new Set(cachedTracks.map(track => track.cacheKey));

        scanProgress.value = { active: true, done: 0, total: 0 };
        const onProgress = () => {
            scanProgress.value = { ...scanProgress.value, done: scanProgress.value.done + 1 };
        };

        // 递归扫描所有子文件夹
        const files = await scanDirectory(
            dirHandle,
            folderId,
            new Map(cachedTracks.map(track => [track.cacheKey, track])),
            [],
            '',
            onProgress
        );

        await saveMusicCache(folderId, files);
        applyMusicFiles(files);
        await refreshLyricsStatus();

        // 手选文件夹：扫描完成后按文件夹名生成/更新歌单
        await syncFolderPlaylists(musicFiles.value);

        const afterKeys = new Set(files.map(track => track.cacheKey));
        const added = files.filter(track => !beforeKeys.has(track.cacheKey)).length;
        const removed = cachedTracks.filter(track => !afterKeys.has(track.cacheKey)).length;
        return { added, removed, total: files.length };
    } catch (error) {
        console.error('扫描文件失败:', error);
        throw error;
    } finally {
        scanProgress.value = { active: false, done: 0, total: 0 };
    }
};

// 获取音质信息
const getQualityInfo = (extension, bitrate, sampleRate) => {
    // 无损格式
    if (['.flac', '.wav', '.ape', '.alac'].includes(extension)) {
        if (sampleRate >= 96000) {
            return { text: 'HR', class: 'hr-icon' }; // Hi-Res
        } else {
            return { text: 'SQ', class: 'sq-icon' }; // Studio Quality
        }
    }


    // 有损格式根据比特率判断
    if (bitrate) {
        if (bitrate >= 320) {
            return { text: 'HQ', class: 'hq-icon' }; // High Quality
        } else if (bitrate >= 192) {
            return { text: 'MQ', class: 'mq-icon' }; // Medium Quality
        }
    }

    // 特殊格式标识
    switch (extension) {
        case '.m4a':
        case '.aac':
            return { text: 'AAC', class: 'hq-icon' };
        case '.ogg':
            return { text: 'OGG', class: 'hq-icon' };
        default:
            return null;
    }
};

// 播放歌曲
const playSong = async (item) => {
    try {
        console.log('[LocalMusic] 开始播放本地音乐:', item.name);
        if (props.playerControl) {
            await props.playerControl.addLocalMusicToQueue(item);
        }
    } catch (error) {
        console.error('[LocalMusic] 播放本地音乐失败:', error);
        window.$modal?.alert('播放失败: ' + error.message);
    }
};

// 添加整个播放列表到队列
const addPlaylistToQueue = async (event, append = false) => {
    const playButton = event.currentTarget;
    const rect = playButton.getBoundingClientRect();
    const note = {
        id: noteId++,
        style: {
            '--start-x': `${rect.left + rect.width / 2}px`,
            '--start-y': `${rect.top + rect.height / 2}px`,
            'left': '0',
            'top': '0'
        }
    };
    flyingNotes.value.push(note);
    setTimeout(() => {
        flyingNotes.value = flyingNotes.value.filter(n => n.id !== note.id);
    }, 1500);

    if (props.playerControl) {
        console.log('[LocalMusic] 添加本地播放列表到队列:', filteredTracks.value.length, '首歌曲');
        await props.playerControl.addLocalPlaylistToQueue(filteredTracks.value, append);
    }
};

// 搜索歌曲
const searchTracks = () => {
    filteredTracks.value = musicFiles.value.filter(track =>
        track.name.toLowerCase().trim().includes(searchQuery.value.toLowerCase().trim()) ||
        track.author.toLowerCase().trim().includes(searchQuery.value.toLowerCase().trim())
    );
    bumpListVersion();
};

// 切换列表模式
const toggleListMode = () => {
    listMode.value = listMode.value === 'list' ? 'grid' : 'list';
    localStorage.setItem('localMusicListMode', listMode.value);
};

// 格式化文件大小
const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 格式化时长
const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 获取文件扩展名
const getFileExtension = (filename) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

// 滚动到当前播放歌曲
const scrollToTrackIndex = async (index) => {
    await nextTick();
    const scrollContainer = document.querySelector('.app-main-scroll');
    const scrollerElement = recycleScrollerRef.value?.$el;
    if (!scrollContainer || !scrollerElement) return;

    const targetIndex = Math.max(0, index - 5);
    const itemSize = listMode.value === 'list' ? 50 : 70;
    const offsetTop = scrollContainer.scrollTop + scrollerElement.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top;

    scrollContainer.scrollTo({
        top: Math.max(0, offsetTop + targetIndex * itemSize),
        behavior: 'smooth'
    });
};

const scrollToItem = async () => {
    const currentIndex = filteredTracks.value.findIndex(song => song.name === props.playerControl?.currentSong.name);
    if (currentIndex !== -1) {
        await scrollToTrackIndex(currentIndex);
    }
};

const handleClickOutside = (event) => {
    const batchActionsMenu = document.querySelector('.batch-actions-menu');
    const batchActionBtn = document.querySelector('.batch-action-btn');
    if (batchActionsMenu && !batchActionsMenu.contains(event.target) && !batchActionBtn.contains(event.target)) {
        isBatchMenuVisible.value = false;
    }

    const folderHistoryContainer = document.querySelector('.folder-history-container');
    if (folderHistoryContainer && !folderHistoryContainer.contains(event.target)) {
        isFolderHistoryVisible.value = false;
    }

    const moreContainer = document.querySelector('.more-actions-container');
    if (moreContainer && !moreContainer.contains(event.target)) {
        closeMoreMenu();
        durationFilterPanel.value = false;
    }

    const rowMenuEl = document.querySelector('.local-row-menu');
    if (rowMenuEl && !rowMenuEl.contains(event.target)) {
        closeRowMenu();
    }
};

// 切换批量选择模式
const toggleBatchSelection = () => {
    if (batchSelectionMode.value) {
        if (isBatchMenuVisible.value) {
            batchSelectionMode.value = false;
            isBatchMenuVisible.value = false;
            selectedTracks.value = [];
            lastSelectedIndex = -1;
        } else {
            isBatchMenuVisible.value = true;
        }
    } else {
        batchSelectionMode.value = true;
        isBatchMenuVisible.value = false;
    }
};

// 选择/取消选择歌曲
const selectTrack = (index, event) => {
    if (event.shiftKey && lastSelectedIndex !== -1) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);

        for (let i = start; i <= end; i++) {
            if (!selectedTracks.value.includes(i)) {
                selectedTracks.value.push(i);
            }
        }
    } else if (event.ctrlKey || event.metaKey) {
        const existingIndex = selectedTracks.value.indexOf(index);
        if (existingIndex === -1) {
            selectedTracks.value.push(index);
        } else {
            selectedTracks.value.splice(existingIndex, 1);
        }
    } else {
        const existingIndex = selectedTracks.value.indexOf(index);
        if (existingIndex === -1) {
            selectedTracks.value = [index];
        } else {
            selectedTracks.value = [];
        }
    }

    lastSelectedIndex = index;
};

// 将选中歌曲添加到播放队列
const appendSelectedToQueue = async () => {
    if (selectedTracks.value.length === 0) return;
    const selectedSongs = selectedTracks.value.map(index => filteredTracks.value[index]);
    if (props.playerControl) {
        console.log('[LocalMusic] 添加选中的本地歌曲到播放列表:', selectedSongs.length, '首');
        await props.playerControl.addLocalPlaylistToQueue(selectedSongs, true);
        console.log('[LocalMusic] 选中歌曲添加到播放列表成功');
    }
    isBatchMenuVisible.value = false;
    // 清空选择
    selectedTracks.value = [];
};

// 切换全选/取消全选
const toggleSelectAll = () => {
    if (isAllSelected.value) {
        selectedTracks.value = [];
    } else {
        selectedTracks.value = Array.from({ length: filteredTracks.value.length }, (_, i) => i);
    }
};

// 根据字段排序
const sortTracks = (field) => {
    if (sortField.value === field) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortField.value = field;
        sortOrder.value = 'asc';
    }

    filteredTracks.value = [...filteredTracks.value].sort((a, b) => {
        let valueA, valueB;

        if (field === 'timelen') {
            valueA = a.duration || 0;
            valueB = b.duration || 0;
        } else if (field === 'size') {
            valueA = a.size || 0;
            valueB = b.size || 0;
        } else {
            valueA = (a[field] || '').toLowerCase();
            valueB = (b[field] || '').toLowerCase();
        }

        if (sortOrder.value === 'asc') {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });

    if (batchSelectionMode.value) {
        selectedTracks.value = [];
    }
    bumpListVersion();
};

const getSortIconClass = (field) => {
    if (sortField.value !== field) {
        return 'fa-sort';
    }
    return sortOrder.value === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
};
</script>

<style lang="scss" scoped>
.detail-page {
    padding: 20px;
}

.header {
    display: flex;
    align-items: center;
}

.detail-sliver-header {
    position: sticky;
    z-index: 116;
    box-sizing: border-box;
    overflow: visible;
    align-items: flex-start;
    padding: 10px 0;
    background: #fff;
    gap: 20px;
}

.detail-sliver-spacer {
    pointer-events: none;
    background: #fff;
}

.cover-art {
    flex: 0 0 auto;
    width: 200px;
    height: 200px;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    object-fit: cover;
    transition: box-shadow 0.2s ease;
}

.info {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    max-width: calc(100% - 110px);
}

.title {
    flex: 0 0 auto;
    font-size: 36px;
    font-weight: bold;
    width: 100%;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 0;
    color: var(--primary-color);
}

.expanded-info {
    display: flex;
    flex-direction: column;
    transition: opacity 0.12s linear;
}

.collapsed-play-btn {
    position: absolute;
    top: 50%;
    right: 18px;
    width: 38px;
    height: 38px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--primary-color);
    cursor: pointer;
    font-size: 30px;
    line-height: 1;
    transition: color 0.2s ease, opacity 0.2s ease;

    &:hover {
        color: var(--color-primary);
    }
}

.subtitle {
    font-size: 18px;
    line-height: 1.35;
    margin: 6px 0 0;
    color: #666;
}

.folder-info {
    margin: 8px 0;
}

.folder-path {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #666;
    font-size: 14px;
    max-width: 720px;

    i {
        color: var(--primary-color);
    }

    .source-path {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        opacity: 0.72;
        font-size: 12px;
    }
}

.description {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-height: 1.45;
    color: var(--text-color);
    margin: 0 0 12px;
    font-size: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .primary-btn,
    .upload-btn {
        padding: 8px 14px;
        font-size: 13px;

        i {
            margin-right: 4px;
        }
    }
}

.folder-history-container {
    position: relative;
}

.folder-history-menu {
    position: absolute;
    top: 100%;
    left: 0;
    width: 220px;
    max-height: 320px;
    overflow-y: auto;
    margin-top: 6px;
    padding: 6px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
    z-index: 50;
}

.folder-history-item {
    display: flex;
    align-items: center;
    border-radius: 5px;

    &:hover,
    &.active {
        background: rgba(var(--primary-color-rgb), 0.1);
    }
}

.folder-history-name,
.folder-history-delete {
    border: none;
    background: transparent;
    color: var(--text-color);
    cursor: pointer;
}

.folder-history-name {
    flex: 1;
    min-width: 0;
    padding: 9px 8px;
    display: flex;
    align-items: center;
    gap: 8px;

    span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    i {
        color: var(--primary-color);
        flex-shrink: 0;
    }
}

.folder-history-delete {
    width: 30px;
    height: 30px;
    border-radius: 4px;
    flex-shrink: 0;

    &:hover {
        color: #f56c6c;
    }
}

.primary-btn,
.upload-btn {
    background-color: var(--primary-color);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
}

.upload-btn {
    background-color: var(--primary-color);
}

.upload-btn.ghost {
    color: var(--text-color);
    background-color: rgba(128, 128, 128, 0.14);
}

.upload-btn.is-on {
    color: #fff;
    background-color: var(--primary-color);
}

.primary-btn,
.upload-btn {
    i {
        margin-right: 5px;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
}

/* 更多菜单 */
.more-actions-container {
    position: relative;
}

.more-actions-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 300;
    min-width: 224px;
    padding: 6px;
    border-radius: 10px;
    background: var(--background-color, #fff);
    border: 1px solid rgba(128, 128, 128, 0.24);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
    display: flex;
    flex-direction: column;

    button {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 8px 10px;
        border: none;
        border-radius: 7px;
        background: transparent;
        color: var(--text-color);
        font-size: 13px;
        text-align: left;
        white-space: nowrap;
        cursor: pointer;

        &:hover {
            background: rgba(128, 128, 128, 0.14);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        i {
            width: 14px;
            text-align: center;
            opacity: 0.8;
        }
    }

    .more-menu-label {
        padding: 8px 10px 2px;
        font-size: 12px;
        opacity: 0.55;
    }
}

.more-folder-item {
    display: flex;
    align-items: center;
    border-radius: 7px;

    &:hover {
        background: rgba(128, 128, 128, 0.14);
    }

    &.active .more-folder-name {
        color: var(--primary-color);
    }

    .more-folder-name {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 8px 10px;
        border: none;
        background: transparent;
        color: var(--text-color);
        font-size: 13px;
        text-align: left;
        cursor: pointer;

        span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        i {
            width: 14px;
            text-align: center;
            opacity: 0.8;
        }
    }

    .more-folder-delete {
        padding: 6px 8px;
        border: none;
        background: transparent;
        color: var(--text-color);
        opacity: 0.45;
        cursor: pointer;

        &:hover {
            opacity: 1;
            color: #e5484d;
        }
    }
}

/* 时长过滤设置 */
.duration-filter-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 301;
    width: 264px;
    padding: 12px;
    border-radius: 10px;
    background: var(--background-color, #fff);
    border: 1px solid rgba(128, 128, 128, 0.24);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);

    .df-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-color);

        .df-close {
            border: none;
            background: transparent;
            color: var(--text-color);
            opacity: 0.5;
            cursor: pointer;

            &:hover {
                opacity: 1;
            }
        }
    }

    .df-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--text-color);
        margin-bottom: 8px;

        input[type='number'] {
            width: 70px;
            padding: 4px 8px;
            border: 1px solid rgba(128, 128, 128, 0.35);
            border-radius: 6px;
            background: transparent;
            color: var(--text-color);
        }
    }

    .df-hint {
        margin: 0 0 10px;
        font-size: 12px;
        line-height: 1.5;
        color: var(--text-color);
        opacity: 0.6;
    }

    .df-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;

        .primary-btn,
        .upload-btn {
            padding: 6px 14px;
            font-size: 13px;
        }
    }
}

.track-list-container {
}

.track-list-header {
    position: sticky;
    z-index: 115;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
}

.track-list-title {
    font-size: 24px;
    font-weight: bold;
    color: var(--primary-color);
}

.track-list-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.batch-action-container {
    position: relative;
}

.batch-action-btn {
    background-color: transparent;
    border: 1px solid var(--secondary-color);
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color);
    position: relative;

    &.active {
        background-color: var(--primary-color);
        color: white;
    }
}

.selected-count {
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: red;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
}

.batch-actions-menu {
    position: absolute;
    top: 100%;
    left: 0;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 50;
    margin-top: 5px;
    width: 200px;

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    li {
        padding: 10px 15px;
        cursor: pointer;
        display: flex;
        align-items: center;
        white-space: nowrap;

        i {
            margin-right: 10px;
            width: 16px;
            text-align: center;
        }

        &:hover {
            background-color: #f0f0f0;
        }
    }
}

.view-mode-btn {
    background-color: transparent;
    border: 1px solid var(--secondary-color);
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color);
    width: 36px;
    height: 31px;
    transition: all 0.3s ease;

    &:hover {
        background-color: rgba(var(--primary-color-rgb), 0.1);
    }

    i {
        font-size: 16px;
    }
}

.search-input {
    width: 250px;
    padding: 8px;
    border: 1px solid var(--secondary-color);
    border-radius: 20px;
    box-sizing: border-box;
    padding-left: 15px;
}

.track-list {
    width: 100%;
}

.li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 50px;
    padding: 10px;
    box-sizing: border-box;
    border-bottom: 1px solid #eee;
    border-radius: 5px;
    cursor: pointer;

    &:hover {
        border: none;
        background-color: var(--background-color);
    }

    &.selected {
        background-color: rgba(var(--primary-color-rgb), 0.1);
    }

    &.cover-view {
        height: 70px;
        padding: 5px 10px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid #eee;
        border-radius: 5px;

        &:hover {
            background-color: var(--background-color);
        }

        .track-title {
            flex: 2;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .track-artist {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 10px;
        }

        .track-album {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 10px;
        }

        .track-size {
            flex: 0.5;
            text-align: center;
        }

        .track-timelen {
            width: 95px;
            text-align: right;
        }

        .track-checkbox,
        .track-number {
            margin-right: 10px;
            width: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }
}

.track-checkbox {
    margin-right: 10px;
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.track-number {
    font-weight: bold;
    margin-right: 10px;
    width: 30px;
}

.track-title {
    flex: 2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.track-size {
    flex: 0.5;
    text-align: center;
}

.track-artist {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 10px;
}

.track-album {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 10px;
}

.icon {
    margin-left: 5px;
    border: 1px solid;
    border-radius: 5px;
    font-size: 10px;
    padding-left: 6px;
    padding-right: 6px;
}

.hq-icon {
    color: #0094ff;
    border-color: #0094ff;
}

.hr-icon {
    color: #ff6d00;
    border-color: #ff6d00;
}

.queue-play-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--primary-color);
    cursor: pointer;
}

.location-arrow {
    position: fixed;
    bottom: 168px;
    right: 14px;
    z-index: 110;
    cursor: pointer;
    font-size: 20px;
    color: var(--primary-color);
}

.note-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    overflow: hidden;
}

.flying-note {
    position: absolute;
    font-size: 36px;
    color: var(--primary-color);
    pointer-events: none;
    transform-origin: center;
}

.fly-note-enter-active {
    animation: fly-note 2s ease-out forwards;
}

.fly-note-leave-active {
    animation: fly-note 2s ease-out forwards;
}

@keyframes fly-note {
    0% {
        transform: translate(var(--start-x), calc(var(--start-y) - 50px)) rotate(0deg) scale(1.2);
        opacity: 0.9;
    }

    20% {
        transform: translate(calc(var(--start-x) + 20px), calc(var(--start-y) - 70px)) rotate(45deg) scale(1.3);
        opacity: 0.85;
    }

    100% {
        transform: translate(80vw, 100vh) rotate(360deg) scale(0.6);
        opacity: 0;
    }
}

.track-list-header-row {
    position: sticky;
    z-index: 114;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background: #fff;
    border-bottom: 1px solid var(--primary-color);
    font-weight: bold;
}

.track-checkbox-header {
    margin-right: 10px;
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.track-number-header {
    font-weight: bold;
    margin-right: 10px;
    width: 30px;
}

.track-title-header,
.track-artist-header,
.track-timelen-header,
.track-size-header {
    cursor: pointer;
    display: flex;
    align-items: center;
}

.track-title-header {
    flex: 2;

    i {
        margin-left: 5px;
        font-size: 14px;
    }
}

.track-size-header {
    flex: 0.5;
    padding: 0 10px;

    i {
        margin-left: 5px;
        font-size: 14px;
    }
}

.track-artist-header {
    flex: 1;
    padding: 0 10px;

    i {
        margin-left: 5px;
        font-size: 14px;
    }
}

.track-album-header {
    flex: 1;
    padding: 0 10px;

    i {
        margin-left: 5px;
        font-size: 14px;
    }
}

.track-timelen-header {
    text-align: right;

    i {
        margin-left: 5px;
        font-size: 14px;
    }
}

.track-cover {
    position: relative;
    width: 50px;
    height: 50px;
    margin-right: 15px;
    overflow: hidden;
    border-radius: 4px;
    flex-shrink: 0;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
    }
}

.li.cover-view:hover .track-cover img {
    transform: scale(1.05);
}

.track-cover-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
}

.li.cover-view:hover .track-cover-overlay {
    opacity: 1;
}

.track-cover-overlay.playing {
    opacity: 1;
}

.empty-state,
.welcome-state {
    text-align: center;
    padding: 60px 20px;
    color: #666;

    i {
        font-size: 48px;
        color: #ddd;
        margin-bottom: 20px;
    }
}

.welcome-state {
    h3 {
        margin: 0px 0 10px;
        color: #333;
    }

    p {
        margin-bottom: 30px;
        color: #666;
    }
}

.hint {
    font-size: 12px;
    color: #999;
    margin-top: 10px;
}

.loading-state {
    text-align: center;
    padding: 60px 20px;
    color: #666;

    p {
        margin-top: 20px;
    }
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

/* ===== 新增：扫描进度 / 本地歌单 / 歌词匹配 ===== */
.scan-progress {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin: 10px 0 4px;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-color);
    background: rgba(128, 128, 128, 0.12);

    .scan-cancel {
        margin-left: auto;
        padding: 4px 12px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        color: #fff;
        background: rgba(231, 76, 60, 0.86);

        &:hover {
            background: rgba(231, 76, 60, 1);
        }
    }
}

.playlist-card.builtin .playlist-cover {
    color: #fff;
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.playlist-card.builtin .playlist-meta h3::after {
    content: '自动同步';
    margin-left: 8px;
    padding: 1px 6px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 500;
    color: var(--primary-color);
    background: rgba(128, 128, 128, 0.16);
    vertical-align: middle;
}

.lyric-badge {
    margin-left: 6px;
    font-size: 12px;
    color: var(--primary-color);
    opacity: 0.85;
}

.playlist-view {
    padding: 6px 0 30px;
}

.playlist-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
        color: var(--text-color);
    }
}

.playlist-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 18px;
}

.playlist-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    border-radius: 12px;
    cursor: pointer;
    background: rgba(128, 128, 128, 0.1);
    transition: transform 0.18s ease, background 0.18s ease;

    &:hover {
        transform: translateY(-2px);
        background: rgba(128, 128, 128, 0.16);

        .playlist-actions {
            opacity: 1;
        }
    }
}

.playlist-cover {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    height: 120px;
    border-radius: 10px;
    font-size: 40px;
    color: var(--primary-color);
    background: rgba(128, 128, 128, 0.16);

    span {
        position: absolute;
        right: 10px;
        bottom: 8px;
        font-size: 12px;
        color: var(--text-color);
        opacity: 0.75;
    }

    &.new {
        border: 1px dashed rgba(128, 128, 128, 0.5);
        background: transparent;
    }
}

.playlist-meta {
    min-width: 0;

    h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: var(--text-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    p {
        margin: 4px 0 0;
        font-size: 12px;
        color: var(--text-color);
        opacity: 0.6;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

.playlist-actions {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.18s ease;

    button {
        width: 26px;
        height: 26px;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 11px;
        color: #fff;
        background: rgba(0, 0, 0, 0.55);

        &:hover {
            background: var(--primary-color);
        }
    }
}

.playlist-empty,
.playlist-hint {
    margin: 18px 0 0;
    font-size: 13px;
    color: var(--text-color);
    opacity: 0.65;
}

.playlist-detail-head {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 12px;
}

.playlist-detail-title {
    flex: 1;
    min-width: 0;

    h2 {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
        color: var(--text-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    p {
        margin: 2px 0 0;
        font-size: 12px;
        color: var(--text-color);
        opacity: 0.6;
    }
}

.playlist-detail-actions {
    display: flex;
    gap: 10px;
}

.playlist-track-list {
    max-height: calc(100vh - 320px);
    overflow-y: auto;
    border-radius: 10px;
    background: rgba(128, 128, 128, 0.06);
}

.playlist-track {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 14px;
    border-bottom: 1px solid rgba(128, 128, 128, 0.12);
    cursor: pointer;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: rgba(128, 128, 128, 0.12);
    }

    &.playing {
        background: rgba(128, 128, 128, 0.16);

        .playlist-track-name,
        .playlist-track-index {
            color: var(--primary-color);
            opacity: 1;
        }
    }
}

.playlist-track-index {
    width: 24px;
    font-size: 12px;
    text-align: center;
    color: var(--text-color);
    opacity: 0.5;
}

.playlist-track-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.playlist-track-name {
    font-size: 14px;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.playlist-track-author {
    font-size: 12px;
    color: var(--text-color);
    opacity: 0.6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.playlist-track-remove {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-color);
    opacity: 0.5;

    &:hover {
        opacity: 1;
        color: var(--primary-color);
    }
}

.playlist-track-duration {
    width: 46px;
    flex: 0 0 auto;
    text-align: right;
    font-size: 12px;
    color: var(--text-color);
    opacity: 0.55;
}

/* 歌曲行右键菜单 */
.local-row-menu {
    position: fixed;
    z-index: 3000;
    display: flex;
    flex-direction: column;
    min-width: 168px;
    padding: 6px;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
    background: var(--background-color, #fff);
    border: 1px solid rgba(128, 128, 128, 0.2);

    button {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 8px 10px;
        border: none;
        border-radius: 7px;
        font-size: 13px;
        text-align: left;
        cursor: pointer;
        color: var(--text-color);
        background: transparent;

        &:hover {
            background: rgba(128, 128, 128, 0.14);
        }

        &.danger:hover {
            color: #e5484d;
        }

        i {
            width: 14px;
            font-size: 12px;
            opacity: 0.75;
        }
    }
}

/* 加入歌单浮层 */
.playlist-picker-mask {
    position: fixed;
    inset: 0;
    z-index: 3100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.35);
}

.playlist-picker {
    width: 360px;
    max-width: calc(100vw - 40px);
    padding: 18px;
    border-radius: 14px;
    background: var(--background-color, #fff);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
}

.playlist-picker-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 12px;

    h3 {
        margin: 0;
        font-size: 17px;
        color: var(--text-color);
    }

    span {
        font-size: 12px;
        color: var(--text-color);
        opacity: 0.6;
    }
}

.playlist-picker-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 300px;
    overflow-y: auto;
}

.playlist-picker-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: none;
    border-radius: 9px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-color);
    background: rgba(128, 128, 128, 0.1);

    &:hover {
        background: rgba(128, 128, 128, 0.2);
    }

    .name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: left;
    }

    .count {
        font-size: 12px;
        opacity: 0.6;
    }
}

.playlist-picker-empty {
    margin: 12px 0;
    text-align: center;
    font-size: 13px;
    color: var(--text-color);
    opacity: 0.6;
}

.playlist-picker-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
}

.playlist-name-input {
    width: 100%;
    box-sizing: border-box;
    margin-top: 4px;
    padding: 10px 12px;
    border-radius: 9px;
    border: 1px solid rgba(128, 128, 128, 0.35);
    background: transparent;
    color: var(--text-color);
    font-size: 14px;
    outline: none;

    &:focus {
        border-color: var(--primary-color);
    }
}

/* 目录剔除弹窗 */
.dir-review-dialog {
    box-sizing: border-box;
    width: 680px;
    max-width: calc(100% - 32px);
    // 弹层相对页面内容区定位（不含顶栏/播放栏），所以按父容器算高度，而不是整个窗口
    max-height: calc(100% - 24px);
    display: flex;
    flex-direction: column;
}

.dir-review-hint {
    margin: 0 0 10px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-color);
    opacity: 0.62;
}

.dir-review-summary {
    display: flex;
    gap: 18px;
    margin-bottom: 10px;
    font-size: 13px;
    color: var(--text-color);

    i {
        margin-right: 5px;
        opacity: 0.7;
    }

    &.has-dropped span:last-child {
        color: #e0405a;
        font-weight: 600;

        i {
            opacity: 1;
        }
    }
}

.dir-review-tools {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;

    .upload-btn {
        white-space: nowrap;
    }
}

.dir-review-search {
    flex: 1;
    min-width: 0;
}

.dir-review-list {
    flex: 1 1 auto;
    min-height: 120px;
    overflow-y: auto;
    padding: 6px 0;
    border: 1px solid rgba(128, 128, 128, 0.28);
    border-radius: 10px;
}

.dir-row {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding-right: 12px;
    font-size: 13px;
    white-space: nowrap;
    color: var(--text-color);

    &:hover {
        background: rgba(128, 128, 128, 0.12);
    }

    &.track {
        font-size: 12px;
        opacity: 0.66;
    }

    &.more {
        font-size: 12px;
        opacity: 0.5;
    }

    &.dir.excluded {

        .dir-name,
        .dir-count {
            opacity: 0.45;
            text-decoration: line-through;
        }

        .dir-icon {
            opacity: 0.3;
        }
    }
}

.dir-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    padding: 0;
    border: none;
    background: none;
    color: var(--text-color);
    opacity: 0.7;
    cursor: pointer;

    &:disabled {
        cursor: default;
        opacity: 0.25;
    }

    .fa-circle {
        font-size: 5px;
    }
}

.dir-check {
    display: inline-flex;
    align-items: center;
    margin: 0;
    cursor: pointer;

    input {
        width: 15px;
        height: 15px;
        margin: 0;
        accent-color: var(--primary-color);
        cursor: pointer;
    }

    &.disabled,
    &.disabled input {
        cursor: not-allowed;
        opacity: 0.4;
    }
}

.dir-icon {
    flex-shrink: 0;
    opacity: 0.6;
}

.dir-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dir-count {
    font-size: 12px;
    opacity: 0.55;
}

.dir-track-name {
    overflow: hidden;
    text-overflow: ellipsis;
}

.dir-track-author {
    flex-shrink: 0;
    font-size: 11px;
    opacity: 0.6;
}

.dir-more {
    font-size: 12px;
    opacity: 0.5;
}
</style>

/**
 * 本地音乐的 IndexedDB 统一入口
 * 之前 views/LocalMusic.vue 内部自己 open 数据库，版本号写死在组件里；
 * 这里集中管理，新增「本地歌单」「歌词缓存」两个 store，避免多处打开版本冲突。
 */
export const LOCAL_DB_NAME = 'LocalMusicDB';
export const LOCAL_DB_VERSION = 4;

export const LOCAL_STORE = {
    folder: 'folderHandles',
    track: 'musicTracks',
    playlist: 'localPlaylists',
    lyrics: 'trackLyrics',
    cover: 'trackCovers'
};

export const TRACK_FOLDER_INDEX = 'folderId';
export const LYRICS_CACHE_INDEX = 'cacheKey';

let dbPromise = null;

/** 打开数据库（不带版本号）只为读一下现有版本号，读完即关 */
const readExistingVersion = () => new Promise((resolve) => {
    try {
        const request = indexedDB.open(LOCAL_DB_NAME);
        request.onsuccess = () => {
            const version = request.result.version;
            request.result.close();
            resolve(version);
        };
        request.onerror = () => resolve(0);
        request.onblocked = () => resolve(0);
    } catch {
        resolve(0);
    }
});

/**
 * 实际使用的版本号：代码版本与库里现有版本取大。
 * 库版本可能比代码里的高（热更新中断后自愈补版本、从新版回退到旧版），低于现有版本打开会报 VersionError。
 */
const pickVersion = async () => {
    const existing = await readExistingVersion();
    return Math.max(LOCAL_DB_VERSION, existing || 0);
};

export const openLocalMusicDb = async (version = null) => {
    if (dbPromise) return dbPromise;

    dbPromise = (async () => {
        const targetVersion = version || await pickVersion();

        const db = await new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject(new Error('IndexedDB is not available'));
                return;
            }

            const request = indexedDB.open(LOCAL_DB_NAME, targetVersion);

            request.onupgradeneeded = () => {
                const db = request.result;

                if (!db.objectStoreNames.contains(LOCAL_STORE.folder)) {
                    db.createObjectStore(LOCAL_STORE.folder, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(LOCAL_STORE.track)) {
                    const trackStore = db.createObjectStore(LOCAL_STORE.track, { keyPath: 'cacheKey' });
                    trackStore.createIndex(TRACK_FOLDER_INDEX, TRACK_FOLDER_INDEX);
                }

                if (!db.objectStoreNames.contains(LOCAL_STORE.playlist)) {
                    db.createObjectStore(LOCAL_STORE.playlist, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(LOCAL_STORE.lyrics)) {
                    const lyricsStore = db.createObjectStore(LOCAL_STORE.lyrics, { keyPath: 'hash' });
                    lyricsStore.createIndex(LYRICS_CACHE_INDEX, LYRICS_CACHE_INDEX);
                }

                // v4：本地歌曲的在线封面匹配结果（cover 为空表示没找到，避免重复请求）
                if (!db.objectStoreNames.contains(LOCAL_STORE.cover)) {
                    db.createObjectStore(LOCAL_STORE.cover, { keyPath: 'cacheKey' });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        // 极端情况：版本号到了但表没建全（热更新时中断等），关掉连接再升一个版本补建
        const missing = Object.values(LOCAL_STORE).filter(name => !db.objectStoreNames.contains(name));
        if (missing.length) {
            const nextVersion = db.version + 1;
            db.close();
            dbPromise = null;
            return await openLocalMusicDb(nextVersion);
        }

        // 页面热更新等场景下版本变化时主动关掉旧连接，避免 upgrade 被阻塞
        db.onversionchange = () => {
            db.close();
            dbPromise = null;
        };
        return db;
    })().catch(error => {
        dbPromise = null;
        throw error;
    });

    return dbPromise;
};

const toPromise = (request) => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

export const getAllRecords = async (storeName) => {
    const db = await openLocalMusicDb();
    return toPromise(db.transaction([storeName], 'readonly').objectStore(storeName).getAll());
};

export const getRecord = async (storeName, key) => {
    const db = await openLocalMusicDb();
    return toPromise(db.transaction([storeName], 'readonly').objectStore(storeName).get(key));
};

export const putRecord = async (storeName, value) => {
    const db = await openLocalMusicDb();
    return toPromise(db.transaction([storeName], 'readwrite').objectStore(storeName).put(value));
};

export const deleteRecord = async (storeName, key) => {
    const db = await openLocalMusicDb();
    return toPromise(db.transaction([storeName], 'readwrite').objectStore(storeName).delete(key));
};

export const getAllByIndex = async (storeName, indexName, value) => {
    const db = await openLocalMusicDb();
    const store = db.transaction([storeName], 'readonly').objectStore(storeName);
    if (!store.indexNames.contains(indexName)) return [];
    return toPromise(store.index(indexName).getAll(value));
};

/* ---------------- 本地歌单 ---------------- */

const sortPlaylists = (playlists = []) =>
    [...playlists].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

export const getLocalPlaylists = async () => sortPlaylists(await getAllRecords(LOCAL_STORE.playlist));

export const saveLocalPlaylist = async (playlist) => {
    const next = {
        ...playlist,
        updatedAt: Date.now()
    };
    await putRecord(LOCAL_STORE.playlist, next);
    return next;
};

export const deleteLocalPlaylist = (id) => deleteRecord(LOCAL_STORE.playlist, id);

/* ---------------- 歌词缓存 ---------------- */

export const getStoredLyrics = (hash) => (hash ? getRecord(LOCAL_STORE.lyrics, hash) : Promise.resolve(null));

export const getAllStoredLyrics = () => getAllRecords(LOCAL_STORE.lyrics);

export const getLyricsByCacheKey = async (cacheKey) => {
    if (!cacheKey) return null;
    const records = await getAllByIndex(LOCAL_STORE.lyrics, LYRICS_CACHE_INDEX, cacheKey);
    return records?.[0] || null;
};

export const saveStoredLyrics = (record) => putRecord(LOCAL_STORE.lyrics, record);

export const deleteStoredLyrics = (hash) => deleteRecord(LOCAL_STORE.lyrics, hash);

/* ---------------- 封面匹配缓存 ---------------- */

export const getStoredCover = (cacheKey) => (cacheKey ? getRecord(LOCAL_STORE.cover, cacheKey) : Promise.resolve(null));

export const getAllStoredCovers = () => getAllRecords(LOCAL_STORE.cover);

export const saveStoredCover = (record) => putRecord(LOCAL_STORE.cover, record);

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { get } from '@/utils/request';

const LIKED_MAX_PAGES = 10;
const LIKED_PAGE_SIZE = 300;

export const useLikeStore = defineStore('like-store', () => {
	const likedHashes = ref([]);
	const likedSet = ref(new Set());
	const likedFileIds = ref({});
	const lastLoadedLikeId = ref('');
	const loading = ref(false);

	const isLiked = (hash) => !!hash && likedSet.value.has(hash);

	const getFileId = (hash) => likedFileIds.value[hash] || null;

	const addLikedHashes = (hashes) => {
		let changed = false;
		(hashes || []).forEach((hash) => {
			if (!hash || likedSet.value.has(hash)) return;
			likedSet.value.add(hash);
			likedHashes.value.push(hash);
			changed = true;
		});
		return changed;
	};

	const removeLikedHashes = (hashes) => {
		let changed = false;
		(hashes || []).forEach((hash) => {
			if (!hash || !likedSet.value.has(hash)) return;
			likedSet.value.delete(hash);
			delete likedFileIds.value[hash];
			changed = true;
		});
		if (changed) likedHashes.value = likedHashes.value.filter(hash => likedSet.value.has(hash));
		return changed;
	};

	/** 从 /user/playlist 定位「我喜欢」歌单，返回 { listid, globalId } */
	const resolveLikePlaylist = async () => {
		const response = await get('/user/playlist', { pagesize: 500 });
		if (response.status !== 1) return null;
		const likePlaylist = (response.data?.info || []).find(playlist => playlist.name === '我喜欢');
		if (!likePlaylist) return null;
		if (likePlaylist.listid) localStorage.setItem('like', likePlaylist.listid);
		return {
			listid: likePlaylist.listid || '',
			globalId: likePlaylist.list_create_gid || likePlaylist.global_collection_id || ''
		};
	};

	/** 拉取「我喜欢」歌单全部歌曲的 hash 集合（同时记录 hash → fileid 映射，用于取消收藏） */
	const loadLikedSongs = async (force = false) => {
		if (loading.value) return false;
		loading.value = true;
		try {
			const like = await resolveLikePlaylist();
			if (!like || (!like.globalId && !like.listid)) return false;
			if (!force && lastLoadedLikeId.value === like.listid && likedHashes.value.length > 0) return true;

			const hashes = [];
			const fileIds = {};
			for (let page = 1; page <= LIKED_MAX_PAGES; page++) {
				// 优先使用 global_collection_id（/playlist/track/all 要求），
				// 否则回退到 /playlist/track/all/new（接受 listid）
				const response = like.globalId
					? await get('/playlist/track/all', { id: like.globalId, page, pagesize: LIKED_PAGE_SIZE })
					: await get('/playlist/track/all/new', { listid: like.listid, page, pagesize: LIKED_PAGE_SIZE });
				if (response.status !== 1) break;
				const info = response.data?.info || response.data?.songs || [];
				info.forEach((song) => {
					if (!song?.hash) return;
					hashes.push(song.hash);
					if (song.fileid) fileIds[song.hash] = song.fileid;
				});
				if (info.length < LIKED_PAGE_SIZE) break;
			}
			likedSet.value = new Set(hashes);
			likedHashes.value = hashes;
			likedFileIds.value = fileIds;
			lastLoadedLikeId.value = like.listid;
			return true;
		} catch (e) {
			console.error('[likeStore] 获取「我喜欢」歌单失败:', e);
			return false;
		} finally {
			loading.value = false;
		}
	};

	const reset = () => {
		likedHashes.value = [];
		likedSet.value = new Set();
		likedFileIds.value = {};
		lastLoadedLikeId.value = '';
	};

	return {
		likedHashes,
		loading,
		isLiked,
		getFileId,
		addLikedHashes,
		removeLikedHashes,
		loadLikedSongs,
		reset
	};
});

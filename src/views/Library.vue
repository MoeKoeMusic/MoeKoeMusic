<template>
    <div class="library-page">
        <div class="profile-section">
            <div class="profile-header" :style="`background-image: url(${userDetail.bg_pic || './assets/images/banner.png'})`">
                <div class="profile-info">
                    <img class="profile-pic" :src="user.pic" :alt="$t('yong-hu-tou-xiang')" />
                    <div class="user-details">
                        <div class="user-name-row">
                            <h2 class="user-name">{{ user.nickname }}</h2>
                            <span class="user-level">Lv.{{ userDetail.p_grade || 0 }}</span>
                            <img v-if="userVip[0] && userVip[0].is_vip == 1" class="user-vip-icon"
                                :src="`./assets/images/${userVip[0].product_type === 'svip' ? 'vip' : 'vip2'}.png`"
                                :title="`${$t('gai-nian-ban')} ${userVip[0].vip_end_time}`" />
                            <img v-if="userVip[1] && userVip[1].is_vip == 1" class="user-vip-icon"
                                :src="`./assets/images/${userVip[1].product_type === 'svip' ? 'vip' : 'vip2'}.png`"
                                :title="`${$t('chang-ting-ban')} ${userVip[1].vip_end_time}`" />
                        </div>
                        <div class="user-signature">{{ userDetail.descri || '' }}</div>
                        <div class="user-stats">
                            <div class="stat-item"><span class="stat-value">{{ userDetail.follows || 0 }}</span><span class="stat-label">{{ $t('guan-zhu') }}</span></div>
                            <div class="stat-item"><span class="stat-value">{{ userDetail.fans || 0 }}</span><span class="stat-label">{{ $t('fen-si') }}</span></div>
                            <div class="stat-item"><span class="stat-value">{{ userDetail.friends || 0 }}</span><span class="stat-label">{{ $t('hao-you') }}</span></div>
                            <div class="stat-item"><span class="stat-value">{{ userDetail.hvisitors || 0 }}</span><span class="stat-label">{{ $t('fang-wen') }}</span></div>
                        </div>
                        <div class="user-meta">
                            <span class="user-gender">
                                <i :class="userDetail.gender === 1 ? 'fas fa-mars' : 'fas fa-venus'"></i>
                            </span>
                            <span class="user-duration">{{ formatDuration(userDetail.duration || 0) }} {{ $t('ting-ge-shi-chang') }}</span>
                            <span class="user-age">{{ formatRegTime(userDetail.rtime || 0) }}</span>
                        </div>
                        <div class="user-actions">
                            <span class="action-button" @click="signIn">{{ $t('qian-dao') }}</span>
                            <span class="action-button" @click="getVip">VIP</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <h2 class="section-title" @click="addAllSongsToQueue">{{ $t('wo-xi-huan-ting') }}</h2>
        <div class="favorite-section">
            <div class="song-list">
                <div v-if="isLoading" class="skeleton-loader">
                    <div v-for="n in 16" :key="n" class="skeleton-item">
                        <div class="skeleton-cover"></div>
                        <div class="skeleton-info">
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line short"></div>
                        </div>
                    </div>
                </div>
                <ul v-if="listenHistory.length > 0">
                    <li v-for="(song, index) in listenHistory" :key="index" class="song-item"
                        @click="playSong($getQuality(null, song), song.name.split(' - ')[1] || song.name, $getCover(song.image, 480), song.singername)">
                        <img :src="$getCover(song.image, 120)" class="album-cover" />
                        <div class="song-info">
                            <p class="album-name">{{ song.name.split(' - ')[1] || song.name }}</p>
                            <p class="singer-name">{{ song.singername }}</p>
                        </div>
                    </li>
                </ul>
                <div v-else class="empty-container">
                    <div class="empty-image">
                        <img src="/assets/images/empty.png" alt="暂无数据" />
                    </div>
                    <div class="empty-description">{{ t('zhe-li-shi-mo-du-mei-you') }}</div>
                </div>
            </div>
        </div>

        <!-- 分类导航 -->
        <div class="category-tabs">
            <button v-for="(tab, index) in categories" :key="index" :class="{ 'active': selectedCategory === index }"
                @click="selectCategory(index)">
                {{ tab }}
            </button>
        </div>

        <!-- 音乐卡片网格（显示歌单或关注的歌手） -->
        <div class="music-grid">
            <template v-if="selectedCategory === 0 || selectedCategory === 1 || selectedCategory === 2">
                <div v-if="selectedCategory === 0 && !isLoading" class="music-card create-playlist-button">
                    <router-link :to="{
                        path: '/CloudDrive'
                    }">
                        <img :src="`./assets/images/cloud-disk.png`" class="album-image" />
                        <div class="album-info">
                            <h3>我的云盘</h3>
                            <p>(*/ω＼*)</p>
                        </div>
                    </router-link>
                </div>
                <div v-if="selectedCategory === 0 && !isLoading" class="music-card create-playlist-button">
                    <router-link :to="{
                        path: '/LocalMusic'
                    }">
                        <img :src="`./assets/images/local-music.png`" class="album-image" />
                        <div class="album-info">
                            <h3>本地音乐</h3>
                            <p>(〃'▽'〃)</p>
                        </div>
                    </router-link>
                </div>
                <div class="music-card"
                    v-for="(item, index) in (selectedCategory === 0 ? userPlaylists : selectedCategory === 1 ? collectedPlaylists : collectedAlbums)"
                    :key="index">
                    <router-link :to="{
                        path: '/PlaylistDetail',
                        query: { global_collection_id: item.list_create_gid || item.global_collection_id, listid: item.listid}
                    }">
                        <img :src="item.pic ? $getCover(item.pic, 480) : './assets/images/live.png'"
                            class="album-image" />
                        <div class="album-info">
                            <h3>{{ item.name }}</h3>
                            <p>{{ item.count }} <span>{{ $t('shou-ge') }}</span></p>
                        </div>
                    </router-link>
                </div>
                <div v-if="selectedCategory === 0 && !isLoading" class="music-card create-playlist-button">
                    <i class="fas fa-plus"></i>
                    <img :src="`./assets/images/ti111mg.png`" class="album-image" @click="createPlaylist"/>
                    <div class="album-info" @click="createPlaylist">
                        <h3>{{ $t('chuang-jian-ge-dan') }}</h3>
                        <p>(≧∀≦)♪</p>
                    </div>
                </div>
            </template>
            <div v-if="selectedCategory === 3 || selectedCategory === 4" class="music-card"
                v-for="(artist, index) in (selectedCategory === 3 ? followedArtists : selectedCategory === 4 ? collectedFriends  : [])" :key="index"
                @click="goToArtistDetail(artist)">
                <img :src="artist.pic" class="album-image" />
                <div class="album-info">
                    <h3>{{ artist.nickname }}</h3>
                </div>
            </div>
        </div>
        <div v-if="
        (selectedCategory == 0 && userPlaylists.length === 0) || 
        (selectedCategory == 1 && collectedPlaylists.length === 0) || 
        (selectedCategory == 2 && collectedAlbums.length === 0) || 
        (selectedCategory == 3 && followedArtists.length === 0) || 
        (selectedCategory == 4 && collectedFriends.length === 0)"
            class="empty-container">
            <div class="empty-image">
                <img src="/assets/images/empty.png" alt="暂无数据" />
            </div>
            <div class="empty-description">{{ t('zhe-li-shi-mo-du-mei-you') }}</div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { get } from '../utils/request';
import { MoeAuthStore } from '../stores/store';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const router = useRouter();
const MoeAuth = MoeAuthStore();
const user = ref({});
const userPlaylists = ref([]); // 创建的歌单
const collectedPlaylists = ref([]); // 收藏的歌单
const collectedAlbums = ref([]); // 收藏的专辑
const collectedFriends = ref([]); // 好友
const followedArtists = ref([]); // 关注的歌手
const listenHistory = ref([]); // 听歌历史
const userVip = ref({});
const userDetail = ref({}); // 新增：用户详细信息
const categories = ref([t('wo-chuang-jian-de-ge-dan'), t('wo-shou-cang-de-ge-dan'), t('wo-shou-cang-de-zhuan-ji'), t('wo-guan-zhu-de-ge-shou'), t('wo-guan-zhu-de-hao-you')]);
const selectedCategory = ref(0);
const isLoading = ref(true); 
const selectCategory = (index) => {
    selectedCategory.value = index;
    router.replace({ path: '/library', query: { category: index } });
};

// 格式化听歌时长（分钟转为小时和分钟）
const formatDuration = (minutes) => {
    if (!minutes) return '0';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}${t('xiao-shi')} ${mins}${t('fen-zhong')}`;
    }
    return `${mins}${t('fen-zhong')}`;
};

// 格式化注册时间
const formatRegTime = (timestamp) => {
    if (!timestamp) return '';
    const registerDate = new Date(timestamp * 1000);
    const now = new Date();
    const years = now.getFullYear() - registerDate.getFullYear();
    return `${t('le-ling')} ${years} ${t('nian')}`;
};

const playSong = (hash, name, img, author) => {
    props.playerControl.addSongToQueue(hash, name, img, author);
};

const props = defineProps({
    playerControl: Object
});

onMounted(() => {
    if (MoeAuth.isAuthenticated) {
        user.value = MoeAuth.UserInfo;
        // 获取用户vip信息
        getVipInfo();
    }
});
const getUserDetails = () => {
    // 获取用户详细信息
    getUserDetail();
    // 获取用户听歌历史
    getlisten().finally(() => {
        isLoading.value = false; 
    })
    // 获取用户创建和收藏的歌单
    getplaylist()
    // 获取用户关注的歌手
    getfollow()
    selectedCategory.value = parseInt(router.currentRoute.value.query.category || 0);
}

// 获取用户详细信息
const getUserDetail = async () => {
    try {
        const detailResponse = await get('/user/detail');
        if (detailResponse.status === 1) {
            userDetail.value = detailResponse.data;
        }
    } catch (error) {
        console.error('Failed to get user details:', error);
    }
}

const getVipInfo = async () => {
    try {
        const VipInfoResponse = await get('/user/vip/detail');
        if (VipInfoResponse.status === 1) {
            userVip.value = VipInfoResponse.data.busi_vip
            getUserDetails();
        }
    } catch (error) {
        window.$modal.alert(t('deng-lu-shi-xiao-qing-zhong-xin-deng-lu'));
        router.push('/login');
    }
}

const getlisten = async () => {
    const historyResponse = await get('/user/listen', { type: 1 });
    if (historyResponse.status === 1) {
        const allLists = historyResponse.data.lists;
        const shuffled = allLists.sort(() => 0.5 - Math.random());
        listenHistory.value = shuffled.slice(0, 16);
    }
}
const getfollow = async () => {
    const followResponse = await get('/user/follow');
    if (followResponse.status === 1) {
        if (followResponse.data.total == 0) return;
        const artists = followResponse.data.lists.map(artist => ({
            ...artist,
            pic: artist.pic.replace('/100/', '/480/')
        }));
        collectedFriends.value = artists.filter(artist => !artist.singerid);
        followedArtists.value = artists.filter(artist => artist.source == 7);
    }
}
const getplaylist = async () => {
    try {
        const playlistResponse = await get('/user/playlist',{
            pagesize:500,
            t: localStorage.getItem('t')
        });
        if (playlistResponse.status === 1) {
            const sortedInfo = playlistResponse.data.info.sort((a, b) => {
                if (a.sort !== b.sort) {
                    return a.sort - b.sort;
                }
                return 0;
            });

            userPlaylists.value = sortedInfo.filter(playlist => {
                if (playlist.name == '我喜欢') {
                    localStorage.setItem('like', playlist.listid);
                }
                return playlist.list_create_userid === user.value.userid || playlist.name === '我喜欢';
            }).sort((a, b) => a.name === '我喜欢' ? -1 : 1);

            collectedPlaylists.value = sortedInfo.filter(playlist => 
                playlist.list_create_userid !== user.value.userid && !playlist.authors
            );

            collectedAlbums.value = sortedInfo.filter(playlist => 
                playlist.list_create_userid !== user.value.userid && playlist.authors
            );
            
            const collectedIds = [];
            sortedInfo.forEach(playlist => {
                if (playlist.list_create_userid !== user.value.userid) {
                    collectedIds.push({
                        list_create_listid: playlist.list_create_listid, 
                        listid: playlist.listid
                    });
                }
            });
            localStorage.setItem('collectedPlaylists', JSON.stringify(collectedIds));
        }
    } catch (error) {
        window.$modal.alert(t('xin-zeng-zhang-hao-qing-xian-zai-guan-fang-ke-hu-duan-zhong-deng-lu-yi-ci')); 
    }
}
const createPlaylist = async () => {
    const result = await window.$modal.prompt(t('qing-shu-ru-xin-de-ge-dan-ming-cheng'), '');
    if (result) {
        try {
            const playlistResponse = await get('/playlist/add', { name: result, list_create_userid: user.value.userid });
            if (playlistResponse.status === 1) {
                localStorage.setItem('t', Date.now());
                getplaylist()
            }
        } catch (error) {
            window.$modal.alert(t('chuang-jian-shi-bai'));
        }
    }
}

const goToArtistDetail = (artist) => {
    if (!artist.singerid) return;
    router.push({
        path: '/PlaylistDetail',
        query: { 
            singerid: artist.singerid,
            unfollow: true
        }
    });
};
const signIn = async () => {
    try {
        const res = await get('/youth/vip');
        if (res.status === 1) {
            window.$modal.alert(`签到成功，获得${res.data.award_vip_hour}小时VIP时长`);
        }
    } catch (error) {
        window.$modal.alert('签到失败![该接口将在未来被移除]');
    }
}
const getVip = async () => {
    try{
        const vipResponse = await get('/youth/day/vip');
        const result = await window.$modal.confirm('是否继续升级至概念版VIP,享受更高音质?');
        if(result){
            try{
                const vipResponse = await get('/youth/day/vip/upgrade');
                if (vipResponse.status === 1) {
                    window.$modal.alert('升级成功，获得1天概念版VIP');
                }
            } catch (error) {
                window.$modal.alert(error.error_msg || '升级VIP失败, 一天仅限一次');
            }
        }else if (vipResponse.status === 1) {
            window.$modal.alert(`签到成功，获得1天畅听VIP`);
        }
    } catch (error) {
        window.$modal.alert('获取VIP失败, 一天仅限一次');
    }
}
const addAllSongsToQueue = () => {
    props.playerControl.addPlaylistToQueue(listenHistory.value.map(song => ({
        hash: song.hash,
        name: song.name,
        cover: song.image?.replace("{size}", 480),
        author: song.author_name,
        timelen: song.duration
    })));
};
</script>

<style scoped>
.sign-in {
    cursor: pointer;
    color: var(--primary-color);
    margin-left: 10px;
    border-radius: 5px;
    padding: 2px 8px;
    border: 1px solid var(--primary-color);
    font-size: 12px;
}

.library-page {
    padding: 20px;
}

.user-level {
    width: 50px;
    margin-left: 10px;
    cursor: pointer;
}


.section-title {
    font-size: 28px;
    font-weight: bold;
    margin-bottom: 30px;
    color: var(--primary-color);
    cursor: cell;
    margin-bottom: 0px;
    display: inline-block;
}

.profile-section {
    display: flex;
    align-items: center;
}

.profile-header {
    width: 100%;
    height: 100%; 
    background-size: cover;
    background-position: center;
    border-radius: 15px;
    margin-bottom: 20px;
    display: flex;
    align-items: flex-end;
    padding: 20px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: visible;
    transition: background-image 1s ease-in-out;
}

.profile-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.6) 100%);
    border-radius: 15px;
    z-index: 1;
}

.profile-info {
    display: flex;
    align-items: flex-end;
    gap: 15px;
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    width: 100%;
    z-index: 2;
}

.profile-pic {
    border-radius: 50%;
    width: 90px;
    height: 90px;
    border: 3px solid white;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    margin-bottom: 10px;
    position: relative;
    top: -20px;
}

.user-details {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    height: 100%;
    flex: 1;
}

.user-name-row {
    display: flex;
    align-items: center;
    margin-bottom: 2px;
}

.user-name {
    font-size: 28px;
    font-weight: bold;
    margin: 0;
}

.user-level {
    font-size: 14px;
    background-color: rgba(255, 255, 255, 0.2);
    padding: 2px 8px;
    border-radius: 10px;
    color: white;
}

.user-vip-icon {
    height: 22px;
    margin-left: 10px;
}

.user-signature {
    font-size: 14px;
    color: #eee;
    margin-bottom: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
}

.user-stats {
    display: flex;
    justify-content: flex-start;
    gap: 20px;
    margin-bottom: 5px;
    font-size: 14px;
    color: #fff;
}

.stat-item {
    text-align: center;
}

.stat-value {
    font-size: 18px;
    font-weight: bold;
    display: inline-block;
    margin-right: 3px;
}

.stat-label {
    display: inline-block;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
}

.user-meta {
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 12px;
    color: #fff;
    margin-bottom: 10px;
}

.user-gender i {
    font-size: 16px;
    color: #fff;
}

.user-duration,
.user-age {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 3px 8px;
    border-radius: 10px;
    color: white;
}

.user-actions {
    display: flex;
    gap: 10px;
    margin-top: 5px;
}

.action-button {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 4px 10px;
    border-radius: 10px;
    color: white;
    cursor: pointer;
    font-size: 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    transition: background-color 0.3s ease;
}

.action-button:hover {
    background-color: rgba(255, 255, 255, 0.3);
}

.favorite-section {
    display: flex;
    justify-content: space-between;
}

.favorite-playlist {
    background-color: var(--background-color);
    padding: 20px;
    border-radius: 12px;
    flex: 1;
    margin-right: 20px;
    border: 1px solid var(--secondary-color);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
}

.playlist-info p {
    margin: 10px 0;
}

.play-button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background-color: var(--secondary-color);
    color: white;
    border: none;
    border-radius: 25px;
    padding: 10px 15px;
    cursor: pointer;
}

.play-button i {
    font-size: 16px;
}

.song-list {
    flex: 1;
}

.song-list ul {
    list-style: none;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
}

.song-list li {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    width: 250px;
    cursor: pointer;
    border-radius: 10px;
    padding-left: 10px;
}

.song-list li:hover {
    background-color: var(--background-color);
}

.song-list img {
    width: 50px;
    height: 50px;
    margin-right: 10px;
    border-radius: 6px;
}

.category-tabs {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
}

.category-tabs button {
    padding: 10px 15px;
    border: none;
    background-color: #f5f5f5;
    border-radius: 20px;
    cursor: pointer;
}

.category-tabs button.active {
    background-color: var(--primary-color);
    color: white;
}

.music-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 20px;
}

.music-card {
    text-align: center;
    cursor: pointer;
}

.album-image {
    width: 100%;
    border-radius: 12px;
}

.album-info h3 {
    margin: 10px 0 5px;
    font-size: 16px;
}

.album-info p {
    color: #666;
    font-size: 14px;
}

.song-item {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
}

.album-cover {
    width: 50px;
    height: 50px;
    margin-right: 10px;
    border-radius: 5px;
}

.song-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 190px;
}

.album-name,
.singer-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.album-name {
    font-weight: bold;
    margin-bottom: -5px;
    font-size: 14px;
    color: #333;
}

.singer-name {
    font-size: 12px;
    color: #666;
}

.skeleton-loader {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    margin-top: 10px;
}

.skeleton-item {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    width: 250px;
    border-radius: 10px;
    padding-left: 10px;
    background-color: #f0f0f0;
    height: 68px;
}

.skeleton-cover {
    width: 50px;
    height: 50px;
    margin-right: 10px;
    border-radius: 10px;
    background-color: #e0e0e0;
}

.skeleton-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 190px;
}

.skeleton-line {
    height: 10px;
    background-color: #e0e0e0;
    margin-bottom: 5px;
    border-radius: 5px;
    width: 150px;
}

.create-playlist-button {
    color: var(--primary-color);
    border-radius: 10px;
    cursor: pointer;
    position: relative;
}

.create-playlist-button i {
    font-size: 30px;
    position: absolute;
    top: 32%;
    left: 29%;
}

/* 空状态容器样式 */
.empty-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 0;
    width: 100%;
}

.empty-image {
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
}

.empty-image img {
    width: 200px;
    height: 200px;
    opacity: 0.6;
}

.empty-description {
    color: #909399;
    font-size: 14px;
    text-align: center;
    margin-left: 60px;
}
</style>
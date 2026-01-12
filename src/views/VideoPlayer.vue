<template>
    <div class="video-player-page">
        <div class="video-container">
            <div class="video-header">
                <button class="back-btn" @click="() => isElectron? closeWindow(): goBack()">
                    <i class="fas" :class="{ 'fa-xmark': isElectron, 'fa-arrow-left': !isElectron }"></i>
                    {{ isElectron? '关闭': '返回' }}
                </button>
                <h2 class="video-title">{{ videoTitle }}</h2>
            </div>

            <div class="video-wrapper" v-if="videoUrl">
                <video
                    ref="videoPlayer"
                    class="video-element"
                    :src="videoUrl"
                    controls
                    autoplay
                    @error="handleVideoError"
                    @loadedmetadata="handleVideoLoaded"
                >
                    您的浏览器不支持视频播放
                </video>
            </div>

            <div class="loading-container" v-else-if="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>正在加载视频...</p>
            </div>

            <div class="error-container" v-else-if="error">
                <i class="fas fa-exclamation-circle"></i>
                <p>{{ error }}</p>
                <button class="retry-btn" @click="retryLoad">
                    <i class="fas fa-redo"></i> 重试
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { get } from '../utils/request';

const route = useRoute();
const router = useRouter();

const videoPlayer = ref(null);
const videoUrl = ref('');
const videoTitle = ref('视频播放');
const loading = ref(true);
const error = ref('');

const isElectron = !!window.electron;

const mvhash = ref(route.query.hash || '');

const fetchVideoUrl = async () => {
    if (!mvhash.value) {
        error.value = '缺少视频参数';
        loading.value = false;
        return;
    }

    try {
        loading.value = true;
        error.value = '';

        const videoResponse = await get('/video/url', {
            hash: mvhash.value
        });

        if (videoResponse.status === 1 && videoResponse.data) {
            // 获取第一个键（动态的hash值）
            const videoKey = Object.keys(videoResponse.data)[0];
            const videoData = videoResponse.data[videoKey];

            if (videoData && (videoData.backupdownurl || videoData.downurl)) {
                // 优先使用 backupdownurl，如果是数组则取第一个
                const backupUrl = Array.isArray(videoData.backupdownurl)
                    ? videoData.backupdownurl[0]
                    : videoData.backupdownurl;

                videoUrl.value = backupUrl || videoData.downurl;

                if (route.query.title) {
                    videoTitle.value = decodeURIComponent(route.query.title);
                }
            } else {
                error.value = '获取视频播放地址失败';
            }
        } else {
            error.value = '获取视频信息失败';
        }
    } catch (err) {
        error.value = '加载视频失败，请稍后重试';
    } finally {
        loading.value = false;
    }
};

const retryLoad = () => {
    fetchVideoUrl();
};

const handleVideoLoaded = () => {
    console.log('视频加载完成');
};

const handleVideoError = (e) => {
    error.value = '视频播放失败，可能是视频格式不支持或网络问题';
};

const goBack = () => {
    router.back();
};

const closeWindow = () => {
    window.close();
};

onMounted(() => {
    fetchVideoUrl();
});

onBeforeUnmount(() => {
    if (videoPlayer.value) {
        videoPlayer.value.pause();
        videoPlayer.value.src = '';
    }
});
</script>

<style scoped>
.video-player-page {
    width: 100%;
    height: 100vh;
    background-color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.video-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.video-header {
    background-color: rgba(0, 0, 0, 0.8);
    padding: 15px 20px;
    display: flex;
    align-items: center;
    gap: 20px;
}

.back-btn {
    background: transparent;
    border: none;
    color: white;
    font-size: 16px;
    cursor: pointer;
    padding: 8px 16px;
    border-radius: 4px;
    transition: background-color 0.3s;
}

.back-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

.video-title {
    color: white;
    font-size: 18px;
    margin: 0;
    flex: 1;
}

.video-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #000;
}

.video-element {
    width: 100%;
    height: 100%;
    max-height: 100%;
    object-fit: contain;
}

.loading-container,
.error-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    gap: 15px;
}

.loading-container i {
    font-size: 48px;
    color: #42b983;
}

.error-container i {
    font-size: 48px;
    color: #ff6b6b;
}

.loading-container p,
.error-container p {
    font-size: 16px;
    margin: 0;
}

.retry-btn {
    background-color: #42b983;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.3s;
}

.retry-btn:hover {
    background-color: #35a372;
}

.retry-btn i {
    margin-right: 5px;
}
</style>

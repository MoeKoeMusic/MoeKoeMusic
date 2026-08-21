import { ref } from 'vue';
import { get } from '../../utils/request';
import { createClimaxPointLoader } from './ClimaxPoints';

export default function useProgressBar(audio, resetLyricsHighlight) {
    const progressWidth = ref(0);
    const isProgressDragging = ref(false);
    const isDraggingHandle = ref(false);
    const showTimeTooltip = ref(false);
    const tooltipPosition = ref(0);
    const tooltipTime = ref('0:00');
    const activeProgressBar = ref(null);
    const climaxPoints = ref([]);
    const climaxPointLoader = createClimaxPointLoader(hash => get(`/song/climax?hash=${hash}`));

    // 格式化时间
    const formatTime = (seconds) => {
        if (seconds > 1000) seconds = seconds / 1000;
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // 获取歌曲高潮点
    const clearMusicHighlights = () => {
        climaxPointLoader.invalidate();
        climaxPoints.value = [];
    };

    const getMusicHighlights = async (hash, isCurrentSong = () => true) => {
        if (!isCurrentSong()) return;

        climaxPoints.value = [];

        const result = await climaxPointLoader.load(hash, {
            isCurrent: isCurrentSong,
            getDuration: () => audio.duration
        });

        if (result.apply) {
            climaxPoints.value = result.points;
        }
    };

    // 进度条拖动开始
    const onProgressDragStart = (event) => {
        event.preventDefault();

        const currentProgressBar = event.target.closest('.progress-bar');
        if (!currentProgressBar) return;

        // 检查是否点击在小圆点上
        const handle = event.target.closest('.progress-handle');
        if (!handle) {
            if (!audio.duration) return;
            const rect = currentProgressBar.getBoundingClientRect();
            const offsetX = Math.max(0, Math.min(event.clientX - rect.left, currentProgressBar.offsetWidth));
            const percentage = (offsetX / currentProgressBar.offsetWidth) * 100;
            progressWidth.value = Math.max(0, Math.min(percentage, 100));
        }

        isProgressDragging.value = true;
        isDraggingHandle.value = true;
        activeProgressBar.value = currentProgressBar;

        document.addEventListener('mousemove', onProgressDrag);
        document.addEventListener('mouseup', onProgressDragEnd);
    };

    // 进度条拖动中
    const onProgressDrag = (event) => {
        event.preventDefault();
        if (isProgressDragging.value && activeProgressBar.value) {
            const rect = activeProgressBar.value.getBoundingClientRect();
            const offsetX = Math.max(0, Math.min(event.clientX - rect.left, activeProgressBar.value.offsetWidth));
            const percentage = (offsetX / activeProgressBar.value.offsetWidth) * 100;
            progressWidth.value = Math.max(0, Math.min(percentage, 100));

            // 更新时间提示
            tooltipPosition.value = offsetX;
            const time = (percentage / 100) * audio.duration;
            tooltipTime.value = formatTime(time);
        }
    };

    // 进度条拖动结束
    const onProgressDragEnd = (event) => {
        if (isProgressDragging.value && activeProgressBar.value) {
            const rect = activeProgressBar.value.getBoundingClientRect();
            const offsetX = Math.max(0, Math.min(event.clientX - rect.left, activeProgressBar.value.offsetWidth));
            const percentage = (offsetX / activeProgressBar.value.offsetWidth) * 100;
            const newTime = (percentage / 100) * audio.duration;

            audio.currentTime = Math.max(0, Math.min(newTime, audio.duration));
            resetLyricsHighlight(audio.currentTime);
        }

        isProgressDragging.value = false;
        isDraggingHandle.value = false;
        showTimeTooltip.value = false;
        activeProgressBar.value = null;
        document.removeEventListener('mousemove', onProgressDrag);
        document.removeEventListener('mouseup', onProgressDragEnd);
    };

    // 点击进度条更新进度
    const updateProgressFromEvent = (event) => {
        if (isProgressDragging.value) return; // 如果正在拖动则不处理点击

        const progressBar = event.target.closest('.progress-bar');
        if (!progressBar || !audio.duration) return;

        const rect = progressBar.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(event.clientX - rect.left, progressBar.offsetWidth));
        const percentage = (offsetX / progressBar.offsetWidth) * 100;
        const newTime = (percentage / 100) * audio.duration;

        audio.currentTime = Math.max(0, Math.min(newTime, audio.duration));
        progressWidth.value = percentage;
        resetLyricsHighlight(audio.currentTime);
    };

    // 更新时间提示
    const updateTimeTooltip = (event) => {
        const progressBar = event.target.closest('.progress-bar');
        if (!progressBar || !audio.duration) return;

        const rect = progressBar.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(event.clientX - rect.left, progressBar.offsetWidth));

        const tooltipWidth = 50;
        if (offsetX < tooltipWidth / 2) {
            tooltipPosition.value = tooltipWidth / 2;
        } else if (offsetX > progressBar.offsetWidth - tooltipWidth / 2) {
            tooltipPosition.value = progressBar.offsetWidth - tooltipWidth / 2;
        } else {
            tooltipPosition.value = offsetX;
        }

        const percentage = (offsetX / progressBar.offsetWidth);
        const time = percentage * audio.duration;
        tooltipTime.value = formatTime(time);

        showTimeTooltip.value = true;
    };

    // 隐藏时间提示
    const hideTimeTooltip = () => {
        if (!isProgressDragging.value) {
            showTimeTooltip.value = false;
        }
    };

    return {
        progressWidth,
        isProgressDragging,
        showTimeTooltip,
        tooltipPosition,
        tooltipTime,
        climaxPoints,
        formatTime,
        getMusicHighlights,
        clearMusicHighlights,
        onProgressDragStart,
        updateProgressFromEvent,
        updateTimeTooltip,
        hideTimeTooltip
    };
}

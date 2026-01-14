import { ref } from 'vue';

export default function useAudioController({ onSongEnd, updateCurrentTime }) {
    const audio = new Audio();
    // 设置 crossOrigin 以支持 Web Audio API 跨域访问
    audio.crossOrigin = 'anonymous';

    const playing = ref(false);
    const isMuted = ref(false);
    const volume = ref(66);
    const playbackRate = ref(1.0);

    // Web Audio API 用于动态增益
    const audioContext = ref(null);
    const sourceNode = ref(null);
    const gainNode = ref(null);
    const currentLoudnessGain = ref(1.0); // 当前响度增益系数
    const loudnessNormalizationEnabled = ref(false); // 响度规格化开关，默认关闭
    const webAudioInitialized = ref(false); // 标记 Web Audio 是否已初始化

    // 初始化 Web Audio API - 只在启用响度规格化时调用，并且应该在用户交互时调用
    const initWebAudio = () => {
        try {
            // 只有启用时才初始化 Web Audio API
            if (!loudnessNormalizationEnabled.value) {
                console.log('[AudioController] 响度规格化未启用，使用原生音频播放');
                return false;
            }

            if (!audioContext.value) {
                audioContext.value = new (window.AudioContext || window.webkitAudioContext)();
                console.log('[AudioController] Web Audio API 初始化成功');
                console.log('[AudioController] AudioContext 初始状态:', audioContext.value.state);

                // 立即创建音频图连接
                try {
                    sourceNode.value = audioContext.value.createMediaElementSource(audio);
                    gainNode.value = audioContext.value.createGain();
                    sourceNode.value.connect(gainNode.value);
                    gainNode.value.connect(audioContext.value.destination);

                    // 设置初始增益
                    gainNode.value.gain.setValueAtTime(currentLoudnessGain.value, audioContext.value.currentTime);

                    webAudioInitialized.value = true;
                    console.log('[AudioController] Web Audio 音频图创建完成');
                    console.log('[AudioController] 初始增益值:', gainNode.value.gain.value);
                } catch (sourceError) {
                    console.error('[AudioController] 创建音频源失败（可能是CORS问题）:', sourceError);
                    // 清理已创建的资源
                    if (audioContext.value) {
                        audioContext.value.close();
                        audioContext.value = null;
                    }
                    webAudioInitialized.value = false;
                    console.warn('[AudioController] 由于CORS限制，响度规格化已禁用，使用原生播放');
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('[AudioController] Web Audio API 初始化失败:', error);
            webAudioInitialized.value = false;
            return false;
        }
    };

    // 应用响度规格化
    const applyLoudnessNormalization = (loudnessData) => {
        // 如果 Web Audio 未初始化，不做任何处理
        if (!webAudioInitialized.value || !loudnessNormalizationEnabled.value) {
            console.log('[AudioController] Web Audio 未启用，跳过响度规格化');
            return;
        }

        console.log('[AudioController] 开始应用响度规格化, loudnessData:', loudnessData);

        if (!loudnessData) {
            console.log('[AudioController] 歌曲无响度规格化数据，使用默认增益');
            currentLoudnessGain.value = 1.0;

            // 更新 gainNode
            if (gainNode.value && audioContext.value) {
                gainNode.value.gain.setValueAtTime(1.0, audioContext.value.currentTime);
                console.log('[AudioController] 重置音频增益为 1.0, 当前增益值:', gainNode.value.gain.value);
            }
            return;
        }

        try {
            const { volume, volumeGain, volumePeak } = loudnessData;

            // 响度规格化算法
            // volume: LUFS 值 (例如 -11.4 表示音频响度为 -11.4 LUFS)
            // volumeGain: 建议的增益调整值 (dB)
            // volumePeak: 峰值 (0-1)

            // 目标响度为 -14 LUFS (Spotify 标准)
            const targetLoudness = -14.0;
            const loudnessAdjustment = targetLoudness - volume;

            // 计算增益系数 (dB 转线性)
            // gain = 10^(dB/20)
            let gainAdjustment = Math.pow(10, loudnessAdjustment / 20);

            // 应用 volumeGain (如果 API 已经提供了增益建议)
            if (volumeGain !== 0) {
                gainAdjustment *= Math.pow(10, volumeGain / 20);
            }

            // 防止削波: 如果应用增益后峰值会超过 1.0，则限制增益
            if (volumePeak > 0 && volumePeak * gainAdjustment > 0.95) {
                gainAdjustment = 0.95 / volumePeak;
                console.log('[AudioController] 限制增益以防止削波');
            }

            // 限制增益范围 (0.1 到 3.0，即 -20dB 到 +9.5dB)
            currentLoudnessGain.value = Math.max(0.1, Math.min(3.0, gainAdjustment));

            console.log('[AudioController] 响度规格化:', {
                volume: volume + ' LUFS',
                volumeGain: volumeGain + ' dB',
                volumePeak,
                adjustment: loudnessAdjustment.toFixed(2) + ' dB',
                finalGain: (20 * Math.log10(currentLoudnessGain.value)).toFixed(2) + ' dB',
                gainMultiplier: currentLoudnessGain.value.toFixed(3)
            });

            // 应用新的增益
            if (gainNode.value && audioContext.value) {
                gainNode.value.gain.setValueAtTime(currentLoudnessGain.value, audioContext.value.currentTime);
                console.log('[AudioController] 增益已应用, 当前增益值:', gainNode.value.gain.value);
            }
        } catch (error) {
            console.error('[AudioController] 应用响度规格化失败:', error);
            currentLoudnessGain.value = 1.0;
            // 发生错误时也要重置增益
            if (gainNode.value && audioContext.value) {
                gainNode.value.gain.setValueAtTime(1.0, audioContext.value.currentTime);
            }
        }
    };

    // 确保 AudioContext 处于运行状态（如果未初始化则先初始化，然后恢复）
    const ensureAudioContextRunning = async () => {
        // 如果启用了响度规格化但还未初始化 Web Audio，先初始化
        if (loudnessNormalizationEnabled.value && !webAudioInitialized.value) {
            console.log('[AudioController] 首次播放，初始化 Web Audio API...');
            if (!initWebAudio()) {
                console.warn('[AudioController] Web Audio API 初始化失败，使用原生播放');
                return;
            }
        }

        // 如果已初始化，确保 AudioContext 处于运行状态
        if (webAudioInitialized.value && audioContext.value) {
            console.log('[AudioController] 检查 AudioContext 状态:', audioContext.value.state);

            if (audioContext.value.state === 'suspended') {
                console.log('[AudioController] AudioContext 处于 suspended，尝试恢复...');
                try {
                    await audioContext.value.resume();
                    console.log('[AudioController] AudioContext 已恢复为:', audioContext.value.state);
                } catch (error) {
                    console.error('[AudioController] 恢复 AudioContext 失败:', error);
                }
            } else {
                console.log('[AudioController] AudioContext 状态正常:', audioContext.value.state);
            }

            // 验证音频图连接
            if (gainNode.value) {
                console.log('[AudioController] 当前增益节点值:', gainNode.value.gain.value);
            }
        }
    };

    // 切换响度规格化
    const toggleLoudnessNormalization = (enabled) => {
        const previousState = loudnessNormalizationEnabled.value;
        loudnessNormalizationEnabled.value = enabled;

        // 保存到 settings
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        settings.loudnessNormalization = enabled ? 'on' : 'off';
        localStorage.setItem('settings', JSON.stringify(settings));

        // 如果 Web Audio 已经初始化，只能调整增益，无法完全禁用
        if (webAudioInitialized.value) {
            if (gainNode.value && audioContext.value) {
                const newGain = enabled ? currentLoudnessGain.value : 1.0;
                gainNode.value.gain.setValueAtTime(newGain, audioContext.value.currentTime);
                console.log('[AudioController] 响度规格化', enabled ? '已启用' : '已禁用', ', 增益:', newGain);
            }
        } else if (enabled && !previousState) {
            // 如果之前未启用，现在要启用，需要初始化 Web Audio
            console.warn('[AudioController] 启用响度规格化需要刷新页面才能生效');
            // 尝试初始化（但可能已经太晚了，audio 元素可能已经在使用中）
            // initWebAudio();
        }

        console.log('[AudioController] 响度规格化开关变更:', enabled ? '开启' : '关闭');
    };

    // 初始化音频设置
    const initAudio = () => {
        const savedVolume = localStorage.getItem('player_volume');
        if (savedVolume !== null) volume.value = parseFloat(savedVolume);
        isMuted.value = volume.value === 0;
        audio.volume = volume.value / 100;
        audio.muted = isMuted.value;

        // 初始化播放速度
        const savedSpeed = localStorage.getItem('player_speed');
        if (savedSpeed !== null) {
            playbackRate.value = parseFloat(savedSpeed);
            audio.playbackRate = playbackRate.value;
        }

        // 检查是否启用响度规格化，但不立即初始化 Web Audio
        // Web Audio 将在首次播放时初始化，以确保在用户手势上下文中
        const savedSettings = JSON.parse(localStorage.getItem('settings') || '{}');
        const savedNormalization = savedSettings.loudnessNormalization || 'off';
        loudnessNormalizationEnabled.value = savedNormalization === 'on';

        audio.addEventListener('ended', onSongEnd);
        audio.addEventListener('pause', handleAudioEvent);
        audio.addEventListener('play', handleAudioEvent);
        audio.addEventListener('timeupdate', updateCurrentTime);

        console.log('[AudioController] 初始化完成，音量设置为:', audio.volume, 'volume值:', volume.value, '播放速度:', audio.playbackRate);
        console.log('[AudioController] 响度规格化状态:', loudnessNormalizationEnabled.value ? '已启用（将在首次播放时初始化）' : '未启用');
    };

    // 处理播放/暂停事件
    const handleAudioEvent = (event) => {
        if (event.type === 'play') {
            playing.value = true;
        } else if (event.type === 'pause') {
            playing.value = false;
        }
        console.log(`[AudioController] ${event.type}事件: playing=${playing.value}`);
        if (typeof window !== 'undefined' && typeof window.electron !== 'undefined') {
            window.electron.ipcRenderer.send('play-pause-action', playing.value, audio.currentTime);
        }
    };

    // 切换播放/暂停
    const togglePlayPause = async () => {
        console.log(`[AudioController] 切换播放状态: playing=${playing.value}, src=${audio.src}`);
        if (playing.value) {
            audio.pause();
            playing.value = false;
        } else {
            try {
                // 在播放前确保 AudioContext 处于 running 状态（如果已启用）
                await ensureAudioContextRunning();

                await audio.play();
                playing.value = true;
            } catch (error) {
                console.error('[AudioController] 播放失败:', error);
                return false;
            }
        }
        return true;
    };

    // 切换静音
    const toggleMute = () => {
        isMuted.value = !isMuted.value;
        audio.muted = isMuted.value;
        console.log(`[AudioController] 切换静音: muted=${isMuted.value}`);
        if (isMuted.value) {
            volume.value = 0;
        } else {
            volume.value = audio.volume * 100;
        }
        localStorage.setItem('player_volume', volume.value);
    };

    // 修改音量
    const changeVolume = () => {
        audio.volume = volume.value / 100;
        localStorage.setItem('player_volume', volume.value);
        isMuted.value = volume.value === 0;
        audio.muted = isMuted.value;
        console.log(`[AudioController] 修改音量: volume=${volume.value}, audio.volume=${audio.volume}, muted=${isMuted.value}`);
    };

    // 设置进度
    const setCurrentTime = (time) => {
        audio.currentTime = time;
        console.log(`[AudioController] 设置进度: time=${time}`);
    };

    // 设置播放速度
    const setPlaybackRate = (speed) => {
        playbackRate.value = speed;
        audio.playbackRate = speed;
        localStorage.setItem('player_speed', speed);
        console.log('[AudioController] 设置播放速度:', speed);
    };

    // 销毁时清理
    const destroy = () => {
        console.log('[AudioController] 销毁音频控制器');
        audio.pause();
        audio.src = '';
        audio.load();
        audio = null;
        audio.removeEventListener('play', handleAudioEvent);
        audio.removeEventListener('ended', onSongEnd);
        audio.removeEventListener('pause', handleAudioEvent);
        audio.removeEventListener('timeupdate', updateCurrentTime);

        // 清理 Web Audio 资源
        if (webAudioInitialized.value) {
            if (sourceNode.value) {
                sourceNode.value.disconnect();
            }
            if (gainNode.value) {
                gainNode.value.disconnect();
            }
            if (audioContext.value) {
                audioContext.value.close();
            }
        }
    };

    return {
        audio,
        playing,
        isMuted,
        volume,
        playbackRate,
        initAudio,
        togglePlayPause,
        toggleMute,
        changeVolume,
        setCurrentTime,
        setPlaybackRate,
        destroy,
        // 响度规格化相关
        applyLoudnessNormalization,
        ensureAudioContextRunning,
        toggleLoudnessNormalization,
        loudnessNormalizationEnabled,
        currentLoudnessGain,
        webAudioInitialized
    };
} 

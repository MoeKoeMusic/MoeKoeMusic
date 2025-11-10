import {error} from "electron-log";

export default function useMediaSession() {
  // 初始化媒体会话
  const initMediaSession = (handlers) => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession) return;
    
    // 基本播放控制
    navigator.mediaSession.setActionHandler('play', handlers.togglePlayPause);
    navigator.mediaSession.setActionHandler('pause', handlers.togglePlayPause);
    navigator.mediaSession.setActionHandler('previoustrack', handlers.playPrevious);
    navigator.mediaSession.setActionHandler('nexttrack', handlers.playNext);
    
    // SMTC 时间轴控制
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      if (handlers.seekBackward) {
        const seekOffset = details.seekOffset || 10; // 默认快退10秒
        handlers.seekBackward(seekOffset);
      }
    });
    
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      if (handlers.seekForward) {
        const seekOffset = details.seekOffset || 10; // 默认快进10秒
        handlers.seekForward(seekOffset);
      }
    });
    
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (handlers.seekTo && details.seekTime !== undefined) {
        handlers.seekTo(details.seekTime);
      }
    });
  };
  
  // 更新媒体会话信息
  const changeMediaSession = (song,time) => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession) return;

    const defaultArtwork = './assets/images/logo.png';
    const checkImageAccessibility = (src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = () => resolve(defaultArtwork);
        img.src = src;
      });
    };

    const updateMediaSession = async () => {
      try {
        const artworkSrc = await checkImageAccessibility(song.img || defaultArtwork);
        console.log(time)
        const metadata = {
          title: song.name,
          artist: song.author,
          album: song.album,
          artwork: [{ src: artworkSrc }] || [],
          length: Number(time) || 10
        };
        navigator.mediaSession.metadata = new window.MediaMetadata(metadata);
        mprisApi.sendMetaData(metadata)
      } catch (error) {
        console.error("Failed to update media session metadata:", error);
      }
    };
    
    updateMediaSession();
  };

  // 更新播放位置状态
  const updatePositionState = (currentTime, duration, playbackRate = 1.0) => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession) return;
    
    try {
      if (typeof currentTime === 'number' && typeof duration === 'number' && 
          currentTime >= 0 && duration > 0 && currentTime <= duration) {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: playbackRate,
          position: currentTime
        });
        mprisApi.sendPlayerCurrentTrackTime(currentTime)
      }
    } catch (error) {
      console.error("Failed to update position state:", error);
    }
  };

  // 清除位置状态
  const clearPositionState = () => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession) return;
    
    try {
      navigator.mediaSession.setPositionState(null);
    } catch (error) {
      console.error("Failed to clear position state:", error);
    }
  };
  
  return {
    initMediaSession,
    changeMediaSession,
    updatePositionState,
    clearPositionState
  };
} 

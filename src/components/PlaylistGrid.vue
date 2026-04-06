<template>
  <div class="playlist-grid">
    <div v-for="(playlist, index) in playlists" :key="index" class="playlist-card" @click="onPlaylistClick(playlist)">
      <div class="playlist-cover">
        <img :src="(playlist.img || './assets/images/ico.png').replace('/150/', '/480/')" />
        <div class="playlist-overlay">
          <button class="play-button">
            <i class="fas fa-play"></i>
          </button>
        </div>
      </div>
      <div class="playlist-info">
        <h3 class="playlist-name" :title="playlist.specialname">{{ playlist.specialname }}</h3>
        <div class="playlist-creator">
          <i class="fas fa-user"></i>
          <span>{{ playlist.nickname }}</span>
        </div>
        <div class="playlist-meta">
          <div class="meta-item">
            <i class="fas fa-music"></i>
            <span>{{ playlist.song_count }}首</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-play-circle"></i>
            <span>{{ formatPlayCount(playlist.play_count) }}</span>
          </div>
          <div class="meta-item" v-if="playlist.publish_time">
            <i class="fas fa-calendar-alt"></i>
            <span>{{ formatDate(playlist.publish_time) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  playlists: {
    type: Array,
    required: true,
    default: () => []
  }
});

const emit = defineEmits(['playlist-click']);

const onPlaylistClick = (playlist) => {
  emit('playlist-click', playlist);
};

// 格式化播放次数
const formatPlayCount = (count) => {
  if (!count) return '0';
  count = parseInt(count);
  if (count < 10000) {
    return count.toString();
  } else if (count < 100000000) {
    return (count / 10000).toFixed(1) + '万';
  } else {
    return (count / 100000000).toFixed(1) + '亿';
  }
};

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  // 只保留年月日
  return dateStr.split(' ')[0];
};
</script>

<style lang="scss" scoped>
.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.playlist-card {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
  height: 100%;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);

    .playlist-cover img {
      transform: scale(1.05);
    }

    .playlist-overlay {
      opacity: 1;
    }
  }
}

.playlist-cover {
  position: relative;
  width: 100%;
  padding-top: 100%;
  overflow: hidden;

  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s;
  }
}

.playlist-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.play-button {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: var(--primary-color);
  border: none;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s;

  &:hover {
    transform: scale(1.1);
    background-color: var(--primary-color-dark, #d81e06);
  }

  i {
    font-size: 20px;
  }
}

.playlist-info {
  padding: 15px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.playlist-name {
  font-size: 16px;
  font-weight: bold;
  margin: 0 0 8px 0;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-creator {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  i {
    font-size: 12px;
    color: var(--primary-color);
  }
}

.playlist-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #888;
  background-color: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;

  i {
    font-size: 12px;
    color: var(--primary-color);
  }
}

@media (max-width: 768px) {
  .playlist-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
  }

  .playlist-name {
    font-size: 14px;
  }

  .playlist-creator {
    font-size: 12px;
  }

  .meta-item {
    font-size: 10px;
    padding: 3px 6px;
  }
}
</style>
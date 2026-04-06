<template>
  <div class="artist-grid">
    <div v-for="(artist, index) in artists" :key="index" class="artist-card" @click="onArtistClick(artist)"
      :style="{ '--artist-bg': `url(${artist.Avatar || './assets/images/ico.png'})` }">
      <div class="artist-avatar">
        <img :src="(artist.Avatar || './assets/images/ico.png').replace('/240/', '/480/')" />
      </div>
      <div class="artist-info">
        <h3 class="artist-name">{{ artist.AuthorName }}</h3>
        <div class="artist-stats">
          <div class="stat-item">
            <i class="fas fa-fire"></i>
            <span>{{ artist.Heat }}</span>
          </div>
          <div class="stat-item">
            <i class="fas fa-users"></i>
            <span>{{ artist.FansNum }}</span>
          </div>
        </div>
        <div class="artist-counts">
          <div class="count-item">专辑: {{ artist.AlbumCount }}</div>
          <div class="count-item">单曲: {{ artist.AudioCount }}</div>
          <div class="count-item">视频: {{ artist.VideoCount }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  artists: {
    type: Array,
    required: true,
    default: () => []
  }
});

const emit = defineEmits(['artist-click']);

const onArtistClick = (artist) => {
  emit('artist-click', artist);
};
</script>

<style lang="scss" scoped>
.artist-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.artist-card {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
  position: relative;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);

    .artist-avatar img {
      transform: scale(1.05);
    }

    &::before {
      opacity: 0.15;
    }
  }
}

.artist-avatar {
  width: 100%;
  height: 180px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: var(--artist-bg);
    background-size: cover;
    background-position: center;
    opacity: 0.2;
    filter: blur(10px);
    z-index: 0;
  }

  &,
  .artist-info {
    position: relative;
    z-index: 1;
  }

  img {
    width: 150px;
    height: 150px;
    object-fit: cover;
    transition: transform 0.5s;
    border-radius: 50%;
  }
}

.artist-info {
  padding: 15px;
}

.artist-name {
  font-size: 18px;
  font-weight: bold;
  margin: 0 0 10px 0;
  color: #333;
  text-align: center;
}

.artist-stats {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
  justify-content: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #666;
  font-size: 14px;

  i {
    color: var(--primary-color);
  }
}

.artist-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  justify-content: center;
}

.count-item {
  background-color: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}
</style>
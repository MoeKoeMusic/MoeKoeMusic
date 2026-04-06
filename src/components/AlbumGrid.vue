<template>
  <div class="album-grid">
    <div v-for="(album, index) in albums" :key="index" class="album-card" @click="onAlbumClick(album)">
      <div class="album-cover">
        <img :src="(album.img || './assets/images/ico.png').replace('/240/', '/480/')" />
        <div class="album-overlay">
          <button class="play-button">
            <i class="fas fa-play"></i>
          </button>
        </div>
      </div>
      <div class="album-info">
        <h3 class="album-name" :title="album.albumname">{{ album.albumname }}</h3>
        <div class="album-artist">
          <span v-for="(singer, idx) in album.singers" :key="idx">
            {{ singer.name }}{{ idx < album.singers.length - 1 ? '、' : '' }} </span>
        </div>
        <div class="album-meta">
          <div class="meta-item">
            <i class="fas fa-calendar-alt"></i>
            <span>{{ album.publish_time }}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-music"></i>
            <span>{{ album.songcount }}首</span>
          </div>
          <div class="meta-item" v-if="album.language">
            <i class="fas fa-globe"></i>
            <span>{{ album.language }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  albums: {
    type: Array,
    required: true,
    default: () => []
  }
});

const emit = defineEmits(['album-click']);

const onAlbumClick = (album) => {
  emit('album-click', album);
};
</script>

<style lang="scss" scoped>
.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.album-card {
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

    .album-cover img {
      transform: scale(1.05);
    }

    .album-overlay {
      opacity: 1;
    }
  }
}

.album-cover {
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

.album-overlay {
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

.album-info {
  padding: 15px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.album-name {
  font-size: 16px;
  font-weight: bold;
  margin: 0 0 8px 0;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-artist {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-meta {
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
  .album-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
  }

  .album-name {
    font-size: 14px;
  }

  .album-artist {
    font-size: 12px;
  }

  .meta-item {
    font-size: 10px;
    padding: 3px 6px;
  }
}
</style>
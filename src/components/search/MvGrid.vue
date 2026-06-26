<template>
  <div class="mv-grid">
    <div v-for="(mv, index) in mvs" :key="index" class="mv-card" @click="onMvClick(mv)">
      <div class="mv-cover">
        <img :src="getImage(mv.Pic || mv.ErectPic, 480)" />
        <div class="mv-badge">{{ mv.MvHashMark || 'MV' }}</div>
      </div>
      <div class="mv-info">
        <h3 class="mv-name" :title="mv.MvName">{{ mv.MvName }}</h3>
        <p class="mv-singer">{{ mv.SingerName }}</p>
        <div class="mv-meta">
          <span>{{ formatDuration(mv.Duration) }}</span>
          <span v-if="mv.PublishDate">{{ formatDate(mv.PublishDate) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  mvs: {
    type: Array,
    required: true,
    default: () => []
  }
});

const emit = defineEmits(['mv-click']);

const onMvClick = (mv) => {
  emit('mv-click', mv);
};

const getImage = (url, size) => {
  if (!url) return './assets/images/ico.png';

  if (/^https?:\/\//.test(url)) {
    return url.replace('{size}', size);
  }

  if (/^\d{14,}\.[a-zA-Z0-9]+$/.test(url)) {
    const datePart = url.slice(0, 8);
    return `https://imge.kugou.com/mvhdpic/${size}/${datePart}/${url}`;
  }

  if (url.startsWith('/')) {
    return `https://imge.kugou.com${url}`.replace('{size}', size);
  }

  return url.replace('{size}', size);
};

const formatDate = (value) => {
  if (!value) return '';
  return String(value).split(' ')[0];
};

const formatDuration = (value) => {
  const seconds = Number(value) > 1000 ? Math.floor(Number(value) / 1000) : Number(value);
  if (!seconds) return '00:00';

  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const remainSeconds = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainSeconds}`;
};
</script>

<style lang="scss" scoped>
.mv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 18px;
  margin-bottom: 20px;
}

.mv-card {
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
  }

  &:is(.dark .mv-card) {
    background-color: #1e1e1e;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

    &:hover {
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.5);
    }
  } 
}

.mv-cover {
  position: relative;
  aspect-ratio: 16 / 9;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.mv-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  background-color: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 12px;
}

.mv-info {
  padding: 14px;
}

.mv-name {
  margin: 0;
  font-size: 16px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:is(.dark .mv-name) {
    color: #fff;
  }
}

.mv-singer {
  margin: 8px 0 0;
  font-size: 14px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mv-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;

  span {
    padding: 4px 8px;
    border-radius: 999px;
    background-color: #f5f5f5;
    color: #666;
    font-size: 12px;
  }

  &:is(.dark .mv-meta) {
    span {
      background-color: rgba(255, 255, 255, 0.08);
      color: #aaa;
    }
  }
}

@media (max-width: 768px) {
  .mv-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
    <section class="home-recommendations-section">
        <h2 class="section-title recommend-title" role="button" tabindex="0" @click="toggleRecommendCardStyle"
            @keydown.enter.prevent="toggleRecommendCardStyle" @keydown.space.prevent="toggleRecommendCardStyle">
            {{ $t('tui-jian') }}
        </h2>
        <div class="recommendations" :class="`recommendations-${recommendCardStyle}`">
            <Transition name="recommend-style" mode="out-in">
                <div v-if="recommendCardStyle === 'image'" key="image" class="recommendations-layout">
                    <div class="recommend-card gradient-background">
                        <div class="radio-card">
                            <div class="radio-left">
                                <div class="disc-container">
                                    <img :src="`./assets/images/home/hutao1.png`" class="radio-disc">
                                </div>
                                <div class="decorative-box">
                                    <div class="music-bars">
                                        <div class="bar"></div>
                                        <div class="bar"></div>
                                        <div class="bar"></div>
                                        <div class="bar"></div>
                                    </div>
                                </div>
                                <div class="play-button" @click="playFM"></div>
                            </div>
                            <div class="radio-content gradient-background">
                                <div class="radio-title">
                                    <span class="heart-icon">💖</span>
                                    MoeKoe Radio
                                    <span class="shuffle-icon" @click="toggleMode">{{ modeIcon }}</span>
                                </div>
                                <div class="radio-subtitle">{{ radioSubtitle }}</div>
                            </div>
                        </div>
                    </div>
                    <div class="recommend-card">
                        <router-link :to="{
                            path: '/Ranking'
                        }" class="ranking-entry">
                            <div class="ranking-content">
                                <img :src="`./assets/images/home/hutao2.png`" class="ranking-icon">
                                <h3 class="ranking-title">排行榜</h3>
                                <div class="ranking-description">发现你的专属好歌</div>
                            </div>
                        </router-link>
                    </div>

                    <div class="recommend-card">
                        <div class="playlist-entry gradient-background">
                            <router-link :to="{
                                path: '/PlaylistDetail',
                                query: { global_collection_id: 'collection_3_25230245_24_0' }
                            }">
                                <div class="playlist-content">
                                    <div class="playlist-icon">
                                        <img :src="`./assets/images/home/hutao.png`" />
                                    </div>
                                    <div class="ranking-description">送给也喜欢音乐的你</div>
                                </div>
                            </router-link>
                        </div>
                    </div>
                </div>

                <div v-else key="icon" class="recommendations-layout icon-recommendations">
                    <div class="recommend-card icon-recommend-card radio-icon-card">
                        <div class="icon-card-main">
                            <button class="icon-play-button" type="button" @click="playFM">
                                <i class="fas fa-play"></i>
                            </button>
                            <div class="icon-card-copy">
                                <div class="icon-card-eyebrow">
                                    <i class="fas fa-headphones"></i>
                                    <span>MoeKoe Radio</span>
                                </div>
                                <div class="icon-card-title">{{ radioSubtitle }}</div>
                            </div>
                        </div>
                        <button class="icon-mode-button" type="button" @click.stop="toggleMode">{{ modeIcon }}</button>
                    </div>

                    <router-link :to="{
                        path: '/Ranking'
                    }" class="recommend-card icon-recommend-card icon-link-card icon-ranking-entry">
                        <div class="icon-card-symbol">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="icon-card-copy">
                            <div class="icon-card-eyebrow">热度趋势</div>
                            <div class="icon-card-title">排行榜</div>
                            <div class="icon-card-description">发现你的专属好歌</div>
                        </div>
                    </router-link>

                    <router-link :to="{
                        path: '/PlaylistDetail',
                        query: { global_collection_id: 'collection_3_25230245_24_0' }
                    }" class="recommend-card icon-recommend-card icon-link-card icon-playlist-entry">
                        <div class="icon-card-symbol">
                            <i class="fas fa-list-ul"></i>
                        </div>
                        <div class="icon-card-copy">
                            <div class="icon-card-eyebrow">精选歌单</div>
                            <div class="icon-card-title">阿珏酱的歌单</div>
                            <div class="icon-card-description">送给也喜欢音乐的你</div>
                        </div>
                    </router-link>
                </div>
            </Transition>
        </div>
    </section>
    <Teleport to="body">
        <div class="note-container">
            <transition-group name="fly-note">
                <div v-for="note in flyingNotes" :key="note.id" class="flying-note" :style="note.style">
                    ♪</div>
            </transition-group>
        </div>
    </Teleport>
</template>

<script setup>
import { computed, ref } from "vue";
import { get } from '../../utils/request';

const props = defineProps({
    playerControl: Object
});

const RECOMMEND_CARD_STYLE_KEY = 'homeRecommendCardStyle';
const recommendCardStyle = ref(localStorage.getItem(RECOMMEND_CARD_STYLE_KEY) === 'icon' ? 'icon' : 'image');
const currentMode = ref('1');
const modes = ['1', '2', '3', '4', '6'];

const modeIcon = computed(() => {
    switch (currentMode.value) {
        case '1': return '💖';
        case '2': return '🎶';
        case '3': return '🔥';
        case '4': return '💎';
        case '6': return '👑';
        default: return '💖';
    }
});

const radioSubtitle = computed(() => {
    switch (currentMode.value) {
        case '1': return '私人专属好歌推荐';
        case '2': return '经典怀旧金曲精选';
        case '3': return '热门好歌随心听';
        case '4': return '小众宝藏佳作发现';
        case '6': return 'VIP专属音乐推荐';
        default: return '根据你的听歌喜好推荐';
    }
});

const toggleMode = () => {
    const currentIndex = modes.indexOf(currentMode.value);
    const nextIndex = (currentIndex + 1) % modes.length;
    currentMode.value = modes[nextIndex];
};

const toggleRecommendCardStyle = () => {
    recommendCardStyle.value = recommendCardStyle.value === 'image' ? 'icon' : 'image';
    localStorage.setItem(RECOMMEND_CARD_STYLE_KEY, recommendCardStyle.value);
};

const flyingNotes = ref([]);
let noteId = 0;

const playFM = async (event) => {
    try {
        const playButton = event.currentTarget;
        const rect = playButton.getBoundingClientRect();
        const note = {
            id: noteId++,
            style: {
                '--start-x': `${rect.left + rect.width / 2}px`,
                '--start-y': `${rect.top + rect.height / 2}px`,
                'left': '0',
                'top': '0'
            }
        };
        flyingNotes.value.push(note);
        setTimeout(() => {
            flyingNotes.value = flyingNotes.value.filter(n => n.id !== note.id);
        }, 1500);

        const response = await get('/top/card', {
            params: {
                card_id: currentMode.value
            }
        });

        if (response.status === 1 && response.data?.song_list?.length > 0) {
            const newSongs = response.data.song_list.map(song => {
                return {
                    hash: song.hash,
                    name: song.songname,
                    cover: song.sizable_cover?.replace("{size}", 480),
                    author: song.author_name,
                    timelen: song.time_length
                }
            })
            props.playerControl.addPlaylistToQueue(newSongs);
        }
    } catch (error) {
        console.error('FM播放出错:', error);
    }
};
</script>

<style lang="scss" scoped>
.home-recommendations-section {
    --home-icon-card-bg: #fff;
    --home-icon-card-border: rgba(31, 41, 55, 0.08);
    --home-icon-card-shadow: 0 12px 30px rgba(31, 41, 55, 0.1);
    --home-icon-card-title: var(--text-color);
    --home-icon-card-text: #5d6676;
    --home-icon-card-muted: #8a94a6;
    --home-icon-card-soft: rgba(var(--primary-color-rgb), 0.1);

    &:is(.dark .home-recommendations-section) {
        --home-icon-card-bg: #1d1d1d;
        --home-icon-card-border: rgba(255, 255, 255, 0.08);
        --home-icon-card-shadow: 0 14px 34px rgba(0, 0, 0, 0.32);
        --home-icon-card-title: rgba(255, 255, 255, 0.9);
        --home-icon-card-text: rgba(255, 255, 255, 0.62);
        --home-icon-card-muted: rgba(255, 255, 255, 0.45);
        --home-icon-card-soft: rgba(var(--primary-color-rgb), 0.18);
    }
}

.section-title {
    font-size: 26px;
    font-weight: bold;
    margin-bottom: 30px;
    color: var(--primary-color);
}

.recommend-title {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
    transition: color 0.25s ease, transform 0.25s ease;

    &::after {
        content: '\f021';
        font-family: "Font Awesome 5 Free";
        font-size: 14px;
        font-weight: 900;
        opacity: 0;
        transform: rotate(-60deg) scale(0.9);
        transition: opacity 0.25s ease, transform 0.25s ease;
    }

    &:hover,
    &:focus-visible {
        transform: translateY(-1px);

        &::after {
            opacity: 0.75;
            transform: rotate(0deg) scale(1);
        }
    }

    &:focus-visible {
        outline: 2px solid rgba(var(--primary-color-rgb), 0.35);
        outline-offset: 4px;
        border-radius: 6px;
    }
}

.recommendations {
    margin-bottom: 40px;
}

.recommendations-layout {
    display: flex;
    gap: 35px;
    align-items: stretch;
    min-height: 200px;
}

.recommend-style-enter-active,
.recommend-style-leave-active {
    transition: opacity 0.24s ease, transform 0.24s ease, filter 0.24s ease;
}

.recommend-style-enter-from,
.recommend-style-leave-to {
    opacity: 0;
    filter: blur(6px);
    transform: translateY(12px) scale(0.98);
}

.recommend-card {
    width: 400px;
    height: 200px;
    box-sizing: border-box;
    border-radius: 15px;
    overflow: hidden;
    transition: transform 0.3s ease, box-shadow 0.3s ease;

    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    }

    &.gradient-background {
        background: linear-gradient(135deg, var(--primary-color), #8ff2ff);
        color: white;
    }
}

.icon-recommendations {
    align-items: stretch;
}

.icon-recommend-card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 22px;
    color: var(--home-icon-card-title);
    background:
        linear-gradient(135deg, rgba(var(--primary-color-rgb), 0.14), transparent 58%),
        var(--home-icon-card-bg);
    border: 1px solid var(--home-icon-card-border);
    box-shadow: var(--home-icon-card-shadow);
    text-decoration: none;
    box-sizing: border-box;

    &::before {
        content: "";
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 82% 18%, var(--home-icon-card-soft), transparent 36%);
        opacity: 0.85;
        pointer-events: none;
    }

    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 18px 38px rgba(31, 41, 55, 0.16);

        .icon-card-symbol,
        .icon-play-button {
            transform: translateY(-2px) scale(1.04);
        }
    }
}

.icon-card-main,
.icon-card-copy,
.icon-card-symbol,
.icon-mode-button {
    position: relative;
    z-index: 1;
}

.icon-card-main {
    display: flex;
    align-items: center;
    gap: 18px;
    height: 100%;
    min-height: 0;
}

.icon-card-copy {
    min-width: 0;
}

.icon-play-button,
.icon-mode-button {
    border: 0;
    cursor: pointer;
}

.icon-play-button {
    flex: 0 0 auto;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    color: #fff;
    background: linear-gradient(135deg, var(--primary-color), #55d6e8);
    box-shadow: 0 12px 24px rgba(var(--primary-color-rgb), 0.24);
    font-size: 24px;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.icon-mode-button {
    position: absolute;
    top: 18px;
    right: 18px;
    z-index: 2;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--home-icon-card-soft);
    font-size: 18px;
    transition: transform 0.25s ease, background-color 0.25s ease;

    &:hover {
        transform: rotate(12deg) scale(1.08);
        background: rgba(var(--primary-color-rgb), 0.2);
    }
}

.icon-card-symbol {
    width: 64px;
    height: 64px;
    display: grid;
    place-items: center;
    border-radius: 18px;
    color: #fff;
    background: linear-gradient(135deg, var(--primary-color), #8ff2ff);
    font-size: 27px;
    box-shadow: 0 12px 24px rgba(var(--primary-color-rgb), 0.22);
    transition: transform 0.25s ease;
}

.icon-ranking-entry .icon-card-symbol {
    background: linear-gradient(135deg, var(--primary-color), #9f92ff);
}

.icon-playlist-entry .icon-card-symbol {
    background: linear-gradient(135deg, var(--primary-color), #8bdc6f);
}

.icon-card-eyebrow {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 10px;
    color: var(--home-icon-card-muted);
    font-size: 13px;
    font-weight: 700;
}

.icon-card-title {
    color: var(--home-icon-card-title);
    font-size: 22px;
    font-weight: 800;
    line-height: 1.25;
}

.icon-card-description {
    margin-top: 8px;
    color: var(--home-icon-card-text);
    font-size: 14px;
    line-height: 1.5;
}

.radio-card {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    border-radius: 15px;
}

.radio-left {
    flex: 0;
    margin-top: 7px;
    display: flex;
    align-items: center;
    width: 100%;
    justify-content: space-between;
}

.disc-container {
    position: relative;
    order: 1;
}

.radio-disc {
    width: 125px;
    height: 125px;
    object-fit: cover;
    border-radius: 50%;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2),
        inset 0 0 20px rgba(0, 0, 0, 0.1),
        0 2px 4px rgba(255, 255, 255, 0.8);
    padding: 2px;
}

.decorative-box {
    width: 60px;
    height: 60px;
    position: relative;
    border-radius: 12px;
    transform: perspective(500px) rotateY(-15deg);
    transition: transform 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 10px;
}

.music-bars {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 30px;
}

.bar {
    width: 3px;
    background: #4a90e2;
    border-radius: 3px;
    animation: sound-wave 1.2s ease-in-out infinite;

    @for $i from 1 through 4 {
        &:nth-child(#{$i}) {
            @if $i ==1 {
                height: 15px;
                animation-delay: 0s;
            }

            @else if $i ==2 {
                height: 20px;
                animation-delay: 0.2s;
            }

            @else if $i ==3 {
                height: 12px;
                animation-delay: 0.4s;
            }

            @else if $i ==4 {
                height: 18px;
                animation-delay: 0.6s;
            }
        }
    }
}

@keyframes sound-wave {

    0%,
    100% {
        transform: scaleY(1);
    }

    50% {
        transform: scaleY(0.5);
    }
}

.play-button {
    order: 3;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
    margin-right: 20px;
    margin-top: -57px;
    position: relative;
    font-size: 20px;
    color: #333;

    &::after {
        content: '♪';
        transition: all 0.2s ease;
        border: none;
        margin-left: 0;
    }

    &:hover {
        transform: scale(1.05);
        background: var(--primary-color);
        color: #fff;

        &::after {
            border-color: none;
        }
    }
}

.radio-title {
    justify-content: center;
    font-size: 22px;
    font-weight: bold;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
}

.heart-icon {
    font-size: 20px;
}

.shuffle-icon {
    font-size: 20px;
    color: #666;
    cursor: pointer;
    transition: transform 0.3s ease;

    &:hover {
        transform: scale(1.1);
        color: var(--primary-color);
    }
}

.radio-subtitle {
    font-size: 15px;
    color: white;
    text-align: center;
}

.note-container {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    overflow: hidden;
}

.flying-note {
    position: absolute;
    font-size: 36px;
    color: var(--primary-color);
    pointer-events: none;
    transform-origin: center;
}

.fly-note-enter-active {
    animation: fly-note 2s ease-out forwards;
}

.fly-note-leave-active {
    animation: fly-note 2s ease-out forwards;
}

@keyframes fly-note {
    0% {
        transform: translate(var(--start-x), calc(var(--start-y) - 50px)) rotate(0deg) scale(1.2);
        opacity: 0.9;
    }

    20% {
        transform: translate(calc(var(--start-x) + 20px), calc(var(--start-y) - 70px)) rotate(45deg) scale(1.3);
        opacity: 0.85;
    }

    100% {
        transform: translate(80vw, 100vh) rotate(360deg) scale(0.6);
        opacity: 0;
    }
}

.ranking-entry {
    display: block;
    width: 100%;
    height: 100%;
    text-decoration: none;
    background: linear-gradient(135deg, var(--primary-color), #9f92ff);
    border-radius: 15px;
    overflow: hidden;
}

.ranking-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    position: relative;
}

.ranking-icon {
    width: 135px;
}

.ranking-title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 0px;
    margin-top: 0px;
}

.ranking-description {
    font-size: 16px;
    opacity: 0.9;
}

.playlist-entry {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border-radius: 15px;
    background: linear-gradient(135deg, var(--primary-color), #cfff82);
    color: white;
    text-align: center;
    transition: transform 0.3s ease, box-shadow 0.3s ease;

    &:hover {
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    }
}

.playlist-content {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    justify-content: flex-end;
}

.playlist-icon {
    width: 144px;
    height: 144px;

    img {
        width: 100%;
        height: 100%;
    }
}

@media screen and (max-width: 768px) {
    .recommendations-layout {
        flex-direction: column;
        gap: 14px;
        min-height: 0;
    }

    .recommend-card {
        width: 100%;
    }

    .icon-recommend-card {
        padding: 18px;
    }

    .icon-card-title {
        font-size: 20px;
    }

    .icon-play-button {
        width: 62px;
        height: 62px;
        font-size: 21px;
    }

}
</style>

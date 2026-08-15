<script setup>
import { reactive, ref, onMounted } from 'vue';
import { get, post } from '@/utils/request';
import { MoeAuthStore } from '@/stores/store';

const moeAuthStore = MoeAuthStore();

const { closePopup } = defineProps({
    closePopup: Function
});

const myTeam = ref(null);
const badgeLabel = ref('');
const currentPeriod = ref(0);
const eventStatus = reactive({
    periodInfo: null,
    my: { info: null, status: null },
});

const refreshStatus = async () => {
    const periodInfo = await get('/team/period/info');
    eventStatus.periodInfo = periodInfo.data;
    currentPeriod.value = eventStatus.periodInfo?.current_period_info?.id || 0;
    if (!periodInfo.status || currentPeriod.value === 0) {
        $modal.alert(`获取当期组队活动失败: ${periodInfo.error_msg}`);
        console.error('[组队活动] 获取当期组队活动失败, 错误码:', periodInfo.error_code);
        return;
    }
    console.log('[组队活动] 当期组队活动 id:', currentPeriod.value);
    eventStatus.my.status = (await get(`/team/my/status?period_id=${currentPeriod.value}`)).data;
    eventStatus.my.info = (await get(`/team/my/info?period_id=${currentPeriod.value}`)).data;
}

const createTeam = async () => {
    if(currentPeriod.value === 0) return;
    return await get(`/team/my?period_id=${currentPeriod.value}`);
}

const joinTeam = async (team_code) => {
    if(!team_code) return;
    return await post('/team/join', { team_code });
}

const getMyTeam = () => {
    let teams;
    if(eventStatus.my.status.is_create_team)
        teams = eventStatus.my.info.my_create_team_list;
    else if(eventStatus.my.status.is_join_team)
        teams = eventStatus.my.info.my_join_team_list;
    else return null;
    return teams.find(t => {
        if(t.period_info.id === currentPeriod.value)
            return t;
    });
}

const getBadgeLabel = () => {
    const periodName = eventStatus.my.info.period_info.name;
    const roleName = eventStatus.my.status.is_create_team && '队长' ||
                     eventStatus.my.status.is_join_team && '队员' ||
                     eventStatus.my.status.is_visit_team && '访客';
    return `${periodName} ${roleName}`;
}

onMounted(async () => {
    await refreshStatus();
    badgeLabel.value = getBadgeLabel();
    myTeam.value = getMyTeam();
    console.log(eventStatus, myTeam)
});
</script>

<template>
    <Teleport to="body">
        <div class="mask" @click="closePopup"></div>
        <div class="popup">
            <div class="my-info">
                <img class="avatar" draggable="false" :src="moeAuthStore.UserInfo?.pic" />
                <span class="info">
                    <span class="nick">{{ moeAuthStore.UserInfo?.nickname }}</span>
                    <span class="badge">{{ badgeLabel }}</span>
                </span>
            </div>
            <div v-if="myTeam" class="my-team">
                <span class="title">我的队伍 ({{ myTeam.member_list.length }})</span>
                <div class="members">
                    <img draggable="false" v-for="m in myTeam.member_list" :src="m.user_pic" :title="m.nick_name" />
                    <span class="invite"><i class="fas fa-plus" /></span>
                </div>
            </div>
            <template v-if="eventStatus.periodInfo" v-for="(info, period) in eventStatus.periodInfo" :key="period">
                <div v-if="info.name" class="period-card" :class="period">
                    <span class="title">
                        {{ info.name }} {{ info.status_name }}
                    </span>
                    <span class="time">
                        活动时间: {{ info.start_time }} - {{ info.end_time }}
                    </span>
                </div>
            </template>
        </div>
    </Teleport>
</template>

<style lang="scss" scoped>
@keyframes popup-slidein {
    from { translate: 40px; }
    to { translate: 0; }
}

.mask {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.35);
    z-index: 100;
    backdrop-filter: blur(8px);
}

.my-info {
    display: flex;
    gap: 0.8rem;
    >.avatar {
        width: 45px;
        height: 45px;
        border-radius: 100%;
    }
    >.info {
        display: flex;
        flex-direction: column;
        >.nick {
            font-weight: 500;
        }
        >.badge {
            font-size: 0.8rem;
        }
    }
}

.my-team {
    >.title {
        font-weight: bold;
    }
    >.members {
        display: flex;
        >img {
            width: 32px;
            height: 32px;
            border-radius: 100%;
        }
        >.invite {
            width: 32px;
            height: 32px;
            border: 1px dashed;
            border-radius: 100%;
            >i {
                padding: 9px;
            }
        }
    }
}

.popup {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background-color: var(--background-color);
    padding: 1rem;
    position: absolute;
    top: 0;
    right: 0;
    width: min(25%, 350px);
    height: 100%;
    border-radius: 8px;
    z-index: 101;

    .period-card {
        height: 80px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 8px;
        border-radius: 8px;
        border-color: var(--border-color);
        box-shadow: 2px 2px 2px var(--color-box-shadow);

        &.current_period_info {
            background-image: linear-gradient(280deg,#ff9a9e 0%, #fecfef 99%, #fecfef 100%);
        }
        &.last_period_info {
            background-image: linear-gradient(0deg,#cfd9df 0%, #e2ebf0 100%);
        }
        >.title {
            font-size: 1.2rem;
            font-weight: bold;
        }
        >.time {
            font-size: 0.8rem;
        }
    }
}
</style>
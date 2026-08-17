<script setup>
import { reactive, ref, useTemplateRef, onMounted } from 'vue';
import { get, post } from '@/utils/request';
import { MoeAuthStore } from '@/stores/store';

const moeAuthStore = MoeAuthStore();

const { closePopup } = defineProps({
    closePopup: Function
});

const closeWithAnimation = () => {
    popupRef.value?.classList.add('close');
    setTimeout(closePopup, 300);
}

const popupRef = useTemplateRef('popup');
const myTeam = ref(null);
const badgeLabel = ref('');
const currentPeriod = ref(0);
const eventStatus = reactive({
    periodInfo: null,
    my: { info: null, status: null },
});

const getBadgeLabel = () => {
    const periodName = eventStatus.my.info.period_info.name;
    const roleName = eventStatus.my.status.is_create_team && '队长' ||
                     eventStatus.my.status.is_join_team && '队员' ||
                     eventStatus.my.status.is_visit_team && '访客';
    return `${periodName} ${roleName}`;
}

const getMyTeam = () => {
    let teams;
    if(eventStatus.my.status.is_create_team)
        teams = eventStatus.my.info.my_create_team_list;
    else if(eventStatus.my.status.is_join_team)
        teams = eventStatus.my.info.my_join_team_list;
    else return null;
    return teams.find(t => t.period_info.id === currentPeriod.value) || false;
}

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

    badgeLabel.value = getBadgeLabel();
    myTeam.value = getMyTeam();
}

const createTeam = async () => {
    if(currentPeriod.value === 0) return;
    return await get(`/team/my?period_id=${currentPeriod.value}`);
}

const joinTeam = async (team_code) => {
    if(!team_code) return;
    return await post('/team/join', { team_code });
}

const copyTeamCode = async () => {
    try {
        const teamCode = myTeam.value?.team_code || getMyTeam()?.team_code;
        if(!teamCode) throw new Error('can not get team code');
        await navigator.clipboard.writeText(teamCode);
        $message.success('已复制邀请码, 快去发给好友吧~');
    } catch(e) {
        $message.error('复制失败!');
        console.error('[组队活动] 复制邀请码失败:', e);
    }
}

const createTeamFromUi = async () => {
    try {
        const res = await createTeam();
        if(!res.status) {
            $message.success('已成功创建队伍!');
            await refreshStatus();
        } else {
            $message.error(res.error_msg || '创建队伍失败');
            console.error('[组队活动] 创建队伍失败:', res);
        }
    } catch(e) {
        $message.error(e.response?.data?.error_msg || '创建队伍失败');
        console.error('[组队活动] 创建队伍失败:', e);
    }
}

const joinTeamFromUi = async () => {
    const team_code = await $modal.prompt('请输入队伍码:');
    if(!team_code) return;
    try {
        const res = await joinTeam(team_code);
        if(!res.status) {
            $message.success('已成功加入队伍!');
            await refreshStatus();
        } else {
            $message.error(res.error_msg || '加入队伍失败');
            console.error('[组队活动] 加入队伍失败:', res);
        }
    }
    catch(e) {
        $message.error(e.response?.data?.error_msg || '加入队伍失败');
        console.error('[组队活动] 加入队伍失败:', e);
    }
}

onMounted(async () => {
    await refreshStatus();
    // console.log('[team-event] on-mounted', eventStatus, myTeam);
});
</script>

<template>
    <div class="mask" @click="closeWithAnimation"></div>
    <div class="popup" ref="popup">
        <div class="my-info">
            <div class="avatar-and-info">
                <img class="avatar" draggable="false" :src="moeAuthStore.UserInfo?.pic" />
                <span class="info">
                    <span class="nick">{{ moeAuthStore.UserInfo?.nickname }}</span>
                    <span class="badge">{{ badgeLabel }}</span>
                </span>
            </div>
            <button class="close-btn" type="buton" title="关闭" @click="closeWithAnimation"><i class="fas fa-xmark" /></button>
        </div>
        <span class="title">我的队伍 ({{ myTeam?.member_list?.length || 0 }})</span>
        <div v-if="myTeam" class="my-team">
            <div class="members">
                <img draggable="false" v-for="m in myTeam?.member_list" :src="m.user_pic" :title="m.nick_name" />
                <span class="invite" title="复制邀请码" @click="copyTeamCode"><i class="fas fa-plus" /></span>
            </div>
        </div>
        <div v-else-if="myTeam === null">少女祈祷中...</div>
        <div v-else>还没有队伍呢, 快去加入或者创建一个!</div>
        <span class="title">活动信息</span>
        <template v-if="eventStatus.periodInfo" v-for="(info, period) in eventStatus.periodInfo" :key="period">
            <div v-if="info.name" class="period-card" :class="period">
                <span class="title">
                    {{ info.name }} {{ info.status_name }}
                </span>
                <div class="banner">
                    <div v-if="period === 'current_period_info'">
                        <span class="text" v-if="myTeam">快去邀请好友加入队伍吧~</span>
                        <div class="btns" v-else>
                            <button class="primary" type="button" @click="createTeamFromUi">创建队伍</button>
                            <button type="button" @click="joinTeamFromUi">加入队伍</button>
                        </div>
                    </div>
                    <span class="text" v-else>该期活动已结束~</span>
                </div>
                <span class="time">
                    活动时间: {{ info.start_time }} - {{ info.end_time }}
                </span>
            </div>
        </template>
        <div v-else>少女祈祷中...</div>
    </div>
</template>

<style lang="scss" scoped>
@keyframes popup-slidein {
    from { translate: 80%; }
    to { translate: 0; }
}

@keyframes popup-slideout {
    from { translate: 0; }
    to { translate: 100%; }
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

.title {
    font-weight: bold;
}

.my-info {
    display: flex;
    justify-content: space-between;
    >.avatar-and-info {
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
    >.close-btn {
        color: var(--text-color);
        cursor: pointer;
        border: none;
        background-color: transparent;
        font-size: 1.2rem;
        &:hover {
            opacity: 0.6;
        }
    }
}

.my-team {
    >.members {
        display: flex;
        >img {
            width: 32px;
            height: 32px;
            border-radius: 100%;
        }
        >.invite {
            cursor: pointer;
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
    border: 1px solid var(--border-color);
    border-radius: 8px;
    z-index: 101;
    animation: popup-slidein .3s forwards;

    &.close {
        animation: popup-slideout .3s forwards;
    }

    .period-card {
        color: #000;
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
        >.banner {
            padding: 0.4rem 0;
            text-align: center;

            .text {
                font-style: italic;
            }

            .btns {
                display: flex;
                gap: 0.4rem;
                justify-content: center;

                >button {
                    border: 1px solid #0001;
                    border-radius: 2px;
                    cursor: pointer;
                    &.primary {
                        color: #fff;
                        background-color: var(--primary-color);
                        box-shadow: 2px 2px 2px var(--color-box-shadow);
                    }
                }
            }
        }
        >.time {
            font-size: 0.8rem;
        }
    }
}
</style>
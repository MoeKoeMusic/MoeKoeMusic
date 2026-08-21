import { h, reactive, ref, render } from 'vue';
import { get, post } from '@/utils/request';
import TeamEvent from '@/components/TeamEvent.vue';

const teamEventPopupOpened = ref(false);
const currentPeriod = ref(0);
const eventStatus = reactive({
    periodInfo: null,
    my: {
        info: null,
        status: null,
        teams: {
            created: null,
            joined: null
        }
    },
    refreshLock: false
});

const getMyTeam = () => {
    // 目前每人都只能同时创建和加入一个队伍
    // 所以直接这样写
    eventStatus.my.teams.created = !!eventStatus.my.status?.is_create_team && eventStatus.my.info?.my_create_team_list[0];
    eventStatus.my.teams.joined = !!eventStatus.my.status?.is_join_team && eventStatus.my.info?.my_join_team_list[0];
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

    getMyTeam();
}

const createTeam = async () => {
    if(currentPeriod.value === 0) return;
    return await get(`/team/my?period_id=${currentPeriod.value}`);
}

const joinTeam = async (team_code) => {
    if(!team_code) return;
    return await post('/team/join', { team_code });
}

const generateShareText = (teamCode) => {
    return window.electron?
        `快来参与萌音组队领取VIP活动, 这是我的组队链接喵: moekoe://team/join?code=${teamCode}`:
        `快来参与萌音组队领取VIP活动, 我的组队码是 ${teamCode} 谢谢喵`;
}

const copyTeamCode = async (teamCode) => {
    try {
        if(!teamCode) throw new Error('team code can\'t be empty');
        await navigator.clipboard.writeText(generateShareText(teamCode));
        $message.success('已复制邀请码, 快去发给好友吧~');
    } catch(e) {
        $message.error('复制失败!');
        console.error('[组队活动] 复制邀请码失败:', e);
    }
}

const createTeamWithToast = async () => {
    try {
        const res = await createTeam();
        if(res.data?.team_id) {
            $message.success('已成功创建队伍!');
            await refreshStatus();
        } else {
            $message.error(res.error_msg || '创建队伍失败');
            console.error('[组队活动] 创建队伍失败:', res);
        }
    } catch(e) {
        if(e.response?.data?.team_id) {
            $message.success('创建队伍成功!');
            await refreshStatus();
            return;
        }
        $message.error(e.response?.data?.error_msg || '创建队伍失败');
        console.error('[组队活动] 创建队伍失败:', e);
    }
}

const joinTeamWithToast = async (code = null) => {
    const team_code = code? code: await $modal.prompt('请输入队伍码:');
    if(!team_code) return;
    try {
        const res = await joinTeam(team_code);
        if(!res.error_code) {
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

const refreshStatusWithToast = () => {
    eventStatus.refreshLock = true;
    refreshStatus().then(() => $message.success('刷新成功')).catch(e => {
        $message.error('刷新失败!');
        console.error('[组队活动] 手动刷新状态失败:', e);
    });
    setTimeout(() => eventStatus.refreshLock = false, 1500);
}

export const actions = {
    copyTeamCode,
    createTeam: createTeamWithToast,
    joinTeam: joinTeamWithToast,
    refreshStatus: refreshStatusWithToast
}

export const createTeamEventPopup = async () => {
    if(teamEventPopupOpened.value) return;
    await refreshStatus().catch(e => console.error('[组队活动] 状态初始化失败:', e));
    const container = document.createElement('div');
    container.id = 'team-event';
    document.body.append(container);
    const closePopup = () => {
        container.remove();
        teamEventPopupOpened.value = false;
    }
    const vnode = h(TeamEvent, { ...actions, closePopup, status: eventStatus });
    render(vnode, container);
    teamEventPopupOpened.value = true;
}

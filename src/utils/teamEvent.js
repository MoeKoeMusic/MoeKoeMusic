import { h, render, ref } from 'vue';
import TeamEvent from '@/components/TeamEvent.vue';

const teamEventPopupOpened = ref(false);

export const createTeamEventPopup = () => {
    if(teamEventPopupOpened.value) return;
    const container = document.createElement('div');
    container.id = 'team-event';
    document.body.append(container);
    const closePopup = () => {
        container.remove();
        teamEventPopupOpened.value = false;
    }
    const vnode = h(TeamEvent, { closePopup });
    render(vnode, container);
    teamEventPopupOpened.value = true;
}
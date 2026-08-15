import { createVNode, render, ref } from 'vue';
import TeamEvent from '@/components/TeamEvent.vue';

const teamEventPopupOpened = ref(false);

export const createTeamEventPopup = () => {
    if(teamEventPopupOpened.value) return;
    const container = document.createElement('div');
    const closePopup = () => {
        container.remove();
        teamEventPopupOpened.value = false;
    }
    const vnode = createVNode(TeamEvent, { closePopup });
    render(vnode, container);
    teamEventPopupOpened.value = true;
}
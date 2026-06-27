import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const EXPANDED_HEIGHT = 220;
const COLLAPSED_HEIGHT = 56;
const COVER_SIZE = 200;
const COLLAPSED_COVER_SIZE = 36;
const TITLE_SIZE = 36;
const COLLAPSED_TITLE_SIZE = 20;
const LIST_TITLE_SIZE = 24;
const COLLAPSED_LIST_TITLE_SIZE = 20;
const TRACK_HEADER_OVERLAP = 3;
const SPACER_COLLAPSE_OFFSET = 20;
const COLLAPSED_THRESHOLD = 0.86;

export const useStickyDetailHeader = () => {
    const scrollTop = ref(0);
    const listHeaderHeight = ref(0);
    let scrollContainer = null;
    let listHeaderElement = null;
    let listHeaderObserver = null;

    const collapseDistance = Math.max(1, EXPANDED_HEIGHT - COLLAPSED_HEIGHT);
    const progress = computed(() => clamp(scrollTop.value / collapseDistance));
    const currentCoverSize = computed(() => COVER_SIZE - (COVER_SIZE - COLLAPSED_COVER_SIZE) * progress.value);
    const currentTitleSize = computed(() => TITLE_SIZE - (TITLE_SIZE - COLLAPSED_TITLE_SIZE) * progress.value);
    const currentListTitleSize = computed(() => LIST_TITLE_SIZE - (LIST_TITLE_SIZE - COLLAPSED_LIST_TITLE_SIZE) * progress.value);
    const expandedRatio = computed(() => 1 - progress.value);
    const detailsOpacity = computed(() => clamp(1 - progress.value * 1.2));

    const collapsedActionOpacity = computed(() => {
        if (progress.value <= COLLAPSED_THRESHOLD) return 0;
        return clamp((progress.value - COLLAPSED_THRESHOLD) / (1 - COLLAPSED_THRESHOLD));
    });

    const measureListHeader = () => {
        const listHeader = listHeaderElement || document.querySelector('.detail-page .track-list-header');
        listHeaderHeight.value = listHeader?.getBoundingClientRect().height ?? 0;
    };

    const syncScroll = () => {
        scrollTop.value = scrollContainer?.scrollTop ?? 0;
    };

    const observeListHeader = () => {
        const nextElement = document.querySelector('.detail-page .track-list-header');
        if (listHeaderElement === nextElement) return;
        listHeaderObserver?.disconnect();
        listHeaderElement = nextElement;
        if (!listHeaderElement) return;
        listHeaderObserver = new ResizeObserver(measureListHeader);
        listHeaderObserver.observe(listHeaderElement);
        measureListHeader();
    };

    const bindScroll = () => {
        const nextContainer = document.querySelector('.app-main-scroll');
        if (scrollContainer === nextContainer) return;
        scrollContainer?.removeEventListener('scroll', syncScroll);
        scrollContainer = nextContainer;
        scrollContainer?.addEventListener('scroll', syncScroll, { passive: true });
        syncScroll();
    };

    const refresh = () => {
        observeListHeader();
        bindScroll();
    };

    onMounted(() => {
        nextTick(refresh);
        requestAnimationFrame(refresh);
        window.addEventListener('resize', refresh);
        window.addEventListener('settings-change', refresh);
        window.addEventListener('sidebar-collapse-change', refresh);
    });

    onBeforeUnmount(() => {
        scrollContainer?.removeEventListener('scroll', syncScroll);
        listHeaderObserver?.disconnect();
        window.removeEventListener('resize', refresh);
        window.removeEventListener('settings-change', refresh);
        window.removeEventListener('sidebar-collapse-change', refresh);
    });

    const headerStyle = computed(() => ({
        top: 0,
        height: `${COLLAPSED_HEIGHT}px`
    }));

    const spacerStyle = computed(() => ({
        height: `${EXPANDED_HEIGHT - COLLAPSED_HEIGHT - progress.value * SPACER_COLLAPSE_OFFSET}px`
    }));

    const coverStyle = computed(() => ({
        width: `${currentCoverSize.value}px`,
        height: `${currentCoverSize.value}px`
    }));

    const infoStyle = computed(() => ({
        height: `${currentCoverSize.value}px`,
        overflow: progress.value > 0 ? 'hidden' : 'visible'
    }));

    const titleStyle = computed(() => ({
        fontSize: `${currentTitleSize.value}px`,
        transform: `translateY(${progress.value * 6}px)`
    }));

    const detailsStyle = computed(() => ({
        opacity: detailsOpacity.value,
        pointerEvents: detailsOpacity.value > 0.2 ? 'auto' : 'none'
    }));

    const listTitleStyle = computed(() => ({
        fontSize: `${currentListTitleSize.value}px`,
        margin: `${expandedRatio.value * 0.83}em 0`
    }));

    const collapsedActionsStyle = computed(() => ({
        opacity: collapsedActionOpacity.value,
        transform: `translateY(-50%) translateX(${(1 - collapsedActionOpacity.value) * 12}px)`,
        pointerEvents: collapsedActionOpacity.value > 0.6 ? 'auto' : 'none'
    }));

    const listHeaderStyle = computed(() => ({
        top: `${COLLAPSED_HEIGHT}px`
    }));

    const trackHeaderStyle = computed(() => ({
        top: `${COLLAPSED_HEIGHT + listHeaderHeight.value - TRACK_HEADER_OVERLAP}px`
    }));

    return {
        headerStyle,
        spacerStyle,
        coverStyle,
        infoStyle,
        titleStyle,
        detailsStyle,
        listTitleStyle,
        collapsedActionsStyle,
        listHeaderStyle,
        trackHeaderStyle
    };
};

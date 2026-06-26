import { onActivated, onBeforeUnmount, onDeactivated, watch } from 'vue';

export const useActivatedWatch = (source, callback, options) => {
    let stop = null;

    const start = () => {
        if (stop) return;
        stop = watch(source, callback, options);
    };

    const cleanup = () => {
        if (!stop) return;
        stop();
        stop = null;
    };

    start();
    onActivated(start);
    onDeactivated(cleanup);
    onBeforeUnmount(cleanup);

    return cleanup;
};

export async function setAudioOutputDevice(audio, deviceId) {
    const requested = deviceId || 'default';

    if (requested === 'default' && !audio?.sinkId) {
        return { ok: true, requested, changed: false };
    }

    if (typeof audio?.setSinkId !== 'function') {
        return {
            ok: requested === 'default',
            requested,
            changed: false,
            reason: requested === 'default' ? undefined : 'UNSUPPORTED'
        };
    }

    const sinkId = requested === 'default' ? '' : requested;
    if (audio.sinkId === sinkId) {
        return { ok: true, requested, changed: false };
    }

    try {
        await audio.setSinkId(sinkId);
        return { ok: true, requested, changed: true };
    } catch (error) {
        return { ok: false, requested, changed: false, reason: 'FAILED', error };
    }
}

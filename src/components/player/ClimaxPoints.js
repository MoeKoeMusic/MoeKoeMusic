export function normalizeClimaxPoints(data, duration) {
    const numericDuration = Number(duration);
    if (!Array.isArray(data) || !Number.isFinite(numericDuration) || numericDuration <= 0) {
        return [];
    }

    return data
        .map(point => {
            const startTime = Number.parseInt(point?.start_time, 10);
            const timeLength = Number.parseInt(point?.timelength, 10);
            if (!Number.isFinite(startTime) || !Number.isFinite(timeLength)) return null;

            const position = (startTime / 1000 / numericDuration) * 100;
            if (!Number.isFinite(position)) return null;

            return {
                position: Math.max(0, Math.min(position, 100)),
                duration: Math.max(0, timeLength / 1000)
            };
        })
        .filter(Boolean);
}

export function createClimaxPointLoader(fetchHighlights) {
    let requestId = 0;

    const invalidate = () => {
        requestId += 1;
    };

    const load = async (hash, options = {}) => {
        const {
            isCurrent = () => true,
            getDuration = () => Number.NaN
        } = options;

        if (!isCurrent()) return { apply: false, points: [] };

        const currentRequestId = ++requestId;

        try {
            const response = await fetchHighlights(hash);
            if (currentRequestId !== requestId || !isCurrent()) {
                return { apply: false, points: [] };
            }

            const points = response?.status === 1
                ? normalizeClimaxPoints(response.data, getDuration())
                : [];

            return { apply: true, points };
        } catch {
            if (currentRequestId !== requestId || !isCurrent()) {
                return { apply: false, points: [] };
            }
            return { apply: true, points: [] };
        }
    };

    return { invalidate, load };
}

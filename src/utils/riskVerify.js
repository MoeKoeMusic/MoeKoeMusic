let verifier = null;

let verifyQueue = Promise.resolve();

const getRiskEventId = (payload, headers = {}) => {
    const candidates = [
        payload?.ssaCode,
        payload?.ssa_code,
        headers?.['ssa-code'],
        headers?.['SSA-CODE'],
        headers?.ssa,
        headers?.Ssa,
        headers?.ssaCode,
        headers?.ssacode,
    ];

    return String(candidates.find((item) => item) || '').trim();
};

const isRiskError = (payload, headers = {}) => {
    const code = Number(payload?.error_code || 0);
    const hasSsaCode = Boolean(getRiskEventId(payload, headers));
    const failed = Number(payload?.status || 0) === 0;
    return code === 20028 || (hasSsaCode && failed);
};

export const bindRiskVerifyService = (service) => {
    verifier = service && typeof service.start === 'function' ? service : null;
};

const executeVerify = async (eventId) => {
    if (!verifier) {
        throw new Error('安全验证服务未就绪');
    }

    return verifier.start({ eventId });
};

const queueVerify = (eventId) => {
    const current = verifyQueue.then(() => executeVerify(eventId));
    verifyQueue = current.catch(() => undefined).then(() => undefined);
    return current;
};

export const getRiskEventIdFromResponse = (response) => {
    return getRiskEventId(response?.data, response?.headers);
};

export const handleRiskResponse = async (response, requestAgain) => {
    const payload = response?.data || {};
    const headers = response?.headers || {};
    const config = response?.config || {};

    if (config.__skipRisk) {
        return { handled: false };
    }

    if (!isRiskError(payload, headers)) {
        return { handled: false };
    }

    if (config.__riskRetryCount >= 1) {
        const e = new Error('安全验证未通过');
        e.response = response;
        throw e;
    }

    const eventId = getRiskEventId(payload, headers);
    if (!eventId) {
        return { handled: false };
    }

    await queueVerify(eventId);

    const retryConfig = {
        ...config,
        __riskRetryCount: (config.__riskRetryCount || 0) + 1,
    };

    const retryResponse = await requestAgain(retryConfig);
    if (isRiskError(retryResponse?.data, retryResponse?.headers)) {
        const e = new Error('安全验证未通过');
        e.response = retryResponse;
        throw e;
    }

    return { handled: true, data: retryResponse.data };
};

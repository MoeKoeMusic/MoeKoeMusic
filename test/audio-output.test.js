import test from 'node:test';
import assert from 'node:assert/strict';
import { setAudioOutputDevice } from '../src/components/player/AudioOutput.js';

test('default output is a successful no-op when setSinkId is unavailable', async () => {
    const result = await setAudioOutputDevice({}, undefined);

    assert.deepEqual(result, { ok: true, requested: 'default', changed: false });
});

test('default output maps to an empty sink id', async () => {
    const calls = [];
    const audio = {
        sinkId: 'external-device',
        setSinkId: async sinkId => calls.push(sinkId)
    };

    const result = await setAudioOutputDevice(audio, 'default');

    assert.equal(result.ok, true);
    assert.equal(result.changed, true);
    assert.deepEqual(calls, ['']);
});

test('an unchanged custom output does not call setSinkId', async () => {
    let calls = 0;
    const audio = {
        sinkId: 'speakers',
        setSinkId: async () => { calls += 1; }
    };

    const result = await setAudioOutputDevice(audio, 'speakers');

    assert.equal(result.ok, true);
    assert.equal(result.changed, false);
    assert.equal(calls, 0);
});

test('a custom output is rejected when setSinkId is unavailable', async () => {
    const result = await setAudioOutputDevice({}, 'speakers');

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'UNSUPPORTED');
});

test('a custom output is passed through to setSinkId', async () => {
    const calls = [];
    const audio = {
        sinkId: '',
        setSinkId: async sinkId => calls.push(sinkId)
    };

    const result = await setAudioOutputDevice(audio, 'speakers');

    assert.equal(result.ok, true);
    assert.equal(result.changed, true);
    assert.deepEqual(calls, ['speakers']);
});

test('setSinkId failures are returned without throwing', async () => {
    const failure = new Error('permission denied');
    const audio = {
        sinkId: '',
        setSinkId: async () => { throw failure; }
    };

    const result = await setAudioOutputDevice(audio, 'speakers');

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'FAILED');
    assert.equal(result.error, failure);
});

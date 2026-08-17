import test from 'node:test';
import assert from 'node:assert/strict';
import useMediaSession from '../src/components/player/MediaSession.js';

function installMediaSession() {
    const actions = new Map();
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
            mediaSession: {
                setActionHandler(action, handler) {
                    actions.set(action, handler);
                },
                setPositionState() {}
            }
        }
    });

    return {
        actions,
        restore() {
            if (originalNavigator) {
                Object.defineProperty(globalThis, 'navigator', originalNavigator);
            } else {
                delete globalThis.navigator;
            }
        }
    };
}

test('play and pause actions call their explicit handlers', () => {
    const environment = installMediaSession();
    let playCalls = 0;
    let pauseCalls = 0;

    try {
        useMediaSession().initMediaSession({
            play: () => { playCalls += 1; },
            pause: () => { pauseCalls += 1; },
            playPrevious() {},
            playNext() {}
        });

        assert.notEqual(environment.actions.get('play'), environment.actions.get('pause'));

        environment.actions.get('play')();
        environment.actions.get('play')();
        assert.equal(playCalls, 2);
        assert.equal(pauseCalls, 0);

        environment.actions.get('pause')();
        assert.equal(playCalls, 2);
        assert.equal(pauseCalls, 1);
    } finally {
        environment.restore();
    }
});

test('missing optional play or pause handlers are not registered', () => {
    const environment = installMediaSession();

    try {
        useMediaSession().initMediaSession({
            playPrevious() {},
            playNext() {}
        });

        assert.equal(environment.actions.has('play'), false);
        assert.equal(environment.actions.has('pause'), false);
        assert.equal(environment.actions.has('previoustrack'), true);
        assert.equal(environment.actions.has('nexttrack'), true);
    } finally {
        environment.restore();
    }
});

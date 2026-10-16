'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { AudioSystem } = require('../systems/audio');

function fixture() {
  const sounds = [];
  return {
    sounds,
    platform: {
      audio() {
        const sound = { volume: 0, play() {}, pause() {}, stop() {}, onError() {} };
        sounds.push(sound);
        return sound;
      },
    },
  };
}

test('environment audio gain follows reality, memory and cave states', () => {
  const { platform, sounds } = fixture();
  const audio = new AudioSystem(platform, () => {});
  audio.environment('reality');
  assert.equal(sounds[0].volume, 0.35);
  audio.environment('memory');
  assert.equal(sounds[1].volume, 0.35 * 0.58);
  audio.environment('cave');
  assert.equal(sounds[2].volume, 0.35 * 0.72);
  audio.apply({ audio: false, volume: 1 });
  assert.equal(sounds[2].volume, 0);
});

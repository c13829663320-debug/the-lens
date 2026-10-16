'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');

function mockTimers() {
  const pending = new Map();
  let id = 0;
  return {
    pending,
    setTimeout(fn, milliseconds) { pending.set(++id, { fn, milliseconds }); return id; },
    clearTimeout(timer) { pending.delete(timer); },
    fire(milliseconds) {
      const found = [...pending.entries()].find(([, timer]) => timer.milliseconds === milliseconds);
      assert.ok(found, `Expected a pending ${milliseconds} ms timer`);
      pending.delete(found[0]);
      found[1].fn();
    },
  };
}

function wechatFixture(windowInfo = { windowWidth: 844, windowHeight: 390 }) {
  const timers = mockTimers();
  let latest;
  let options;
  const wx = {
    createCanvas: () => ({}), getWindowInfo: () => windowInfo,
    onTouchStart() {}, onTouchMove() {}, onTouchEnd() {}, onTouchCancel() {},
    onWindowResize() {}, onHide() {}, onShow() {},
    createVideo(configuration) {
      options = configuration;
      const handlers = {};
      latest = {
        handlers, destroyCount: 0,
        onEnded: fn => { handlers.end = fn; }, onError: fn => { handlers.error = fn; },
        onStop: fn => { handlers.stop = fn; }, onPlay: fn => { handlers.play = fn; },
        // Some native SDK versions emit stop synchronously from destroy.
        destroy() { this.destroyCount++; if (handlers.stop) handlers.stop(); },
      };
      return latest;
    },
  };
  const context = { module: { exports: {} }, wx, Date, Number, Math, Error,
    setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../platform/wechat.js'), 'utf8'), context);
  return { platform: context.module.exports.createPlatform(), timers,
    get video() { return latest; }, get options() { return options; } };
}

function browserFixture() {
  const timers = mockTimers();
  let video;
  let button;
  const document = {
    querySelector: () => ({ addEventListener() {} }), body: { append() {} },
    createElement(type) {
      if (type === 'video') {
        video = { style: {}, play: () => Promise.resolve(), pause() {}, remove() { this.removed = true; } };
        return video;
      }
      button = { style: {}, remove() { this.removed = true; } };
      return button;
    },
  };
  const context = { module: { exports: {} }, document, Date, Number, Math, Error, navigator: {},
    setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../platform/browser.js'), 'utf8'), context);
  return { platform: context.module.exports.createPlatform(), timers,
    get video() { return video; }, get button() { return button; } };
}

test('WeChat video reserves scaled skip space, applies sound, and settles once on native stop reentry', () => {
  const env = wechatFixture();
  let ended = 0;
  let failed = 0;
  let ready = 0;
  const cancel = env.platform.video('mock.mp4', () => ended++, () => failed++, () => ready++,
    { muted: true, volume: 0.2, topInset: 45 });
  assert.equal(env.options.y, 45);
  assert.equal(env.options.height, 345);
  assert.equal(env.video.muted, true);
  assert.equal(env.video.volume, 0.2);
  env.video.handlers.play();
  env.video.handlers.play();
  assert.equal(ready, 1);
  assert.equal([...env.timers.pending.values()].some(timer => timer.milliseconds === 30000), false);
  env.video.handlers.end();
  env.video.handlers.stop();
  cancel();
  assert.equal(ended, 1);
  assert.equal(failed, 0);
  assert.equal(env.video.destroyCount, 1);
  assert.equal(env.timers.pending.size, 0);
});

test('WeChat size converts a physical-pixel safeArea before layout', () => {
  const env = wechatFixture({
    windowWidth: 390, windowHeight: 844, pixelRatio: 2,
    safeArea: { left: 0, top: 176, right: 780, bottom: 1688 },
  });
  const sized = env.platform.size();
  assert.equal(sized.safe.left, 0);
  assert.equal(sized.safe.top, 88);
  assert.equal(sized.safe.right, 390);
  assert.equal(sized.safe.bottom, 844);
});

test('WeChat loading timeout destroys once and suppresses a later native error', () => {
  const env = wechatFixture();
  let ended = 0;
  let failed = 0;
  env.platform.video('mock.mp4', () => ended++, () => failed++, null, { volume: 99 });
  assert.equal(env.video.volume, 1);
  env.timers.fire(30000);
  env.video.handlers.error(new Error('late event'));
  assert.equal(ended, 0);
  assert.equal(failed, 1);
  assert.equal(env.video.destroyCount, 1);
  assert.equal(env.timers.pending.size, 0);
});

test('WeChat overall timeout still recovers after playback starts', () => {
  const env = wechatFixture();
  let failed = 0;
  env.platform.video('mock.mp4', () => assert.fail('Timed out video cannot complete'), () => failed++);
  env.video.handlers.play();
  env.timers.fire(120000);
  assert.equal(failed, 1);
  assert.equal(env.video.destroyCount, 1);
  assert.equal(env.timers.pending.size, 0);
});

test('WeChat manual cancellation leaves modal transition to caller and emits no duplicate callback', () => {
  const env = wechatFixture();
  let callbacks = 0;
  const cancel = env.platform.video('mock.mp4', () => callbacks++, () => callbacks++);
  cancel();
  cancel();
  env.video.handlers.stop();
  assert.equal(callbacks, 0);
  assert.equal(env.video.destroyCount, 1);
  assert.equal(env.timers.pending.size, 0);
});

test('browser skip honors sound and removes both controls once despite a queued ended event', () => {
  const env = browserFixture();
  let ended = 0;
  let failed = 0;
  const cancel = env.platform.video('mock.mp4', () => ended++, () => failed++, null,
    { muted: true, volume: 0.3 });
  assert.equal(env.video.muted, true);
  assert.equal(env.video.volume, 0.3);
  const endedEvent = env.video.onended;
  env.button.onclick();
  endedEvent();
  cancel();
  assert.equal(ended, 1);
  assert.equal(failed, 0);
  assert.equal(env.video.removed, true);
  assert.equal(env.button.removed, true);
  assert.equal(env.timers.pending.size, 0);
});

test('browser CG honors the caller safe inset for the native video layer', () => {
  const env = browserFixture();
  env.platform.video('mock.mp4', () => {}, () => {}, null, { topInset: 124 });
  assert.match(env.video.style.cssText, /top:124px/);
  assert.match(env.video.style.cssText, /calc\(100% - 124px\)/);
  assert.match(env.button.style.cssText, /top:72px/);
});

test('browser loading and overall timeouts both recover without orphaned timers', () => {
  for (const timeout of [30000, 120000]) {
    const env = browserFixture();
    let failed = 0;
    env.platform.video('mock.mp4', () => assert.fail('Timed out video cannot complete'), () => failed++);
    if (timeout === 120000) env.video.onplaying();
    env.timers.fire(timeout);
    assert.equal(failed, 1);
    assert.equal(env.video.removed, true);
    assert.equal(env.timers.pending.size, 0);
  }
});

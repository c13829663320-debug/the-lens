'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Game } = require('../ui/game');
const { containFrame } = require('../ui/draw');

test('letterboxed scene images expose a frame for aligned hotspots', () => {
  assert.deepEqual(containFrame({ width: 1280, height: 720 }, 0, 0, 1000, 360), { x: 180, y: 0, w: 640, h: 360 });
});

test('overlapping touch targets choose the nearest visible action', () => {
  const game = Object.create(Game.prototype);
  const selected = [];
  game.hits = [
    { label: '左侧', x: 0, y: 0, w: 80, h: 80, fn: () => selected.push('左侧') },
    { label: '右侧', x: 60, y: 0, w: 80, h: 80, fn: () => selected.push('右侧') },
  ];
  assert.equal(game.hitAt(52, 40, 80), true);
  assert.deepEqual(selected, ['左侧']);
});

test('stage taps move the player before observing a distant object', () => {
  const game = Object.create(Game.prototype);
  game.player = { x: 0.1, y: 0.8, targetX: 0.1, targetY: 0.8 };
  game.stage = () => ({ x: 0, y: 0, w: 1000, h: 600 });
  game.p = { now: () => 1000 };
  const notices = [];
  const observed = [];
  game.toast = (message) => notices.push(message);
  game.observe = (object) => observed.push(object.id);
  const object = { id: 'terminal', label: '旧终端' };

  game.interactAt(object, 800, 180);
  assert.deepEqual(observed, []);
  assert.equal(game.player.targetX, 0.8);
  assert.equal(game.player.targetY, 0.3);
  assert.match(notices[0], /走近了/);

  game.player.x = 0.8;
  game.player.y = 0.3;
  game.interactAt(object, 800, 180);
  assert.deepEqual(observed, ['terminal']);
});

test('letterboxed stage taps use the contained artwork frame for player coordinates', () => {
  const game = Object.create(Game.prototype);
  game.player = { x: 0.1, y: 0.8, targetX: 0.1, targetY: 0.8 };
  game.stage = () => ({ x: 0, y: 0, w: 600, h: 420 });
  game.assets = { get: () => ({ width: 1280, height: 720 }) };
  game.model = { scene: { reality: 'scene', memory: null } };
  game.mode = 'reality';

  game.movePlayerTo(300, 311.25);

  assert.equal(game.player.targetX, 0.5);
  assert.equal(game.player.targetY, 0.8);
});

test('completed-save epilogue restores saved audio settings', () => {
  const game = Object.create(Game.prototype);
  const settings = { audio: false, volume: 0.15, subtitles: true, vibration: false, lowMotion: true };
  const applied = [];
  game.model = { state: { completed: true, settings } };
  game.assets = { load: () => Promise.resolve() };
  game.audio = { apply: value => applied.push(value), environment: () => {} };
  game.resume();
  assert.deepEqual(applied, [settings]);
  assert.equal(game.screen, 'epilogue');
});

test('epilogue requires touching the new painting, charcoal and fissure before continuing', () => {
  const game = Object.create(Game.prototype);
  game.W = 600;
  game.H = 1050;
  game.portrait = true;
  game.epilogue = 1;
  game.epilogueObserved = {};
  game.hits = [];
  game.registerEpilogueTargets();
  assert.deepEqual(game.hits.map(hit => hit.label), ['新画', '炭灰']);
  assert.equal(game.epilogueReady(), false);

  game.hitAt(300, 540, 0);
  assert.equal(game.epilogueReady(), false);
  game.hitAt(300, 700, 0);
  assert.equal(game.epilogueReady(), true);

  game.epilogue = 3;
  game.epilogueObserved = {};
  game.hits = [];
  game.registerEpilogueTargets();
  assert.deepEqual(game.hits.map(hit => hit.label), ['裂隙']);
  assert.equal(game.epilogueReady(), false);
  game.hitAt(450, 420, 0);
  assert.equal(game.epilogueReady(), true);
});

test('exploration pause stops audio and restores the scene state on return', () => {
  const game = Object.create(Game.prototype);
  const events = [];
  game.screen = 'explore';
  game.modal = null;
  game.hidden = false;
  game.settingsPaused = false;
  game.mode = 'reality';
  game.model = { scene: { id: 'S09' } };
  game.audio = {
    pause: () => events.push('pause'),
    environment: mode => events.push(`environment:${mode}`),
  };

  game.openSettings();
  assert.equal(game.modal.type, 'settings');
  assert.deepEqual(events, ['pause']);

  game.resumeFromBackground();
  assert.deepEqual(events, ['pause']);
  game.closeModal();
  assert.deepEqual(events, ['pause', 'environment:cave']);
});

test('landscape action row exposes the recorded-object browser', () => {
  const game = Object.create(Game.prototype);
  const buttons = [];
  game.W = 1000;
  game.H = 600;
  game.portrait = false;
  game.mode = 'reality';
  game.bookPage = 0;
  game.modal = null;
  game.ctx = { fillText() {} };
  game.button = (label, x, y, width, fn) => buttons.push({ label, x, y, width, fn });
  game.model = { canLens: false };
  game.toggleLens = () => {};
  game.save = () => {};
  game.toast = () => {};
  game.renderExploreActions({ lensAcquired: false, battery: 0, brightness: 1, solved: [] }, { puzzle: { id: 'puzzle' } }, 540, 44, 556);

  const objects = buttons.find(button => button.label === '观察条目');
  assert.ok(objects);
  objects.fn();
  assert.deepEqual(game.modal, { type: 'objects' });

  const lens = buttons.find(button => button.label === '举起透镜');
  const brightness = buttons.find(button => button.label === '亮度 · 低');
  const proceed = buttons.find(button => button.label === '采取行动  →');
  assert.ok(objects.x + objects.width <= lens.x);
  assert.ok(lens.x + lens.width <= brightness.x);
  assert.ok(brightness.x + brightness.width <= proceed.x);
});

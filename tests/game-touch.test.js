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

test('landscape dialogue stays below the scene and fully covers underlying HUD text', () => {
  const fills = [];
  const ctx = {
    beginPath() {}, rect() {}, fill() { fills.push(this.fillStyle); }, stroke() {}, fillText() {},
    measureText(value) { return { width: String(value).length * 9 }; },
  };
  const game = Object.create(Game.prototype);
  game.W = 1000;
  game.H = 600;
  game.portrait = false;
  game.ctx = ctx;
  game.hits = [];
  game.modal = { type: 'dialogue', lines: [{ speaker: 'AI 广告', text: '循环播放的旧时代旁白' }], index: 0 };
  game.model = { state: { settings: { subtitles: true } } };

  const panels = [];
  game.ctx.rect = (x, y, w, h) => panels.push({ x, y, w, h, fill: game.ctx.fillStyle });
  game.renderModal();

  const card = panels.find(panel => panel.x === 20 && panel.w === 960);
  assert.ok(card);
  assert.ok(card.y >= game.stage().y + game.stage().h);
  assert.equal(fills[1], '#0c1512ff');
  assert.ok(game.hits.some(hit => hit.label === '继续  →'));
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

test('market can retrieval requires the memory location and reality support before the drag', () => {
  const game = Object.create(Game.prototype);
  const can = { id: 'can', clue: { id: 'S02_can' } };
  const events = [];
  game.model = { scene: { id: 'S02' }, state: { clues: ['S02_display', 'S02_trace'] }, observe: () => ({ ok: true, dialogue: [] }) };
  game.mode = 'reality'; game.modal = { type: 'can', object: can, support: false, dragStart: null, dragPoint: null };
  game.portrait = false; game.W = 1000; game.H = 600; game.ox = 0; game.oy = 0; game.scale = 1; game.hits = [];
  game.hitAt = () => false; game.toast = message => events.push(message); game.save = () => events.push('save'); game.dialogue = () => {};

  game.down(200, 250);
  assert.equal(game.modal.support, true);
  game.down(500, 250);
  assert.equal(game.drag, 'can');
  game.modal.dragPoint = [500, 430];
  game.up();
  assert.equal(game.modal, null);
  assert.ok(events.includes('save'));
});

test('bridge rescue keeps the fixed injury and only advances after both rescue actions', () => {
  const game = Object.create(Game.prototype);
  const observed = [];
  game.modal = { type: 'rescue', phase: 'grip' };
  game.model = { observe: id => { observed.push(id); return { ok: true, dialogue: [] }; } };
  const notices = [];
  game.toast = message => notices.push(message); game.save = () => {}; game.dialogue = () => {};

  game.rescueAction('struggle');
  assert.deepEqual(observed, []);
  game.rescueAction('hold');
  assert.deepEqual(observed, ['wrist']);
  assert.equal(game.modal.phase, 'chief');
  game.rescueAction('letgo');
  assert.equal(game.modal.phase, 'chief');
  game.rescueAction('cooperate');
  assert.deepEqual(observed, ['wrist', 'rescue']);
  assert.equal(game.modal, null);
  assert.ok(notices.some(message => /乱动/.test(message)));
});

test('断电后撬石 requires the wind check and a correct fulcrum drop', () => {
  const game = Object.create(Game.prototype);
  const events = [];
  game.modal = { type: 'lever', support: false, dragStart: null, dragPoint: null };
  game.portrait = false; game.W = 1000; game.H = 600;
  game.model = { attempt: () => { events.push('attempt'); return { ok: true, message: 'opened' }; } };
  game.audio = { cue: () => {} }; game.save = () => events.push('save'); game.toast = message => events.push(message);

  game.modal.support = true;
  game.modal.dragStart = [200, 400];
  game.modal.dragPoint = [500, 400];
  game.finishLeverInteraction();
  assert.deepEqual(events, ['attempt', 'save']);
  assert.equal(game.modal.type, 'success');
});

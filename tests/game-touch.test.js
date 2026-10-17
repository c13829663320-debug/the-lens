'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Game } = require('../ui/game');
const { containFrame } = require('../ui/draw');
const { GameModel, createState } = require('../systems/model');
const { SaveStore } = require('../systems/storage');

function createS05Model(onChange) {
  const model = new GameModel(createState(), onChange);
  while (model.scene.id !== 'S05') {
    const scene = model.scene;
    scene.objects.filter(item => scene.puzzle.required.includes(item.clue.id)).forEach(item => assert.equal(model.observe(item.id, item.mode).ok, true));
    const answer = scene.puzzle.answers ? scene.puzzle.answers[0] : scene.puzzle.answer;
    assert.equal(model.attempt(answer).ok, true);
    assert.equal(model.advance(), true);
  }
  return model;
}

function storageAdapter() {
  const values = new Map();
  return { get: key => values.get(key) || null, set: (key, value) => values.set(key, value), remove: key => values.delete(key) };
}

function createRescueGame(state, adapter) {
  const game = Object.create(Game.prototype);
  game.dirty = false;
  game.hasSave = false;
  game.lastSave = 0;
  game.modal = null;
  game.p = { now: () => 100, vibrate: () => {} };
  game.store = new SaveStore(adapter);
  game.model = new GameModel(state, () => { game.dirty = true; });
  game.mode = 'reality';
  game.titlePath = 'assets/scenes/scene_S01_reality_1280_v1.jpg';
  game.assets = { retain: () => {}, load: () => Promise.resolve(null) };
  game.audio = { apply: () => {}, environment: () => {} };
  game.resetPlayer = () => {};
  game.toast = () => {};
  game.dialogue = () => {};
  return game;
}

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

test('portrait dialogue covers the exploration controls behind its panel', () => {
  const ctx = {
    beginPath() {}, rect() {}, fill() {}, stroke() {}, fillText() {},
    measureText(value) { return { width: String(value).length * 9 }; },
  };
  const game = Object.create(Game.prototype);
  game.W = 600;
  game.H = 1050;
  game.portrait = true;
  game.ctx = ctx;
  game.hits = [];
  game.modal = { type: 'dialogue', lines: [{ speaker: 'AI 广告', text: '一切交给 AI。' }], index: 0 };
  game.model = { state: { settings: { subtitles: true } } };

  const panels = [];
  game.ctx.rect = (x, y, w, h) => panels.push({ x, y, w, h });
  game.renderModal();

  const card = panels.find(panel => panel.x === 20 && panel.w === 560);
  assert.ok(card);
  assert.ok(card.y >= game.stage().y + game.stage().h);
  assert.ok(card.y <= 740);
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

test('cave gate gives tactile feedback before recording the real obstruction', () => {
  const game = Object.create(Game.prototype);
  const bars = { id: 'bars', label: '封洞木栅', clue: { id: 'S08_bars' }, dialogue: [] };
  const events = [];
  game.model = {
    scene: { id: 'S08' },
    state: { clues: [] },
    observe: id => { events.push(`observe:${id}`); return { ok: true, dialogue: [] }; },
  };
  game.modal = null;
  game.toast = message => events.push(`toast:${message}`);
  game.save = () => events.push('save');
  game.dialogue = () => events.push('dialogue');

  game.observe(bars);
  assert.equal(game.modal.type, 'gate');
  assert.deepEqual(events, []);

  game.pushGate();
  assert.equal(game.modal.type, 'gate');
  assert.deepEqual(events, ['toast:木栅纹丝不动。确认横木仍卡在现实的门框里，再试一次。']);

  game.pushGate();
  assert.equal(game.modal, null);
  assert.deepEqual(events.slice(-3), ['observe:bars', 'save', 'dialogue']);
});

test('cave gate cancellation discards the partial push and allows a clean retry', () => {
  const game = Object.create(Game.prototype);
  const bars = { id: 'bars', label: '封洞木栅', clue: { id: 'S08_bars' }, dialogue: [] };
  game.model = {
    scene: { id: 'S08' },
    state: { clues: [] },
    observe: () => ({ ok: true, dialogue: [] }),
  };
  game.modal = null;
  game.drag = null;
  game.toast = () => {};
  game.save = () => {};
  game.dialogue = () => {};

  game.observe(bars);
  game.pushGate();
  assert.equal(game.modal.pushes, 1);
  game.closeModal();
  assert.equal(game.modal, null);

  game.observe(bars);
  assert.equal(game.modal.pushes, 0);
  game.pushGate();
  assert.equal(game.modal.pushes, 1);
});

test('S07 fire hotspot asks for a safe distance before recording the clue', () => {
  const game = Object.create(Game.prototype);
  const fire = { id: 'fire', label: '焚烧旧画的火', clue: { id: 'S07_fire', title: '火中的画' }, dialogue: [] };
  const events = [];
  game.model = {
    scene: { id: 'S07' },
    state: { clues: [], settings: { vibration: false } },
    observe: id => { events.push(`observe:${id}`); return { ok: true, newClue: true, dialogue: [] }; },
  };
  game.modal = null;
  game.toast = message => events.push(`toast:${message}`);
  game.save = () => events.push('save');
  game.dialogue = () => events.push('dialogue');

  game.observe(fire);
  assert.deepEqual(events, []);
  assert.equal(game.modal.type, 'fire');

  game.observeFire();
  assert.equal(game.modal, null);
  assert.deepEqual(events, ['observe:fire', 'toast:线索已记录 · 火中的画', 'save', 'dialogue']);
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

test('bridge rescue cannot be dismissed before the fixed event completes', () => {
  const game = Object.create(Game.prototype);
  const labels = [];
  game.W = 600;
  game.H = 1050;
  game.portrait = true;
  game.modal = { type: 'rescue', phase: 'grip' };
  game.ctx = {
    beginPath() {}, rect() {}, fill() {}, stroke() {}, fillText() {},
    measureText(value) { return { width: String(value).length * 9 }; },
  };
  game.button = (label) => labels.push(label);
  game.line = () => {};

  game.renderRescueInteraction(game.modal);

  assert.equal(labels.includes('返回'), false);
  assert.equal(labels.includes('抓住小花'), true);
});

test('bridge rescue resumes the saved action after interruption at either step', async () => {
  const adapter = storageAdapter();
  const initial = createS05Model().state;
  const game = createRescueGame(initial, adapter);
  const bridge = game.model.scene.objects.find(item => item.id === 'bridge');
  const gap = game.model.scene.objects.find(item => item.id === 'gap');

  game.mode = 'reality';
  game.observe(gap);
  assert.equal(game.modal, null);
  game.mode = 'memory';
  game.observe(bridge);
  game.mode = 'reality';
  game.observe(gap);
  assert.equal(game.modal.phase, 'grip');
  assert.ok(adapter.get('the-lens.save.v1'));

  const resumedGrip = createRescueGame(new SaveStore(adapter).load().state, adapter);
  await resumedGrip.enter(false);
  assert.deepEqual(resumedGrip.modal, { type: 'rescue', phase: 'grip' });

  game.modal = { type: 'rescue', phase: 'grip' };
  game.rescueAction('hold');
  assert.equal(game.modal.phase, 'chief');
  const resumedChief = createRescueGame(new SaveStore(adapter).load().state, adapter);
  await resumedChief.enter(false);
  assert.deepEqual(resumedChief.modal, { type: 'rescue', phase: 'chief' });

  game.rescueAction('cooperate');
  const resumedAfterRescue = createRescueGame(new SaveStore(adapter).load().state, adapter);
  await resumedAfterRescue.enter(false);
  assert.equal(resumedAfterRescue.modal, null);
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

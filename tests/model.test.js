'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SCENES } = require('../data/chapter');
const { createState, validateState, GameModel } = require('../systems/model');
const { SaveStore } = require('../systems/storage');
const ARTWORK = [ [[0.2, 0.2], [0.45, 0.4], [0.6, 0.45]], [[0.55, 0.5], [0.7, 0.2]] ];

function solveCurrent(model) {
  const scene = model.scene;
  if (scene.id === 'S09') assert.equal(model.setArtwork(ARTWORK), true);
  scene.objects.filter((item) => scene.puzzle.required.indexOf(item.clue.id) !== -1).forEach((item) => assert.equal(model.observe(item.id, item.mode).ok, true));
  const answer = scene.puzzle.answers ? scene.puzzle.answers[0] : scene.puzzle.answer;
  assert.equal(model.attempt(answer).ok, true);
  assert.equal(model.advance(), true);
}

test('initial state is strict and starts at S10', () => {
  const state = createState();
  assert.equal(state.sceneId, 'S10');
  assert.equal(state.version, 2);
  assert.equal(state.battery, 100);
  assert.equal(state.brightness, 1);
  assert.equal(state.lensAcquired, false);
  assert.deepEqual(state.artwork, []);
  assert.equal(validateState(state), true);
});

test('observation requires the right lens mode and clue gate blocks guesses', () => {
  const model = new GameModel();
  assert.equal(model.observe('elite', 'memory').ok, false);
  assert.equal(model.attempt('watch').ok, false);
  assert.equal(model.observe('elite', 'reality').ok, true);
  assert.equal(model.observe('sleeper', 'reality').ok, true);
  assert.equal(model.observe('advert', 'reality').ok, true);
  assert.equal(model.attempt('wake').ok, false);
  assert.equal(model.attempt('watch').ok, true);
});

test('lens is acquired at S01 terminal and memory cannot substitute for action', () => {
  const model = new GameModel();
  solveCurrent(model); // S10
  assert.equal(model.scene.id, 'S01');
  assert.equal(model.observe('terminal', 'reality').ok, true);
  assert.equal(model.state.lensAcquired, true);
  assert.equal(model.observe('crowd', 'memory').ok, true);
  assert.equal(model.attempt('enter', 'memory').ok, false);
});

test('brightness and tick consume lens battery, pause does not', () => {
  const model = new GameModel();
  solveCurrent(model);
  model.observe('terminal', 'reality');
  const before = model.state.battery;
  assert.equal(model.tick(10, 'reality') < before, true);
  const paused = model.state.battery;
  assert.equal(model.tick(100, 'memory', true), paused);
  assert.equal(model.setBrightness(2), true);
  assert.equal(model.tick(1, 'memory') < paused, true);
  assert.equal(model.setBrightness(3), false);
});

test('full chapter preserves choices and forces S05 rescue and S09 extra observations', () => {
  const model = new GameModel();
  for (let i = 0; i < 8; i += 1) solveCurrent(model);
  assert.equal(model.scene.id, 'S08');
  assert.equal(model.state.battery <= 10, true);
  solveCurrent(model);
  assert.equal(model.scene.id, 'S09');
  assert.equal(model.state.battery, 0);
  assert.equal(model.canLens, false);
  const before = model.attempt('lever');
  assert.equal(before.ok, false);
  assert.equal(model.setArtwork(ARTWORK), true);
  ['mural', 'wind', 'branch', 'drawing', 'starAlignment'].forEach((id) => assert.equal(model.observe(id, 'reality').ok, true));
  assert.equal(model.attempt('lever').ok, true);
  assert.equal(model.advance(), true);
  assert.equal(model.state.completed, true);
  assert.equal(validateState(model.state), true);
});

test('continued low-battery exploration can save, restore and finish mandatory comparisons', () => {
  let model = new GameModel();
  solveCurrent(model);
  model.observe('terminal', 'reality');
  model.setBrightness(2);
  model.tick(100000, 'memory');
  assert.equal(model.state.battery > 0 && model.state.battery < 1, true);
  assert.equal(model.canLens, true);
  const values = new Map();
  const store = new SaveStore({ get: (key) => values.get(key), set: (key, value) => values.set(key, value), remove: (key) => values.delete(key) });
  assert.equal(store.save(model.state).ok, true);
  model = new GameModel(store.load().state);
  assert.equal(model.observe('crowd', 'memory').ok, true);
  while (!model.state.completed) { solveCurrent(model); assert.equal(validateState(model.state), true); }
  assert.equal(model.state.solved.length, 10);
});

test('memory clues pass strict validation and persist in snapshots', () => {
  const model = new GameModel();
  solveCurrent(model);
  model.observe('terminal', 'reality');
  model.observe('crowd', 'memory');
  const snapshot = model.state;
  assert.equal(snapshot.clues.includes('S01_crowd'), true);
  assert.equal(validateState(snapshot), true);
  assert.equal(new GameModel(snapshot).state.clues.includes('S01_crowd'), true);
  snapshot.clues.push('unknown');
  assert.equal(model.state.clues.includes('unknown'), false);
});

test('duplicate observations and puzzle submissions remain idempotent', () => {
  let notifications = 0;
  const model = new GameModel(undefined, () => { notifications += 1; });
  const first = model.observe('elite', 'reality');
  const again = model.observe('elite', 'reality');
  assert.equal(first.newClue, true);
  assert.equal(again.newClue, false);
  assert.equal(notifications, 1);
  model.observe('sleeper', 'reality');
  model.observe('advert', 'reality');
  model.attempt('watch');
  const before = notifications;
  model.attempt('watch');
  assert.equal(model.state.solved.length, 1);
  assert.equal(notifications, before);
});

test('replaying resets progress and lens while preserving all user settings', () => {
  const model = new GameModel();
  model.setSetting('audio', false);
  model.setSetting('volume', 0.6);
  model.setSetting('subtitles', false);
  model.setSetting('vibration', false);
  model.setSetting('lowMotion', true);
  solveCurrent(model);
  model.observe('terminal', 'reality');
  const preferences = model.state.settings;
  model.restartChapter();
  assert.deepEqual(model.state.settings, preferences);
  assert.equal(model.state.sceneId, 'S10');
  assert.deepEqual(model.state.clues, []);
  assert.deepEqual(model.state.solved, []);
  assert.equal(model.state.lensAcquired, false);
  assert.equal(model.state.battery, 100);
  assert.deepEqual(model.state.artwork, []);
  assert.equal(validateState(model.state), true);
});

test('save validation rejects future clues, impossible progression and wrong solved choice', () => {
  const future = createState();
  future.clues.push('S09_wind');
  assert.equal(validateState(future), false);
  const skipped = createState();
  skipped.sceneId = 'S02';
  assert.equal(validateState(skipped), false);
  const model = new GameModel();
  solveCurrent(model);
  const forged = model.state;
  forged.choices.S10_montage = 'wake';
  assert.equal(validateState(forged), false);
  const unearned = createState();
  unearned.lensAcquired = true;
  assert.equal(validateState(unearned), false);
});

test('both S03 viewing choices are recorded without changing the story order', () => {
  const model = new GameModel();
  for (let i = 0; i < 4; i += 1) solveCurrent(model);
  assert.equal(model.scene.id, 'S03');
  model.scene.objects.filter((item) => model.scene.puzzle.required.includes(item.clue.id)).forEach((item) => model.observe(item.id, item.mode));
  assert.equal(model.attempt('skip').ok, true);
  assert.equal(model.state.choices.S03_art, 'skip');
  assert.equal(validateState(model.state), true);
  assert.equal(model.advance(), true);
  assert.equal(model.scene.id, 'S04');
});

test('the four core comparison scenes cannot advance using reality observations alone', () => {
  const targets = [['S01', 'crowd'], ['S02', 'display'], ['S03', 'painter'], ['S04', 'oldArchive'], ['S06', 'facade']];
  for (const [sceneId, memoryId] of targets) {
    const model = new GameModel();
    while (model.scene.id !== sceneId) solveCurrent(model);
    model.scene.objects.filter((item) => item.mode === 'reality').forEach((item) => model.observe(item.id, 'reality'));
    assert.equal(model.attempt(model.scene.puzzle.answer).ok, false, sceneId + ' requires memory comparison');
    assert.equal(model.advance(), false);
    assert.equal(model.observe(memoryId, 'memory').ok, true);
    assert.equal(model.attempt(model.scene.puzzle.answer).ok, true);
  }
});

test('the bridge rescue requires seeing the memory bridge before taking action', () => {
  const model = new GameModel();
  while (model.scene.id !== 'S05') solveCurrent(model);
  model.scene.objects.filter((item) => item.mode === 'reality').forEach((item) => model.observe(item.id, 'reality'));
  assert.equal(model.attempt('cooperate').ok, false);
  assert.equal(model.observe('bridge', 'memory').ok, true);
  assert.equal(model.attempt('cooperate').ok, true);
});

test('pre-cave energy continuously decreases, high brightness consumes faster, cave energy may reach zero', () => {
  const base = new GameModel();
  solveCurrent(base);
  base.observe('terminal', 'reality');
  const normal = new GameModel(base.state);
  const bright = new GameModel(base.state);
  bright.setBrightness(2);
  normal.tick(100, 'memory');
  bright.tick(100, 'memory');
  assert.equal(bright.state.battery < normal.state.battery, true);
  const first = bright.state.battery;
  bright.tick(100, 'memory');
  assert.equal(bright.state.battery < first, true);
  while (bright.scene.id !== 'S08') solveCurrent(bright);
  bright.tick(10000, 'memory');
  assert.equal(bright.state.battery, 0);
  assert.equal(validateState(bright.state), true);
});

test('drawing cannot be collected with missing, tiny or single-stroke artwork', () => {
  const model = new GameModel();
  while (model.scene.id !== 'S09') solveCurrent(model);
  assert.equal(model.observe('drawing', 'reality').ok, false);
  assert.equal(model.setArtwork([[[0.1, 0.1], [0.9, 0.9]]]), true);
  assert.equal(model.observe('drawing', 'reality').ok, false);
  assert.equal(model.setArtwork([[[0.1, 0.1], [0.101, 0.101]], [[0.2, 0.2], [0.201, 0.201]]]), true);
  assert.equal(model.observe('drawing', 'reality').ok, false);
  assert.equal(model.setArtwork(ARTWORK), true);
  assert.equal(model.observe('drawing', 'reality').ok, true);
  assert.equal(model.setArtwork([]), false);
  assert.equal(validateState(model.state), true);
});

test('artwork coordinates, stroke bounds and drawing-state consistency are validated', () => {
  const model = new GameModel();
  assert.equal(model.setArtwork(ARTWORK), false);
  while (model.scene.id !== 'S09') solveCurrent(model);
  assert.equal(model.setArtwork([[[0, 0], [1.01, 0.5]]]), false);
  assert.equal(model.setArtwork([[[0, 0], [NaN, 0.5]]]), false);
  assert.equal(model.setArtwork([[[0, 0], [Infinity, 0.5]]]), false);
  assert.equal(model.setArtwork(new Array(2)), false);
  assert.equal(model.setArtwork([[new Array(2), [0.1, 0.1]]]), false);
  assert.equal(model.setArtwork([[[0, 0]]]), false);
  assert.equal(model.setArtwork(Array.from({ length: 81 }, () => [[0, 0], [0.1, 0.1]])), false);
  assert.equal(model.setArtwork([Array.from({ length: 1001 }, () => [0.1, 0.1])]), false);
  const forged = model.state;
  forged.clues.push('S09_drawing');
  assert.equal(validateState(forged), false);
  forged.artwork = ARTWORK;
  assert.equal(validateState(forged), true);
});

test('legacy and pre-cave zero-battery saves are rejected by the new schema', () => {
  const legacy = createState();
  legacy.version = 1;
  assert.equal(validateState(legacy), false);
  const model = new GameModel();
  solveCurrent(model);
  model.observe('terminal', 'reality');
  const exhausted = model.state;
  exhausted.battery = 0;
  assert.equal(validateState(exhausted), false);
});

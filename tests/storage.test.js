'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SaveStore } = require('../systems/storage');
const { createState, GameModel, validateState } = require('../systems/model');
const { SCENES } = require('../data/chapter');

function memoryAdapter() {
  const map = new Map();
  return { map, get: (key) => map.get(key) || null, set: (key, value) => map.set(key, value), remove: (key) => map.delete(key) };
}

test('save and load round trip through primary and backup slots', () => {
  const adapter = memoryAdapter();
  const store = new SaveStore(adapter);
  const state = createState();
  assert.deepEqual(store.save(state), { ok: true });
  assert.equal(store.load().state.sceneId, 'S10');
  assert.equal(store.load().warning, null);
});

test('corrupt primary recovers checked backup with warning', () => {
  const adapter = memoryAdapter();
  const store = new SaveStore(adapter);
  assert.equal(store.save(createState()).ok, true);
  adapter.map.set('the-lens.save.v1', '{corrupt');
  const loaded = store.load();
  assert.equal(loaded.state.sceneId, 'S10');
  assert.match(loaded.warning, /备份恢复/);
});

test('corrupt both slots returns warning and does not claim a save', () => {
  const adapter = memoryAdapter();
  const store = new SaveStore(adapter);
  adapter.map.set('the-lens.save.v1', '{corrupt');
  adapter.map.set('the-lens.save.v1.backup', '{corrupt');
  const loaded = store.load();
  assert.equal(loaded.state, null);
  assert.match(loaded.warning, /均无法读取/);
});

test('quota failure reports failed save and leaves memory progress available', () => {
  const adapter = memoryAdapter();
  adapter.set = () => { throw new Error('quota exceeded'); };
  const result = new SaveStore(adapter).save(createState());
  assert.equal(result.ok, false);
  assert.match(result.error, /未完成/);
});

test('old or malformed state is rejected before writing', () => {
  const adapter = memoryAdapter();
  const result = new SaveStore(adapter).save({ version: 0 });
  assert.equal(result.ok, false);
  assert.equal(adapter.map.size, 0);
});

test('valid JSON with altered payload fails checksum and falls back to backup', () => {
  const adapter = memoryAdapter();
  const store = new SaveStore(adapter);
  store.save(createState());
  const envelope = JSON.parse(adapter.map.get('the-lens.save.v1'));
  envelope.payload = envelope.payload.replace('"battery":100', '"battery":12');
  adapter.map.set('the-lens.save.v1', JSON.stringify(envelope));
  assert.equal(store.load().state.battery, 100);
  assert.match(store.load().warning, /备份恢复/);
});

test('a failed primary write is reported and its checked candidate remains recoverable', () => {
  const adapter = memoryAdapter();
  const store = new SaveStore(adapter);
  const state = createState();
  state.updatedAt = '2026-01-01T00:00:00.000Z';
  assert.equal(store.save(state).ok, true);
  const newer = createState();
  newer.updatedAt = '2026-01-02T00:00:00.000Z';
  newer.settings.audio = false;
  const set = adapter.set;
  adapter.set = (key, value) => { if (key === 'the-lens.save.v1') throw new Error('interrupted primary write'); set(key, value); };
  assert.equal(store.save(newer).ok, false);
  const recovered = store.load();
  assert.equal(recovered.state.settings.audio, false);
  assert.match(recovered.warning, /较新/);
});

test('silent storage truncation fails verification instead of reporting saved', () => {
  const adapter = memoryAdapter();
  adapter.set = (key, value) => adapter.map.set(key, value.slice(0, -5));
  assert.equal(new SaveStore(adapter).save(createState()).ok, false);
});

test('progress and preferences restore from actual observations and solved logic', () => {
  const model = new GameModel();
  model.observe('elite', 'reality');
  model.observe('sleeper', 'reality');
  model.observe('advert', 'reality');
  model.attempt('watch');
  model.advance();
  model.observe('terminal', 'reality');
  model.setSetting('audio', false);
  const store = new SaveStore(memoryAdapter());
  assert.equal(store.save(model.state).ok, true);
  const state = store.load().state;
  assert.equal(validateState(state), true);
  assert.equal(state.sceneId, 'S01');
  assert.equal(state.lensAcquired, true);
  assert.equal(state.clues.includes('S01_terminal'), true);
  assert.equal(state.settings.audio, false);
  const resumed = new GameModel(state);
  assert.equal(resumed.observe('terminal', 'reality').newClue, false);
});

test('actual normalized drawing strokes survive save, restore and completed journey replay', () => {
  let model = new GameModel();
  while (model.scene.id !== 'S09') {
    const scene = model.scene;
    const required = scene.objects.filter((item) => scene.puzzle.required.includes(item.clue.id));
    for (let pass = 0; pass < required.length; pass += 1) required.forEach((item) => { if (!model.state.clues.includes(item.clue.id)) model.observe(item.id, item.mode); });
    required.forEach((item) => assert.equal(model.state.clues.includes(item.clue.id), true, scene.id + '/' + item.id));
    assert.equal(model.attempt(scene.puzzle.answer).ok, true);
    assert.equal(model.advance(), true);
  }
  const strokes = [[[0.1, 0.15], [0.3, 0.4], [0.55, 0.4]], [[0.62, 0.5], [0.78, 0.35]]];
  assert.equal(model.setArtwork(strokes), true);
  assert.equal(model.observe('drawing', 'reality').ok, true);
  // 调用者后续编辑原数组不能改变已经存下的画迹。
  strokes[0][0][0] = 0.99;
  assert.equal(model.state.artwork[0][0][0], 0.1);
  const store = new SaveStore(memoryAdapter());
  assert.equal(store.save(model.state).ok, true);
  model = new GameModel(store.load().state);
  assert.equal(model.state.artwork.length, 2);
  assert.equal(model.state.artwork[0][0][0], 0.1);
  assert.equal(model.observe('drawing', 'reality').newClue, false);
  model.scene.objects.filter((item) => item.mode === 'reality').forEach((item) => model.observe(item.id, 'reality'));
  assert.equal(model.attempt('lever').ok, true);
  assert.equal(model.advance(), true);
  assert.equal(store.save(model.state).ok, true);
  const complete = new GameModel(store.load().state);
  assert.equal(complete.state.completed, true);
  assert.equal(complete.state.artwork[0][0][0], 0.1);
  complete.restartChapter();
  assert.deepEqual(complete.state.artwork, []);
  assert.equal(complete.state.sceneId, SCENES[0].id);
});

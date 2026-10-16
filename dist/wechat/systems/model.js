'use strict';

const data = require('../data/chapter');
const SCENES = data.SCENES;
const DEFAULT_SETTINGS = { audio: true, volume: 0.35, subtitles: true, vibration: true, lowMotion: false };
const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);
const STATE_KEYS = ['version', 'chapter', 'sceneId', 'clues', 'solved', 'choices', 'completed', 'settings', 'updatedAt', 'battery', 'brightness', 'lensAcquired', 'artwork'];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function now() { return new Date().toISOString(); }
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value, keys) { return isObject(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key)); }
function validSetting(key, value) { return key === 'volume' ? typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 : SETTING_KEYS.indexOf(key) !== -1 && typeof value === 'boolean'; }
function validSettings(settings) { return exactKeys(settings, SETTING_KEYS) && SETTING_KEYS.every((key) => validSetting(key, settings[key])); }
function puzzleAnswers(puzzle) { return Array.isArray(puzzle.answers) ? puzzle.answers : [puzzle.answer]; }
function validBattery(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100; }
function validArtwork(strokes) {
  if (!Array.isArray(strokes) || strokes.length > 80) return false;
  for (let i = 0; i < strokes.length; i += 1) {
    const stroke = strokes[i];
    if (!Array.isArray(stroke) || stroke.length < 2 || stroke.length > 1000) return false;
    for (let j = 0; j < stroke.length; j += 1) {
      const point = stroke[j];
      if (!Array.isArray(point) || point.length !== 2) return false;
      for (let axis = 0; axis < 2; axis += 1) {
        const coordinate = point[axis];
        if (typeof coordinate !== 'number' || !Number.isFinite(coordinate) || coordinate < 0 || coordinate > 1) return false;
      }
    }
  }
  return true;
}
function meaningfulArtwork(strokes) {
  if (!validArtwork(strokes) || strokes.length < 2) return false;
  return strokes.reduce((total, stroke) => total + stroke.slice(1).reduce((distance, point, i) => distance + Math.hypot(point[0] - stroke[i][0], point[1] - stroke[i][1]), 0), 0) > 0.15;
}

function missingClueMessage(scene, puzzle, clues) {
  const missing = puzzle.required.find((id) => clues.indexOf(id) === -1);
  const object = scene.objects.find((item) => item.clue.id === missing);
  if (!object) return '证据还不完整。先完成当前场景的观察与对照。';
  if (object.id === 'drawing') return '先画下小花抓住手腕的瞬间，再记录这幅新画。';
  if (object.id === 'starAlignment') return '先拖动镜缘，让五处刻点与真实星光重合。';
  if (object.mode === 'memory') return '先举起透镜，观察' + object.clue.title + '，再回到现实行动。';
  return '先收起透镜，靠近并观察' + object.clue.title + '。';
}

function createState(settings) {
  const preferences = settings === undefined ? clone(DEFAULT_SETTINGS) : clone(settings);
  if (!validSettings(preferences)) throw new TypeError('Invalid settings');
  return { version: 2, chapter: 'ch01', sceneId: SCENES[0].id, clues: [], solved: [], choices: {}, completed: false, settings: preferences, updatedAt: now(), battery: 100, brightness: 1, lensAcquired: false, artwork: [] };
}

function validateState(state) {
  if (!exactKeys(state, STATE_KEYS) || state.version !== 2 || state.chapter !== 'ch01' || typeof state.completed !== 'boolean') return false;
  const current = SCENES.findIndex((scene) => scene.id === state.sceneId);
  if (current < 0 || !validSettings(state.settings) || !validBattery(state.battery) || (state.brightness !== 1 && state.brightness !== 2) || typeof state.lensAcquired !== 'boolean' || !validArtwork(state.artwork)) return false;
  if (typeof state.updatedAt !== 'string' || !Number.isFinite(Date.parse(state.updatedAt)) || new Date(state.updatedAt).toISOString() !== state.updatedAt) return false;
  if (!Array.isArray(state.clues) || !Array.isArray(state.solved) || !isObject(state.choices)) return false;
  if (new Set(state.clues).size !== state.clues.length || new Set(state.solved).size !== state.solved.length) return false;
  const permittedClues = SCENES.slice(0, current + 1).reduce((all, scene) => all.concat(scene.objects.map((item) => item.clue.id)), []);
  if (!Array.from(state.clues).every((id) => typeof id === 'string' && permittedClues.indexOf(id) !== -1)) return false;
  if (!Array.from(state.solved).every((id) => SCENES.slice(0, current + 1).some((scene) => scene.puzzle.id === id))) return false;
  for (let i = 0; i < SCENES.length; i += 1) {
    const p = SCENES[i].puzzle;
    const solved = state.solved.indexOf(p.id) !== -1;
    if (i < current && !solved) return false;
    if (solved && (!p.required.every((id) => state.clues.indexOf(id) !== -1) || puzzleAnswers(p).indexOf(state.choices[p.id]) === -1)) return false;
    if (!solved && Object.prototype.hasOwnProperty.call(state.choices, p.id)) return false;
  }
  if (Object.keys(state.choices).length !== state.solved.length) return false;
  if (state.lensAcquired !== (state.clues.indexOf('S01_terminal') !== -1)) return false;
  if (!state.lensAcquired && state.battery !== 100) return false;
  if (current < SCENES.findIndex((scene) => scene.id === 'S08') && state.lensAcquired && state.battery <= 0) return false;
  if (current >= SCENES.findIndex((scene) => scene.id === 'S08') && state.battery > 10) return false;
  if (current >= SCENES.findIndex((scene) => scene.id === 'S09') && state.battery !== 0) return false;
  if (state.sceneId !== 'S09' && state.artwork.length !== 0) return false;
  if (state.clues.indexOf('S09_drawing') !== -1 && !meaningfulArtwork(state.artwork)) return false;
  if (state.completed && (current !== SCENES.length - 1 || state.solved.length !== SCENES.length)) return false;
  return true;
}

class GameModel {
  constructor(state, onChange) {
    if (state !== undefined && state !== null && !validateState(state)) throw new TypeError('Invalid game state');
    this._state = state ? clone(state) : createState();
    this.onChange = typeof onChange === 'function' ? onChange : function () {};
  }
  get state() { return clone(this._state); }
  get scene() { return SCENES.find((scene) => scene.id === this._state.sceneId); }
  get canLens() { return this._state.lensAcquired && this._state.battery > 0; }
  _changed() { this._state.updatedAt = now(); this.onChange(this.state); }
  observe(objectId, mode) {
    const item = this.scene.objects.find((object) => object.id === objectId);
    if (!item) return { ok: false, newClue: false, dialogue: [], message: '这里没有这个可交互物件。' };
    if ((mode !== 'reality' && mode !== 'memory') || (item.mode !== 'both' && mode !== item.mode)) return { ok: false, newClue: false, dialogue: [], message: item.mode === 'memory' ? '切换到透镜影像，再观察这里。' : '回到现实，再检查这件物品。' };
    if (mode === 'memory' && !this.canLens && this._state.clues.indexOf(item.clue.id) === -1) return { ok: false, newClue: false, dialogue: [], message: '透镜已经没有电，仍可回看已记录的影像线索。' };
    if (this.scene.id === 'S05') {
      const prerequisites = {
        gap: ['S05_bridge', '先举起透镜，观察完整的旧连廊。'],
        wrist: ['S05_gap', '先确认现实中的断口。'],
        rescue: ['S05_wrist', '先稳住小花受伤的手腕。'],
      };
      const gate = prerequisites[item.id];
      if (gate && this._state.clues.indexOf(gate[0]) === -1) return { ok: false, newClue: false, dialogue: [], message: gate[1] };
    }
    if (item.id === 'drawing' && this.scene.id === 'S09' && !meaningfulArtwork(this._state.artwork)) return { ok: false, newClue: false, dialogue: [], message: '先亲手留下至少两笔可辨认的画痕，再记录这幅新画。' };
    const isNew = this._state.clues.indexOf(item.clue.id) === -1;
    if (isNew) { this._state.clues.push(item.clue.id); if (item.id === 'terminal' && this.scene.id === 'S01') this._state.lensAcquired = true; this._changed(); }
    return { ok: true, newClue: isNew, dialogue: clone(item.dialogue), message: isNew ? '线索已记录：' + item.clue.title : '已记录这条线索，可以在线索册中回看。' };
  }
  attempt(optionId, mode) {
    const activeMode = mode === undefined ? 'reality' : mode;
    const p = this.scene.puzzle;
    if (activeMode !== 'reality') return { ok: false, message: '影像无法代替行动。先回到现实，再作出选择。' };
    if (this._state.solved.indexOf(p.id) !== -1) return { ok: true, message: p.success };
    if (!p.required.every((id) => this._state.clues.indexOf(id) !== -1)) return { ok: false, message: missingClueMessage(this.scene, p, this._state.clues) };
    const choice = p.options.find((item) => item.id === optionId);
    if (!choice) return { ok: false, message: '请选择当前可用的行动。' };
    if (puzzleAnswers(p).indexOf(optionId) === -1) return { ok: false, message: choice.feedback };
    this._state.solved.push(p.id); this._state.choices[p.id] = optionId; this._changed();
    return { ok: true, message: p.success };
  }
  advance() {
    if (this._state.solved.indexOf(this.scene.puzzle.id) === -1 || this._state.completed) return false;
    const index = SCENES.findIndex((scene) => scene.id === this._state.sceneId);
    if (index === SCENES.length - 1) this._state.completed = true;
    else { this._state.sceneId = SCENES[index + 1].id; if (this._state.sceneId === 'S08') this._state.battery = Math.min(this._state.battery, 10); if (this._state.sceneId === 'S09') this._state.battery = 0; }
    this._changed(); return true;
  }
  restartChapter() { this._state = createState(this._state.settings); this._changed(); return this.state; }
  setSetting(key, value) { if (!validSetting(key, value)) return false; if (this._state.settings[key] === value) return true; this._state.settings[key] = value; this._changed(); return true; }
  setBrightness(value) { if (value !== 1 && value !== 2) return false; if (this._state.brightness === value) return true; this._state.brightness = value; this._changed(); return true; }
  setArtwork(strokes) {
    if (this.scene.id !== 'S09' || !validArtwork(strokes)) return false;
    if (this._state.clues.indexOf('S09_drawing') !== -1 && !meaningfulArtwork(strokes)) return false;
    this._state.artwork = clone(strokes); this._changed(); return true;
  }
  tick(seconds, mode, paused) {
    if (paused === true || typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0 || !this._state.lensAcquired || this._state.battery <= 0) return this._state.battery;
    const activeMode = mode === 'memory' ? 'memory' : 'reality';
    const rate = activeMode === 'memory' ? (this._state.brightness === 2 ? 0.1 : 0.035) : 0.015;
    // 游戏化耗电曲线：S08 前持续指数衰减；有限探索保留正电，绝不回充。
    // S08 开始线性耗电，S09 以叙事时间流逝归零；并非真实装置的测量值。
    const beforeCave = SCENES.findIndex((scene) => scene.id === this._state.sceneId) < SCENES.findIndex((scene) => scene.id === 'S08');
    const next = beforeCave ? Math.max(Number.MIN_VALUE, this._state.battery * Math.exp(-seconds * rate / 100)) : Math.max(0, this._state.battery - seconds * rate);
    if (next !== this._state.battery) { this._state.battery = next; this._changed(); }
    return this._state.battery;
  }
}

module.exports = { createState, validateState, GameModel };

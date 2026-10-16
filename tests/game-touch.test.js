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

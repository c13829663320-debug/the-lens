'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MAX_STROKES, MAX_POINTS, appendPoint, finishStroke, bounds, normalize, resizeStrokes } = require('../ui/strokes');

test('stroke appending preserves endpoints while sampling long pointer input', () => {
  const stroke = [];
  appendPoint(stroke, [50, 155]);
  for (let i = 1; i <= 5000; i += 1) appendPoint(stroke, [50 + i * 0.2, 155 + Math.sin(i / 20) * 40]);
  assert.equal(stroke.length <= MAX_POINTS, true);
  assert.deepEqual(stroke[0], [50, 155]);
  assert.equal(stroke[stroke.length - 1][0], 1050);
});

test('an unfinished one point stroke is removed and stroke count is bounded by the UI helper contract', () => {
  const strokes = [];
  for (let i = 0; i < MAX_STROKES; i += 1) strokes.push([[i, i], [i + 1, i + 1]]);
  assert.equal(strokes.length, MAX_STROKES);
  const one = [[5, 5]];
  strokes.push(one);
  finishStroke(strokes, one);
  assert.equal(strokes.length, MAX_STROKES);
  assert.equal(strokes.includes(one), false);
});

test('normalization clamps and resize preserves normalized artwork across orientation', () => {
  const source = bounds(1000, 600);
  const strokes = [[[49, 154], [500, 300], [951, 445]], [[120, 200], [900, 500]]];
  const normalized = normalize(strokes, source);
  assert.deepEqual(normalized[0][0], [0, 0]);
  assert.deepEqual(normalized[0][2], [1, 1]);
  const target = bounds(600, 1050);
  const resized = resizeStrokes(strokes, source, target);
  assert.deepEqual(resized[0][0], [target.x, target.y]);
  assert.deepEqual(resized[0][2], [target.x + target.w, target.y + target.h]);
  assert.equal(resized[1].length, 2);
});


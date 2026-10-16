'use strict';

// Match the persistent artwork schema. Sample pointer motion before it reaches
// the model, keeping the exact first and latest points of each stroke.
const MAX_STROKES = 80;
const MAX_POINTS = 1000;
const MIN_STEP = 1.5;

function distanceToSegmentSquared(point, start, end) {
  const dx = end[0] - start[0], dy = end[1] - start[1];
  const length = dx * dx + dy * dy;
  const ratio = length === 0 ? 0 : Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length));
  const x = point[0] - start[0] - ratio * dx, y = point[1] - start[1] - ratio * dy;
  return x * x + y * y;
}

// Iterative Douglas-Peucker preserves corners instead of keeping every nth event.
function simplify(points, tolerance) {
  const keep = new Uint8Array(points.length);
  keep[0] = 1; keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]], threshold = tolerance * tolerance;
  while (stack.length) {
    const segment = stack.pop(), start = segment[0], end = segment[1];
    let farthest = -1, maximum = threshold;
    for (let i = start + 1; i < end; i += 1) {
      const distance = distanceToSegmentSquared(points[i], points[start], points[end]);
      if (distance > maximum) { maximum = distance; farthest = i; }
    }
    if (farthest !== -1) { keep[farthest] = 1; stack.push([start, farthest], [farthest, end]); }
  }
  return points.filter((point, i) => keep[i]);
}

function appendPoint(stroke, point) {
  const next = [point[0], point[1]], count = stroke.length;
  if (!count) stroke.push(next);
  else if (count === 1) {
    if (next[0] !== stroke[0][0] || next[1] !== stroke[0][1]) stroke.push(next);
  } else {
    const anchor = stroke[count - 2], tail = stroke[count - 1];
    if (Math.hypot(tail[0] - anchor[0], tail[1] - anchor[1]) < MIN_STEP) stroke[count - 1] = next;
    else stroke.push(next);
  }
  if (stroke.length > MAX_POINTS) {
    let tolerance = .75, compact = simplify(stroke, tolerance);
    while (compact.length > 750) { tolerance *= 1.5; compact = simplify(stroke, tolerance); }
    stroke.splice(0, stroke.length, ...compact);
  }
}

function finishStroke(strokes, current) {
  if (!current || current.length >= 2) return;
  const index = strokes.indexOf(current);
  if (index !== -1) strokes.splice(index, 1);
}

function bounds(width, height) { return { x: 50, y: 155, w: width - 100, h: height - 310 }; }
function clamp(value) { return Math.max(0, Math.min(1, value)); }
function normalize(strokes, area) {
  return strokes.filter((stroke) => stroke.length >= 2).map((stroke) => stroke.map(([x, y]) => [clamp((x - area.x) / area.w), clamp((y - area.y) / area.h)]));
}
function resizeStrokes(strokes, previous, next) {
  return normalize(strokes, previous).map((stroke) => stroke.map(([x, y]) => [next.x + x * next.w, next.y + y * next.h]));
}

module.exports = { MAX_STROKES, MAX_POINTS, appendPoint, finishStroke, bounds, normalize, resizeStrokes };

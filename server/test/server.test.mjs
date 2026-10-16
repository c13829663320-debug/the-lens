import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { createMediaServer, parseRange } from '../server.mjs';

test('Range requests support seeking and reject ambiguous/multiple ranges', () => {
  assert.deepEqual(parseRange('bytes=2-5', 10), { start: 2, end: 5 });
  assert.deepEqual(parseRange('bytes=8-', 10), { start: 8, end: 9 });
  assert.deepEqual(parseRange('bytes=-3', 10), { start: 7, end: 9 });
  assert.deepEqual(parseRange('bytes=1-999', 10), { start: 1, end: 9 });
  for (const bad of ['bytes=10-', 'bytes=4-2', 'bytes=-0', 'bytes=0-1,4-5', 'bytes=-', 'bytes=Infinity-']) assert.equal(parseRange(bad, 10), false);
  assert.equal(parseRange('bytes=0-1', 0), false);
});

test('media endpoints serve real files, byte ranges, HEAD and a filtered manifest', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lens-media-'));
  const mediaRoot = path.join(directory, 'media');
  await mkdir(mediaRoot);
  await writeFile(path.join(mediaRoot, 'sample.mp4'), Buffer.from('0123456789')); // Transport fixture; not a generated CG.
  await writeFile(path.join(directory, 'secret.mp4'), 'outside root');
  const sampleHash = createHash('sha256').update('0123456789').digest('hex');
  await writeFile(path.join(mediaRoot, 'manifest.json'), JSON.stringify({ version: 1, assets: [
    { id: 'opening', file: 'sample.mp4', caption: 'Transport test' },
    { id: 'approved', file: 'sample.mp4', status: 'approved', canonical: true, bytes: 10, sha256: sampleHash, width: 1280, height: 720, durationMs: 1000 },
    { id: 'bad-hash', file: 'sample.mp4', status: 'approved', canonical: true, sha256: '0'.repeat(64) },
    { id: 'bad-canonical', file: 'sample.mp4', status: 'draft_needs_art_review', canonical: true },
    { id: 'rejected', file: 'sample.mp4', status: 'rejected' },
    { id: 'missing', file: 'missing.mp4' }, { id: 'escape', file: '../secret.mp4' },
    { id: 'opening', file: 'sample.mp4' },
  ] }));
  const server = createMediaServer({ mediaRoot, allowedOrigin: 'https://lens.example.com' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    const manifest = await (await fetch(`${base}/api/media-manifest`)).json();
    assert.deepEqual(manifest.assets.map(a => a.id), ['opening', 'approved']);
    assert.equal(manifest.assets[0].bytes, 10);
    assert.equal(manifest.assets[1].status, 'approved');
    assert.equal(manifest.assets[1].canonical, true);
    assert.equal(manifest.assets[1].sha256, sampleHash);
    assert.equal(manifest.assets[1].durationMs, 1000);
    const partial = await fetch(`${base}/media/sample.mp4`, { headers: { Range: 'bytes=3-6' } });
    assert.equal(partial.status, 206);
    assert.equal(partial.headers.get('content-range'), 'bytes 3-6/10');
    assert.equal(await partial.text(), '3456');
    const head = await fetch(`${base}/media/sample.mp4`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-length'), '10');
    assert.equal(await head.text(), '');
    const invalid = await fetch(`${base}/media/sample.mp4`, { headers: { Range: 'bytes=99-' } });
    assert.equal(invalid.status, 416);
    assert.equal(invalid.headers.get('content-range'), 'bytes */10');
    const post = await fetch(`${base}/health`, { method: 'POST' });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('allow'), 'GET, HEAD');
    assert.equal((await fetch(`${base}/media/manifest.json`)).status, 404);
    assert.equal((await fetch(`${base}/media/missing.mp4`)).status, 404);
    const allowed = await fetch(`${base}/health`, { headers: { Origin: 'https://lens.example.com' } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://lens.example.com');
    const blocked = await fetch(`${base}/health`, { headers: { Origin: 'https://other.example.com' } });
    assert.equal(blocked.headers.get('access-control-allow-origin'), null);
    const raw = pathname => new Promise((resolve, reject) => {
      const request = http.get(`${base}${pathname}`, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
      request.on('error', reject);
    });
    assert.equal(await raw('/media/%2e%2e%2fsecret.mp4'), 404);
    assert.equal(await raw('/media/%5c..%5csecret.mp4'), 404);
    assert.equal(await raw('/media/%E0%A4%A'), 400);
    await writeFile(path.join(mediaRoot, 'manifest.json'), '{bad');
    assert.equal((await fetch(`${base}/api/media-manifest`)).status, 503);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});

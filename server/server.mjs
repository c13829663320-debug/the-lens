import http from 'node:http';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { realpath, stat, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const TYPES = {
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
};

function sendJson(req, res, status, value, extra = {}) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length,
    'Cache-Control': 'no-store', ...extra,
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

function safeSegments(relative) {
  // A narrow ASCII naming convention also prevents ambiguous Windows paths.
  return relative && relative.length <= 240 && relative.split('/').every(segment =>
    /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(segment) && !segment.includes('..'));
}

async function mediaFile(root, relative) {
  if (!safeSegments(relative) || !TYPES[path.extname(relative).toLowerCase()]) return null;
  try {
    const rootReal = await realpath(root);
    const candidate = await realpath(path.resolve(rootReal, ...relative.split('/')));
    const rel = path.relative(rootReal, candidate);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
    const info = await stat(candidate);
    return info.isFile() ? { candidate, info } : null;
  } catch { return null; }
}

export function parseRange(value, size) {
  if (value === undefined) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2]) || size === 0) return false;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return false;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return false;
    end = Math.min(end, size - 1);
  }
  return { start, end };
}

export function createMediaServer({ mediaRoot = path.join(MODULE_DIR, 'media'), allowedOrigin = '' } = {}) {
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (allowedOrigin && req.headers.origin === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Vary', 'Origin');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendJson(req, res, 405, { error: 'method_not_allowed' }, { Allow: 'GET, HEAD' });
    }
    if (!req.url || req.url.length > 2048) return sendJson(req, res, 414, { error: 'url_too_long' });
    try {
      // Do not normalize dot segments with URL() before the security check.
      const pathname = decodeURIComponent(req.url.split('?')[0]);
      if (pathname === '/health') return sendJson(req, res, 200, { ok: true, service: 'the-lens-media', version: 1 });
      if (pathname === '/api/media-manifest') {
        let source;
        try {
          const info = await stat(path.join(mediaRoot, 'manifest.json'));
          if (info.size > 65536) throw new Error('manifest too large');
          source = JSON.parse(await readFile(path.join(mediaRoot, 'manifest.json'), 'utf8'));
          if (source.version !== 1 || !Array.isArray(source.assets) || source.assets.length > 100) throw new Error('invalid manifest');
        } catch { return sendJson(req, res, 503, { error: 'manifest_unavailable' }); }
        const assets = [];
        const ids = new Set();
        for (const entry of source.assets) {
          if (!entry || typeof entry.id !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(entry.id) || ids.has(entry.id) || typeof entry.file !== 'string') continue;
          const found = await mediaFile(mediaRoot, entry.file);
          if (!found) continue;
          ids.add(entry.id);
          assets.push({ id: entry.id, url: `/media/${entry.file}`, bytes: found.info.size,
            type: TYPES[path.extname(entry.file).toLowerCase()],
            ...(typeof entry.caption === 'string' ? { caption: entry.caption.slice(0, 300) } : {}) });
        }
        return sendJson(req, res, 200, { version: 1, assets });
      }
      if (!pathname.startsWith('/media/')) return sendJson(req, res, 404, { error: 'not_found' });
      const relative = pathname.slice('/media/'.length);
      const found = await mediaFile(mediaRoot, relative);
      if (!found) return sendJson(req, res, 404, { error: 'media_not_found' });
      const { candidate, info } = found;
      const range = parseRange(req.headers.range, info.size);
      if (range === false) return sendJson(req, res, 416, { error: 'invalid_range' }, { 'Content-Range': `bytes */${info.size}` });
      const start = range ? range.start : 0;
      const end = range ? range.end : info.size - 1;
      res.writeHead(range ? 206 : 200, {
        'Content-Type': TYPES[path.extname(relative).toLowerCase()],
        'Content-Length': range ? end - start + 1 : info.size,
        'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600',
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` } : {}),
      });
      if (req.method === 'HEAD' || info.size === 0) return res.end();
      const stream = createReadStream(candidate, { start, end });
      stream.on('error', () => res.destroy());
      res.on('close', () => stream.destroy());
      stream.pipe(res);
    } catch (error) {
      if (res.headersSent) return res.destroy();
      return sendJson(req, res, error instanceof URIError ? 400 : 500, { error: error instanceof URIError ? 'invalid_url' : 'internal_error' });
    }
  });
  server.maxHeadersCount = 50;
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1..65535');
  const server = createMediaServer({
    mediaRoot: process.env.MEDIA_ROOT || path.join(MODULE_DIR, 'media'),
    allowedOrigin: process.env.ALLOWED_ORIGIN || '',
  });
  server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`THE LENS media service listening on ${port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
}

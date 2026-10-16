'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const MEDIA = require('../data/media');
const { Game } = require('../ui/game');

test('remote CG accepts only approved canonical manifest entries', async () => {
  const previous = { baseUrl: MEDIA.baseUrl, manifestPath: MEDIA.manifestPath };
  MEDIA.baseUrl = 'https://media.test';
  MEDIA.manifestPath = '/api/media-manifest';
  const manifest = {
    version: 1,
    assets: [
      { id: 'approved', type: 'video/mp4', status: 'approved', canonical: true, url: '/media/approved.mp4' },
      { id: 'draft', type: 'video/mp4', status: 'draft_needs_art_review', canonical: false, url: '/media/draft.mp4' },
      { id: 'unapproved', type: 'video/mp4', status: 'pending_generation', canonical: true, url: '/media/pending.mp4' },
      { id: 'noncanonical', type: 'video/mp4', status: 'approved', canonical: false, url: '/media/preview.mp4' },
      { id: 'external', type: 'video/mp4', status: 'approved', canonical: true, url: 'https://other.test/video.mp4' },
    ],
  };
  const game = Object.create(Game.prototype);
  game.p = { fetchJson: async url => {
    assert.equal(url, 'https://media.test/api/media-manifest');
    return manifest;
  } };
  game.remoteClips = {};
  game.toast = message => assert.fail(`Unexpected media warning: ${message}`);

  try {
    await game.loadMedia();
    assert.deepEqual(game.remoteClips, { approved: { url: 'https://media.test/media/approved.mp4' } });
  } finally {
    MEDIA.baseUrl = previous.baseUrl;
    MEDIA.manifestPath = previous.manifestPath;
  }
});

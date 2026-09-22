const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { IptvService } = require('../services/media-server/src/iptv.cjs');

test('Xtream connection imports VOD categories and exposes a local stream target', async t => {
  const provider = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname.startsWith('/movie/') || url.pathname.startsWith('/series/') || url.pathname.startsWith('/live/')) {
      res.writeHead(206, { 'Content-Type': 'video/mp4', 'Content-Range': 'bytes 0-3/4' });
      return res.end(Buffer.from([0, 0, 0, 0]));
    }
    const action = url.searchParams.get('action');
    const body = !action ? { user_info: { auth: 1, status: 'Active' } }
      : action === 'get_vod_categories' ? [{ category_id: '7', category_name: 'Films' }]
      : action === 'get_vod_streams' ? [{ stream_id: 101, category_id: '7', name: 'A real title', year: '2025', rating: '8.2', stream_icon: 'https://example.test/poster.jpg', container_extension: 'mp4' }]
      : action === 'get_series_categories' ? [{ category_id: '8', category_name: 'Apple TV+' }]
      : action === 'get_series' ? [{ series_id: 201, category_id: '8', name: 'A real box set', releaseDate: '2025', rating: '8.7', cover: 'https://example.test/series.jpg' }]
      : action === 'get_live_categories' ? [{ category_id: '9', category_name: 'Motor Racing' }]
      : action === 'get_live_streams' ? [{ stream_id: 401, category_id: '9', name: 'NASCAR Racing Live', stream_icon: 'https://example.test/nascar.jpg', container_extension: 'ts' }]
      : action === 'get_series_info' ? { info: { plot: 'A detailed series description.', genre: 'Drama', director: 'Director Name', cast: 'Actor One, Actor Two', backdrop_path: ['https://example.test/backdrop.jpg'] }, episodes: { '1': [{ id: 301, title: 'Pilot', episode_num: 1, container_extension: 'mkv', info: { plot: 'The detailed first episode description.', duration: '45 min', rating: '8.5', movie_image: 'https://example.test/episode.jpg' } }] } }
      : [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  });
  await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve));
  const port = provider.address().port;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wolfe-iptv-test-'));
  t.after(() => { provider.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const service = new IptvService(path.join(dir, 'iptv.json'));
  const status = await service.configure({ url: `http://127.0.0.1:${port}`, user: 'user', password: 'secret' });
  assert.equal(status.connected, true);
  assert.equal(status.titleCount, 3);
  const catalogue = await service.catalog('movie:7', 90, false, 'movie');
  assert.equal(catalogue.items[0].title, 'A real title');
  assert.deepEqual(catalogue.categories[0], { id: 'movie:7', sourceId: '7', kind: 'movie', name: 'Films', titleCount: 1, poster: 'https://example.test/poster.jpg', artwork: ['https://example.test/poster.jpg'] });
  const seriesCatalogue = await service.catalog('series:8', 90, false, 'series');
  assert.deepEqual(seriesCatalogue.categories[0], { id: 'series:8', sourceId: '8', kind: 'series', name: 'Apple TV+', titleCount: 1, poster: 'https://example.test/series.jpg', artwork: ['https://example.test/series.jpg'] });
  assert.equal(seriesCatalogue.items[0].title, 'A real box set');
  assert.equal(seriesCatalogue.items[0].kind, 'series');
  const seriesInfo = await service.seriesInfo('series:201');
  assert.equal(seriesInfo.series.description, 'A detailed series description.');
  assert.deepEqual(seriesInfo.seasons, ['1']);
  assert.deepEqual(seriesInfo.episodes[0], { id: 'episode:301:mkv', sourceId: '301', kind: 'episode', title: 'Pilot', seriesTitle: 'A real box set', season: '1', episode: '1', description: 'The detailed first episode description.', duration: '45 min', rating: '8.5', year: '', poster: 'https://example.test/episode.jpg', extension: 'mkv' });
  assert.equal(service.streamUrl('episode:301:mkv'), `http://127.0.0.1:${port}/series/user/secret/301.mkv`);
  assert.deepEqual(await service.playbackCheck('episode:301:mkv'), { playable: true, contentType: 'video/mp4' });
  assert.equal((await service.search('real', 20, 'movie')).items[0].title, 'A real title');
  const liveSearch = await service.search('nascar racing', 20);
  assert.equal(liveSearch.items[0].kind, 'live');
  assert.equal(liveSearch.items[0].title, 'NASCAR Racing Live');
  assert.equal(service.streamUrl('live:401'), `http://127.0.0.1:${port}/live/user/secret/401.ts`);
  assert.equal(service.streamUrl('live:401', 'hls'), `http://127.0.0.1:${port}/live/user/secret/401.m3u8`);
  assert.deepEqual(await service.playbackCheck('live:401'), { playable: true, contentType: 'video/mp4' });
  assert.equal(service.streamUrl('101'), `http://127.0.0.1:${port}/movie/user/secret/101.mp4`);
  assert.deepEqual(await service.playbackCheck('101'), { playable: true, contentType: 'video/mp4' });
  service.setHiddenCategories(['movie:7']);
  assert.equal((await service.catalog('', 20, false, 'movie')).items.length, 0);
  assert.equal((await service.search('real', 20, 'movie')).items.length, 0);
  assert.equal((await service.catalog('', 20, true, 'movie')).items.length, 1);
  const restored = new IptvService(path.join(dir, 'iptv.json'));
  assert.equal(restored.status().hiddenCategoryCount, 1);
  assert.equal((await restored.catalog('', 20, false, 'movie')).items.length, 0);
});

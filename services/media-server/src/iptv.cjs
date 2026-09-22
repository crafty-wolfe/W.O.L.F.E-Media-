const fs = require('node:fs');
const path = require('node:path');

function validConfig(input) {
  if (!input || typeof input !== 'object') throw new Error('Invalid IPTV details');
  const url = String(input.url || '').trim().replace(/\/$/, '');
  const user = String(input.user || '').trim();
  const password = String(input.password || '');
  if (!/^https?:\/\//i.test(url) || url.length > 500 || !user || user.length > 160 || !password || password.length > 300) throw new Error('Enter a server URL, username and password.');
  return { url, user, password };
}

class IptvService {
  constructor(file) {
    this.file = file;
    this.config = null;
    this.cache = null;
    this.lastError = null;
    this.hiddenCategories = [];
    try {
      const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
      this.config = validConfig(saved.config);
      if (Array.isArray(saved.hiddenCategories)) this.hiddenCategories = [...new Set(saved.hiddenCategories.filter(id => typeof id === 'string' && id.length <= 100))];
    } catch {}
  }
  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file + '.tmp', JSON.stringify({ config: this.config, hiddenCategories: this.hiddenCategories }, null, 2));
    fs.renameSync(this.file + '.tmp', this.file);
  }
  async request(config, action, parameters = {}) {
    const url = new URL('/player_api.php', config.url + '/');
    url.searchParams.set('username', config.user);
    url.searchParams.set('password', config.password);
    if (action) url.searchParams.set('action', action);
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, String(value));
    const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Provider returned ${response.status}.`);
    return response.json();
  }
  async import(config = this.config) {
    if (!config) throw new Error('IPTV provider is not connected.');
    const account = await this.request(config);
    if (!account || !account.user_info || String(account.user_info.auth) === '0') throw new Error('The provider did not accept these details.');
    const [movieCategories, movieStreams, seriesCategoriesResult, seriesResult, liveCategoriesResult, liveStreamsResult] = await Promise.all([
      this.request(config, 'get_vod_categories'),
      this.request(config, 'get_vod_streams'),
      this.request(config, 'get_series_categories').catch(() => []),
      this.request(config, 'get_series').catch(() => []),
      this.request(config, 'get_live_categories').catch(() => []),
      this.request(config, 'get_live_streams').catch(() => [])
    ]);
    if (!Array.isArray(movieCategories) || !Array.isArray(movieStreams)) throw new Error('The provider did not return an on-demand catalogue.');
    const seriesCategories = Array.isArray(seriesCategoriesResult) ? seriesCategoriesResult : [];
    const series = Array.isArray(seriesResult) ? seriesResult : [];
    const liveCategories = Array.isArray(liveCategoriesResult) ? liveCategoriesResult : [];
    const liveStreams = Array.isArray(liveStreamsResult) ? liveStreamsResult : [];
    const movieCategoryNames = new Map(movieCategories.map(item => [String(item.category_id || ''), String(item.category_name || 'Other').slice(0, 100)]));
    const seriesCategoryNames = new Map(seriesCategories.map(item => [String(item.category_id || ''), String(item.category_name || 'Other').slice(0, 100)]));
    const liveCategoryNames = new Map(liveCategories.map(item => [String(item.category_id || ''), String(item.category_name || 'Other').slice(0, 100)]));
    this.cache = {
      importedAt: Date.now(),
      account: { status: account.user_info.status || 'Active', expires: account.user_info.exp_date || null },
      categories: [
        ...movieCategories.map(item => ({ id: `movie:${String(item.category_id || '')}`, sourceId: String(item.category_id || ''), kind: 'movie', name: String(item.category_name || 'Other').slice(0, 100) })).filter(item => item.sourceId),
        ...seriesCategories.map(item => ({ id: `series:${String(item.category_id || '')}`, sourceId: String(item.category_id || ''), kind: 'series', name: String(item.category_name || 'Other').slice(0, 100) })).filter(item => item.sourceId),
        ...liveCategories.map(item => ({ id: `live:${String(item.category_id || '')}`, sourceId: String(item.category_id || ''), kind: 'live', name: String(item.category_name || 'Other').slice(0, 100) })).filter(item => item.sourceId)
      ],
      streams: [
        ...movieStreams.map(item => ({
          id: `movie:${String(item.stream_id || '')}`, sourceId: String(item.stream_id || ''), kind: 'movie', categoryId: `movie:${String(item.category_id || '')}`, title: String(item.name || 'Untitled').slice(0, 180),
          categoryName: movieCategoryNames.get(String(item.category_id || '')) || 'Other', year: String(item.year || '').slice(0, 12), rating: String(item.rating || '').slice(0, 12),
          added: Number(item.added) || 0, poster: /^https?:\/\//i.test(String(item.stream_icon || '')) ? String(item.stream_icon).slice(0, 1000) : '', extension: String(item.container_extension || 'mp4').toLowerCase()
        })).filter(item => /^\d{1,20}$/.test(item.sourceId)),
        ...series.map(item => ({
          id: `series:${String(item.series_id || '')}`, sourceId: String(item.series_id || ''), kind: 'series', categoryId: `series:${String(item.category_id || '')}`, title: String(item.name || 'Untitled').slice(0, 180),
          categoryName: seriesCategoryNames.get(String(item.category_id || '')) || 'Other', year: String(item.releaseDate || item.year || '').slice(0, 12), rating: String(item.rating || '').slice(0, 12),
          added: Number(item.last_modified || item.added) || 0, poster: /^https?:\/\//i.test(String(item.cover || item.stream_icon || '')) ? String(item.cover || item.stream_icon).slice(0, 1000) : '', extension: ''
        })).filter(item => /^\d{1,20}$/.test(item.sourceId)),
        ...liveStreams.map(item => ({
          id: `live:${String(item.stream_id || '')}`, sourceId: String(item.stream_id || ''), kind: 'live', categoryId: `live:${String(item.category_id || '')}`, title: String(item.name || 'Untitled channel').slice(0, 180),
          categoryName: liveCategoryNames.get(String(item.category_id || '')) || 'Other', year: '', rating: '',
          added: Number(item.added) || 0, poster: /^https?:\/\//i.test(String(item.stream_icon || '')) ? String(item.stream_icon).slice(0, 1000) : '', extension: String(item.container_extension || 'ts').toLowerCase()
        })).filter(item => /^\d{1,20}$/.test(item.sourceId))
      ]
    };
    this.lastError = null;
    return this.cache;
  }
  async configure(input) {
    const next = validConfig(input);
    await this.import(next);
    this.config = next;
    this.save();
    return this.status();
  }
  async refresh() { return this.import(); }
  status() {
    return { configured: Boolean(this.config), connected: Boolean(this.cache), importedAt: this.cache?.importedAt || null, categoryCount: this.cache?.categories.length || 0, titleCount: this.cache?.streams.length || 0, hiddenCategoryCount: this.hiddenCategories.length, account: this.cache?.account || null, error: this.lastError };
  }
  async catalog(categoryId, limit = 90, includeHidden = false, contentKind = '') {
    if (!this.cache) await this.import();
    const category = String(categoryId || '');
    const kind = ['movie','series','live'].includes(contentKind) ? contentKind : '';
    const visible = (includeHidden ? this.cache.categories : this.cache.categories.filter(item => !this.hiddenCategories.includes(item.id))).filter(item => !kind || item.kind === kind);
    const categories = visible.map(category => {
      const streams = this.cache.streams.filter(item => item.categoryId === category.id && (includeHidden || !this.hiddenCategories.includes(item.categoryId))).sort((left, right) => Number(right.rating || 0) - Number(left.rating || 0) || right.added - left.added);
      const highlight = streams.find(item => item.poster) || streams[0];
      return { ...category, titleCount: streams.length, poster: highlight?.poster || '', artwork: [...new Set(streams.map(item=>item.poster).filter(Boolean))].slice(0,3) };
    });
    const items = this.cache.streams.filter(item => (includeHidden || !this.hiddenCategories.includes(item.categoryId)) && (!kind || item.kind === kind) && (!category || item.categoryId === category)).sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0) || b.added - a.added).slice(0, Math.min(Math.max(Number(limit) || 90, 1), 180));
    return { categories, items, hiddenCategories: this.hiddenCategories, importedAt: this.cache.importedAt };
  }
  async search(query, limit = 60, contentKind = '') {
    if (!this.cache) await this.import();
    const phrase = String(query || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (phrase.length < 2 || phrase.length > 120) throw new Error('Enter at least two characters to search your library.');
    const terms = phrase.split(' ').filter(Boolean);
    const kind = ['movie', 'series', 'live'].includes(contentKind) ? contentKind : '';
    const matches = this.cache.streams.filter(item => {
      if (this.hiddenCategories.includes(item.categoryId)) return false;
      if (kind && item.kind !== kind) return false;
      const title = item.title.toLowerCase(), category = item.categoryName.toLowerCase();
      return terms.every(term => title.includes(term) || category.includes(term));
    }).sort((left, right) => {
      const leftTitle = left.title.toLowerCase(), rightTitle = right.title.toLowerCase();
      const leftScore = leftTitle.startsWith(phrase) ? 3 : leftTitle.includes(phrase) ? 2 : 1;
      const rightScore = rightTitle.startsWith(phrase) ? 3 : rightTitle.includes(phrase) ? 2 : 1;
      return rightScore - leftScore || Number(right.rating || 0) - Number(left.rating || 0) || right.added - left.added;
    }).slice(0, Math.min(Math.max(Number(limit) || 60, 1), 80));
    return { query: phrase, items: matches, total: matches.length };
  }
  async seriesInfo(seriesId) {
    if (!this.cache) await this.import();
    const sourceId = String(seriesId || '').replace(/^series:/, '');
    if (!/^\d{1,20}$/.test(sourceId)) throw new Error('Invalid series selection.');
    const series = this.cache.streams.find(item => item.kind === 'series' && item.sourceId === sourceId);
    if (!series || this.hiddenCategories.includes(series.categoryId)) throw new Error('This series is unavailable.');
    const response = await this.request(this.config, 'get_series_info', { series_id: sourceId });
    const info = response && typeof response.info === 'object' ? response.info : {};
    const episodeGroups = response && response.episodes && typeof response.episodes === 'object' ? response.episodes : {};
    const episodes = Object.entries(episodeGroups).flatMap(([season, entries]) => (Array.isArray(entries) ? entries : []).map((entry, index) => {
      const episodeId = String(entry.id || entry.stream_id || '');
      const extension = String(entry.container_extension || 'mp4').toLowerCase();
      const episodeNumber = String(entry.episode_num || entry.episode || index + 1);
      return {
        id: `episode:${episodeId}:${extension}`,
        sourceId: episodeId,
        kind: 'episode',
        title: String(entry.title || `Episode ${episodeNumber}`).slice(0, 180),
        seriesTitle: series.title,
        season: String(entry.season || season || '1').slice(0, 12),
        episode: episodeNumber.slice(0, 12),
        description: String(entry.info?.plot || entry.info?.description || entry.description || '').slice(0, 2000),
        duration: String(entry.info?.duration || entry.info?.duration_secs || entry.duration || '').slice(0, 48),
        rating: String(entry.info?.rating || entry.rating || '').slice(0, 12),
        year: String(entry.info?.releasedate || entry.info?.release_date || '').slice(0, 20),
        poster: /^https?:\/\//i.test(String(entry.info?.movie_image || entry.info?.cover_big || entry.image || '')) ? String(entry.info?.movie_image || entry.info?.cover_big || entry.image).slice(0, 1000) : '',
        extension: /^[a-z0-9]{2,5}$/.test(extension) ? extension : 'mp4'
      };
    })).filter(item => /^\d{1,20}$/.test(item.sourceId));
    const seasons = [...new Set(episodes.map(item => item.season))].sort((left, right) => Number(left) - Number(right) || left.localeCompare(right));
    return {
      series: {
        ...series,
        description: String(info.plot || info.description || '').slice(0, 3000),
        genre: String(info.genre || '').slice(0, 240),
        director: String(info.director || '').slice(0, 240),
        cast: String(info.cast || '').slice(0, 600),
        backdrop: /^https?:\/\//i.test(String(info.backdrop_path?.[0] || info.backdrop || '')) ? String(info.backdrop_path?.[0] || info.backdrop).slice(0, 1000) : series.poster
      },
      seasons,
      episodes
    };
  }
  setHiddenCategories(ids) {
    if (!Array.isArray(ids) || ids.length > 400 || ids.some(id => typeof id !== 'string' || id.length > 100)) throw new Error('Invalid category preferences');
    const validIds = new Set(this.cache?.categories.map(category => category.id) || []);
    this.hiddenCategories = [...new Set(ids)].filter(id => !validIds.size || validIds.has(id));
    this.save();
    return this.status();
  }
  streamUrl(streamId, format = '') {
    if (!this.config || !this.cache) throw new Error('IPTV provider is not connected.');
    const episode = /^episode:(\d{1,20}):([a-z0-9]{2,5})$/.exec(String(streamId));
    if (episode) return `${this.config.url}/series/${encodeURIComponent(this.config.user)}/${encodeURIComponent(this.config.password)}/${episode[1]}.${episode[2]}`;
    const item = this.cache.streams.find(stream => stream.id === String(streamId) || ((stream.kind === 'movie' || stream.kind === 'live') && stream.sourceId === String(streamId)));
    if (!item) throw new Error('This IPTV title is unavailable.');
    if (item.kind === 'series') throw new Error('Choose an episode from this series before playback.');
    const extension = /^[a-z0-9]{2,5}$/.test(item.extension) ? item.extension : 'mp4';
    if (item.kind === 'live') {
      const liveExtension = String(format).toLowerCase() === 'hls' ? 'm3u8' : extension;
      return `${this.config.url}/live/${encodeURIComponent(this.config.user)}/${encodeURIComponent(this.config.password)}/${item.sourceId}.${liveExtension}`;
    }
    return `${this.config.url}/movie/${encodeURIComponent(this.config.user)}/${encodeURIComponent(this.config.password)}/${item.sourceId}.${extension}`;
  }
  async playbackCheck(streamId, format = '') {
    const source = this.streamUrl(streamId, format);
    let response;
    try {
      response = await fetch(source, {
        redirect: 'follow',
        headers: {
          'Accept': 'video/*,audio/*,application/vnd.apple.mpegurl,application/octet-stream;q=0.9,*/*;q=0.1',
          'Range': 'bytes=0-16383',
          'User-Agent': 'W.O.L.F.E Media Center/0.9'
        },
        signal: AbortSignal.timeout(30000)
      });
    } catch {
      return { playable: false, reason: 'unreachable' };
    }
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const isMedia = /^(video|audio)\//.test(contentType) || /application\/(vnd\.apple\.mpegurl|x-mpegurl|octet-stream)/.test(contentType);
    let networkBlocked = false;
    if (!isMedia && /text\/html/.test(contentType)) {
      try {
        const reader = response.body?.getReader();
        const chunk = reader ? await reader.read() : { value: null };
        const preview = Buffer.from(chunk.value || []).toString('utf8').toLowerCase();
        networkBlocked = preview.includes('blocked by cloudflare gateway');
        await reader?.cancel();
      } catch {}
    }
    try { await response.body?.cancel(); } catch {}
    if (!response.ok) return { playable: false, reason: 'provider_response' };
    if (isMedia) return { playable: true, contentType };
    return { playable: false, reason: networkBlocked ? 'network_blocked' : 'unexpected_response' };
  }
}

module.exports = { IptvService };

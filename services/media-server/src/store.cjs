const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PROFILES = ['Mike','Amy','Alfie','Brooke','Elsie-Joan','Visitors'];
const PREFERENCE_AGES = new Set(['3–7','8–12','13–17','Adult']);
const PREFERENCE_GENRES = new Set(['Sci-Fi','Action','Drama','Comedy','Crime','Documentaries','Family','Animation','Fantasy','Reality']);
const PREFERENCE_MOODS = new Set(['New releases','Easy watch','Big adventures','Feel-good','Mystery nights','Family nights']);
const PREFERENCE_AVATARS = new Set(['wolf','orbit','sunset','forest','violet','cloud']);
function validPreference(value) {
  if (!value || typeof value !== 'object' || !PREFERENCE_AGES.has(value.age) || !PREFERENCE_AVATARS.has(value.avatar)) return false;
  if (!Array.isArray(value.genres) || !value.genres.length || value.genres.length > 3 || value.genres.some(genre => !PREFERENCE_GENRES.has(genre))) return false;
  return Array.isArray(value.moods) && value.moods.length && value.moods.length <= 2 && value.moods.every(mood => PREFERENCE_MOODS.has(mood));
}
class Store {
  constructor(file) {
    this.file = file;
    this.state = { progress: {}, slots: [], profileRequests: [], profileAssignments: {}, watchHistory: {}, trending: {}, profilePreferences: {} };
    if (fs.existsSync(file)) {
      try {
        const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (saved.progress && typeof saved.progress === 'object') this.state.progress = saved.progress;
        if (Array.isArray(saved.profileRequests)) this.state.profileRequests = saved.profileRequests.filter(request => request && PROFILES.includes(request.profile) && typeof request.device === 'string');
        if (saved.profileAssignments && typeof saved.profileAssignments === 'object') this.state.profileAssignments = saved.profileAssignments;
        if (saved.watchHistory && typeof saved.watchHistory === 'object') this.state.watchHistory = saved.watchHistory;
        if (saved.trending && typeof saved.trending === 'object') this.state.trending = saved.trending;
        if (saved.profilePreferences && typeof saved.profilePreferences === 'object') this.state.profilePreferences = Object.fromEntries(Object.entries(saved.profilePreferences).filter(([profile, preference]) => PROFILES.includes(profile) && profile !== 'Visitors' && validPreference(preference)).map(([profile, preference]) => [profile, { completed: true, age: preference.age, genres: preference.genres, moods: preference.moods, avatar: preference.avatar }]));
      } catch { fs.copyFileSync(file, file + '.corrupt-' + Date.now()); }
    }
    // Stream leases are intentionally not restored after a server restart.
  }
  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file + '.tmp', JSON.stringify({ progress: this.state.progress, profileRequests: this.state.profileRequests, profileAssignments: this.state.profileAssignments, watchHistory: this.state.watchHistory, trending: this.state.trending, profilePreferences: this.state.profilePreferences }, null, 2));
    fs.renameSync(this.file + '.tmp', this.file);
  }
  prune() { this.state.slots = this.state.slots.filter(s => s.expires > Date.now()); }
  snapshot() { this.prune(); return this.state; }
  command(data) {
    this.prune();
    const { action, client, profile, title } = data;
    if (typeof client !== 'string' || client.length > 100 || !client.length) throw new Error('Invalid client');
    if (action === 'acquire') {
      if (!PROFILES.includes(profile) || typeof title !== 'string' || !title.length || title.length > 160) throw new Error('Invalid playback');
      const existing = this.state.slots.find(s => s.client === client);
      if (!existing && this.state.slots.length >= 2) return { blocked: true, ...this.snapshot() };
      if (existing) Object.assign(existing, { title, profile, expires: Date.now() + 45000 });
      else this.state.slots.push({ client, profile, title, room: data.mode === 'lite' ? 'Lite client' : 'Main client', expires: Date.now() + 45000 });
    } else if (action === 'heartbeat') {
      const slot = this.state.slots.find(s => s.client === client);
      if (slot) slot.expires = Date.now() + 45000;
    } else if (action === 'release') {
      this.state.slots = this.state.slots.filter(s => s.client !== client);
    } else if (action === 'progress') {
      if (!PROFILES.includes(profile) || typeof title !== 'string' || !title.length || title.length > 160 || !Number.isFinite(data.percent)) throw new Error('Invalid progress');
      const history = this.state.progress[profile] || {};
      Object.defineProperty(history, title, { value: { percent: Math.min(100, Math.max(0, data.percent)), updated: Date.now() }, enumerable: true, configurable: true, writable: true });
      this.state.progress[profile] = history;
      this.save();
    } else if (action === 'watch') {
      if (!PROFILES.includes(profile) || typeof title !== 'string' || !title.length || title.length > 160) throw new Error('Invalid watch history');
      const now = Date.now();
      const history = this.state.watchHistory[profile] || {};
      const viewed = history[title] || { count: 0 };
      history[title] = { count: viewed.count + 1, watchedAt: now };
      this.state.watchHistory[profile] = history;
      const trend = this.state.trending[title] || { count: 0 };
      this.state.trending[title] = { count: trend.count + 1, watchedAt: now };
      this.save();
    } else if (action === 'saveProfilePreferences') {
      if (!PROFILES.includes(profile) || profile === 'Visitors' || !validPreference(data.preferences)) throw new Error('Invalid profile preferences');
      this.state.profilePreferences[profile] = { completed: true, age: data.preferences.age, genres: [...data.preferences.genres], moods: [...data.preferences.moods], avatar: data.preferences.avatar };
      this.save();
    } else if (action === 'requestProfileChange') {
      if (data.mode !== 'lite' || !PROFILES.includes(profile) || typeof data.device !== 'string' || !/^[a-z0-9-]{20,80}$/i.test(data.device)) throw new Error('Invalid profile request');
      this.state.profileRequests = this.state.profileRequests.filter(request => request.device !== data.device);
      this.state.profileRequests.push({ id: crypto.randomUUID(), device: data.device, profile, createdAt: Date.now() });
      this.state.profileRequests = this.state.profileRequests.slice(-12);
      this.save();
    } else if (action === 'approveProfileChange') {
      if (typeof data.requestId !== 'string') throw new Error('Invalid profile request');
      const request = this.state.profileRequests.find(item => item.id === data.requestId);
      if (!request) throw new Error('Profile request is no longer available');
      this.state.profileAssignments[request.device] = { profile: request.profile, updatedAt: Date.now() };
      this.state.profileRequests = this.state.profileRequests.filter(item => item.id !== request.id);
      this.save();
    } else throw new Error('Unknown action');
    return this.snapshot();
  }
}
module.exports = { Store, PROFILES };

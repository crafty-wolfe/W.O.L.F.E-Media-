const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normaliseVoiceCommand } = require('../services/media-server/src/voice.cjs');

test('future voice commands are restricted to known local intents', () => {
  assert.deepEqual(normaliseVoiceCommand({ intent: 'play_title', slots: { title: 'A real title' } }), { intent: 'play_title', slots: { title: 'A real title' } });
  assert.throws(() => normaliseVoiceCommand({ intent: 'delete_everything' }));
});

/* A local command contract for a future voice adapter. No microphone, cloud service or assistant is enabled here. */
const INTENTS = new Set(['open_ipTV', 'play_title', 'open_apps', 'show_profiles', 'show_cameras', 'request_profile_change']);

function normaliseVoiceCommand(command) {
  if (!command || typeof command !== 'object' || !INTENTS.has(command.intent)) throw new Error('Unsupported voice command');
  const slots = command.slots && typeof command.slots === 'object' ? command.slots : {};
  if (command.intent === 'play_title' && (typeof slots.title !== 'string' || !slots.title.trim() || slots.title.length > 180)) throw new Error('A title is required');
  return { intent: command.intent, slots: { title: typeof slots.title === 'string' ? slots.title.trim() : undefined } };
}

module.exports = { INTENTS, normaliseVoiceCommand };

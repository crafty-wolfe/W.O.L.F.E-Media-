// Contract reserved for later adapters. Nothing connects to external systems.
class HomeIntegration {
  async status() { return { connected: false, provider: 'none' }; }
  async cameras() { return []; }
  async execute(command) { throw new Error('Home integration is not configured'); }
  subscribe(listener) { return () => {}; }
}
module.exports = { HomeIntegration };

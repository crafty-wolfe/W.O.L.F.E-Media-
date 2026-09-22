# W.O.L.F.E Media Center v0.9.12

Local Windows media shell rebuilt from the original W.O.L.F.E concept artwork. Main and Lite use a near-black cinematic atmosphere, electric-blue remote focus glow, edge-led featured banners and wide image rails. The visual rebuild covers Who's Watching, Home, On Demand, Movies, Series, Apps, Cameras and Media Lite while preserving the existing local prototype behaviour. IPTV playback opens in a dedicated full-screen TV player with a minimal fade-away control layer instead of a browser-style dialog.

## Run

Requires Windows, Microsoft Edge and Node.js 22 or newer. No package installation is needed.

Double-click **Launch WOLFE Main.bat** or **Launch WOLFE Lite.bat**. The launcher verifies the build version and its project folder, starts a loopback-only service on the first available W.O.L.F.E port, and opens an Edge app window. This prevents an older background build from being reopened after an update. F11 toggles fullscreen; Alt+F4 closes the window. The small local service remains running so other local clients can share state, and Windows stops it at sign-out/restart. For development, `npm start` starts that service in your terminal; Ctrl+C stops it.

## Controls

- Arrow keys or controller D-pad / left stick: navigate
- Enter or controller A / Cross: select
- Escape, Backspace or controller B / Circle: back
- Tab / Shift+Tab: cycle controls within the active popup or page
- C: simulated camera alert
- I: IPTV connection manager
- P: return to active demo playback controls

Press a controller button after connecting it. Physical controller testing on your TV is still recommended; the browser uses standard Gamepad mapping.

## What works

Profiles and saved demo progress, Main/Lite navigation, an on-demand-first catalogue, Netflix / Prime Video / Disney+ / YouTube launch tiles, simulated camera popup, full prototype Camera and Home Control screens, and a shared two-slot manager for local clients. Each profile now has a first-time personalisation screen for an age group, favourites, viewing mood and an avatar. Mike’s neon W.O.L.F.E mark is exclusive to his avatar choices. These preferences shape the Home screen’s “Picked for” and “Because you watched” rails, and can be updated from Settings at any time. Home Control is available from the top navigation and from the focusable Smart Home button on the Home screen. Demo progress advances one percent every three seconds. It can be stopped and resumed, and survives app restarts. Service tiles open the official websites; sign-in, subscriptions and playback are handled by those services.

Main always opens with the full family profile chooser. Each Lite bedroom remembers its approved profile after first setup. Guest sessions ask their preferences every time. A bedroom can request a profile change from Settings; Main shows the request in Settings and Mike approves it with his six-digit PIN. The same PIN protects the IPTV controls, which are only shown on Mike’s profile.

The connection manager can add simulated rooms to exercise the two-slot limit. Simulated rooms expire after 45 seconds. Actual app demo playback renews its lease; abandoned clients expire within 45 seconds. Releasing another client's slot stops its demo on the next heartbeat (within ten seconds).

## Boundaries

The IPTV area supports a local Xtream Codes connection. It tests the provider, imports its VOD categories and titles, and plays selected VOD streams in the app. Before a title starts, W.O.L.F.E checks that the provider returns an actual media stream, so a blocked or misrouted provider video endpoint is reported clearly instead of opening a blank player. Closing the player stops the media pipeline before returning to W.O.L.F.E. The W.O.L.F.E Search page searches the full locally imported VOD catalogue by title and category while respecting Mike’s hidden-category choices. Provider details remain on this PC and are only changed from Mike’s PIN-protected IPTV controls. Mike can also show or hide each imported category; that choice applies across On Demand, Movies, Series, Kids and Home. Kids never falls back to general VOD: it only uses child/family categories and titles. These screens retain their cinematic hero and rail layouts while replacing prototype titles with provider titles, metadata and posters. After an import, Home automatically builds its recommendations from the provider catalogue, local profile watch history, household viewing trends, provider ratings and newly added titles. The two-slot manager coordinates windows on this PC only; it does not enforce a subscription across separate PCs or TVs. Visitors are not a security boundary or parental-control system.

Home Assistant, Tapo and Alexa remain disconnected. `server/integrations.cjs` reserves a small adapter contract for status, camera lists, commands and events.

## Development structure

- `app/index.html`: layout
- `app/styles.css`: base prototype styles
- `app/design-v3.css`: screenshot-matched TV layout, focus treatment and responsive rules
- `app/app.js`: original prototype catalogue and page components
- `app/enhancements.js`: local API, playback simulation, focus management and controller support
- `app/design-v3.js`: cinematic Home, On Demand, library, Home Control and Camera screens
- `app/personalisation.js`: local profile onboarding, avatar choices and personalised Home rails
- `app/player.js` and `app/player.css`: dedicated full-screen IPTV player and remote controls
- `server/server.cjs`: loopback HTTP service
- `server/store.cjs`: persistent progress and expiring connection leases
- `server/iptv.cjs`: local Xtream Codes test, catalogue import and stream URL service
- `server/voice.cjs`: safe local command contract reserved for a future voice assistant
- `server/integrations.cjs`: inactive future integration contract
- `scripts/Launch.ps1`: Windows launcher
- `tests/store.test.cjs`: state and slot regression tests; run `npm test`
- `docs/original-prototype`: untouched extracted starting files

Production progress is stored under `%LOCALAPPDATA%\WOLFE Media Center\state.json`. Invalid JSON is backed up with a `.corrupt-…` suffix before recovery. Progress is stored separately by profile. Stream leases intentionally reset when the service restarts. `WOLFE_DATA` can override the save location for isolated tests; `WOLFE_PORT` can override the development port (launcher expects 47831).

The current build keeps the original global page functions and inline handlers to preserve prototype behaviour. A future UI refactor can replace these with modules and remove the corresponding inline-script CSP allowance. External providers open outside the local application.

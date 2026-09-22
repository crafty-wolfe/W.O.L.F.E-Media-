# W.O.L.F.E Media alignment — 21 September 2026

## What already matches

- Main and Lite clients, six family profiles, separate local profile state, visitor sessions and bedroom-profile approval flow.
- An entertainment-first navigation shell with On Demand, Movies, Series, Kids, Apps, Cameras and inactive Home Assistant placeholders.
- Local Xtream VOD catalogue import, category visibility, per-profile local watch signals and the two-local-stream connection manager.
- Keyboard and standard controller navigation, a camera picture-in-picture demonstration and electric-blue focus treatment.
- Concept-inspired Home, On Demand, Home Control and Camera presentation layers.

## Where the build has drifted

- Older prototype functions are still mixed into the visual layer, leaving some pages and dialogs with dashboard-like spacing and generic cards.
- Content details, universal search and service hand-offs have not yet been rebuilt as premium TV flows.
- The previous video player was a constrained modal containing browser video controls. It did not meet the full-screen, remote-first media experience.
- The service shell and client identity are still local-prototype implementations. They need a clearer modular boundary before voice, EPG, multi-room events or Home Assistant are added.

## Implementation order

1. Establish reusable full-screen presentation surfaces: player, content detail and system overlays. The IPTV player is now the first completed surface.
2. Finish the shared shell, Who's Watching, Home and content rails at the concept-art quality bar, removing remaining prototype styling from visible paths.
3. Rebuild On Demand, Movies, Series and Kids around real VOD metadata, details, favourites and resume state while retaining the current catalogue and two-stream logic.
4. Finish Apps, Camera overlays and Lite with the same navigation, transitions and visual hierarchy.
5. Split the remaining client logic into profile, catalogue, player, connection and shell modules. Introduce persistent client/room identity.
6. Add universal search, EPG/live-TV and Ask W.O.L.F.E only after the visual and navigation pass is complete. Home Assistant, Tapo and Alexa remain adapter-only until explicitly requested.

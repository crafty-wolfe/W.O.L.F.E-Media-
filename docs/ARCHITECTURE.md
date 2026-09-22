# W.O.L.F.E Media architecture

`apps/media-client` is the shared browser client used by both Main and Lite. Main and Lite remain deliberately thin so household features do not duplicate UI, media or profile behaviour.

`packages/ui`, `packages/media-catalogue` and `packages/iptv` contain reusable browser modules. The remaining package folders are reserved integration boundaries for the next migration steps: profiles, search, cameras, updates, W.O.L.F.E Assistant and Home Assistant.

`services/media-server` is the local Node service. It owns local state, Xtream provider communication, stream routing and future update orchestration. It is the only service allowed to access local credentials and update files.

`assets` are served with the shared client. `releases`, `staging`, `backups`, logs and local IPTV data are intentionally excluded from Git.

# Validation — 21 September 2026

Version 0.9.9 keeps an Xtream provider's own three libraries separate: Movies from VOD, and Series / Box Sets from the Series section. The category controls only hide or show provider categories; they do not guess or reclassify titles. Movie collection cards and Series-by-service cards use the same wide artwork size as the Home rails, and Kids is available only on Alfie, Brooke, and Elsie-Joan's profiles. It also retains the v0.9.8 saved profile choices and the v0.9.7 IPTV card and catalogue improvements.

Passed twelve automated Node.js tests, including IPTV search and hidden-category coverage, TV catalogue filter rules, an Xtream-style VOD stream preflight, two-slot admission/release, expired lease recovery, separate persisted profile progress, invalid input rejection and corrupt-save backup/recovery.

Passed automated Microsoft Edge browser checks for Home, On Demand, Home Control, Cameras, Settings and Lite mode. Checks confirm distinct preview cards, placeholder labels, the six profiles, demo playback progress and stop, persisted progress after reload, camera popup focus containment, simulated connection allocation and release, and a Netflix tile opening the expected URL. The external page response was intercepted for testing; streaming login and protected video playback were not tested.

Inspected Home, On Demand, Home Control and Cameras at 1920×1080 and Lite at 1280×720. JavaScript syntax checks and the Windows launcher parse check passed. The Main Windows launcher was executed successfully from the staged build.

Physical gamepad hardware and HDMI/TV operation still need a user test. No real IPTV provider, Home Assistant, Tapo or Alexa was connected.

Installation to D:\W\.O.L.F.E\Media Center was not performed: the filesystem permission request returned no grant. The output ZIP contains the tested app files ready to extract into that folder.

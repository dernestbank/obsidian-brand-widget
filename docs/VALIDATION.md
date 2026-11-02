# Release validation

Date: November 2, 2026. Candidate: 1.1.2.

## Completed

- JavaScript syntax, ESLint core checks, formatting, metadata and package-content checks.
- Automated tests for settings normalization, invalid links, internal/external navigation, panel singleton behavior, status toggle, image fallback and motion settings.
- Plugin loaded in a separate real Obsidian 1.14.5 desktop vault on Windows. No company files used.
- Logo loaded successfully, settings rendered in the detached settings window, three quick links displayed, and internal navigation opened the intended note.
- Concurrent show commands retained one widget panel.
- All four effects produced the expected animation names; emulated system reduced motion produced `animation-name: none`.
- Missing background reverted to the theme background.
- Real light/dark screenshots and settings screenshot captured and visually inspected.
- Release packaging includes only generic plugin code, manifest, stylesheet, README and license. Personal data.json and images are excluded.

## Limits and follow-up

- The OS-native file picker itself has not been manually exercised; import logic is covered by automated tests.
- No macOS, Linux or physical mobile-device tests. The release is desktop-only; mobile can be enabled in a future tested release.
- Versions below 1.14.5 have not been tested and are not advertised as supported.
- Official community-directory review has not been run. Its acceptance is not guaranteed by local checks.
- Public release assets and the plugin listing have not been uploaded or published.

Source code was tested directly as main.js; no bundling or compilation step changes the runtime artifact.

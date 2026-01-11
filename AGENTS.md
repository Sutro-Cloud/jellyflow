# Repository Guidelines

## Project Structure & Module Organization
This is a small static web app with a thin Node server. Key files:
- `index.html` holds the app markup and UI skeleton.
- `styles.css` contains the global theme, layout, and animations.
- `app.js` is the module entry point that wires UI events.
- `modules/` contains feature-focused ES modules (coverflow, lyrics, playlists, playback).
- `server.js` is an Express server that serves static assets and the SPA fallback.
- `package.json` defines the Node runtime and dependencies.

## Build, Test, and Development Commands
- `npm install` installs Express and locks dependencies.
- `npm start` runs `node server.js` and serves the app at `http://localhost:3000`.
- `python3 -m http.server 3000` serves the static files without Express headers or SPA fallback.

## Coding Style & Naming Conventions
- Indentation is 2 spaces; use semicolons and double quotes in JavaScript.
- Prefer `const` and `let`; avoid `var`.
- DOM element IDs in `index.html` are camelCase and mirrored in `app.js`.
- CSS classes and custom properties use kebab-case (example: `.coverflow-section`, `--panel-veil`).

## Testing Guidelines
There is no automated test framework or coverage target yet.
Manual checks should include connecting to a Jellyfin server, browsing albums, starting playback,
and toggling theme/lyrics options to verify UI state transitions.

## Commit & Pull Request Guidelines
Git history currently has a single "initial commit", so no convention is established.
Use short, imperative commit subjects and add a brief body when behavior changes.
For pull requests, include a clear summary, steps to verify, and screenshots or GIFs for UI updates.

## Configuration & Security Tips
- Requires Node 18+ and a reachable Jellyfin server.
- Set `PORT` to change the local server port.
- Do not commit Jellyfin credentials or API keys; they are stored locally in the browser.
- If the Jellyfin server blocks the app, enable CORS for `http://localhost:3000`.

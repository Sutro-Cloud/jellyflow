# Contributing to Jellyflow

Thanks for taking the time to contribute. This project is a small, static web app with a thin
Express server, so changes are usually focused on `index.html`, `styles.css`, and `app.js`.

## Setup
- Install dependencies: `npm install`
- Run the app: `npm start` (serves at `http://localhost:3000`)
- Static server alternative: `python3 -m http.server 3000` (no Express headers)

## Project Structure
- `index.html`: main markup and UI skeleton.
- `styles.css`: global theme, layout, and animations.
- `app.js`: client-side state, Jellyfin API calls, and UI behavior.
- `server.js`: Express static server and SPA fallback.

## Coding Style
- Use 2-space indentation and double quotes in JavaScript.
- Prefer `const`/`let`; avoid `var`.
- Keep DOM IDs camelCase and match them in `app.js`.
- CSS uses kebab-case for classes and custom properties.

## Testing
There are no automated tests yet. Please do a quick manual pass:
- Connect to Jellyfin, load albums, and play a track.
- Open/close lyrics and playlists panels.
- Verify keyboard navigation (arrows, enter, space).

## Pull Requests
- Keep PRs focused and describe the change and why it matters.
- Include steps to verify and screenshots or GIFs for UI changes.

See `AGENTS.md` for repository-specific contributor tips.

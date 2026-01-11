import React, { useEffect, useRef } from "react";
import { initDom } from "./modules/dom.js";
import { initApp } from "./app/initApp.js";

export default function App() {
  const hasInit = useRef(false);

  useEffect(() => {
    if (hasInit.current) {
      return;
    }
    hasInit.current = true;
    initDom();
    initApp();
  }, []);

  return (
    <div className="app">
      <main className="main">
        <section className="coverflow-section" id="coverflowSection">
          <div className="coverflow">
            <div className="coverflow-stage">
              <div className="coverflow-track" id="coverflowTrack"></div>
              <div
                className="coverflow-empty is-visible is-brand-only"
                id="coverflowEmpty"
                aria-live="polite"
              >
                <div className="coverflow-empty-brand" id="coverflowEmptyBrand">
                  <img
                    className="coverflow-empty-logo"
                    src="/jellyflow.png"
                    alt="Jellyflow logo"
                  />
                  <div className="coverflow-empty-name">Jellyflow</div>
                </div>
                <div className="coverflow-empty-icon" id="coverflowEmptyIcon">&#128268;</div>
                <div className="coverflow-empty-title" id="coverflowEmptyTitle">Connect to Jellyfin</div>
                <div className="coverflow-empty-sub" id="coverflowEmptySub">
                  Use the connect button below to sign in.
                </div>
              </div>
            </div>
          </div>
          <div className="album-meta" id="albumMeta">
            <div className="album-line" id="albumLine">Connect to Jellyfin</div>
            <div className="album-count" id="albumCount">0 albums</div>
          </div>
          <div className="lyrics-panel" id="lyricsPanel">
            <div className="lyrics-header">
              <div className="lyrics-header-text">
                <div className="lyrics-title">Lyrics</div>
                <div className="lyrics-status" id="lyricsStatus">No track playing</div>
              </div>
            </div>
            <div className="lyrics-viewport" id="lyricsViewport">
              <div className="lyrics-track" id="lyricsTrack">
                <div className="lyrics-line is-active">Start playing a track to see lyrics.</div>
              </div>
            </div>
          </div>
          <div className="playlist-panel" id="playlistPanel" data-view="list">
            <div className="playlist-header">
              <button
                className="icon playlist-back"
                id="playlistBack"
                type="button"
                aria-label="Back to playlists"
                hidden
              >
                &lt;
              </button>
              <div className="playlist-header-text">
                <div className="playlist-title" id="playlistTitle">Playlists</div>
                <div className="playlist-status" id="playlistStatus">No playlists loaded</div>
              </div>
            </div>
            <div className="playlist-body">
              <div className="playlist-list" id="playlistList">
                <div className="empty">No playlists loaded</div>
              </div>
              <div className="tracklist playlist-tracklist" id="playlistTracks"></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="player">
        <div className="player-left">
          <div className="now-playing">
            <div
              className="now-cover"
              id="nowCover"
              role="button"
              tabIndex={0}
              aria-label="Jump to now playing album"
            ></div>
            <div className="now-info">
              <div className="now-title" id="nowTitle">Nothing playing</div>
              <div className="now-sub" id="nowSub">Connect to start listening</div>
            </div>
            <div className="now-actions">
              <button
                className="control-icon"
                id="openSettings"
                type="button"
                aria-label="Connect"
                title="Connect"
              >
                &#128268;
              </button>
              <button
                className="control-icon"
                id="themeToggle"
                type="button"
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                &#9789;
              </button>
              <button
                className="lyrics-toggle"
                id="lyricsPaneToggle"
                type="button"
                aria-label="Toggle lyrics panel"
                aria-expanded="false"
              >
                &#9834;
              </button>
              <button
                className="playlist-toggle"
                id="playlistPaneToggle"
                type="button"
                aria-label="Toggle playlists panel"
                aria-expanded="false"
              >
                &#9776;
              </button>
            </div>
          </div>
          <div className="ad-slot" id="adSlot" aria-hidden="true"></div>
          <div className="footer-controls" id="cornerControls">
            <div
              className="status"
              id="status"
              data-tone="idle"
              role="button"
              tabIndex={0}
              aria-label="Open connection settings"
            >
              Not connected
            </div>
          </div>
        </div>
        <audio id="audio" controls preload="auto"></audio>
      </footer>

      <dialog id="settingsDialog">
        <div className="dialog-header">
          <div>
            <div className="dialog-title">Connect to Jellyfin</div>
            <div className="dialog-sub">Provide your server URL, API key, and user ID.</div>
          </div>
          <button className="icon" id="closeSettings" type="button" aria-label="Close">
            &times;
          </button>
        </div>
        <div className="dialog-body">
          <label className="field">
            <span>Server URL</span>
            <input
              id="serverUrlInput"
              type="url"
              placeholder="https://jellyfin.yourdomain.com"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Username</span>
            <input
              id="usernameInput"
              type="text"
              placeholder="Jellyfin username"
              autoComplete="username"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              id="passwordInput"
              type="password"
              placeholder="Jellyfin password"
              autoComplete="current-password"
            />
          </label>
          <details className="advanced-auth">
            <summary>Use API key instead</summary>
            <div className="advanced-body">
              <label className="field">
                <span>API Key</span>
                <input
                  id="apiKeyInput"
                  type="password"
                  placeholder="Paste your Jellyfin API key"
                  autoComplete="off"
                />
              </label>
              <div className="field-row">
                <button className="ghost" id="loadUsersBtn" type="button">Load Users</button>
                <label className="field">
                  <span>User</span>
                  <select id="userSelect" defaultValue="">
                    <option value="">Select a user</option>
                  </select>
                </label>
              </div>
              <label className="field">
                <span>User ID</span>
                <input
                  id="userIdInput"
                  type="text"
                  placeholder="User ID"
                  autoComplete="off"
                />
              </label>
            </div>
          </details>
          <label className="toggle">
            <input id="lyricsToggle" type="checkbox" defaultChecked />
            <span>Fetch lyrics from LRCLIB (online)</span>
          </label>
          <label className="toggle">
            <input id="rememberToggle" type="checkbox" defaultChecked />
            <span>Remember connection on this device</span>
          </label>
        </div>
        <div className="dialog-actions">
          <button className="primary" id="connectBtn" type="button">Save &amp; Connect</button>
          <button className="ghost" id="resetBtn" type="button">Clear</button>
        </div>
      </dialog>

      <div className="typeahead" id="typeahead" aria-hidden="true"></div>
    </div>
  );
}

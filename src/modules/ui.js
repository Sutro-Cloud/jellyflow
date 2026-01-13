import { dom } from "./dom.js";

export function setStatus(text, tone = "idle") {
  const value = text || "";
  dom.status.textContent = value;
  dom.status.dataset.tone = tone;
  dom.status.classList.toggle("is-hidden", !value);
  dom.status.setAttribute("aria-hidden", value ? "false" : "true");
}

export function createTrackButton({
  number,
  title,
  meta,
  duration,
  isFavorite = false,
  dataset,
  onClick,
  onFocus,
}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "track";
  if (dataset) {
    Object.entries(dataset).forEach(([key, value]) => {
      button.dataset[key] = value;
    });
  }

  const numberEl = document.createElement("span");
  numberEl.textContent = number;

  const titleWrap = document.createElement("div");
  const titleText = document.createElement("div");
  titleText.className = "track-title";
  titleText.textContent = title;
  const metaText = document.createElement("div");
  metaText.className = "track-meta";
  metaText.textContent = meta;
  titleWrap.appendChild(titleText);
  titleWrap.appendChild(metaText);

  const tail = document.createElement("div");
  tail.className = "track-tail";
  if (isFavorite) {
    const favoriteEl = document.createElement("span");
    favoriteEl.className = "track-favorite";
    favoriteEl.textContent = "\u2665";
    favoriteEl.setAttribute("aria-hidden", "true");
    tail.appendChild(favoriteEl);
  }

  const durationEl = document.createElement("span");
  durationEl.textContent = duration;
  tail.appendChild(durationEl);

  button.appendChild(numberEl);
  button.appendChild(titleWrap);
  button.appendChild(tail);

  if (onClick) {
    button.addEventListener("click", onClick);
  }
  if (onFocus) {
    button.addEventListener("focus", onFocus);
  }

  return button;
}

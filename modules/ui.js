import { dom } from "./dom.js";

export function setStatus(text, tone = "idle") {
  dom.status.textContent = text;
  dom.status.dataset.tone = tone;
}

export function createTrackButton({ number, title, meta, duration, dataset, onClick, onFocus }) {
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

  const durationEl = document.createElement("span");
  durationEl.textContent = duration;

  button.appendChild(numberEl);
  button.appendChild(titleWrap);
  button.appendChild(durationEl);

  if (onClick) {
    button.addEventListener("click", onClick);
  }
  if (onFocus) {
    button.addEventListener("focus", onFocus);
  }

  return button;
}

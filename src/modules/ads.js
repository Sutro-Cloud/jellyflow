import { dom } from "./dom.js";

const ADS_ENABLED = (import.meta.env.VITE_ADS_ENABLED || "").toLowerCase() === "true";
const ADS_PROVIDER = (import.meta.env.VITE_ADS_PROVIDER || "").toLowerCase();
const ADS_CLIENT = import.meta.env.VITE_ADS_CLIENT || "";
const ADS_SLOT = import.meta.env.VITE_ADS_SLOT || "";
const ADS_SCRIPT_URL = import.meta.env.VITE_ADS_SCRIPT_URL || "";

function loadScript(src, onLoad) {
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  script.addEventListener("load", () => onLoad?.());
  document.head.appendChild(script);
}

export function initAds() {
  if (!dom.adSlot) {
    return;
  }
  if (!ADS_ENABLED) {
    return;
  }
  dom.adSlot.classList.add("is-visible");
  dom.adSlot.dataset.provider = ADS_PROVIDER || "custom";

  if (ADS_PROVIDER === "adsense" && ADS_CLIENT && ADS_SLOT) {
    const scriptUrl =
      ADS_SCRIPT_URL ||
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`;
    const ad = document.createElement("ins");
    ad.className = "adsbygoogle";
    ad.style.display = "block";
    ad.style.width = "100%";
    ad.style.height = "100%";
    ad.setAttribute("data-ad-client", ADS_CLIENT);
    ad.setAttribute("data-ad-slot", ADS_SLOT);
    ad.setAttribute("data-ad-format", "auto");
    ad.setAttribute("data-full-width-responsive", "true");
    dom.adSlot.appendChild(ad);

    loadScript(scriptUrl, () => {
      const adsbygoogle = window.adsbygoogle || [];
      adsbygoogle.push({});
      window.adsbygoogle = adsbygoogle;
    });
    return;
  }

  if (ADS_SCRIPT_URL) {
    loadScript(ADS_SCRIPT_URL);
  }

  const label = document.createElement("div");
  label.className = "ad-fallback";
  label.textContent = "Advertisement";
  dom.adSlot.appendChild(label);
}

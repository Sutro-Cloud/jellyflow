const GA_ENABLED = (import.meta.env.VITE_GA_ENABLED || "").toLowerCase() === "true";
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "";
const GA_SCRIPT_URL = import.meta.env.VITE_GA_SCRIPT_URL || "";

function loadScript(src) {
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export function initAnalytics() {
  if (!GA_ENABLED || !GA_MEASUREMENT_ID) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);

  const scriptUrl =
    GA_SCRIPT_URL ||
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      GA_MEASUREMENT_ID
    )}`;
  loadScript(scriptUrl);
}

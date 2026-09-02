type AnalyticsParams = Record<string, string | number | boolean | undefined>;

const ATTRIBUTION_KEY = "nycsr_attribution_v1";

function readAttribution(): AnalyticsParams {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY) || "{}");
  } catch {
    return {};
  }
}

export function initializeAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const existing = readAttribution();
    const campaign = {
      source: params.get("utm_source") || undefined,
      medium: params.get("utm_medium") || undefined,
      campaign: params.get("utm_campaign") || undefined,
      content: params.get("utm_content") || undefined,
      term: params.get("utm_term") || undefined,
    };
    const hasCampaign = Object.values(campaign).some(Boolean);
    const attribution = {
      ...existing,
      ...(existing.first_landing_page ? {} : {
        first_landing_page: window.location.pathname,
        first_referrer: document.referrer || "direct",
      }),
      ...(hasCampaign ? Object.fromEntries(Object.entries(campaign).filter(([, value]) => value)) : {}),
    };
    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // Analytics must never interfere with the product experience.
  }
}

export function trackEvent(name: string, params: AnalyticsParams = {}): void {
  if (typeof window === "undefined") return;
  try {
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.("event", name, { ...readAttribution(), ...params });
  } catch {
    // Analytics must never interfere with the product experience.
  }
}

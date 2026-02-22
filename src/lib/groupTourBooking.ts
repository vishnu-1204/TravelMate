export type GroupTourBookingPayload = {
  tourName: string;
  destination: string;
  travelDate: string;
  price: number;
};

const GROUP_TOUR_FORM_URL_CANDIDATES = [
  (import.meta.env.VITE_GROUP_TOUR_FORM_URL as string | undefined)?.trim() || '',
  (import.meta.env.VITE_GOOGLE_FORM_URL as string | undefined)?.trim() || '',
  (import.meta.env.VITE_BOOKING_GOOGLE_FORM_URL as string | undefined)?.trim() || '',
];

const ENTRY_CANDIDATES = {
  tourName: [
    (import.meta.env.VITE_GROUP_TOUR_FORM_ENTRY_TOUR_NAME as string | undefined)?.trim() || '',
    (import.meta.env.VITE_GOOGLE_FORM_ENTRY_TOUR_NAME as string | undefined)?.trim() || '',
  ],
  destination: [
    (import.meta.env.VITE_GROUP_TOUR_FORM_ENTRY_DESTINATION as string | undefined)?.trim() || '',
    (import.meta.env.VITE_GOOGLE_FORM_ENTRY_DESTINATION as string | undefined)?.trim() || '',
  ],
  travelDate: [
    (import.meta.env.VITE_GROUP_TOUR_FORM_ENTRY_TRAVEL_DATE as string | undefined)?.trim() || '',
    (import.meta.env.VITE_GOOGLE_FORM_ENTRY_TRAVEL_DATE as string | undefined)?.trim() || '',
  ],
  price: [
    (import.meta.env.VITE_GROUP_TOUR_FORM_ENTRY_PRICE as string | undefined)?.trim() || '',
    (import.meta.env.VITE_GOOGLE_FORM_ENTRY_PRICE as string | undefined)?.trim() || '',
  ],
};

const LOCAL_STORAGE_FORM_URL_KEY = 'travelmate_group_tour_form_url';
const GROUP_TOUR_FORM_MAP_ENV = (import.meta.env.VITE_GROUP_TOUR_FORM_LINKS_JSON as string | undefined)?.trim() || '';

const GROUP_TOUR_FORM_ENTRIES = {
  tourName: ENTRY_CANDIDATES.tourName.find(Boolean) || '',
  destination: ENTRY_CANDIDATES.destination.find(Boolean) || '',
  travelDate: ENTRY_CANDIDATES.travelDate.find(Boolean) || '',
  price: ENTRY_CANDIDATES.price.find(Boolean) || '',
};

const appendIfPresent = (params: URLSearchParams, key: string, value: string) => {
  if (!key || !value) return;
  params.set(key, value);
};

const resolveFormUrl = () => {
  const fromEnv = GROUP_TOUR_FORM_URL_CANDIDATES.find(Boolean) || '';
  if (fromEnv) return fromEnv;
  if (typeof window === 'undefined') return '';
  return (window.localStorage.getItem(LOCAL_STORAGE_FORM_URL_KEY) || '').trim();
};

const parseGroupTourFormMap = (): Record<string, string> => {
  if (!GROUP_TOUR_FORM_MAP_ENV) return {};
  try {
    const parsed = JSON.parse(GROUP_TOUR_FORM_MAP_ENV) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const resolveGroupTourFormUrl = (options: { packageId?: string; packageTitle?: string; explicitFormUrl?: string }) => {
  const explicit = (options.explicitFormUrl || '').trim();
  if (explicit) return explicit;

  const mapped = parseGroupTourFormMap();
  const byId = (options.packageId || '').trim();
  if (byId && mapped[byId]) return mapped[byId];

  const byTitle = (options.packageTitle || '').trim().toLowerCase();
  if (byTitle && mapped[byTitle]) return mapped[byTitle];

  return resolveFormUrl();
};

export const hasGroupTourFormUrl = () => Boolean(resolveFormUrl());

export const saveGroupTourFormUrl = (value: string) => {
  const cleaned = value.trim();
  if (typeof window === 'undefined') return false;
  if (!cleaned) return false;
  try {
    const parsed = new URL(cleaned);
    if (!parsed.hostname.includes('google.com')) return false;
    window.localStorage.setItem(LOCAL_STORAGE_FORM_URL_KEY, cleaned);
    return true;
  } catch {
    return false;
  }
};

export const buildGroupTourFormUrl = (
  payload: GroupTourBookingPayload,
  options?: { packageId?: string; packageTitle?: string; explicitFormUrl?: string }
): string | null => {
  const baseFormUrl = resolveGroupTourFormUrl({
    packageId: options?.packageId,
    packageTitle: options?.packageTitle,
    explicitFormUrl: options?.explicitFormUrl,
  });
  if (!baseFormUrl) return null;

  let url: URL;
  try {
    url = new URL(baseFormUrl);
  } catch {
    return null;
  }
  const params = url.searchParams;

  params.set('usp', 'pp_url');
  appendIfPresent(params, GROUP_TOUR_FORM_ENTRIES.tourName, payload.tourName);
  appendIfPresent(params, GROUP_TOUR_FORM_ENTRIES.destination, payload.destination);
  appendIfPresent(params, GROUP_TOUR_FORM_ENTRIES.travelDate, payload.travelDate);
  appendIfPresent(params, GROUP_TOUR_FORM_ENTRIES.price, `₹${payload.price.toLocaleString('en-IN')}`);

  return url.toString();
};

type BookingAnalyticsPayload = {
  packageId: string;
  tourName: string;
  destination: string;
  travelDate: string;
  price: number;
};

type AnalyticsWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
  gtag?: (command: string, eventName: string, payload?: Record<string, unknown>) => void;
};

export const trackGroupTourBookingEvent = (eventName: string, payload: BookingAnalyticsPayload) => {
  const analyticsWindow = window as AnalyticsWindow;
  analyticsWindow.gtag?.('event', eventName, payload);
  analyticsWindow.dataLayer?.push({ event: eventName, ...payload });
  window.dispatchEvent(new CustomEvent('travelmate:analytics', { detail: { eventName, ...payload } }));
};

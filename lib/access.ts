const GUEST_ACCESS_KEY = 'straylink_guest_access';
const ACCESS_EVENT = 'straylink-access-change';

export function hasGuestAccess() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(GUEST_ACCESS_KEY) === 'true';
}

export function setGuestAccess(enabled: boolean) {
  if (typeof window === 'undefined') return;
  if (enabled) {
    window.localStorage.setItem(GUEST_ACCESS_KEY, 'true');
    window.dispatchEvent(new Event(ACCESS_EVENT));
    return;
  }
  window.localStorage.removeItem(GUEST_ACCESS_KEY);
  window.dispatchEvent(new Event(ACCESS_EVENT));
}

export function onAccessChange(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(ACCESS_EVENT, callback);
  return () => window.removeEventListener(ACCESS_EVENT, callback);
}

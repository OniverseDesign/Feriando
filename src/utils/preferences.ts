export type ThemeMode = 'system' | 'light' | 'dark';

export interface AppPreferences {
  hapticFeedback: boolean;
  confirmDelete: boolean;
  quickPaymentReminder: boolean;
  themeMode: ThemeMode;
}

const PREF_HAPTIC_KEY = 'feriando_pref_haptic';
const PREF_CONFIRM_KEY = 'feriando_pref_confirm_delete';
const PREF_PAYMENT_KEY = 'feriando_pref_quick_cash';
const PREF_THEME_KEY = 'feriando_pref_theme';

export function isDarkActive(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const dark = isDarkActive(mode);
  document.documentElement.classList.toggle('dark', dark);

  const themeColor = dark ? '#141218' : '#F3EDF7';
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', themeColor);
  }
  if (typeof document.querySelectorAll === 'function') {
    const allMetas = document.querySelectorAll('meta[name="theme-color"]');
    allMetas.forEach((meta) => {
      meta.setAttribute('content', themeColor);
    });
  }
}

export function getPreferences(): AppPreferences {
  try {
    const haptic = localStorage.getItem(PREF_HAPTIC_KEY);
    const confirm = localStorage.getItem(PREF_CONFIRM_KEY);
    const payment = localStorage.getItem(PREF_PAYMENT_KEY);
    const theme = localStorage.getItem(PREF_THEME_KEY);

    return {
      hapticFeedback: haptic !== null ? JSON.parse(haptic) : true,
      confirmDelete: confirm !== null ? JSON.parse(confirm) : true,
      quickPaymentReminder: payment !== null ? JSON.parse(payment) : false,
      themeMode: (theme !== null ? JSON.parse(theme) : 'system') as ThemeMode,
    };
  } catch {
    return {
      hapticFeedback: true,
      confirmDelete: true,
      quickPaymentReminder: false,
      themeMode: 'system',
    };
  }
}

export function savePreference<K extends keyof AppPreferences>(
  key: K,
  value: AppPreferences[K]
): void {
  try {
    const storageKeys: Record<keyof AppPreferences, string> = {
      hapticFeedback: PREF_HAPTIC_KEY,
      confirmDelete: PREF_CONFIRM_KEY,
      quickPaymentReminder: PREF_PAYMENT_KEY,
      themeMode: PREF_THEME_KEY,
    };
    localStorage.setItem(storageKeys[key], JSON.stringify(value));
  } catch {
    // Ignore storage quota / incognito errors
  }
}

export function triggerHaptic(duration = 15): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    if (getPreferences().hapticFeedback) {
      navigator.vibrate(duration);
    }
  }
}

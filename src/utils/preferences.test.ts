import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPreferences,
  savePreference,
  isDarkActive,
  applyTheme,
} from './preferences';

describe('preferences & theme management', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const localStorageMock = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
    vi.stubGlobal('localStorage', localStorageMock);
  });

  it('returns default preferences including system themeMode', () => {
    const prefs = getPreferences();
    expect(prefs.themeMode).toBe('system');
    expect(prefs.hapticFeedback).toBe(true);
    expect(prefs.confirmDelete).toBe(true);
    expect(prefs.quickPaymentReminder).toBe(false);
  });

  it('persists and retrieves custom themeMode', () => {
    savePreference('themeMode', 'dark');
    expect(getPreferences().themeMode).toBe('dark');

    savePreference('themeMode', 'light');
    expect(getPreferences().themeMode).toBe('light');
  });

  it('correctly calculates isDarkActive', () => {
    expect(isDarkActive('dark')).toBe(true);
    expect(isDarkActive('light')).toBe(false);

    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
      })),
    });

    expect(isDarkActive('system')).toBe(true);
  });

  it('applies dark class to documentElement and updates meta theme-color', () => {
    const classList = new Set<string>();
    const metaAttrs: Record<string, string> = { name: 'theme-color', content: '#F3EDF7' };

    const docMock = {
      documentElement: {
        classList: {
          toggle: (cls: string, force?: boolean) => {
            if (force) classList.add(cls);
            else classList.delete(cls);
          },
          contains: (cls: string) => classList.has(cls),
        },
      },
      querySelector: (selector: string) => {
        if (selector === 'meta[name="theme-color"]') {
          return {
            setAttribute: (k: string, v: string) => {
              metaAttrs[k] = v;
            },
            getAttribute: (k: string) => metaAttrs[k],
          };
        }
        return null;
      },
    };

    vi.stubGlobal('document', docMock);

    applyTheme('dark');
    expect(classList.has('dark')).toBe(true);
    expect(metaAttrs.content).toBe('#141218');

    applyTheme('light');
    expect(classList.has('dark')).toBe(false);
    expect(metaAttrs.content).toBe('#F3EDF7');
  });
});

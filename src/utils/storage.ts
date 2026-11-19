import type { CartEntry, EventCartState, FeriaEvent } from '../types';
import { harmonizeColorToM3 } from './m3Palette';

const STORAGE_KEY = 'feria_pos_events_v1';
const CARTS_STORAGE_KEY = 'feria_pos_carts_v1';

export function loadEvents(): FeriaEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e: FeriaEvent) => {
        // Exclude legacy demo event if present in localStorage
        const isDemo =
          e.id === 'evt_demo' ||
          (e.name === 'Feria Diseño Mendoza' &&
            e.sales?.some((s) => typeof s.id === 'string' && s.id.startsWith('sale_demo')));
        return !isDemo;
      })
      .map((e: FeriaEvent) => ({
        ...e,
        participants: (e.participants || []).map((p) => ({
          ...p,
          color: harmonizeColorToM3(p.color),
        })),
        sharedEntities: (e.sharedEntities || []).map((s) => ({
          ...s,
          color: harmonizeColorToM3(s.color),
        })),
      }));
  } catch {
    return [];
  }
}

export function saveEvents(events: FeriaEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function loadCarts(): Record<string, EventCartState> {
  try {
    const raw = localStorage.getItem(CARTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const result: Record<string, EventCartState> = {};
    for (const [eventId, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object') continue;
      const candidate = value as { cart?: unknown; customTotal?: unknown };
      const cart: CartEntry[] = Array.isArray(candidate.cart)
        ? candidate.cart.filter(
            (entry): entry is CartEntry =>
              Boolean(entry) &&
              typeof entry === 'object' &&
              typeof (entry as CartEntry).productId === 'string' &&
              typeof (entry as CartEntry).quantity === 'number' &&
              Number.isFinite((entry as CartEntry).quantity) &&
              (entry as CartEntry).quantity > 0
          )
        : [];
      const customTotal =
        typeof candidate.customTotal === 'number' &&
        Number.isFinite(candidate.customTotal) &&
        candidate.customTotal >= 0
          ? candidate.customTotal
          : null;

      if (cart.length > 0 || customTotal !== null) {
        result[eventId] = { cart, customTotal };
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function saveCarts(carts: Record<string, EventCartState>): void {
  const nonEmpty: Record<string, EventCartState> = {};
  for (const [eventId, state] of Object.entries(carts)) {
    if (state.cart.length > 0 || state.customTotal !== null) {
      nonEmpty[eventId] = state;
    }
  }
  localStorage.setItem(CARTS_STORAGE_KEY, JSON.stringify(nonEmpty));
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function duplicateEvent(source: FeriaEvent): FeriaEvent {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...structuredClone(source),
    id: createId('evt'),
    name: `${source.name} (Copia)`,
    date: today,
    status: 'active',
    sales: [],
    expenses: [],
  };
}

export function exportEventsToJson(events: FeriaEvent[]): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), events }, null, 2);
}

export function parseImportedEventsJson(jsonText: string): FeriaEvent[] {
  const parsed = JSON.parse(jsonText);
  const candidate = Array.isArray(parsed) ? parsed : parsed?.events;
  if (!Array.isArray(candidate)) {
    throw new Error('El archivo JSON no contiene un listado válido de ferias.');
  }
  for (const evt of candidate) {
    if (!evt || typeof evt.id !== 'string' || typeof evt.name !== 'string' || !Array.isArray(evt.participants)) {
      throw new Error('Una o más ferias tienen un formato inválido.');
    }
  }
  return candidate as FeriaEvent[];
}

import { useEffect, useState } from 'react';
import type { CartEntry, EventCartState, FeriaEvent } from './types';
import {
  createId,
  duplicateEvent,
  loadCarts,
  loadEvents,
  saveCarts,
  saveEvents,
} from './utils/storage';
import { formatMoney } from './utils/calculations';
import { HomeScreen } from './components/HomeScreen';
import { SetupScreen } from './components/SetupScreen';
import { PosScreen } from './components/PosScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { AppLogo } from './components/AppLogo';
import { AppSettingsScreen } from './components/AppSettingsScreen';
import {
  DesktopNavbar,
  NavigationBar,
  type EventSubTab,
  type MainTab,
} from './components/NavigationBar';
import { Icon } from './components/Icon';
import { applyTheme, getPreferences } from './utils/preferences';

function pickInitialEventId(events: FeriaEvent[]): string | null {
  return events.find((e) => e.status === 'active')?.id ?? events[0]?.id ?? null;
}

export function App() {
  const [events, setEvents] = useState<FeriaEvent[]>(() => loadEvents());
  const [cartsByEvent, setCartsByEvent] = useState<Record<string, EventCartState>>(() =>
    loadCarts()
  );
  const [mainTab, setMainTab] = useState<MainTab>('ferias');
  const [eventSubTab, setEventSubTab] = useState<EventSubTab>('pos');
  const [activeEventId, setActiveEventId] = useState<string | null>(() =>
    pickInitialEventId(loadEvents())
  );
  const [eventMenuOpen, setEventMenuOpen] = useState(false);

  useEffect(() => {
    saveEvents(events);
  }, [events]);

  useEffect(() => {
    saveCarts(cartsByEvent);
  }, [cartsByEvent]);

  // Synchronize theme mode on mount and listen to system OS dark mode changes
  useEffect(() => {
    const prefs = getPreferences();
    applyTheme(prefs.themeMode);

    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const current = getPreferences();
      if (current.themeMode === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    if (!eventMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-m3-menu]')) {
        setEventMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEventMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [eventMenuOpen]);

  const activeEvent =
    events.find((e) => e.id === activeEventId) ??
    events.find((e) => e.status === 'active') ??
    events[0] ??
    null;

  const resolvedActiveEventId = activeEvent?.id ?? null;

  const handleCreateNew = () => {
    const newEvt: FeriaEvent = {
      id: createId('evt'),
      name: 'Nueva Feria',
      date: new Date().toISOString().slice(0, 10),
      status: 'active',
      transferMode: 'individual',
      singleTransferOwnerId: null,
      participants: [],
      sharedEntities: [],
      promoFamilies: [],
      products: [],
      expenses: [],
      sales: [],
    };
    setEvents((prev) => [newEvt, ...prev]);
    setActiveEventId(newEvt.id);
    setEventSubTab('setup');
    setMainTab('evento');
  };

  const handleUpdateEvent = (updated: FeriaEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  const handleDuplicate = (eventId: string) => {
    const source = events.find((e) => e.id === eventId);
    if (!source) return;
    const copy = duplicateEvent(source);
    setEvents((prev) => [copy, ...prev]);
    setActiveEventId(copy.id);
  };

  const handleToggleStatus = (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, status: e.status === 'active' ? 'finished' : 'active' }
          : e
      )
    );
  };

  const handleDelete = (eventId: string) => {
    setEvents((prev) => {
      const remaining = prev.filter((e) => e.id !== eventId);
      if (activeEventId === eventId) {
        setActiveEventId(pickInitialEventId(remaining));
      }
      return remaining;
    });
    setCartsByEvent((prev) => {
      if (!(eventId in prev)) return prev;
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  };

  const handleImportEvents = (imported: FeriaEvent[]) => {
    setEvents((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const merged = [...prev];
      for (const item of imported) {
        if (existingIds.has(item.id)) {
          const idx = merged.findIndex((e) => e.id === item.id);
          merged[idx] = item;
        } else {
          merged.push(item);
        }
      }
      if (!activeEventId && merged.length > 0) {
        setActiveEventId(pickInitialEventId(merged));
      }
      return merged;
    });
  };

  const handleClearAllData = () => {
    setEvents([]);
    setActiveEventId(null);
    setCartsByEvent({});
    setMainTab('ferias');
  };

  const handleCartChange = (eventId: string, updater: (prev: CartEntry[]) => CartEntry[]) => {
    setCartsByEvent((prev) => {
      const current = prev[eventId] ?? { cart: [], customTotal: null };
      const nextCart = updater(current.cart);
      if (nextCart.length === 0) {
        if (!(eventId in prev)) return prev;
        const next = { ...prev };
        delete next[eventId];
        return next;
      }
      return {
        ...prev,
        [eventId]: { ...current, cart: nextCart },
      };
    });
  };

  const handleCustomTotalChange = (eventId: string, customTotal: number | null) => {
    setCartsByEvent((prev) => {
      const current = prev[eventId] ?? { cart: [], customTotal: null };
      if (current.cart.length === 0 && customTotal === null) {
        if (!(eventId in prev)) return prev;
        const next = { ...prev };
        delete next[eventId];
        return next;
      }
      return {
        ...prev,
        [eventId]: { ...current, customTotal },
      };
    });
  };

  const handleClearCart = (eventId: string) => {
    setCartsByEvent((prev) => {
      if (!(eventId in prev)) return prev;
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  };

  const openEventWorkspace = (id: string, subTab: EventSubTab) => {
    setActiveEventId(id);
    setEventSubTab(subTab);
    setMainTab('evento');
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Top App Bar: Mobile centered logo | Desktop unified navbar centered */}
      <header className="sticky top-0 z-30 bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-2.5 sm:px-6">
          {/* Mobile view (<lg): Logo strictly centered in accent color */}
          <div className="flex w-full items-center justify-center lg:hidden">
            <button
              type="button"
              onClick={() => setMainTab('ferias')}
              className="flex items-center justify-center rounded-full px-3 py-1 transition-opacity hover:opacity-85 focus:outline-none"
              aria-label="Feriando - Ir a Ferias"
            >
              <AppLogo className="h-6.5 w-auto text-primary" />
            </button>
          </div>

          {/* Desktop view (>=lg): Entire navbar centered on screen with logo on left and nav buttons on right */}
          <div className="hidden lg:flex items-center justify-center">
            <DesktopNavbar currentTab={mainTab} onSelectTab={setMainTab} />
          </div>
        </div>
      </header>

      {/* Active Screen Content with Playful Spring Page Transitions */}
      {mainTab === 'ferias' && (
        <div key="ferias" className="m3-page-transition">
          <HomeScreen
            events={events}
            activeEventId={resolvedActiveEventId}
            onSelectEvent={(id) => setActiveEventId(id)}
            onCreateNew={handleCreateNew}
            onOpenPos={(id) => openEventWorkspace(id, 'pos')}
            onOpenSetup={(id) => openEventWorkspace(id, 'setup')}
            onOpenResults={(id) => openEventWorkspace(id, 'results')}
            onDuplicate={handleDuplicate}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
          />
        </div>
      )}

      {mainTab === 'evento' && activeEvent && (
        <div key={`evento-${eventSubTab}-${activeEvent.id}`} className="m3-page-transition">
          {/* Event Section Header on Screen - Mismo diseño unificado que Eventos y Ajustes */}
          <div className="mx-auto max-w-7xl px-4 pt-6 pb-2 sm:px-6 sm:pt-8 sm:pb-3">
            <div className="flex items-center justify-between gap-3">
              {/* Lado izquierdo: En Caja muestra nombre del evento y ventas; en Resultados/Configurar muestra botón 1x1 atrás y nombre de sección */}
              {eventSubTab === 'pos' ? (
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h1 className="truncate text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
                      {activeEvent.name}
                    </h1>
                    {activeEvent.status !== 'active' && (
                      <span className="shrink-0 rounded-full bg-surface-container-highest px-2.5 py-0.5 text-[10px] font-bold tracking-[0.03rem] text-on-surface-variant">
                        FINALIZADO
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-on-surface-variant">
                    {activeEvent.sales.length} venta(s) •{' '}
                    {formatMoney(
                      activeEvent.sales.reduce((sum, s) => sum + s.finalTotal, 0)
                    )}
                  </p>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
                  <button
                    type="button"
                    onClick={() => setEventSubTab('pos')}
                    aria-label="Volver a Caja"
                    className="flex h-10 w-10 sm:h-11 sm:w-11 aspect-square shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface hover:bg-surface-container-highest active:scale-90 transition-[transform,background-color] duration-150 border border-outline-variant/30 shadow-2xs"
                    title="Volver a Caja"
                  >
                    <Icon name="arrow_back" size={22} />
                  </button>
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
                      {eventSubTab === 'results' ? 'Resultados' : 'Configurar'}
                    </h1>
                    <p className="mt-1 truncate text-sm text-on-surface-variant">
                      {activeEvent.name}
                    </p>
                  </div>
                </div>
              )}

              {/* Lado derecho (esquina opuesta): Menú 3 puntos */}
              <div className="flex shrink-0 items-center gap-2">
                <div className="relative" data-m3-menu>
                  <button
                    type="button"
                    onClick={() => setEventMenuOpen((prev) => !prev)}
                    aria-label="Más opciones de la feria"
                    aria-haspopup="true"
                    aria-expanded={eventMenuOpen}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-[transform,background-color,color] duration-150 active:scale-90 ${
                      eventMenuOpen
                        ? 'bg-surface-container-highest text-on-surface'
                        : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
                    }`}
                    title="Más opciones"
                  >
                    <Icon name="more_vert" size={22} />
                  </button>

                  {eventMenuOpen && (
                    <div
                      role="menu"
                      aria-orientation="vertical"
                      className="absolute right-0 top-full mt-2 z-40 min-w-[210px] rounded-[20px] bg-surface-container-lowest p-2 shadow-2xl border border-outline-variant/30 m3-menu-pop focus:outline-none"
                    >
                      {eventSubTab !== 'pos' && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setEventSubTab('pos');
                            setEventMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-sm font-semibold text-primary hover:bg-primary-container/20 active:bg-primary-container/40 transition-colors"
                        >
                          <Icon name="point_of_sale" size={20} className="text-primary" />
                          <span>Ir a Caja</span>
                        </button>
                      )}

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setEventSubTab('results');
                          setEventMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                          eventSubTab === 'results'
                            ? 'bg-primary/10 text-primary'
                            : 'text-on-surface hover:bg-surface-container active:bg-surface-container-high'
                        }`}
                      >
                        <Icon
                          name="bar_chart"
                          size={20}
                          className={eventSubTab === 'results' ? 'text-primary' : 'text-on-surface-variant'}
                        />
                        <span>Resultados</span>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setEventSubTab('setup');
                          setEventMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                          eventSubTab === 'setup'
                            ? 'bg-primary/10 text-primary'
                            : 'text-on-surface hover:bg-surface-container active:bg-surface-container-high'
                        }`}
                      >
                        <Icon
                          name="settings"
                          size={20}
                          className={eventSubTab === 'setup' ? 'text-primary' : 'text-on-surface-variant'}
                        />
                        <span>Configurar</span>
                      </button>

                      <div className="my-1.5 h-px bg-outline-variant/30" role="separator" />

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setEventMenuOpen(false);
                          handleDuplicate(activeEvent.id);
                        }}
                        className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-sm font-semibold text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors"
                      >
                        <Icon name="content_copy" size={20} className="text-on-surface-variant" />
                        <span>Duplicar feria</span>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setEventMenuOpen(false);
                          handleToggleStatus(activeEvent.id);
                        }}
                        className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-sm font-semibold text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors"
                      >
                        <Icon
                          name={activeEvent.status === 'active' ? 'check_circle' : 'play_circle'}
                          size={20}
                          className="text-on-surface-variant"
                        />
                        <span>{activeEvent.status === 'active' ? 'Finalizar feria' : 'Reabrir feria'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {eventSubTab === 'pos' && (
            <PosScreen
              event={activeEvent}
              cart={cartsByEvent[activeEvent.id]?.cart ?? []}
              customTotal={cartsByEvent[activeEvent.id]?.customTotal ?? null}
              onCartChange={(updater) => handleCartChange(activeEvent.id, updater)}
              onCustomTotalChange={(total) => handleCustomTotalChange(activeEvent.id, total)}
              onClearCart={() => handleClearCart(activeEvent.id)}
              onUpdateEvent={handleUpdateEvent}
              onOpenSetup={() => setEventSubTab('setup')}
            />
          )}
          {eventSubTab === 'results' && <ResultsScreen event={activeEvent} />}
          {eventSubTab === 'setup' && (
            <SetupScreen
              event={activeEvent}
              onUpdateEvent={handleUpdateEvent}
              onFinish={() => setEventSubTab('pos')}
            />
          )}
        </div>
      )}

      {mainTab === 'evento' && !activeEvent && (
        <main key="evento-empty" className="m3-page-transition mx-auto max-w-xl px-4 py-12 pb-28 sm:px-6 lg:pb-28">
          <div className="rounded-[28px] bg-surface-container-low p-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary-container text-on-primary-container">
              <Icon name="shopping_bag" size={28} filled />
            </div>
            <h2 className="text-lg font-bold text-on-surface">
              Todavía no hay una feria activa
            </h2>
            <p className="mt-1.5 text-sm text-on-surface-variant">
              Crea tu primera feria para empezar a cargar artículos y registrar ventas en el stand.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleCreateNew}
                className="m3-btn-md w-full sm:w-auto bg-primary text-sm font-bold text-on-primary"
              >
                <Icon name="add" size={20} />
                Crear Primera Feria
              </button>
            </div>
          </div>
        </main>
      )}

      {mainTab === 'ajustes' && (
        <div key="ajustes" className="m3-page-transition">
          <AppSettingsScreen
            events={events}
            onImportEvents={handleImportEvents}
            onClearAllData={handleClearAllData}
          />
        </div>
      )}

      {/* Expandable Bottom Navigation Bar (Mobile / Tablet < lg) */}
      <NavigationBar currentTab={mainTab} onSelectTab={setMainTab} />
    </div>
  );
}

export default App;

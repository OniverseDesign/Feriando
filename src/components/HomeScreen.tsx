import React from 'react';
import { createPortal } from 'react-dom';
import type { FeriaEvent } from '../types';
import { formatMoney } from '../utils/calculations';
import { Icon } from './Icon';
import { SmoothCollapse } from './SmoothCollapse';

interface HomeScreenProps {
  events: FeriaEvent[];
  activeEventId: string | null;
  onSelectEvent?: (eventId: string) => void;
  onCreateNew: () => void;
  onOpenPos: (eventId: string) => void;
  onOpenSetup: (eventId: string) => void;
  onOpenResults: (eventId: string) => void;
  onDuplicate: (eventId: string) => void;
  onToggleStatus: (eventId: string) => void;
  onDelete: (eventId: string) => void;
}

const EVENT_CARD_THEMES = [
  // 0: Royal Violet / Electric Indigo (Inspirado en Stage 1)
  {
    cardBg: 'bg-[#5D50EE] hover:bg-[#5346E2]',
    textColor: 'text-white',
    subtextColor: 'text-white/80',
    badgeActual: 'bg-white text-[#5D50EE]',
    badgeFinalizado: 'bg-black/30 text-white/90',
    badgeDefault: 'bg-black/25 text-white/90',
    threeDotsBtn: 'bg-black/25 text-white hover:bg-black/40',
    statBox: 'bg-black/15',
    statLabel: 'text-white/75',
    statValue: 'text-white',
    statSales: 'text-white/70',
    btnPrimary: 'bg-white text-[#4338CA] hover:bg-white/95 shadow-md',
    btnSecondary: 'bg-white/20 text-white hover:bg-white/30',
  },
  // 1: Coral Red / Crimson (Inspirado en Stage 2)
  {
    cardBg: 'bg-[#E5484D] hover:bg-[#DB3B41]',
    textColor: 'text-white',
    subtextColor: 'text-white/80',
    badgeActual: 'bg-white text-[#E5484D]',
    badgeFinalizado: 'bg-black/30 text-white/90',
    badgeDefault: 'bg-white text-[#E5484D]',
    threeDotsBtn: 'bg-white text-[#E5484D] hover:bg-white/90',
    statBox: 'bg-black/15',
    statLabel: 'text-white/75',
    statValue: 'text-white',
    statSales: 'text-white/70',
    btnPrimary: 'bg-white text-[#C52A26] hover:bg-white/95 shadow-md',
    btnSecondary: 'bg-white/20 text-white hover:bg-white/30',
  },
  // 2: Warm Sunny Amber (Inspirado en Stage 3)
  {
    isLight: true,
    cardBg: 'bg-[#F5B843] hover:bg-[#EEAE34]',
    textColor: 'text-[#1C1917]',
    subtextColor: 'text-[#1C1917]/75',
    badgeActual: 'bg-[#1C1917] text-white',
    badgeFinalizado: 'bg-black/20 text-[#1C1917]',
    badgeDefault: 'bg-black/85 text-white',
    threeDotsBtn: 'bg-black/85 text-white hover:bg-black/75',
    statBox: 'bg-black/10 border border-black/10',
    statLabel: 'text-[#1C1917]/70',
    statValue: 'text-[#1C1917]',
    statSales: 'text-[#1C1917]/65',
    btnPrimary: 'bg-[#1C1917] text-white hover:bg-[#1C1917]/90 shadow-md',
    btnSecondary: 'bg-black/10 text-[#1C1917] hover:bg-black/15 border border-black/10',
  },
  // 3: Emerald Jade
  {
    cardBg: 'bg-[#0D9488] hover:bg-[#0B7D73]',
    textColor: 'text-white',
    subtextColor: 'text-white/80',
    badgeActual: 'bg-white text-[#0D9488]',
    badgeFinalizado: 'bg-black/30 text-white/90',
    badgeDefault: 'bg-black/25 text-white/90',
    threeDotsBtn: 'bg-black/25 text-white hover:bg-black/40',
    statBox: 'bg-black/15',
    statLabel: 'text-white/75',
    statValue: 'text-white',
    statSales: 'text-white/70',
    btnPrimary: 'bg-white text-[#0F766E] hover:bg-white/95 shadow-md',
    btnSecondary: 'bg-white/20 text-white hover:bg-white/30',
  },
  // 4: Sapphire Blue
  {
    cardBg: 'bg-[#2563EB] hover:bg-[#1D4ED8]',
    textColor: 'text-white',
    subtextColor: 'text-white/80',
    badgeActual: 'bg-white text-[#2563EB]',
    badgeFinalizado: 'bg-black/30 text-white/90',
    badgeDefault: 'bg-black/25 text-white/90',
    threeDotsBtn: 'bg-black/25 text-white hover:bg-black/40',
    statBox: 'bg-black/15',
    statLabel: 'text-white/75',
    statValue: 'text-white',
    statSales: 'text-white/70',
    btnPrimary: 'bg-white text-[#1D4ED8] hover:bg-white/95 shadow-md',
    btnSecondary: 'bg-white/20 text-white hover:bg-white/30',
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  events,
  activeEventId,
  onSelectEvent,
  onCreateNew,
  onOpenPos,
  onOpenSetup,
  onOpenResults,
  onDuplicate,
  onToggleStatus,
  onDelete,
}) => {
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!openMenuId) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-m3-menu]')) {
        setOpenMenuId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
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
  }, [openMenuId]);

  const renderMenuItems = (evt: FeriaEvent, isActive: boolean) => (
    <div
      role="menu"
      aria-orientation="vertical"
      className="absolute right-0 top-full mt-2 z-30 min-w-[210px] rounded-[20px] bg-surface-container-lowest p-2 shadow-2xl border border-outline-variant/30 m3-menu-pop focus:outline-none"
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setOpenMenuId(null);
          onOpenPos(evt.id);
        }}
        className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-sm font-semibold text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors"
      >
        <Icon name="point_of_sale" size={20} className="text-on-surface-variant" />
        <span>Ir a Vender</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setOpenMenuId(null);
          onOpenResults(evt.id);
        }}
        className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-sm font-semibold text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors"
      >
        <Icon name="bar_chart" size={20} className="text-on-surface-variant" />
        <span>Resultados</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setOpenMenuId(null);
          onOpenSetup(evt.id);
        }}
        className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-sm font-semibold text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors"
      >
        <Icon name="settings" size={20} className="text-on-surface-variant" />
        <span>Configurar</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setOpenMenuId(null);
          onDuplicate(evt.id);
        }}
        className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-sm font-semibold text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors"
      >
        <Icon name="content_copy" size={20} className="text-on-surface-variant" />
        <span>Duplicar</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setOpenMenuId(null);
          onToggleStatus(evt.id);
        }}
        className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-sm font-semibold text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors"
      >
        <Icon
          name={isActive ? 'check_circle' : 'play_circle'}
          size={20}
          className="text-on-surface-variant"
        />
        <span>{isActive ? 'Cerrar feria' : 'Reabrir feria'}</span>
      </button>

      <div className="my-1.5 h-px bg-outline-variant/30" role="separator" />

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setOpenMenuId(null);
          if (
            window.confirm(
              `¿Eliminar "${evt.name}"? Esta acción no se puede deshacer.`
            )
          ) {
            onDelete(evt.id);
          }
        }}
        className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-sm font-semibold text-error hover:bg-error-container/30 active:bg-error-container/50 transition-colors"
      >
        <Icon name="delete" size={20} className="text-error" />
        <span>Eliminar feria</span>
      </button>
    </div>
  );

  const sortedEvents = [...events].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
    return b.date.localeCompare(a.date);
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:pb-12">
      {/* Section Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
            Ferias
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Administra tus ferias, cajas de cobro y liquidaciones
          </p>
        </div>
      </div>

      {/* Hero Action Area */}
      <div className="mb-0 sm:mb-7 flex flex-col gap-3.5 sm:flex-row">
        <button
          type="button"
          onClick={onCreateNew}
          className="hidden sm:inline-flex m3-btn-md sm:flex-1 bg-primary text-base font-bold tracking-[0.01rem] text-on-primary shadow-sm hover:opacity-95"
        >
          <Icon name="add" size={24} />
          Crear Nueva Feria
        </button>
      </div>

      {/* Floating Action Button (FAB) on Mobile (<sm) */}
      {createPortal(
        <button
          type="button"
          onClick={onCreateNew}
          aria-label="Crear Nueva Feria"
          className="fixed bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.25rem)] right-4 z-40 inline-flex h-14 items-center gap-2 rounded-[20px] bg-primary px-5 text-sm font-bold tracking-wide text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-[transform,box-shadow] duration-200 will-change-transform sm:hidden"
        >
          <Icon name="add" size={24} />
          <span>Nueva Feria</span>
        </button>,
        document.body
      )}

      {sortedEvents.length === 0 ? (
        <div className="rounded-[28px] border border-outline-variant bg-surface-container-low p-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[20px] bg-surface-container-highest text-on-surface-variant">
            <Icon name="shopping_bag" size={32} />
          </div>
          <p className="text-base font-bold text-on-surface">Todavía no hay ferias</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Crea tu primera feria para comenzar a gestionar tus ventas y productos.
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-5 inline-flex m3-btn-md bg-primary text-sm font-bold text-on-primary shadow-sm hover:opacity-95"
          >
            <Icon name="add" size={20} />
            Crear Primera Feria
          </button>
        </div>
      ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 sm:gap-6 items-start">
            {sortedEvents.map((evt, index) => {
              const totalRaised = evt.sales.reduce((sum, s) => sum + s.finalTotal, 0);
              const isActive = evt.status === 'active';
              const isSelected = evt.id === activeEventId;
              const theme = EVENT_CARD_THEMES[index % EVENT_CARD_THEMES.length];

              return (
                <div
                  key={evt.id}
                  onClick={() => {
                    if (!isSelected) {
                      onSelectEvent?.(evt.id);
                    }
                  }}
                  role={!isSelected ? 'button' : undefined}
                  tabIndex={!isSelected ? 0 : undefined}
                  onKeyDown={
                    !isSelected
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectEvent?.(evt.id);
                          }
                        }
                      : undefined
                  }
                  className={`group relative flex flex-col justify-between transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.38,1.21,0.22,1.00)] ${
                    isSelected
                      ? 'rounded-[32px] p-6 shadow-md hover:shadow-xl'
                      : 'rounded-[24px] p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 cursor-pointer select-none'
                  } ${theme.cardBg}`}
                >
                  <div>
                    {/* Cabecera: Badges y Menú de opciones */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {isSelected ? (
                          <span
                            className={`m3-pop inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black tracking-wider uppercase shadow-xs ${theme.badgeActual}`}
                          >
                            <Icon name="check_circle" size={14} filled />
                            ACTUAL
                          </span>
                        ) : !isActive ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${theme.badgeFinalizado}`}
                          >
                            FINALIZADO
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${theme.badgeDefault}`}
                          >
                            <Icon name="calendar_today" size={11} />
                            {evt.date}
                          </span>
                        )}

                        {isSelected && !isActive && (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase ${theme.badgeFinalizado}`}
                          >
                            FINALIZADO
                          </span>
                        )}
                      </div>

                      {/* Menú de 3 puntos */}
                      <div
                        className="relative"
                        data-m3-menu
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === evt.id ? null : evt.id);
                          }}
                          aria-label="Más opciones"
                          aria-haspopup="true"
                          aria-expanded={openMenuId === evt.id}
                          className={`flex items-center justify-center rounded-full transition-transform active:scale-90 ${
                            isSelected ? 'h-9 w-9' : 'h-8 w-8'
                          } ${theme.threeDotsBtn}`}
                          title="Más opciones"
                        >
                          <Icon name="more_vert" size={isSelected ? 20 : 18} />
                        </button>

                        {openMenuId === evt.id && renderMenuItems(evt, isActive)}
                      </div>
                    </div>

                    {/* Nombre del Evento */}
                    <div className={isSelected ? 'mt-4' : 'mt-3'}>
                      <h3
                        className={`font-black leading-snug tracking-tight transition-all duration-300 ${
                          isSelected ? 'text-2xl' : 'text-lg truncate'
                        } ${theme.textColor}`}
                      >
                        {evt.name}
                      </h3>

                      {/* Subtítulo cuando NO está seleccionado */}
                      <SmoothCollapse isOpen={!isSelected}>
                        <p className={`mt-1 text-xs font-semibold ${theme.subtextColor}`}>
                          <span className="font-bold">{formatMoney(totalRaised)}</span>{' '}
                          <span className="opacity-90">
                            ({evt.sales.length} venta{evt.sales.length === 1 ? '' : 's'})
                          </span>{' '}
                          • {evt.participants.length} part. • {evt.products.length} art.
                        </p>
                      </SmoothCollapse>

                      {/* Subtítulo metadata cuando SÍ está seleccionado */}
                      <SmoothCollapse isOpen={isSelected}>
                        <p className={`mt-1.5 text-xs font-semibold ${theme.subtextColor}`}>
                          {evt.date} • {evt.participants.length} participante(s) •{' '}
                          {evt.products.length} artículo(s)
                        </p>
                      </SmoothCollapse>
                    </div>

                    {/* Caja de Estadísticas destacada (solo en modo expandido) */}
                    <SmoothCollapse isOpen={isSelected}>
                      <div className={`mt-5 rounded-[20px] p-4 ${theme.statBox}`}>
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider ${theme.statLabel}`}
                        >
                          Total recaudado
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span
                            className={`text-2xl sm:text-3xl font-black tracking-tight ${theme.statValue}`}
                          >
                            {formatMoney(totalRaised)}
                          </span>
                          <span className={`text-xs font-semibold ${theme.statSales}`}>
                            ({evt.sales.length} ventas)
                          </span>
                        </div>
                      </div>
                    </SmoothCollapse>
                  </div>

                  {/* Acciones para cuando SÍ está seleccionado */}
                  <SmoothCollapse isOpen={isSelected}>
                    <div className="mt-6">
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenResults(evt.id);
                          }}
                          className={`m3-btn-sm text-sm font-bold ${theme.btnSecondary}`}
                        >
                          <Icon name="bar_chart" size={18} />
                          Resultados
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPos(evt.id);
                          }}
                          className={`m3-btn-sm text-sm font-bold ${theme.btnPrimary}`}
                        >
                          <Icon name="point_of_sale" size={18} />
                          Ir a Vender
                        </button>
                      </div>
                    </div>
                  </SmoothCollapse>

                  {/* Barra inferior compacta cuando NO está seleccionado */}
                  <SmoothCollapse isOpen={!isSelected}>
                    <div
                      className={`mt-4 flex items-center justify-between pt-2.5 border-t ${
                        theme.isLight ? 'border-black/10' : 'border-white/15'
                      }`}
                    >
                      <span
                        className={`text-[11px] font-bold flex items-center gap-1.5 ${theme.subtextColor} group-hover:opacity-100 opacity-80 transition-opacity`}
                      >
                        <Icon name="touch_app" size={14} />
                        Toca para seleccionar
                      </span>
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${theme.threeDotsBtn} transition-transform duration-200 group-hover:translate-x-1`}
                      >
                        <Icon
                          name="arrow_forward"
                          size={15}
                          className="flex items-center justify-center leading-none"
                        />
                      </div>
                    </div>
                  </SmoothCollapse>
                </div>
              );
            })}
          </div>
        )}
      </main>
  );
};

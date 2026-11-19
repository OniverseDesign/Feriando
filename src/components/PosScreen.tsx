import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CartEntry, FeriaEvent, PaymentMethod, Sale } from '../types';
import { calculateCartTotals, formatMoney } from '../utils/calculations';
import { getContrastTextColor } from '../utils/m3Palette';
import { getPreferences, triggerHaptic } from '../utils/preferences';
import { createId } from '../utils/storage';
import { Icon } from './Icon';
import { SmoothCollapse } from './SmoothCollapse';

interface PosScreenProps {
  event: FeriaEvent;
  onUpdateEvent: (updated: FeriaEvent) => void;
  onOpenSetup: () => void;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  event,
  onUpdateEvent,
  onOpenSetup,
}) => {
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string>('all');
  const [customTotal, setCustomTotal] = useState<number | null>(null);
  const [showRegateo, setShowRegateo] = useState(false);
  const [regateoInput, setRegateoInput] = useState('');
  const [showTransferPicker, setShowTransferPicker] = useState(false);
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [isCartClosing, setIsCartClosing] = useState(false);
  const [isSalesExpanded, setIsSalesExpanded] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const closeCartSheet = () => {
    setIsCartClosing(true);
    setTimeout(() => {
      setIsCartExpanded(false);
      setIsCartClosing(false);
    }, 300);
  };

  const ownerMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    event.participants.forEach((p) => map.set(p.id, { name: p.name, color: p.color }));
    event.sharedEntities.forEach((s) => map.set(s.id, { name: s.name, color: s.color }));
    return map;
  }, [event.participants, event.sharedEntities]);

  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach((c) => map.set(c.productId, c.quantity));
    return map;
  }, [cart]);

  const calc = useMemo(
    () => calculateCartTotals(cart, event.products, event.promoFamilies, customTotal),
    [cart, event.products, event.promoFamilies, customTotal]
  );

  const filteredProducts = useMemo(() => {
    if (selectedFamily === 'all') return event.products;
    if (selectedFamily === 'none') return event.products.filter((p) => !p.familyId);
    return event.products.filter((p) => p.familyId === selectedFamily);
  }, [event.products, selectedFamily]);

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === productId);
      if (existing) {
        return prev.map((c) =>
          c.productId === productId ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
    triggerHaptic(15);
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.productId === productId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    setCustomTotal(null);
    setShowRegateo(false);
    setShowTransferPicker(false);
    if (isCartExpanded) {
      closeCartSheet();
    } else {
      setIsCartExpanded(false);
      setIsCartClosing(false);
    }
  };

  const completeSale = (method: PaymentMethod, receivedBy: string | null) => {
    if (calc.saleItems.length === 0) return;

    const newSale: Sale = {
      id: createId('sale'),
      timestamp: new Date().toISOString(),
      items: calc.saleItems,
      finalTotal: calc.finalTotal,
      paymentMethod: method,
      receivedBy,
    };

    const soldCounts = new Map<string, number>();
    for (const item of calc.saleItems) {
      soldCounts.set(item.productId, (soldCounts.get(item.productId) ?? 0) + 1);
    }

    const updatedProducts = event.products.map((p) => {
      if (p.stock === null) return p;
      const qty = soldCounts.get(p.id) ?? 0;
      return qty > 0 ? { ...p, stock: p.stock - qty } : p;
    });

    onUpdateEvent({
      ...event,
      products: updatedProducts,
      sales: [...event.sales, newSale],
    });

    clearCart();
    triggerHaptic(30);
    setFlashMessage(`Venta registrada: ${formatMoney(newSale.finalTotal)}`);
    setTimeout(() => setFlashMessage(null), 2000);
  };

  const handleTransferClick = () => {
    if (cart.length === 0) return;
    if (event.transferMode === 'single_account') {
      const targetId = event.singleTransferOwnerId ?? event.participants[0]?.id ?? null;
      completeSale('transfer', targetId);
      return;
    }
    if (event.participants.length <= 1) {
      completeSale('transfer', event.participants[0]?.id ?? null);
      return;
    }
    setShowTransferPicker((prev) => !prev);
    setIsCartExpanded(true);
  };

  const undoSale = (saleId: string) => {
    const target = event.sales.find((s) => s.id === saleId);
    if (!target) return;

    if (getPreferences().confirmDelete) {
      const ok = window.confirm(`¿Seguro que quieres anular esta venta por ${formatMoney(target.finalTotal)}?`);
      if (!ok) return;
    }

    const restoreCounts = new Map<string, number>();
    for (const item of target.items) {
      restoreCounts.set(item.productId, (restoreCounts.get(item.productId) ?? 0) + 1);
    }

    const updatedProducts = event.products.map((p) => {
      if (p.stock === null) return p;
      const qty = restoreCounts.get(p.id) ?? 0;
      return qty > 0 ? { ...p, stock: p.stock + qty } : p;
    });

    onUpdateEvent({
      ...event,
      products: updatedProducts,
      sales: event.sales.filter((s) => s.id !== saleId),
    });

    setFlashMessage(`Venta anulada (${formatMoney(target.finalTotal)})`);
    setTimeout(() => setFlashMessage(null), 2500);
  };

  const allSales = useMemo(() => [...event.sales].reverse(), [event.sales]);
  const initialSales = allSales.slice(0, 3);
  const extraSales = allSales.slice(3);
  const totalItemsInCart = cart.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className="text-on-surface">
      {/* M3 Filter Chips Strip (solo si hay familias de promo) */}
      {event.promoFamilies.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 pt-1 sm:px-6">
          <div className="flex gap-2 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setSelectedFamily('all')}
              className={`m3-spring-effects-fast inline-flex h-9 shrink-0 items-center justify-center rounded-full px-4 text-xs sm:text-sm font-bold ${
                selectedFamily === 'all'
                  ? 'bg-secondary-container text-on-secondary-container shadow-2xs'
                  : 'border border-outline-variant/40 bg-surface-container text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              Todos
            </button>
            {event.promoFamilies.map((fam) => (
              <button
                key={fam.id}
                type="button"
                onClick={() => setSelectedFamily(fam.id)}
                className={`m3-spring-effects-fast inline-flex h-9 shrink-0 items-center justify-center rounded-full px-4 text-xs sm:text-sm font-bold ${
                  selectedFamily === fam.id
                    ? 'bg-secondary-container text-on-secondary-container shadow-2xs'
                    : 'border border-outline-variant/40 bg-surface-container text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {fam.name}
              </button>
            ))}
            {event.products.some((p) => !p.familyId) && (
              <button
                type="button"
                onClick={() => setSelectedFamily('none')}
                className={`m3-spring-effects-fast inline-flex h-9 shrink-0 items-center justify-center rounded-full px-4 text-xs sm:text-sm font-bold ${
                  selectedFamily === 'none'
                    ? 'bg-secondary-container text-on-secondary-container shadow-2xs'
                    : 'border border-outline-variant/40 bg-surface-container text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                Otros
              </button>
            )}
          </div>
        </div>
      )}

      {/* M3 Snackbar */}
      {flashMessage &&
        createPortal(
          <div
            className={`m3-pop fixed ${
              cart.length > 0 ? 'bottom-36' : 'bottom-24'
            } lg:bottom-6 left-1/2 z-70 -translate-x-1/2 rounded-full bg-on-surface px-5 py-2.5 text-xs font-bold text-surface shadow-lg`}
          >
            {flashMessage}
          </div>,
          document.body
        )}

      {/* Main Split Layout */}
      <main
        className={`mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 pt-2 ${
          cart.length > 0 ? 'pb-44' : 'pb-28'
        } sm:px-6 sm:pt-3 lg:grid-cols-12 lg:gap-6 lg:pb-10`}
      >
        {/* Product Grid */}
        <section className="lg:col-span-7">
          {filteredProducts.length === 0 ? (
            <div className="rounded-[28px] border border-outline-variant bg-surface-container-low p-8 text-center">
              <p className="text-sm font-bold text-on-surface">
                No hay artículos en esta categoría.
              </p>
              <button
                type="button"
                onClick={onOpenSetup}
                className="mt-2 text-xs font-bold text-primary hover:underline"
              >
                Ir a Configuración para agregar artículos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((prod) => {
                const owner = ownerMap.get(prod.ownerId);
                const color = owner?.color ?? '#6750A4';
                const fgColor = getContrastTextColor(color);
                const isLightBg = fgColor === '#1D1B20';
                const inCart = cartQtyMap.get(prod.id) ?? 0;
                const remainingStock = prod.stock !== null ? prod.stock - inCart : null;
                const lowStock = remainingStock !== null && remainingStock <= 0;

                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => addToCart(prod.id)}
                    className="m3-card-morph relative flex min-h-[120px] sm:min-h-[128px] flex-col justify-between p-4 text-left shadow-sm hover:brightness-95 active:scale-95 transition-transform"
                    style={{
                      backgroundColor: color,
                      color: fgColor,
                    }}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="text-base font-bold leading-snug">
                        {prod.name}
                      </span>
                      {inCart > 0 && (
                        <span
                          key={inCart}
                          className="m3-pop flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-white px-1.5 text-xs font-black shadow-xs"
                          style={{ color }}
                        >
                          {inCart}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-1">
                      <div>
                        <div className="text-xl font-extrabold tracking-tight">
                          {formatMoney(prod.basePrice)}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold opacity-90">
                          <span className="max-w-[95px] truncate">{owner?.name ?? '?'}</span>
                        </div>
                      </div>

                      {remainingStock !== null && (
                        <span
                          className={`inline-flex h-6 items-center gap-0.5 rounded-full px-2 text-[10px] font-bold ${
                            lowStock
                              ? 'bg-error-container text-on-error-container ring-2 ring-white/80'
                              : isLightBg
                                ? 'bg-black/15 text-on-surface'
                                : 'bg-black/25 text-white'
                          }`}
                        >
                          {lowStock && <Icon name="warning" size={12} filled />}
                          {remainingStock}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Recent Sales Section (Below product buttons on both Desktop and Mobile) */}
          {event.sales.length > 0 && (
            <div className="mt-6 rounded-[28px] bg-surface-container-low p-5 shadow-xs">
              <div className="mb-2.5 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                    Últimas Ventas
                  </h3>
                  <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                    {event.sales.length}
                  </span>
                </div>
                {event.sales.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setIsSalesExpanded((prev) => !prev)}
                    className="flex h-8 w-8 aspect-square shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface hover:bg-surface-container-highest active:scale-90 transition-[transform,background-color] duration-150 border border-outline-variant/30 shadow-2xs"
                    aria-expanded={isSalesExpanded}
                    aria-label={isSalesExpanded ? 'Contraer ventas' : 'Ver todas las ventas'}
                  >
                    <Icon
                      name="expand_more"
                      size={20}
                      className={`transition-transform duration-200 ${
                        isSalesExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {initialSales.map((sale) => {
                  const timeStr = new Date(sale.timestamp).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const receiver = sale.receivedBy
                    ? ownerMap.get(sale.receivedBy)?.name
                    : null;
                  const saleIndex = event.sales.findIndex((s) => s.id === sale.id);
                  const saleNum = saleIndex !== -1 ? saleIndex + 1 : 1;
                  return (
                    <div
                      key={sale.id}
                      className="flex min-h-[48px] items-center justify-between rounded-[14px] bg-surface-container-lowest px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <span className="font-bold opacity-70">#{saleNum}</span>
                        <span>{timeStr}</span>
                        <span className="font-bold text-on-surface">
                          {formatMoney(sale.finalTotal)}
                        </span>
                        <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                          {sale.paymentMethod === 'cash'
                            ? 'Efectivo'
                            : `Transf${receiver ? ` (${receiver})` : ''}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => undoSale(sale.id)}
                        className="m3-icon-btn-xs text-error hover:bg-error-container hover:text-on-error-container"
                        title="Anular venta y restaurar stock"
                      >
                        <Icon name="undo" size={16} />
                      </button>
                    </div>
                  );
                })}

                {extraSales.length > 0 && (
                  <SmoothCollapse isOpen={isSalesExpanded} className="space-y-1.5 pt-0.5">
                    {extraSales.map((sale) => {
                      const timeStr = new Date(sale.timestamp).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const receiver = sale.receivedBy
                        ? ownerMap.get(sale.receivedBy)?.name
                        : null;
                      const saleIndex = event.sales.findIndex((s) => s.id === sale.id);
                      const saleNum = saleIndex !== -1 ? saleIndex + 1 : 1;
                      return (
                        <div
                          key={sale.id}
                          className="flex min-h-[48px] items-center justify-between rounded-[14px] bg-surface-container-lowest px-3.5 py-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2 text-on-surface-variant">
                            <span className="font-bold opacity-70">#{saleNum}</span>
                            <span>{timeStr}</span>
                            <span className="font-bold text-on-surface">
                              {formatMoney(sale.finalTotal)}
                            </span>
                            <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                              {sale.paymentMethod === 'cash'
                                ? 'Efectivo'
                                : `Transf${receiver ? ` (${receiver})` : ''}`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => undoSale(sale.id)}
                            className="m3-icon-btn-xs text-error hover:bg-error-container hover:text-on-error-container"
                            title="Anular venta y restaurar stock"
                          >
                            <Icon name="undo" size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </SmoothCollapse>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Cart & Recent Sales Panel (Desktop) */}
        <aside className="hidden lg:block space-y-4 lg:col-span-5">
          <div className="rounded-[28px] bg-surface-container-low p-5 shadow-xs lg:sticky lg:top-28">
            <div className="mb-3.5 flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                Carrito ({totalItemsInCart} {totalItemsInCart === 1 ? 'ítem' : 'ítems'})
              </h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="m3-btn-xs text-xs font-bold text-error hover:bg-error-container hover:text-on-error-container"
                >
                  <Icon name="delete_sweep" size={16} />
                  Vaciar
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="rounded-[16px] bg-surface-container-lowest py-9 text-center text-sm font-medium text-on-surface-variant">
                Toca los artículos para agregarlos a la venta.
              </div>
            ) : (
              <>
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                  {cart.map((entry) => {
                    const prod = event.products.find((p) => p.id === entry.productId);
                    if (!prod) return null;
                    const owner = ownerMap.get(prod.ownerId);
                    return (
                      <div
                        key={entry.productId}
                        className="flex items-center justify-between gap-2 rounded-[16px] bg-surface-container-lowest px-3.5 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-on-surface">
                            {prod.name}{' '}
                            <span className="text-xs font-medium text-on-surface-variant">
                              ({owner?.name})
                            </span>
                          </div>
                          <div className="text-xs text-on-surface-variant">
                            Base: {formatMoney(prod.basePrice)} c/u
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCartQty(entry.productId, -1)}
                            className="m3-icon-btn-sm bg-surface-container-high text-on-surface hover:bg-secondary-container"
                          >
                            <Icon name="remove" size={18} />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-on-surface">
                            {entry.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(entry.productId, 1)}
                            className="m3-icon-btn-sm bg-surface-container-high text-on-surface hover:bg-secondary-container"
                          >
                            <Icon name="add" size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Promo Badges */}
                {calc.promoFamiliesApplied.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {calc.promoFamiliesApplied.map((pf) => (
                      <div
                        key={pf.familyId}
                        className="flex items-center justify-between rounded-[12px] bg-success-container px-3 py-2 text-xs font-bold text-on-success-container"
                      >
                        <span>
                          Promo {pf.familyName} ({pf.count} u.)
                        </span>
                        <span>-{formatMoney(pf.saved)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total (Headline Large Emphasized) & Regateo */}
                <div className="mt-3 border-t border-outline-variant/60 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-[0.05rem] text-on-surface-variant">
                        TOTAL A COBRAR
                      </span>
                      {customTotal !== null && (
                        <span className="ml-2 rounded-full bg-tertiary-container px-2 py-0.5 text-[10px] font-bold text-on-tertiary-container">
                          Regateo
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRegateoInput(String(calc.finalTotal));
                        setShowRegateo((prev) => !prev);
                      }}
                      className="m3-btn-xs text-xs font-bold text-primary hover:bg-primary-container/50"
                    >
                      <Icon name="edit" size={14} />
                      Regateo
                    </button>
                  </div>

                  <div className="mt-0.5 flex items-baseline gap-2.5">
                    <span className="text-[32px] leading-[40px] font-medium tracking-normal text-on-surface">
                      {formatMoney(calc.finalTotal)}
                    </span>
                    {calc.baseSubtotal > calc.finalTotal && (
                      <span className="text-sm text-on-surface-variant line-through">
                        {formatMoney(calc.baseSubtotal)}
                      </span>
                    )}
                  </div>

                  <SmoothCollapse isOpen={showRegateo}>
                    <div className="mt-2.5 flex items-center gap-2 rounded-[16px] bg-tertiary-container/60 p-3">
                      <span className="text-sm font-bold text-on-tertiary-container">$</span>
                      <input
                        type="number"
                        min={0}
                        value={regateoInput}
                        onChange={(e) => setRegateoInput(e.target.value)}
                        className="m3-input h-10 min-h-10 flex-1 font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const parsed = parseInt(regateoInput, 10);
                          if (!isNaN(parsed) && parsed >= 0) {
                            setCustomTotal(parsed);
                          }
                          setShowRegateo(false);
                        }}
                        className="m3-btn-xs bg-tertiary text-xs font-bold text-on-tertiary"
                      >
                        Aplicar
                      </button>
                      {customTotal !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomTotal(null);
                            setShowRegateo(false);
                          }}
                          className="m3-btn-xs text-xs font-bold text-on-tertiary-container hover:bg-tertiary-container"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </SmoothCollapse>
                </div>

                {/* Payment Buttons (M3 Expressive Medium 56px Pill -> Morph on press) */}
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => completeSale('cash', null)}
                    className="m3-btn-md bg-success text-base font-bold text-on-success shadow-xs hover:opacity-95"
                  >
                    <Icon name="payments" size={22} filled />
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={handleTransferClick}
                    className="m3-btn-md bg-primary text-base font-bold text-on-primary shadow-xs hover:opacity-95"
                  >
                    <Icon name="smartphone" size={22} filled />
                    Transf.
                  </button>
                </div>

                {/* Mini-selector for individual transfer mode */}
                <SmoothCollapse isOpen={showTransferPicker}>
                  <div className="mt-3 rounded-[16px] bg-primary-container p-3">
                    <div className="mb-2 text-xs font-bold text-on-primary-container">
                      ¿A qué cuenta entró la transferencia?
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {event.participants.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => completeSale('transfer', p.id)}
                          className="m3-btn-sm flex-1 text-sm font-bold shadow-xs"
                          style={{
                            backgroundColor: p.color,
                            color: getContrastTextColor(p.color),
                          }}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </SmoothCollapse>
              </>
            )}
          </div>
        </aside>
      </main>

      {/* Mobile Floating Cart Summary & Bottom Sheet (Only when cart has items) */}
      {cart.length > 0 &&
        createPortal(
          <>
            {/* Floating Docked Bar (Collapsed) */}
            {!isCartExpanded && !isCartClosing && (
              <div className="fixed bottom-[calc(4.5rem+max(0.75rem,env(safe-area-inset-bottom)))] left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 will-change-transform lg:hidden">
                <div className="flex items-center justify-between gap-2 rounded-full bg-surface-container-high p-2 pr-2.5 shadow-xl ring-1 ring-outline-variant/40">
                  {/* Tap to expand chevron & total */}
                  <button
                    type="button"
                    onClick={() => setIsCartExpanded(true)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 pl-1.5 text-left active:opacity-80"
                    aria-label="Abrir detalle del carrito"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon name="expand_less" size={24} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                          Total ({totalItemsInCart})
                        </span>
                        {customTotal !== null && (
                          <span className="rounded-full bg-tertiary-container px-1.5 py-0.2 text-[9px] font-bold text-on-tertiary-container">
                            Regateo
                          </span>
                        )}
                      </div>
                      <div className="truncate text-lg font-black tracking-tight text-on-surface">
                        {formatMoney(calc.finalTotal)}
                      </div>
                    </div>
                  </button>

                  {/* Direct Pay Action Buttons */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => completeSale('cash', null)}
                      className="inline-flex h-11 items-center gap-1 rounded-full bg-success px-3.5 text-xs font-bold text-on-success shadow-xs active:scale-95"
                    >
                      <Icon name="payments" size={18} filled />
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTransferClick}
                      className="inline-flex h-11 items-center gap-1 rounded-full bg-primary px-3.5 text-xs font-bold text-on-primary shadow-xs active:scale-95"
                    >
                      <Icon name="smartphone" size={18} filled />
                      <span>Transf.</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Expanded Bottom Sheet Modal */}
            {(isCartExpanded || isCartClosing) && (
              <div
                className={`fixed inset-0 z-60 flex flex-col justify-end bg-black/65 lg:hidden ${
                  isCartClosing ? 'm3-backdrop-exit' : 'm3-backdrop-enter'
                }`}
              >
                {/* Backdrop */}
                <div
                  className="flex-1"
                  onClick={closeCartSheet}
                />

                <div
                  className={`max-h-[85vh] w-full overflow-hidden rounded-t-[32px] bg-surface-container-low shadow-2xl ring-1 ring-outline-variant/30 flex flex-col ${
                    isCartClosing ? 'm3-sheet-exit' : 'm3-sheet-enter'
                  }`}
                >
                  {/* Header with 1x1 chevron close button */}
                  <div className="flex items-center justify-between border-b border-outline-variant/40 px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={closeCartSheet}
                        className="flex h-10 w-10 aspect-square shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest active:scale-90 transition-[transform,background-color] duration-150 border border-outline-variant/40 shadow-2xs"
                        aria-label="Cerrar detalle del carrito"
                      >
                        <Icon name="expand_more" size={24} />
                      </button>
                      <div>
                        <h2 className="text-base font-bold text-on-surface">
                          Carrito de compras
                        </h2>
                        <p className="text-xs text-on-surface-variant">
                          {totalItemsInCart} {totalItemsInCart === 1 ? 'ítem' : 'ítems'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={clearCart}
                      className="m3-btn-xs text-xs font-bold text-error hover:bg-error-container hover:text-on-error-container"
                    >
                      <Icon name="delete_sweep" size={16} />
                      Vaciar
                    </button>
                  </div>

                  {/* Scrollable Cart items */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[45vh]">
                    {cart.map((entry) => {
                      const prod = event.products.find((p) => p.id === entry.productId);
                      if (!prod) return null;
                      const owner = ownerMap.get(prod.ownerId);
                      return (
                        <div
                          key={entry.productId}
                          className="flex items-center justify-between gap-2 rounded-[16px] bg-surface-container-lowest px-3.5 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-on-surface">
                              {prod.name}{' '}
                              <span className="text-xs font-medium text-on-surface-variant">
                                ({owner?.name})
                              </span>
                            </div>
                            <div className="text-xs text-on-surface-variant">
                              Base: {formatMoney(prod.basePrice)} c/u
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateCartQty(entry.productId, -1)}
                              className="m3-icon-btn-sm bg-surface-container-high text-on-surface hover:bg-secondary-container"
                            >
                              <Icon name="remove" size={18} />
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-on-surface">
                              {entry.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(entry.productId, 1)}
                              className="m3-icon-btn-sm bg-surface-container-high text-on-surface hover:bg-secondary-container"
                            >
                              <Icon name="add" size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Promo Badges */}
                    {calc.promoFamiliesApplied.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {calc.promoFamiliesApplied.map((pf) => (
                          <div
                            key={pf.familyId}
                            className="flex items-center justify-between rounded-[12px] bg-success-container px-3 py-2 text-xs font-bold text-on-success-container"
                          >
                            <span>
                              Promo {pf.familyName} ({pf.count} u.)
                            </span>
                            <span>-{formatMoney(pf.saved)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Payment Footer inside sheet */}
                  <div className="border-t border-outline-variant/50 bg-surface-container p-4 pb-6 sm:pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.05rem] text-on-surface-variant">
                          TOTAL A COBRAR
                        </span>
                        {customTotal !== null && (
                          <span className="ml-2 rounded-full bg-tertiary-container px-2 py-0.5 text-[10px] font-bold text-on-tertiary-container">
                            Regateo
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRegateoInput(String(calc.finalTotal));
                          setShowRegateo((prev) => !prev);
                        }}
                        className="m3-btn-xs text-xs font-bold text-primary hover:bg-primary-container/50"
                      >
                        <Icon name="edit" size={14} />
                        Regateo
                      </button>
                    </div>

                    <div className="flex items-baseline gap-2.5 mb-3">
                      <span className="text-[32px] leading-[40px] font-medium tracking-normal text-on-surface">
                        {formatMoney(calc.finalTotal)}
                      </span>
                      {calc.baseSubtotal > calc.finalTotal && (
                        <span className="text-sm text-on-surface-variant line-through">
                          {formatMoney(calc.baseSubtotal)}
                        </span>
                      )}
                    </div>

                    <SmoothCollapse isOpen={showRegateo}>
                      <div className="mb-3 flex items-center gap-2 rounded-[16px] bg-tertiary-container/60 p-3">
                        <span className="text-sm font-bold text-on-tertiary-container">$</span>
                        <input
                          type="number"
                          min={0}
                          value={regateoInput}
                          onChange={(e) => setRegateoInput(e.target.value)}
                          className="m3-input h-10 min-h-10 flex-1 font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const parsed = parseInt(regateoInput, 10);
                            if (!isNaN(parsed) && parsed >= 0) {
                              setCustomTotal(parsed);
                            }
                            setShowRegateo(false);
                          }}
                          className="m3-btn-xs bg-tertiary text-xs font-bold text-on-tertiary"
                        >
                          Aplicar
                        </button>
                        {customTotal !== null && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomTotal(null);
                              setShowRegateo(false);
                            }}
                            className="m3-btn-xs text-xs font-bold text-on-tertiary-container hover:bg-tertiary-container"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </SmoothCollapse>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => completeSale('cash', null)}
                        className="m3-btn-md bg-success text-base font-bold text-on-success shadow-xs hover:opacity-95"
                      >
                        <Icon name="payments" size={22} filled />
                        Efectivo
                      </button>
                      <button
                        type="button"
                        onClick={handleTransferClick}
                        className="m3-btn-md bg-primary text-base font-bold text-on-primary shadow-xs hover:opacity-95"
                      >
                        <Icon name="smartphone" size={22} filled />
                        Transf.
                      </button>
                    </div>

                    <SmoothCollapse isOpen={showTransferPicker}>
                      <div className="mt-3 rounded-[16px] bg-primary-container p-3">
                        <div className="mb-2 text-xs font-bold text-on-primary-container">
                          ¿A qué cuenta entró la transferencia?
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {event.participants.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => completeSale('transfer', p.id)}
                              className="m3-btn-sm flex-1 text-sm font-bold shadow-xs"
                              style={{
                                backgroundColor: p.color,
                                color: getContrastTextColor(p.color),
                              }}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </SmoothCollapse>
                  </div>
                </div>
              </div>
            )}
          </>,
          document.body
        )}
    </div>
  );
};

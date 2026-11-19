import React, { useState } from 'react';
import type {
  Expense,
  FeriaEvent,
  Participant,
  Product,
  PromoFamily,
  SharedEntity,
  Split,
} from '../types';
import { createId } from '../utils/storage';
import { formatMoney } from '../utils/calculations';
import { Icon } from './Icon';
import { M3_EXPRESSIVE_COLORS, getM3ColorName, getContrastTextColor } from '../utils/m3Palette';
import { M3ColorSelector } from './M3ColorSelector';
import { SmoothCollapse } from './SmoothCollapse';

interface SetupScreenProps {
  event: FeriaEvent;
  onUpdateEvent: (updated: FeriaEvent) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
  event,
  onUpdateEvent,
}) => {
  const [openSections, setOpenSections] = useState({
    participants: true,
    products: true,
    expenses: true,
  });

  const toggleSection = (key: 'participants' | 'products' | 'expenses') => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [partName, setPartName] = useState('');
  const [partColor, setPartColor] = useState(
    M3_EXPRESSIVE_COLORS[event.participants.length % M3_EXPRESSIVE_COLORS.length]
  );

  const [showSharedForm, setShowSharedForm] = useState(false);
  const [sharedName, setSharedName] = useState('');
  const [sharedColor, setSharedColor] = useState(
    M3_EXPRESSIVE_COLORS[
      (event.participants.length + event.sharedEntities.length + 2) % M3_EXPRESSIVE_COLORS.length
    ]
  );
  const [sharedSplits, setSharedSplits] = useState<Record<string, number>>({});
  const [editingParticipantColorId, setEditingParticipantColorId] = useState<string | null>(null);
  const [editingSharedColorId, setEditingSharedColorId] = useState<string | null>(null);

  const [familyName, setFamilyName] = useState('');
  const [tierInputs, setTierInputs] = useState<{ qty: string; price: string }[]>([
    { qty: '1', price: '1000' },
    { qty: '2', price: '1500' },
    { qty: '3', price: '2000' },
  ]);

  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodOwner, setProdOwner] = useState(event.participants[0]?.id ?? '');
  const [prodFamily, setProdFamily] = useState('');
  const [prodStock, setProdStock] = useState('');

  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidBy, setExpPaidBy] = useState(event.participants[0]?.id ?? '');
  const [expSplitEqually, setExpSplitEqually] = useState(true);
  const [expSplits, setExpSplits] = useState<Record<string, number>>({});

  const allOwners = [
    ...event.participants.map((p) => ({ id: p.id, name: p.name, color: p.color, isShared: false })),
    ...event.sharedEntities.map((s) => ({
      id: s.id,
      name: `${s.name} (Compartida)`,
      color: s.color,
      isShared: true,
    })),
  ];

  const addParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = partName.trim();
    if (!trimmed) return;
    const newP: Participant = {
      id: createId('p'),
      name: trimmed,
      color: partColor,
    };
    const nextParticipants = [...event.participants, newP];
    onUpdateEvent({
      ...event,
      participants: nextParticipants,
      singleTransferOwnerId: event.singleTransferOwnerId ?? newP.id,
    });
    if (!prodOwner) setProdOwner(newP.id);
    if (!expPaidBy) setExpPaidBy(newP.id);
    setPartName('');
    setPartColor(M3_EXPRESSIVE_COLORS[nextParticipants.length % M3_EXPRESSIVE_COLORS.length]);
  };

  const removeParticipant = (id: string) => {
    const nextParticipants = event.participants.filter((p) => p.id !== id);
    onUpdateEvent({
      ...event,
      participants: nextParticipants,
      singleTransferOwnerId:
        event.singleTransferOwnerId === id
          ? nextParticipants[0]?.id ?? null
          : event.singleTransferOwnerId,
    });
  };

  const updateParticipantColor = (id: string, newColor: string) => {
    onUpdateEvent({
      ...event,
      participants: event.participants.map((p) =>
        p.id === id ? { ...p, color: newColor } : p
      ),
    });
  };

  const updateSharedEntityColor = (id: string, newColor: string) => {
    onUpdateEvent({
      ...event,
      sharedEntities: event.sharedEntities.map((sh) =>
        sh.id === id ? { ...sh, color: newColor } : sh
      ),
    });
  };

  const openSharedForm = () => {
    const initial: Record<string, number> = {};
    const count = event.participants.length;
    if (count > 0) {
      const base = Math.floor(100 / count);
      let rem = 100 - base * count;
      event.participants.forEach((p) => {
        initial[p.id] = base + (rem > 0 ? 1 : 0);
        if (rem > 0) rem--;
      });
    }
    setSharedSplits(initial);
    setSharedColor(
      M3_EXPRESSIVE_COLORS[
        (event.participants.length + event.sharedEntities.length + 2) % M3_EXPRESSIVE_COLORS.length
      ]
    );
    setShowSharedForm(true);
  };

  const sharedSplitsSum = event.participants.reduce(
    (sum, p) => sum + (Number(sharedSplits[p.id]) || 0),
    0
  );

  const addSharedEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharedName.trim() || sharedSplitsSum !== 100) return;
    const splits: Split[] = event.participants.map((p) => ({
      participantId: p.id,
      percentage: Number(sharedSplits[p.id]) || 0,
    }));
    const newSh: SharedEntity = {
      id: createId('sh'),
      name: sharedName.trim(),
      color: sharedColor,
      splits,
    };
    onUpdateEvent({
      ...event,
      sharedEntities: [...event.sharedEntities, newSh],
    });
    setSharedName('');
    setShowSharedForm(false);
  };

  const addPromoFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) return;
    const tiers: Record<number, number> = {};
    for (const row of tierInputs) {
      const q = parseInt(row.qty, 10);
      const p = parseInt(row.price, 10);
      if (q >= 1 && p >= 0) tiers[q] = p;
    }
    const newFam: PromoFamily = {
      id: createId('fam'),
      name: familyName.trim(),
      tiers,
    };
    onUpdateEvent({
      ...event,
      promoFamilies: [...event.promoFamilies, newFam],
    });
    setFamilyName('');
  };

  const addProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseInt(prodPrice, 10);
    const ownerId = prodOwner || event.participants[0]?.id || '';
    if (!prodName.trim() || isNaN(price) || price < 0 || !ownerId) return;
    const stockNum = prodStock.trim() === '' ? null : parseInt(prodStock, 10);
    const newProd: Product = {
      id: createId('prod'),
      name: prodName.trim(),
      basePrice: price,
      ownerId,
      familyId: prodFamily || null,
      stock: stockNum !== null && !isNaN(stockNum) ? stockNum : null,
    };
    onUpdateEvent({
      ...event,
      products: [...event.products, newProd],
    });
    setProdName('');
    setProdPrice('');
    setProdStock('');
  };

  const expSplitsSum = event.participants.reduce(
    (sum, p) => sum + (Number(expSplits[p.id]) || 0),
    0
  );

  const addExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(expAmount, 10);
    const paidBy = expPaidBy || event.participants[0]?.id || '';
    if (!expDesc.trim() || isNaN(amount) || amount <= 0 || !paidBy) return;
    if (!expSplitEqually && expSplitsSum !== 100) return;

    const splits: Split[] = expSplitEqually
      ? []
      : event.participants.map((p) => ({
          participantId: p.id,
          percentage: Number(expSplits[p.id]) || 0,
        }));

    const newExp: Expense = {
      id: createId('exp'),
      description: expDesc.trim(),
      amount,
      paidBy,
      splitEqually: expSplitEqually,
      splits,
    };
    onUpdateEvent({
      ...event,
      expenses: [...event.expenses, newExp],
    });
    setExpDesc('');
    setExpAmount('');
  };

  const totalExpenses = event.expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="text-on-surface">
      <main className="mx-auto max-w-7xl px-4 pt-3 pb-28 sm:px-6 sm:pt-4 space-y-8 lg:pb-16">
        {/* SECCIÓN 1: EVENTO Y PARTICIPANTES */}
        <section className="space-y-4">
          <div
            onClick={() => toggleSection('participants')}
            className="flex items-center justify-between gap-3 border-b border-outline-variant/40 pb-3 cursor-pointer select-none group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-secondary-container text-on-secondary-container shadow-2xs group-hover:scale-105 transition-transform">
                <Icon name="group" size={20} filled />
              </div>
              <h2 className="truncate text-lg font-bold text-on-surface sm:text-xl">
                1. Feria y Participantes
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSection('participants');
                }}
                aria-expanded={openSections.participants}
                aria-label={openSections.participants ? 'Contraer sección' : 'Expandir sección'}
                className="flex h-9 w-9 sm:h-10 sm:w-10 aspect-square shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface hover:bg-surface-container-highest active:scale-90 transition-all border border-outline-variant/30 shadow-2xs"
              >
                <Icon
                  name="expand_more"
                  size={22}
                  className={`transition-transform duration-200 ${
                    openSections.participants ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          <SmoothCollapse isOpen={openSections.participants}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 pt-2">
            <div className="space-y-6">
              {/* Datos de la Feria */}
              <section className="rounded-[28px] bg-surface-container-low p-5 sm:p-6">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                  Datos de la Feria
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="m3-label">Nombre de la feria</label>
                    <input
                      type="text"
                      value={event.name}
                      onChange={(e) => onUpdateEvent({ ...event, name: e.target.value })}
                      className="m3-input"
                    />
                  </div>
                  <div>
                    <label className="m3-label">Fecha</label>
                    <input
                      type="date"
                      value={event.date}
                      onChange={(e) => onUpdateEvent({ ...event, date: e.target.value })}
                      className="m3-input"
                    />
                  </div>
                </div>

                <div className="mt-5 border-t border-outline-variant/60 pt-5">
                  <label className="mb-3 block text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                    Modo de Cobro por Transferencia
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateEvent({
                          ...event,
                          transferMode: 'individual',
                          singleTransferOwnerId: null,
                        })
                      }
                      className={`m3-spring-effects-fast rounded-[18px] p-4 text-left text-sm ${
                        event.transferMode === 'individual'
                          ? 'bg-primary-container text-on-primary-container ring-2 ring-primary'
                          : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-bold">
                        <span>Cuentas individuales</span>
                        <Icon
                          name={
                            event.transferMode === 'individual'
                              ? 'radio_button_checked'
                              : 'radio_button_unchecked'
                          }
                          size={20}
                        />
                      </div>
                      <div className="mt-1 text-xs leading-relaxed opacity-85">
                        En caja se elige quién recibió cada transferencia.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateEvent({
                          ...event,
                          transferMode: 'single_account',
                          singleTransferOwnerId:
                            event.singleTransferOwnerId ?? event.participants[0]?.id ?? null,
                        })
                      }
                      className={`m3-spring-effects-fast rounded-[18px] p-4 text-left text-sm ${
                        event.transferMode === 'single_account'
                          ? 'bg-primary-container text-on-primary-container ring-2 ring-primary'
                          : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-bold">
                        <span>Cuenta única</span>
                        <Icon
                          name={
                            event.transferMode === 'single_account'
                              ? 'radio_button_checked'
                              : 'radio_button_unchecked'
                          }
                          size={20}
                        />
                      </div>
                      <div className="mt-1 text-xs leading-relaxed opacity-85">
                        Todas las transferencias van a una sola cuenta y se liquidan al cierre.
                      </div>
                    </button>
                  </div>

                  {event.transferMode === 'single_account' && event.participants.length > 0 && (
                    <div className="mt-4">
                      <label className="m3-label">
                        Cuenta receptora de todas las transferencias
                      </label>
                      <select
                        value={event.singleTransferOwnerId ?? ''}
                        onChange={(e) =>
                          onUpdateEvent({ ...event, singleTransferOwnerId: e.target.value })
                        }
                        className="m3-input"
                      >
                        {event.participants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </section>

              {/* Lista de Participantes */}
              <section className="rounded-[28px] bg-surface-container-low p-5 sm:p-6">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                  Participantes / Artistas
                </h2>
                <form
                  onSubmit={addParticipant}
                  className="mb-5 space-y-4 rounded-[20px] bg-surface-container-lowest p-4 sm:p-5"
                >
                  <div>
                    <label className="m3-label">Nombre del participante</label>
                    <input
                      type="text"
                      placeholder="Ej. Cristian"
                      value={partName}
                      onChange={(e) => setPartName(e.target.value)}
                      className="m3-input"
                    />
                  </div>
                  <div>
                    <M3ColorSelector
                      label=""
                      selectedColor={partColor}
                      onSelectColor={setPartColor}
                    />
                  </div>
                  <button
                    type="submit"
                    className="m3-btn-sm h-11 min-h-11 w-full bg-primary text-sm font-bold text-on-primary"
                  >
                    <Icon name="add" size={20} />
                    Agregar Participante
                  </button>
                </form>

                <div className="space-y-2.5">
                  {event.participants.map((p) => {
                    const isEditingColor = editingParticipantColorId === p.id;
                    return (
                      <div
                        key={p.id}
                        className="flex flex-col rounded-[16px] bg-surface-container-lowest p-3 sm:px-4"
                      >
                        <div className="flex min-h-[44px] items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingParticipantColorId(isEditingColor ? null : p.id)
                              }
                              className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black shadow-xs transition-transform hover:scale-105"
                              style={{
                                backgroundColor: p.color,
                                color: getContrastTextColor(p.color),
                              }}
                              title="Clic para cambiar color M3 Expressive"
                            >
                              <span>{p.name.charAt(0).toUpperCase()}</span>
                              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface-container-highest text-on-surface opacity-0 shadow-xs transition-opacity group-hover:opacity-100">
                                <Icon name="palette" size={10} />
                              </span>
                            </button>
                            <div className="min-w-0">
                              <span className="truncate text-base font-bold text-on-surface">
                                {p.name}
                              </span>
                              <div className="text-[11px] font-medium text-on-surface-variant">
                                {getM3ColorName(p.color)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingParticipantColorId(isEditingColor ? null : p.id)
                              }
                              className={`m3-icon-btn-sm transition-colors ${
                                isEditingColor
                                  ? 'bg-primary-container text-on-primary-container'
                                  : 'text-on-surface-variant hover:bg-surface-container-high'
                              }`}
                              title="Cambiar color identificatorio"
                            >
                              <Icon name="palette" size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeParticipant(p.id)}
                              className="m3-icon-btn-sm text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                              title="Eliminar participante"
                            >
                              <Icon name="delete" size={20} />
                            </button>
                          </div>
                        </div>

                        {isEditingColor && (
                          <div className="mt-3 border-t border-outline-variant/50 pt-2.5">
                            <M3ColorSelector
                              compact
                              label="Cambiar color identificatorio (M3 Expressive)"
                              selectedColor={p.color}
                              onSelectColor={(newColor) => {
                                updateParticipantColor(p.id, newColor);
                                setEditingParticipantColorId(null);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {event.participants.length === 0 && (
                    <p className="px-1 text-sm text-on-surface-variant">
                      Agrega al menos 1 participante para empezar.
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Cuentas Compartidas */}
            <section className="rounded-[28px] bg-surface-container-low p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                  Cuentas Compartidas
                </h2>
                {event.participants.length >= 2 && !showSharedForm && (
                  <button
                    type="button"
                    onClick={openSharedForm}
                    className="m3-btn-xs bg-tertiary-container text-xs font-bold text-on-tertiary-container"
                  >
                    <Icon name="add" size={16} />
                    Agregar conjunta
                  </button>
                )}
              </div>

              <SmoothCollapse isOpen={showSharedForm}>
                <form
                  onSubmit={addSharedEntity}
                  className="mb-5 space-y-4 rounded-[20px] bg-surface-container-lowest p-4 sm:p-5"
                >
                  <div>
                    <label className="m3-label">Nombre de la marca conjunta</label>
                    <input
                      type="text"
                      placeholder="Ej. Conjunto"
                      value={sharedName}
                      onChange={(e) => setSharedName(e.target.value)}
                      className="m3-input"
                    />
                  </div>
                  <div>
                    <M3ColorSelector
                      label="Color identificatorio (M3 Expressive)"
                      selectedColor={sharedColor}
                      onSelectColor={setSharedColor}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                      <span>Reparto por participante</span>
                      <span className={sharedSplitsSum === 100 ? 'text-success' : 'text-error'}>
                        Total: {sharedSplitsSum}%
                      </span>
                    </div>
                    {event.participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="w-28 truncate text-sm font-bold text-on-surface">
                          {p.name}
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={sharedSplits[p.id] ?? 0}
                          onChange={(e) =>
                            setSharedSplits({ ...sharedSplits, [p.id]: Number(e.target.value) })
                          }
                          className="h-10 flex-1 accent-primary"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={sharedSplits[p.id] ?? 0}
                            onChange={(e) =>
                              setSharedSplits({
                                ...sharedSplits,
                                [p.id]: Number(e.target.value),
                              })
                            }
                            className="h-10 w-20 rounded-[10px] border border-outline-variant px-2.5 text-right text-sm font-bold"
                          />
                          <span className="text-sm font-bold text-on-surface-variant">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowSharedForm(false)}
                      className="m3-btn-sm text-sm font-bold text-on-surface-variant hover:bg-surface-container-high"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={sharedSplitsSum !== 100 || !sharedName.trim()}
                      className="m3-btn-sm bg-primary text-sm font-bold text-on-primary disabled:opacity-40"
                    >
                      <Icon name="check" size={18} />
                      Guardar
                    </button>
                  </div>
                </form>
              </SmoothCollapse>

              <div className="space-y-2.5">
                {event.sharedEntities.map((sh) => {
                  const isEditingColor = editingSharedColorId === sh.id;
                  return (
                    <div
                      key={sh.id}
                      className="flex flex-col rounded-[16px] bg-surface-container-lowest p-3 sm:px-4"
                    >
                      <div className="flex min-h-[44px] items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingSharedColorId(isEditingColor ? null : sh.id)
                            }
                            className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black shadow-xs transition-transform hover:scale-105"
                            style={{
                              backgroundColor: sh.color,
                              color: getContrastTextColor(sh.color),
                            }}
                            title="Clic para cambiar color M3 Expressive"
                          >
                            <span>{sh.name.charAt(0).toUpperCase()}</span>
                            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface-container-highest text-on-surface opacity-0 shadow-xs transition-opacity group-hover:opacity-100">
                              <Icon name="palette" size={10} />
                            </span>
                          </button>
                          <div className="min-w-0">
                            <div className="truncate text-base font-bold text-on-surface">
                              {sh.name}
                            </div>
                            <p className="mt-0.5 text-xs font-medium text-on-surface-variant">
                              <span className="font-semibold text-on-surface">
                                {getM3ColorName(sh.color)}
                              </span>{' '}
                              •{' '}
                              {sh.splits
                                .map((s) => {
                                  const p = event.participants.find(
                                    (part) => part.id === s.participantId
                                  );
                                  return `${p?.name ?? '?'}: ${s.percentage}%`;
                                })
                                .join(' • ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingSharedColorId(isEditingColor ? null : sh.id)
                            }
                            className={`m3-icon-btn-sm transition-colors ${
                              isEditingColor
                                ? 'bg-primary-container text-on-primary-container'
                                : 'text-on-surface-variant hover:bg-surface-container-high'
                            }`}
                            title="Cambiar color identificatorio"
                          >
                            <Icon name="palette" size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateEvent({
                                ...event,
                                sharedEntities: event.sharedEntities.filter(
                                  (item) => item.id !== sh.id
                                ),
                              })
                            }
                            className="m3-icon-btn-sm text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                            title="Eliminar cuenta compartida"
                          >
                            <Icon name="delete" size={20} />
                          </button>
                        </div>
                      </div>

                      {isEditingColor && (
                        <div className="mt-3 border-t border-outline-variant/50 pt-2.5">
                          <M3ColorSelector
                            compact
                            label="Cambiar color identificatorio (M3 Expressive)"
                            selectedColor={sh.color}
                            onSelectColor={(newColor) => {
                              updateSharedEntityColor(sh.id, newColor);
                              setEditingSharedColorId(null);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {event.sharedEntities.length === 0 && !showSharedForm && (
                  <p className="px-1 text-sm leading-relaxed text-on-surface-variant">
                    Si venden productos en conjunto (ej. 50% / 50%), crea una cuenta compartida aquí.
                  </p>
                )}
              </div>
            </section>
          </div>
          </SmoothCollapse>
        </section>

        {/* SECCIÓN 2: ARTÍCULOS Y PROMOS */}
        <section className="space-y-4">
          <div
            onClick={() => toggleSection('products')}
            className="flex items-center justify-between gap-3 border-b border-outline-variant/40 pb-3 cursor-pointer select-none group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-secondary-container text-on-secondary-container shadow-2xs group-hover:scale-105 transition-transform">
                <Icon name="sell" size={20} filled />
              </div>
              <h2 className="truncate text-lg font-bold text-on-surface sm:text-xl">
                2. Artículos y Promos
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSection('products');
                }}
                aria-expanded={openSections.products}
                aria-label={openSections.products ? 'Contraer sección' : 'Expandir sección'}
                className="flex h-9 w-9 sm:h-10 sm:w-10 aspect-square shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface hover:bg-surface-container-highest active:scale-90 transition-all border border-outline-variant/30 shadow-2xs"
              >
                <Icon
                  name="expand_more"
                  size={22}
                  className={`transition-transform duration-200 ${
                    openSections.products ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          <SmoothCollapse isOpen={openSections.products}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 pt-2">
            {/* Familias de Promo */}
            <section className="rounded-[28px] bg-surface-container-low p-5 sm:p-6">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                Familias de Promo (Mix &amp; Match)
              </h2>
              <form
                onSubmit={addPromoFamily}
                className="mb-5 space-y-4 rounded-[20px] bg-surface-container-lowest p-4 sm:p-5"
              >
                <div>
                  <label className="m3-label">Nombre de la familia</label>
                  <input
                    type="text"
                    placeholder="Ej. Stickers"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="m3-input"
                  />
                </div>
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-on-surface-variant">
                    Tramos por cantidad
                  </div>
                  {tierInputs.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <input
                        type="number"
                        min={1}
                        placeholder="Cant."
                        value={tier.qty}
                        onChange={(e) => {
                          const next = [...tierInputs];
                          next[idx].qty = e.target.value;
                          setTierInputs(next);
                        }}
                        className="m3-input h-11 min-h-11 w-20 px-3 text-center font-bold"
                      />
                      <span className="shrink-0 text-sm font-medium text-on-surface-variant">
                        unid. = $
                      </span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Precio"
                        value={tier.price}
                        onChange={(e) => {
                          const next = [...tierInputs];
                          next[idx].price = e.target.value;
                          setTierInputs(next);
                        }}
                        className="m3-input h-11 min-h-11 flex-1 px-3 font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setTierInputs(tierInputs.filter((_, i) => i !== idx))}
                        className="m3-icon-btn-sm text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                        title="Eliminar tramo"
                      >
                        <Icon name="delete" size={20} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setTierInputs([
                        ...tierInputs,
                        { qty: String(tierInputs.length + 1), price: '' },
                      ])
                    }
                    className="m3-btn-xs text-xs font-bold text-primary hover:bg-primary-container/40"
                  >
                    + Agregar tramo
                  </button>
                </div>
                <button
                  type="submit"
                  className="m3-btn-sm h-11 min-h-11 w-full bg-secondary-container text-sm font-bold text-on-secondary-container"
                >
                  Guardar Familia de Promo
                </button>
              </form>

              <div className="space-y-2.5">
                {event.promoFamilies.map((fam) => (
                  <div
                    key={fam.id}
                    className="flex min-h-[60px] items-center justify-between gap-3 rounded-[16px] bg-surface-container-lowest px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-base font-bold text-on-surface">{fam.name}</div>
                      <div className="mt-0.5 text-xs font-medium text-on-surface-variant">
                        {Object.entries(fam.tiers)
                          .sort(([a], [b]) => Number(a) - Number(b))
                          .map(([q, p]) => `${q}x ${formatMoney(p)}`)
                          .join(' • ')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateEvent({
                          ...event,
                          promoFamilies: event.promoFamilies.filter((f) => f.id !== fam.id),
                          products: event.products.map((p) =>
                            p.familyId === fam.id ? { ...p, familyId: null } : p
                          ),
                        })
                      }
                      className="m3-icon-btn-sm text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                      title="Eliminar familia de promo"
                    >
                      <Icon name="delete" size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Botones de Venta (Artículos) */}
            <section className="rounded-[28px] bg-surface-container-low p-5 sm:p-6">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                Botones de Venta (Artículos)
              </h2>
              <form
                onSubmit={addProduct}
                className="mb-5 space-y-4 rounded-[20px] bg-surface-container-lowest p-4 sm:p-5"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="m3-label">Nombre del artículo</label>
                    <input
                      type="text"
                      placeholder="Ej. Sticker"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="m3-input"
                    />
                  </div>
                  <div>
                    <label className="m3-label">Precio unitario ($)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Ej. 1000"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      className="m3-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="m3-label">Dueño</label>
                    <select
                      value={prodOwner || event.participants[0]?.id || ''}
                      onChange={(e) => setProdOwner(e.target.value)}
                      className="m3-input"
                    >
                      {allOwners.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="m3-label">Promo</label>
                    <select
                      value={prodFamily}
                      onChange={(e) => setProdFamily(e.target.value)}
                      className="m3-input"
                    >
                      <option value="">Sin promo</option>
                      {event.promoFamilies.map((f) => (
                        <option key={f.id} value={f.id}>
                          Promo: {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="m3-label">Stock inicial (opc.)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Ilimitado"
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                      className="m3-input"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={allOwners.length === 0}
                  className="m3-btn-sm h-12 min-h-12 w-full bg-primary text-sm font-bold text-on-primary disabled:opacity-40"
                >
                  <Icon name="add" size={20} />
                  Agregar Botón de Venta
                </button>
              </form>

              <div className="space-y-2.5">
                {event.products.map((prod) => {
                  const owner = allOwners.find((o) => o.id === prod.ownerId);
                  const fam = event.promoFamilies.find((f) => f.id === prod.familyId);
                  return (
                    <div
                      key={prod.id}
                      className="flex min-h-[64px] items-center justify-between gap-3 rounded-[16px] bg-surface-container-lowest px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full"
                          style={{ backgroundColor: owner?.color ?? '#94a3b8' }}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-base font-bold text-on-surface">
                            {prod.name}{' '}
                            <span className="font-extrabold text-primary">
                              {formatMoney(prod.basePrice)}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs font-medium text-on-surface-variant">
                            {owner?.name ?? 'Sin dueño'}
                            {fam ? ` • Promo ${fam.name}` : ''}
                            {prod.stock !== null ? ` • Stock: ${prod.stock}` : ''}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateEvent({
                            ...event,
                            products: event.products.filter((p) => p.id !== prod.id),
                          })
                        }
                        className="m3-icon-btn-sm text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                        title="Eliminar artículo"
                      >
                        <Icon name="delete" size={20} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
          </SmoothCollapse>
        </section>

        {/* SECCIÓN 3: GASTOS */}
        <section className="space-y-4">
          <div
            onClick={() => toggleSection('expenses')}
            className="flex items-center justify-between gap-3 border-b border-outline-variant/40 pb-3 cursor-pointer select-none group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-secondary-container text-on-secondary-container shadow-2xs group-hover:scale-105 transition-transform">
                <Icon name="receipt_long" size={20} filled />
              </div>
              <h2 className="truncate text-lg font-bold text-on-surface sm:text-xl">
                3. Gastos del Stand
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-surface-variant">
                {event.expenses.length} gasto{event.expenses.length === 1 ? '' : 's'}
                {event.expenses.length > 0 && ` • Total: ${formatMoney(totalExpenses)}`}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSection('expenses');
                }}
                aria-expanded={openSections.expenses}
                aria-label={openSections.expenses ? 'Contraer sección' : 'Expandir sección'}
                className="flex h-9 w-9 sm:h-10 sm:w-10 aspect-square shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface hover:bg-surface-container-highest active:scale-90 transition-all border border-outline-variant/30 shadow-2xs"
              >
                <Icon
                  name="expand_more"
                  size={22}
                  className={`transition-transform duration-200 ${
                    openSections.expenses ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          <SmoothCollapse isOpen={openSections.expenses}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 pt-2">
            {/* Formulario Nuevo Gasto */}
            <div className="rounded-[28px] bg-surface-container-low p-5 sm:p-6">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                Registrar Nuevo Gasto
              </h3>
              <form
                onSubmit={addExpense}
                className="space-y-4 rounded-[20px] bg-surface-container-lowest p-4 sm:p-5"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="m3-label">Descripción</label>
                    <input
                      type="text"
                      placeholder="Ej. Canon stand"
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                      className="m3-input"
                    />
                  </div>
                  <div>
                    <label className="m3-label">Monto ($)</label>
                    <input
                      type="number"
                      min={1}
                      placeholder="Ej. 10000"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="m3-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="m3-label">¿Quién lo pagó?</label>
                    <select
                      value={expPaidBy || event.participants[0]?.id || ''}
                      onChange={(e) => setExpPaidBy(e.target.value)}
                      className="m3-input"
                    >
                      {event.participants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex min-h-[48px] w-full cursor-pointer items-center gap-3 rounded-[14px] border border-outline-variant bg-surface px-4 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={expSplitEqually}
                        onChange={(e) => {
                          setExpSplitEqually(e.target.checked);
                          if (!e.target.checked) {
                            const init: Record<string, number> = {};
                            const count = event.participants.length;
                            if (count > 0) {
                              const base = Math.floor(100 / count);
                              let rem = 100 - base * count;
                              event.participants.forEach((p) => {
                                init[p.id] = base + (rem > 0 ? 1 : 0);
                                if (rem > 0) rem--;
                              });
                            }
                            setExpSplits(init);
                          }
                        }}
                        className="h-4 w-4 accent-primary"
                      />
                      <span>Repartir en partes iguales</span>
                    </label>
                  </div>
                </div>

                {!expSplitEqually && (
                  <div className="space-y-3 rounded-[16px] bg-surface-container-low p-4">
                    <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                      <span>Porcentaje por participante</span>
                      <span className={expSplitsSum === 100 ? 'text-success' : 'text-error'}>
                        Total: {expSplitsSum}%
                      </span>
                    </div>
                    {event.participants.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-bold text-on-surface">{p.name}</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={expSplits[p.id] ?? 0}
                            onChange={(e) =>
                              setExpSplits({ ...expSplits, [p.id]: Number(e.target.value) })
                            }
                            className="h-10 w-20 rounded-[10px] border border-outline-variant bg-surface-container-lowest px-2.5 text-right text-sm font-bold"
                          />
                          <span className="text-sm font-bold text-on-surface-variant">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    event.participants.length === 0 || (!expSplitEqually && expSplitsSum !== 100)
                  }
                  className="m3-btn-sm h-12 min-h-12 w-full bg-primary text-sm font-bold text-on-primary disabled:opacity-40"
                >
                  <Icon name="add" size={20} />
                  Registrar Gasto
                </button>
              </form>
            </div>

            {/* Lista de Gastos Registrados */}
            <div className="rounded-[28px] bg-surface-container-low p-5 sm:p-6">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                Gastos Registrados ({event.expenses.length})
              </h3>
              <div className="space-y-2.5">
                {event.expenses.map((exp) => {
                  const payer = event.participants.find((p) => p.id === exp.paidBy);
                  return (
                    <div
                      key={exp.id}
                      className="flex min-h-[64px] items-center justify-between gap-3 rounded-[16px] bg-surface-container-lowest px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-base font-bold text-on-surface">
                          {exp.description} — {formatMoney(exp.amount)}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-on-surface-variant">
                          Pagó: {payer?.name ?? '?'} •{' '}
                          {exp.splitEqually ? 'Partes iguales' : 'Reparto personalizado'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateEvent({
                            ...event,
                            expenses: event.expenses.filter((item) => item.id !== exp.id),
                          })
                        }
                        className="m3-icon-btn-sm text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
                        title="Eliminar gasto"
                      >
                        <Icon name="delete" size={20} />
                      </button>
                    </div>
                  );
                })}
                {event.expenses.length === 0 && (
                  <p className="px-1 text-sm text-on-surface-variant">No hay gastos cargados aún.</p>
                )}
              </div>
            </div>
          </div>
          </SmoothCollapse>
        </section>
      </main>
    </div>
  );
};

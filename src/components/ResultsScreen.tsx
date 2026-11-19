import React, { useMemo, useState } from 'react';
import type { FeriaEvent } from '../types';
import {
  calculateEventResults,
  formatMoney,
  generateWhatsAppSummary,
} from '../utils/calculations';
import {
  copyResultsImageToClipboard,
  downloadResultsJpg,
  downloadResultsPdf,
  shareResultsWithImageAndText,
} from '../utils/reportExport';
import { Icon } from './Icon';

interface ResultsScreenProps {
  event: FeriaEvent;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

const BUBBLE_PALETTES = [
  { bg: 'bg-tertiary-container', text: 'text-on-tertiary-container', rotate: '-rotate-6' },
  { bg: 'bg-primary-container', text: 'text-on-primary-container', rotate: 'rotate-3' },
  { bg: 'bg-success-container', text: 'text-on-success-container', rotate: '-rotate-3' },
  { bg: 'bg-secondary-container', text: 'text-on-secondary-container', rotate: 'rotate-6' },
  { bg: 'bg-surface-container-highest', text: 'text-on-surface', rotate: '-rotate-2' },
];

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ event }) => {
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const results = useMemo(() => calculateEventResults(event), [event]);

  const ownerMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    event.participants.forEach((p) => map.set(p.id, { name: p.name, color: p.color }));
    event.sharedEntities.forEach((s) => map.set(s.id, { name: s.name, color: s.color }));
    return map;
  }, [event.participants, event.sharedEntities]);

  const showStatus = (msg: string) => {
    setExportStatus(msg);
    setTimeout(() => setExportStatus(null), 3500);
  };

  const handleCopyText = async () => {
    const text = generateWhatsAppSummary(event, results);
    try {
      await navigator.clipboard.writeText(text);
      showStatus('¡Resumen de texto copiado al portapapeles!');
    } catch {
      window.prompt('Copia el resumen:', text);
    }
  };

  const handleCopyImage = async () => {
    setBusyAction('image');
    try {
      await copyResultsImageToClipboard(event, results);
      showStatus('¡Imagen de gráficos copiada! Pégala con Ctrl+V en WhatsApp.');
    } catch (err) {
      showStatus(
        err instanceof Error
          ? err.message
          : 'No se pudo copiar la imagen al portapapeles.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadJpg = async () => {
    setBusyAction('jpg');
    try {
      await downloadResultsJpg(event, results);
      showStatus('Imagen JPG descargada.');
    } catch {
      showStatus('Error al generar el archivo JPG.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadPdf = async () => {
    setBusyAction('pdf');
    try {
      await downloadResultsPdf(event, results);
      showStatus('Reporte PDF descargado.');
    } catch {
      showStatus('Error al generar el archivo PDF.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleShareWhatsApp = async () => {
    const text = generateWhatsAppSummary(event, results);
    setBusyAction('share');
    try {
      // Try copying text first so it's always ready
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text).catch(() => {});
      }

      const sharedNatively = await shareResultsWithImageAndText(event, results, text);
      if (sharedNatively) {
        showStatus('¡Resumen e imagen enviados para compartir!');
        return;
      }

      // Desktop fallback: copy image to clipboard if supported, else download JPG
      try {
        await copyResultsImageToClipboard(event, results);
        showStatus(
          'Imagen copiada al portapapeles (y texto copiado o listo en "Copiar Texto"). Pégala con Ctrl+V en WhatsApp.'
        );
      } catch {
        await downloadResultsJpg(event, results);
        showStatus('Texto copiado y gráfico descargado en JPG para adjuntar en WhatsApp.');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      showStatus('No se pudo compartir automáticamente. Usa los botones de descarga o copia.');
    } finally {
      setBusyAction(null);
    }
  };

  // Safe percentages
  const safeTotalRevenue = results.totalRevenue;
  const avgTicket =
    results.salesCount > 0 ? Math.round(safeTotalRevenue / results.salesCount) : 0;

  const cashPct =
    safeTotalRevenue > 0 ? Math.round((results.cashTotal / safeTotalRevenue) * 100) : 0;
  const transferPct = safeTotalRevenue > 0 ? 100 - cashPct : 0;

  const netBalance = safeTotalRevenue - results.totalExpenses;
  const marginPct =
    safeTotalRevenue > 0 ? Math.round((netBalance / safeTotalRevenue) * 100) : 0;

  const maxBarAmount = Math.max(safeTotalRevenue, results.totalExpenses, 1);
  const incomeBarHeight =
    safeTotalRevenue > 0 ? Math.max(22, Math.round((safeTotalRevenue / maxBarAmount) * 100)) : 12;
  const expenseBarHeight =
    results.totalExpenses > 0
      ? Math.max(22, Math.round((results.totalExpenses / maxBarAmount) * 100))
      : 12;

  const totalUnitsSold = results.topProducts.reduce((sum, p) => sum + p.unitsSold, 0);
  const maxProductUnits = results.topProducts[0]?.unitsSold ?? 1;

  // Segmented pill-arc ring segments for participants
  const ringSegments = useMemo(() => {
    const active = results.participantResults.filter((r) => r.earned > 0);
    if (active.length === 0 || safeTotalRevenue <= 0) return [];

    const totalEarned = active.reduce((sum, r) => sum + r.earned, 0);
    if (active.length === 1) {
      const only = active[0];
      return [
        {
          participant: only.participant,
          earned: only.earned,
          pct: 100,
          isFullCircle: true,
          startAngle: 0,
          endAngle: 360,
          badgePos: polarToCartesian(120, 120, 88, 0),
        },
      ];
    }

    const gapDeg = Math.min(24, Math.floor(140 / active.length));
    const availableAngle = 360 - active.length * gapDeg;
    let rawSweeps = active.map((r) => Math.max(6, (r.earned / totalEarned) * availableAngle));
    const sweepSum = rawSweeps.reduce((a, b) => a + b, 0);
    rawSweeps = rawSweeps.map((s) => (s / sweepSum) * availableAngle);

    let cursor = gapDeg / 2;
    return active.map((r, idx) => {
      const sweep = rawSweeps[idx];
      const startAngle = cursor;
      const endAngle = cursor + sweep;
      cursor = endAngle + gapDeg;
      return {
        participant: r.participant,
        earned: r.earned,
        pct: Math.round((r.earned / totalEarned) * 100),
        isFullCircle: false,
        startAngle,
        endAngle,
        badgePos: polarToCartesian(120, 120, 88, startAngle),
      };
    });
  }, [results.participantResults, safeTotalRevenue]);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-28 sm:px-6 sm:pt-4 lg:pb-12">
        {/* 1. Hero Card + Pill-Arc Ring (Inspired by Image 1 & Image 2) */}
        <section className="rounded-[32px] bg-surface-container-low p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                {event.name} • {event.date}
              </div>
              <h2 className="mt-0.5 text-lg font-bold text-on-surface">
                Resumen de Recaudación
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-container px-3.5 py-1 text-xs font-bold text-on-primary-container">
                {results.salesCount} venta(s)
              </span>
              {results.salesCount > 0 && (
                <span className="rounded-full bg-secondary-container px-3.5 py-1 text-xs font-bold text-on-secondary-container">
                  Prom: {formatMoney(avgTicket)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center justify-center gap-5 md:flex-row md:justify-around">
            {/* SVG Segmented Pill-Arc Ring */}
            <div className="relative flex h-[230px] w-[230px] shrink-0 items-center justify-center">
              <svg viewBox="0 0 240 240" className="h-full w-full">
                {/* Track background */}
                <circle
                  cx="120"
                  cy="120"
                  r="88"
                  fill="none"
                  stroke="var(--color-surface-container-highest)"
                  strokeWidth="22"
                />

                {ringSegments.map((seg) =>
                  seg.isFullCircle ? (
                    <circle
                      key={seg.participant.id}
                      cx="120"
                      cy="120"
                      r="88"
                      fill="none"
                      stroke={seg.participant.color}
                      strokeWidth="22"
                    />
                  ) : (
                    <path
                      key={seg.participant.id}
                      d={describeArc(120, 120, 88, seg.startAngle, seg.endAngle)}
                      fill="none"
                      stroke={seg.participant.color}
                      strokeWidth="22"
                      strokeLinecap="round"
                    />
                  )
                )}

                {/* Anchor initial badges on each pill segment */}
                {ringSegments.map((seg) => (
                  <g key={`badge-${seg.participant.id}`}>
                    <circle
                      cx={seg.badgePos.x}
                      cy={seg.badgePos.y}
                      r="12"
                      fill={seg.participant.color}
                      stroke="var(--color-surface-container-low)"
                      strokeWidth="3"
                    />
                    <text
                      x={seg.badgePos.x}
                      y={seg.badgePos.y + 3.5}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="10"
                      fontWeight="800"
                    >
                      {seg.participant.name.charAt(0).toUpperCase()}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Center Metric */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <span className="text-[11px] font-bold uppercase tracking-[0.05rem] text-on-surface-variant">
                  Recaudado
                </span>
                <span className="mt-0.5 text-[28px] leading-[34px] font-bold tracking-tight text-on-surface">
                  {formatMoney(safeTotalRevenue)}
                </span>
                <span className="mt-1 text-xs font-medium text-on-surface-variant">
                  {results.totalRevenue > 0 ? '100% registrado' : 'Sin ventas aún'}
                </span>
              </div>
            </div>

            {/* Participant Share Pills + Quick Metrics */}
            <div className="w-full max-w-sm space-y-3">
              <div className="text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                Participación en Ventas
              </div>
              <div className="flex flex-wrap gap-2">
                {results.participantResults.map((r) => {
                  const pct =
                    safeTotalRevenue > 0 ? Math.round((r.earned / safeTotalRevenue) * 100) : 0;
                  return (
                    <div
                      key={r.participant.id}
                      className="flex items-center gap-2 rounded-full bg-surface-container-lowest px-3.5 py-2 shadow-2xs"
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: r.participant.color }}
                      />
                      <span className="text-xs font-bold text-on-surface">
                        {r.participant.name}
                      </span>
                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[11px] font-black text-on-surface">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="rounded-[16px] bg-surface-container-lowest p-3">
                  <div className="text-[11px] font-bold text-on-surface-variant">Gastos Stand</div>
                  <div className="mt-0.5 text-lg font-bold text-tertiary">
                    {formatMoney(results.totalExpenses)}
                  </div>
                </div>
                <div className="rounded-[16px] bg-surface-container-lowest p-3">
                  <div className="text-[11px] font-bold text-on-surface-variant">Balance Neto</div>
                  <div
                    className={`mt-0.5 text-lg font-bold ${
                      netBalance >= 0 ? 'text-success' : 'text-error'
                    }`}
                  >
                    {formatMoney(netBalance)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2 & 3. Split Medios de Pago + Ingresos vs Gastos */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 2. Efectivo vs Transferencias Split Block (Inspired by Image 2 center-bottom 75%/25%) */}
          <section className="flex flex-col justify-between rounded-[28px] bg-surface-container-low p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="credit_card" size={18} className="text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                  Medios de Pago
                </h2>
              </div>
              <span className="text-xs font-bold text-on-surface-variant">
                {formatMoney(safeTotalRevenue)}
              </span>
            </div>

            {safeTotalRevenue === 0 ? (
              <div className="rounded-[16px] bg-surface-container-lowest py-10 text-center text-xs font-medium text-on-surface-variant">
                Registra una venta para ver la proporción entre efectivo y transferencia.
              </div>
            ) : (
              <div className="my-auto pt-2">
                <div className="flex items-stretch gap-2.5">
                  {/* Efectivo Block */}
                  <div
                    className="flex min-w-[96px] flex-col items-center"
                    style={{ flexGrow: Math.max(cashPct, 18), flexBasis: 0 }}
                  >
                    <div className="flex w-full items-center justify-center rounded-[18px] bg-success-container px-3 py-5 text-center text-sm font-black text-on-success-container">
                      {formatMoney(results.cashTotal)}
                    </div>
                    <div className="h-5 w-0.5 bg-outline-variant" />
                    <div className="text-2xl font-black text-on-surface">{cashPct}%</div>
                    <div className="text-xs font-bold text-on-surface-variant">Efectivo</div>
                  </div>

                  {/* Transferencias Block */}
                  <div
                    className="flex min-w-[96px] flex-col items-center"
                    style={{ flexGrow: Math.max(transferPct, 18), flexBasis: 0 }}
                  >
                    <div className="flex w-full items-center justify-center rounded-[18px] bg-primary-container px-3 py-5 text-center text-sm font-black text-on-primary-container">
                      {formatMoney(results.transferTotal)}
                    </div>
                    <div className="h-5 w-0.5 bg-outline-variant" />
                    <div className="text-2xl font-black text-on-surface">{transferPct}%</div>
                    <div className="text-xs font-bold text-on-surface-variant">Transferencia</div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 3. Ingresos vs Gastos con Barra Rayada (Inspired by Image 2 left) */}
          <section className="flex flex-col justify-between rounded-[28px] bg-surface-container-low p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="trending_up" size={18} className="text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                  Ingresos vs. Gastos
                </h2>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  netBalance >= 0
                    ? 'bg-success-container text-on-success-container'
                    : 'bg-error-container text-on-error-container'
                }`}
              >
                <Icon name="auto_awesome" size={14} filled />
                {safeTotalRevenue > 0 ? `${marginPct}% margen` : 'Sin ingresos'}
              </span>
            </div>

            <div className="flex h-40 items-end justify-center gap-6 rounded-[20px] bg-surface-container-lowest px-6 pb-4 pt-6">
              {/* Ingresos Solid Bar */}
              <div className="flex h-full w-28 flex-col items-center justify-end">
                <span className="mb-1.5 text-xs font-black text-on-surface">
                  {formatMoney(safeTotalRevenue)}
                </span>
                <div
                  className="w-full rounded-[16px] bg-primary transition-all duration-500"
                  style={{ height: `${incomeBarHeight}%` }}
                />
                <span className="mt-2 text-xs font-bold text-on-surface-variant">Ingresos</span>
              </div>

              {/* Gastos Hatched Bar */}
              <div className="flex h-full w-28 flex-col items-center justify-end">
                <span className="mb-1.5 text-xs font-black text-on-surface">
                  {formatMoney(results.totalExpenses)}
                </span>
                <div
                  className="w-full rounded-[16px] border-2 border-tertiary/40 transition-all duration-500"
                  style={{
                    height: `${expenseBarHeight}%`,
                    backgroundImage:
                      'repeating-linear-gradient(-45deg, var(--color-tertiary-container), var(--color-tertiary-container) 7px, rgba(125, 82, 96, 0.25) 7px, rgba(125, 82, 96, 0.25) 13px)',
                  }}
                />
                <span className="mt-2 text-xs font-bold text-on-surface-variant">Gastos</span>
              </div>
            </div>

            {event.expenses.length > 0 && (
              <div className="mt-3 space-y-1">
                {event.expenses.map((exp) => {
                  const payer = ownerMap.get(exp.paidBy);
                  return (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between rounded-[10px] bg-surface-container-lowest px-3 py-1.5 text-xs"
                    >
                      <span className="font-medium text-on-surface">
                        {exp.description}{' '}
                        <span className="text-on-surface-variant">
                          (pagó {payer?.name ?? '?'})
                        </span>
                      </span>
                      <span className="font-bold text-tertiary">{formatMoney(exp.amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* 4. Ganancia Real por Artista (Capsule Cards + Big %) & Liquidación */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-[28px] bg-surface-container-low p-5">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="account_balance_wallet" size={18} className="text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                Ganancia Real por Artista
              </h2>
            </div>

            <div className="space-y-3">
              {results.participantResults.map((r) => {
                const sharePct =
                  safeTotalRevenue > 0 ? Math.round((r.earned / safeTotalRevenue) * 100) : 0;

                return (
                  <div
                    key={r.participant.id}
                    className="rounded-[20px] bg-surface-container-lowest p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                          style={{ backgroundColor: r.participant.color }}
                        >
                          {r.participant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-on-surface">{r.participant.name}</div>
                          <div className="text-sm font-bold text-primary">
                            {formatMoney(r.earned)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-black leading-none text-on-surface">
                          {sharePct}%
                        </div>
                        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          del total
                        </div>
                      </div>
                    </div>

                    {/* Pill progress bar */}
                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${sharePct}%`,
                          backgroundColor: r.participant.color,
                        }}
                      />
                    </div>

                    {(r.expenseShare > 0 || r.expensePaid > 0) && (
                      <div className="mt-2.5 flex flex-wrap justify-between gap-2 border-t border-outline-variant/40 pt-2 text-xs text-on-surface-variant">
                        <span>
                          Gastos: -{formatMoney(r.expenseShare)} | Pagó: +{formatMoney(r.expensePaid)}
                        </span>
                        <span className="font-bold text-on-surface">
                          Neto final: {formatMoney(r.netEntitlement)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Liquidación de Caja */}
          <section className="rounded-[28px] bg-surface-container-low p-5">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="balance" size={18} className="text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                Liquidación de Caja
              </h2>
            </div>

            <div className="space-y-1.5 rounded-[16px] bg-surface-container-lowest p-3.5 text-xs text-on-surface-variant">
              {results.participantResults.map((r) => (
                <div key={r.participant.id} className="flex justify-between">
                  <span>{r.participant.name} cobró por transf.:</span>
                  <span className="font-bold text-on-surface">
                    {formatMoney(r.transfersReceived)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              {results.transferSettlements.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-[16px] bg-secondary-container px-4 py-3 text-sm font-bold text-on-secondary-container"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t.from.name}</span>
                    <Icon name="arrow_forward" size={16} />
                    <span>{t.to.name}</span>
                  </div>
                  <span>{formatMoney(t.amount)}</span>
                </div>
              ))}

              {results.participantResults.map((r) => {
                if (r.cashFromPot === 0) return null;
                return (
                  <div
                    key={r.participant.id}
                    className={`flex items-center justify-between rounded-[16px] px-4 py-3 text-sm font-bold ${
                      r.cashFromPot > 0
                        ? 'bg-success-container text-on-success-container'
                        : 'bg-tertiary-container text-on-tertiary-container'
                    }`}
                  >
                    <span>
                      {r.participant.name}{' '}
                      {r.cashFromPot > 0 ? 'retira del efectivo:' : 'aporta al pozo:'}
                    </span>
                    <span>{formatMoney(Math.abs(r.cashFromPot))}</span>
                  </div>
                );
              })}

              {results.transferSettlements.length === 0 &&
                results.participantResults.every((r) => r.cashFromPot === 0) && (
                  <p className="px-1 text-xs text-on-surface-variant">
                    Las cuentas están saldadas (sin movimientos pendientes).
                  </p>
                )}
            </div>
          </section>
        </div>

        {/* 5. Lo Más Vendido: Burbujas Friendly + Ranking con Barras Cápsula (Inspired by Image 3 & 1) */}
        <section className="rounded-[28px] bg-surface-container-low p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="emoji_events" size={18} className="text-tertiary" />
              <h2 className="text-xs font-bold uppercase tracking-[0.06rem] text-on-surface-variant">
                Lo Más Vendido
              </h2>
            </div>
            {totalUnitsSold > 0 && (
              <span className="rounded-full bg-surface-container-highest px-3 py-1 text-xs font-bold text-on-surface-variant">
                {totalUnitsSold} unidades totales
              </span>
            )}
          </div>

          {results.topProducts.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Todavía no se registraron ventas.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Friendly Packed Bubble Cluster (Top 5) */}
              <div className="flex min-h-[210px] flex-wrap items-center justify-center gap-3 rounded-[24px] bg-surface-container-lowest p-5 lg:col-span-5">
                {results.topProducts.slice(0, 5).map((item, idx) => {
                  const pct =
                    totalUnitsSold > 0 ? Math.round((item.unitsSold / totalUnitsSold) * 100) : 0;
                  const ratio = item.unitsSold / maxProductUnits;
                  const diameter = Math.round(76 + ratio * 52); // 76px to 128px
                  const palette = BUBBLE_PALETTES[idx % BUBBLE_PALETTES.length];
                  const owner = ownerMap.get(item.ownerId);

                  return (
                    <div
                      key={`bubble-${item.productId}`}
                      className={`relative flex shrink-0 flex-col items-center justify-center rounded-full p-2 text-center shadow-2xs transition-transform duration-300 hover:scale-105 ${palette.bg} ${palette.text}`}
                      style={{ width: `${diameter}px`, height: `${diameter}px` }}
                      title={`${item.productName} (${owner?.name ?? '?'}) — ${item.unitsSold} u.`}
                    >
                      <span
                        className={`font-black leading-none ${palette.rotate} ${
                          diameter >= 110 ? 'text-2xl' : diameter >= 92 ? 'text-xl' : 'text-lg'
                        }`}
                      >
                        {pct}%
                      </span>
                      <span className="mt-1 line-clamp-2 max-w-[90%] text-[10px] font-bold leading-tight">
                        {item.productName}
                      </span>
                      {owner && (
                        <span
                          className="mt-1 h-2 w-2 rounded-full"
                          style={{ backgroundColor: owner.color }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Capsule Bar Ranking List */}
              <div className="space-y-2.5 lg:col-span-7">
                {results.topProducts.map((item, idx) => {
                  const owner = ownerMap.get(item.ownerId);
                  const unitPct =
                    totalUnitsSold > 0 ? Math.round((item.unitsSold / totalUnitsSold) * 100) : 0;
                  const barWidthPct = Math.max(
                    8,
                    Math.round((item.unitsSold / maxProductUnits) * 100)
                  );
                  const barColor = owner?.color ?? 'var(--color-primary)';

                  return (
                    <div
                      key={item.productId}
                      className="rounded-[16px] bg-surface-container-lowest p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-xs font-black text-on-surface">
                            {idx + 1}
                          </span>
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: barColor }}
                          />
                          <span className="truncate font-bold text-on-surface">
                            {item.productName}
                          </span>
                          <span className="shrink-0 text-xs text-on-surface-variant">
                            ({owner?.name ?? '?'})
                          </span>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="font-black text-on-surface">{item.unitsSold} u.</span>
                          <span className="ml-1.5 text-xs font-bold text-on-surface-variant">
                            ({unitPct}%)
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${barWidthPct}%`, backgroundColor: barColor }}
                          />
                        </div>
                        <span className="w-20 text-right text-xs font-bold text-on-surface-variant">
                          {formatMoney(item.revenue)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Compartir y Exportar Reporte */}
        <section className="rounded-[28px] bg-surface-container-low p-5 space-y-3">
          {exportStatus && (
            <div className="flex items-center gap-2 rounded-[16px] bg-success-container px-4 py-3 text-xs font-bold text-on-success-container">
              <Icon name="check_circle" size={18} filled />
              <span>{exportStatus}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={busyAction !== null}
            className="m3-btn-md w-full bg-primary text-base font-bold text-on-primary shadow-sm hover:opacity-95 disabled:opacity-60"
          >
            <Icon name="share" size={20} filled />
            {busyAction === 'share'
              ? 'Preparando gráficos...'
              : 'Compartir para WhatsApp'}
          </button>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <button
              type="button"
              onClick={handleCopyText}
              disabled={busyAction !== null}
              className="m3-btn-sm w-full bg-surface-container-lowest text-xs font-bold text-on-surface hover:bg-secondary-container hover:text-on-secondary-container disabled:opacity-50"
            >
              <Icon name="content_copy" size={18} />
              Copiar Texto
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              disabled={busyAction !== null}
              className="m3-btn-sm w-full bg-surface-container-lowest text-xs font-bold text-on-surface hover:bg-secondary-container hover:text-on-secondary-container disabled:opacity-50"
            >
              <Icon name="image" size={18} />
              {busyAction === 'image' ? 'Copiando...' : 'Copiar Imagen'}
            </button>

            <button
              type="button"
              onClick={handleDownloadJpg}
              disabled={busyAction !== null}
              className="m3-btn-sm w-full bg-secondary-container text-xs font-bold text-on-secondary-container hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="download" size={18} />
              {busyAction === 'jpg' ? 'Generando...' : 'Descargar JPG'}
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={busyAction !== null}
              className="m3-btn-sm w-full bg-tertiary-container text-xs font-bold text-on-tertiary-container hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="picture_as_pdf" size={18} />
              {busyAction === 'pdf' ? 'Generando...' : 'Descargar PDF'}
            </button>
          </div>
        </section>
      </main>
  );
};

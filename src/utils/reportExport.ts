import type { FeriaEvent } from '../types';
import { formatMoney, type EventResults } from './calculations';

const FONT_FAMILY = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";

const M3 = {
  surface: '#FEF7FF',
  surfaceLowest: '#FFFFFF',
  surfaceLow: '#F7F2FA',
  surfaceContainer: '#F3EDF7',
  surfaceHigh: '#ECE6F0',
  surfaceHighest: '#E6E0E9',
  onSurface: '#1D1B20',
  onSurfaceVariant: '#49454F',
  outlineVariant: '#CAC4D0',
  primary: '#6750A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EADDFF',
  onPrimaryContainer: '#21005D',
  secondaryContainer: '#E8DEF8',
  onSecondaryContainer: '#1D192B',
  tertiary: '#7D5260',
  tertiaryContainer: '#FFD8E4',
  onTertiaryContainer: '#31111D',
  success: '#146C2E',
  successContainer: '#C4EED0',
  onSuccessContainer: '#072711',
  error: '#B3261E',
  errorContainer: '#F9DEDC',
  onErrorContainer: '#410E0B',
};

const BUBBLE_COLORS = [
  { bg: '#FFD8E4', text: '#31111D', rot: -0.1 },
  { bg: '#EADDFF', text: '#21005D', rot: 0.06 },
  { bg: '#C4EED0', text: '#072711', rot: -0.06 },
  { bg: '#E8DEF8', text: '#1D192B', rot: 0.1 },
  { bg: '#E6E0E9', text: '#1D1B20', rot: -0.04 },
];

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.closePath();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  bgColor: string,
  textColor: string,
  font = `700 18px ${FONT_FAMILY}`,
  padX = 18,
  height = 38
): number {
  ctx.save();
  ctx.font = font;
  const textW = ctx.measureText(text).width;
  const w = textW + padX * 2;
  drawRoundRect(ctx, x, y, w, height, height / 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + height / 2 + 1);
  ctx.restore();
  return w;
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
}

function slugifyFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'feria'
  );
}

/**
 * Renders the full M3 Expressive Results Infographic on a high-res Canvas 2D.
 */
export function renderResultsInfographicCanvas(
  event: FeriaEvent,
  results: EventResults
): HTMLCanvasElement {
  const W = 1200;
  const pad = 48;
  const contentW = W - pad * 2;
  const colGap = 28;
  const halfW = (contentW - colGap) / 2;

  const ownerMap = new Map<string, { name: string; color: string }>();
  event.participants.forEach((p) => ownerMap.set(p.id, { name: p.name, color: p.color }));
  event.sharedEntities.forEach((s) => ownerMap.set(s.id, { name: s.name, color: s.color }));

  const safeTotal = results.totalRevenue;
  const avgTicket = results.salesCount > 0 ? Math.round(safeTotal / results.salesCount) : 0;
  const cashPct = safeTotal > 0 ? Math.round((results.cashTotal / safeTotal) * 100) : 0;
  const transferPct = safeTotal > 0 ? 100 - cashPct : 0;
  const netBalance = safeTotal - results.totalExpenses;
  const marginPct = safeTotal > 0 ? Math.round((netBalance / safeTotal) * 100) : 0;

  // Dynamic height calculation for sections that grow with items
  const headerH = 92;
  const heroH = 420;
  const expensesListH = event.expenses.length > 0 ? Math.min(event.expenses.length, 4) * 40 + 16 : 0;
  const row2H = Math.max(360, 290 + expensesListH);

  const artistRowH = 120;
  const artistsBlockH = 88 + Math.max(1, results.participantResults.length) * artistRowH;
  const settlementItemsCount =
    results.transferSettlements.length +
    results.participantResults.filter((r) => r.cashFromPot !== 0).length;
  const settlementBlockH =
    110 +
    results.participantResults.length * 32 +
    Math.max(1, settlementItemsCount) * 62;
  const row3H = Math.max(artistsBlockH, settlementBlockH, 320);

  const visibleTopProducts = results.topProducts.slice(0, 6);
  const topListH = 92 + Math.max(1, visibleTopProducts.length) * 86;
  const row4H = Math.max(330, topListH);

  const footerH = 64;
  const H = pad + headerH + 24 + heroH + 28 + row2H + 28 + row3H + 28 + row4H + 24 + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el lienzo 2D.');
  }

  // Background
  ctx.fillStyle = M3.surface;
  ctx.fillRect(0, 0, W, H);

  let curY = pad;

  // ── HEADER ──────────────────────────────────────────────────────────────────
  drawRoundRect(ctx, pad, curY, contentW, headerH, 28);
  ctx.fillStyle = M3.surfaceContainer;
  ctx.fill();

  ctx.fillStyle = M3.primaryContainer;
  drawRoundRect(ctx, pad + 18, curY + 18, 56, 56, 18);
  ctx.fill();
  ctx.fillStyle = M3.onPrimaryContainer;
  ctx.font = `800 26px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('F', pad + 46, curY + 47);

  ctx.textAlign = 'left';
  ctx.fillStyle = M3.onSurface;
  ctx.font = `800 28px ${FONT_FAMILY}`;
  ctx.fillText(truncateText(ctx, event.name, 560), pad + 92, curY + 36);
  ctx.fillStyle = M3.onSurfaceVariant;
  ctx.font = `600 18px ${FONT_FAMILY}`;
  ctx.fillText(`Cierre de Feria • ${event.date}`, pad + 92, curY + 66);

  const salesBadgeText = `${results.salesCount} venta(s)`;
  ctx.font = `700 18px ${FONT_FAMILY}`;
  const badgeW = ctx.measureText(salesBadgeText).width + 36;
  drawPill(
    ctx,
    pad + contentW - badgeW - 22,
    curY + 27,
    salesBadgeText,
    M3.primaryContainer,
    M3.onPrimaryContainer
  );

  curY += headerH + 24;

  // ── SECTION 1: HERO CARD + PILL-ARC RING ────────────────────────────────────
  drawRoundRect(ctx, pad, curY, contentW, heroH, 32);
  ctx.fillStyle = M3.surfaceLow;
  ctx.fill();

  // Ring center
  const ringCx = pad + 230;
  const ringCy = curY + heroH / 2;
  const ringR = 132;
  const ringWidth = 30;

  // Track
  ctx.beginPath();
  ctx.arc(ringCx, ringCy, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = M3.surfaceHighest;
  ctx.lineWidth = ringWidth;
  ctx.stroke();

  const activeParticipants = results.participantResults.filter((r) => r.earned > 0);
  if (activeParticipants.length > 0 && safeTotal > 0) {
    const totalEarned = activeParticipants.reduce((s, r) => s + r.earned, 0);
    if (activeParticipants.length === 1) {
      const only = activeParticipants[0];
      ctx.beginPath();
      ctx.arc(ringCx, ringCy, ringR, -Math.PI / 2, Math.PI * 1.5);
      ctx.strokeStyle = only.participant.color;
      ctx.lineWidth = ringWidth;
      ctx.stroke();

      const bx = ringCx;
      const by = ringCy - ringR;
      ctx.beginPath();
      ctx.arc(bx, by, 18, 0, Math.PI * 2);
      ctx.fillStyle = only.participant.color;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = M3.surfaceLow;
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `800 15px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(only.participant.name.charAt(0).toUpperCase(), bx, by + 1);
    } else {
      const gapDeg = Math.min(24, Math.floor(140 / activeParticipants.length));
      const availDeg = 360 - activeParticipants.length * gapDeg;
      let sweeps = activeParticipants.map((r) => Math.max(6, (r.earned / totalEarned) * availDeg));
      const sweepSum = sweeps.reduce((a, b) => a + b, 0);
      sweeps = sweeps.map((s) => (s / sweepSum) * availDeg);

      let degCursor = gapDeg / 2;
      activeParticipants.forEach((r, idx) => {
        const startDeg = degCursor;
        const endDeg = degCursor + sweeps[idx];
        degCursor = endDeg + gapDeg;

        const startRad = ((startDeg - 90) * Math.PI) / 180;
        const endRad = ((endDeg - 90) * Math.PI) / 180;

        ctx.beginPath();
        ctx.arc(ringCx, ringCy, ringR, startRad, endRad);
        ctx.strokeStyle = r.participant.color;
        ctx.lineWidth = ringWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        const bx = ringCx + ringR * Math.cos(startRad);
        const by = ringCy + ringR * Math.sin(startRad);
        ctx.beginPath();
        ctx.arc(bx, by, 18, 0, Math.PI * 2);
        ctx.fillStyle = r.participant.color;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = M3.surfaceLow;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `800 15px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.participant.name.charAt(0).toUpperCase(), bx, by + 1);
      });
    }
  }

  // Ring Center Text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = M3.onSurfaceVariant;
  ctx.font = `700 15px ${FONT_FAMILY}`;
  ctx.fillText('RECAUDADO', ringCx, ringCy - 34);
  ctx.fillStyle = M3.onSurface;
  ctx.font = `800 38px ${FONT_FAMILY}`;
  ctx.fillText(formatMoney(safeTotal), ringCx, ringCy + 4);
  ctx.fillStyle = M3.onSurfaceVariant;
  ctx.font = `600 16px ${FONT_FAMILY}`;
  ctx.fillText(
    results.salesCount > 0 ? `Ticket prom: ${formatMoney(avgTicket)}` : 'Sin ventas aún',
    ringCx,
    ringCy + 42
  );

  // Right side of Hero: Participant chips + Gastos & Balance
  const rightX = pad + 440;
  const rightW = contentW - 472;
  ctx.textAlign = 'left';
  ctx.fillStyle = M3.onSurfaceVariant;
  ctx.font = `700 16px ${FONT_FAMILY}`;
  ctx.fillText('PARTICIPACIÓN EN VENTAS', rightX, curY + 56);

  let chipX = rightX;
  let chipY = curY + 80;
  results.participantResults.forEach((r) => {
    const pct = safeTotal > 0 ? Math.round((r.earned / safeTotal) * 100) : 0;
    const label = `${r.participant.name}  ${pct}%`;
    ctx.font = `700 18px ${FONT_FAMILY}`;
    const chipW = ctx.measureText(label).width + 62;
    if (chipX + chipW > rightX + rightW) {
      chipX = rightX;
      chipY += 52;
    }
    drawRoundRect(ctx, chipX, chipY, chipW, 42, 21);
    ctx.fillStyle = M3.surfaceLowest;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(chipX + 22, chipY + 21, 8, 0, Math.PI * 2);
    ctx.fillStyle = r.participant.color;
    ctx.fill();

    ctx.fillStyle = M3.onSurface;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, chipX + 40, chipY + 22);
    chipX += chipW + 12;
  });

  // Two summary mini cards
  const miniY = curY + heroH - 134;
  const miniW = (rightW - 18) / 2;

  drawRoundRect(ctx, rightX, miniY, miniW, 96, 20);
  ctx.fillStyle = M3.surfaceLowest;
  ctx.fill();
  ctx.fillStyle = M3.onSurfaceVariant;
  ctx.font = `700 16px ${FONT_FAMILY}`;
  ctx.fillText('Gastos del Stand', rightX + 20, miniY + 30);
  ctx.fillStyle = M3.tertiary;
  ctx.font = `800 30px ${FONT_FAMILY}`;
  ctx.fillText(formatMoney(results.totalExpenses), rightX + 20, miniY + 68);

  drawRoundRect(ctx, rightX + miniW + 18, miniY, miniW, 96, 20);
  ctx.fillStyle = M3.surfaceLowest;
  ctx.fill();
  ctx.fillStyle = M3.onSurfaceVariant;
  ctx.font = `700 16px ${FONT_FAMILY}`;
  ctx.fillText('Balance Neto', rightX + miniW + 38, miniY + 30);
  ctx.fillStyle = netBalance >= 0 ? M3.success : M3.error;
  ctx.font = `800 30px ${FONT_FAMILY}`;
  ctx.fillText(formatMoney(netBalance), rightX + miniW + 38, miniY + 68);

  curY += heroH + 28;

  // ── SECTION 2: MEDIOS DE PAGO & INGRESOS VS GASTOS ──────────────────────────
  // Left card: Medios de Pago
  drawRoundRect(ctx, pad, curY, halfW, row2H, 28);
  ctx.fillStyle = M3.surfaceLow;
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = M3.onSurfaceVariant;
  ctx.font = `700 16px ${FONT_FAMILY}`;
  ctx.fillText('MEDIOS DE PAGO', pad + 28, curY + 42);

  if (safeTotal === 0) {
    drawRoundRect(ctx, pad + 28, curY + 78, halfW - 56, row2H - 110, 20);
    ctx.fillStyle = M3.surfaceLowest;
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = M3.onSurfaceVariant;
    ctx.font = `600 18px ${FONT_FAMILY}`;
    ctx.fillText('Sin ventas registradas aún.', pad + halfW / 2, curY + row2H / 2 + 12);
  } else {
    const splitInnerW = halfW - 56;
    const splitGap = 16;
    const availW = splitInnerW - splitGap;
    const cashWeight = Math.max(cashPct, 24);
    const transfWeight = Math.max(transferPct, 24);
    const totalWeight = cashWeight + transfWeight;
    const cashW = Math.round((cashWeight / totalWeight) * availW);
    const transfW = availW - cashW;
    const blockY = curY + 96;
    const blockH = 88;

    // Cash block
    drawRoundRect(ctx, pad + 28, blockY, cashW, blockH, 20);
    ctx.fillStyle = M3.successContainer;
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = M3.onSuccessContainer;
    ctx.font = `800 22px ${FONT_FAMILY}`;
    ctx.fillText(formatMoney(results.cashTotal), pad + 28 + cashW / 2, blockY + blockH / 2 + 1);

    // Connector + %
    const cashCx = pad + 28 + cashW / 2;
    ctx.strokeStyle = M3.outlineVariant;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cashCx, blockY + blockH);
    ctx.lineTo(cashCx, blockY + blockH + 28);
    ctx.stroke();

    ctx.fillStyle = M3.onSurface;
    ctx.font = `800 34px ${FONT_FAMILY}`;
    ctx.fillText(`${cashPct}%`, cashCx, blockY + blockH + 54);
    ctx.fillStyle = M3.onSurfaceVariant;
    ctx.font = `700 17px ${FONT_FAMILY}`;
    ctx.fillText('Efectivo', cashCx, blockY + blockH + 86);

    // Transfer block
    const transfX = pad + 28 + cashW + splitGap;
    drawRoundRect(ctx, transfX, blockY, transfW, blockH, 20);
    ctx.fillStyle = M3.primaryContainer;
    ctx.fill();
    ctx.fillStyle = M3.onPrimaryContainer;
    ctx.font = `800 22px ${FONT_FAMILY}`;
    ctx.fillText(formatMoney(results.transferTotal), transfX + transfW / 2, blockY + blockH / 2 + 1);

    const transfCx = transfX + transfW / 2;
    ctx.strokeStyle = M3.outlineVariant;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(transfCx, blockY + blockH);
    ctx.lineTo(transfCx, blockY + blockH + 28);
    ctx.stroke();

    ctx.fillStyle = M3.onSurface;
    ctx.font = `800 34px ${FONT_FAMILY}`;
    ctx.fillText(`${transferPct}%`, transfCx, blockY + blockH + 54);
    ctx.fillStyle = M3.onSurfaceVariant;
    ctx.font = `700 17px ${FONT_FAMILY}`;
    ctx.fillText('Transferencia', transfCx, blockY + blockH + 86);
  }

  // Right card: Ingresos vs Gastos
  const rightCardX = pad + halfW + colGap;
  drawRoundRect(ctx, rightCardX, curY, halfW, row2H, 28);
  ctx.fillStyle = M3.surfaceLow;
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = M3.onSurfaceVariant;
  ctx.font = `700 16px ${FONT_FAMILY}`;
  ctx.fillText('INGRESOS VS. GASTOS', rightCardX + 28, curY + 42);

  const marginBadge = safeTotal > 0 ? `${marginPct}% margen` : 'Sin ingresos';
  ctx.font = `700 16px ${FONT_FAMILY}`;
  const mbW = ctx.measureText(marginBadge).width + 32;
  drawPill(
    ctx,
    rightCardX + halfW - mbW - 24,
    curY + 23,
    marginBadge,
    netBalance >= 0 ? M3.successContainer : M3.errorContainer,
    netBalance >= 0 ? M3.onSuccessContainer : M3.onErrorContainer,
    `700 16px ${FONT_FAMILY}`,
    16,
    34
  );

  const chartBoxY = curY + 72;
  const chartBoxH = 200;
  drawRoundRect(ctx, rightCardX + 28, chartBoxY, halfW - 56, chartBoxH, 20);
  ctx.fillStyle = M3.surfaceLowest;
  ctx.fill();

  const maxBar = Math.max(safeTotal, results.totalExpenses, 1);
  const maxBarH = 112;
  const barW = 128;
  const incH = safeTotal > 0 ? Math.max(24, Math.round((safeTotal / maxBar) * maxBarH)) : 16;
  const expH =
    results.totalExpenses > 0
      ? Math.max(24, Math.round((results.totalExpenses / maxBar) * maxBarH))
      : 16;
  const barBaseY = chartBoxY + chartBoxH - 36;
  const bar1X = rightCardX + halfW / 2 - barW - 24;
  const bar2X = rightCardX + halfW / 2 + 24;

  // Ingresos bar
  ctx.textAlign = 'center';
  ctx.fillStyle = M3.onSurface;
  ctx.font = `800 18px ${FONT_FAMILY}`;
  ctx.fillText(formatMoney(safeTotal), bar1X + barW / 2, barBaseY - incH - 16);
  drawRoundRect(ctx, bar1X, barBaseY - incH, barW, incH, 16);
  ctx.fillStyle = M3.primary;
  ctx.fill();
  ctx.fillStyle = M3.onSurfaceVariant;
  ctx.font = `700 16px ${FONT_FAMILY}`;
  ctx.fillText('Ingresos', bar1X + barW / 2, barBaseY + 20);

  // Gastos bar with diagonal hatch
  ctx.fillStyle = M3.onSurface;
  ctx.font = `800 18px ${FONT_FAMILY}`;
  ctx.fillText(formatMoney(results.totalExpenses), bar2X + barW / 2, barBaseY - expH - 16);

  ctx.save();
  drawRoundRect(ctx, bar2X, barBaseY - expH, barW, expH, 16);
  ctx.fillStyle = M3.tertiaryContainer;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(125, 82, 96, 0.35)';
  ctx.lineWidth = 6;
  for (let d = -expH - barW; d < barW + expH; d += 16) {
    ctx.beginPath();
    ctx.moveTo(bar2X + d, barBaseY - expH - 10);
    ctx.lineTo(bar2X + d + expH + 20, barBaseY + 10);
    ctx.stroke();
  }
  ctx.restore();

  drawRoundRect(ctx, bar2X, barBaseY - expH, barW, expH, 16);
  ctx.strokeStyle = 'rgba(125, 82, 96, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = M3.onSurfaceVariant;
  ctx.font = `700 16px ${FONT_FAMILY}`;
  ctx.fillText('Gastos', bar2X + barW / 2, barBaseY + 20);

  // Expenses list inside right card
  if (event.expenses.length > 0) {
    let expY = chartBoxY + chartBoxH + 14;
    event.expenses.slice(0, 4).forEach((exp) => {
      const payer = ownerMap.get(exp.paidBy);
      drawRoundRect(ctx, rightCardX + 28, expY, halfW - 56, 34, 10);
      ctx.fillStyle = M3.surfaceLowest;
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillStyle = M3.onSurface;
      ctx.font = `600 15px ${FONT_FAMILY}`;
      ctx.fillText(
        truncateText(ctx, `${exp.description} (pagó ${payer?.name ?? '?'})`, halfW - 190),
        rightCardX + 42,
        expY + 18
      );
      ctx.textAlign = 'right';
      ctx.fillStyle = M3.tertiary;
      ctx.font = `800 15px ${FONT_FAMILY}`;
      ctx.fillText(formatMoney(exp.amount), rightCardX + halfW - 42, expY + 18);
      expY += 40;
    });
  }

  curY += row2H + 28;

  // ── SECTION 3: GANANCIA REAL POR ARTISTA & LIQUIDACIÓN DE CAJA ──────────────
  // Left card: Artists
  drawRoundRect(ctx, pad, curY, halfW, row3H, 28);
  ctx.fillStyle = M3.surfaceLow;
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = M3.onSurfaceVariant;
  ctx.font = `700 16px ${FONT_FAMILY}`;
  ctx.fillText('GANANCIA REAL POR ARTISTA', pad + 28, curY + 42);

  let artY = curY + 68;
  results.participantResults.forEach((r) => {
    const sharePct = safeTotal > 0 ? Math.round((r.earned / safeTotal) * 100) : 0;
    const cardH = 104;
    drawRoundRect(ctx, pad + 28, artY, halfW - 56, cardH, 20);
    ctx.fillStyle = M3.surfaceLowest;
    ctx.fill();

    // Avatar
    ctx.beginPath();
    ctx.arc(pad + 62, artY + 36, 20, 0, Math.PI * 2);
    ctx.fillStyle = r.participant.color;
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = `800 18px ${FONT_FAMILY}`;
    ctx.fillText(r.participant.name.charAt(0).toUpperCase(), pad + 62, artY + 37);

    // Name & Earned
    ctx.textAlign = 'left';
    ctx.fillStyle = M3.onSurface;
    ctx.font = `800 18px ${FONT_FAMILY}`;
    ctx.fillText(truncateText(ctx, r.participant.name, 200), pad + 94, artY + 26);
    ctx.fillStyle = M3.primary;
    ctx.font = `700 18px ${FONT_FAMILY}`;
    ctx.fillText(formatMoney(r.earned), pad + 94, artY + 50);

    // Big %
    ctx.textAlign = 'right';
    ctx.fillStyle = M3.onSurface;
    ctx.font = `800 28px ${FONT_FAMILY}`;
    ctx.fillText(`${sharePct}%`, pad + halfW - 46, artY + 34);

    // Progress pill
    const barTrackX = pad + 44;
    const barTrackW = halfW - 88;
    const barTrackY = artY + 72;
    drawRoundRect(ctx, barTrackX, barTrackY, barTrackW, 12, 6);
    ctx.fillStyle = M3.surfaceHigh;
    ctx.fill();
    if (sharePct > 0) {
      drawRoundRect(
        ctx,
        barTrackX,
        barTrackY,
        Math.max(12, Math.round((sharePct / 100) * barTrackW)),
        12,
        6
      );
      ctx.fillStyle = r.participant.color;
      ctx.fill();
    }

    artY += artistRowH;
  });

  // Right card: Liquidación de Caja
  drawRoundRect(ctx, rightCardX, curY, halfW, row3H, 28);
  ctx.fillStyle = M3.surfaceLow;
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = M3.onSurfaceVariant;
  ctx.font = `700 16px ${FONT_FAMILY}`;
  ctx.fillText('LIQUIDACIÓN DE CAJA', rightCardX + 28, curY + 42);

  const summaryBoxH = 24 + results.participantResults.length * 30;
  drawRoundRect(ctx, rightCardX + 28, curY + 68, halfW - 56, summaryBoxH, 16);
  ctx.fillStyle = M3.surfaceLowest;
  ctx.fill();

  let trY = curY + 90;
  results.participantResults.forEach((r) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = M3.onSurfaceVariant;
    ctx.font = `600 16px ${FONT_FAMILY}`;
    ctx.fillText(`${r.participant.name} cobró por transf.:`, rightCardX + 44, trY);
    ctx.textAlign = 'right';
    ctx.fillStyle = M3.onSurface;
    ctx.font = `800 16px ${FONT_FAMILY}`;
    ctx.fillText(formatMoney(r.transfersReceived), rightCardX + halfW - 44, trY);
    trY += 30;
  });

  let setY = curY + 68 + summaryBoxH + 16;
  results.transferSettlements.forEach((t) => {
    drawRoundRect(ctx, rightCardX + 28, setY, halfW - 56, 48, 16);
    ctx.fillStyle = M3.secondaryContainer;
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = M3.onSecondaryContainer;
    ctx.font = `700 17px ${FONT_FAMILY}`;
    ctx.fillText(`${t.from.name}  →  ${t.to.name}`, rightCardX + 44, setY + 25);
    ctx.textAlign = 'right';
    ctx.font = `800 18px ${FONT_FAMILY}`;
    ctx.fillText(formatMoney(t.amount), rightCardX + halfW - 44, setY + 25);
    setY += 58;
  });

  results.participantResults.forEach((r) => {
    if (r.cashFromPot === 0) return;
    const isPositive = r.cashFromPot > 0;
    drawRoundRect(ctx, rightCardX + 28, setY, halfW - 56, 48, 16);
    ctx.fillStyle = isPositive ? M3.successContainer : M3.tertiaryContainer;
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = isPositive ? M3.onSuccessContainer : M3.onTertiaryContainer;
    ctx.font = `700 17px ${FONT_FAMILY}`;
    ctx.fillText(
      `${r.participant.name} ${isPositive ? 'retira del efectivo:' : 'aporta al pozo:'}`,
      rightCardX + 44,
      setY + 25
    );
    ctx.textAlign = 'right';
    ctx.font = `800 18px ${FONT_FAMILY}`;
    ctx.fillText(formatMoney(Math.abs(r.cashFromPot)), rightCardX + halfW - 44, setY + 25);
    setY += 58;
  });

  if (
    results.transferSettlements.length === 0 &&
    results.participantResults.every((r) => r.cashFromPot === 0)
  ) {
    ctx.textAlign = 'left';
    ctx.fillStyle = M3.onSurfaceVariant;
    ctx.font = `600 16px ${FONT_FAMILY}`;
    ctx.fillText('Cuentas saldadas (sin movimientos pendientes).', rightCardX + 32, setY + 22);
  }

  curY += row3H + 28;

  // ── SECTION 4: LO MÁS VENDIDO (BUBBLES + PROGRESS BARS) ─────────────────────
  drawRoundRect(ctx, pad, curY, contentW, row4H, 28);
  ctx.fillStyle = M3.surfaceLow;
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = M3.onSurfaceVariant;
  ctx.font = `700 16px ${FONT_FAMILY}`;
  ctx.fillText('LO MÁS VENDIDO', pad + 28, curY + 42);

  const totalUnitsSold = results.topProducts.reduce((s, p) => s + p.unitsSold, 0);
  const maxProductUnits = results.topProducts[0]?.unitsSold ?? 1;

  if (totalUnitsSold > 0) {
    const unitsPill = `${totalUnitsSold} unidades totales`;
    ctx.font = `700 16px ${FONT_FAMILY}`;
    const upW = ctx.measureText(unitsPill).width + 32;
    drawPill(
      ctx,
      pad + contentW - upW - 28,
      curY + 22,
      unitsPill,
      M3.surfaceHighest,
      M3.onSurfaceVariant,
      `700 16px ${FONT_FAMILY}`,
      16,
      34
    );
  }

  if (results.topProducts.length === 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = M3.onSurfaceVariant;
    ctx.font = `600 18px ${FONT_FAMILY}`;
    ctx.fillText('Todavía no se registraron ventas.', W / 2, curY + row4H / 2 + 12);
  } else {
    // Left sub-box: Packed Bubbles (Top 5)
    const bubbleBoxW = 420;
    const bubbleBoxH = row4H - 96;
    drawRoundRect(ctx, pad + 28, curY + 68, bubbleBoxW, bubbleBoxH, 24);
    ctx.fillStyle = M3.surfaceLowest;
    ctx.fill();

    const bubbleCenterX = pad + 28 + bubbleBoxW / 2;
    const bubbleCenterY = curY + 68 + bubbleBoxH / 2;
    const offsets = [
      { dx: -44, dy: -22 },
      { dx: 82, dy: -46 },
      { dx: 64, dy: 64 },
      { dx: -92, dy: 72 },
      { dx: -120, dy: -88 },
    ];

    results.topProducts.slice(0, 5).forEach((item, idx) => {
      const pct = totalUnitsSold > 0 ? Math.round((item.unitsSold / totalUnitsSold) * 100) : 0;
      const ratio = item.unitsSold / maxProductUnits;
      const radius = Math.round(42 + ratio * 28); // 42..70 -> 84..140px
      const pal = BUBBLE_COLORS[idx % BUBBLE_COLORS.length];
      const owner = ownerMap.get(item.ownerId);
      const pos = offsets[idx] ?? { dx: 0, dy: 0 };
      const bx = bubbleCenterX + pos.dx;
      const by = bubbleCenterY + pos.dy;

      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.fillStyle = pal.bg;
      ctx.fill();

      ctx.save();
      ctx.translate(bx, by - 10);
      ctx.rotate(pal.rot);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = pal.text;
      ctx.font = `900 ${radius >= 60 ? 28 : 22}px ${FONT_FAMILY}`;
      ctx.fillText(`${pct}%`, 0, 0);
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.fillStyle = pal.text;
      ctx.font = `700 13px ${FONT_FAMILY}`;
      ctx.fillText(truncateText(ctx, item.productName, radius * 1.5), bx, by + 20);

      if (owner) {
        ctx.beginPath();
        ctx.arc(bx, by + 35, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = owner.color;
        ctx.fill();
      }
    });

    // Right sub-box: Capsule Ranking List
    const listX = pad + 28 + bubbleBoxW + 24;
    const listW = contentW - 56 - bubbleBoxW - 24;
    let itemY = curY + 68;

    visibleTopProducts.forEach((item, idx) => {
      const owner = ownerMap.get(item.ownerId);
      const unitPct = totalUnitsSold > 0 ? Math.round((item.unitsSold / totalUnitsSold) * 100) : 0;
      const barWidthPct = Math.max(0.08, item.unitsSold / maxProductUnits);
      const barColor = owner?.color ?? M3.primary;

      drawRoundRect(ctx, listX, itemY, listW, 74, 16);
      ctx.fillStyle = M3.surfaceLowest;
      ctx.fill();

      // Rank circle
      ctx.beginPath();
      ctx.arc(listX + 28, itemY + 26, 13, 0, Math.PI * 2);
      ctx.fillStyle = M3.surfaceHigh;
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = M3.onSurface;
      ctx.font = `800 13px ${FONT_FAMILY}`;
      ctx.fillText(String(idx + 1), listX + 28, itemY + 27);

      // Owner dot + product name
      ctx.beginPath();
      ctx.arc(listX + 54, itemY + 26, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = barColor;
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.fillStyle = M3.onSurface;
      ctx.font = `700 17px ${FONT_FAMILY}`;
      ctx.fillText(
        truncateText(ctx, `${item.productName} (${owner?.name ?? '?'})`, listW - 210),
        listX + 68,
        itemY + 27
      );

      ctx.textAlign = 'right';
      ctx.fillStyle = M3.onSurface;
      ctx.font = `800 17px ${FONT_FAMILY}`;
      ctx.fillText(`${item.unitsSold} u. (${unitPct}%)`, listX + listW - 18, itemY + 27);

      // Progress bar + Revenue
      const pTrackX = listX + 18;
      const pTrackW = listW - 150;
      const pTrackY = itemY + 49;
      drawRoundRect(ctx, pTrackX, pTrackY, pTrackW, 10, 5);
      ctx.fillStyle = M3.surfaceHigh;
      ctx.fill();
      drawRoundRect(ctx, pTrackX, pTrackY, Math.max(10, Math.round(barWidthPct * pTrackW)), 10, 5);
      ctx.fillStyle = barColor;
      ctx.fill();

      ctx.textAlign = 'right';
      ctx.fillStyle = M3.onSurfaceVariant;
      ctx.font = `700 15px ${FONT_FAMILY}`;
      ctx.fillText(formatMoney(item.revenue), listX + listW - 18, itemY + 55);

      itemY += 84;
    });
  }

  curY += row4H + 24;

  // ── FOOTER ──────────────────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.fillStyle = M3.onSurfaceVariant;
  ctx.font = `600 15px ${FONT_FAMILY}`;
  ctx.fillText('Generado con Feriando • Reporte offline de cierre', W / 2, curY + 24);

  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar la imagen del reporte.'));
      },
      mimeType,
      quality
    );
  });
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copies the high-res PNG infographic directly to the system clipboard (for Ctrl+V into WhatsApp Web/Desktop).
 */
export async function copyResultsImageToClipboard(
  event: FeriaEvent,
  results: EventResults
): Promise<void> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('Tu navegador no permite copiar imágenes directamente al portapapeles.');
  }
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  const canvas = renderResultsInfographicCanvas(event, results);
  const pngBlob = await canvasToBlob(canvas, 'image/png');
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
}

/**
 * Downloads the high-res JPG infographic.
 */
export async function downloadResultsJpg(
  event: FeriaEvent,
  results: EventResults
): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  const canvas = renderResultsInfographicCanvas(event, results);
  const jpgBlob = await canvasToBlob(canvas, 'image/jpeg', 0.94);
  triggerBlobDownload(jpgBlob, `resumen-${slugifyFileName(event.name)}.jpg`);
}

/**
 * Builds a minimal, standard PDF 1.4 document embedding the JPEG infographic stream (DCTDecode).
 */
function buildPdfFromJpeg(
  jpegBytes: Uint8Array,
  imgWidth: number,
  imgHeight: number
): Uint8Array {
  const pageWidthPt = 595; // A4 width in points
  const pageHeightPt = Math.round(pageWidthPt * (imgHeight / imgWidth));
  const encoder = new TextEncoder();

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0]; // obj 0 free
  let byteLength = 0;

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    byteLength += bytes.length;
  };
  const pushStr = (str: string) => pushBytes(encoder.encode(str));

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // 1: Catalog
  offsets.push(byteLength);
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2: Pages
  offsets.push(byteLength);
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // 3: Page
  offsets.push(byteLength);
  pushStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  // 4: Image XObject (JPEG DCTDecode)
  offsets.push(byteLength);
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushStr('\nendstream\nendobj\n');

  // 5: Content stream
  const contentStream = `q\n${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm\n/Im0 Do\nQ\n`;
  offsets.push(byteLength);
  pushStr(
    `5 0 obj\n<< /Length ${encoder.encode(contentStream).length} >>\nstream\n${contentStream}endstream\nendobj\n`
  );

  // xref
  const xrefOffset = byteLength;
  pushStr(`xref\n0 ${offsets.length}\n`);
  pushStr('0000000000 65535 f \n');
  for (let i = 1; i < offsets.length; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const merged = new Uint8Array(byteLength);
  let cursor = 0;
  for (const chunk of chunks) {
    merged.set(chunk, cursor);
    cursor += chunk.length;
  }
  return merged;
}

/**
 * Downloads a 1-page high-res PDF report containing the complete infographic.
 */
export async function downloadResultsPdf(
  event: FeriaEvent,
  results: EventResults
): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  const canvas = renderResultsInfographicCanvas(event, results);
  const jpgBlob = await canvasToBlob(canvas, 'image/jpeg', 0.94);
  const jpgBuffer = await jpgBlob.arrayBuffer();
  const pdfBytes = buildPdfFromJpeg(
    new Uint8Array(jpgBuffer),
    canvas.width,
    canvas.height
  );
  const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  triggerBlobDownload(pdfBlob, `resumen-${slugifyFileName(event.name)}.pdf`);
}

/**
 * Shares both the infographic image file and the WhatsApp summary text using the native Web Share API (if supported).
 * Returns true if native share was triggered, false if unsupported (desktop browsers).
 */
export async function shareResultsWithImageAndText(
  event: FeriaEvent,
  results: EventResults,
  summaryText: string
): Promise<boolean> {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  const canvas = renderResultsInfographicCanvas(event, results);
  const jpgBlob = await canvasToBlob(canvas, 'image/jpeg', 0.94);
  const file = new File([jpgBlob], `resumen-${slugifyFileName(event.name)}.jpg`, {
    type: 'image/jpeg',
  });

  if (!navigator.canShare({ files: [file] })) {
    return false;
  }

  await navigator.share({
    title: `Resumen — ${event.name}`,
    text: summaryText,
    files: [file],
  });
  return true;
}

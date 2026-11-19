import type {
  CartEntry,
  FeriaEvent,
  Participant,
  Product,
  PromoFamily,
  SaleItem,
} from '../types';

/**
 * Distributes an integer `total` across `weights` using Hamilton (largest remainder)
 * so that the sum of returned integers equals `total` exactly.
 */
export function prorateInteger(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const roundedTotal = Math.round(total);
  const sumWeights = weights.reduce((acc, w) => acc + Math.max(0, w), 0);

  const exactShares =
    sumWeights > 0
      ? weights.map((w) => (roundedTotal * Math.max(0, w)) / sumWeights)
      : weights.map(() => roundedTotal / n);

  const floors = exactShares.map((s) => Math.trunc(s));
  let remainder = roundedTotal - floors.reduce((a, b) => a + b, 0);

  if (remainder !== 0) {
    const step = remainder > 0 ? 1 : -1;
    const indices = exactShares
      .map((s, idx) => ({ idx, frac: Math.abs(s - floors[idx]) }))
      .sort((a, b) => b.frac - a.frac);

    let i = 0;
    while (remainder !== 0) {
      floors[indices[i % n].idx] += step;
      remainder -= step;
      i++;
    }
  }

  return floors;
}

/**
 * Computes the minimum possible cost for `basePrices.length` items of a promo family
 * using dynamic programming over `tiers` and individual `basePrices`.
 */
export function calculateOptimalFamilyTotal(
  basePrices: number[],
  tiers: Record<number, number>
): number {
  const n = basePrices.length;
  if (n === 0) return 0;

  const sortedPrices = [...basePrices].sort((a, b) => b - a);
  const tierEntries = Object.entries(tiers)
    .map(([qty, price]) => [Number(qty), Number(price)] as const)
    .filter(([qty, price]) => Number.isFinite(qty) && qty >= 1 && Number.isFinite(price) && price >= 0);

  const dp = new Array<number>(n + 1).fill(Infinity);
  dp[0] = 0;

  const tier1Price = tiers[1];

  for (let i = 1; i <= n; i++) {
    // Fallback / 1-unit step
    const singleUnitCost =
      tier1Price !== undefined ? Math.min(tier1Price, sortedPrices[i - 1]) : sortedPrices[i - 1];
    dp[i] = Math.min(dp[i], dp[i - 1] + singleUnitCost);

    // Multi-unit tiers
    for (const [qty, price] of tierEntries) {
      if (qty >= 2 && qty <= i) {
        dp[i] = Math.min(dp[i], dp[i - qty] + price);
      }
    }
  }

  return Math.round(dp[n]);
}

export interface CartCalculationResult {
  baseSubtotal: number;
  promoSubtotal: number;
  promoSavings: number;
  finalTotal: number;
  saleItems: SaleItem[];
  promoFamiliesApplied: { familyId: string; familyName: string; count: number; saved: number }[];
}

export function calculateCartTotals(
  cart: CartEntry[],
  products: Product[],
  promoFamilies: PromoFamily[],
  customTotal: number | null = null
): CartCalculationResult {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const familyMap = new Map(promoFamilies.map((f) => [f.id, f]));

  interface UnitItem {
    productId: string;
    productName: string;
    ownerId: string;
    basePrice: number;
    familyId: string | null;
    effectivePrice: number;
  }

  const units: UnitItem[] = [];
  for (const entry of cart) {
    const product = productMap.get(entry.productId);
    if (!product || entry.quantity <= 0) continue;
    for (let i = 0; i < entry.quantity; i++) {
      units.push({
        productId: product.id,
        productName: product.name,
        ownerId: product.ownerId,
        basePrice: product.basePrice,
        familyId: product.familyId,
        effectivePrice: product.basePrice,
      });
    }
  }

  const baseSubtotal = units.reduce((sum, u) => sum + u.basePrice, 0);
  const promoFamiliesApplied: CartCalculationResult['promoFamiliesApplied'] = [];

  // Group units by familyId
  const byFamily = new Map<string, number[]>();
  units.forEach((u, idx) => {
    if (u.familyId && familyMap.has(u.familyId)) {
      const list = byFamily.get(u.familyId) ?? [];
      list.push(idx);
      byFamily.set(u.familyId, list);
    }
  });

  for (const [familyId, indices] of byFamily.entries()) {
    const family = familyMap.get(familyId)!;
    const familyBasePrices = indices.map((idx) => units[idx].basePrice);
    const familyBaseSum = familyBasePrices.reduce((a, b) => a + b, 0);
    const optimalTotal = calculateOptimalFamilyTotal(familyBasePrices, family.tiers);

    if (optimalTotal < familyBaseSum) {
      const prorated = prorateInteger(optimalTotal, familyBasePrices);
      indices.forEach((unitIdx, i) => {
        units[unitIdx].effectivePrice = prorated[i];
      });
      promoFamiliesApplied.push({
        familyId,
        familyName: family.name,
        count: indices.length,
        saved: familyBaseSum - optimalTotal,
      });
    }
  }

  const promoSubtotal = units.reduce((sum, u) => sum + u.effectivePrice, 0);
  const promoSavings = Math.max(0, baseSubtotal - promoSubtotal);

  let finalTotal = promoSubtotal;
  if (customTotal !== null && Number.isFinite(customTotal) && customTotal >= 0 && units.length > 0) {
    finalTotal = Math.round(customTotal);
    const weights = units.map((u) => u.effectivePrice);
    const adjusted = prorateInteger(finalTotal, weights);
    units.forEach((u, i) => {
      u.effectivePrice = adjusted[i];
    });
  }

  return {
    baseSubtotal,
    promoSubtotal,
    promoSavings,
    finalTotal,
    saleItems: units.map((u) => ({
      productId: u.productId,
      productName: u.productName,
      ownerId: u.ownerId,
      effectivePrice: u.effectivePrice,
    })),
    promoFamiliesApplied,
  };
}

export interface ParticipantResult {
  participant: Participant;
  earned: number;
  expenseShare: number;
  expensePaid: number;
  netEntitlement: number;
  transfersReceived: number;
  cashFromPot: number;
}

export interface TransferSettlement {
  from: Participant;
  to: Participant;
  amount: number;
}

export interface TopProductStat {
  productId: string;
  productName: string;
  ownerId: string;
  unitsSold: number;
  revenue: number;
}

export interface EventResults {
  totalRevenue: number;
  salesCount: number;
  cashTotal: number;
  transferTotal: number;
  totalExpenses: number;
  participantResults: ParticipantResult[];
  transferSettlements: TransferSettlement[];
  topProducts: TopProductStat[];
}

export function calculateEventResults(event: FeriaEvent): EventResults {
  const participants = event.participants;
  const participantMap = new Map(participants.map((p) => [p.id, p]));
  const sharedMap = new Map(event.sharedEntities.map((s) => [s.id, s]));

  const earnedMap = new Map<string, number>();
  const expenseShareMap = new Map<string, number>();
  const expensePaidMap = new Map<string, number>();
  const transfersReceivedMap = new Map<string, number>();

  for (const p of participants) {
    earnedMap.set(p.id, 0);
    expenseShareMap.set(p.id, 0);
    expensePaidMap.set(p.id, 0);
    transfersReceivedMap.set(p.id, 0);
  }

  let totalRevenue = 0;
  let cashTotal = 0;
  let transferTotal = 0;

  const productStatsMap = new Map<string, TopProductStat>();

  for (const sale of event.sales) {
    totalRevenue += sale.finalTotal;
    if (sale.paymentMethod === 'cash') {
      cashTotal += sale.finalTotal;
    } else {
      transferTotal += sale.finalTotal;
      if (sale.receivedBy && transfersReceivedMap.has(sale.receivedBy)) {
        transfersReceivedMap.set(
          sale.receivedBy,
          (transfersReceivedMap.get(sale.receivedBy) ?? 0) + sale.finalTotal
        );
      }
    }

    for (const item of sale.items) {
      // Top products
      const existingStat = productStatsMap.get(item.productId);
      if (existingStat) {
        existingStat.unitsSold += 1;
        existingStat.revenue += item.effectivePrice;
      } else {
        productStatsMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          ownerId: item.ownerId,
          unitsSold: 1,
          revenue: item.effectivePrice,
        });
      }

      // Owner distribution
      if (participantMap.has(item.ownerId)) {
        earnedMap.set(item.ownerId, (earnedMap.get(item.ownerId) ?? 0) + item.effectivePrice);
      } else if (sharedMap.has(item.ownerId)) {
        const shared = sharedMap.get(item.ownerId)!;
        const validSplits = shared.splits.filter((s) => participantMap.has(s.participantId));
        if (validSplits.length > 0) {
          const shares = prorateInteger(
            item.effectivePrice,
            validSplits.map((s) => s.percentage)
          );
          validSplits.forEach((s, idx) => {
            earnedMap.set(
              s.participantId,
              (earnedMap.get(s.participantId) ?? 0) + shares[idx]
            );
          });
        }
      }
    }
  }

  // Expenses
  let totalExpenses = 0;
  for (const exp of event.expenses) {
    totalExpenses += exp.amount;
    if (expensePaidMap.has(exp.paidBy)) {
      expensePaidMap.set(exp.paidBy, (expensePaidMap.get(exp.paidBy) ?? 0) + exp.amount);
    }

    if (exp.splitEqually || exp.splits.length === 0) {
      if (participants.length > 0) {
        const shares = prorateInteger(
          exp.amount,
          participants.map(() => 1)
        );
        participants.forEach((p, idx) => {
          expenseShareMap.set(p.id, (expenseShareMap.get(p.id) ?? 0) + shares[idx]);
        });
      }
    } else {
      const validSplits = exp.splits.filter((s) => participantMap.has(s.participantId));
      if (validSplits.length > 0) {
        const shares = prorateInteger(
          exp.amount,
          validSplits.map((s) => s.percentage)
        );
        validSplits.forEach((s, idx) => {
          expenseShareMap.set(
            s.participantId,
            (expenseShareMap.get(s.participantId) ?? 0) + shares[idx]
          );
        });
      }
    }
  }

  // Settlement:
  // 1. Net entitlement per participant = earned - expenseShare + expensePaid
  // 2. Transfers first: anyone with transfersReceived > netEntitlement has excess transfers
  //    and transfers that excess to those with transfersReceived < netEntitlement.
  // 3. Common cash pot covers the remaining shortfall of each participant.
  const netMap = new Map<string, number>();
  const balanceAfterTransfers = new Map<string, number>();

  for (const p of participants) {
    const net =
      (earnedMap.get(p.id) ?? 0) -
      (expenseShareMap.get(p.id) ?? 0) +
      (expensePaidMap.get(p.id) ?? 0);
    netMap.set(p.id, net);
    balanceAfterTransfers.set(p.id, (transfersReceivedMap.get(p.id) ?? 0) - net);
  }

  // Positive balanceAfterTransfers => holds excess transfers (must send)
  // Negative balanceAfterTransfers => still needs money (receives from excess transfers first, then cash pot)
  const transferSenders = participants
    .filter((p) => (balanceAfterTransfers.get(p.id) ?? 0) > 0)
    .map((p) => ({ participant: p, excess: balanceAfterTransfers.get(p.id)! }))
    .sort((a, b) => b.excess - a.excess);

  const needers = participants
    .filter((p) => (balanceAfterTransfers.get(p.id) ?? 0) < 0)
    .map((p) => ({ participant: p, needed: -(balanceAfterTransfers.get(p.id)!) }))
    .sort((a, b) => b.needed - a.needed);

  const transferSettlements: TransferSettlement[] = [];
  const incomingTransfersMap = new Map<string, number>();

  let sIdx = 0;
  let nIdx = 0;
  while (sIdx < transferSenders.length && nIdx < needers.length) {
    const sender = transferSenders[sIdx];
    const receiver = needers[nIdx];
    const amount = Math.min(sender.excess, receiver.needed);
    if (amount > 0) {
      transferSettlements.push({
        from: sender.participant,
        to: receiver.participant,
        amount,
      });
      incomingTransfersMap.set(
        receiver.participant.id,
        (incomingTransfersMap.get(receiver.participant.id) ?? 0) + amount
      );
      sender.excess -= amount;
      receiver.needed -= amount;
    }
    if (sender.excess === 0) sIdx++;
    if (receiver.needed === 0) nIdx++;
  }

  const participantResults: ParticipantResult[] = participants.map((p) => {
    const earned = earnedMap.get(p.id) ?? 0;
    const expenseShare = expenseShareMap.get(p.id) ?? 0;
    const expensePaid = expensePaidMap.get(p.id) ?? 0;
    const netEntitlement = netMap.get(p.id) ?? 0;
    const transfersReceived = transfersReceivedMap.get(p.id) ?? 0;
    const incomingTransfers = incomingTransfersMap.get(p.id) ?? 0;
    const outgoingTransfers = transferSettlements
      .filter((t) => t.from.id === p.id)
      .reduce((sum, t) => sum + t.amount, 0);
    const cashFromPot = netEntitlement - (transfersReceived + incomingTransfers - outgoingTransfers);

    return {
      participant: p,
      earned,
      expenseShare,
      expensePaid,
      netEntitlement,
      transfersReceived,
      cashFromPot,
    };
  });

  const topProducts = Array.from(productStatsMap.values()).sort(
    (a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue
  );

  return {
    totalRevenue,
    salesCount: event.sales.length,
    cashTotal,
    transferTotal,
    totalExpenses,
    participantResults,
    transferSettlements,
    topProducts,
  };
}

export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(amount)).toLocaleString('es-AR')}`;
}

export function generateWhatsAppSummary(event: FeriaEvent, results: EventResults): string {
  const lines: string[] = [];
  lines.push(`*Resumen — ${event.name}* (${event.date})`);
  lines.push(
    `Recaudación total: *${formatMoney(results.totalRevenue)}* (${results.salesCount} ventas)`
  );
  lines.push(
    `Efectivo (pozo): ${formatMoney(results.cashTotal)} | Transf: ${formatMoney(results.transferTotal)}`
  );

  if (results.totalExpenses > 0) {
    lines.push(`Gastos del stand: ${formatMoney(results.totalExpenses)}`);
  }

  lines.push('');
  lines.push('*Ganancia y Neto por Participante:*');
  for (const r of results.participantResults) {
    const expenseNote =
      r.expensePaid > 0 || r.expenseShare > 0
        ? ` (Neto c/gastos: ${formatMoney(r.netEntitlement)})`
        : '';
    lines.push(`• ${r.participant.name}: ${formatMoney(r.earned)}${expenseNote}`);
  }

  lines.push('');
  lines.push('*Liquidación de Caja:*');
  if (results.transferSettlements.length > 0) {
    for (const t of results.transferSettlements) {
      lines.push(`• ${t.from.name} transfiere *${formatMoney(t.amount)}* a ${t.to.name}`);
    }
  } else {
    lines.push('• No hay transferencias pendientes entre participantes.');
  }

  for (const r of results.participantResults) {
    if (r.cashFromPot > 0) {
      lines.push(`• ${r.participant.name} retira *${formatMoney(r.cashFromPot)}* del efectivo`);
    } else if (r.cashFromPot < 0) {
      lines.push(`• ${r.participant.name} aporta *${formatMoney(Math.abs(r.cashFromPot))}* al pozo`);
    }
  }

  if (results.topProducts.length > 0) {
    lines.push('');
    lines.push('*Lo más vendido:*');
    results.topProducts.slice(0, 5).forEach((p, idx) => {
      lines.push(`${idx + 1}. ${p.productName} — ${p.unitsSold} u. (${formatMoney(p.revenue)})`);
    });
  }

  return lines.join('\n');
}

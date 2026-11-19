import { describe, expect, it } from 'vitest';
import {
  calculateCartTotals,
  calculateEventResults,
  calculateOptimalFamilyTotal,
  generateWhatsAppSummary,
  prorateInteger,
} from './calculations';
import type { FeriaEvent, Product, PromoFamily } from '../types';

describe('prorateInteger', () => {
  it('divides 2000 across 3 equal weights summing exactly to 2000', () => {
    const result = prorateInteger(2000, [1, 1, 1]);
    expect(result).toEqual([667, 667, 666]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(2000);
  });

  it('handles proportional weights', () => {
    const result = prorateInteger(1000, [30, 70]);
    expect(result).toEqual([300, 700]);
  });
});

describe('calculateOptimalFamilyTotal', () => {
  const tiers = { 1: 1000, 2: 1500, 3: 2000 };

  it('computes optimal combo for 4, 5, and 6 items', () => {
    expect(calculateOptimalFamilyTotal([1000, 1000, 1000, 1000], tiers)).toBe(3000); // 3x + 1x
    expect(calculateOptimalFamilyTotal([1000, 1000, 1000, 1000, 1000], tiers)).toBe(3500); // 3x + 2x
    expect(calculateOptimalFamilyTotal([1000, 1000, 1000, 1000, 1000, 1000], tiers)).toBe(4000); // 3x + 3x
  });
});

describe('calculateCartTotals', () => {
  const families: PromoFamily[] = [
    { id: 'fam_stickers', name: 'Stickers', tiers: { 1: 1000, 2: 1500, 3: 2000 } },
  ];
  const products: Product[] = [
    { id: 'p1', name: 'Sticker Cris', basePrice: 1000, ownerId: 'c1', familyId: 'fam_stickers', stock: null },
    { id: 'p2', name: 'Sticker Nov', basePrice: 1000, ownerId: 'c2', familyId: 'fam_stickers', stock: null },
    { id: 'p3', name: 'Sticker Conj', basePrice: 1000, ownerId: 'sh1', familyId: 'fam_stickers', stock: null },
    { id: 'p4', name: 'Print A4', basePrice: 4000, ownerId: 'c1', familyId: null, stock: null },
  ];

  it('applies Mix & Match promo across different owners and prorates', () => {
    const res = calculateCartTotals(
      [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 1 },
        { productId: 'p3', quantity: 1 },
      ],
      products,
      families
    );
    expect(res.baseSubtotal).toBe(3000);
    expect(res.promoSubtotal).toBe(2000);
    expect(res.promoSavings).toBe(1000);
    expect(res.finalTotal).toBe(2000);
    expect(res.saleItems.map((i) => i.effectivePrice)).toEqual([667, 667, 666]);
  });

  it('applies regateo (customTotal) proportionally', () => {
    const res = calculateCartTotals(
      [
        { productId: 'p1', quantity: 1 },
        { productId: 'p4', quantity: 1 },
      ],
      products,
      families,
      4000 // down from 5000 (1000 + 4000)
    );
    expect(res.finalTotal).toBe(4000);
    expect(res.saleItems.map((i) => i.effectivePrice)).toEqual([800, 3200]);
  });
});

describe('calculateEventResults', () => {
  it('distributes transfers first and cash pot second, accounting for shared entities and expenses', () => {
    const event: FeriaEvent = {
      id: 'evt_1',
      name: 'Feria Test',
      date: '2026-11-18',
      status: 'active',
      transferMode: 'individual',
      singleTransferOwnerId: null,
      participants: [
        { id: 'p_1', name: 'Cristian', color: '#0061A4' },
        { id: 'p_2', name: 'Novia', color: '#984061' },
      ],
      sharedEntities: [
        {
          id: 'sh_1',
          name: 'Conjunto',
          color: '#006D44',
          splits: [
            { participantId: 'p_1', percentage: 50 },
            { participantId: 'p_2', percentage: 50 },
          ],
        },
      ],
      promoFamilies: [],
      products: [],
      expenses: [
        {
          id: 'exp_1',
          description: 'Canon',
          amount: 2000,
          paidBy: 'p_1',
          splitEqually: true,
          splits: [],
        },
      ],
      sales: [
        {
          id: 's1',
          timestamp: '2026-11-18T12:00:00Z',
          items: [
            { productId: 'a', productName: 'Sticker', ownerId: 'sh_1', effectivePrice: 2000 },
          ],
          finalTotal: 2000,
          paymentMethod: 'transfer',
          receivedBy: 'p_1',
        },
        {
          id: 's2',
          timestamp: '2026-11-18T12:05:00Z',
          items: [
            { productId: 'b', productName: 'Pin', ownerId: 'p_2', effectivePrice: 4000 },
          ],
          finalTotal: 4000,
          paymentMethod: 'cash',
          receivedBy: null,
        },
      ],
    };

    const res = calculateEventResults(event);
    expect(res.totalRevenue).toBe(6000);
    expect(res.cashTotal).toBe(4000);
    expect(res.transferTotal).toBe(2000);

    const cris = res.participantResults.find((r) => r.participant.id === 'p_1')!;
    const nov = res.participantResults.find((r) => r.participant.id === 'p_2')!;

    // Cris earned 1000 (50% of 2000), paid 2000 expense, share 1000 => net = 1000 - 1000 + 2000 = 2000
    // Nov earned 1000 + 4000 = 5000, paid 0, share 1000 => net = 5000 - 1000 = 4000
    expect(cris.netEntitlement).toBe(2000);
    expect(nov.netEntitlement).toBe(4000);

    // Cris received 2000 in transfers (matches his 2000 net), Nov takes 4000 from cash pot!
    expect(res.transferSettlements).toHaveLength(0);
    expect(cris.cashFromPot).toBe(0);
    expect(nov.cashFromPot).toBe(4000);
  });
});

describe('generateWhatsAppSummary', () => {
  it('generates export summary text without any emojis', () => {
    const event: FeriaEvent = {
      id: 'evt_1',
      name: 'Anime Fest',
      date: '2026-11-18',
      status: 'active',
      transferMode: 'individual',
      singleTransferOwnerId: null,
      participants: [
        { id: 'p_1', name: 'Cristian', color: '#0061A4' },
        { id: 'p_2', name: 'Novia', color: '#984061' },
      ],
      sharedEntities: [],
      promoFamilies: [],
      products: [],
      expenses: [
        {
          id: 'exp_1',
          description: 'Stand',
          amount: 1500,
          paidBy: 'p_1',
          splitEqually: true,
          splits: [],
        },
      ],
      sales: [
        {
          id: 's1',
          timestamp: '2026-11-18T12:00:00Z',
          items: [
            { productId: 'a', productName: 'Sticker', ownerId: 'p_1', effectivePrice: 2000 },
          ],
          finalTotal: 2000,
          paymentMethod: 'cash',
          receivedBy: null,
        },
      ],
    };

    const results = calculateEventResults(event);
    const summary = generateWhatsAppSummary(event, results);

    // Emoji regex checking that no extended pictographic or emoji characters exist in the text
    const emojiRegex = /\p{Extended_Pictographic}/u;
    expect(emojiRegex.test(summary)).toBe(false);

    expect(summary).toContain('*Resumen — Anime Fest* (2026-11-18)');
    expect(summary).toContain('Recaudación total:');
    expect(summary).toContain('Efectivo (pozo):');
    expect(summary).toContain('Gastos del stand:');
    expect(summary).toContain('*Liquidación de Caja:*');
    expect(summary).toContain('*Lo más vendido:*');
    expect(summary).toContain('1. Sticker — 1 u.');
  });
});

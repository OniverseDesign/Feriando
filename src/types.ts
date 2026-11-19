export type EventStatus = 'active' | 'finished';
export type TransferMode = 'individual' | 'single_account';
export type PaymentMethod = 'cash' | 'transfer';

export interface Participant {
  id: string;
  name: string;
  color: string;
}

export interface Split {
  participantId: string;
  percentage: number;
}

export interface SharedEntity {
  id: string;
  name: string;
  color: string;
  splits: Split[];
}

export interface PromoFamily {
  id: string;
  name: string;
  tiers: Record<number, number>; // e.g. { 1: 1000, 2: 1500, 3: 2000 }
}

export interface Product {
  id: string;
  name: string;
  basePrice: number;
  ownerId: string; // participant.id or sharedEntity.id
  familyId: string | null;
  stock: number | null;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string; // participant.id
  splitEqually: boolean;
  splits: Split[];
}

export interface SaleItem {
  productId: string;
  productName: string;
  ownerId: string;
  effectivePrice: number;
}

export interface Sale {
  id: string;
  timestamp: string;
  items: SaleItem[];
  finalTotal: number;
  paymentMethod: PaymentMethod;
  receivedBy: string | null; // participant.id for transfers, null for common cash pot
}

export interface FeriaEvent {
  id: string;
  name: string;
  date: string;
  status: EventStatus;
  transferMode: TransferMode;
  singleTransferOwnerId: string | null;
  participants: Participant[];
  sharedEntities: SharedEntity[];
  promoFamilies: PromoFamily[];
  products: Product[];
  expenses: Expense[];
  sales: Sale[];
}

export interface CartEntry {
  productId: string;
  quantity: number;
}

export interface EventCartState {
  cart: CartEntry[];
  customTotal: number | null;
}

/**
 * Centralized financial calculation and currency formatting utility
 * Uses integer cents to avoid floating-point inaccuracies.
 */

import { CartItem, Coupon } from '../types/catalog';

export const CENTS_PER_REAL = 100;

export const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a numeric amount to BRL currency string (e.g. "R$ 99,90")
 * Returns "Valor não cadastrado" if value is null, undefined, or invalid.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Valor não cadastrado';
  }
  return currencyFormatter.format(amount);
}

/**
 * Safely converts Real amount to integer cents
 */
export function toCents(amount: number): number {
  if (isNaN(amount)) return 0;
  return Math.round(amount * CENTS_PER_REAL);
}

/**
 * Safely converts integer cents back to Real decimal
 */
export function fromCents(cents: number): number {
  return cents / CENTS_PER_REAL;
}

export interface CalculationResult {
  itemsSubtotalCents: number;
  itemsSubtotal: number;
  addonCents: number;
  addonAmount: number;
  discountCents: number;
  discountAmount: number;
  deliveryFeeCents: number;
  deliveryFee: number;
  totalCents: number;
  totalAmount: number;
  hasIncompletePrice: boolean;
  totalFormatted: string;
  itemsSubtotalFormatted: string;
  addonFormatted: string;
  discountFormatted: string;
  deliveryFeeFormatted: string;
}

/**
 * Single shared calculation function used by cart, drawers, and administrative attendance records.
 */
export function calculateOrderFinancials(params: {
  cart: CartItem[];
  isUsbCableAdded: boolean;
  cablePrice: number;
  appliedCoupon: Coupon | null;
  isPickup: boolean;
  deliveryFee?: number;
}): CalculationResult {
  const {
    cart,
    isUsbCableAdded,
    cablePrice,
    appliedCoupon,
    isPickup,
    deliveryFee = 10.0,
  } = params;

  let hasIncompletePrice = false;
  let itemsSubtotalCents = 0;

  // 1. Calculate items subtotal: quantity * unit price
  for (const item of cart) {
    if (item.price === undefined || item.price === null || isNaN(item.price) || item.price <= 0) {
      hasIncompletePrice = true;
    } else {
      const itemUnitCents = toCents(item.price);
      itemsSubtotalCents += itemUnitCents * Math.max(1, item.quantity);
    }
  }

  // 2. Additional accessories (Cable) — added once
  const addonCents = isUsbCableAdded ? toCents(cablePrice) : 0;

  // 3. Discount calculation
  let discountCents = 0;
  if (appliedCoupon && appliedCoupon.active) {
    const rawItemsSubtotal = fromCents(itemsSubtotalCents);
    const meetsMinOrder = !appliedCoupon.minOrderValue || rawItemsSubtotal >= appliedCoupon.minOrderValue;

    if (meetsMinOrder) {
      if (appliedCoupon.applicableModelId && appliedCoupon.applicableModelId !== 'all') {
        // Restricted to specific model
        const targetItem = cart.find((i) => i.modelId === appliedCoupon.applicableModelId);
        if (targetItem && targetItem.price > 0) {
          const targetItemTotalCents = toCents(targetItem.price) * targetItem.quantity;
          if (appliedCoupon.discountType === 'percent') {
            discountCents = Math.round((targetItemTotalCents * appliedCoupon.value) / 100);
          } else {
            discountCents = Math.min(toCents(appliedCoupon.value), targetItemTotalCents);
          }
        }
      } else {
        // Applicable to entire order
        if (appliedCoupon.discountType === 'percent') {
          discountCents = Math.round((itemsSubtotalCents * appliedCoupon.value) / 100);
        } else {
          discountCents = Math.min(toCents(appliedCoupon.value), itemsSubtotalCents);
        }
      }
    }
  }

  // 4. Delivery fee: only when delivery is chosen (not pickup)
  const deliveryFeeCents = isPickup ? 0 : toCents(deliveryFee);

  // 5. Total calculation in cents: (Items + Addons - Discount) + Delivery Fee
  const payableBeforeFee = Math.max(0, itemsSubtotalCents + addonCents - discountCents);
  const totalCents = payableBeforeFee + deliveryFeeCents;

  const itemsSubtotal = fromCents(itemsSubtotalCents);
  const addonAmount = fromCents(addonCents);
  const discountAmount = fromCents(discountCents);
  const deliveryFeeFinal = fromCents(deliveryFeeCents);
  const totalAmount = fromCents(totalCents);

  return {
    itemsSubtotalCents,
    itemsSubtotal,
    addonCents,
    addonAmount,
    discountCents,
    discountAmount,
    deliveryFeeCents,
    deliveryFee: deliveryFeeFinal,
    totalCents,
    totalAmount,
    hasIncompletePrice,
    totalFormatted: hasIncompletePrice ? 'Valor não cadastrado' : formatCurrency(totalAmount),
    itemsSubtotalFormatted: formatCurrency(itemsSubtotal),
    addonFormatted: formatCurrency(addonAmount),
    discountFormatted: formatCurrency(discountAmount),
    deliveryFeeFormatted: isPickup ? 'Grátis (Retirada)' : formatCurrency(deliveryFeeFinal),
  };
}

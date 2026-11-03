export type ProductDiscountSource = 'vip' | 'progressive' | 'coupon';

/** Only one monetary benefit applies. Compare in cents; ties avoid spending a coupon. */
export function selectProductDiscount(input: { subtotal: number; vip: number; progressive: number; coupon: number }) {
  const cents = (amount: number) => Number.isFinite(amount) ? Math.round(Math.max(0, amount) * 100) : 0;
  const limit = cents(input.subtotal);
  let source: ProductDiscountSource | undefined;
  let amount = 0;
  for (const candidate of ['vip', 'progressive', 'coupon'] as const) {
    const value = Math.min(limit, cents(input[candidate]));
    if (value > amount) { source = candidate; amount = value; }
  }
  const total = amount / 100;
  return { source, total, vip: source === 'vip' ? total : 0,
    progressive: source === 'progressive' ? total : 0, coupon: source === 'coupon' ? total : 0 };
}

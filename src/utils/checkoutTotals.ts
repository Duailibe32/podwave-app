import type { CartItem, Coupon, ProgressiveDiscountConfig } from '../types/catalog';

export function isCouponEligibleForCart(coupon: Coupon | null | undefined, cart: CartItem[], subtotal: number): coupon is Coupon {
  return !!coupon && coupon.active !== false
    && !(coupon.maxUses && coupon.usedCount >= coupon.maxUses)
    && subtotal >= (coupon.minOrderValue || 0)
    && (!coupon.applicableModelId || coupon.applicableModelId === 'all'
      || cart.some(item => item.modelId === coupon.applicableModelId));
}

export interface CheckoutTotals {
  itemsSubtotal: number;
  addonAmount: number;
  discountAmount: number;
  deliveryFee: number;
  totalAmount: number;
  freeShippingApplied: boolean;
  shippingNeedsQuote: boolean;
  deliveryDistanceKm?: number;
  deliveryEstimate: boolean;
  deliveryOriginCity?: string;
  freeShippingSource?: 'promotion' | 'coupon';
}
export interface CheckoutSummary extends CheckoutTotals {
  items: CartItem[];
  vipDiscountAmount?: number;
  couponDiscountAmount?: number;
  flashSaleDiscountAmount?: number;
}

/** Same quote for checkout, preview, persisted order and attendance message.
 * The loyalty value goal does not grant shipping. Accessories do not count as pods.
 */
export function calculateCheckoutTotals(input: {
  itemsSubtotal: number; addonAmount: number; discountAmount: number;
  totalPodUnits: number; isPickup: boolean; config: ProgressiveDiscountConfig; destinationCity?: string;
  coupon?: Coupon | null; cart?: CartItem[];
}): CheckoutTotals {
  const cents = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(Math.max(0, number) * 100 + Number.EPSILON * Math.abs(number) * 100) : 0;
  };
  const items = cents(input.itemsSubtotal), addons = cents(input.addonAmount);
  const discount = Math.min(items + addons, cents(input.discountAmount));
  const configuredMin = Number(input.config.tier2MinUnits);
  const minimum = Number.isFinite(configuredMin) && configuredMin >= 1 ? configuredMin : 2;
  const normalizeCity = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
  const perKm = input.config.deliveryPricingMode === 'per_km';
  const rate = Number(input.config.deliveryRatePerKm);
  const origins = Array.isArray(input.config.deliveryOrigins) ? input.config.deliveryOrigins : [];
  const zone = (Array.isArray(input.config.deliveryCities) ? input.config.deliveryCities : []).filter(area =>
    area && typeof area.city === 'string' && typeof area.state === 'string'
    && normalizeCity(`${area.city} - ${area.state}`) === normalizeCity(input.destinationCity || '')
    && Number.isFinite(Number(area.distanceKm)) && Number(area.distanceKm) >= 0
    && origins.some(origin => origin.id === area.originId && origin.city?.trim() && origin.state?.trim()))
    .sort((a, b) => Number(a.distanceKm) - Number(b.distanceKm))[0];
  const origin = origins.find(base => base.id === zone?.originId);
  const shippingNeedsQuote = !input.isPickup && perKm
    && (!zone || !origin || !Number.isFinite(rate) || rate <= 0);
  const promotionFree = input.config.enabled !== false
    && input.config.tier2FreeShipping === true && input.totalPodUnits >= minimum;
  const couponFree = isCouponEligibleForCart(input.coupon, input.cart || [], items / 100)
    && input.coupon.discountType === 'free_shipping';
  const quotedFee = perKm && zone && Number.isFinite(rate) && rate > 0
    ? Math.max(cents(input.config.deliveryMinimumFee ?? 0), cents(Number(zone.distanceKm) * rate))
    : cents(input.config.baseDeliveryFee ?? 0);
  const freeShippingApplied = !input.isPickup && !shippingNeedsQuote && (promotionFree || (couponFree && quotedFee > 0));
  const fee = input.isPickup || freeShippingApplied || shippingNeedsQuote ? 0 : quotedFee;
  return {
    itemsSubtotal: items / 100, addonAmount: addons / 100, discountAmount: discount / 100,
    deliveryFee: fee / 100, totalAmount: (items + addons - discount + fee) / 100,
    freeShippingApplied, shippingNeedsQuote,
    deliveryEstimate: !input.isPickup && perKm && !shippingNeedsQuote,
    deliveryDistanceKm: !input.isPickup && perKm && zone ? Number(zone.distanceKm) : undefined,
    deliveryOriginCity: !input.isPickup && perKm && origin ? `${origin.city} - ${origin.state}` : undefined,
    freeShippingSource: freeShippingApplied ? promotionFree ? 'promotion' : 'coupon' : undefined,
  };
}

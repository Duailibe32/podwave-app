import type { CartItem, FlashSale, ProductModel } from '../types/catalog';

export const FLASH_SALE_MAX_MS = 24 * 60 * 60 * 1000;

export function getActiveFlashSale(sale: FlashSale | undefined, models: ProductModel[], now = Date.now()) {
  if (!sale || sale.enabled !== true || !Number.isFinite(now)
    || !Number.isFinite(sale.percent) || sale.percent <= 0 || sale.percent > 100) return null;
  const start = Date.parse(sale.startsAt), end = Date.parse(sale.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start
    || end - start > FLASH_SALE_MAX_MS || now < start || now >= end) return null;
  const model = models.find(model => model.id === sale.modelId && model.active);
  if (!model || !Number.isFinite(model.startingPrice) || model.startingPrice < 0) return null;
  const availableFlavors = model.flavors.filter(flavor => flavor.inStock !== false
    && typeof flavor.demoQuantity === 'number' && Number.isFinite(flavor.demoQuantity) && flavor.demoQuantity > 0);
  const flavor = sale.flavorId ? availableFlavors.find(flavor => flavor.id === sale.flavorId) : undefined;
  if (sale.flavorId ? !flavor : availableFlavors.length === 0) return null;
  return { sale, model, flavor, availableFlavors, endsAt: end };
}

export function calculateFlashSaleDiscount(sale: FlashSale | undefined, cart: CartItem[], models: ProductModel[], now = Date.now()) {
  const active = getActiveFlashSale(sale, models, now);
  if (!active) return 0;
  const cents = cart.filter(item => item.modelId === active.model.id
    && (!sale?.flavorId || item.flavorId === sale.flavorId)
    && active.availableFlavors.some(flavor => flavor.id === item.flavorId)
    && Number.isSafeInteger(item.quantity) && item.quantity > 0 && Number.isFinite(item.price) && item.price >= 0)
    .reduce((total, item) => total + Math.round(item.price * 100) * item.quantity, 0);
  return Math.round(cents * active.sale.percent / 100) / 100;
}

export function formatFlashCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, '0')).join(':');
}

import type { CartItem, ProductModel } from '../types/catalog';

export function cartStockError(cart: CartItem[], models: ProductModel[]): string | null {
  const totals = new Map<string, number>();
  for (const item of cart) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) return 'Informe uma quantidade inteira positiva.';
    const key = `${item.modelId}:${item.flavorId}`;
    totals.set(key, (totals.get(key) || 0) + item.quantity);
    const model = models.find((m) => m.id === item.modelId);
    const flavor = model?.flavors.find((f) => f.id === item.flavorId);
    if (!model?.active || !flavor?.inStock || !Number.isInteger(flavor.demoQuantity) || (flavor.demoQuantity ?? 0) < totals.get(key)!) {
      return `${item.modelName} (${item.flavorName}): estoque insuficiente ou quantidade não informada.`;
    }
  }
  return null;
}

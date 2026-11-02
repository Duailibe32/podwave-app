import type { CartItem, ProductModel } from '../types/catalog';

export function cartStockError(cart: CartItem[], models: ProductModel[]): string | null {
  const totals = new Map<string, number>();
  for (const item of cart) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) return 'Informe uma quantidade inteira positiva.';
    const key = `${item.modelId}:${item.flavorId}`;
    totals.set(key, (totals.get(key) || 0) + item.quantity);
    const model = models.find((m) => m.id === item.modelId);
    if (!model) continue;
    if (model.active === false) {
      return `${item.modelName}: produto indisponível no momento.`;
    }
    const flavor = model.flavors.find((f) => f.id === item.flavorId);
    if (!flavor) continue;
    if (flavor.inStock === false) {
      return `${item.modelName} (${item.flavorName}): sabor esgotado no momento.`;
    }
    if (
      typeof flavor.demoQuantity === 'number' &&
      Number.isFinite(flavor.demoQuantity) &&
      flavor.demoQuantity < totals.get(key)!
    ) {
      return `${item.modelName} (${item.flavorName}): estoque insuficiente (${flavor.demoQuantity} disponível).`;
    }
  }
  return null;
}

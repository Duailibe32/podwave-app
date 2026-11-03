import type { CartItem, ProductModel } from '../types/catalog';

export interface ReorderFeedback { addedUnits: number; warnings: string[] }

/** Rebuild from catalog IDs and today's prices; never reuse an old order total. */
export function prepareReorder(items: CartItem[], models: ProductModel[], currentCart: CartItem[]) {
  let cart = [...currentCart];
  const feedback: ReorderFeedback = { addedUnits: 0, warnings: [] };
  const grouped = new Map<string, CartItem>();
  for (const item of items) {
    if (!item || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      feedback.warnings.push('Um item com quantidade inválida não foi adicionado.');
      continue;
    }
    const key = JSON.stringify([item.modelId, item.flavorId]);
    const previous = grouped.get(key);
    grouped.set(key, { ...item, quantity: (previous?.quantity || 0) + item.quantity });
  }
  for (const item of grouped.values()) {
    const model = models.find(model => model.id === item.modelId && model.active);
    const flavor = model?.flavors.find(flavor => flavor.id === item.flavorId);
    const label = `${item.modelName} • ${item.flavorName}`;
    if (!model || !flavor) {
      feedback.warnings.push(`${label}: não está mais disponível no catálogo.`);
      continue;
    }
    const existing = cart.filter(line => line.modelId === model.id && line.flavorId === flavor.id);
    const existingQuantity = existing.reduce((sum, line) => sum + line.quantity, 0);
    const totalQuantity = existingQuantity + item.quantity;
    if (!Number.isSafeInteger(totalQuantity) || totalQuantity < 1
      || existing.some(line => !Number.isSafeInteger(line.quantity) || line.quantity < 1)
      || flavor.inStock === false || !Number.isFinite(flavor.demoQuantity)
      || typeof flavor.demoQuantity !== 'number' || flavor.demoQuantity < totalQuantity) {
      feedback.warnings.push(`${label}: estoque insuficiente ou não informado para repetir essa quantidade, considerando sua sacola.`);
      continue;
    }
    if (!Number.isFinite(model.startingPrice) || model.startingPrice < 0) {
      feedback.warnings.push(`${label}: preço atual indisponível.`);
      continue;
    }
    const fresh: CartItem = {
      id: `${model.id}-${flavor.id}`, modelId: model.id, brandName: model.brandName,
      modelName: model.modelName, flavorId: flavor.id, flavorName: flavor.name,
      flavorColor: flavor.colorHex, flavorEmoji: flavor.iconEmoji,
      price: model.startingPrice, quantity: totalQuantity,
      imageUrl: flavor.customImage || model.imageUrl,
    };
    cart = [fresh, ...cart.filter(line => line.modelId !== model.id || line.flavorId !== flavor.id)];
    feedback.addedUnits += item.quantity;
  }
  if (items.length === 0) feedback.warnings.push('Este pedido não possui itens para repetir.');
  return { cart, ...feedback };
}

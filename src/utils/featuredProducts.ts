import type { FlavorVariant, ProductModel } from '../types/catalog';

// Ordem dos selos que a loja usa para destacar produtos no painel.
const BADGE_PRIORITY = [/mais\s+vendido/i, /\btop\b/i, /lan[cç]amento/i, /destaque/i, /\bnovo\b/i];

export const isFlavorAvailable = (flavor: FlavorVariant) => flavor.inStock && flavor.demoQuantity !== 0;

/** Produtos ativos com algum sabor disponível, ordenados pelo selo e depois pela ordem do catálogo. */
export function pickFeaturedModels(models: ProductModel[], limit = 6): ProductModel[] {
  const rank = (model: ProductModel) => {
    const index = BADGE_PRIORITY.findIndex((pattern) => pattern.test(model.badge || ''));
    return index < 0 ? BADGE_PRIORITY.length : index;
  };
  return models
    .map((model, index) => ({ model, index }))
    .filter(({ model }) => model.active && model.flavors.some(isFlavorAvailable))
    .sort((a, b) => rank(a.model) - rank(b.model) || a.index - b.index)
    .slice(0, limit)
    .map(({ model }) => model);
}

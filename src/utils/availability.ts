import { AvailabilityStatus, VariantAvailabilityInfo } from '../types/catalog';

export const DEFAULT_LOW_QUANTITY_THRESHOLD = 3;

/**
 * Calculates the availability status and visual styling tokens for a given flavor variant.
 * 
 * Rules:
 * - null or undefined -> 'nao_informado' (Gray indicator)
 * - 0 -> 'esgotado' (Red indicator)
 * - 1 to threshold -> 'ultimas_unidades' (Amber indicator)
 * - > threshold -> 'disponivel' (Green indicator)
 */
export function calculateVariantAvailability(
  quantity: number | null | undefined,
  threshold: number = DEFAULT_LOW_QUANTITY_THRESHOLD
): VariantAvailabilityInfo {
  // Check for unassigned / missing quantity
  if (quantity === null || quantity === undefined || isNaN(quantity) || quantity < 0) {
    return {
      status: 'nao_informado',
      label: 'Não informada',
      badgeLabel: 'Não informada',
      colorHex: '#94A3B8',
      badgeBg: 'bg-slate-500/15',
      badgeBorder: 'border-slate-500/30',
      badgeText: 'text-slate-300',
      icon: 'HelpCircle',
      quantityText: 'Quantidade não informada',
    };
  }

  // Sold out / Esgotado
  if (quantity === 0) {
    return {
      status: 'esgotado',
      label: 'Esgotado',
      badgeLabel: 'Esgotado',
      colorHex: '#EF4444',
      badgeBg: 'bg-rose-500/15',
      badgeBorder: 'border-rose-500/40',
      badgeText: 'text-rose-400',
      icon: 'XCircle',
      quantityText: '0 un · Esgotado',
    };
  }

  // Low quantity / Últimas unidades (between 1 and threshold)
  if (quantity <= threshold) {
    return {
      status: 'ultimas_unidades',
      label: 'Últimas unidades',
      badgeLabel: 'Poucas un.',
      colorHex: '#F59E0B',
      badgeBg: 'bg-amber-500/15',
      badgeBorder: 'border-amber-500/40',
      badgeText: 'text-amber-400',
      icon: 'AlertTriangle',
      quantityText: `${quantity} ${quantity === 1 ? 'unidade' : 'unidades'} · Últimas unidades`,
    };
  }

  // Available in stock
  return {
    status: 'disponivel',
    label: 'Disponível',
    badgeLabel: 'Disponível',
    colorHex: '#10B981',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-400',
    icon: 'CheckCircle2',
    quantityText: `${quantity} unidades · Disponível`,
  };
}

/**
 * Checks if a variant requires attention:
 * Esgotado (0), Últimas unidades (1..threshold), or Não informado (null/undefined).
 */
export function isNeedsAttention(
  quantity: number | null | undefined,
  threshold: number = DEFAULT_LOW_QUANTITY_THRESHOLD
): boolean {
  const info = calculateVariantAvailability(quantity, threshold);
  return info.status !== 'disponivel';
}

/**
 * Generates summary counters for a list of variants.
 */
export interface VariantSummaryCounts {
  total: number;
  disponivel: number;
  ultimasUnidades: number;
  esgotado: number;
  naoInformado: number;
  precisamAtencao: number;
}

export function calculateVariantsSummary(
  variants: { demoQuantity?: number | null; lowQuantityThreshold?: number }[],
  defaultThreshold: number = DEFAULT_LOW_QUANTITY_THRESHOLD
): VariantSummaryCounts {
  const summary: VariantSummaryCounts = {
    total: variants.length,
    disponivel: 0,
    ultimasUnidades: 0,
    esgotado: 0,
    naoInformado: 0,
    precisamAtencao: 0,
  };

  variants.forEach((v) => {
    const threshold = v.lowQuantityThreshold ?? defaultThreshold;
    const info = calculateVariantAvailability(v.demoQuantity, threshold);
    if (info.status === 'disponivel') summary.disponivel++;
    else if (info.status === 'ultimas_unidades') {
      summary.ultimasUnidades++;
      summary.precisamAtencao++;
    } else if (info.status === 'esgotado') {
      summary.esgotado++;
      summary.precisamAtencao++;
    } else {
      summary.naoInformado++;
      summary.precisamAtencao++;
    }
  });

  return summary;
}

import type { FlavorVariant } from '../types/catalog';

const mint = /\b(mint|menthol|menta|hortela|spearmint|peppermint)\b/;

function flavorName(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function flavorColor(flavor?: FlavorVariant) {
  if (!flavor) return '#00DFFF';
  if (mint.test(flavorName(flavor.name))) return '#72DBFF';
  return /^#[\da-f]{6}$/i.test(flavor.colorHex) ? flavor.colorHex : '#00DFFF';
}

export function lastUnitsLabel(flavor?: FlavorVariant) {
  if (flavor?.inStock !== true) return undefined;
  if (flavor.demoQuantity === 1) return '🔥 Última unidade';
  if (flavor.demoQuantity === 2) return '🔥 Últimas 2 unidades';
}

export function flavorNotes(name: string) {
  const text = flavorName(name);
  const fresh = /\b(ice|cool|fresh|gelado|gelo|frost)\b/.test(text);
  const fruity = /\b(watermelon|melancia|grape|uva|berry|berries|strawberry|morango|blueberry|raspberry|razz|mango|manga|banana|peach|pessego|apple|maca|cherry|cereja|pineapple|abacaxi|melon|melao|guava|goiaba|passionfruit|lychee|lichia)\b/.test(text);
  const sweet = /\b(candy|gummy|sweet|bubblegum|cream|vanilla|caramel|sorvete|bala|doce)\b/.test(text);
  const bold = /\b(double|triple|extra|intense|strong|bomb|sour|black|espresso)\b/.test(text);
  const minty = mint.test(text);
  if (!fruity && !sweet && !bold && !fresh && !minty) return null;
  return [
    { label: 'Refrescância', value: minty ? 3 : fresh ? 2 : 1, color: '#69DBFF' },
    { label: 'Doçura', value: sweet ? 3 : fruity ? 2 : minty ? 1 : null, color: '#F48BCF' },
    { label: 'Intensidade', value: bold ? 3 : minty || sweet || fruity ? 2 : null, color: '#B9A0FF' },
  ];
}

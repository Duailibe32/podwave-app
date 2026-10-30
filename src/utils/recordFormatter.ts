/**
 * PODWAVE — Gerador Centralizado de Fichas de Atendimento e Registros Administrativos
 * Formato padronizado em UTF-8 com separadores, símbolos limpos e sem caracteres corrompidos.
 */

import { CartItem, Coupon, OrderForm } from '../types/catalog';
import { calculateOrderFinancials, formatCurrency } from './pricing';

export interface AttendanceRecordData {
  referenceId: string;
  dateTimeBrasilia: {
    date: string; // DD/MM/AAAA
    time: string; // HH:MM
  };
  form: OrderForm;
  cart: CartItem[];
  isUsbCableAdded: boolean;
  cablePrice: number;
  appliedCoupon: Coupon | null;
  situation?: string;
}

/**
 * Generates an immutable, readable reference ID (e.g. PW-20261023-A84F)
 */
export function generateReferenceId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PW-${year}${month}${day}-${randomSuffix}`;
}

/**
 * Returns date and time formatted in Brasília timezone (America/Sao_Paulo)
 */
export function getBrasiliaDateTime(dateObj = new Date()) {
  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return {
    date: dateFormatter.format(dateObj),
    time: `${timeFormatter.format(dateObj)} (Brasília)`,
  };
}

/**
 * Formats the exact administrative record requested by the user.
 */
export function formatAttendanceRecord(data: AttendanceRecordData): string {
  const {
    referenceId,
    dateTimeBrasilia,
    form,
    cart,
    isUsbCableAdded,
    cablePrice,
    appliedCoupon,
  } = data;

  const financials = calculateOrderFinancials({
    cart,
    isUsbCableAdded,
    cablePrice,
    appliedCoupon,
    isPickup: form.isPickup,
    deliveryFee: 10.0,
  });

  // Items formatting
  const itemsLines: string[] = [];
  let itemCounter = 1;

  for (const item of cart) {
    const itemNum = String(itemCounter++).padStart(2, '0');
    const unitPriceFormatted = formatCurrency(item.price);
    const itemTotalFormatted = formatCurrency(item.price * item.quantity);
    const safeEmoji = item.flavorEmoji && item.flavorEmoji.trim() !== '' ? item.flavorEmoji : '🔹';

    itemsLines.push(
      `*${itemNum} | ${item.brandName ? item.brandName + ' ' : ''}${item.modelName}*\n` +
      `Variante: ${safeEmoji} ${item.flavorName}\n` +
      `Quantidade: ${item.quantity} ${item.quantity === 1 ? 'unidade' : 'unidades'}\n` +
      `Valor unitário: ${unitPriceFormatted}\n` +
      `Total do item: ${itemTotalFormatted}`
    );
  }

  // Accessories (USB-C cable)
  if (isUsbCableAdded) {
    const addonNum = String(itemCounter++).padStart(2, '0');
    const addonPriceFormatted = formatCurrency(cablePrice);

    itemsLines.push(
      `*${addonNum} | Cabo USB Tipo C Turbo 1m*\n` +
      `Variante: 🔌 Cabo Turbo Recarregável\n` +
      `Quantidade: 1 unidade\n` +
      `Valor unitário: ${addonPriceFormatted}\n` +
      `Total do item: ${addonPriceFormatted}`
    );
  }

  // Address block formatting with all individual fields
  let addressBlock = '';
  if (form.isPickup) {
    addressBlock =
      `*Modalidade:* 🏪 Retirada no Local\n` +
      `*Ponto:* Ponto Autorizado PodWave (Retirada no Local)\n` +
      `*Taxa de entrega:* R$ 0,00 (Isento)`;
  } else {
    const fullStreet = form.address?.trim() || 'Não informado';
    const numComp = form.numberAndComplement?.trim() || 'S/N';
    const bairroText = form.bairro?.trim() || 'Não informado';
    const cityText = form.city?.trim() || 'Região Atendida';
    const refText = form.referencePoint?.trim() || 'Não informado';

    addressBlock =
      `*Rua / Logradouro:* ${fullStreet}\n` +
      `*Número e Complemento:* ${numComp}\n` +
      `*Bairro:* ${bairroText}\n` +
      `*Cidade:* ${cityText}\n` +
      `*Ponto de Referência:* ${refText}`;
  }

  // GPS link block
  const gpsBlock = form.gpsMapsUrl && form.gpsMapsUrl.trim() !== ''
    ? `*Link GPS:* ${form.gpsMapsUrl}`
    : `*Link GPS:* Não informado`;

  // Notes block
  const notesText = form.notes && form.notes.trim() !== ''
    ? form.notes.trim()
    : 'Nenhuma observação informada.';

  // Loyalty card
  const hasSnapshot =
    typeof form.loyaltyStampsSnapshot === 'number' &&
    typeof form.loyaltyGoalSnapshot === 'number';
  const snapshotSuffix = hasSnapshot
    ? ` — Saldo atual no perfil: ${form.loyaltyStampsSnapshot}/${form.loyaltyGoalSnapshot} selos`
    : '';
  const loyaltyText = form.wantsLoyaltyCard
    ? `Sim (Solicitado validação de selo${snapshotSuffix})`
    : hasSnapshot && form.loyaltyStampsSnapshot! > 0
    ? `Cliente possui ${form.loyaltyStampsSnapshot}/${form.loyaltyGoalSnapshot} selos no perfil`
    : 'Não solicitado';

  // Build finalized message using clean WhatsApp compatible UTF-8
  return `🌊 *PODWAVE*
*FICHA DE ATENDIMENTO OFICIAL*
----------------------------------------

🆔 *Referência:* ${referenceId}
📅 *Data:* ${dateTimeBrasilia.date}
🕒 *Horário:* ${dateTimeBrasilia.time}

👤 *DADOS DO CLIENTE*
----------------------------------------
*Nome:* ${form.fullName.trim()}
*Telefone / WhatsApp:* ${form.phoneWhatsapp.trim()}

📍 *ENDEREÇO DE ENTREGA*
----------------------------------------
${addressBlock}
${gpsBlock}

📦 *ITENS REGISTRADOS*
----------------------------------------
${itemsLines.join('\n\n')}

💰 *RESUMO FINANCEIRO*
----------------------------------------
Subtotal itens: ${financials.itemsSubtotalFormatted}
Adicionais: ${financials.addonFormatted}
Descontos: ${financials.discountFormatted}
Taxa de entrega: ${financials.deliveryFeeFormatted}
*TOTAL REGISTRADO: ${financials.totalFormatted}*

💳 *INFORMAÇÕES DE PAGAMENTO*
----------------------------------------
*Forma de pagamento:* ${form.paymentMethod || 'A combinar'}
*Cartão fidelidade:* ${loyaltyText}

📝 *OBSERVAÇÕES*
----------------------------------------
${notesText}

✅ *REGISTRO GERADO COM SUCESSO*
🌊 *PODWAVE* — Mais que um vape, é uma Onda.
----------------------------------------`;
}

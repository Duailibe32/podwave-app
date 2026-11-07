import type { CustomerOrderHistoryItem } from '../types/catalog';
import { formatCurrency } from './pricing';
import { formatTicketDate, ticketItemLabel, ticketStatus } from './orderTicket';

export async function downloadOrderTicket(order: CustomerOrderHistoryItem, delivery: string, stamps: string) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('O navegador não conseguiu gerar a imagem.');
  const width = 680;
  const pad = 52;
  context.font = '23px system-ui, sans-serif';
  const wrap = (text: string) => {
    const rows: string[] = [];
    let line = '';
    for (const word of text.trim().split(/\s+/)) {
      const fragment = [...word].slice(0, 65).join('');
      if (line && context.measureText(line + ' ' + fragment).width > width - pad * 2) {
        rows.push(line);
        line = fragment;
      } else {
        line += (line ? ' ' : '') + fragment;
      }
    }
    if (line) rows.push(line);
    return rows;
  };
  const lines = order.items.flatMap(item => wrap(ticketItemLabel(item)));
  const payment = wrap('Pagamento · ' + (order.paymentMethod || 'A combinar'));
  canvas.width = width;
  canvas.height = 660 + (lines.length + payment.length) * 36;
  const height = canvas.height;
  const divider = (y: number) => {
    context.strokeStyle = '#4a5484';
    context.setLineDash([9, 9]);
    context.beginPath();
    context.moveTo(pad, y);
    context.lineTo(width - pad, y);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = '#080811';
    for (const x of [20, width - 20]) {
      context.beginPath();
      context.arc(x, y, 15, 0, Math.PI * 2);
      context.fill();
    }
  };
  const text = (value: string, y: number, color: string, size = 23, weight = 500) => {
    context.fillStyle = color;
    context.font = weight + ' ' + size + 'px system-ui, sans-serif';
    context.fillText(value, pad, y, width - pad * 2);
  };
  context.fillStyle = '#080811';
  context.fillRect(0, 0, width, height);
  const tint = context.createLinearGradient(20, 20, width - 20, height * .6);
  tint.addColorStop(0, '#202251');
  tint.addColorStop(.55, '#0f152d');
  tint.addColorStop(1, '#15142b');
  context.beginPath();
  context.roundRect(20, 20, width - 40, height - 40, 28);
  context.fillStyle = tint;
  context.fill();
  context.strokeStyle = '#6572b5';
  context.stroke();

  text('⚡ PODWAVE OFICIAL', 75, '#84f4ff', 24, 800);
  text('Ticket Digital', 141, '#ffffff', 48, 900);
  text('#' + order.referenceId.replace(/^#/, ''), 190, '#c7b5ff', 28, 800);
  text(formatTicketDate(order.createdAt), 223, '#c0c8e5', 21);
  divider(253);
  text(delivery, 302, '#84f4ff', 26, 800);
  text('Situação na emissão · ' + ticketStatus(order), 343, '#ffffff', 21, 700);
  text('ITENS DO PEDIDO', 393, '#c0c8e5', 19, 800);
  let y = 430;
  for (const line of [...lines, ...payment]) {
    text(line, y, '#e9efff');
    y += 36;
  }
  divider(y);
  text('TOTAL · ' + formatCurrency(order.total), y + 55, '#9af7d4', 38, 900);
  if (order.discount > 0) text('Economia de ' + formatCurrency(order.discount), y + 90, '#9af7d4', 22);
  text('Fidelidade · ' + stamps, y + 140, '#d3c6ff', 22, 800);
  text('Comprovante de pedido · Acompanhe em Meus Pedidos', y + 182, '#c0c8e5', 17);

  const file = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!file) throw new Error('Não foi possível exportar a imagem.');
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'PodWave-' + order.referenceId.replace(/[^a-zA-Z0-9-]/g, '') + '.png';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

import type { ManualSaleEntry, ManualCommitmentEntry, SyncStatus } from '../types/catalog';

export interface CustomerPaymentRecord {
  key: string;
  date?: string;
  amountCents: number;
  method: string;
  notes?: string;
}
export interface CustomerFinancialRecord {
  key: string;
  id: string;
  origin: 'venda' | 'avulsa';
  description: string;
  date?: string;
  dueDate?: string;
  totalCents: number;
  receivedCents: number;
  pendingCents: number;
  cancelled: boolean;
  status: string;
  syncStatus?: SyncStatus;
  payments: CustomerPaymentRecord[];
}
export interface CustomerFinancialFile {
  key: string;
  name: string;
  contact?: string;
  normalizedContact?: string;
  groupedByContact: boolean;
  records: CustomerFinancialRecord[];
  salesCount: number;
  purchasesCents: number;
  salesReceivedCents: number;
  standaloneReceivedCents: number;
  pendingCents: number;
  unconfirmedCount: number;
}

export const normalizeCustomerName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g,' ');

export function financialRecordTime(value?: string): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const result=Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value+'T12:00:00' : value);
  return Number.isFinite(result) ? result : Number.NEGATIVE_INFINITY;
}

// A phone is a grouping hint, not proof of identity. Names must match as well.
export function normalizeCustomerContact(contact?: string): string | undefined {
  const raw = contact?.trim() || '';
  if (!raw || !/^\+?[\d\s().-]+$/.test(raw)) return undefined;
  const digits = raw.replace(/\D/g,'');
  if (/^(\d)\1+$/.test(digits)) return undefined;
  if (raw.startsWith('+')) {
    const valid = digits.startsWith('55') ? /^55[1-9]\d{9,10}$/.test(digits) : /^[1-9]\d{7,14}$/.test(digits);
    return valid ? '+'+digits : undefined;
  }
  if (/^[1-9]\d{9,10}$/.test(digits)) return '+55'+digits;
  if (/^55[1-9]\d{9,10}$/.test(digits)) return '+'+digits;
  return undefined;
}
function cents(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON)*100) : 0;
}
function paymentsFor(origin: string, rows: {id: string; amount: number; paymentMethod: string; notes?: string; receiptDate?: string; paymentDate?: string}[]): CustomerPaymentRecord[] {
  const seen = new Set<string>();
  return rows.flatMap((row,index) => {
    if (!row || typeof row !== 'object') return [];
    if (row.id && seen.has(row.id)) return [];
    if (row.id) seen.add(row.id);
    return [{key:JSON.stringify([origin,row.id || index]),date:row.receiptDate || row.paymentDate,amountCents:cents(row.amount),method:row.paymentMethod || 'Não informado',notes:row.notes}];
  });
}
export function buildCustomerFinancialFiles(sales: ManualSaleEntry[], commitments: ManualCommitmentEntry[]): CustomerFinancialFile[] {
  const files = new Map<string,CustomerFinancialFile>();
  const seen = new Set<string>();
  const add = (name: string | undefined,contact: string | undefined,record: CustomerFinancialRecord) => {
    if (seen.has(record.key)) return;
    seen.add(record.key);
    const cleanName = name?.trim();
    const normalizedContact = normalizeCustomerContact(contact);
    const groupedByContact = Boolean(cleanName && normalizedContact);
    const key = groupedByContact ? JSON.stringify(['contato',normalizeCustomerName(cleanName!),normalizedContact]) : JSON.stringify(['registro',record.key]);
    let file = files.get(key);
    if (!file) {
      file = {key,name:cleanName || 'Cliente não identificado',contact:contact?.trim() || undefined,normalizedContact,groupedByContact,records:[],salesCount:0,purchasesCents:0,salesReceivedCents:0,standaloneReceivedCents:0,pendingCents:0,unconfirmedCount:0};
      files.set(key,file);
    }
    file.records.push(record);
    if (record.syncStatus !== 'synced') file.unconfirmedCount++;
    if (!record.cancelled) {
      if (record.origin === 'venda') {
        file.salesCount++;file.purchasesCents+=record.totalCents;file.salesReceivedCents+=record.receivedCents;
      } else file.standaloneReceivedCents+=record.receivedCents;
      // Parent balances are the source of truth. Payment details are never added again.
      file.pendingCents+=record.pendingCents;
    }
  };
  for (const sale of sales) {
    const key = JSON.stringify(['venda',sale.id]);
    add(sale.customerName,sale.customerPhone,{
      key,id:sale.id,origin:'venda',description:'Venda',date:sale.saleDate,dueDate:sale.dueDate,
      totalCents:cents(sale.netTotal ?? sale.grossTotal),receivedCents:cents(sale.amountReceived),pendingCents:cents(sale.amountPending),
      cancelled:sale.orderStatus==='cancelado',status:sale.orderStatus,syncStatus:sale._syncStatus,
      payments:paymentsFor(key,sale.receipts || []),
    });
  }
  for (const commitment of commitments) {
    if (commitment.type!=='a_receber') continue;
    const key = JSON.stringify(['avulsa',commitment.id]);
    add(commitment.counterpartyName,commitment.counterpartyContact,{
      key,id:commitment.id,origin:'avulsa',description:commitment.description,date:commitment.issueDate,dueDate:commitment.dueDate,
      totalCents:cents(commitment.totalAmount),receivedCents:cents(commitment.amountPaid),pendingCents:cents(commitment.amountPending),
      cancelled:commitment.paymentStatus==='cancelado',status:commitment.paymentStatus,syncStatus:commitment._syncStatus,
      payments:paymentsFor(key,commitment.payments || []),
    });
  }
  for (const file of files.values()) file.records.sort((a,b) => financialRecordTime(b.date)-financialRecordTime(a.date) || a.key.localeCompare(b.key));
  return [...files.values()].sort((a,b) => a.name.localeCompare(b.name,'pt-BR') || a.key.localeCompare(b.key));
}

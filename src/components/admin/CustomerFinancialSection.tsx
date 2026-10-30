import React, { useMemo, useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { buildCustomerFinancialFiles, normalizeCustomerName, financialRecordTime } from '../../utils/customerFinancialRecords';
import { CustomerServiceHistory } from './CustomerServiceHistory';

const brl = (value: number) => (value/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dateLabel = (value?: string) => {
  if (!value) return 'Sem data';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value+'T12:00:00' : value);
  return Number.isNaN(date.getTime()) ? 'Data inválida na origem' : date.toLocaleDateString('pt-BR');
};
const statuses: Record<string,string> = {confirmado:'Confirmado',pendente:'Pendente',entregue:'Entregue',cancelado:'Cancelado',parcial:'Parcial',pago:'Pago'};
const syncLabel = (value?: string) => value==='synced' ? 'Confirmado no banco' : value==='sync_error' ? 'Falha de sincronização' : value==='pending_sync' ? 'Pendente de sincronização' : 'Sem confirmação nesta sessão';
const pageSize=15;

export function CustomerFinancialSection() {
  const {isOwner,manualSales,manualCommitments,isLoadingBusinessData,fetchBusinessData}=useCatalog();
  const [search,setSearch]=useState('');
  const [onlyPending,setOnlyPending]=useState(false);
  const [page,setPage]=useState(0);
  const [selectedKey,setSelectedKey]=useState<string | null>(null);
  const [tab,setTab]=useState<'records'|'payments'>('records');
  const [detailPage,setDetailPage]=useState(0);
  const [refreshError,setRefreshError]=useState('');
  const files=useMemo(() => isOwner ? buildCustomerFinancialFiles(manualSales,manualCommitments) : [],[isOwner,manualSales,manualCommitments]);
  const filtered=useMemo(() => {
    const nameQuery=normalizeCustomerName(search);
    const contactQuery=search.replace(/\D/g,'');
    return files.filter(file => (!onlyPending || file.pendingCents>0) && (!nameQuery || normalizeCustomerName(file.name).includes(nameQuery) || file.records.some(r => normalizeCustomerName(r.id).includes(nameQuery)) || (contactQuery && (file.normalizedContact || file.contact || '').replace(/\D/g,'').includes(contactQuery))));
  },[files,search,onlyPending]);
  const selected=files.find(file => file.key===selectedKey);
  const payments=selected?.records.flatMap(record => record.payments.map(payment => ({...payment,record}))).sort((a,b) => financialRecordTime(b.date)-financialRecordTime(a.date) || a.key.localeCompare(b.key)) || [];
  if (!isOwner) return <p className="text-sm text-gray-400">A ficha financeira é restrita ao proprietário.</p>;
  const button='rounded-xl border border-white/15 px-3 py-2 text-sm disabled:opacity-40';
  const currentPage=Math.min(page,Math.max(0,Math.ceil(filtered.length/pageSize)-1));
  const detailTotal=tab==='records' ? selected?.records.length || 0 : payments.length;
  const currentDetailPage=Math.min(detailPage,Math.max(0,Math.ceil(detailTotal/pageSize)-1));
  const paginator=(index: number,total: number,update: (value: number) => void) => <div className="flex justify-end items-center gap-3 text-sm"><button className={button} disabled={index===0} onClick={() => update(index-1)}>Anterior</button><span>Página {index+1} de {Math.max(1,Math.ceil(total/pageSize))}</span><button className={button} disabled={(index+1)*pageSize>=total} onClick={() => update(index+1)}>Próxima</button></div>;
  return <section className="space-y-5 text-white">
    <header className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">Ficha financeira do cliente</h2><p className="text-sm text-gray-400">Consulta dos registros financeiros disponíveis neste navegador. Atendimentos internos são registrados separadamente abaixo.</p></div><button disabled={isLoadingBusinessData} className={button} onClick={async () => {setRefreshError('');try{await fetchBusinessData();}catch{setRefreshError('Não foi possível atualizar. Os dados carregados foram preservados.');}}}>{isLoadingBusinessData ? 'Atualizando...' : 'Atualizar dados'}</button></header>
    {refreshError && <p role="alert" className="text-sm text-amber-300">{refreshError}</p>}
    <p className="rounded-xl bg-[#121633] p-3 text-xs text-gray-300">O agrupamento usa nome e telefone válidos iguais. Não é um cadastro único de pessoas. Sem contato suficiente, cada registro tem sua própria ficha. Corrija nomes e contatos na venda ou conta original quando necessário.</p>
    <div className="flex flex-wrap gap-4 items-end"><label className="flex-1 min-w-48 text-sm">Buscar cliente, telefone ou ID de registro<input value={search} onChange={e => {setSearch(e.target.value);setPage(0);}} className="mt-1 block w-full rounded-xl bg-[#181C3D] p-3" /></label><label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={onlyPending} onChange={e => {setOnlyPending(e.target.checked);setPage(0);}} />Somente com saldo pendente</label></div>
    <p className="text-xs text-gray-400">{filtered.length} ficha(s) encontrada(s). Valores incluem os registros locais exibidos; confira os indicadores de sincronização.</p>
    <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full text-sm"><thead className="bg-[#121633] text-[#C4C6D8] text-left"><tr>{['Cliente / vínculo','Contato','Total comprado','Saldo a receber',''].map((label,i) => <th key={i} className={'p-3 '+(i===2 || i===3 ? 'text-right' : '')}>{label}</th>)}</tr></thead><tbody className="divide-y divide-[#8423DA]/15">{filtered.slice(currentPage*pageSize,(currentPage+1)*pageSize).map(file => <tr key={file.key} className={file.key===selectedKey ? 'bg-cyan-500/5' : ''}><td className="p-3"><span className="font-semibold">{file.name}</span><div className="text-xs text-gray-400">{file.groupedByContact ? 'Agrupado por nome e contato' : 'Registro separado: contato insuficiente'}{file.unconfirmedCount>0 && <span className="block text-amber-300">{file.unconfirmedCount} sem confirmação no banco</span>}</div></td><td className="p-3 whitespace-nowrap">{file.contact || 'Não informado'}</td><td className="p-3 text-right tabular-nums">{brl(file.purchasesCents)}</td><td className="p-3 text-right tabular-nums">{brl(file.pendingCents)}</td><td className="p-3"><button className={button} onClick={() => {setSelectedKey(file.key);setDetailPage(0);setTab('records');}}>Abrir ficha</button></td></tr>)}</tbody></table>{!filtered.length && <p className="p-5 text-center text-sm text-gray-400">{isLoadingBusinessData ? 'Carregando registros...' : 'Nenhum cliente encontrado nos registros carregados.'}</p>}</div>
    {paginator(currentPage,filtered.length,setPage)}
    {selected && <section className="rounded-2xl border border-cyan-500/20 bg-[#0D1022] p-4 sm:p-5 space-y-4" aria-label={'Ficha de '+selected.name}>
      <div className="flex justify-between gap-3"><div><h3 className="text-lg font-bold">{selected.name}</h3><p className="text-sm text-gray-400">{selected.contact || 'Contato não informado'}</p></div><button className={button} onClick={() => setSelectedKey(null)}>Fechar ficha</button></div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[
        ['Vendas não canceladas',String(selected.salesCount)],['Total comprado',brl(selected.purchasesCents)],['Recebido em vendas',brl(selected.salesReceivedCents)],['Recebido em contas avulsas',brl(selected.standaloneReceivedCents)],['Saldo a receber',brl(selected.pendingCents)],
      ].map(([label,value]) => <div key={label} className="rounded-xl border border-white/10 p-3"><p className="text-xs text-gray-400">{label}</p><p className="mt-1 font-bold tabular-nums">{value}</p></div>)}</div>
      <p className="text-xs text-gray-400">O saldo soma vendas e contas avulsas a receber não canceladas. Contas avulsas são adicionais: uma dívida cadastrada também como conta avulsa pode estar duplicada na origem. Os pagamentos detalhados abaixo não são somados novamente. Cancelamentos não comprovam devolução de valores.</p>
      <div className="flex flex-wrap gap-3"><button className={button+(tab==='records'?' bg-cyan-700':'')} onClick={() => {setTab('records');setDetailPage(0);}}>Vendas e contas ({selected.records.length})</button><button className={button+(tab==='payments'?' bg-cyan-700':'')} onClick={() => {setTab('payments');setDetailPage(0);}}>Pagamentos detalhados ({payments.length})</button></div>
      {tab==='records' ? <div className="space-y-3">{selected.records.slice(currentDetailPage*pageSize,(currentDetailPage+1)*pageSize).map(record => {
        const detailed=record.payments.reduce((n,p) => n+p.amountCents,0);
        return <article key={record.key} className="rounded-xl border border-white/10 p-3 space-y-2"><div className="flex flex-wrap justify-between gap-2"><div className="font-semibold">{record.origin==='venda'?'Venda':'Conta avulsa a receber'} · {record.description==='Venda'?record.id:record.description}</div><span className={record.cancelled?'text-rose-300':'text-gray-300'}>{statuses[record.status] || record.status}</span></div><p className="text-xs text-gray-400 break-all">ID: {record.id} · Data: {dateLabel(record.date)} · Vencimento: {dateLabel(record.dueDate)}</p><div className="flex flex-wrap gap-4 text-sm tabular-nums"><span>Total: {brl(record.totalCents)}</span><span>Recebido: {brl(record.receivedCents)}</span><span>Saldo registrado: {brl(record.pendingCents)}</span></div><p className={'text-xs '+(record.syncStatus==='synced'?'text-emerald-300':'text-amber-300')}>{syncLabel(record.syncStatus)}</p>{record.cancelled && <p className="text-xs text-rose-300">Registro cancelado, fora dos totais da ficha.</p>}{detailed!==record.receivedCents && <p className="text-xs text-amber-300">Recebido registrado na origem: {brl(record.receivedCents)}. Pagamentos com detalhamento disponível: {brl(detailed)}. O histórico de pagamentos pode estar incompleto.</p>}</article>;
      })}</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#121633] text-[#C4C6D8] text-left"><tr>{['Data','Origem','Forma','Valor','Observação'].map((label,i) => <th key={label} className={'p-3 '+(i===3?'text-right':'')}>{label}</th>)}</tr></thead><tbody className="divide-y divide-[#8423DA]/15">{payments.slice(currentDetailPage*pageSize,(currentDetailPage+1)*pageSize).map(payment => <tr key={payment.key}><td className="p-3 whitespace-nowrap">{dateLabel(payment.date)}</td><td className="p-3 break-all">{payment.record.origin==='venda'?'Venda':'Conta avulsa'} · {payment.record.id}{payment.record.cancelled && <span className="block text-rose-300 text-xs">Origem cancelada; fora dos totais</span>}</td><td className="p-3">{payment.method}</td><td className="p-3 text-right tabular-nums">{brl(payment.amountCents)}</td><td className="p-3">{payment.notes || '—'}</td></tr>)}</tbody></table>{!payments.length && <p className="p-4 text-sm text-gray-400">Nenhum pagamento detalhado disponível. Os valores recebidos continuam registrados na origem.</p>}</div>}
      {paginator(currentDetailPage,detailTotal,setDetailPage)}
      <CustomerServiceHistory key={selected.key} customer={selected} />
    </section>}
  </section>;
}

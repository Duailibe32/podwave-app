import React, { useEffect, useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { getSupabaseClient } from '../../services/supabase';
import { ActivityLogsSection } from './ActivityLogsSection';

interface AuditEvent {
  id: number; occurred_at: string; actor_id: string | null; actor_label: string | null;
  operation: string; entity: string; record_id: string; summary: string;
  before_data: Record<string, unknown> | null; after_data: Record<string, unknown> | null;
}
const entities: Record<string,string> = {
  manual_sales:'Vendas',manual_expenses:'Gastos',merchandise_purchases:'Compras',cash_movements:'Fluxo de caixa',
  initial_cash_balances:'Saldos iniciais',manual_commitments:'Contas pendentes',brands:'Marcas',product_models:'Produtos',
  flavor_variants:'Sabores e estoque',banners:'Banners',coupons:'Cupons',
};
const operations: Record<string,string> = {INSERT:'Criação',UPDATE:'Alteração',DELETE:'Exclusão'};
const labels: Record<string,string> = {demo_quantity:'Quantidade em estoque',in_stock:'Disponível',items:'Itens',total:'Total',amount:'Valor',payment_status:'Situação do pagamento',amount_received:'Valor recebido',amount_paid:'Valor pago',amount_pending:'Valor pendente',notes:'Observações',stock_allocation:'Unidades reservadas por sabor',stock_revision:'Versão da venda',stock_deducted:'Estoque descontado',stock_managed:'Controle automático',title:'Descrição',customer_name:'Cliente',supplier:'Fornecedor',person_or_supplier:'Pessoa / fornecedor'};
function display(value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'string' && value.startsWith('podwave:financial-notes:v1:')) {
    try { return JSON.stringify(JSON.parse(value.slice('podwave:financial-notes:v1:'.length)),null,2); } catch { /* Keep original. */ }
  }
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return typeof value === 'object' ? JSON.stringify(value,null,2) : String(value);
}
function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = "'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}

export function BusinessAuditSection() {
  const { isAdmin } = useCatalog();
  const [events,setEvents] = useState<AuditEvent[]>([]);
  const [total,setTotal] = useState(0);
  const [page,setPage] = useState(0);
  const [search,setSearch] = useState('');
  const [query,setQuery] = useState('');
  const [entity,setEntity] = useState('');
  const [operation,setOperation] = useState('');
  const [start,setStart] = useState('');
  const [end,setEnd] = useState('');
  const [refresh,setRefresh] = useState(0);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [selected,setSelected] = useState<AuditEvent | null>(null);
  const size = 25;
  useEffect(() => {
    let cancelled = false;
    if (!isAdmin) { setEvents([]); setSelected(null); return; }
    setLoading(true); setError(''); setEvents([]);
    (async () => {
      const client = getSupabaseClient();
      if (!client) throw new Error('Conecte o Supabase para consultar a auditoria.');
      if (start && end && start>end) throw new Error('A data final deve ser posterior à inicial.');
      let request = client.from('business_audit_events').select('*',{count:'exact'}).order('occurred_at',{ascending:false}).order('id',{ascending:false});
      if (entity) request = request.eq('entity',entity);
      if (operation) request = request.eq('operation',operation);
      if (start) request = request.gte('occurred_at',new Date(start+'T00:00:00').toISOString());
      if (end) request = request.lte('occurred_at',new Date(end+'T23:59:59.999').toISOString());
      const safe = query.replace(/[^\p{L}\p{N}@ .:_-]/gu,' ').trim().slice(0,160);
      if (safe) request = request.or(`record_id.ilike.%${safe}%,actor_label.ilike.%${safe}%,summary.ilike.%${safe}%`);
      const { data,error,count } = await request.range(page*size,page*size+size-1);
      if (error) throw new Error(['42P01','PGRST205'].includes(error.code) ? 'A auditoria completa ainda não foi instalada no Supabase. O histórico anterior está disponível abaixo.' : error.message);
      if (!cancelled) { setEvents(data || []); setTotal(count || 0); }
    })().catch((e) => {if (!cancelled) {setError(e.message || 'Não foi possível consultar o histórico.');setTotal(0);}}).finally(() => {if (!cancelled) setLoading(false);});
    return () => { cancelled = true; };
  },[isAdmin,page,query,entity,operation,start,end,refresh]);
  if (!isAdmin) return null;
  const exportPage = () => {
    const rows = [['Data','Responsável','Ação','Área','Registro','Resumo'],...events.map(e => [new Date(e.occurred_at).toLocaleString('pt-BR'),e.actor_label || e.actor_id || 'Sistema',operations[e.operation],entities[e.entity] || e.entity,e.record_id,e.summary])];
    const url = URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row => row.map(csvCell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download='auditoria_podwave_pagina_'+(page+1)+'.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return <div className="space-y-6 text-white">
    <section className="rounded-2xl border border-cyan-500/25 bg-[#0D1022] p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">Auditoria completa do proprietário</h2><p className="text-sm text-gray-400">Operações confirmadas no banco, com responsável e valores antes e depois. Consulta restrita à permissão financeira do proprietário. O histórico começa na instalação desta atualização.</p></div><button className="px-4 py-2 rounded-xl border border-cyan-500/40" onClick={() => setRefresh(n => n+1)} disabled={loading}>Atualizar</button></div>
      <form className="flex flex-wrap gap-3" onSubmit={e => {e.preventDefault();setPage(0);setQuery(search);}}>
        <label className="flex-1 min-w-48 text-xs text-gray-400">Buscar responsável, descrição ou ID<input value={search} onChange={e => setSearch(e.target.value)} className="block w-full bg-[#181C3D] rounded-lg p-2 text-white" /></label>
        <label className="text-xs text-gray-400">Área<select value={entity} onChange={e => {setEntity(e.target.value);setPage(0);}} className="block bg-[#181C3D] rounded-lg p-2 text-white"><option value="">Todas as áreas</option>{Object.entries(entities).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-xs text-gray-400">Ação<select value={operation} onChange={e => {setOperation(e.target.value);setPage(0);}} className="block bg-[#181C3D] rounded-lg p-2 text-white"><option value="">Todas</option>{Object.entries(operations).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-xs text-gray-400">De<input type="date" value={start} onChange={e => {setStart(e.target.value);setPage(0);}} className="block bg-[#181C3D] p-2 rounded-lg text-white" /></label>
        <label className="text-xs text-gray-400">Até<input type="date" value={end} onChange={e => {setEnd(e.target.value);setPage(0);}} className="block bg-[#181C3D] p-2 rounded-lg text-white" /></label>
        <button className="px-4 rounded-lg bg-cyan-600" type="submit">Buscar</button>
      </form>
      <div className="flex justify-between text-sm"><span>{loading ? 'Consultando...' : `${total} eventos encontrados`}</span><button disabled={!events.length || loading} onClick={exportPage}>Exportar esta página (CSV)</button></div>
      {error && <p role="alert" className="p-3 rounded-xl border border-amber-500/30 text-amber-300">{error}</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-gray-400 text-left"><tr>{['Data e hora','Responsável','Ação / Área','Descrição / Registro',''].map((h,i) => <th key={i} className="p-3">{h}</th>)}</tr></thead><tbody>{events.map(e => <tr key={e.id} className="border-t border-white/10"><td className="p-3 whitespace-nowrap">{new Date(e.occurred_at).toLocaleString('pt-BR')}</td><td className="p-3 break-all">{e.actor_label || e.actor_id || 'Sistema'}</td><td className="p-3">{operations[e.operation]}<div className="text-xs text-cyan-300">{entities[e.entity] || e.entity}</div></td><td className="p-3">{e.summary}<div className="text-xs text-gray-400 break-all">{e.record_id}</div></td><td><button onClick={() => setSelected(e)} className="px-3 py-2 rounded-lg border border-white/20">Ver alterações</button></td></tr>)}</tbody></table>{!loading && !error && !events.length && <p className="p-5 text-center text-gray-400">Nenhum evento encontrado para estes filtros.</p>}</div>
      <div className="flex justify-end items-center gap-4 text-sm"><button disabled={page===0 || loading} onClick={() => setPage(p => p-1)}>Anterior</button><span>Página {page+1} de {Math.max(1,Math.ceil(total/size))}</span><button disabled={(page+1)*size>=total || loading} onClick={() => setPage(p => p+1)}>Próxima</button></div>
    </section>
    <details className="rounded-2xl border border-white/10 p-4"><summary className="cursor-pointer font-bold">Histórico anterior e registros locais</summary><p className="text-sm text-gray-400 my-3">Estes registros incluem atividades e tentativas registradas pelo aplicativo. São separados da auditoria confirmada no banco acima.</p><ActivityLogsSection /></details>
    {selected && <div className="fixed inset-0 z-[100] bg-black/80 p-4 flex items-center justify-center"><section role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" className="bg-[#11152A] rounded-2xl border border-cyan-500/30 p-5 w-full max-w-5xl max-h-[85vh] overflow-auto"><div className="flex justify-between gap-4"><div><h3 id="audit-detail-title" className="font-bold text-lg">{operations[selected.operation]} — {entities[selected.entity]}</h3><p className="text-xs text-gray-400 break-all">{selected.record_id} · {selected.actor_label || selected.actor_id || 'Sistema'} · {new Date(selected.occurred_at).toLocaleString('pt-BR')}</p></div><button autoFocus onClick={() => setSelected(null)} className="px-3 py-2 border border-white/20 rounded-lg">Fechar</button></div><div className="overflow-auto mt-4"><table className="w-full text-xs text-left"><thead><tr><th className="p-2">Campo</th><th className="p-2">Antes</th><th className="p-2">Depois</th></tr></thead><tbody>{Array.from(new Set([...Object.keys(selected.before_data || {}),...Object.keys(selected.after_data || {})])).filter(key => !['updated_at','stock_request_id'].includes(key) && JSON.stringify(selected.before_data?.[key])!==JSON.stringify(selected.after_data?.[key])).map(key => <tr key={key} className="border-t border-white/10"><th className="p-2 align-top">{labels[key] || key}</th><td className="p-2 align-top text-rose-200"><pre className="whitespace-pre-wrap break-all">{display(selected.before_data?.[key])}</pre></td><td className="p-2 align-top text-emerald-200"><pre className="whitespace-pre-wrap break-all">{display(selected.after_data?.[key])}</pre></td></tr>)}</tbody></table></div></section></div>}
  </div>;
}

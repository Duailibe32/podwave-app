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
  return (
    <div className="space-y-6 text-white animate-in fade-in duration-200">
      <section className="rounded-3xl border border-[#8423DA]/25 bg-[#0D1022] p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#8423DA]/20 pb-4">
          <div className="space-y-1">
            <h2 className="font-heading text-xl sm:text-2xl font-black text-white tracking-tight">
              Auditoria completa do proprietário
            </h2>
            <p className="text-xs sm:text-sm text-[#C4C6D8] max-w-3xl leading-relaxed">
              Operações confirmadas no banco, com responsável e valores antes e depois. Consulta restrita à permissão financeira do proprietário. O histórico começa na instalação desta atualização.
            </p>
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 border border-[#00DFFF]/40 text-[#00DFFF] hover:text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            onClick={() => setRefresh(n => n + 1)}
            disabled={loading}
          >
            Atualizar
          </button>
        </div>

        <form
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end p-4 rounded-2xl bg-[#080811] border border-[#8423DA]/20"
          onSubmit={e => {
            e.preventDefault();
            setPage(0);
            setQuery(search);
          }}
        >
          <label className="sm:col-span-2 lg:col-span-4 text-[11px] font-bold uppercase tracking-wider text-[#C4C6D8] space-y-1.5">
            <span>Buscar responsável, descrição ou ID</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ex: cliente, ID do registro, e-mail..."
              className="block w-full bg-[#141838] border border-[#8423DA]/30 focus:border-[#00DFFF] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
          </label>
          <label className="lg:col-span-2 text-[11px] font-bold uppercase tracking-wider text-[#C4C6D8] space-y-1.5">
            <span>Área</span>
            <select
              value={entity}
              onChange={e => {
                setEntity(e.target.value);
                setPage(0);
              }}
              className="block w-full bg-[#141838] border border-[#8423DA]/30 focus:border-[#00DFFF] rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors cursor-pointer"
            >
              <option value="">Todas as áreas</option>
              {Object.entries(entities).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-2 text-[11px] font-bold uppercase tracking-wider text-[#C4C6D8] space-y-1.5">
            <span>Ação</span>
            <select
              value={operation}
              onChange={e => {
                setOperation(e.target.value);
                setPage(0);
              }}
              className="block w-full bg-[#141838] border border-[#8423DA]/30 focus:border-[#00DFFF] rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors cursor-pointer"
            >
              <option value="">Todas</option>
              {Object.entries(operations).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-1.5 text-[11px] font-bold uppercase tracking-wider text-[#C4C6D8] space-y-1.5">
            <span>De</span>
            <input
              type="date"
              value={start}
              onChange={e => {
                setStart(e.target.value);
                setPage(0);
              }}
              className="block w-full bg-[#141838] border border-[#8423DA]/30 focus:border-[#00DFFF] px-2.5 py-2 rounded-xl text-xs text-white tabular-nums focus:outline-none transition-colors"
            />
          </label>
          <label className="lg:col-span-1.5 text-[11px] font-bold uppercase tracking-wider text-[#C4C6D8] space-y-1.5">
            <span>Até</span>
            <input
              type="date"
              value={end}
              onChange={e => {
                setEnd(e.target.value);
                setPage(0);
              }}
              className="block w-full bg-[#141838] border border-[#8423DA]/30 focus:border-[#00DFFF] px-2.5 py-2 rounded-xl text-xs text-white tabular-nums focus:outline-none transition-colors"
            />
          </label>
          <div className="lg:col-span-1 flex">
            <button
              className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] hover:brightness-110 text-[#080811] text-xs font-black shadow-md shadow-[#00DFFF]/20 transition-all cursor-pointer"
              type="submit"
            >
              Buscar
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#C4C6D8]">
          <span className="font-semibold tabular-nums">
            {loading ? 'Consultando...' : `${total} eventos encontrados`}
          </span>
          <button
            type="button"
            disabled={!events.length || loading}
            onClick={exportPage}
            className="px-3.5 py-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 border border-[#8423DA]/30 text-gray-200 hover:text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Exportar esta página (CSV)
          </button>
        </div>

        {error && (
          <p role="alert" className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-300">
            {error}
          </p>
        )}

        <div className="rounded-2xl border border-[#8423DA]/25 bg-[#080811] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse tabular-nums">
              <thead className="bg-[#121633] text-[#C4C6D8] font-extrabold uppercase tracking-wider text-[10px] border-b border-[#8423DA]/25 select-none">
                <tr>
                  {['Data e hora', 'Responsável', 'Ação / Área', 'Descrição / Registro', 'Ações'].map((h, i) => (
                    <th key={i} className={`py-3.5 px-4 ${i === 4 ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8423DA]/15">
                {events.map(e => (
                  <tr key={e.id} className="hover:bg-[#141838]/60 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-gray-200 align-middle">
                      {new Date(e.occurred_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 break-all font-semibold text-white align-middle">
                      {e.actor_label || e.actor_id || 'Sistema'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                          e.operation === 'INSERT'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : e.operation === 'UPDATE'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {operations[e.operation] || e.operation}
                      </span>
                      <div className="text-[11px] font-bold text-[#00DFFF] mt-1">
                        {entities[e.entity] || e.entity}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-middle">
                      <div className="font-semibold text-gray-100 leading-relaxed">{e.summary}</div>
                      <div className="text-[10px] font-mono text-[#A5A5B8] break-all mt-0.5">
                        ID: {e.record_id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle">
                      <button
                        type="button"
                        onClick={() => setSelected(e)}
                        className="px-3 py-1.5 rounded-xl bg-[#141838] hover:bg-[#8423DA]/40 border border-[#8423DA]/35 text-xs font-bold text-[#00DFFF] hover:text-white transition-colors cursor-pointer"
                      >
                        Ver alterações
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !error && !events.length && (
              <p className="p-8 text-center text-xs font-medium text-[#A5A5B8]">
                Nenhum evento encontrado para estes filtros.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end items-center gap-3 text-xs text-[#C4C6D8] pt-1">
          <button
            type="button"
            disabled={page === 0 || loading}
            onClick={() => setPage(p => p - 1)}
            className="px-3.5 py-1.5 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 border border-white/10 text-gray-200 font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="font-semibold tabular-nums">
            Página <strong className="text-white">{page + 1}</strong> de{' '}
            <strong className="text-white">{Math.max(1, Math.ceil(total / size))}</strong>
          </span>
          <button
            type="button"
            disabled={(page + 1) * size >= total || loading}
            onClick={() => setPage(p => p + 1)}
            className="px-3.5 py-1.5 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 border border-white/10 text-gray-200 font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Próxima
          </button>
        </div>
      </section>

      <details className="rounded-3xl border border-[#8423DA]/25 bg-[#0D1022] p-5 shadow-lg group">
        <summary className="cursor-pointer font-heading font-bold text-sm sm:text-base text-white flex items-center justify-between select-none">
          <span>Histórico anterior e registros locais</span>
          <span className="text-xs font-semibold text-[#00DFFF] group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <p className="text-xs text-[#C4C6D8] my-3 leading-relaxed">
          Estes registros incluem atividades e tentativas registradas pelo aplicativo. São separados da auditoria confirmada no banco acima.
        </p>
        <ActivityLogsSection />
      </details>

      {selected && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-200">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-detail-title"
            className="bg-[#0B0D1B] rounded-3xl border border-[#00DFFF]/35 shadow-2xl p-5 sm:p-6 w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#8423DA]/25">
              <div className="space-y-1">
                <h3 id="audit-detail-title" className="font-heading font-black text-lg text-white">
                  {operations[selected.operation]} — {entities[selected.entity]}
                </h3>
                <p className="text-xs font-mono text-[#C4C6D8] break-all">
                  {selected.record_id} · {selected.actor_label || selected.actor_id || 'Sistema'} ·{' '}
                  {new Date(selected.occurred_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <button
                autoFocus
                type="button"
                onClick={() => setSelected(null)}
                className="px-3.5 py-2 bg-[#141838] hover:bg-[#8423DA]/30 border border-white/15 rounded-xl text-xs font-bold text-gray-200 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                Fechar
              </button>
            </div>
            <div className="overflow-auto mt-4 rounded-2xl border border-[#8423DA]/25 bg-[#080811]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#121633] text-[#C4C6D8] font-extrabold uppercase tracking-wider text-[10px] border-b border-[#8423DA]/25">
                  <tr>
                    <th className="py-3 px-4 w-1/4">Campo</th>
                    <th className="py-3 px-4 w-[37.5%] text-rose-300">Antes</th>
                    <th className="py-3 px-4 w-[37.5%] text-emerald-300">Depois</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#8423DA]/15">
                  {Array.from(
                    new Set([
                      ...Object.keys(selected.before_data || {}),
                      ...Object.keys(selected.after_data || {}),
                    ])
                  )
                    .filter(
                      key =>
                        !['updated_at', 'stock_request_id'].includes(key) &&
                        JSON.stringify(selected.before_data?.[key]) !==
                          JSON.stringify(selected.after_data?.[key])
                    )
                    .map(key => (
                      <tr key={key} className="hover:bg-[#141838]/40 transition-colors">
                        <th className="py-3 px-4 align-top font-bold text-white">
                          {labels[key] || key}
                        </th>
                        <td className="py-3 px-4 align-top text-rose-200 bg-rose-500/[0.03]">
                          <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed">
                            {display(selected.before_data?.[key])}
                          </pre>
                        </td>
                        <td className="py-3 px-4 align-top text-emerald-200 bg-emerald-500/[0.03]">
                          <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed">
                            {display(selected.after_data?.[key])}
                          </pre>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

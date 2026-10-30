import React, { useEffect, useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';

export const SupabaseTab: React.FC<{ mode?: 'status' | 'advanced' }> = ({ mode = 'status' }) => {
  const {
    isOwner, brands, models, coupons, supabaseUrl, supabaseAnonKey, isSupabaseConfigured,
    supabaseStatus, supabaseStatusMessage, updateSupabaseCredentials, testSupabase,
    syncToSupabase, loadFromSupabase, isAutoSyncEnabled, setIsAutoSyncEnabled,
    isAutoSyncing, lastSyncedAt, pendingSyncCount, isSyncingPending, syncPendingFinancialData,
  } = useCatalog();
  const [urlInput, setUrlInput] = useState(supabaseUrl);
  const [keyInput, setKeyInput] = useState(supabaseAnonKey);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<'disconnect' | 'pull' | null>(null);
  useEffect(() => { setUrlInput(supabaseUrl); setKeyInput(supabaseAnonKey); }, [supabaseUrl, supabaseAnonKey]);

  const run = async (action: () => Promise<string>) => {
    if (busy) return;
    setBusy(true); setNotice('');
    try { setNotice(await action()); }
    catch { setNotice('Não foi possível concluir. Confira a conexão e tente novamente.'); }
    finally { setBusy(false); }
  };
  const saveConnection = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isOwner) return;
    void run(async () => {
      updateSupabaseCredentials(urlInput.trim(), keyInput.trim());
      const result = await testSupabase();
      return result.message;
    });
  };
  const confirmAction = async () => {
    const action = confirmation;
    if (busy || !action || (action === 'disconnect' && !isOwner)) return;
    setConfirmation(null);
    await run(async () => {
      if (action === 'disconnect') {
        updateSupabaseCredentials('', ''); setUrlInput(''); setKeyInput('');
        return 'Configuração deste navegador removida. A configuração de ambiente, se houver, continua disponível.';
      }
      return await loadFromSupabase() ? 'Catálogo recarregado.' : 'Não foi possível recarregar o catálogo. Confira a conexão.';
    });
  };
  const button = 'px-4 py-2.5 rounded-xl border border-white/15 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed';
  const noticeView = notice && <p role="status" className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm">{notice}</p>;
  const confirmationView = confirmation && <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
    <section role="alertdialog" aria-modal="true" aria-labelledby="connection-confirm-title" className="w-full max-w-md rounded-2xl border border-white/15 bg-[#11152A] p-6 space-y-4">
      <h3 id="connection-confirm-title" className="text-lg font-bold">{confirmation === 'pull' ? 'Recarregar o catálogo?' : 'Remover a configuração local?'}</h3>
      <p className="text-sm text-gray-300">{confirmation === 'pull' ? 'Marcas, produtos, sabores, cupons e banners deste navegador serão carregados do banco. Alterações locais ainda não enviadas podem ser substituídas.' : 'Remove a URL e a chave salvas neste navegador. Não apaga registros do banco nem encerra sua conta.'}</p>
      <div className="flex justify-end gap-3"><button autoFocus onClick={() => setConfirmation(null)} className={button}>Cancelar</button><button onClick={confirmAction} disabled={busy} className={button+' bg-cyan-700'}>Confirmar</button></div>
    </section>
  </div>;

  if (mode === 'advanced') {
    if (!isOwner) return null;
    return <section className="rounded-2xl border border-white/10 p-4 space-y-4 text-white">
      <h3 className="font-bold">Conexão com o Supabase</h3>
      <p className="text-sm text-gray-400">Configuração técnica deste navegador. Use somente a chave pública do projeto.</p>
      {noticeView}
      <form onSubmit={saveConnection} className="space-y-3">
        <label className="block text-sm">URL do projeto<input type="url" required value={urlInput} onChange={e => setUrlInput(e.target.value)} className="mt-1 block w-full rounded-lg bg-[#181C3D] p-3 font-mono text-xs" /></label>
        <label className="block text-sm">Chave pública<input type="password" required autoComplete="off" value={keyInput} onChange={e => setKeyInput(e.target.value)} className="mt-1 block w-full rounded-lg bg-[#181C3D] p-3 font-mono text-xs" /></label>
        <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className={button+' bg-cyan-700'}>{busy ? 'Verificando...' : 'Salvar e verificar conexão'}</button>{isSupabaseConfigured && <button type="button" disabled={busy} onClick={() => setConfirmation('disconnect')} className={button+' text-rose-300'}>Remover configuração local</button>}</div>
      </form>
      <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="inline-block text-sm text-cyan-300">Abrir painel do Supabase ↗</a>
      <p className="text-xs text-gray-400">A manutenção do banco usa arquivos revisados no repositório. Os atalhos antigos de SQL e dados demonstrativos foram retirados deste painel.</p>
      {confirmationView}
    </section>;
  }

  const statusLabel = supabaseStatus === 'connected' ? 'Conexão ativa' : supabaseStatus === 'testing' ? 'Verificando conexão' : supabaseStatus === 'pending_migration' ? 'Configuração do banco precisa de revisão' : supabaseStatus === 'error' ? 'Falha na conexão' : 'Sem conexão confirmada';
  return <div className="space-y-6 text-white">
    <section className="rounded-2xl border border-white/10 bg-[#0D1022] p-5 space-y-3">
      <h2 className="text-xl font-bold">Sincronização</h2>
      <p className="text-sm text-gray-400">Confira a conexão e acompanhe o que precisa ser enviado.</p>
      <div className="flex flex-wrap items-center gap-3"><span className={supabaseStatus === 'connected' ? 'text-emerald-300' : 'text-amber-300'}>● {statusLabel}</span><button disabled={busy} onClick={() => void run(async () => (await testSupabase()).message)} className={button}>Verificar conexão</button></div>
      {isOwner && supabaseStatusMessage && <details className="text-xs text-gray-400"><summary className="cursor-pointer">Detalhes da conexão</summary><p className="mt-2 break-words">{supabaseStatusMessage}</p></details>}
      {isOwner && <p className="text-xs text-gray-400">Para ajustar URL e chave, abra Configurações → Configurações avançadas do proprietário.</p>}
      {noticeView}
    </section>
    <section className="rounded-2xl border border-white/10 bg-[#0D1022] p-5 space-y-4">
      <h3 className="font-bold">Catálogo</h3>
      <div className="flex flex-wrap gap-5 text-sm text-gray-300"><span>{brands.length} marcas</span><span>{models.length} produtos</span><span>{models.reduce((n,m) => n+m.flavors.length,0)} sabores</span><span>{coupons.length} cupons</span></div>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={isAutoSyncEnabled} onChange={e => setIsAutoSyncEnabled(e.target.checked)} />Enviar alterações do catálogo automaticamente</label>
      <p className="text-sm text-gray-400">{isAutoSyncEnabled ? 'O catálogo é enviado após suas alterações.' : 'Envio automático do catálogo pausado.'} Vendas e ajustes de estoque usam suas próprias gravações e não dependem desta opção.</p>
      <p className="text-xs text-gray-400">{isAutoSyncing ? 'Enviando alterações...' : lastSyncedAt ? `Último envio: ${lastSyncedAt.toLocaleString('pt-BR')}` : 'Nenhum envio registrado nesta sessão.'}</p>
      <div className="flex flex-wrap gap-3"><button disabled={busy || !isSupabaseConfigured} onClick={() => void run(async () => (await syncToSupabase()).message)} className={button}>Enviar catálogo</button><button disabled={busy || !isSupabaseConfigured} onClick={() => setConfirmation('pull')} className={button}>Recarregar catálogo do banco</button></div>
      <details className="text-xs text-gray-400"><summary className="cursor-pointer">Como funciona o estoque?</summary><p className="mt-2">Enviar o catálogo atualiza os dados dos sabores existentes sem substituir suas quantidades. Vendas confirmadas e ajustes de estoque atualizam as quantidades separadamente.</p></details>
    </section>
    <section className="rounded-2xl border border-white/10 bg-[#0D1022] p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold">Registros financeiros</h3><span className={pendingSyncCount ? 'text-amber-300 text-sm' : 'text-emerald-300 text-sm'}>● {pendingSyncCount ? `${pendingSyncCount} pendente(s)` : 'Sem pendências neste navegador'}</span></div>
      <p className="text-sm text-gray-400">Pendências incluem registros e exclusões ainda não confirmados no banco. A conferência considera os dados carregados neste navegador.</p>
      {isOwner ? <button disabled={busy || isSyncingPending || !isSupabaseConfigured || pendingSyncCount === 0} onClick={() => void run(async () => {
        const result = await syncPendingFinancialData();
        return `${result.synced} operação(ões) confirmada(s); ${result.failed} pendente(s).`;
      })} className={button+' bg-cyan-700'}>{isSyncingPending ? 'Sincronizando...' : 'Sincronizar pendências'}</button> : <p className="text-sm text-gray-400">A sincronização financeira é restrita ao proprietário.</p>}
      <details className="text-xs text-gray-400"><summary className="cursor-pointer">Saiba mais</summary><p className="mt-2">O aplicativo identifica cada registro para evitar duplicidades. Novas vendas exigem conexão e estoque disponível; dados históricos podem ter pendências anteriores. As permissões do banco continuam sendo verificadas em cada operação.</p></details>
    </section>
    {confirmationView}
  </div>;
};

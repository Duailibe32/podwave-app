import React, { useEffect, useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { SupabaseTab } from './SupabaseTab';

export function OwnerAdvancedSettings() {
  const { isOwner, configuredOwnerUid, setConfiguredOwnerUid, isAutoSyncEnabled, resetAllData } = useCatalog();
  const [expanded, setExpanded] = useState(false);
  const [ownerUid, setOwnerUid] = useState(configuredOwnerUid);
  const [notice, setNotice] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  useEffect(() => { setOwnerUid(configuredOwnerUid); }, [configuredOwnerUid]);
  if (!isOwner) return null;
  const confirmReset = () => {
    if (!isOwner || isAutoSyncEnabled || confirmation !== 'RESTAURAR') return;
    resetAllData(); setShowReset(false); setConfirmation('');
    setNotice('Catálogo local, configurações da loja e sacola restaurados. Registros financeiros preservados.');
  };
  return <section className="rounded-2xl border border-white/10 bg-[#0D1022] p-5 text-white space-y-4">
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="w-full flex justify-between text-left font-bold">Configurações avançadas do proprietário <span>{expanded ? '−' : '+'}</span></button>
    <p className="text-xs text-gray-400">Conexão, identificação local e restauração. Estas opções não são necessárias na rotina.</p>
    {expanded && <div className="space-y-5">
      {notice && <p role="status" className="text-sm text-cyan-300">{notice}</p>}
      <SupabaseTab mode="advanced" />
      <form onSubmit={e => { e.preventDefault(); if (!isOwner) return; setConfiguredOwnerUid(ownerUid.trim()); setNotice('Identificação local atualizada. As permissões do banco permanecem as mesmas.'); }} className="rounded-2xl border border-white/10 p-4 space-y-3">
        <h3 className="font-bold">Identificação local do proprietário</h3>
        <p className="text-sm text-gray-400">Preferência salva neste navegador. O acesso real continua sendo definido pela sua conta e pelas permissões do Supabase.</p>
        <label className="block text-sm">ID do proprietário<input value={ownerUid} onChange={e => setOwnerUid(e.target.value)} className="mt-1 w-full rounded-lg bg-[#181C3D] p-3 text-xs font-mono" /></label>
        <button type="submit" className="rounded-xl border border-white/15 px-4 py-2 text-sm">Salvar identificação local</button>
      </form>
      <div className="rounded-2xl border border-rose-500/30 p-4 space-y-3">
        <h3 className="font-bold text-rose-300">Restauração do catálogo local</h3>
        <p className="text-sm text-gray-400">Substitui marcas, produtos, sabores, cupons, banners e configurações da loja pelos valores iniciais e esvazia a sacola deste navegador. Os registros financeiros são mantidos.</p>
        {isAutoSyncEnabled && <p className="text-sm text-amber-300">Desative o envio automático na aba Sincronização antes de restaurar.</p>}
        <button type="button" disabled={isAutoSyncEnabled} onClick={() => {setConfirmation('');setShowReset(true);}} className="rounded-xl border border-rose-500/30 px-4 py-2 text-sm text-rose-300 disabled:opacity-40">Revisar restauração</button>
      </div>
    </div>}
    {showReset && <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <section role="alertdialog" aria-modal="true" aria-labelledby="reset-catalog-title" className="w-full max-w-lg rounded-2xl bg-[#11152A] border border-rose-500/30 p-6 space-y-4">
        <h3 id="reset-catalog-title" className="font-bold text-lg">Restaurar os valores iniciais?</h3>
        <p className="text-sm text-gray-300">O catálogo local, as configurações da loja e a sacola serão substituídos. Os registros financeiros serão preservados. Esta ação não restaura nem apaga o banco; um envio posterior do catálogo pode enviar os valores iniciais.</p>
        <label className="block text-sm">Digite RESTAURAR para confirmar<input autoFocus autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-1 w-full bg-[#181C3D] rounded-lg p-3" /></label>
        <div className="flex justify-end gap-3"><button type="button" onClick={() => {setShowReset(false);setConfirmation('');}} className="rounded-xl border border-white/15 px-4 py-2">Cancelar</button><button type="button" disabled={confirmation !== 'RESTAURAR' || isAutoSyncEnabled} onClick={confirmReset} className="rounded-xl bg-rose-700 px-4 py-2 disabled:opacity-40">Restaurar catálogo local</button></div>
      </section>
    </div>}
  </section>;
}

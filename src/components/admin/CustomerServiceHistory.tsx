import React,{useEffect,useRef,useState} from 'react';
import {useCatalog} from '../../context/CatalogContext';
import type {CustomerFinancialFile} from '../../utils/customerFinancialRecords';
import {listServiceNotes,createServiceNote,updateServiceNote,CustomerServiceNote} from '../../services/customerServiceNotes';

const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export function CustomerServiceHistory({customer}:{customer:CustomerFinancialFile}) {
  const {isOwner}=useCatalog();
  const [notes,setNotes]=useState<CustomerServiceNote[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
  const [body,setBody]=useState(''),[reason,setReason]=useState(''),[date,setDate]=useState(today),[source,setSource]=useState('');
  const [editing,setEditing]=useState<CustomerServiceNote | null>(null),[voiding,setVoiding]=useState(false),[reload,setReload]=useState(0);
  const requestId=useRef(''),generation=useRef(0);
  const formRef=useRef<HTMLFormElement>(null),reasonRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(editing){formRef.current?.scrollIntoView({behavior:'auto',block:'center'});reasonRef.current?.focus();}},[editing?.id,voiding]);
  const signature=JSON.stringify(customer.records.map(r=>[r.origin,r.id]));
  useEffect(()=>{
    const version=++generation.current;setNotes([]);setError('');setBody('');setReason('');setEditing(null);setVoiding(false);setSource('');setDate(today());requestId.current=crypto.randomUUID();
    if(!isOwner)return;
    setLoading(true);
    void listServiceNotes(customer.records).then(rows=>{if(generation.current===version)setNotes(rows);}).catch(e=>{if(generation.current===version)setError(e.message);}).finally(()=>{if(generation.current===version)setLoading(false);});
    return ()=>{generation.current++;};
  },[isOwner,customer.key,signature,reload]);
  if(!isOwner)return null;
  const confirmed=customer.records.filter(r=>r.syncStatus==='synced');
  const save=async(e:React.FormEvent)=>{
    e.preventDefault();if(busy)return;
    const version=generation.current;
    const origin=confirmed.find(r=>r.key===source);
    if(!editing && !origin){setError('Escolha um registro confirmado no banco.');return;}
    if(!body.trim() || reason.trim().length<3){setError('Preencha a observação e um motivo com pelo menos 3 caracteres.');return;}
    setBusy(true);setError('');
    try {
      const saved=editing?await updateServiceNote(editing,{body:voiding?editing.body:body.trim(),occurred_on:voiding?editing.occurred_on:date,change_reason:reason.trim(),is_void:voiding}):await createServiceNote({id:requestId.current,source_kind:origin!.origin,source_id:origin!.id,body:body.trim(),occurred_on:date,change_reason:reason.trim()});
      if(version!==generation.current)return;
      setNotes(prev=>[saved,...prev.filter(n=>n.id!==saved.id)].slice(0,100));setBody('');setReason('');setEditing(null);setVoiding(false);requestId.current=crypto.randomUUID();
    }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Não foi possível confirmar. Os campos foram mantidos.');}
    finally{setBusy(false);}
  };
  const button='rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-40';
  return <section className="rounded-xl border border-white/10 p-4 space-y-4" aria-label="Histórico manual de atendimentos">
    <div className="flex flex-wrap justify-between gap-3"><div><h4 className="font-bold">Histórico manual de atendimentos</h4><p className="text-xs text-gray-400">Observações internas do proprietário, vinculadas ao registro original. As correções ficam na auditoria.</p></div><button className={button} disabled={busy || loading} onClick={()=>setReload(n=>n+1)}>Atualizar atendimentos</button></div>
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
    <form ref={formRef} onSubmit={save} className="space-y-3">
      <h5 className="text-sm font-semibold">{editing?(voiding?'Invalidar atendimento':'Corrigir atendimento'):'Registrar atendimento'}</h5>
      {!editing && <label className="block text-xs">Registro de referência<select required value={source} onChange={e=>{setSource(e.target.value);requestId.current=crypto.randomUUID();}} disabled={busy || !confirmed.length} className="block w-full rounded-lg bg-[#181C3D] p-2 mt-1"><option value="">Selecione uma venda ou conta confirmada</option>{confirmed.map(r=><option key={r.key} value={r.key}>{r.origin==='venda'?'Venda':'Conta a receber'} · {r.id}</option>)}</select></label>}
      {!confirmed.length && !editing && <p className="text-xs text-gray-400">Confirme um dos registros da ficha no banco antes de adicionar atendimentos.</p>}
      <label className="block text-xs">Data do atendimento<input type="date" required value={date} disabled={busy || voiding} onChange={e=>{setDate(e.target.value);if(!editing)requestId.current=crypto.randomUUID();}} className="block rounded-lg bg-[#181C3D] p-2 mt-1" /></label>
      <label className="block text-xs">Observação interna<textarea required maxLength={4000} value={body} disabled={busy || voiding} onChange={e=>{setBody(e.target.value);if(!editing)requestId.current=crypto.randomUUID();}} className="block w-full rounded-lg bg-[#181C3D] p-3 mt-1" rows={3} /></label>
      <label className="block text-xs">Motivo do registro, correção ou invalidação<input ref={reasonRef} required minLength={3} maxLength={500} value={reason} disabled={busy} onChange={e=>{setReason(e.target.value);if(!editing)requestId.current=crypto.randomUUID();}} className="block w-full rounded-lg bg-[#181C3D] p-2 mt-1" /></label>
      <div className="flex gap-3"><button type="submit" disabled={busy || (!editing && !confirmed.length)} className={button+(voiding?' text-rose-300':' text-cyan-300')}>{busy?'Salvando...':voiding?'Confirmar invalidação':'Salvar atendimento'}</button>{editing && <button type="button" disabled={busy} onClick={()=>{setEditing(null);setVoiding(false);setBody('');setReason('');setDate(today());setError('');}} className={button}>Cancelar</button>}</div>
    </form>
    <p className="text-xs text-gray-400">{loading?'Carregando...':`${notes.length} atendimento(s) exibido(s). Até os 100 mais recentes desta ficha.`}</p>
    {notes.map(note=><article key={note.id} className="rounded-lg border border-white/10 p-3 space-y-2 text-sm"><div className="flex flex-wrap justify-between gap-2"><span>{note.occurred_on.split('-').reverse().join('/')} · {note.is_void?'Invalidado':'Ativo'}</span>{!note.is_void && <div className="flex gap-3"><button disabled={busy} onClick={()=>{setEditing(note);setVoiding(false);setBody(note.body);setDate(note.occurred_on);setReason('');setError('');}} className="text-cyan-300">Corrigir</button><button disabled={busy} onClick={()=>{setEditing(note);setVoiding(true);setBody(note.body);setDate(note.occurred_on);setReason('');setError('');}} className="text-rose-300">Invalidar</button></div>}</div><p className="whitespace-pre-wrap break-words">{note.body}</p><p className="text-xs text-gray-400 break-all">Origem: {note.source_kind} · {note.source_id}<br/>Criado por: {note.created_by} · {new Date(note.created_at).toLocaleString('pt-BR')}<br/>Última alteração: {note.updated_by} · versão {note.version}<br/>Motivo: {note.change_reason}</p></article>)}
  </section>;
}

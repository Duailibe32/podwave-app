import { getSupabaseClient } from './supabase';

export interface CustomerServiceNote {
  id:string;source_kind:'venda'|'avulsa';source_id:string;body:string;occurred_on:string;change_reason:string;
  is_void:boolean;version:number;created_by:string;created_at:string;updated_by:string;updated_at:string;
}
export interface ServiceNoteInput {id:string;source_kind:'venda'|'avulsa';source_id:string;body:string;occurred_on:string;change_reason:string;}
function message(error: {code?:string;message?:string}): Error {
  return new Error(['42P01','PGRST205'].includes(error.code || '') ? 'O histórico de atendimentos ainda precisa ser instalado no Supabase. A ficha financeira continua disponível.' : error.message || 'Não foi possível confirmar o atendimento.');
}
export async function listServiceNotes(sources: {origin:'venda'|'avulsa';id:string}[]): Promise<CustomerServiceNote[]> {
  const client=getSupabaseClient();if(!client)throw new Error('Conecte o Supabase para consultar atendimentos.');
  const groups=await Promise.all((['venda','avulsa'] as const).map(async kind => {
    const ids=[...new Set(sources.filter(s=>s.origin===kind).map(s=>s.id))];
    if(!ids.length)return [];
    const {data,error}=await client.from('customer_service_notes').select('*').eq('source_kind',kind).in('source_id',ids).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100);
    if(error)throw message(error);return (data || []) as CustomerServiceNote[];
  }));
  return groups.flat().sort((a,b)=>b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id)).slice(0,100);
}
export async function createServiceNote(input: ServiceNoteInput): Promise<CustomerServiceNote> {
  const client=getSupabaseClient();if(!client)throw new Error('Conecte o Supabase para registrar o atendimento.');
  const {data,error}=await client.from('customer_service_notes').insert(input).select('*').single();
  if(error?.code==='23505') {
    const previous=await client.from('customer_service_notes').select('*').eq('id',input.id).single();
    if(!previous.error && previous.data && Object.entries(input).every(([key,value])=>previous.data[key]===value))return previous.data as CustomerServiceNote;
  }
  if(error)throw message(error);if(!data)throw new Error('O banco não confirmou o registro.');return data as CustomerServiceNote;
}
export async function updateServiceNote(note: CustomerServiceNote, changes: {body:string;occurred_on:string;change_reason:string;is_void:boolean}): Promise<CustomerServiceNote> {
  const client=getSupabaseClient();if(!client)throw new Error('Conecte o Supabase para corrigir o atendimento.');
  const {data,error}=await client.from('customer_service_notes').update({...changes,version:note.version+1}).eq('id',note.id).eq('version',note.version).select('*').maybeSingle();
  if(error)throw message(error);if(!data)throw new Error('Atendimento alterado ou não autorizado. Atualize o histórico e reabra Corrigir antes de tentar novamente; seus campos foram mantidos.');
  return data as CustomerServiceNote;
}

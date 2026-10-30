import React from 'react';

const stages=[['recebido','Recebido'],['em_separacao','Em separação'],['enviado','Enviado'],['entregue','Entregue']] as const;
export function OrderStatusTimeline({status}: {status?:string}) {
  if(status==='cancelado')return <p className="text-sm text-rose-300">Pedido cancelado</p>;
  const current=stages.findIndex(([key])=>key===status);
  if(current<0)return <p className="text-sm text-gray-300">Status informado: {status || 'Não informado'}</p>;
  return <section aria-label="Situação do pedido" className="space-y-2">
    <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      {stages.map(([key,label],index)=><li key={key} aria-current={index===current?'step':undefined} className={'rounded-lg border p-2 '+(index===current?'border-cyan-400 text-cyan-200 bg-cyan-400/10 font-bold':'border-white/10 text-gray-400')}><span aria-hidden="true">{index+1}. </span>{label}{index===current && <span className="block text-[10px]">Status atual</span>}</li>)}
    </ol>
    <p className="text-[10px] text-gray-400">Etapas de referência. Somente o status atual foi informado; não há datas por etapa.</p>
  </section>;
}

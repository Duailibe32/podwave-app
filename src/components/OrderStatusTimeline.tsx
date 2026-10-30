import React from 'react';
import { OrderStatusHistoryEntry } from '../types/catalog';

const stages = [
  ['recebido', 'Recebido'],
  ['confirmado', 'Confirmado'],
  ['em_separacao', 'Em separação'],
  ['enviado', 'Enviado'],
  ['entregue', 'Entregue'],
] as const;

export function OrderStatusTimeline({
  status,
  cancelReason,
  statusHistory,
}: {
  status?: string;
  cancelReason?: string;
  statusHistory?: OrderStatusHistoryEntry[];
}) {
  if (status === 'cancelado') {
    return (
      <div className="space-y-1">
        <p className="text-sm font-bold text-rose-300">Pedido cancelado</p>
        {cancelReason && (
          <p className="text-xs text-rose-200/80">Motivo registrado: {cancelReason}</p>
        )}
      </div>
    );
  }
  const current = stages.findIndex(([key]) => key === status);
  if (current < 0) return <p className="text-sm text-gray-300">Status informado: {status || 'Não informado'}</p>;
  return (
    <section aria-label="Situação do pedido" className="space-y-2">
      <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {stages.map(([key, label], index) => {
          const isCompleted = index < current;
          const isCurrent = index === current;
          return (
            <li
              key={key}
              aria-current={isCurrent ? 'step' : undefined}
              className={
                'rounded-lg border p-2 ' +
                (isCurrent
                  ? 'border-cyan-400 text-cyan-200 bg-cyan-400/10 font-bold'
                  : isCompleted
                  ? 'border-emerald-500/35 text-emerald-300 bg-emerald-500/5'
                  : 'border-white/10 text-gray-400')
              }
            >
              <span aria-hidden="true">{index + 1}. </span>
              {label}
              {isCurrent && <span className="block text-[10px]">Status atual</span>}
              {isCompleted && <span className="block text-[10px] text-emerald-400/90">Concluído</span>}
            </li>
          );
        })}
      </ol>
      {statusHistory && statusHistory.length > 0 ? (
        <div className="pt-1 space-y-1">
          <p className="text-[10px] font-semibold text-gray-300">Histórico de atualizações registradas:</p>
          <ul className="space-y-0.5 text-[10px] text-gray-400">
            {statusHistory.slice(0, 4).map((entry) => (
              <li key={entry.id}>
                {new Date(entry.changedAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                — <strong className="text-cyan-300">{entry.toStatus.replace('_', ' ')}</strong>
                {entry.reason ? ` (${entry.reason})` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[10px] text-gray-400">
          Etapas de referência. Somente o status atual foi informado; não há datas por etapa.
        </p>
      )}
    </section>
  );
}


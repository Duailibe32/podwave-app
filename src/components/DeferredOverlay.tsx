import React, { Suspense, useEffect, useState } from 'react';

type Props = { active: boolean; label: string; onClose: () => void; component: React.ComponentType };

class OverlayLoadBoundary extends React.Component<React.PropsWithChildren<{ active: boolean; onClose: () => void }>, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    if (!this.props.active) return null;
    return <div role="dialog" aria-modal="true" aria-label="Falha ao carregar" className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-5">
      <div className="max-w-sm rounded-2xl border border-white/20 bg-[#11152A] p-5 text-white space-y-4">
        <p>Não foi possível carregar esta tela. Confira a conexão e atualize a página para tentar novamente.</p>
        <button type="button" onClick={this.props.onClose} className="min-h-11 rounded-xl bg-[#8423DA] px-5">Voltar ao catálogo</button>
      </div>
    </div>;
  }
}

/** Download on first use; keep mounted afterward so closing doesn't erase a form draft. */
export function DeferredOverlay({ active, label, onClose, component: Component }: Props) {
  const [opened, setOpened] = useState(false);
  useEffect(() => { if (active) setOpened(true); }, [active]);
  if (!active && !opened) return null;
  return <OverlayLoadBoundary active={active} onClose={onClose}>
    <Suspense fallback={active ? <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-5">
      <div className="rounded-2xl border border-white/20 bg-[#11152A] p-5 text-white space-y-4">
        <p role="status">Carregando {label.toLowerCase()}…</p>
        <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-[#8423DA] px-5">Voltar</button>
      </div>
    </div> : null}><Component /></Suspense>
  </OverlayLoadBoundary>;
}

import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="storefront-offline fixed bottom-20 left-4 sm:left-6 z-50 flex items-center gap-2.5 rounded-2xl bg-[#0D1022]/95 border border-[#8423DA]/50 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-md animate-bounce">
      <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
        <WifiOff className="w-4 h-4" />
      </div>
      <div>
        <p className="font-bold text-amber-400 flex items-center gap-1">
          <span>Modo Offline Ativo</span>
        </p>
        <p className="text-[11px] text-[#A5A5B8] flex items-center gap-1">
          <Database className="w-3 h-3 text-[#00DFFF]" />
          Catálogo e dados pré-carregados disponíveis
        </p>
      </div>
    </div>
  );
};

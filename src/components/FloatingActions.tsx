import React from 'react';
import { useCatalog } from '../context/CatalogContext';
import { ShoppingBag, MessageCircle } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { buildWhatsAppUrl } from '../utils/whatsappShare';

export const FloatingActions: React.FC = () => {
  const { totalCartItems, setIsCartOpen, settings } = useCatalog();
  const whatsappNumber = settings.whatsappNumber || '5586999014685';

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
      {/* Floating PWA Install button */}
      <div className="pointer-events-auto">
        <PWAInstallButton variant="floating" />
      </div>
      {/* Floating WhatsApp Action Button */}
      <a
        href={buildWhatsAppUrl(
          whatsappNumber,
          'Olá! Estou navegando no catálogo PodWave e gostaria de tirar uma dúvida ou fazer um pedido.'
        )}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto group flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white shadow-[0_4px_25px_rgba(37,211,102,0.45)] hover:shadow-[0_6px_30px_rgba(37,211,102,0.65)] hover:scale-105 active:scale-95 transition-all duration-300"
        title="Falar no WhatsApp Oficial: (86) 99901-4685"
      >
        <MessageCircle className="w-5 h-5 fill-white stroke-none" />
        <span className="text-xs font-black tracking-wide hidden sm:inline">
          WhatsApp (86) 99901-4685
        </span>
      </a>

      {/* Floating Cart Button with Counter */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="pointer-events-auto group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#8423DA] via-[#007BFF] to-[#00DFFF] text-white shadow-[0_6px_30px_rgba(0,223,255,0.45)] hover:shadow-[0_8px_35px_rgba(0,223,255,0.7)] hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
        title="Abrir Carrinho"
        aria-label="Abrir Carrinho"
      >
        <ShoppingBag className="w-6 h-6 group-hover:scale-110 transition-transform" />
        {totalCartItems > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[24px] h-6 px-1.5 rounded-full bg-gradient-to-r from-[#00DFFF] to-[#E53CF3] text-white text-xs font-black flex items-center justify-center shadow-lg border-2 border-[#080811] animate-bounce">
            {totalCartItems}
          </span>
        )}
      </button>
    </div>
  );
};

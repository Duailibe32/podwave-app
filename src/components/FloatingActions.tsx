import React from 'react';
import { useCatalog } from '../context/CatalogContext';
import { ShoppingBag } from 'lucide-react';

export const FloatingActions: React.FC = () => {
  const { totalCartItems, setIsCartOpen, currentView } = useCatalog();

  return (
    <div className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 sm:right-6 z-40 flex flex-col items-end gap-3 pointer-events-none ${currentView === 'catalog' ? 'hidden sm:flex' : ''}`}>
      {/* Floating Cart Button with Counter */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="pointer-events-auto group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#8423DA] via-[#007BFF] to-[#00DFFF] text-white shadow-[0_6px_30px_rgba(0,223,255,0.45)] hover:shadow-[0_8px_35px_rgba(0,223,255,0.7)] hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
        data-cart-target
        title="Abrir Carrinho"
        aria-label="Abrir Carrinho"
      >
        <ShoppingBag className="w-6 h-6 group-hover:scale-110 transition-transform" />
        {totalCartItems > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[24px] h-6 px-1.5 rounded-full bg-gradient-to-r from-[#00DFFF] to-[#E53CF3] text-white text-xs font-black flex items-center justify-center shadow-lg border-2 border-[#080811]">
            {totalCartItems}
          </span>
        )}
      </button>
    </div>
  );
};

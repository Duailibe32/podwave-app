import React from 'react';
import { useCatalog } from '../context/CatalogContext';
import {
  MessageCircle,
  Instagram,
  Truck,
  Clock,
  CreditCard,
  RotateCcw,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { buildWhatsAppUrl } from '../utils/whatsappShare';

export const Footer: React.FC = () => {
  const { settings } = useCatalog();

  const whatsappUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    'Olá! Gostaria de falar com o atendimento da PodWave sobre o catálogo.'
  );

  return (
    <footer className="border-t border-[#8423DA]/25 bg-[#05060D] text-[#A5A5B8] pt-14 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Section: Brand + Social CTAs */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-10 border-b border-[#8423DA]/20">
          {/* Brand Identity */}
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 rounded-2xl bg-[#11152A] p-1.5 border border-[#8423DA]/40 flex items-center justify-center shadow-lg">
              <img
                src="/assets/images/logo.png"
                alt="PodWave Logo Oficial"
                className="h-full w-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,223,255,0.4)]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="font-heading text-2xl font-black bg-gradient-to-r from-white via-[#00DFFF] to-[#E53CF3] bg-clip-text text-transparent">
                {settings.storeName}
              </span>
              <p className="text-[11px] uppercase tracking-wider text-[#A5A5B8] font-bold">
                Catálogo Digital &bull; Toda a Região
              </p>
            </div>
          </div>

          {/* Social / Action Buttons matching screenshot */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/50 text-[#25D366] text-xs font-heading font-extrabold transition-all shadow-sm active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Falar no WhatsApp</span>
            </a>

            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E53CF3]/15 hover:bg-[#E53CF3]/25 border border-[#E53CF3]/50 text-[#E53CF3] text-xs font-heading font-extrabold transition-all shadow-sm active:scale-95"
            >
              <Instagram className="w-4 h-4" />
              <span>Instagram</span>
            </a>
          </div>
        </div>

        {/* 4 Informational Columns with Project Neon Cyan styling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: ÁREA DE ENTREGA */}
          <div className="space-y-2.5">
            <h4 className="font-heading font-black text-xs uppercase tracking-wider text-[#00DFFF] flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#00DFFF]" />
              <span>ÁREA DE ENTREGA</span>
            </h4>
            <p className="text-xs text-[#A5A5B8] leading-relaxed">
              Todo o catálogo de pods em um lugar só | Entregamos em toda a região com agilidade e total segurança.
            </p>
          </div>

          {/* Col 2: ATENDIMENTO */}
          <div className="space-y-2.5">
            <h4 className="font-heading font-black text-xs uppercase tracking-wider text-[#00DFFF] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#00DFFF]" />
              <span>ATENDIMENTO</span>
            </h4>
            <p className="text-xs text-[#A5A5B8] leading-relaxed">
              Pague quando receber! Todos os dias, das 10h às 23h.
            </p>
            <p className="text-xs font-semibold text-white">
              WhatsApp: {settings.supportPhone}
            </p>
          </div>

          {/* Col 3: FORMAS DE PAGAMENTO */}
          <div className="space-y-2.5">
            <h4 className="font-heading font-black text-xs uppercase tracking-wider text-[#00DFFF] flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#00DFFF]" />
              <span>FORMAS DE PAGAMENTO</span>
            </h4>
            <p className="text-xs text-[#A5A5B8] leading-relaxed">
              Pix, dinheiro, cartão de crédito e débito na entrega. Sem surpresas ou cobranças antecipadas.
            </p>
          </div>

          {/* Col 4: TROCAS */}
          <div className="space-y-2.5">
            <h4 className="font-heading font-black text-xs uppercase tracking-wider text-[#00DFFF] flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-[#00DFFF]" />
              <span>TROCAS</span>
            </h4>
            <p className="text-xs text-[#A5A5B8] leading-relaxed">
              Troca em até 24 horas para produto com defeito de fábrica, sem sinal de uso e na embalagem original.
            </p>
          </div>
        </div>

        {/* Bottom Regulatory Notice & Copyright */}
        <div className="pt-8 border-t border-[#8423DA]/20 space-y-4">
          <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="w-9 h-9 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-black text-xs flex-shrink-0">
              18+
            </div>
            <div className="text-[11px] text-[#A5A5B8] leading-relaxed">
              <strong className="text-white">Venda proibida para menores de 18 anos &bull; Produto contém nicotina.</strong>{' '}
              A nicotina é uma substância que causa dependência química e física. O catálogo é restrito para consulta técnica de especificações de puffs e sabores por maiores de idade.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-500">
            <p>&copy; {new Date().getFullYear()} {settings.storeName}. Todos os direitos reservados.</p>
            <p className="flex items-center gap-1.5">
              <span>Catálogo Digital Premium</span>
              <span className="text-[#00DFFF]">&bull;</span>
              <span className="text-[#00DFFF] font-bold">Atendimento em Toda a Região</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

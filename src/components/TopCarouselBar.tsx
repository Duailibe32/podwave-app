import React, { useState, useEffect } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { MessageCircle, ExternalLink } from 'lucide-react';

export const TopCarouselBar: React.FC = () => {
  const { settings } = useCatalog();
  const whatsappNumber = settings.whatsappNumber || '5586999014685';

  const slides = [
    {
      id: 1,
      emoji: '🚨',
      text: 'Evite golpes, você pode pagar na hora do recebimento!',
      highlight: true,
    },
    {
      id: 2,
      emoji: '🏪',
      text: 'Temos local de retirada!',
      highlight: true,
    },
    {
      id: 3,
      emoji: '⚡',
      text: 'Entrega expressa em até 45 minutos em São Luís!',
      highlight: true,
    },
    {
      id: 4,
      emoji: '💬',
      text: 'Dúvidas ou pedidos rápidos? Fale com Atendente no WhatsApp!',
      highlight: true,
      isWhatsapp: true,
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [slides.length]);

  const activeSlide = slides[currentIndex];
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    'Olá! Estou no site e gostaria de falar com um atendente da PodWave.'
  )}`;

  return (
    <div className="relative border-b border-[#00DFFF]/20 bg-[#070914] text-white py-2 px-3 sm:px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Carousel Container */}
        <div className="flex-1 w-full flex flex-col items-center sm:items-start justify-center min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 min-h-[24px] max-w-full overflow-hidden">
            {/* Glowing Cyan/Emerald Dot */}
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 items-center justify-center shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00DFFF] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-[#00DFFF] shadow-[0_0_8px_#00DFFF]" />
            </span>

            {/* Slide Content with safe mobile truncation and text overflow protection */}
            <div className="min-w-0 overflow-hidden transition-all duration-300">
              {activeSlide.isWhatsapp ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-heading font-black text-[11px] sm:text-sm text-white hover:text-[#00DFFF] hover:underline cursor-pointer truncate max-w-full"
                >
                  <span className="shrink-0">{activeSlide.emoji}</span>
                  <span className="truncate">{activeSlide.text}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#00DFFF] inline shrink-0" />
                </a>
              ) : (
                <p className="font-heading font-black text-[11px] sm:text-sm text-white tracking-tight flex items-center gap-1.5 truncate max-w-full">
                  <span className="shrink-0">{activeSlide.emoji}</span>
                  <span className="truncate">{activeSlide.text}</span>
                </p>
              )}
            </div>
          </div>

          {/* Dash indicators */}
          <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-0.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex
                    ? 'w-6 sm:w-10 bg-[#00DFFF] shadow-[0_0_6px_#00DFFF]'
                    : 'w-4 sm:w-7 bg-gray-700/60 hover:bg-gray-500'
                }`}
                title={`Ir para anúncio ${idx + 1}`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right side WhatsApp action button */}
        <div className="hidden sm:flex items-center gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] text-xs font-heading font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Fale com Atendente</span>
          </a>
        </div>
      </div>
    </div>
  );
};

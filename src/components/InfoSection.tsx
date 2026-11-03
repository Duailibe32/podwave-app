import React from 'react';
import { CreditCard, RotateCcw, Truck, ShieldCheck, ShoppingCart, MessageCircle, Gift } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { buildWhatsAppUrl } from '../utils/whatsappShare';

export const InfoSection: React.FC = () => {
  const { settings } = useCatalog();

  const faqItems = [
    {
      icon: CreditCard,
      question: 'Posso pagar na entrega?',
      answer:
        'Pode. Aceitamos Pix, dinheiro e cartão na hora da entrega. No cartão de crédito há acréscimo de 5%.',
    },
    {
      icon: Gift,
      question: 'Como funciona o Cartão de Fidelidade PodWave?',
      answer:
        'A cada pedido finalizado com sua conta cadastrada, nossa equipe adiciona +1 selo digital no seu perfil. Ao completar 10 selos, você libera um brinde especial ou desconto exclusivo na sua próxima compra.',
    },
    {
      icon: RotateCcw,
      question: 'E se o produto vier com defeito?',
      answer:
        'Chame no WhatsApp em até 24 horas. Produto com defeito de fábrica, sem sinal de uso e na embalagem original, a gente troca.',
    },
    {
      icon: Truck,
      question: 'Quanto tempo leva a entrega?',
      answer:
        'Nossa entrega expressa leva de 10 a 20 minutos em toda a região! Assim que seu pedido é confirmado, nossa equipe já prepara o envio imediato e te atualiza pelo WhatsApp e pelo painel da loja.',
    },
    {
      icon: ShieldCheck,
      question: 'Os produtos são originais?',
      answer:
        'Sim. Trabalhamos apenas com produtos lacrados e originais, comprados de distribuidores autorizados.',
    },
  ];

  const brandIconStyles = [
    'text-[#00DFFF] bg-[#00DFFF]/15 border-[#00DFFF]/35',
    'text-[#E53CF3] bg-[#E53CF3]/15 border-[#E53CF3]/35',
    'text-[#007BFF] bg-[#007BFF]/15 border-[#007BFF]/35',
    'text-[#00DFFF] bg-[#00DFFF]/15 border-[#00DFFF]/35',
    'text-[#E53CF3] bg-[#E53CF3]/15 border-[#E53CF3]/35',
  ];

  return (
    <section id="informacoes" tabIndex={-1} className="py-16 bg-[#080811] border-t border-[#8423DA]/20 scroll-mt-20 focus:outline-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A5A5B8]">
            AINDA FICOU COM ALGUMA DÚVIDA?
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            PERGUNTAS <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00DFFF] via-[#8423DA] to-[#E53CF3]">FREQUENTES</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#A5A5B8] max-w-xl mx-auto">
            Tudo o que você precisa saber sobre pagamentos na entrega, prazos em toda a região, trocas e originalidade dos dispositivos.
          </p>
        </div>

        {/* 2-Column FAQ Card Grid matching user screenshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {faqItems.map((item, idx) => {
            const IconComponent = item.icon;
            const styleColor = brandIconStyles[idx % brandIconStyles.length];
            return (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 hover:border-[#00DFFF]/50 transition-all duration-300 shadow-lg flex items-start gap-4"
              >
                {/* Project Color Icon Circle */}
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${styleColor}`}>
                  <IconComponent className="w-6 h-6 stroke-[2.2]" />
                </div>

                <div className="space-y-1.5 flex-1">
                  <h3 className="font-heading font-extrabold text-base sm:text-lg text-white">
                    {item.question}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A5A5B8] leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}

          {/* 6th Card: Direct WhatsApp Support CTA */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#11152A] to-[#1a1738] border border-[#8423DA]/40 hover:border-[#00DFFF]/50 transition-all duration-300 shadow-lg flex flex-col justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <MessageCircle className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base sm:text-lg text-white">
                  Ainda precisa de ajuda?
                </h3>
                <p className="text-xs sm:text-sm text-[#A5A5B8] leading-relaxed mt-1">
                  Fale diretamente com nossa equipe no WhatsApp para tirar dúvidas sobre sabores em estoque ou entrega expressa.
                </p>
              </div>
            </div>

            <a
              href={buildWhatsAppUrl(
                settings.whatsappNumber,
                'Olá! Tenho uma dúvida sobre o catálogo de pods da PodWave.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-heading font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Falar com Atendente no WhatsApp ({settings.supportPhone})</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

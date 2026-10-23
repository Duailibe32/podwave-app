import React from 'react';
import { CreditCard, RotateCcw, Truck, ShieldCheck, ShoppingCart, MessageCircle, HelpCircle } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';

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
      icon: RotateCcw,
      question: 'E se o produto vier com defeito?',
      answer:
        'Chame no WhatsApp em até 24 horas. Produto com defeito de fábrica, sem sinal de uso e na embalagem original, a gente troca.',
    },
    {
      icon: Truck,
      question: 'Quanto tempo leva a entrega?',
      answer:
        'Na maior parte de São Luís entregamos entre 30 a 60 minutos dependendo da demanda do momento. O prazo exato a gente confirma no WhatsApp assim que o pedido chega.',
    },
    {
      icon: ShieldCheck,
      question: 'Os produtos são originais?',
      answer:
        'Sim. Trabalhamos apenas com produtos lacrados e originais, comprados de distribuidores autorizados.',
    },
    {
      icon: ShoppingCart,
      question: 'Como faço o pedido?',
      answer:
        'Escolha os produtos, toque em finalizar e o pedido vai montado para o nosso WhatsApp. Não precisa criar cadastro nem cartão no site.',
    },
  ];

  return (
    <section id="informacoes" className="py-16 bg-[#080811] light:bg-[#F4F6FC] border-t border-[#8423DA]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A5A5B8] light:text-slate-500">
            AINDA FICOU COM ALGUMA DÚVIDA?
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white light:text-slate-900 tracking-tight">
            PERGUNTAS <span className="text-[#FACC15]">FREQUENTES</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#A5A5B8] light:text-slate-600 max-w-xl mx-auto">
            Tudo o que você precisa saber sobre pagamentos na entrega, prazos em São Luís, trocas e originalidade dos dispositivos.
          </p>
        </div>

        {/* 2-Column FAQ Card Grid matching user screenshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {faqItems.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/25 light:border-slate-200 hover:border-[#FACC15]/40 transition-all duration-300 shadow-lg flex items-start gap-4"
              >
                {/* Yellow Icon Circle */}
                <div className="w-12 h-12 rounded-2xl bg-[#FACC15]/15 border border-[#FACC15]/30 flex items-center justify-center text-[#FACC15] flex-shrink-0">
                  <IconComponent className="w-6 h-6 stroke-[2.2]" />
                </div>

                <div className="space-y-1.5 flex-1">
                  <h3 className="font-heading font-extrabold text-base sm:text-lg text-white light:text-slate-900">
                    {item.question}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A5A5B8] light:text-slate-600 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}

          {/* 6th Card: Direct WhatsApp Support CTA */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#11152A] to-[#1a1738] light:bg-slate-50 border border-[#8423DA]/40 hover:border-[#00DFFF]/50 transition-all duration-300 shadow-lg flex flex-col justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <MessageCircle className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base sm:text-lg text-white light:text-slate-900">
                  Ainda precisa de ajuda?
                </h3>
                <p className="text-xs sm:text-sm text-[#A5A5B8] light:text-slate-600 leading-relaxed mt-1">
                  Fale diretamente com nossa equipe no WhatsApp para tirar dúvidas sobre sabores em estoque ou entrega expressa.
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
                'Olá! Tenho uma dúvida sobre o catálogo de pods da PodWave.'
              )}`}
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

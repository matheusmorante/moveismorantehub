import React from 'react';
import {
  WARRANTY_TOPICS_PAGE_3,
  WARRANTY_CONTACT_CARD,
} from '@/pages/utils/warranty';
import { WarrantyTopicBlock } from './WarrantyTopicBlock';
import { WarrantyPageSheetFooter } from './WarrantyPageSheetFooter';

interface WarrantyClausesPage2Props {
  sheetWidth: string;
  pageRef: (el: HTMLElement | null) => void;
  orderCode: string;
}

export const WarrantyClausesPage2: React.FC<WarrantyClausesPage2Props> = ({
  sheetWidth,
  pageRef,
  orderCode,
}) => {
  return (
    <article
      ref={pageRef}
      data-page="3"
      style={{ width: sheetWidth }}
      className="bg-white text-slate-800 shadow-2xl ring-1 ring-black/10 rounded-sm p-8 sm:p-12 transition-all duration-150 flex flex-col justify-between shrink-0 min-h-[1120px]"
    >
      <div>
        {/* Topo Limpo da Página 3 */}
        <div className="flex justify-between items-center border-b-2 border-slate-200 pb-3 mb-6">
          <span className="text-xs font-black text-[#032354] uppercase tracking-wider">
            MÓVEIS MORANTE — TERMO DE GARANTIA
          </span>
          <span className="text-xs font-bold text-slate-600 font-mono">Pedido #{orderCode}</span>
        </div>

        {/* Tópicos 5 a 9 com Componente Modular */}
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          {WARRANTY_TOPICS_PAGE_3.map((sec) => (
            <WarrantyTopicBlock key={`sec-${sec.number}`} section={sec} />
          ))}

          {/* ================= ÁREA FINAL: "FALE COM A GENTE" ================= */}
          <div className="mt-8 bg-slate-50 border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
            {/* Faixa Superior Azul com Friso Dourado */}
            <div className="bg-[#032354] px-4 py-2 flex items-center justify-between border-b-2 border-[#feb004]">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <i className="bi bi-chat-heart-fill text-[#feb004]" />
                {WARRANTY_CONTACT_CARD.headerTitle}
              </span>
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-widest">
                {WARRANTY_CONTACT_CARD.headerBadge}
              </span>
            </div>

            <div className="p-4 sm:p-5">
              {/* Mensagem Acolhedora Fundamentada no CDC */}
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {WARRANTY_CONTACT_CARD.welcomeText}
              </p>

              {/* Grid com Dados Reais da Loja */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3.5 pt-3 border-t border-slate-200/80 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#032354]/10 text-[#032354] flex items-center justify-center shrink-0">
                      <i className="bi bi-whatsapp text-xs" />
                    </span>
                    <span className="text-slate-500">WhatsApp Oficial:</span>
                    <span className="font-bold text-[#032354]">(41) 99749-3547</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#032354]/10 text-[#032354] flex items-center justify-center shrink-0">
                      <i className="bi bi-telephone-fill text-xs" />
                    </span>
                    <span className="text-slate-500">Telefone p/ Ligação:</span>
                    <span className="font-bold text-slate-800">(41) 99224-4631</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#032354]/10 text-[#032354] flex items-center justify-center shrink-0">
                      <i className="bi bi-clock-fill text-xs" />
                    </span>
                    <span className="text-slate-500">Horário de Atendimento:</span>
                    <span className="font-semibold text-slate-800 text-[11px]">
                      Seg-Sex: 9h às 18h | Sáb: 9h às 17h
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#032354]/10 text-[#032354] flex items-center justify-center shrink-0">
                      <i className="bi bi-geo-alt-fill text-xs" />
                    </span>
                    <span className="text-slate-500">Endereço:</span>
                    <span className="font-medium text-slate-800 text-[11px] truncate">
                      R. Cascavel, 306 - Guaraituba, Colombo - PR
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé Padronizado da Folha Página 3 */}
      <WarrantyPageSheetFooter
        pageNumber={3}
        subtitle="Móveis Morante • Suporte ágil e garantia legal com respeito ao consumidor"
      />
    </article>
  );
};

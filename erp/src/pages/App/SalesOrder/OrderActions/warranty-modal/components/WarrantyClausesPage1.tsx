import React from 'react';
import type Order from '@/pages/types/order.type';
import { WARRANTY_TOPICS_PAGE_2 } from '@/pages/utils/warranty';
import { WarrantyTopicBlock } from './WarrantyTopicBlock';
import { WarrantyPageSheetFooter } from './WarrantyPageSheetFooter';

interface WarrantyClausesPage1Props {
  sheetWidth: string;
  pageRef: (el: HTMLElement | null) => void;
  orderCode: string;
  customerName: string;
  customerDoc: string;
  customerPhone: string;
  purchaseDate: string;
  items: NonNullable<Order['items']>;
  version: number;
}

export const WarrantyClausesPage1: React.FC<WarrantyClausesPage1Props> = ({
  sheetWidth,
  pageRef,
  orderCode,
  customerName,
  customerDoc,
  customerPhone,
  purchaseDate,
  items,
  version,
}) => {
  return (
    <article
      ref={pageRef}
      data-page="2"
      style={{ width: sheetWidth }}
      className="bg-white text-slate-800 shadow-2xl ring-1 ring-black/10 rounded-sm p-8 sm:p-12 transition-all duration-150 flex flex-col justify-between shrink-0 min-h-[1120px]"
    >
      <div>
        {/* Cabeçalho da Folha A4 */}
        <div className="pb-4 mb-5 border-b-2 border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 shrink-0 flex items-center justify-center">
              <img
                src="/images/logo-morante.png"
                alt="Móveis Morante"
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/images/logo-morante.svg';
                }}
              />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wider text-[#032354] leading-tight">
                MÓVEIS MORANTE
              </h2>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                CNPJ: 44.512.248.0001/07 • WhatsApp: (41) 99749-3547
              </p>
              <p className="text-[11px] text-slate-500">
                R. Cascavel, 306 - Guaraituba, Colombo - PR, 83410-270
              </p>
            </div>
          </div>

          {/* Identificação do Pedido de Venda */}
          <div className="text-right shrink-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Pedido de Venda
            </span>
            <span className="text-base font-black text-[#032354] tracking-wide font-mono">
              #{orderCode}
            </span>
          </div>
        </div>

        {/* Box: Dados do Cliente e Compra */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <p className="font-bold text-slate-900">
                Cliente: <span className="font-normal">{customerName}</span>
              </p>
              <p className="font-bold text-slate-900 mt-0.5">
                CPF/CNPJ: <span className="font-normal">{customerDoc}</span>
              </p>
            </div>
            <div>
              <p className="font-bold text-slate-900">
                Data do Pedido: <span className="font-normal">{purchaseDate}</span>
              </p>
              <p className="font-bold text-slate-900 mt-0.5">
                Contato: <span className="font-normal text-[#032354]">{customerPhone}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tabela de Itens Adquiridos */}
        <div className="mb-5">
          <div className="bg-[#032354] text-white px-3 py-1.5 rounded-t-lg flex justify-between text-[10px] font-black uppercase tracking-wider">
            <span>Relação dos Móveis Adquiridos</span>
            <span>Quantidade</span>
          </div>
          <div className="border border-t-0 border-slate-200 rounded-b-lg divide-y divide-slate-100 text-xs">
            {items.length === 0 ? (
              <div className="p-3 text-slate-500 italic">Móveis descritos no pedido original de venda.</div>
            ) : (
              items.map((it, idx) => (
                <div key={it.orderItemId || idx} className="p-2.5 flex justify-between items-center bg-white">
                  <span className="font-bold text-slate-800">{it.description}</span>
                  <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {it.quantity} un
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tópicos 1 a 4 com Componente Modular */}
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          {WARRANTY_TOPICS_PAGE_2.map((sec) => (
            <WarrantyTopicBlock key={`sec-${sec.number}`} section={sec} />
          ))}
        </div>
      </div>

      {/* Rodapé Padronizado da Folha Página 2 */}
      <WarrantyPageSheetFooter pageNumber={2} version={version} />
    </article>
  );
};

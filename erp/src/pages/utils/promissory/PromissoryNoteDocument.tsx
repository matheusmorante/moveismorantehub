import React from 'react';
import type Order from '@/pages/types/order.type';
import type { PromissoryNoteItem } from './promissoryNoteService';
import DigitalSignatureBadge from '@/pages/ReceiptPage/DigitalSignatureBadge';

interface PromissoryNoteDocumentProps {
  notes: PromissoryNoteItem[];
  order?: Order | null;
  storeLogo?: string;
}

interface PromissoryNoteCardProps {
  note: PromissoryNoteItem;
  order?: Order | null;
  storeLogo?: string;
}

export const PromissoryNoteCard: React.FC<PromissoryNoteCardProps> = ({
  note,
  order,
  storeLogo,
}) => {
  return (
    <article
      className="promissory-note-card bg-white text-slate-900 border-2 border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col justify-between relative shadow-sm print:shadow-none print:border-2 print:border-slate-800 print:rounded-none w-full mb-6 print:mb-8"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Cabeçalho */}
      <header className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          {storeLogo && (
            <img
              src={storeLogo}
              alt="Logo"
              className="h-10 w-auto object-contain print:h-8"
            />
          )}
          <div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-500 block leading-none">
              DOCUMENTO FINANCEIRO
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mt-1 uppercase">
              NOTA PROMISSÓRIA
            </h1>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs sm:text-sm font-black text-slate-900 block tracking-wider font-mono">
            Nº {note.noteNumber}
          </span>
          {note.installmentText && (
            <span className="text-[10px] font-bold text-slate-600 block mt-0.5 tracking-wide">
              {note.installmentText}
            </span>
          )}
        </div>
      </header>

      {/* Destaque do valor */}
      <div className="mb-5">
        <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-left">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">
            Valor
          </span>
          <div className="text-base sm:text-xl font-black text-slate-900 font-mono tracking-tight">
            {note.amountFormatted}
          </div>
        </div>

      </div>

      {/* Cláusula Cambial Legal (Art. 75 Decreto 57.663/1966) */}
      <div className="bg-white border-l-4 border-slate-800 pl-4 py-2 my-2 text-justify">
        <p className="text-xs sm:text-sm leading-relaxed text-slate-800 font-medium">
          {note.legalText}
        </p>
      </div>

      {/* Campo único para registrar o dia mensal de vencimento à caneta */}
      <div className="border border-slate-300 rounded-lg px-3.5 py-3 my-3 text-sm font-bold text-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <span>Vencimento: todo dia</span>
          <span className="inline-block min-w-12 border-b-2 border-slate-700 text-center font-mono">
            &nbsp;
          </span>
          <span>de cada mês, a partir de</span>
          <span className="inline-block min-w-20 border-b-2 border-slate-700 text-center font-mono">
            &nbsp;
          </span>
          <span className="text-xs font-normal">(mês/ano)</span>
        </div>
      </div>

      {/* Grade de Dados do Emitente, Pagamento e Referência */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 my-3 pt-3 border-t border-slate-200 text-xs text-slate-800">
        <div>
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
            Local de pagamento
          </span>
          <span className="font-bold text-slate-900">{note.paymentPlace}</span>
        </div>

        <div>
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
            Referência administrativa
          </span>
          <span className="font-bold text-slate-900">{note.orderReference}</span>
        </div>

        <div>
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
            Emitente (devedora)
          </span>
          <span className="font-bold text-slate-900 text-sm">
            {note.debtorName || 'Consumidor'}
          </span>
        </div>

        {/* REGRA 4 MANDATÓRIA: Label visível, valor vazio se não informado, sem placeholder fictício */}
        <div>
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
            {note.debtorDocLabel}
          </span>
          <span className="font-bold text-slate-900 min-h-[1.25rem] inline-block font-mono">
            {note.debtorDocValue || ''}
          </span>
        </div>

        <div className="sm:col-span-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
            Endereço da emitente
          </span>
          <span className="font-medium text-slate-800">
            {note.debtorAddress || 'Não informado'}
          </span>
        </div>

        <div className="sm:col-span-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
            Local e data de emissão
          </span>
          <span className="font-medium text-slate-800">
            {note.emissionDateFormatted}
          </span>
        </div>
      </div>

      {/* Área de Assinaturas: Loja (Carimbo do Certificado Digital) e Cliente (Emitente Devedora) */}
      <footer className="mt-6 pt-4 border-t-2 border-slate-800 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
        {/* Assinatura da Loja / Credora: Carimbo do Certificado Digital */}
        <div className="w-full md:w-auto flex flex-col items-start">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
            Assinatura da Credora (Loja)
          </span>
          <DigitalSignatureBadge
            order={
              order || {
                id: note.id,
                orderIndex: note.orderIndex,
                seller: note.sellerName,
              }
            }
            sellerName={note.sellerName}
          />
        </div>

        {/* Assinatura da Cliente (Devedora) */}
        <div className="w-full md:w-72 flex flex-col items-center text-center">
          <div className="w-full border-b-2 border-slate-900 mb-2"></div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Assinatura da emitente (devedora)
          </span>
          <span className="text-xs font-bold text-slate-900 mt-0.5">
            {note.debtorName || 'Consumidor'}
          </span>
          <span className="text-[9px] font-mono text-slate-500 mt-0.5">
            {note.debtorDocLabel} {note.debtorDocValue || ''}
          </span>
        </div>
      </footer>
    </article>
  );
};

export const PromissoryNoteDocument: React.FC<PromissoryNoteDocumentProps> = ({
  notes,
  order,
  storeLogo,
}) => {
  if (!notes || notes.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        Nenhuma nota promissória a ser emitida para este pedido.
      </div>
    );
  }

  return (
    <div className="promissory-print-container bg-white text-slate-900 w-full max-w-[210mm] mx-auto p-4 sm:p-6 print:p-0">
      {notes.map((note, index) => (
        <React.Fragment key={note.id}>
          <PromissoryNoteCard note={note} order={order} storeLogo={storeLogo} />
          {index < notes.length - 1 && (
            <div className="hidden print:block page-break-separator py-4 text-center text-[9px] uppercase tracking-widest text-slate-400 border-b-2 border-dashed border-slate-300 mb-6">
              - - - - - - - - - - - - - Destaque aqui - - - - - - - - - - - - -
            </div>
          )}
        </React.Fragment>
      ))}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm 12mm 10mm 12mm;
              }
              body {
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              .promissory-print-container {
                max-width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .promissory-note-card {
                page-break-inside: avoid;
                break-inside: avoid;
                box-shadow: none !important;
                margin-bottom: 2rem !important;
              }
            }
          `,
        }}
      />
    </div>
  );
};

export default PromissoryNoteDocument;

import React, { useRef, useState, useEffect } from 'react';
import type Order from '@/pages/types/order.type';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  buildPromissoryNotesFromOrder,
  PromissoryNoteItem,
} from '@/pages/utils/promissory/promissoryNoteService';
import PromissoryNoteDocument from '@/pages/utils/promissory/PromissoryNoteDocument';
import storeLogo from '@/assets/logo-morante-horizontal.svg';
import { formatOrderCode, getOrderIndex } from '@/pages/utils/orderCode';
import { toast } from 'react-toastify';

export interface PromissoryNoteModalProps {
  order: Order;
  isOpen?: boolean;
  onClose: () => void;
}

export const PromissoryNoteModal: React.FC<PromissoryNoteModalProps> = ({
  order,
  isOpen = true,
  onClose,
}) => {
  useBodyScrollLock(isOpen);
  const documentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const notes = React.useMemo<PromissoryNoteItem[]>(() => {
    return buildPromissoryNotesFromOrder(order);
  }, [order]);

  const orderCode = formatOrderCode(order);
  const orderIndex = getOrderIndex(order);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    if (!documentRef.current) return;
    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const element = documentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Nota-Promissoria-Pedido-${orderIndex || orderCode}.pdf`);
      toast.success('Nota promissória exportada em PDF com sucesso!');
    } catch (err: any) {
      console.error('Erro ao exportar PDF:', err);
      toast.error('Não foi possível gerar o PDF diretamente. Você pode usar o botão "Imprimir" e selecionar "Salvar como PDF".');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex flex-col bg-slate-950/85 backdrop-blur-sm text-slate-100 select-none overflow-hidden overscroll-contain animate-in fade-in duration-200">
      {/* Barra Superior / Header do Modal */}
      <header className="no-print h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <i className="bi bi-file-earmark-ruled text-xl"></i>
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>Nota Promissória</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                Pedido #{orderIndex || orderCode}
              </span>
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400">
              Formato A4 para impressão, assinatura e exportação em PDF
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
            title="Exportar documento em formato PDF"
          >
            {isExporting ? (
              <i className="bi bi-arrow-repeat animate-spin"></i>
            ) : (
              <i className="bi bi-file-earmark-pdf"></i>
            )}
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-900/20"
            title="Imprimir documento em formato A4"
          >
            <i className="bi bi-printer"></i>
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Fechar (Esc)"
          >
            <i className="bi bi-x-lg text-lg"></i>
          </button>
        </div>
      </header>

      {/* Conteúdo com Visualização da Folha A4 */}
      <main className="flex-1 overflow-y-auto bg-slate-900/60 p-4 sm:p-8 flex flex-col items-center select-text">
        <div
          ref={documentRef}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-[210mm] border border-slate-200 text-slate-900"
        >
          <PromissoryNoteDocument notes={notes} order={order} storeLogo={storeLogo} />
        </div>
      </main>

      {/* Rodapé no-print */}
      <footer className="no-print bg-slate-900 border-t border-slate-800 px-6 py-3 flex justify-between items-center text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          <i className="bi bi-info-circle text-amber-400"></i>
          <span>
            {notes.length === 1
              ? '1 nota promissória vinculada ao valor pendente do pedido'
              : `${notes.length} notas promissórias vinculadas às parcelas do pedido`}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
        >
          Fechar
        </button>
      </footer>
    </div>
  );
};

export default PromissoryNoteModal;

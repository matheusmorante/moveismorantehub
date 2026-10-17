import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Purchase from '../../../../types/purchase.type';
import { toast } from 'react-toastify';
import { printPurchaseDocument } from '../utils/purchasePrintService';
import {
  PurchaseDetailsFiscalAndNotes,
  PurchaseDetailsFooter,
  PurchaseDetailsHeader,
  PurchaseDetailsItemsTable,
  PurchaseDetailsStats,
} from './purchase-details';

export interface PurchaseDetailsModalProps {
  readonly isOpen: boolean;
  readonly purchase: Purchase | null;
  readonly onClose: () => void;
  readonly onEdit?: (purchase: Purchase) => void;
  readonly onCheckReceipt?: (purchase: Purchase) => void;
}

/**
 * Modal detalhado para visualização, conferência, impressão e cópia de chaves de pedidos de compra.
 */
export const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  isOpen,
  purchase,
  onClose,
  onEdit,
  onCheckReceipt,
}) => {
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

  if (!isOpen || !purchase) return null;

  const totalQuantity = purchase.items.reduce((acc, item) => acc + (item.quantity || 0), 0);

  const handleCopyFiscalKey = () => {
    if (purchase.fiscalKey) {
      navigator.clipboard.writeText(purchase.fiscalKey);
      toast.success('Chave de Acesso copiada para a área de transferência!');
    }
  };

  const handlePrint = () => {
    printPurchaseDocument(purchase);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999999] flex items-center justify-center p-0 xl:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Pedido de Compra #${purchase.purchaseNumber || purchase.id?.slice(-4)}`}
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in border-0 cursor-default"
        onClick={onClose}
        aria-label="Fechar detalhes do pedido de compra"
      />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-slate-900 w-full h-full xl:h-auto xl:max-h-[90vh] xl:max-w-5xl rounded-none xl:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border-0 xl:border border-slate-100 dark:border-slate-800 transition-all">
        <PurchaseDetailsHeader
          purchase={purchase}
          onEdit={onEdit}
          onCheckReceipt={onCheckReceipt}
          onPrint={handlePrint}
          onClose={onClose}
        />

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 xl:p-8 custom-scrollbar space-y-6">
          <PurchaseDetailsStats purchase={purchase} totalQuantity={totalQuantity} />

          <PurchaseDetailsItemsTable items={purchase.items} />

          <PurchaseDetailsFiscalAndNotes
            purchase={purchase}
            onCopyFiscalKey={handleCopyFiscalKey}
          />
        </div>

        <PurchaseDetailsFooter
          purchase={purchase}
          onClose={onClose}
          onCheckReceipt={onCheckReceipt}
          onEdit={onEdit}
        />
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default PurchaseDetailsModal;

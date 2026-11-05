import React from 'react';
import type { AuditItem } from '../types/inventoryAudit.types';
import QRScannerModal from '@/components/shared/QRScannerModal';

export interface InventoryScanFeedback {
  type: 'error';
  title: string;
  detail?: string;
}

export interface InventoryScanRead {
  item: AuditItem;
  quantity: number;
}

interface InventoryScannerModalProps {
  readonly isOpen: boolean;
  readonly isScanProcessing: boolean;
  readonly isSupplierScanner: boolean;
  readonly lastRead: InventoryScanRead | null;
  readonly scanFeedback: InventoryScanFeedback | null;
  readonly countedQuantityTotal: number;
  readonly title: string;
  readonly subtitle: string;
  readonly onClose: () => void;
  readonly onScan: NonNullable<React.ComponentProps<typeof QRScannerModal>['onScan']>;
}

export const InventoryScannerModal: React.FC<InventoryScannerModalProps> = ({
  isOpen,
  isScanProcessing,
  isSupplierScanner,
  lastRead,
  scanFeedback,
  countedQuantityTotal,
  title,
  subtitle,
  onClose,
  onScan,
}) => (
  <QRScannerModal
    isOpen={isOpen}
    onClose={onClose}
    onScan={onScan}
    title={title}
    subtitle={subtitle}
    qrCodeOnly
    allowManualInput={false}
    showScannerStatus={false}
    feedbackOnDetection={false}
    closeOnScan={false}
    scanInstruction="Aponte para o QR Code da etiqueta"
    footerContent={
      <div className="space-y-3">
        {scanFeedback ? (
          <div
            role="status"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <p className="font-bold">{scanFeedback.title}</p>
            {scanFeedback.detail && <p className="mt-1 text-xs">{scanFeedback.detail}</p>}
          </div>
        ) : lastRead ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Última leitura
            </p>
            <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
              {lastRead.item.name}
            </p>
            {lastRead.item.isActive === false && (
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                Produto desativado — {lastRead.quantity}{' '}
                {lastRead.quantity === 1 ? 'unidade encontrada' : 'unidades encontradas'}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              SKU: {lastRead.item.sku || lastRead.item.code || lastRead.item.barcode || '—'}
            </p>
            {!isSupplierScanner && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fornecedor: {lastRead.item.assignedSupplier || 'Sem fornecedor'}
              </p>
            )}
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Quantidade contada: {lastRead.quantity}
            </p>
          </div>
        ) : null}
        <p className="text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
          {countedQuantityTotal.toLocaleString('pt-BR')} quantidades contadas
        </p>
        <button
          type="button"
          onClick={onClose}
          disabled={isScanProcessing}
          className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-black uppercase tracking-wider text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Finalizar leitura
        </button>
      </div>
    }
  />
);

export default InventoryScannerModal;

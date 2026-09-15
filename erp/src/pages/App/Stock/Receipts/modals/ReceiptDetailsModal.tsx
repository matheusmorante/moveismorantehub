import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import {
    ReceiptDetailsHeader,
    ReceiptDetailsSummary,
    ReceiptAttachmentsAndNotes,
    ReceiptItemsTable,
    ReceiptDetailsFooter,
} from './receipt-details';

interface ReceiptDetailsModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly receipt: GoodsReceipt | null;
}

export function ReceiptDetailsModal({
    isOpen,
    onClose,
    receipt,
}: ReceiptDetailsModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !receipt) return null;

    const content = (
        <div
            className="fixed inset-0 z-[999999] flex items-stretch justify-center animate-fade-in xl:items-center xl:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-details-modal-title"
        >
            <button
                type="button"
                aria-label="Fechar detalhes do recebimento"
                onClick={onClose}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm cursor-default border-0 p-0 m-0 w-full h-full"
            />
            <div className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 xl:my-8 xl:h-auto xl:max-w-4xl xl:rounded-[2.5rem] xl:border xl:border-slate-100 xl:dark:border-slate-800">
                <ReceiptDetailsHeader
                    receipt={receipt}
                    onClose={onClose}
                />

                <div className="flex-1 overflow-y-auto p-6 space-y-6 xl:max-h-[75vh] xl:flex-none xl:p-8">
                    <ReceiptDetailsSummary receipt={receipt} />
                    <ReceiptAttachmentsAndNotes receipt={receipt} />
                    <ReceiptItemsTable items={receipt.items} />
                </div>

                <ReceiptDetailsFooter
                    receipt={receipt}
                    onClose={onClose}
                />
            </div>
        </div>
    );

    return typeof document === 'undefined' ? content : createPortal(content, document.body);
}

export default ReceiptDetailsModal;

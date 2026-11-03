import React, { useState } from 'react';
import { Check, PackagePlus, RotateCcw } from 'lucide-react';
import { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { getReceiptBadgeContent } from './receiptBadgeContent';
import { ReceiptMovementDetailsModal } from './ReceiptMovementDetailsModal';

interface ReceiptMovementBadgeProps {
  readonly receipt: GoodsReceipt;
}

export const ReceiptMovementBadge: React.FC<ReceiptMovementBadgeProps> = ({ receipt }) => {
  const [isOpen, setIsOpen] = useState(false);

  const isDraft = receipt.isDraft || receipt.status === 'draft';
  const isReversed = receipt.status === 'estornado';
  const hasMovement = !isDraft && !isReversed;

  const content = getReceiptBadgeContent(receipt);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsOpen((open) => !open);
  };

  return (
    <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleClick}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`relative flex h-6 w-6 items-center justify-center rounded-md border shadow-sm transition-all active:scale-95 cursor-pointer ${content.badgeColorClass}`}
        title={content.title}
        aria-label={content.title}
      >
        <PackagePlus className="h-3.5 w-3.5" />

        {isReversed ? (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-800 text-white shadow-2xs ring-1 ring-white dark:ring-slate-900 pointer-events-none">
            <RotateCcw className="h-1.5 w-1.5 stroke-[3]" />
          </span>
        ) : hasMovement ? (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-800 text-white shadow-2xs ring-1 ring-white dark:ring-slate-900 pointer-events-none">
            <Check className="h-2 w-2 stroke-[3]" />
          </span>
        ) : null}
      </button>

      {isOpen && (
        <ReceiptMovementDetailsModal
          content={content}
          receipt={receipt}
          hasMovement={hasMovement}
          isReversed={isReversed}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ReceiptMovementBadge;

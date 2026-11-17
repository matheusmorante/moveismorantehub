import React from 'react';
import Order, { OrderAction, IsButtonsClicked } from '../../../types/order.type';
import { formatOrderCode } from '../../../utils/orderCode';
import { DeliveryInfoActionButtons } from './components/DeliveryInfoActionButtons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface DeliveryInfoModalProps {
  readonly order: Order;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly clickedButtons: Record<string, boolean | undefined>;
  readonly staleButtons: Order['isButtonsStale'];
  readonly onExecuteAction: (
    key: keyof IsButtonsClicked,
    action: OrderAction,
    actionOrder?: Order
  ) => void | Promise<void>;
  readonly isAdministrator?: boolean;
  readonly isDirectApiSending?: boolean;
}

export const DeliveryInfoModal: React.FC<DeliveryInfoModalProps> = ({
  order,
  isOpen,
  onClose,
  clickedButtons,
  staleButtons,
  onExecuteAction,
}) => {
  useBodyScrollLock(isOpen);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalTitle = 'Informações sobre a venda';

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 overscroll-contain">
      <button
        type="button"
        aria-label="Fechar modal de informações da venda"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-info-title"
        className="relative z-10 bg-white dark:bg-slate-900 w-full max-w-lg max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm shrink-0">
              <i className="bi bi-receipt text-xl" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3
                id="delivery-info-title"
                className="text-base font-black text-slate-800 dark:text-slate-100 truncate"
              >
                {modalTitle}
              </h3>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Pedido #{formatOrderCode(order)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
            title="Fechar"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-3 overflow-y-auto min-h-0">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Escolha uma ação para as informações desta venda.
          </p>
          <DeliveryInfoActionButtons
            order={order}
            clickedButtons={clickedButtons}
            staleButtons={staleButtons || {}}
            onExecuteAction={onExecuteAction}
          />
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <i className="bi bi-x-lg" />
            <span>Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryInfoModal;

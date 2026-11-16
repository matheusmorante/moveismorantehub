import React from 'react';
import Order, { OrderAction, IsButtonsClicked } from '../../../types/order.type';
import { formatOrderCode } from '../../../utils/orderCode';
import { DeliveryInfoActionButtons } from './components/DeliveryInfoActionButtons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import PickupIcon from '@/components/shared/PickupIcon';
import {
  createOrderForOperation,
  getOperationActionClicked,
  getOperationActionStale,
  getOperationScheduleLabel,
  getOrderOperations,
} from './operationActionScope';

interface DeliveryInfoModalProps {
  readonly order: Order;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly clickedButtons: Record<string, boolean | undefined>;
  readonly staleButtons: Order['isButtonsStale'];
  readonly onExecuteAction: (
    key: keyof IsButtonsClicked,
    action: OrderAction,
    operationId?: string
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
  isAdministrator = false,
  isDirectApiSending = false,
}) => {
  useBodyScrollLock(isOpen);
  const [selectedOperationId, setSelectedOperationId] = React.useState<string | null>(null);
  const operations = React.useMemo(() => getOrderOperations(order), [order]);
  const selectedEntry = operations.find((entry) => entry.id === selectedOperationId) ||
    (operations.length === 1 ? operations[0] : undefined);
  const selectedOrder = selectedEntry
    ? createOrderForOperation(order, selectedEntry, operations.length)
    : null;
  const isPickup = selectedEntry
    ? (selectedEntry.appointment.deliveryMethod ?? order.shipping?.deliveryMethod) === 'pickup'
    : false;

  React.useEffect(() => {
    if (!isOpen) setSelectedOperationId(null);
  }, [isOpen]);

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

  const modalTitle = selectedEntry
    ? `Operação ${selectedEntry.index + 1}/${operations.length}`
    : 'Informações sobre as operações';
  const isSingleOperation = operations.length === 1;

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 overscroll-contain">
      <button
        type="button"
        aria-label="Fechar modal de informações das operações"
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
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${isPickup ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'}`}>
              {isPickup ? <PickupIcon className="h-5 w-5" /> : <i className="bi bi-truck text-xl" />}
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
          {selectedEntry && selectedOrder ? (
            <>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${isPickup ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                    {isPickup ? <PickupIcon className="h-3.5 w-3.5" /> : <i className="bi bi-truck" />}
                    {isPickup ? 'Retirada' : 'Entrega'}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {getOperationScheduleLabel(selectedEntry, order.shipping?.deliveryMethod)}
                  </span>
                </div>
              </div>
              <DeliveryInfoActionButtons
                order={selectedOrder}
                isPickup={isPickup}
                isAdministrator={isAdministrator}
                operationId={selectedEntry.id}
                clickedButtons={Object.fromEntries(
                  ['sendCustomerOrder', 'sendCustomerOrderDirectApi', 'sendShippingOrder', 'printShippingOrder'].map((key) => [
                    key,
                    getOperationActionClicked(clickedButtons, selectedEntry.id, key, isSingleOperation),
                  ])
                )}
                staleButtons={Object.fromEntries(
                  ['sendCustomerOrder', 'sendCustomerOrderDirectApi', 'sendShippingOrder', 'printShippingOrder'].map((key) => [
                    key,
                    getOperationActionStale(staleButtons, selectedEntry.id, key, isSingleOperation),
                  ])
                ) as Order['isButtonsStale']}
                isDirectApiSending={isDirectApiSending}
                onExecuteAction={(key, action) => onExecuteAction(key, action, selectedEntry.id)}
              />
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Escolha a operação para ver as ações de impressão e envio correspondentes.
              </p>
              <div className="flex flex-col gap-2">
                {operations.map((entry) => {
                  const operationOrder = createOrderForOperation(order, entry, operations.length);
                  const operationIsPickup = operationOrder.shipping.deliveryMethod === 'pickup';
                  return (
                    <button
                      type="button"
                      key={entry.id}
                      aria-label={`Operação ${entry.index + 1}/${operations.length} · ${operationIsPickup ? 'Retirada' : 'Entrega'}`}
                      onClick={() => setSelectedOperationId(entry.id)}
                      className="group rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-left transition-all hover:border-blue-400 hover:bg-blue-50/50 dark:hover:border-blue-500 dark:hover:bg-blue-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-sm text-slate-800 dark:text-slate-100">
                              Operação {entry.index + 1}/{operations.length}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${operationIsPickup ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                              {operationIsPickup ? <PickupIcon className="h-3 w-3" /> : <i className="bi bi-truck" />}
                              {operationIsPickup ? 'Retirada' : 'Entrega'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            {getOperationScheduleLabel(entry, order.shipping?.deliveryMethod)} · {operationOrder.items.length} {operationOrder.items.length === 1 ? 'item' : 'itens'}
                          </p>
                        </div>
                        <i className="bi bi-chevron-right mt-1 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between shrink-0">
          {selectedEntry && !isSingleOperation ? (
            <button
              type="button"
              onClick={() => setSelectedOperationId(null)}
              className="px-5 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-100 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all flex items-center gap-2"
            >
              <i className="bi bi-arrow-left" />
              <span>Voltar às operações</span>
            </button>
          ) : <span />}
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

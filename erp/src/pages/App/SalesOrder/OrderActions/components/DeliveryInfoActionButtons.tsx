import React from 'react';
import Order, { OrderAction, IsButtonsClicked } from '../../../../types/order.type';
import {
  createOrderForOperation,
  getOperationActionClicked,
  getOperationActionStale,
  getOrderOperations,
  operationActionStateKey,
} from '../operationActionScope';

interface DeliveryInfoActionButtonsProps {
  readonly order: Order;
  readonly clickedButtons: Record<string, boolean | undefined>;
  readonly staleButtons: Order['isButtonsStale'];
  readonly onExecuteAction: (
    key: keyof IsButtonsClicked,
    action: OrderAction,
    actionOrder?: Order
  ) => void | Promise<void>;
}

export const DeliveryInfoActionButtons: React.FC<DeliveryInfoActionButtonsProps> = ({
  order,
  clickedButtons,
  staleButtons,
  onExecuteAction,
}) => {
  const isCustomerOrderClicked = Boolean(clickedButtons['sendCustomerOrder']);
  const isShippingOrderClicked = Boolean(clickedButtons['sendShippingOrder']);
  const isCustomerOrderStale = isCustomerOrderClicked && Boolean(staleButtons?.['sendCustomerOrder']);
  const isShippingOrderStale = isShippingOrderClicked && Boolean(staleButtons?.['sendShippingOrder']);
  const staleClasses =
    'text-[#3b1900] bg-amber-400 hover:bg-amber-300 border-amber-500 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40';
  const statusClasses = (isClicked: boolean, isStale: boolean) =>
    isStale
      ? 'border-amber-600 ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-slate-900'
      : isClicked
        ? 'border-emerald-500 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900'
        : 'border-slate-100 dark:border-slate-800';
  const operations = getOrderOperations(order);

  return (
    <div className="flex flex-col gap-2.5">
      {/* 1. Enviar para o Cliente */}
      <button
        type="button"
        onClick={() => onExecuteAction('sendCustomerOrder', 'SEND_CUSTOMER_ORDER')}
        title="Enviar confirmação e dados da venda para o cliente pelo WhatsApp"
        className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left relative ${isCustomerOrderStale ? staleClasses : 'text-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/20 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/30'} hover:-translate-y-0.5 hover:shadow-md ${statusClasses(isCustomerOrderClicked, isCustomerOrderStale)}`}
      >
        <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm text-2xl">
          <i className="bi bi-whatsapp"></i>
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <span className="text-xs font-black uppercase tracking-wider block text-slate-800 dark:text-slate-100">
            Enviar para o Cliente
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
            Enviar informações da venda para o WhatsApp do cliente
          </span>
        </div>
        {isCustomerOrderClicked && !isCustomerOrderStale && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
            <i className="bi bi-check text-sm font-black"></i>
          </div>
        )}
      </button>

      {/* 2. Enviar para a Equipe */}
      <button
        type="button"
        onClick={() => onExecuteAction('sendShippingOrder', 'SEND_SHIPPING_ORDER')}
        title="Enviar informações da venda para a equipe pelo WhatsApp"
        className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left relative ${isShippingOrderStale ? staleClasses : 'text-orange-600 bg-orange-50/70 dark:bg-orange-950/20 hover:bg-orange-100/80 dark:hover:bg-orange-900/30'} hover:-translate-y-0.5 hover:shadow-md ${statusClasses(isShippingOrderClicked, isShippingOrderStale)}`}
      >
        <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-sm text-2xl">
          <i className="bi bi-truck"></i>
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <span className="text-xs font-black uppercase tracking-wider block text-slate-800 dark:text-slate-100">
            Enviar para a Equipe
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
            Enviar dados de todas as operações para a equipe
          </span>
        </div>
        {isShippingOrderClicked && !isShippingOrderStale && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
            <i className="bi bi-check text-sm font-black"></i>
          </div>
        )}
      </button>

      {/* Impressão individual para cada operação da venda. */}
      {operations.map((operation) => {
        const actionKey = operationActionStateKey(operation.id, 'printShippingOrder');
        const isClicked = getOperationActionClicked(
          clickedButtons,
          operation.id,
          'printShippingOrder',
          operations.length === 1
        );
        const isStale = getOperationActionStale(
          staleButtons,
          operation.id,
          'printShippingOrder',
          operations.length === 1
        );
        const modality = (operation.appointment.deliveryMethod ?? order.shipping?.deliveryMethod) === 'pickup'
          ? 'Retirada'
          : 'Entrega';
        const operationOrder = createOrderForOperation(order, operation, operations.length);

        return (
          <button
            key={operation.id}
            type="button"
            onClick={() => onExecuteAction(actionKey, 'PRINT_SHIPPING_ORDER', operationOrder)}
            title={`Imprimir informações sobre a operação ${operation.index + 1} — ${modality}`}
            className={`flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all relative hover:-translate-y-0.5 hover:shadow-md ${isStale ? staleClasses : 'text-blue-600 bg-blue-50/70 dark:bg-blue-950/20 hover:bg-blue-100/80 dark:hover:bg-blue-900/30'} ${statusClasses(isClicked, isStale)}`}
          >
            <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm text-2xl">
              <i className="bi bi-printer-fill" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <span className="block text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Imprimir informações sobre a operação {operation.index + 1} — {modality}
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Imprimir os dados e itens desta operação
              </span>
            </div>
            {isClicked && !isStale && (
              <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                <i className="bi bi-check text-sm font-black" aria-hidden="true" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

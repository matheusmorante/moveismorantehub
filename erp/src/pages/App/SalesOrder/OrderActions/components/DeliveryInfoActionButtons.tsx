import React from 'react';
import Order, { OrderAction, IsButtonsClicked } from '../../../../types/order.type';
import { isSamePhoneNumber } from '../../../../utils/textUtils';

interface DeliveryInfoActionButtonsProps {
  readonly order: Order;
  readonly isPickup: boolean;
  readonly isAdministrator: boolean;
  readonly clickedButtons: Record<string, boolean>;
  readonly onExecuteAction: (
    key: keyof IsButtonsClicked,
    action: OrderAction
  ) => void | Promise<void>;
}

export const DeliveryInfoActionButtons: React.FC<DeliveryInfoActionButtonsProps> = ({
  order,
  isPickup,
  isAdministrator,
  clickedButtons,
  onExecuteAction,
}) => {
  const isCustomerOrderClicked = Boolean(clickedButtons['sendCustomerOrder']);
  const isDirectApiClicked = Boolean(clickedButtons['sendCustomerOrderDirectApi']);
  const isShippingOrderClicked = Boolean(clickedButtons['sendShippingOrder']);
  const isPrintShippingOrderClicked = Boolean(clickedButtons['printShippingOrder']);

  return (
    <div className="flex flex-col gap-2.5">
      {/* 1. Enviar para o Cliente */}
      <button
        type="button"
        onClick={() => onExecuteAction('sendCustomerOrder', 'SEND_CUSTOMER_ORDER')}
        title="Enviar confirmação e dados da entrega para o cliente pelo WhatsApp"
        className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left relative text-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/20 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/30 hover:-translate-y-0.5 hover:shadow-md ${
          isCustomerOrderClicked
            ? 'border-emerald-500 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900'
            : 'border-slate-100 dark:border-slate-800'
        }`}
      >
        <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm text-2xl">
          <i className="bi bi-whatsapp"></i>
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <span className="text-xs font-black uppercase tracking-wider block text-slate-800 dark:text-slate-100">
            Enviar para o Cliente
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
            {isPickup
              ? 'Enviar retirada para o WhatsApp do cliente'
              : 'Enviar entrega para o WhatsApp do cliente'}
          </span>
        </div>
        {isCustomerOrderClicked && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
            <i className="bi bi-check text-sm font-black"></i>
          </div>
        )}
      </button>

      {/* 1.1 Enviar diretamente ao Cliente via Cloud WhatsApp API (Beta - Apenas Administrador) */}
      <div className="relative">
        <button
          type="button"
          disabled={!isAdministrator}
          onClick={() =>
            onExecuteAction('sendCustomerOrderDirectApi', 'SEND_CUSTOMER_ORDER_DIRECT_API')
          }
          title={
            !isAdministrator
              ? 'Disponível apenas para administradores (Beta)'
              : 'Enviar para o cliente diretamente via Cloud WhatsApp API (Beta)'
          }
          className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left relative ${
            !isAdministrator
              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800'
              : 'text-[#3b1900] bg-amber-400 hover:bg-amber-300 border-amber-500 shadow-sm dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40 hover:-translate-y-0.5 hover:shadow-md'
          } ${
            isDirectApiClicked
              ? 'border-emerald-500 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900'
              : ''
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-[#3b1900] dark:text-amber-300 flex items-center justify-center shrink-0 shadow-sm text-2xl">
            <i className="bi bi-whatsapp"></i>
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider block text-slate-900 dark:text-slate-100">
                Enviar para o cliente diretamente (Cloud WhatsApp)
              </span>
              <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded bg-amber-200 text-[#3b1900] border border-amber-400 dark:bg-amber-800 dark:text-amber-100">
                BETA
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mt-0.5 truncate">
              {isPickup
                ? 'Enviar retirada diretamente via Cloud WhatsApp API'
                : 'Enviar entrega diretamente via Cloud WhatsApp API'}
              {!isAdministrator && ' (Apenas Administrador)'}
            </span>
          </div>
          {isDirectApiClicked && (
            <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
              <i className="bi bi-check text-sm font-black"></i>
            </div>
          )}
        </button>

        {isSamePhoneNumber(order.customerData?.phone, '(41) 99749-3547') && (
          <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-medium">
            <i className="bi bi-info-circle-fill text-amber-500 shrink-0" />
            <span>
              O telefone deste pedido é o mesmo WhatsApp da loja. Para testar o envio direto pela Meta API, altere o telefone do cliente no pedido.
            </span>
          </div>
        )}
      </div>

      {/* 2. Enviar para a Equipe */}
      <button
        type="button"
        onClick={() => onExecuteAction('sendShippingOrder', 'SEND_SHIPPING_ORDER')}
        title="Enviar detalhes da entrega para o grupo da equipe pelo WhatsApp"
        className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left relative text-orange-600 bg-orange-50/70 dark:bg-orange-950/20 hover:bg-orange-100/80 dark:hover:bg-orange-900/30 hover:-translate-y-0.5 hover:shadow-md ${
          isShippingOrderClicked
            ? 'border-emerald-500 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900'
            : 'border-slate-100 dark:border-slate-800'
        }`}
      >
        <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-sm text-2xl">
          <i className="bi bi-truck"></i>
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <span className="text-xs font-black uppercase tracking-wider block text-slate-800 dark:text-slate-100">
            Enviar para a Equipe
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
            {isPickup
              ? 'Enviar dados de retirada para a equipe'
              : 'Enviar dados de entrega para a equipe'}
          </span>
        </div>
        {isShippingOrderClicked && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
            <i className="bi bi-check text-sm font-black"></i>
          </div>
        )}
      </button>

      {/* 3. Imprimir informações da entrega */}
      <button
        type="button"
        onClick={() => onExecuteAction('printShippingOrder', 'PRINT_SHIPPING_ORDER')}
        title="Imprimir pedido com as informações da entrega"
        className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left relative text-blue-600 bg-blue-50/70 dark:bg-blue-950/20 hover:bg-blue-100/80 dark:hover:bg-blue-900/30 hover:-translate-y-0.5 hover:shadow-md ${
          isPrintShippingOrderClicked
            ? 'border-emerald-500 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900'
            : 'border-slate-100 dark:border-slate-800'
        }`}
      >
        <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm text-2xl">
          <i className="bi bi-printer-fill"></i>
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <span className="text-xs font-black uppercase tracking-wider block text-slate-800 dark:text-slate-100">
            Imprimir informações da entrega
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
            Imprimir documento com dados da entrega e itens
          </span>
        </div>
        {isPrintShippingOrderClicked && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
            <i className="bi bi-check text-sm font-black"></i>
          </div>
        )}
      </button>
    </div>
  );
};

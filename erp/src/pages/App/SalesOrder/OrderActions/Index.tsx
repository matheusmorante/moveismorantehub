import React, { useState } from "react";
import Order, { OrderAction, IsButtonsClicked } from "../../../types/order.type";
import { dateNow } from "../../../utils/formatters";
import { buttons, actionsMap } from "./orderActionsConfig";
import { validateOrder } from "../../../utils/validations";
import { toast } from "react-toastify";


const OrderActions = ({ order, context = 'list' }: { order: Order, context?: 'form' | 'list' }) => {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [localClicked, setLocalClicked] = useState<IsButtonsClicked>(order.isButtonsClicked || {
    printReceipt: false,
    printShippingOrder: false,
    printWarrantyTerm: false,
    sendShippingOrder: false,
    sendCustomerOrder: false,
    sendCustomerReviews: false,
    printShippingLabel: false,
    printProductLabel: false,
    generatePaymentLink: false,
    printBudget: false,
    sendCustomerOrderDetails: false,
    sendAssistanceOS: false
  });

  async function markClicked(key: keyof IsButtonsClicked) {
    const next = { ...localClicked, [key]: true };
    setLocalClicked(next);
    
    // Persist to DB
    try {
        const { updateOrder } = await import("../../../utils/orderHistoryService");
        if (order.id) {
            await updateOrder(order.id, { isButtonsClicked: next });
        }
    } catch (e) {
        console.error("Erro ao salvar estado do botão:", e);
    }
  }

  function handleAction(action: OrderAction) {
    const updated = { ...order, date: dateNow(), isButtonsClicked: localClicked };
    sessionStorage.setItem("order", JSON.stringify(updated));
    if (actionsMap[action]) {
      actionsMap[action](updated);
    }
  }

  const orderType = order.orderType || 'sale';

  // Filter buttons: show only buttons that match orderType (or no orderTypes restriction)
  const visibleButtons = buttons.filter(btn => {
    // Basic order type restriction
    if (btn.orderTypes && !btn.orderTypes.includes(orderType)) return false;

    // Form-specific restrictions
    if (context === 'form') {
      // Hide labels in form mode
      if (['PRINT_SHIPPING_LABEL', 'PRINT_PRODUCT_LABEL'].includes(btn.action)) return false;
      
      // NEW: Enviar Entrega button only if deliveryMethod === 'delivery'
      if (btn.action === 'SEND_SHIPPING_ORDER') {
        const isDelivery = order.shipping?.deliveryMethod === 'delivery';
        if (!isDelivery) return false;
      }

      // Evaluation button removed as requested
      if (btn.action === 'SEND_CUSTOMER_REVIEWS') return false;
    }


    return true;
  });

  const getValidationStats = () => {
    const errors = validateOrder(order);
    
    return [
      { 
        label: 'Produtos / Serviços', 
        icon: 'bi-box-seam',
        valid: !errors.items_summary && !Object.keys(errors).some(k => k.startsWith('item_')),
        error: errors.items_summary || Object.entries(errors).find(([k, v]) => k.startsWith('item_'))?.[1]
      },
      { 
        label: 'Dados do Cliente', 
        icon: 'bi-person-badge',
        valid: !errors.customer_fullName && !errors.customer_phone && !errors.customer_cpfCnpj,
        error: errors.customer_fullName || errors.customer_phone || errors.customer_cpfCnpj
      },
      { 
        label: 'Logística / Data', 
        icon: 'bi-truck',
        valid: !errors.shipping_date && !errors.shipping_time && !errors.shipping_scheduling && !errors.customer_street && !errors.customer_number && !errors.customer_city,
        error: errors.shipping_date || errors.shipping_time || errors.shipping_scheduling || errors.customer_street || errors.customer_number || errors.customer_city
      },
      { 
        label: 'Pagamento / Total', 
        icon: 'bi-credit-card-2-front',
        valid: !errors.payments_summary && !Object.keys(errors).some(k => k.startsWith('payment_')),
        error: errors.payments_summary
      },
      { 
        label: 'Atendente Principal', 
        icon: 'bi-person-check',
        valid: !errors.seller,
        error: errors.seller
      }
    ];
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      {visibleButtons.map((btn: any) => {
        const isPrintAction = btn.action === 'PRINT_RECEIPT' || btn.action === 'PRINT_SHIPPING_ORDER';
        const isSendAction = btn.action === 'SEND_SHIPPING_ORDER' || btn.action === 'SEND_CUSTOMER_ORDER' || btn.action === 'SEND_ASSISTANCE_CUSTOMER' || btn.action === 'SEND_ASSISTANCE_ORDER_DETAILS' || btn.action === 'SEND_ASSISTANCE_OS';
        const orderErrors = (isPrintAction || isSendAction) ? validateOrder(order) : {};
        const hasErrors = Object.keys(orderErrors).length > 0;

        const isPrintReceipt = btn.key === 'printReceipt';
        const noCustomer = isPrintReceipt && (!order.customerData?.fullName || order.customerData.fullName === "Nenhum" || order.customerData.fullName === "Ao Consumidor");
        const isDisabled = noCustomer || (isPrintAction && hasErrors) || (isSendAction && hasErrors);

        const disabledReason = noCustomer
            ? 'Não é possível imprimir recibo sem cliente associado'
            : (isPrintAction || isSendAction) && hasErrors
            ? `Campos obrigatórios faltando. Verifique o formulário.`
            : btn.label;

        const validationStats = (isPrintAction || isSendAction) ? getValidationStats() : [];

        return (
          <div 
            key={btn.key}
            className="relative"
            onMouseEnter={(e) => {
              if (isDisabled && (isPrintAction || isSendAction)) {
                setHoveredBtn(btn.key);
                setMousePos({ x: e.clientX, y: e.clientY });
              }
            }}
            onMouseLeave={() => setHoveredBtn(null)}
            onMouseMove={(e) => {
                if (hoveredBtn === btn.key) {
                    setMousePos({ x: e.clientX, y: e.clientY });
                }
            }}
          >
            <button
                type="button"
                disabled={isDisabled}
                className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all active:scale-95 whitespace-nowrap border shadow-sm text-[10px] font-black uppercase tracking-widest
                ${isDisabled
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800'
                    : `bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/40 hover:shadow-md ${btn.color}`
                }
                `}
                onClick={(e) => {
                e.preventDefault();
                if (isDisabled) {
                    toast.warning(isPrintAction && hasErrors ? `Campos obrigatórios faltando. Verifique o formulário.` : disabledReason);
                    return;
                }
                handleAction(btn.action);
                markClicked(btn.key as keyof IsButtonsClicked);
                }}
            >
                <i className={`bi ${btn.icon} text-sm`} />
                <span>{btn.label}</span>
                {localClicked[btn.key as keyof IsButtonsClicked] && <i className="bi bi-check-circle-fill text-green-500 ml-1" />}
            </button>

            {/* Validation Hover Overlay */}
            {hoveredBtn === btn.key && isDisabled && (
                <div 
                   className="fixed z-[9999] w-72 pointer-events-none animate-fade-in translate-y-[-100%] mt-[-20px]"
                   style={{ 
                     left: mousePos.x - 144, // center horizontally relative to mouse
                     top: mousePos.y 
                   }}
                >
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden p-5 ring-1 ring-black/5 flex flex-col gap-4">
                        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <i className="bi bi-exclamation-triangle-fill text-sm" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-100 tracking-tight">Campos Obrigatórios</span>
                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Verificação de Bloqueio</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {validationStats.map((stat, sIdx) => (
                                <div key={sIdx} className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                        stat.valid 
                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-500 dark:bg-emerald-900/10' 
                                        : 'bg-rose-50 border-rose-100 text-rose-500 dark:bg-rose-900/10'
                                    }`}>
                                        <i className={`bi ${stat.valid ? 'bi-check2' : 'bi-x-lg'} text-[10px]`} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <i className={`bi ${stat.icon} text-[10px] text-slate-400`} />
                                            <span className={`text-[9px] font-black uppercase tracking-tight ${stat.valid ? 'text-slate-600 dark:text-slate-300' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {stat.label}
                                            </span>
                                        </div>
                                        {!stat.valid && stat.error && (
                                            <span className="text-[7px] text-slate-400 font-medium truncate leading-none mt-0.5">
                                                {stat.error}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-1 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-lg">
                                Complete os dados para liberar
                            </span>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )
      })}
    </div>
  );

};

export default OrderActions;

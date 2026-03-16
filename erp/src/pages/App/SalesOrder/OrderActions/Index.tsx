import React, { useState } from "react";
import Order, { OrderAction, IsButtonsClicked } from "../../../types/order.type";
import { dateNow } from "../../../utils/formatters";
import { buttons, actionsMap } from "./orderActionsConfig";
import { validateOrder } from "../../../utils/validations";
import { toast } from "react-toastify";


const OrderActions = ({ order, context = 'list' }: { order: Order, context?: 'form' | 'list' }) => {
  const [localClicked, setLocalClicked] = useState<IsButtonsClicked>(order.isButtonsClicked || {
    printReceipt: false,
    printShippingOrder: false,
    printWarrantyTerm: false,
    sendShippingOrder: false,
    sendCustomerOrder: false,
    sendCustomerReviews: false,
    stockWithdrawal: false,
    stockReversal: false,
    printShippingLabel: false,
    printProductLabel: false
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
      // Hide stock actions and labels in form mode
      if (['STOCK_WITHDRAWAL', 'STOCK_REVERSAL', 'PRINT_SHIPPING_LABEL', 'PRINT_PRODUCT_LABEL'].includes(btn.action)) return false;
      
      // Evaluation button only in Pickup or Fullfilled
      if (btn.action === 'SEND_CUSTOMER_REVIEWS') {
        const isPickup = order.shipping?.deliveryMethod === 'pickup';
        const isFulfilled = order.status === 'fulfilled';
        if (!isPickup && !isFulfilled) return false;
      }
    }

    // Toggle logic for stock (only in list mode or general)
    if (context === 'list') {
        const stockLaunched = order.status === 'scheduled' || order.status === 'fulfilled'; // Simplified check
        if (btn.action === 'STOCK_WITHDRAWAL' && stockLaunched) return false;
        if (btn.action === 'STOCK_REVERSAL' && !stockLaunched) return false;
    }

    return true;
  });

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      {visibleButtons.map((btn: any, idx: number) => {
        const isPrintAction = btn.action === 'PRINT_RECEIPT' || btn.action === 'PRINT_SHIPPING_ORDER';
        const orderErrors = isPrintAction ? validateOrder(order) : {};
        const hasErrors = Object.keys(orderErrors).length > 0;

        const isPrintReceipt = btn.key === 'printReceipt';
        const noCustomer = isPrintReceipt && (!order.customerData?.fullName || order.customerData.fullName === "Nenhum" || order.customerData.fullName === "Ao Consumidor");
        const isDisabled = noCustomer || (isPrintAction && hasErrors);

        const disabledReason = noCustomer
            ? 'Não é possível imprimir recibo sem cliente associado'
            : isPrintAction && hasErrors
            ? `Preencha os campos obrigatórios antes de imprimir: ${Object.values(orderErrors).slice(0, 2).join(' | ')}`
            : btn.label;

        return (
        <button
          key={btn.key}
            disabled={isDisabled}
            className={`${isDisabled ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-500 rounded-xl px-6 py-3 shadow-sm' : btn.color} flex items-center gap-3 whitespace-nowrap active:scale-95`}
            title={disabledReason}
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
          <i className={`bi ${btn.icon} text-lg`} />
          <span className="font-black">{btn.label}</span>
          {localClicked[btn.key as keyof IsButtonsClicked] && <i className="bi bi-check-circle-fill text-white ml-1" />}
        </button>
        )
      })}
    </div>
  );

};

export default OrderActions;

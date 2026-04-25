import React, { useState } from "react";
import Order, { OrderAction, IsButtonsClicked } from "../../../types/order.type";
import { dateNow } from "../../../utils/formatters";
import { buttons, actionsMap } from "./orderActionsConfig";
import { validateOrder, validateAssistanceOrder } from "../../../utils/validations";
import { toast } from "react-toastify";


const OrderActions = ({ order }: { order: Order }) => {
  const [isButtonsClicked, setIsButtonsClicked] = useState<IsButtonsClicked>({
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
    sendAssistanceOS: false,
    printAssistanceOS: false
  });

  function markClicked(key: keyof IsButtonsClicked) {
    setIsButtonsClicked((prev) => ({ ...prev, [key]: true }));
  }

  function handleAction(action: OrderAction) {
    const updated = { ...order, date: dateNow() };
    sessionStorage.setItem("order", JSON.stringify(updated));
    if (actionsMap[action]) {
      actionsMap[action](updated);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      {buttons.filter(btn => !btn.orderTypes || btn.orderTypes.includes(order.orderType || 'sale')).map((btn, idx) => {
        const isPrintAction = btn.action === 'PRINT_RECEIPT' || btn.action === 'PRINT_SHIPPING_ORDER' || btn.action === 'PRINT_ASSISTANCE_OS';
        const isAssistance = order.orderType === 'assistance';
        const orderErrors = isPrintAction 
            ? (isAssistance ? validateAssistanceOrder(order) : validateOrder(order)) 
            : {};
        const hasErrors = Object.keys(orderErrors).length > 0;

        const isPrintReceipt = btn.key === 'printReceipt';
        const noCustomer = isPrintReceipt && (!order.customerData?.fullName || order.customerData.fullName === "Nenhum" || order.customerData.fullName === "Ao Consumidor");
        const isDisabled = noCustomer || (isPrintAction && hasErrors);

        const label = typeof btn.label === 'function' ? btn.label(order) : btn.label;
        const disabledReason = noCustomer
            ? 'Não é possível imprimir recibo sem cliente associado'
            : isPrintAction && hasErrors
            ? `Preencha os campos obrigatórios antes de imprimir: ${Object.values(orderErrors).join(', ')}`
            : label;

        return (
        <button
          key={`${btn.key}-${idx}`}
            disabled={isDisabled}
            className={`${isDisabled ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-500 rounded-xl px-6 py-3 shadow-sm' : btn.color} flex items-center gap-3 whitespace-nowrap active:scale-95`}
            title={disabledReason}
          onClick={(e) => {
            e.preventDefault();
            if (isDisabled) {
                toast.warning(disabledReason);
                return;
            }
            handleAction(btn.action);
            markClicked(btn.key as keyof IsButtonsClicked);
          }}
        >
          <i className={`bi ${btn.icon} text-lg`} />
          <span className="font-black">{label}</span>
          {isButtonsClicked[btn.key as keyof IsButtonsClicked] && <i className="bi bi-check-circle-fill text-white ml-1" />}
        </button>
        )
      })}
    </div>
  );

};

export default OrderActions;

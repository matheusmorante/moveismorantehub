import React, { useRef, useState } from 'react';
import Order, { OrderAction, IsButtonsClicked } from '../../../types/order.type';
import { actionsMap } from './orderActionsConfig';
import { toast } from 'react-toastify';
import {
  DEFAULT_CLICKED_BUTTONS,
  evaluateOrderActionButtonState,
  filterVisibleOrderActionButtons,
} from './orderActionValidationRules';
import { OrderActionValidationOverlay } from './components/OrderActionValidationOverlay';

const OrderActions = ({ order, context = 'list' }: { order: Order; context?: 'form' | 'list' }) => {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [localClicked, setLocalClicked] = useState<IsButtonsClicked>(
    order.isButtonsClicked || DEFAULT_CLICKED_BUTTONS
  );
  const directApiSendInFlight = useRef(false);
  const [isDirectApiSending, setIsDirectApiSending] = useState(false);

  async function markClicked(key: keyof IsButtonsClicked) {
    const next = { ...localClicked, [key]: true };
    setLocalClicked(next);

    // Persist to DB
    try {
      const { updateOrder } = await import('../../../utils/orderHistoryService');
      if (order.id) {
        await updateOrder(order.id, { isButtonsClicked: next }, order, undefined, {
          metadataOnly: true,
        });
      }
    } catch (e) {
      console.error('Erro ao salvar estado do botão:', e);
    }
  }

  function handleAction(action: OrderAction): boolean {
    const isDirectApiSend = action === 'SEND_CUSTOMER_ORDER_DIRECT_API';
    if (isDirectApiSend && directApiSendInFlight.current) return false;
    if (isDirectApiSend) {
      directApiSendInFlight.current = true;
      setIsDirectApiSending(true);
    }

    try {
      const updated = {
        ...order,
        date: order.date || new Date().toISOString(),
        isButtonsClicked: localClicked,
      };
      sessionStorage.setItem('order', JSON.stringify(updated));
      if (actionsMap[action]) {
        const actionResult = actionsMap[action](updated);
        if (isDirectApiSend) {
          void Promise.resolve(actionResult)
            .catch((error) => console.error('Erro ao enviar pedido pelo WhatsApp:', error))
            .finally(() => {
              directApiSendInFlight.current = false;
              setIsDirectApiSending(false);
            });
        }
      }
      return true;
    } catch (error) {
      if (isDirectApiSend) {
        directApiSendInFlight.current = false;
        setIsDirectApiSending(false);
      }
      throw error;
    }
  }

  const visibleButtons = filterVisibleOrderActionButtons(order, context);

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      {visibleButtons.map((btn) => {
        const {
          isPrintAction,
          isSendAction,
          hasErrors,
          isDisabled,
          disabledReason,
          validationStats,
        } = evaluateOrderActionButtonState(btn, order);
        const labelText = typeof btn.label === 'function' ? btn.label(order) : btn.label;

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
              disabled={isDisabled || (btn.action === 'SEND_CUSTOMER_ORDER_DIRECT_API' && isDirectApiSending)}
              aria-busy={btn.action === 'SEND_CUSTOMER_ORDER_DIRECT_API' && isDirectApiSending}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all active:scale-95 whitespace-nowrap border shadow-sm text-[10px] font-black uppercase tracking-widest
                ${
                  isDisabled || (btn.action === 'SEND_CUSTOMER_ORDER_DIRECT_API' && isDirectApiSending)
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800'
                    : `bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/40 hover:shadow-md ${btn.color}`
                }
                `}
              onClick={(e) => {
                e.preventDefault();
                if (isDisabled) {
                  toast.warning(
                    isPrintAction && hasErrors
                      ? 'Campos obrigatórios faltando. Verifique o formulário.'
                      : disabledReason
                  );
                  return;
                }
                if (!handleAction(btn.action)) return;
                void markClicked(btn.key as keyof IsButtonsClicked);
              }}
            >
              <i className={`bi ${btn.icon} text-sm`} />
              <span>
                {btn.action === 'SEND_CUSTOMER_ORDER_DIRECT_API' && isDirectApiSending
                  ? 'Enviando…'
                  : labelText}
              </span>
              {localClicked[btn.key as keyof IsButtonsClicked] && (
                <i className="bi bi-check-circle-fill text-green-500 ml-1" />
              )}
            </button>

            {hoveredBtn === btn.key && isDisabled && (
              <OrderActionValidationOverlay
                mousePos={mousePos}
                validationStats={validationStats}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OrderActions;

import React from 'react';
import Order from '../../../types/order.type';
import { buttons } from './orderActionsConfig';
import { updateOrder } from '../../../utils/orderHistoryService';
import { NfeEmissionModal } from './NfeEmissionModal';
import { NfeEnvironmentChoiceModal } from './nfe-modal/NfeEnvironmentChoiceModal';
import WarrantyTermModal from './WarrantyTermModal';
import DeliveryInfoModal from './DeliveryInfoModal';
import PromissoryNoteModal from './PromissoryNoteModal';
import { useAuth } from '@/context/AuthContext';
import { fetchOrderFiscalBadgeStatuses } from '../../../utils/nfe/orderFiscalBadgeService';
import type { OrderFiscalBadgeStatuses } from '../../../utils/nfe/orderFiscalBadgeRules';
import { getAvailablePostOrderActions } from './postOrderActionsHelpers';
import { PostOrderActionGridButton } from './components/PostOrderActionGridButton';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import PickupIcon from '@/components/shared/PickupIcon';

interface PostOrderActionsModalProps {
  readonly order: Order;
  readonly onClose: () => void;
  readonly onIssueNfe?: (order: Order, environment?: 1 | 2) => void;
  readonly isAdministrator?: boolean;
}

const PostOrderActionsModal: React.FC<PostOrderActionsModalProps> = ({
  order,
  onClose,
  onIssueNfe,
  isAdministrator: propIsAdministrator,
}) => {
  useBodyScrollLock(true);
  const auth = useAuth();
  const isAdministrator =
    propIsAdministrator ?? Boolean(auth?.isAdministrator || auth?.isRealAdministrator);
  const orderId = order.id;
  const [nfeChoiceOrder, setNfeChoiceOrder] = React.useState<Order | null>(null);
  const [chosenEnvironment, setChosenEnvironment] = React.useState<1 | 2>(1);
  const [nfeEmissionOrder, setNfeEmissionOrder] = React.useState<Order | null>(null);
  const [nfeEmissionOpenedAt, setNfeEmissionOpenedAt] = React.useState<number | undefined>();
  const [warrantyTermOrder, setWarrantyTermOrder] = React.useState<Order | null>(null);
  const [promissoryNoteOrder, setPromissoryNoteOrder] = React.useState<Order | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = React.useState(false);
  const [fiscalStatuses, setFiscalStatuses] = React.useState<OrderFiscalBadgeStatuses | null>(null);

  React.useEffect(() => {
    let active = true;
    if (!orderId) return;
    void fetchOrderFiscalBadgeStatuses([orderId])
      .then((res) => {
        if (active) setFiscalStatuses(res[orderId] || null);
      })
      .catch((err) => console.error('Erro ao buscar status fiscal:', err));
    return () => {
      active = false;
    };
  }, [orderId]);

  const isNfeIssued = Boolean(
    fiscalStatuses?.production === 'issued' ||
      (order.nfeData?.status === 'autorizada' && (order.nfeData?.environment ?? 1) === 1) ||
      order.nfeData?.accessKey ||
      order.nfeData?.protocolNumber
  );

  const isReturnOrder = order.orderType === 'return';
  const isPickupOrder = order.shipping?.deliveryMethod === 'pickup';
  const deliveryModalLabel = isPickupOrder ? 'Informações da Retirada' : 'Informações da Entrega';
  const isCollectionScheduled =
    order.status === 'scheduled' &&
    (order.returnMethod === 'store_collection' || order.returnMethod == null);
  const modalTitle = isReturnOrder ? 'Ações após cadastro' : 'Ações Pós-Venda';
  const availableActions = getAvailablePostOrderActions(order);

  const [clickedButtons, setClickedButtons] = React.useState<Record<string, boolean>>(
    order.isButtonsClicked || {}
  );

  const handleExecuteAction = async (key: string, action: (typeof buttons)[number]['action']) => {
    setClickedButtons((prev) => ({ ...prev, [key]: true }));
    try {
      const module = await import('./orderActionsConfig');
      if (module.actionsMap[action]) {
        module.actionsMap[action](order);
      }
      if (order.id) {
        const clicked = {
          ...(order.isButtonsClicked || {}),
          [key]: true,
        } as Order['isButtonsClicked'];
        order.isButtonsClicked = clicked;
        await updateOrder(
          order.id,
          {
            isButtonsClicked: clicked,
            ...(key === 'sendCustomerReviews' ? { reviewRequested: true } : {}),
          },
          order,
          undefined,
          { metadataOnly: true }
        );
      }
    } catch (err: unknown) {
      console.error('Erro ao executar ação pós-venda:', err);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        isDeliveryModalOpen ||
        nfeChoiceOrder ||
        nfeEmissionOrder ||
        warrantyTermOrder ||
        promissoryNoteOrder
      ) {
        return;
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onClose,
    isDeliveryModalOpen,
    nfeChoiceOrder,
    nfeEmissionOrder,
    warrantyTermOrder,
    promissoryNoteOrder,
  ]);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 overscroll-contain overflow-y-auto">
      <button
        type="button"
        aria-label={
          isReturnOrder
            ? 'Fechar modal de ações após cadastro'
            : 'Fechar modal de ações pós-venda'
        }
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-order-title"
        className="relative z-10 bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800"
      >
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
              <i className="bi bi-check2-circle text-xl"></i>
            </div>
            <div>
              <h3
                id="post-order-title"
                className="text-base font-black text-slate-800 dark:text-slate-100"
              >
                {modalTitle}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 transition-colors"
            title="Fechar"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-3">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            {isReturnOrder ? (
              <>
                O <strong>pedido de devolução já foi cadastrado e gravado</strong>. Você pode{' '}
                {isCollectionScheduled
                  ? 'imprimir os dados da coleta, enviar o pedido ao cliente e repassar os dados da coleta à equipe pelo WhatsApp.'
                  : 'imprimir o comprovante e enviar os dados ao cliente pelo WhatsApp.'}
              </>
            ) : (
              <>
                Você pode executar as ações rápidas abaixo ou simplesmente fechar esta janela.
              </>
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!isReturnOrder && (
              <button
                type="button"
                title={deliveryModalLabel}
                onClick={() => setIsDeliveryModalOpen(true)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all relative min-h-[100px] hover:-translate-y-1 hover:shadow-lg ${isPickupOrder ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' : 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'}`}
              >
                {isPickupOrder ? (
                  <PickupIcon className="mb-2 h-7 w-7" />
                ) : (
                  <i className="bi bi-truck mb-2 text-2xl" />
                )}
                <span className="text-[10px] font-black uppercase tracking-widest text-center">
                  {deliveryModalLabel}
                </span>
              </button>
            )}
            {availableActions.map((btn) => (
              <PostOrderActionGridButton
                key={btn.key}
                btn={btn}
                order={order}
                isClicked={Boolean(clickedButtons[btn.key])}
                isNfeIssued={isNfeIssued}
                isAdministrator={isAdministrator}
                onIssueNfeClick={() => {
                  if (onIssueNfe) {
                    onClose();
                    onIssueNfe(order);
                  } else {
                    setNfeChoiceOrder(order);
                  }
                }}
                onOpenWarrantyTerm={() => setWarrantyTermOrder(order)}
                onOpenPromissoryNote={() => setPromissoryNoteOrder(order)}
                onExecuteAction={handleExecuteAction}
              />
            ))}
          </div>
          <NfeEnvironmentChoiceModal
            isOpen={Boolean(nfeChoiceOrder)}
            order={nfeChoiceOrder}
            onClose={() => setNfeChoiceOrder(null)}
            onSelectEnvironment={(env, preparedOrder) => {
              setNfeChoiceOrder(null);
              setChosenEnvironment(env);
              setNfeEmissionOpenedAt(performance.now());
              setNfeEmissionOrder(preparedOrder);
            }}
          />
          <NfeEmissionModal
            isOpen={Boolean(nfeEmissionOrder)}
            order={nfeEmissionOrder}
            initialEnvironment={chosenEnvironment}
            emissionOpenedAt={nfeEmissionOpenedAt}
            onClose={() => {
              setNfeEmissionOrder(null);
              setNfeEmissionOpenedAt(undefined);
            }}
          />
          <WarrantyTermModal
            isOpen={Boolean(warrantyTermOrder)}
            order={warrantyTermOrder || order}
            onClose={() => setWarrantyTermOrder(null)}
            isAdministrator={isAdministrator}
          />
          <PromissoryNoteModal
            isOpen={Boolean(promissoryNoteOrder)}
            order={promissoryNoteOrder || order}
            onClose={() => setPromissoryNoteOrder(null)}
          />
          <DeliveryInfoModal
            isOpen={isDeliveryModalOpen}
            order={order}
            clickedButtons={clickedButtons}
            onClose={() => setIsDeliveryModalOpen(false)}
            onExecuteAction={handleExecuteAction}
            isAdministrator={isAdministrator}
          />
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <i className="bi bi-check2"></i>
            <span>Fechar / Ir para Lista</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostOrderActionsModal;

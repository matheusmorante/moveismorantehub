import React, { useContext } from 'react';
import Order from '../../../types/order.type';
import { canOpenPostSaleActions, POST_SALE_ACTION_KEYS } from '../../../utils/postSaleActions';
import PostOrderActionsModal from '../OrderActions/PostOrderActionsModal';
import { AuthContext } from '@/context/AuthContext';

type PostSaleActionMenuButtonProps = {
  order: Order;
  onOpen?: (order: Order) => void;
  onCloseMenu: () => void;
  onAction?: (actionKey: string, order: Order) => void;
};

export const isPostSaleAction = (actionKey: string) => POST_SALE_ACTION_KEYS.has(actionKey);

const PostSaleActionMenuButton = ({
  order,
  onOpen,
  onCloseMenu,
  onAction,
}: PostSaleActionMenuButtonProps) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const authContext = useContext(AuthContext);
  const isAdministrator = Boolean(authContext?.isAdministrator);

  if (!canOpenPostSaleActions(order)) return null;

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (onOpen) onOpen(order);
          else setIsModalOpen(true);
          onCloseMenu();
        }}
        className="flex items-center gap-3 w-full p-2.5 rounded-xl text-emerald-600 transition-all hover:bg-emerald-50 dark:hover:bg-emerald-950/30 group/item cursor-pointer text-left"
        title="Abrir ações pós-venda"
      >
        <i className="bi bi-clipboard-check text-lg shrink-0" />
        <span className="text-xs font-black uppercase tracking-widest">Ações pós-venda</span>
      </button>

      {isModalOpen && <PostOrderActionsModal order={order} onClose={() => setIsModalOpen(false)} />}
    </>
  );
};

export default PostSaleActionMenuButton;

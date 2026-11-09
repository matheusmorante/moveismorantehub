import React from 'react';
import { ProductCatalogPanel } from '@/components/catalog/ProductCatalogPanel';
import NewSaleOrder from '@/pages/App/SalesOrder/pages/NewSaleOrder';
import type { WhatsAppConversation } from '../../types';
import { SupportOrderPickerDialog } from './SupportOrderPickerDialog';
import { isQuoteOrder } from './supportOrderSummaryPdf';
import { formatBRL, formatDate } from '@/pages/utils/customerSupport/supportOrdersService';

interface ChatComposerModalsProps {
  conversation: WhatsAppConversation;
  displayName: string;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  documentInputRef: React.RefObject<HTMLInputElement | null>;
  addFiles: (files: FileList | File[], kind: 'media' | 'document') => void;
  orderPicker: {
    isOrderPickerOpen: boolean;
    setIsOrderPickerOpen: (open: boolean) => void;
    orders: any[];
    selectedOrderId: string;
    setSelectedOrderId: (id: string) => void;
    handleSelectOrder: (id: string) => void;
    orderFilter: 'all' | 'orders' | 'quotes';
    setOrderFilter: (filter: 'all' | 'orders' | 'quotes') => void;
    isLoadingOrders: boolean;
    ordersError?: string;
    isCreatingOrderPdf: boolean;
    submitOrderDocument: (e?: React.BaseSyntheticEvent) => Promise<void>;
  };
  isCatalogOpen: boolean;
  setIsCatalogOpen: (open: boolean) => void;
  addCatalogSelection: (selection: any, url: string, onClose: () => void) => void;
  newOrderType: 'sale' | 'budget' | null;
  setNewOrderType: (type: 'sale' | 'budget' | null) => void;
}

export const ChatComposerModals: React.FC<ChatComposerModalsProps> = ({
  conversation,
  displayName,
  photoInputRef,
  documentInputRef,
  addFiles,
  orderPicker,
  isCatalogOpen,
  setIsCatalogOpen,
  addCatalogSelection,
  newOrderType,
  setNewOrderType,
}) => {
  return (
    <>
      {/* Inputs Ocultos de Arquivos */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files, 'media');
        }}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files, 'document');
        }}
      />

      {/* Dialog de Compartilhamento de Pedido/Orçamento (renderizado apenas quando aberto) */}
      {orderPicker.isOrderPickerOpen && (
        <SupportOrderPickerDialog
          customerId={conversation.customerId}
          orders={orderPicker.orders}
          selectedOrderId={orderPicker.selectedOrderId}
          onSelectOrder={orderPicker.handleSelectOrder}
          orderFilter={orderPicker.orderFilter}
          onOrderFilterChange={orderPicker.setOrderFilter}
          isLoading={orderPicker.isLoadingOrders}
          error={orderPicker.ordersError || ''}
          orderFieldError={orderPicker.ordersError}
          isCreatingPdf={orderPicker.isCreatingOrderPdf}
          isQuoteOrder={isQuoteOrder}
          formatMoney={formatBRL}
          formatDate={formatDate}
          onClose={() => {
            orderPicker.setIsOrderPickerOpen(false);
            orderPicker.setSelectedOrderId('');
          }}
          onSubmit={orderPicker.submitOrderDocument}
        />
      )}

      {/* Painel do Catálogo Digital */}
      {isCatalogOpen && (
        <ProductCatalogPanel
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          onSelectProducts={(selection, url) =>
            addCatalogSelection(selection, url, () => setIsCatalogOpen(false))
          }
        />
      )}

      {/* Modal de Criação de Pedido a partir da Conversa */}
      {newOrderType && (
        <NewSaleOrder
          isOpen={Boolean(newOrderType)}
          onClose={() => setNewOrderType(null)}
          defaultCustomer={
            conversation.customerId
              ? { id: conversation.customerId, name: displayName, phone: conversation.contactPhone }
              : undefined
          }
        />
      )}
    </>
  );
};

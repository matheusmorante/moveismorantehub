import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import Order from '@/pages/types/order.type';
import PersonFormModal from '@/pages/App/Registrations/shared/modals/PersonFormModal';
import { useSalesOrderForm } from '../hooks/useSalesOrderForm';
import SalesOrderFormSection from '../components/SalesOrderFormSection';
import SellerSearchModal from '../modals/SellerSearchModal';
import { NewSaleOrderHeader } from './NewSaleOrderHeader';
import {
  applyImportedOrderDataToForm,
  buildPendingCustomerFromImportedJson,
  canShowNewOrderTestMode,
  consumeDuplicateOrderFromSession,
} from './newSaleOrderHelpers';

type NewSaleOrderProps = {
  onClose?: () => void;
  onSaveSuccess?: (orderId?: string, orderData?: Order) => void;
  initialOrder?: Order;
  defaultDeliveryMethod?: 'delivery' | 'pickup';
  defaultOrderType?: Order['orderType'];
  orderType?: Order['orderType'];
};

const NewSaleOrder = ({
  onClose: propOnClose,
  onSaveSuccess = () => {},
  initialOrder,
  defaultDeliveryMethod = 'delivery',
  defaultOrderType,
  orderType: orderTypeProp,
}: NewSaleOrderProps) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const [searchParams] = useSearchParams();
  const { isAdministrator } = useAuth();
  const typeFromQuery = searchParams.get('type') as Order['orderType'] | null;
  const initialType = orderTypeProp || defaultOrderType || typeFromQuery || 'sale';
  const showTestMode = canShowNewOrderTestMode(
    Boolean(isAdministrator),
    initialType,
    initialOrder
  );

  const form = useSalesOrderForm(defaultDeliveryMethod, initialType);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const [isSellerSearchOpen, setIsSellerSearchOpen] = useState(false);
  const [isSellerRegistrationOpen, setIsSellerRegistrationOpen] = useState(false);
  const sellerRef = useRef<HTMLButtonElement>(null);

  const [isCustomerRegistrationOpen, setIsCustomerRegistrationOpen] = useState(false);
  const [pendingCustomerData, setPendingCustomerData] = useState<any>(null);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);

  const isBudget = form.state.currentOrder.orderType === 'budget';
  const isReturn = form.state.currentOrder.orderType === 'return';
  const isPickup = form.state.shipping.deliveryMethod === 'pickup';

  const onClose = useCallback(() => {
    if (propOnClose) {
      propOnClose();
    } else {
      window.history.back();
    }
  }, [propOnClose]);

  const applyOrderData = useCallback(
    (migrated: any) => applyImportedOrderDataToForm(migrated, form.actions),
    [form.actions]
  );

  const handleLoadJSON = useCallback(
    (jsonData: any) => {
      try {
        if (!jsonData || typeof jsonData !== 'object') {
          toast.error('JSON inválido.');
          return false;
        }

        if (jsonData.client) {
          setPendingCustomerData(buildPendingCustomerFromImportedJson(jsonData.client));
          setPendingOrderData(jsonData);
          setIsCustomerRegistrationOpen(true);
          return true;
        }

        applyOrderData(jsonData);
        toast.success('Pedido preenchido com sucesso via JSON!');
        return true;
      } catch (err: any) {
        toast.error('Erro ao carregar JSON: ' + err.message);
        return false;
      }
    },
    [applyOrderData]
  );

  const loadedInitialRef = useRef(false);
  useEffect(() => {
    if (loadedInitialRef.current) return;
    if (initialOrder) {
      loadedInitialRef.current = true;
      form.actions.loadOrderForEditing(initialOrder);
    } else if (searchParams.get('duplicate') === 'true') {
      const duplicatedOrder = consumeDuplicateOrderFromSession();
      if (duplicatedOrder) {
        loadedInitialRef.current = true;
        form.actions.loadOrderForEditing(duplicatedOrder);
      }
    }
  }, [initialOrder, searchParams, form.actions]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => setIsScrolled(el.scrollTop > 50);
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSave = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) e.preventDefault();
      const result = await form.actions.handleSaveOrder(e);
      if (result) {
        const savedId = typeof result === 'string' ? result : (result as any)?.id;
        const completedOrder =
          typeof result === 'object' && result !== null
            ? result
            : { ...form.state.currentOrder, id: savedId };
        onSaveSuccess(savedId, completedOrder);
        onClose();
      }
      return result;
    },
    [form.actions, form.state.currentOrder, onSaveSuccess, onClose]
  );

  const handleComplete = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) e.preventDefault();
      const result = await form.actions.handleCompleteOrder(e);
      if (result) {
        const savedId = typeof result === 'string' ? result : (result as any)?.id;
        const completedOrder =
          typeof result === 'object' && result !== null
            ? result
            : {
                ...form.state.currentOrder,
                id: savedId,
                status: form.state.currentOrder.orderType === 'budget' ? 'quoted' : 'scheduled',
              };
        onSaveSuccess(savedId, completedOrder);
        onClose();
      }
      return result;
    },
    [form.actions, form.state.currentOrder, onSaveSuccess, onClose]
  );

  return (
    <div
      className="fixed inset-0 z-[999999] w-screen h-screen flex flex-col bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-900 w-full h-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {form.state.isSaving && (
          <div
            className="absolute inset-0 z-[120] flex flex-col items-center justify-center gap-3 bg-slate-950/30 backdrop-blur-[1px]"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-800 shadow-2xl dark:bg-slate-900 dark:text-white">
              <i className="bi bi-arrow-repeat animate-spin text-lg text-emerald-600" />
              Salvando pedido com segurança…
            </div>
            <span className="text-xs font-bold text-white">
              O formulário permanecerá aberto até a confirmação.
            </span>
          </div>
        )}

        <NewSaleOrderHeader
          isScrolled={isScrolled}
          isBudget={isBudget}
          isReturn={isReturn}
          isPickup={isPickup}
          orderIndex={form.state.orderIndex}
          isGeneratingCode={form.state.isGeneratingCode}
          currentStep={form.state.currentStep}
          jumpToStep={form.actions.jumpToStep}
          errors={form.state.errors}
          onClose={onClose}
        />

        {isSellerSearchOpen && (
          <SellerSearchModal
            anchorRef={sellerRef}
            onSelect={(name) => form.actions.setSeller(name)}
            onClose={() => setIsSellerSearchOpen(false)}
            onAddNew={() => {
              setIsSellerSearchOpen(false);
              setIsSellerRegistrationOpen(true);
            }}
          />
        )}

        <PersonFormModal
          isOpen={isSellerRegistrationOpen}
          onClose={() => setIsSellerRegistrationOpen(false)}
          collectionName="employees"
          title="Vendedor"
          onSuccess={(newSeller) => {
            form.actions.setSeller(newSeller.nickname || newSeller.fullName);
            setIsSellerRegistrationOpen(false);
          }}
        />

        <PersonFormModal
          isOpen={isCustomerRegistrationOpen}
          onClose={() => setIsCustomerRegistrationOpen(false)}
          collectionName="customers"
          title="Cliente"
          person={pendingCustomerData}
          onSuccess={(person) => {
            form.actions.setCustomerData({
              id: person.id,
              fullName: person.fullName || person.tradeName || '',
              phone: person.phone || '',
              noPhone: person.noPhone || false,
              fullAddress: person.fullAddress || {
                cep: '',
                street: '',
                number: '',
                complement: '',
                neighborhood: '',
                city: '',
                observation: '',
              },
              additionalContacts: person.additionalContacts || [],
            });
            if (person.marketingOrigin) {
              form.actions.setMarketingOrigin(person.marketingOrigin);
            }
            setIsCustomerRegistrationOpen(false);
            if (pendingOrderData) {
              applyOrderData(pendingOrderData);
            }
            toast.success('Cliente cadastrado e pedido preenchido com sucesso via JSON!');
          }}
        />

        <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900">
          <SalesOrderFormSection
            scrollRef={scrollContainerRef}
            form={{
              ...form,
              actions: {
                ...form.actions,
                handleSaveOrder: handleSave,
                handleCompleteOrder: handleComplete,
              },
            }}
            onLoadJSON={handleLoadJSON}
            onOpenSellerSearch={() => setIsSellerSearchOpen(true)}
            sellerRef={sellerRef}
            showTestMode={showTestMode}
          />
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          `,
        }}
      />
    </div>
  );
};

export default NewSaleOrder;

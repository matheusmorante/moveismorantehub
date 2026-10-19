import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'react-toastify';
import CustomerData from '@/pages/types/customerData.type';
import Item from '@/pages/types/items.type';
import Order from '@/pages/types/order.type';
import Shipping from '@/pages/types/Shipping.type';
import { calcItemsSummary } from '@/pages/utils/calculations';
import { saveOrder } from '@/pages/utils/orderHistoryService';
import CustomerSearchModal from './CustomerSearchModal';
import ReturnCollectionSection from '../OrderActions/ReturnCollectionSection';
import ReturnOrderFormBase from '../components/ReturnOrderFormBase';
import ReturnOrderFormFooter from '../components/ReturnOrderFormFooter';
import PersonFormModal from '@/pages/App/Registrations/shared/modals/PersonFormModal';
import ReturnItemsTable from '../components/ReturnItemsTable';
import ReturnFormTabs, { ReturnFormTab } from '../components/ReturnFormTabs';
import { canSearchCustomers } from '@/pages/utils/customerSearch';
import { unlinkedReturnFormSchema } from '../../../../../../shared-utils/returnFormSchemas';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';

type Props = { onClose: () => void; onSaveSuccess: (id?: string, order?: Order) => void };
const EMPTY_SCHEDULING: Shipping['scheduling'] = {
  dateType: 'fixed',
  date: '',
  endDate: '',
  time: '',
  type: 'fixed',
  startTime: '',
  endTime: '',
  notInformed: false,
};
const EMPTY_CUSTOMER: CustomerData = {
  fullName: '',
  phone: '',
  noPhone: false,
  fullAddress: {
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    observation: '',
  },
};
const EMPTY_ITEM: Item = {
  description: '',
  quantity: 1,
  unitPrice: 0,
  unitDiscount: 0,
  discountType: 'fixed',
  handlingType: '',
};

const UnlinkedReturnOrderModal = ({ onClose, onSaveSuccess }: Props) => {
  const [customer, setCustomer] = useState<CustomerData>(EMPTY_CUSTOMER);
  const [items, setItems] = useState<Item[]>([{ ...EMPTY_ITEM }]);
  const [collectAtAddress, setCollectAtAddress] = useState(false);
  const [scheduling, setScheduling] = useState<Shipping['scheduling']>(EMPTY_SCHEDULING);
  const [observations, setObservations] = useState<string[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [returnPaymentMethod, setReturnPaymentMethod] = useState('');
  const [activeTab, setActiveTab] = useState<ReturnFormTab>('customer');
  const itemsSummary = calcItemsSummary(items);
  const total = itemsSummary.itemsTotalValue;
  const form = useZodForm(unlinkedReturnFormSchema, { customer: { ...customer }, items, returnPaymentMethod, collectAtAddress, scheduling, observations });

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const saveReturn = async () => {
    const validItems = items.filter((item) => item.description.trim() || item.productId);
    await form.validateAndRun({ customer: { ...customer }, items: validItems, returnPaymentMethod, collectAtAddress,
      scheduling: collectAtAddress ? scheduling : { ...EMPTY_SCHEDULING, notInformed: true }, observations }, async (validatedValues) => {
      const populatedItems = (validatedValues.items as Item[]).map((item) => ({
        ...item,
        returnedQuantity: item.quantity,
        returnedUnitPrice: item.unitPrice,
        returnedTotalValue: item.quantity * item.unitPrice,
        originalUnitPrice: item.unitPrice,
        originalTotalValue: item.quantity * item.unitPrice,
      }));
      const summary = calcItemsSummary(populatedItems);
      const order: Order = {
        orderType: 'return',
        returnMethod: validatedValues.collectAtAddress ? 'store_collection' : 'store_delivery',
        status: 'scheduled',
        customerData: validatedValues.customer as CustomerData,
        items: populatedItems,
        seller: '',
        date: new Date().toISOString(),
        returnedTotalAmount: summary.itemsTotalValue,
        originalSoldTotal: summary.itemsTotalValue,
        returnKind: 'complete',
        returnPaymentMethod: validatedValues.returnPaymentMethod,
        observation: validatedValues.observations.join('\n'),
        collectionObservation: validatedValues.collectAtAddress ? validatedValues.observations.join('\n') : undefined,
        itemsSummary: summary,
        payments: [],
        paymentsSummary: {
          totalPaymentsFee: 0,
          totalOrderValue: summary.itemsTotalValue,
          totalPaid: 0,
          totalAmountPaid: 0,
          amountRemaining: 0,
        },
        shipping: {
          value: 0,
          deliveryMethod: validatedValues.collectAtAddress ? 'delivery' : 'pickup',
          orderType: 'Standard',
          scheduling: validatedValues.scheduling,
        },
        returnStockProcessed: false,
      };
      setSubmitting(true);
      try {
        const id = await saveOrder(order);
        toast.success('Pedido de devolução gerado com sucesso!');
        onSaveSuccess(id, { ...order, id });
        onClose();
      } catch (error) {
        console.error('Erro ao salvar devolução:', error);
        toast.error('Erro ao processar devolução.');
      } finally {
        setSubmitting(false);
      }
    }, (errors) => toast.warning(Object.values(flattenFormErrors(errors))[0]));
  };

  return (
    <ReturnOrderFormBase
      title="Gerar pedido de devolução avulsa"
      onClose={onClose}
      footer={
        <ReturnOrderFormFooter
          total={total}
          itemCount={items.length}
          relationshipLabel="Sem vínculo com venda"
          submitLabel="Gerar pedido de devolução avulsa"
          submitStatusLabel={submitting ? 'Processando...' : undefined}
          disabled={submitting || !items.length}
          submitting={submitting}
          onClose={onClose}
          onSubmit={saveReturn}
        />
      }
      overlays={
        <>
          {customerSearchOpen && (
            <CustomerSearchModal
              initialSearch={customerSearchTerm}
              onClose={() => setCustomerSearchOpen(false)}
              onSelect={(selected) => {
                setCustomer(selected);
                setCustomerSearchTerm(selected.fullName);
                setCustomerSearchOpen(false);
              }}
              onAddNew={() => {
                setCustomerSearchOpen(false);
                setNewCustomerOpen(true);
              }}
            />
          )}
          <PersonFormModal
            isOpen={newCustomerOpen}
            onClose={() => setNewCustomerOpen(false)}
            collectionName="customers"
            title="Cliente"
            onSuccess={(person) => {
              const selected = {
                id: person.id,
                fullName: person.fullName || person.tradeName || '',
                phone: person.phone || '',
                noPhone: person.noPhone || false,
                fullAddress: person.fullAddress || EMPTY_CUSTOMER.fullAddress,
                additionalContacts: person.additionalContacts || [],
              };
              setCustomer(selected);
              setCustomerSearchTerm(selected.fullName);
              setNewCustomerOpen(false);
            }}
          />
        </>
      }
    >
          <ReturnFormTabs activeTab={activeTab} onChange={setActiveTab} variant="unlinked" />
          {activeTab === 'customer' && <section className="space-y-6">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Cliente *
              </label>
              <button
                type="button"
                onClick={() => setNewCustomerOpen(true)}
                className="text-[10px] font-black uppercase tracking-widest text-blue-600"
              >
                <i className="bi bi-person-plus mr-1" />
                Novo cliente
              </button>
            </div>
            <div className="relative">
              <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={customerSearchTerm}
                onFocus={() => setCustomerSearchOpen(canSearchCustomers(customerSearchTerm))}
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomerSearchTerm(value);
                  setCustomer(EMPTY_CUSTOMER);
                  setCustomerSearchOpen(canSearchCustomers(value));
                }}
                placeholder="Digite ao menos 2 caracteres para buscar"
                className={`w-full rounded-none border-0 border-b-2 bg-slate-50 py-3 pl-11 pr-11 text-sm font-bold outline-none dark:bg-slate-950 ${customer.fullName ? 'border-emerald-500 text-emerald-700 focus:border-emerald-600 dark:text-emerald-400' : 'border-slate-200 text-slate-700 focus:border-blue-500 dark:border-slate-700 dark:text-slate-200'}`}
              />
              {customer.fullName && (
                <Check aria-label="Cliente selecionado" className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-600" />
              )}
            </div>
            <ReturnCollectionSection
              collectAtAddress={collectAtAddress}
              onCollectChange={setCollectAtAddress}
              scheduling={scheduling}
              onSchedulingChange={(key, value) =>
                setScheduling((current) => ({ ...current, [key]: value }))
              }
              observations={observations}
              onObservationsChange={setObservations}
            />
          </section>}
          {activeTab === 'items' && (
            <ReturnItemsTable
              items={items}
              setItems={setItems}
              deliveryMethod={collectAtAddress ? 'delivery' : 'pickup'}
            />
          )}
          {activeTab === 'payment' && (
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">Forma do estorno do pagamento</h3>
                <p className="mt-1 text-xs text-slate-500">Selecione como o valor da devolução será estornado.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {(['Estorno de crédito', 'Pix', 'Dinheiro'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    aria-pressed={returnPaymentMethod === method}
                    onClick={() => setReturnPaymentMethod(method)}
                    className={`min-h-16 rounded-2xl border px-4 py-3 text-sm font-bold transition ${returnPaymentMethod === method ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/15 dark:bg-emerald-950/30 dark:text-emerald-400' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">Valor do estorno: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </section>
          )}
    </ReturnOrderFormBase>
  );
};

export default UnlinkedReturnOrderModal;

import type Order from '@/pages/types/order.type';
import type { useSalesOrderForm } from '../hooks/useSalesOrderForm';
import { getTestArtifactContext } from '../../../../../../shared-utils/testArtifactContext';
import { readTestArtifactIdentity } from '../../../../../../shared-utils/testArtifactPolicy';

type FormActions = ReturnType<typeof useSalesOrderForm>['actions'];

export const canShowNewOrderTestMode = (
  isAdministrator: boolean,
  initialType: Order['orderType'],
  initialOrder?: Order
): boolean => {
  const testContext = getTestArtifactContext();
  const existingTestIdentity = readTestArtifactIdentity(initialOrder);
  return Boolean(
    isAdministrator &&
      testContext &&
      initialType === 'sale' &&
      (!initialOrder || initialOrder.status === 'draft') &&
      (!existingTestIdentity ||
        (existingTestIdentity.runId === testContext.runId &&
          existingTestIdentity.ownerId === testContext.ownerId))
  );
};

export const applyImportedOrderDataToForm = (migrated: any, actions: FormActions): void => {
  if (migrated.seller) actions.setSeller(migrated.seller);
  if (migrated.customerData) actions.setCustomerData(migrated.customerData);
  if (migrated.observation) actions.setObservation(migrated.observation);
  if (migrated.marketingOrigin) actions.setMarketingOrigin(migrated.marketingOrigin);

  if (migrated.shipping) {
    if (
      migrated.shipping.deliveryMethod === 'delivery' ||
      migrated.shipping.deliveryMethod === 'pickup'
    ) {
      actions.setDeliveryMethod(migrated.shipping.deliveryMethod);
    }
    actions.setShipping((prev) => ({
      ...prev,
      ...migrated.shipping,
      deliveryMethod: migrated.shipping.deliveryMethod || prev.deliveryMethod,
      orderType: migrated.shipping.orderType || prev.orderType,
      value: typeof migrated.shipping.value === 'number' ? migrated.shipping.value : prev.value,
      scheduling: migrated.shipping.scheduling
        ? {
            ...migrated.shipping.scheduling,
            notInformed: !!migrated.shipping.scheduling.notInformed,
            dateType: migrated.shipping.scheduling.dateType || 'fixed',
            date: migrated.shipping.scheduling.date || '',
            endDate: migrated.shipping.scheduling.endDate || '',
            type: migrated.shipping.scheduling.type || 'fixed',
            time: migrated.shipping.scheduling.time || '',
            startTime: migrated.shipping.scheduling.startTime || '',
            endTime: migrated.shipping.scheduling.endTime || '',
          }
        : prev.scheduling,
    }));
  }

  if (migrated.items && Array.isArray(migrated.items)) {
    const mappedItems = migrated.items.map((item: any) => ({
      orderItemId: item.orderItemId || crypto.randomUUID(),
      itemType: item.itemType,
      linkedProductOrderItemIds: Array.isArray(item.linkedProductOrderItemIds)
        ? [...item.linkedProductOrderItemIds]
        : undefined,
      linkedProductOrderItemId: item.linkedProductOrderItemId || undefined,
      productId: item.productId || undefined,
      variationId: item.variationId || undefined,
      code: item.code || '',
      description: item.description || '',
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
      quantity: typeof item.quantity === 'number' ? item.quantity : 1,
      costPrice: typeof item.costPrice === 'number' ? item.costPrice : 0,
      condition: item.condition || 'novo',
      handlingType: item.handlingType || '',
      assemblyResponsible: item.assemblyResponsible || '',
    }));
    actions.setItems(mappedItems);
  }

  if (migrated.payments && Array.isArray(migrated.payments)) {
    const mappedPayments = migrated.payments.map((pay: any) => ({
      method: pay.method || '',
      amount: typeof pay.amount === 'number' ? pay.amount : 0,
      status: pay.status || '',
    }));
    actions.setPayments(mappedPayments);
  }
};

export const buildPendingCustomerFromImportedJson = (clientData: any) => ({
  personType: clientData.personType || 'PF',
  fullName: clientData.fullName || '',
  cpfCnpj: clientData.cpfCnpj || '',
  phone: clientData.phone || '',
  email: clientData.email || '',
  noPhone: clientData.noPhone !== undefined ? !!clientData.noPhone : false,
  marketingOrigin: clientData.marketingOrigin || 'organic',
  fullAddress: {
    cep: clientData.fullAddress?.cep || '',
    street: clientData.fullAddress?.street || '',
    number: clientData.fullAddress?.number || '',
    neighborhood: clientData.fullAddress?.neighborhood || '',
    city: clientData.fullAddress?.city || '',
    complement: clientData.fullAddress?.complement || '',
    observation: clientData.fullAddress?.observation || '',
  },
  additionalContacts: clientData.additionalContacts || [],
});

export const consumeDuplicateOrderFromSession = (): Order | null => {
  const dupData = sessionStorage.getItem('pdv_duplicate_order');
  if (!dupData) return null;
  try {
    const parsed = JSON.parse(dupData);
    delete parsed.id;
    delete parsed.orderIndex;
    delete parsed.orderNumber;
    delete parsed.order_index;
    sessionStorage.removeItem('pdv_duplicate_order');
    return parsed as Order;
  } catch (e) {
    console.error('Erro ao carregar pedido duplicado:', e);
    return null;
  }
};

export const getNewOrderHeaderTheme = ({
  isScrolled,
  isBudget,
  isReturn,
  isPickup,
}: {
  isScrolled: boolean;
  isBudget: boolean;
  isReturn: boolean;
  isPickup: boolean;
}) => {
  const containerBg = isScrolled
    ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-md border-slate-200 dark:border-slate-800'
    : isBudget
      ? 'bg-indigo-50/40 border-indigo-100/60 dark:bg-indigo-950/20 dark:border-indigo-900/30'
      : isReturn
        ? 'bg-amber-50/40 border-amber-100/60 dark:bg-amber-950/20 dark:border-amber-900/30'
        : isPickup
          ? 'bg-purple-50/40 border-purple-100/60 dark:bg-purple-950/20 dark:border-purple-900/30'
          : 'bg-emerald-50/40 border-emerald-100/60 dark:bg-emerald-950/20 dark:border-emerald-900/30';

  const iconBadgeBg = isBudget
    ? 'bg-indigo-600 shadow-indigo-500/20'
    : isReturn
      ? 'bg-transparent shadow-none'
      : isPickup
        ? 'bg-purple-600 shadow-purple-500/20'
        : 'bg-emerald-600 shadow-emerald-500/20';

  const iconClass = isBudget
    ? 'bi-calculator-fill'
    : isReturn
      ? 'bi-arrow-return-left'
      : isPickup
        ? 'pickup-parcel'
        : 'delivery-truck';

  const titleColor = isBudget
    ? 'text-indigo-900 dark:text-indigo-100'
    : isReturn
      ? 'text-amber-900 dark:text-amber-100'
      : isPickup
        ? 'text-purple-900 dark:text-purple-100'
        : 'text-emerald-900 dark:text-emerald-100';

  const titleText = isBudget
    ? 'Novo Orçamento'
    : isReturn
      ? 'Nova Devolução avulsa'
      : 'Novo pedido de venda';

  return { containerBg, iconBadgeBg, iconClass, titleColor, titleText };
};

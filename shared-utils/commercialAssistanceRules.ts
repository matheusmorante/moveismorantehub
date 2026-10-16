import type Order from '../erp/src/pages/types/order.type';
import type { CommercialRequiredFields } from './commercialDomainTypes';
import type { ValidationErrors } from './commercialSchedulingRules';

export const validateAssistanceOrder = (
  order: Order,
  requiredFields: CommercialRequiredFields = {}
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (order.status === 'draft') return errors;

  if (!order.customerData?.fullName && requiredFields.assistanceOrder?.customer) {
    errors['customer_fullName'] = 'Nome do cliente é obrigatório.';
  }

  if (
    requiredFields.customer?.phone &&
    (!order.customerData?.phone || !order.customerData.phone.trim())
  ) {
    errors['customer_phone'] = 'Telefone é obrigatório.';
  }

  if (!order.assistanceDescription) {
    errors['assistanceDescription'] = 'Descrição do serviço é obrigatória.';
  }

  if (!order.seller && requiredFields.assistanceOrder?.seller) {
    errors['seller'] = 'Vendedor é obrigatório.';
  }

  if (order.scheduledDate || order.scheduledTime) {
    if (!order.scheduledDate) errors['shipping_date'] = 'Data é obrigatória.';
    if (!order.scheduledTime) errors['shipping_time'] = 'Horário é obrigatório.';
  }

  const hasRegularItems = (order.items || []).some((item) => !!item.productId);
  const hasAssistanceItems = (order.assistanceItems || []).length > 0;
  if (!hasRegularItems && !hasAssistanceItems) {
    errors['items_summary'] =
      'Selecione pelo menos um item do pedido original ou adicione uma peça/serviço avulso.';
  }

  return errors;
};

export const validateReviews = (order: Order): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!order || !order.customerData) return { order: 'Dados insuficientes.' };

  if (!order.customerData.fullName) {
    errors['customer_fullName'] = 'Nome completo é obrigatório para o pedido de avaliação.';
  }
  return errors;
};

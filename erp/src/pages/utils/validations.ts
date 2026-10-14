import type Order from '../types/order.type';
import * as domain from '../../../../shared-utils/commercialOrderRules';
import { getSettings } from './settingsService';
import { validateOrderWithZod } from '../../../../shared-utils/orderDomainValidation';
export { validateItems, validatePayments, validateSeller, validateShipping, validateReviews, type ValidationErrors } from '../../../../shared-utils/commercialOrderRules';
export { validateCustomerData } from './customerShippingValidation';
export const validateOrder = (order: Order) => validateOrderWithZod(order, getSettings().requiredFields);
export const validateBase = (order: Order) => Object.keys(validateOrder(order)).length === 0;
export const validateAssistanceOrder = (order: Order) => domain.validateAssistanceOrder(order, getSettings().requiredFields);
export const isOrderIncomplete = (order: Order) => order?.orderType === 'assistance' || Boolean(order?.assistanceItems?.length)
  ? domain.isOrderIncomplete(order, getSettings().requiredFields) : !validateBase(order);

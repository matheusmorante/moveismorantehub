import { getSettings } from './settingsService';
import { validateOrderWithZod as validateDomainOrder } from '../../../../shared-utils/orderDomainValidation';
export { orderFormSchema, createOrderDomainSchema } from '../../../../shared-utils/orderDomainValidation';
export const validateOrderWithZod = (order: unknown) => validateDomainOrder(order, getSettings().requiredFields);

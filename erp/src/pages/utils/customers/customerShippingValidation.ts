import type CustomerData from '../../types/customerData.type';
import { getSettings } from '../settingsService';
import { validateCustomerData as validateCustomerDomain } from '../../../../../shared-utils/orders/commercialShippingRules';
export { validateShipping, type ValidationErrors } from '../../../../../shared-utils/orders/commercialShippingRules';
export const validateCustomerData = (customer: CustomerData, isPickup = false) =>
  validateCustomerDomain(customer, isPickup, getSettings().requiredFields);

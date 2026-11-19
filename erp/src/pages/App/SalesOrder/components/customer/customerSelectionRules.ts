type CustomerIdentity = {
  id?: string | null;
  fullName?: string | null;
};

export const FINAL_CONSUMER_NAME = 'Consumidor Final';

export const isFinalConsumerSelection = (
  customerData: CustomerIdentity | null | undefined
): boolean =>
  !customerData?.id &&
  customerData?.fullName?.trim().toLowerCase() === FINAL_CONSUMER_NAME.toLowerCase();

export const canCustomerAccessLogistics = (
  customerData: CustomerIdentity | null | undefined
): boolean => Boolean(customerData?.id) || isFinalConsumerSelection(customerData);

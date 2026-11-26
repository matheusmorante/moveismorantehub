import FullAddress from '@/pages/types/fullAddress.type';
import CustomerData from '@/pages/types/customerData.type';

/**
 * Verifica se um endereço possui dados mínimos preenchidos (rua, cidade, cep ou bairro).
 */
export function hasInformedAddress(address?: FullAddress | null): boolean {
  if (!address) return false;
  return Boolean(
    address.street?.trim() ||
    address.city?.trim() ||
    address.cep?.trim() ||
    address.neighborhood?.trim()
  );
}

/**
 * Verifica se o cliente está explicitamente marcado como "Não informar endereço".
 * Suporta tanto o campo top-level `noAddress` quanto a flag legada em `fullAddress.noAddress`.
 */
export function isCustomerNoAddress(customer?: CustomerData | null): boolean {
  if (!customer) return false;
  return Boolean(
    customer.noAddress ||
    (customer.fullAddress as unknown as { noAddress?: boolean } | undefined)?.noAddress
  );
}

/**
 * Determina se o toggle "Usar o mesmo endereço do cliente?" deve ser automaticamente
 * ativado com base no cadastro do cliente.
 */
export function computeCustomerAutoUseCustomerAddress(customer?: CustomerData | null): boolean {
  if (!customer) return false;
  return !isCustomerNoAddress(customer) && hasInformedAddress(customer.fullAddress);
}

/**
 * Resolve o valor inicial de useCustomerAddress ao carregar ou inicializar um pedido.
 * Se houver uma preferência salva (boolean explícito), ela é preservada.
 * Caso contrário, computa a partir do cadastro do cliente ou usa fallback (true).
 */
export function resolveInitialUseCustomerAddress(
  customer?: CustomerData | null,
  explicitSavedPreference?: boolean | null
): boolean {
  if (typeof explicitSavedPreference === 'boolean') {
    return explicitSavedPreference;
  }
  if (customer) {
    return computeCustomerAutoUseCustomerAddress(customer);
  }
  return true;
}

/**
 * Detecta alterações relevantes na vinculação do cliente ou no seu endereço,
 * para fins de sincronização de rota e de useCustomerAddress.
 */
export function detectCustomerLinkingChange(params: {
  nextCustomer: CustomerData;
  currentCustomer: CustomerData;
}): {
  isCustomerLinked: boolean;
  isLinkingCustomer: boolean;
  addressChanged: boolean;
  customerChanged: boolean;
  noAddressChanged: boolean;
} {
  const { nextCustomer, currentCustomer } = params;

  const addressChanged =
    JSON.stringify(nextCustomer.fullAddress || {}) !==
    JSON.stringify(currentCustomer.fullAddress || {});

  const customerChanged =
    nextCustomer.id !== currentCustomer.id ||
    nextCustomer.fullName !== currentCustomer.fullName;

  const noAddressChanged =
    Boolean(isCustomerNoAddress(nextCustomer)) !==
    Boolean(isCustomerNoAddress(currentCustomer));

  const isCustomerLinked = Boolean(nextCustomer.id || nextCustomer.fullName?.trim());

  const isLinkingCustomer = Boolean(
    customerChanged ||
    (isCustomerLinked && (addressChanged || noAddressChanged))
  );

  return {
    isCustomerLinked,
    isLinkingCustomer,
    addressChanged,
    customerChanged,
    noAddressChanged,
  };
}

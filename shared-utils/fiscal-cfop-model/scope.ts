import type { FiscalCfopScope } from './catalog';

export interface FiscalCfopOrderScopeInput {
  issuerUf?: string | null;
  deliveryMethod?: string | null;
  shipping?: Record<string, unknown> | null;
  customerAddress?: unknown;
}

export interface FiscalCfopOrderScope {
  scope: FiscalCfopScope | null;
  destination: '1' | '2' | '3' | null;
  issuerUf: string | null;
  operationUf: string | null;
  locationSource: 'delivery_address' | 'issuer_pickup_location' | 'unknown';
  reason?: string;
}

const BRAZILIAN_UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB',
  'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

export const isBrazilianFiscalUf = (uf: unknown): uf is string =>
  typeof uf === 'string' && BRAZILIAN_UFS.has(uf);

function addressUf(value: unknown): string | null {
  let address = value;
  if (typeof address === 'string') {
    try {
      address = JSON.parse(address) as unknown;
    } catch {
      return null;
    }
  }
  if (!address || typeof address !== 'object') return null;
  const record = address as Record<string, unknown>;
  const rawUf = record.state || record.uf;
  if (typeof rawUf !== 'string') return null;
  const uf = rawUf.trim().toUpperCase();
  return BRAZILIAN_UFS.has(uf) || uf === 'EX' ? uf : null;
}

/**
 * Resolve o escopo geográfico a partir do local físico da operação.
 * Em retirada, o endereço cadastral do cliente não define o escopo: hoje o pedido
 * representa retirada no estabelecimento emitente, salvo se houver pickupAddress explícito.
 */
export function resolveFiscalCfopOrderScope(
  input: FiscalCfopOrderScopeInput
): FiscalCfopOrderScope {
  const issuerUf = typeof input.issuerUf === 'string' ? input.issuerUf.trim().toUpperCase() : '';
  if (!BRAZILIAN_UFS.has(issuerUf)) {
    return {
      scope: null,
      destination: null,
      issuerUf: null,
      operationUf: null,
      locationSource: 'unknown',
      reason: 'UF do estabelecimento emitente ausente ou inválida.',
    };
  }

  const shipping = input.shipping || {};
  const deliveryMethod = input.deliveryMethod || String(shipping.deliveryMethod || '');
  let operationUf: string | null;
  let locationSource: FiscalCfopOrderScope['locationSource'];

  if (deliveryMethod === 'pickup') {
    operationUf = addressUf(shipping.pickupAddress) || issuerUf;
    locationSource = 'issuer_pickup_location';
  } else if (deliveryMethod === 'delivery') {
    const deliveryAddress = shipping.deliveryAddress;
    const usesCustomerAddress = shipping.useCustomerAddress !== false;
    const effectiveAddress = usesCustomerAddress
      ? input.customerAddress || deliveryAddress
      : deliveryAddress;
    operationUf = addressUf(effectiveAddress);
    locationSource = operationUf ? 'delivery_address' : 'unknown';
  } else {
    return {
      scope: null,
      destination: null,
      issuerUf,
      operationUf: null,
      locationSource: 'unknown',
      reason: 'Modalidade de entrega ou retirada ausente ou inválida.',
    };
  }

  if (!operationUf) {
    return {
      scope: null,
      destination: null,
      issuerUf,
      operationUf: null,
      locationSource,
      reason: 'UF do local físico de entrega não informada.',
    };
  }

  if (operationUf === 'EX') {
    return { scope: 'foreign', destination: '3', issuerUf, operationUf, locationSource };
  }

  const scope = operationUf === issuerUf ? 'internal' : 'interstate';
  return {
    scope,
    destination: scope === 'internal' ? '1' : '2',
    issuerUf,
    operationUf,
    locationSource,
  };
}

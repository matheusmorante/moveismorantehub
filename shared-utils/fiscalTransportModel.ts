/**
 * Matriz e Regras de Transporte Fiscal (NF-e 55 e NFC-e 65)
 * Centralização unificada entre Frontend, Backend e XML Serializer.
 */

export type FiscalModel = '55' | '65';
export type DeliveryMethod = 'delivery' | 'pickup';
export type TransportResponsible = 'OWN_COMPANY' | 'CUSTOMER' | 'THIRD_PARTY';
export type FreightContractResponsible = 'SENDER' | 'RECIPIENT' | 'THIRD_PARTY';
export type FreightMode = '0' | '1' | '2' | '3' | '4' | '9';

export interface TransportResolutionInput {
  fiscalModel: FiscalModel;
  deliveryMethod: DeliveryMethod;
  hasTransport?: boolean;
  transportResponsible?: TransportResponsible | 'NONE';
  freightContractResponsible?: FreightContractResponsible;
}

export interface TransportResolution {
  hasTransport: boolean;
  transportResponsible: TransportResponsible | 'NONE';
  freightContractResponsible?: FreightContractResponsible;
  modFrete: FreightMode;
  modFreteDescription: string;
  isEmitterTransporter: boolean;
  requiresTransporterData: boolean;
  allowsEditHasTransport: boolean;
  derivedReason: string;
  statusBadge: string;
  friendlyDescription: string;
}

export function resolveFiscalScopeDeliveryMethod(input: {
  orderDeliveryMethod: DeliveryMethod;
  hasTransport?: boolean;
  transportResponsible?: TransportResponsible;
}): DeliveryMethod {
  if (input.hasTransport === false || input.transportResponsible === 'CUSTOMER') {
    return 'pickup';
  }
  if (input.hasTransport === true) return 'delivery';
  return input.orderDeliveryMethod;
}

export function resolveEffectiveFiscalDeliveryMethod(input: {
  fiscalModel: FiscalModel;
  orderDeliveryMethod: DeliveryMethod;
  hasTransport?: boolean;
  transportResponsible?: TransportResponsible | 'NONE';
}): DeliveryMethod {
  if (input.fiscalModel === '65' && typeof input.hasTransport === 'boolean') {
    return input.hasTransport ? 'delivery' : 'pickup';
  }

  if (input.fiscalModel === '55') {
    if (input.hasTransport === false || input.transportResponsible === 'NONE') return 'pickup';
    if (input.transportResponsible === 'CUSTOMER') return 'pickup';
    if (
      input.transportResponsible === 'OWN_COMPANY' ||
      input.transportResponsible === 'THIRD_PARTY'
    ) {
      return 'delivery';
    }
  }

  return input.orderDeliveryMethod;
}

/**
 * Deriva os valores padrão da MATRIZ PRINCIPAL DO ERP:
 * - 65 + Retirada: OFF (sem ocorrência, modFrete = 9)
 * - 65 + Entrega:  ON  (própria empresa, modFrete = 3)
 * - 55 + Sem transporte: OFF (modFrete = 9); transporte explicitamente atribuído ao cliente usa 4.
 * - 55 + Entrega:  ON  (própria empresa, modFrete = 3)
 */
export function resolveDefaultTransport(
  fiscalModel: FiscalModel,
  deliveryMethod: DeliveryMethod
): {
  hasTransport: boolean;
  transportResponsible: TransportResponsible | 'NONE';
  freightContractResponsible?: FreightContractResponsible;
} {
  if (fiscalModel === '65') {
    if (deliveryMethod === 'pickup') {
      return { hasTransport: false, transportResponsible: 'NONE' };
    }
    return { hasTransport: true, transportResponsible: 'OWN_COMPANY' };
  } else {
    // Modelo 55
    if (deliveryMethod === 'pickup') {
      return { hasTransport: false, transportResponsible: 'NONE' };
    }
    return { hasTransport: true, transportResponsible: 'OWN_COMPANY' };
  }
}

/**
 * Resolução central de transporte e modalidade de frete (modFrete).
 * Impede combinações fiscais inválidas e estados incoerentes.
 *
 * No emissor, deliveryMethod define a modalidade fiscal da NF e deve refletir o que
 * ocorreu (por exemplo, entrega planejada que virou retirada no balcão). A escolha
 * fica registrada no snapshot/XML fiscal e não altera a logística do pedido comercial.
 * O modelo traduz essa modalidade para as regras da SEFAZ:
 * - NFC-e 65 + sem transporte: OFF (modFrete 9).
 * - NF-e 55 + sem transporte: OFF (modFrete 9); se o transporte estiver explicitamente atribuído ao destinatário, usa 4.
 * - Entrega efetiva (55 ou 65): ON (modFrete 3 própria empresa ou 0/1/2 terceirizado).
 * A interface define a modalidade fiscal da NF; não permite editar hasTransport isoladamente.
 */
export function resolveTransport(input: TransportResolutionInput): TransportResolution {
  const { fiscalModel, deliveryMethod } = input;

  // 1. NFC-e 65 + Retirada:
  // Rejeições SEFAZ 753 e 754: fora de entrega em domicílio, modFrete != 9 ou transporta gera rejeição.
  // Bloqueado em OFF com modFrete = 9.
  if (fiscalModel === '65' && deliveryMethod === 'pickup') {
    return {
      hasTransport: false,
      transportResponsible: 'NONE',
      modFrete: '9',
      modFreteDescription: '9 — Sem ocorrência de transporte',
      isEmitterTransporter: false,
      requiresTransporterData: false,
      allowsEditHasTransport: false,
      derivedReason: 'Definido pela modalidade de transporte da NF.',
      statusBadge: '9 — Sem ocorrência de transporte [OFF 🔒]',
      friendlyDescription: 'Sem ocorrência de transporte nesta NFC-e',
    };
  }

  // 2. NF-e 55 + Retirada:
  // Sem transporte usa modFrete = 9; somente transporte explicitamente por conta do cliente usa 4.
  if (fiscalModel === '55' && deliveryMethod === 'pickup') {
    if (input.hasTransport === false || input.transportResponsible !== 'CUSTOMER') {
      return {
        hasTransport: false,
        transportResponsible: 'NONE',
        modFrete: '9',
        modFreteDescription: '9 — Sem ocorrência de transporte',
        isEmitterTransporter: false,
        requiresTransporterData: false,
        allowsEditHasTransport: false,
        derivedReason: 'Definido pela modalidade de transporte da NF.',
        statusBadge: '9 — Sem ocorrência de transporte [OFF 🔒]',
        friendlyDescription: 'Sem ocorrência de transporte nesta NF-e',
      };
    }

    return {
      hasTransport: true,
      transportResponsible: 'CUSTOMER',
      modFrete: '4',
      modFreteDescription: '4 — Transporte próprio por conta do destinatário',
      isEmitterTransporter: false,
      requiresTransporterData: false,
      allowsEditHasTransport: false,
      derivedReason: 'Definido pela modalidade de transporte da NF.',
      statusBadge: '4 — Transporte próprio pelo destinatário [ON 🔒]',
      friendlyDescription: 'Transporte próprio por conta do destinatário nesta NF-e',
    };
  }

  // 3. Pedido com Entrega (tanto modelo 55 quanto 65):
  // Transporte obrigatório (bloqueado em ON, sem permissão para "sem transporte").
  // Na NFC-e 65 ou por padrão na NF-e 55: própria empresa (modFrete = 3).
  // Na NF-e 55: pode ser terceiro contratado (modFrete 0, 1 ou 2).
  const responsible: TransportResponsible =
    input.transportResponsible === 'THIRD_PARTY' ? 'THIRD_PARTY' : 'OWN_COMPANY';

  if (responsible === 'THIRD_PARTY') {
    const contract: FreightContractResponsible = input.freightContractResponsible || 'SENDER';
    let modFrete: FreightMode = '0';
    let modDesc = '0 — Contratação do frete por conta do remetente (CIF)';

    if (contract === 'RECIPIENT') {
      modFrete = '1';
      modDesc = '1 — Contratação do frete por conta do destinatário (FOB)';
    } else if (contract === 'THIRD_PARTY') {
      modFrete = '2';
      modDesc = '2 — Contratação do frete por conta de terceiros';
    }

    return {
      hasTransport: true,
      transportResponsible: 'THIRD_PARTY',
      freightContractResponsible: contract,
      modFrete,
      modFreteDescription: modDesc,
      isEmitterTransporter: false,
      requiresTransporterData: true,
      allowsEditHasTransport: false,
      derivedReason: 'Definido automaticamente: pedido com entrega.',
      statusBadge: `Transporte ${modFrete} — Transportador terceirizado [ON 🔒]`,
      friendlyDescription: 'Transportador terceirizado — definido pelo pedido com entrega',
    };
  }

  // Própria empresa: modFrete = 3
  return {
    hasTransport: true,
    transportResponsible: 'OWN_COMPANY',
    modFrete: '3',
    modFreteDescription: '3 — Transporte próprio por conta do remetente',
    isEmitterTransporter: true,
    requiresTransporterData: false,
    allowsEditHasTransport: false,
    derivedReason: 'Definido automaticamente: pedido com entrega.',
    statusBadge: '3 — Entrega pela própria empresa [ON 🔒]',
    friendlyDescription: 'Entrega pela própria empresa — definido pelo pedido com entrega',
  };
}

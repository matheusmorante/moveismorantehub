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

/**
 * Deriva os valores padrão da MATRIZ PRINCIPAL DO ERP:
 * - 65 + Retirada: OFF (sem ocorrência, modFrete = 9)
 * - 65 + Entrega:  ON  (própria empresa, modFrete = 3)
 * - 55 + Retirada: ON  (próprio cliente, modFrete = 4)
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
      return { hasTransport: true, transportResponsible: 'CUSTOMER' };
    }
    return { hasTransport: true, transportResponsible: 'OWN_COMPANY' };
  }
}

/**
 * Resolução central de transporte e modalidade de frete (modFrete).
 * Impede combinações fiscais inválidas e estados incoerentes.
 *
 * REGRA INVIOLÁVEL: O pedido comercial é a fonte primária da operação.
 * O modal fiscal e o backend traduzem a realidade do pedido para as regras da SEFAZ,
 * impedindo o operador de contradizer o fato comercial:
 * - NFC-e 65 + Retirada: OFF (modFrete 9), toggle desligado e bloqueado [OFF 🔒].
 * - NF-e 55 + Retirada:  ON  (modFrete 4, cliente retira), toggle ligado e bloqueado [ON 🔒].
 * - Entrega (55 ou 65):  ON  (modFrete 3 própria empresa ou 0/1/2 terceirizado), toggle ligado e bloqueado [ON 🔒].
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
      derivedReason: 'Definido automaticamente: pedido para retirada.',
      statusBadge: '9 — Sem ocorrência de transporte [OFF 🔒]',
      friendlyDescription: 'Sem ocorrência de transporte — definido pelo pedido de retirada',
    };
  }

  // 2. NF-e 55 + Retirada:
  // Retirada presencial pelo próprio cliente (destinatário): modFrete = 4.
  // Bloqueado em ON com modFrete = 4 (sem permissão de desligar).
  if (fiscalModel === '55' && deliveryMethod === 'pickup') {
    return {
      hasTransport: true,
      transportResponsible: 'CUSTOMER',
      modFrete: '4',
      modFreteDescription: '4 — Transporte próprio por conta do destinatário',
      isEmitterTransporter: false,
      requiresTransporterData: false,
      allowsEditHasTransport: false,
      derivedReason: 'Definido automaticamente: pedido para retirada.',
      statusBadge: '4 — Transporte próprio pelo destinatário [ON 🔒]',
      friendlyDescription: 'Transporte próprio pelo destinatário — definido pelo pedido de retirada',
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

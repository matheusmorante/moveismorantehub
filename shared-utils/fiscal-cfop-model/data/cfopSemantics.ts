import type { FiscalCfopSemantics } from '../types';

/**
 * Mapa de classificação semântica dos CFOPs.
 * Define explicitamente a natureza da operação (operationType) e origem da mercadoria (merchandiseOrigin),
 * desvinculando o negócio da mera inferência por prefixo de código numérico.
 */
export const CFOP_SEMANTICS: Readonly<Record<string, FiscalCfopSemantics>> = {
  // --- Saídas Internas (5.xxx) ---
  '5102': { operationType: 'sale', merchandiseOrigin: 'third_party' },
  '5101': { operationType: 'sale', merchandiseOrigin: 'own_production' },
  '5405': { operationType: 'sale', merchandiseOrigin: 'third_party' },
  '5403': { operationType: 'sale', merchandiseOrigin: 'third_party' },
  '5104': { operationType: 'sale_outside_establishment', merchandiseOrigin: 'third_party' },
  '5152': { operationType: 'transfer', merchandiseOrigin: 'third_party' },
  '5202': { operationType: 'supplier_return', merchandiseOrigin: 'third_party' },
  '5411': { operationType: 'supplier_return', merchandiseOrigin: 'third_party' },
  '5910': { operationType: 'bonus_donation_gift', merchandiseOrigin: 'not_applicable' },
  '5912': { operationType: 'shipment', merchandiseOrigin: 'not_applicable' },
  '5914': { operationType: 'shipment', merchandiseOrigin: 'not_applicable' },
  '5915': { operationType: 'shipment', merchandiseOrigin: 'not_applicable' },
  '5949': { operationType: 'other', merchandiseOrigin: 'not_applicable' },
  '5933': { operationType: 'service', merchandiseOrigin: 'not_applicable' },

  // --- Saídas Interestaduais (6.xxx) ---
  '6102': { operationType: 'sale', merchandiseOrigin: 'third_party' },
  '6101': { operationType: 'sale', merchandiseOrigin: 'own_production' },
  '6108': { operationType: 'sale_to_non_taxpayer', merchandiseOrigin: 'third_party' },
  '6107': { operationType: 'sale_to_non_taxpayer', merchandiseOrigin: 'own_production' },
  '6404': { operationType: 'sale', merchandiseOrigin: 'third_party' },
  '6403': { operationType: 'sale', merchandiseOrigin: 'third_party' },
  '6152': { operationType: 'transfer', merchandiseOrigin: 'third_party' },
  '6202': { operationType: 'supplier_return', merchandiseOrigin: 'third_party' },
  '6411': { operationType: 'supplier_return', merchandiseOrigin: 'third_party' },
  '6910': { operationType: 'bonus_donation_gift', merchandiseOrigin: 'not_applicable' },
  '6912': { operationType: 'shipment', merchandiseOrigin: 'not_applicable' },
  '6914': { operationType: 'shipment', merchandiseOrigin: 'not_applicable' },
  '6915': { operationType: 'shipment', merchandiseOrigin: 'not_applicable' },
  '6949': { operationType: 'other', merchandiseOrigin: 'not_applicable' },
  '6933': { operationType: 'service', merchandiseOrigin: 'not_applicable' },

  // --- Entradas Internas (1.xxx) ---
  '1202': { operationType: 'customer_return', merchandiseOrigin: 'third_party' },
  '1201': { operationType: 'customer_return', merchandiseOrigin: 'own_production' },
  '1411': { operationType: 'customer_return', merchandiseOrigin: 'third_party' },
  '1949': { operationType: 'other', merchandiseOrigin: 'not_applicable' },

  // --- Entradas Interestaduais (2.xxx) ---
  '2202': { operationType: 'customer_return', merchandiseOrigin: 'third_party' },
  '2201': { operationType: 'customer_return', merchandiseOrigin: 'own_production' },
  '2411': { operationType: 'customer_return', merchandiseOrigin: 'third_party' },
  '2949': { operationType: 'other', merchandiseOrigin: 'not_applicable' },
};

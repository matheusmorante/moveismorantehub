import type Order from '@/pages/types/order.type';
import { escapeXml } from './xmlEmitterBlock';
import {
  getFiscalRecipientAddress,
  fiscalPresence,
  decideFiscalRecipientRequirements,
} from '../../../../../../shared-utils/fiscalDocumentModel';
import {
  isValidRecipientTaxId,
  normalizeRecipientTaxId,
  recipientTaxIdMatchesPersonType,
} from '../../../../../../shared-utils/recipientTaxId';

/** Compatibility builder; live emission uses the backend Fiscal Core serializer. */
export function buildDestXml(
  order: Order,
  isHomologacao: boolean,
  model: '55' | '65' = '55'
): string {
  const customer = order.customerData;
  const doc = normalizeRecipientTaxId(customer?.cpfCnpj || customer?.document || '');
  const presence = fiscalPresence(
    model,
    order.shipping?.deliveryMethod,
    order.fiscalContext?.presence
  );
  const requirements = decideFiscalRecipientRequirements({
    model,
    presence,
    total: order.paymentsSummary?.totalOrderValue || 0,
    personType: customer?.personType,
    recipientTaxId: doc,
    operationScope: 'NORMAL_DOMESTIC_SALE',
  });
  if (!requirements.supported)
    throw new Error(requirements.message || 'Operação exige matriz fiscal própria.');
  if (requirements.documentRequired && !doc)
    throw new Error(requirements.message || 'Documento do destinatário obrigatório.');
  if (
    doc &&
    (!isValidRecipientTaxId(doc) ||
      !recipientTaxIdMatchesPersonType(doc, customer?.personType))
  )
    throw new Error('CPF/CNPJ do destinatário inválido ou incompatível com PF/PJ.');
  if (!doc && model === '65') return '';
  if (!doc && !requirements.addressRequired) return '';
  const address = getFiscalRecipientAddress(order);
  const value = (raw: unknown, label: string) => {
    if (!String(raw || '').trim()) throw new Error(label + ' do destinatário ausente.');
    return escapeXml(String(raw));
  };
  const cep = String(address.zipCode || address.postalCode || address.cep || '').replace(/\D/g, '');
  if (cep && !/^\d{8}$/.test(cep)) throw new Error('CEP do destinatário inválido.');
  const addressXml = requirements.addressRequired
    ? '<enderDest><xLgr>' +
      value(address.street, 'Logradouro') +
      '</xLgr>' +
      '<nro>' +
      value(address.number, 'Número') +
      '</nro><xBairro>' +
      value(address.neighborhood || address.bairro, 'Bairro') +
      '</xBairro>' +
      '<cMun>' +
      value(address.cityCode || address.cMun, 'IBGE') +
      '</cMun><xMun>' +
      value(address.city, 'Município') +
      '</xMun>' +
      '<UF>' +
      value(address.state || address.uf, 'UF') +
      '</UF>' +
      (cep ? '<CEP>' + cep + '</CEP>' : '') +
      '<cPais>1058</cPais><xPais>BRASIL</xPais></enderDest>'
    : '';
  const name = isHomologacao
    ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
    : customer?.fullName || 'CONSUMIDOR FINAL';
  const indicator = order.fiscalContext?.recipientIeIndicator || '9';
  if (indicator !== '9')
    throw new Error('Condição de contribuinte exige o serializer fiscal do backend.');
  const documentTag = doc.length === 11 ? 'CPF' : 'CNPJ';
  return (
    '<dest>' +
    (doc ? '<' + documentTag + '>' + doc + '</' + documentTag + '>' : '') +
    '<xNome>' +
    escapeXml(name) +
    '</xNome>' +
    addressXml +
    '<indIEDest>9</indIEDest></dest>'
  );
}

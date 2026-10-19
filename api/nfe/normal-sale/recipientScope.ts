import {
  decideFiscalRecipientRequirements,
  fiscalPresence,
  getFiscalRecipientAddress,
} from '../../../shared-utils/fiscalDocumentModel';
import type { DeliveryMethod } from '../../../shared-utils/fiscalTransportModel';
import {
  getRecipientIeIndicatorConsistencyError,
  resolveEffectiveRecipientIeIndicator,
} from '../../../shared-utils/recipientIeIndicator';
import {
  isValidRecipientTaxId,
  normalizeRecipientTaxId,
  recipientTaxIdMatchesPersonType,
} from '../../../shared-utils/recipientTaxId';
import type { FiscalAddress, FiscalSnapshotCandidate } from '../fiscalSnapshot';
import { municipalityCode } from './municipality';
import { obj, required } from './values';

export function resolveNormalSaleCustomer(
  orderData: Record<string, any>,
  inputs: Record<string, any>
) {
  const savedCustomer = orderData.customerData ? obj(orderData.customerData) : {};
  const catalogCustomer = inputs.customer ? obj(inputs.customer) : {};
  return {
    ...catalogCustomer,
    fullName: savedCustomer.fullName ?? savedCustomer.name ?? catalogCustomer.fullName,
    cpfCnpj: savedCustomer.cpfCnpj ?? catalogCustomer.cpfCnpj,
    address: savedCustomer.fullAddress ?? catalogCustomer.address,
    ie: savedCustomer.ie ?? catalogCustomer.ie,
    ieIndicator: savedCustomer.ieIndicator ?? catalogCustomer.ieIndicator,
    personType: savedCustomer.personType ?? catalogCustomer.personType,
  };
}

export function resolveRecipientIeContext(
  facts: FiscalSnapshotCandidate,
  customer: Record<string, any>,
  contextData: Record<string, any>
) {
  const ieIndicator = resolveEffectiveRecipientIeIndicator({
    selected: facts.emissionRequest.recipientIeIndicator,
    persisted: contextData.recipientIeIndicator,
    customer: customer.ieIndicator,
    ie: facts.emissionRequest.recipientIe ?? customer.ie,
  });
  const recipientIe = String(facts.emissionRequest.recipientIe ?? customer.ie ?? '');
  return { ieIndicator, recipientIe };
}

export async function resolveNormalSaleRecipientAddress(params: {
  address: Record<string, any>;
  requirements: { addressRequired: boolean };
  issuerProfile: Record<string, any>;
}): Promise<{ recipientAddress?: FiscalAddress; municipalityCode: string }> {
  const { address, requirements, issuerProfile } = params;
  const city = requirements.addressRequired
    ? required(address.city, 'Município real do destinatário')
    : '';
  const issuerUf = String(issuerProfile.companyUF || '').toUpperCase();
  const uf = requirements.addressRequired
    ? required(address.state || address.uf, 'UF real do destinatário').toUpperCase()
    : issuerUf;

  const code = requirements.addressRequired
    ? await municipalityCode(
        city,
        uf,
        (address.cityCode || address.ibge || address.municipalityCode) as string | undefined
      )
    : String(issuerProfile.companyCMun || '');

  const recipientAddress: FiscalAddress | undefined = requirements.addressRequired
    ? {
        street: required(address.street, 'Logradouro real'),
        number: required(String(address.number || ''), 'Número real'),
        district: required(address.neighborhood || address.bairro, 'Bairro real'),
        municipality: city,
        municipalityCode: code,
        uf,
        postalCode: String(address.zipCode || address.cep || address.postalCode || '').replace(
          /[-.]/g,
          ''
        ),
      }
    : undefined;

  if (recipientAddress?.postalCode && !/^\d{8}$/.test(recipientAddress.postalCode)) {
    throw new Error('CEP real inválido.');
  }

  return { recipientAddress, municipalityCode: code };
}

export function validateNormalSaleRecipientRequirements(params: {
  requirements: ReturnType<typeof decideFiscalRecipientRequirements>;
  model: string;
  cpfCnpj: string;
  personType?: 'PF' | 'PJ';
  ieIndicator: string;
  recipientIe: string;
  finalConsumer: boolean;
  facts: FiscalSnapshotCandidate;
  shippingData: Record<string, any>;
  operationDestination?: string | null;
}): void {
  const {
    requirements,
    model,
    cpfCnpj,
    personType,
    ieIndicator,
    recipientIe,
    finalConsumer,
    facts,
    shippingData,
    operationDestination,
  } = params;

  if (!requirements.supported) {
    throw new Error(requirements.message || 'Matriz fiscal não aplicável.');
  }

  if (operationDestination === '2' && model === '65') {
    throw new Error('NFC-e não permite operação interestadual; utilize NF-e modelo 55.');
  }

  if (requirements.documentRequired && !cpfCnpj) {
    throw new Error(
      `${requirements.documentType} do destinatário é obrigatório para esta operação fiscal.`
    );
  }

  if (cpfCnpj && !isValidRecipientTaxId(cpfCnpj)) {
    throw new Error('CPF/CNPJ do destinatário inválido para esta operação fiscal.');
  }

  if (cpfCnpj && !recipientTaxIdMatchesPersonType(cpfCnpj, personType)) {
    throw new Error(`CPF/CNPJ do destinatário inválido para o tipo ${personType}.`);
  }

  const ieConsistencyError = getRecipientIeIndicatorConsistencyError(
    ieIndicator, recipientIe, model === '55' ? finalConsumer : undefined
  );
  if (ieConsistencyError) {
    throw new Error(ieConsistencyError);
  }

  if (model === '65' && ieIndicator !== '9') {
    throw new Error(
      'NFC-e exige destinatário não contribuinte; revise a condição fiscal da operação.'
    );
  }

  const effectiveTransporter = facts.emissionRequest.transporter || shippingData.transporter;
  if (facts.emissionRequest.transportResponsible === 'THIRD_PARTY' && !effectiveTransporter) {
    throw new Error('Identifique o transportador terceirizado.');
  }
}

import { composeServiceFiscalValues } from '../../erp/src/pages/utils/nfe/serviceFiscalComposition';
import { resolveFiscalCfopOrderScope } from '../../shared-utils/fiscalCfopModel';
import {
  decideFiscalRecipientRequirements,
  fiscalPresence,
  getFiscalRecipientAddress,
  resolveOrderFiscalModel,
} from '../../shared-utils/fiscalDocumentModel';
import { parseFiscalItemSelections } from '../../shared-utils/fiscalItemSelections';
import {
  type DeliveryMethod,
  resolveTransport,
  type TransportResponsible,
} from '../../shared-utils/fiscalTransportModel';
import {
  getRecipientIeIndicatorConsistencyError,
  resolveEffectiveRecipientIeIndicator,
} from '../../shared-utils/recipientIeIndicator';
import {
  isValidRecipientTaxId,
  normalizeRecipientTaxId,
  recipientTaxIdMatchesPersonType,
} from '../../shared-utils/recipientTaxId';
import type { ApprovedFiscalRuleSet } from './fiscalCore';
import type { FiscalAddress, FiscalDocument, FiscalSnapshotCandidate } from './fiscalSnapshot';
import {
  hasApprovedInterstateOutboundRoute,
  type InterstateOutboundFiscalMatrixFacts,
  type InterstateRecipientIeStatus,
  resolveInterstateOutboundFiscalMatrix,
} from './interstateOutboundFiscalMatrix';
import { NORMAL_SALE_RULESET_VERSION } from './normal-sale/constants';
import { determineNormalSaleItems } from './normal-sale/items';
import { municipalityCode } from './normal-sale/municipality';
import { resolveNormalSalePayments } from './normal-sale/payments';
import { money, obj, required } from './normal-sale/values';
import { resolveNormalSaleContribution } from './simplesNormalSaleContribution';

export { loadNormalSaleInputs } from './normal-sale/inputLoader';
export { NORMAL_SALE_RULESET_VERSION };

export async function createNormalSaleRuleSet(
  facts: FiscalSnapshotCandidate,
  ruleSetVersion = NORMAL_SALE_RULESET_VERSION
): Promise<ApprovedFiscalRuleSet> {
  const environment = facts.emissionRequest.environment;
  if (environment !== 1 && environment !== 2) throw new Error('Ambiente fiscal inválido.');
  const inputs = obj(facts.fiscalInputs);
  const orderData = facts.order.data;
  const savedCustomer = obj(orderData.customerData);
  const catalogCustomer = obj(inputs.customer);
  const customer = {
    ...catalogCustomer,
    fullName: savedCustomer.fullName ?? savedCustomer.name ?? catalogCustomer.fullName,
    cpfCnpj: savedCustomer.cpfCnpj ?? catalogCustomer.cpfCnpj,
    address: savedCustomer.fullAddress ?? catalogCustomer.address,
    ie: savedCustomer.ie ?? catalogCustomer.ie,
    ieIndicator: savedCustomer.ieIndicator ?? catalogCustomer.ieIndicator,
    personType: savedCustomer.personType ?? catalogCustomer.personType,
  };
  const contextData = orderData.fiscalContext ? obj(orderData.fiscalContext) : {};
  const shippingData = orderData.shipping ? obj(orderData.shipping) : {};
  const ieIndicator = resolveEffectiveRecipientIeIndicator({
    selected: facts.emissionRequest.recipientIeIndicator,
    persisted: contextData.recipientIeIndicator,
    customer: customer.ieIndicator,
    ie: facts.emissionRequest.recipientIe ?? customer.ie,
  });
  const recipientIe = String(facts.emissionRequest.recipientIe ?? customer.ie ?? '');
  if (!['delivery', 'pickup'].includes(String(shippingData.deliveryMethod || '')))
    throw new Error(
      'Modalidade atual do pedido ausente ou inválida; confirme entrega ou retirada.'
    );
  const address = getFiscalRecipientAddress({
    ...orderData,
    customerData: { ...obj(orderData.customerData || {}), fullAddress: customer.address },
  });
  const operationScope = resolveFiscalCfopOrderScope({
    issuerUf: String(facts.issuerProfile.companyUF || ''),
    deliveryMethod: String(shippingData.deliveryMethod || ''),
    shipping: shippingData,
    customerAddress: customer.address,
  });
  if (operationScope.destination === null)
    throw new Error(operationScope.reason || 'Local físico da operação fiscal não identificado.');
  if (operationScope.scope === 'foreign')
    throw new Error('Operação com exterior exige matriz fiscal específica aprovada.');

  let finalConsumer = facts.emissionRequest.finalConsumer;
  if (operationScope.scope === 'interstate') {
    const acquisitionPurpose = contextData.acquisitionPurpose;
    if (
      acquisitionPurpose !== 'resale' &&
      acquisitionPurpose !== 'use_consumption' &&
      acquisitionPurpose !== 'fixed_asset'
    ) {
      throw new Error(
        'ACQUISITION_PURPOSE_REQUIRED: registre no pedido se a compra é para revenda, uso/consumo ou ativo imobilizado.'
      );
    }
    finalConsumer = acquisitionPurpose !== 'resale';
    if (facts.emissionRequest.finalConsumer !== finalConsumer) {
      throw new Error(
        'ACQUISITION_PURPOSE_MISMATCH: o indFinal enviado não corresponde à finalidade persistida no pedido.'
      );
    }
  }

  const initialComposition = composeServiceFiscalValues(orderData.items as any);
  const modelTotal =
    initialComposition.products.reduce((sum, item) => sum + item.vProdCents - item.vDescCents, 0) +
    initialComposition.vOutroCents +
    money(shippingData.value ?? 0, 'Frete comercial');
  const decisionOrder = {
    ...orderData,
    orderType: facts.order.type,
    paymentsSummary: { totalOrderValue: modelTotal / 100 },
    items: (orderData.items as Array<Record<string, any>>)
      .filter((item) => item.itemType !== 'service')
      .map((item, index) => ({
        ...item,
        fiscal: {
          ...item.fiscal,
          cfop:
            facts.emissionRequest.itemFiscalSelections?.[String(index + 1)]?.cfop ||
            item.fiscal?.cfop,
        },
      })),
  };
  const modelDecision = resolveOrderFiscalModel(decisionOrder, {
    issuerUf: String(facts.issuerProfile.companyUF || ''),
    finalConsumer,
    recipientAddress: address,
  });
  if (modelDecision.status !== 'ready') throw new Error(modelDecision.reason);
  if (
    modelDecision.reasons.some(
      (reason) =>
        ![
          'RETAIL_FINAL_CONSUMER_IN_STATE',
          'INTERSTATE_OPERATION',
          'RESALE',
          'VALUE_LIMIT',
        ].includes(reason) &&
        !(
          reason === 'OTHER_FISCAL_REQUIREMENT' &&
          ieIndicator === '1' &&
          contextData.otherFiscalRequirement !== true
        )
    )
  )
    throw new Error(
      `${modelDecision.reason} Esta operação exige matriz tributária específica aprovada.`
    );
  const deliveryMethod = shippingData.deliveryMethod as DeliveryMethod;
  if (operationScope.scope === 'interstate') {
    if (modelDecision.model !== '55')
      throw new Error('NFC-e modelo 65 não pode ser usada em operação interestadual.');
    const routeFacts = {
      environment: facts.emissionRequest.environment,
      model: modelDecision.model,
      issuerRegime: String(facts.issuerProfile.companyCRT || ''),
      issuerUf: operationScope.issuerUf || '',
      destinationUf: operationScope.operationUf || '',
      destinationScope: 'INTERSTATE' as const,
      operationType: 'sale' as const,
      purpose: '1' as const,
      effectiveAt: facts.capturedAt,
    };
    if (!hasApprovedInterstateOutboundRoute(routeFacts))
      throw new Error(
        `Operação interestadual não está coberta pela matriz ${ruleSetVersion} (HML_INTERSTATE_MATRIX_NOT_APPROVED). A Matriz de Decisão Fiscal Interestadual de Saída não contém regra APPROVED utilizável; CFOP candidato não define CSOSN, ICMS, ST, DIFAL ou FCP.`
      );
    const selections = parseFiscalItemSelections(facts.emissionRequest.itemFiscalSelections);
    const productCatalog = obj(inputs.products);
    const recipientIeStatus: InterstateRecipientIeStatus =
      ieIndicator === '1' ? 'taxpayer' : ieIndicator === '2' ? 'exempt' : 'non_taxpayer';
    const explicitBoolean = (...values: unknown[]): boolean | undefined =>
      values.find((value): value is boolean => typeof value === 'boolean');
    const merchandiseOrigin = (item: Record<string, any>, fiscal: Record<string, any>) => {
      const source = item.merchandiseOrigin ?? fiscal.merchandiseOrigin;
      if (source === 'third_party' || source === 'own_production') return source;
      const isOwnProduction = explicitBoolean(item.isOwnProduction, fiscal.isOwnProduction);
      return isOwnProduction === undefined
        ? 'third_party'
        : isOwnProduction
          ? 'own_production'
          : 'third_party';
    };
    const matrixResults = initialComposition.products.map(({ item }, index) => {
      const selected = selections[String(index + 1)];
      const itemRecord = item as Record<string, any>;
      const itemFiscal =
        itemRecord.fiscal && typeof itemRecord.fiscal === 'object'
          ? (itemRecord.fiscal as Record<string, any>)
          : {};
      const productFiscalRaw = itemRecord.productId
        ? productCatalog[itemRecord.productId]
        : undefined;
      const productFiscal =
        productFiscalRaw && typeof productFiscalRaw === 'object'
          ? (productFiscalRaw as Record<string, any>)
          : {};
      const matrixFacts: Partial<InterstateOutboundFiscalMatrixFacts> = {
        environment: facts.emissionRequest.environment,
        model: modelDecision.model,
        issuerRegime: String(facts.issuerProfile.companyCRT || ''),
        issuerUf: operationScope.issuerUf || '',
        destinationUf: operationScope.operationUf || '',
        destinationScope: 'INTERSTATE',
        operationType: 'sale',
        purpose: '1',
        recipientPersonType:
          customer.personType === 'PF' || customer.personType === 'PJ'
            ? customer.personType
            : undefined,
        recipientIeStatus,
        finalConsumer,
        merchandiseOrigin: merchandiseOrigin(itemRecord, productFiscal),
        productOrigin: selected?.origem,
        ncm: selected?.ncm,
        cest: selected?.cest,
        hasSt: explicitBoolean(
          itemFiscal.hasSt,
          itemFiscal.isSt,
          productFiscal.hasSt,
          productFiscal.isSt
        ),
        productId: typeof itemRecord.productId === 'string' ? itemRecord.productId : undefined,
        effectiveAt: facts.capturedAt,
      };
      const matrixResult = resolveInterstateOutboundFiscalMatrix(matrixFacts);
      if (matrixResult.status === 'approved') {
        const approvedTreatment = matrixResult.treatment;
        if (selected?.cfop === '6933' || selected?.cfop === '5933') {
          throw new Error(
            `CFOP ${selected.cfop} pertence a prestação de serviço (ISSQN) e não pode ser aplicado a venda de mercadoria.`
          );
        }
        if (selected?.cfop && selected.cfop !== approvedTreatment.cfop) {
          throw new Error(
            `CFOP escolhido diverge do tratamento aprovado pela matriz (esperado ${approvedTreatment.cfop} para operação interestadual); nenhuma escolha foi substituída.`
          );
        }
        if (selected?.csosn !== approvedTreatment.csosn) {
          throw new Error(
            `CSOSN ${selected?.csosn || 'não informado'} diverge do tratamento aprovado pela matriz (esperado ${approvedTreatment.csosn}); nenhuma escolha foi substituída.`
          );
        }
      }
      return matrixResult;
    });
    const nonApproved = matrixResults.find((result) => result.status !== 'approved');
    if (!matrixResults.length || nonApproved) {
      const code =
        nonApproved && 'code' in nonApproved
          ? nonApproved.code
          : 'HML_INTERSTATE_MATRIX_NOT_APPROVED';
      const reason = nonApproved && 'reason' in nonApproved ? nonApproved.reason : '';
      throw new Error(
        `Operação interestadual não está coberta pela matriz ${ruleSetVersion} (${code}). ${reason || 'A Matriz de Decisão Fiscal Interestadual de Saída não contém regra APPROVED utilizável; CFOP candidato não define CSOSN, ICMS, ST, DIFAL ou FCP.'}`
      );
    }
  }

  const contribution = resolveNormalSaleContribution(inputs, modelDecision.model);
  const issuerCnpj = String(facts.issuerProfile.companyCnpj || '').replace(/\D/g, '');
  if (!/^\d{14}$/.test(issuerCnpj)) throw new Error('CNPJ do emitente inválido.');
  if (facts.issuerProfile.companyCRT !== '1' || facts.issuerProfile.companyUF !== 'PR')
    throw new Error('Regra de venda normal exige emitente Simples Nacional no Paraná.');
  const cpfCnpj = normalizeRecipientTaxId(
    String(facts.emissionRequest.recipientTaxId ?? customer.cpfCnpj ?? '')
  );
  const personType =
    customer.personType === 'PF' || customer.personType === 'PJ' ? customer.personType : undefined;
  const presence = fiscalPresence(modelDecision.model, deliveryMethod, contextData.presence);
  const requirements = decideFiscalRecipientRequirements({
    model: modelDecision.model,
    presence,
    total: modelTotal / 100,
    personType,
    recipientTaxId: cpfCnpj,
    operationScope: 'NORMAL_DOMESTIC_SALE',
  });
  if (!requirements.supported)
    throw new Error(requirements.message || 'Matriz fiscal não aplicável.');
  const city = requirements.addressRequired
    ? required(address.city, 'Município real do destinatário')
    : '';
  const issuerUf = String(facts.issuerProfile.companyUF || '').toUpperCase();
  const uf = requirements.addressRequired
    ? required(address.state || address.uf, 'UF real do destinatário').toUpperCase()
    : issuerUf;
  if (operationScope.destination === '2' && modelDecision.model === '65')
    throw new Error('NFC-e não permite operação interestadual; utilize NF-e modelo 55.');
  const code = requirements.addressRequired
    ? await municipalityCode(
        city,
        uf,
        (address.cityCode || address.ibge || address.municipalityCode) as string | undefined
      )
    : String(facts.issuerProfile.companyCMun || '');
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
  if (recipientAddress?.postalCode && !/^\d{8}$/.test(recipientAddress.postalCode))
    throw new Error('CEP real inválido.');
  if (requirements.documentRequired && !cpfCnpj)
    throw new Error(
      `${requirements.documentType} do destinatário é obrigatório para esta operação fiscal.`
    );
  if (cpfCnpj && !isValidRecipientTaxId(cpfCnpj))
    throw new Error('CPF/CNPJ do destinatário inválido para esta operação fiscal.');
  if (cpfCnpj && !recipientTaxIdMatchesPersonType(cpfCnpj, personType))
    throw new Error(`CPF/CNPJ do destinatário inválido para o tipo ${personType}.`);
  const ieConsistencyError = getRecipientIeIndicatorConsistencyError(ieIndicator, recipientIe);
  if (ieConsistencyError) throw new Error(ieConsistencyError);
  if (modelDecision.model === '65' && ieIndicator !== '9')
    throw new Error(
      'NFC-e exige destinatário não contribuinte; revise a condição fiscal da operação.'
    );
  const effectiveTransporter = facts.emissionRequest.transporter || shippingData.transporter;
  if (facts.emissionRequest.transportResponsible === 'THIRD_PARTY' && !effectiveTransporter)
    throw new Error('Identifique o transportador terceirizado.');

  return {
    version: ruleSetVersion,
    approvedBy: contribution.confirmedBy,
    approvedAt: contribution.confirmedAt,
    effectiveFrom: contribution.confirmedAt,
    issuerCnpj,
    determine: (snapshot: FiscalSnapshotCandidate, hash: string): FiscalDocument => {
      if (
        snapshot.emissionRequest.environment !== environment ||
        snapshot.order.deleted ||
        snapshot.order.type !== 'sale' ||
        ['draft', 'cancelled', 'cancelado'].includes(snapshot.order.status.toLowerCase())
      )
        throw new Error('Pedido não elegível para venda normal neste ambiente.');
      const data = snapshot.order.data;
      const snapshotShipping = data.shipping ? obj(data.shipping) : {};
      const snapshotCustomer = data.customerData ? obj(data.customerData) : {};
      const snapshotScope = resolveFiscalCfopOrderScope({
        issuerUf: String(snapshot.issuerProfile.companyUF || ''),
        deliveryMethod: String(snapshotShipping.deliveryMethod || ''),
        shipping: snapshotShipping,
        customerAddress:
          snapshotCustomer.fullAddress || snapshotCustomer.address || customer.address || undefined,
      });
      if (snapshotScope.destination === null)
        throw new Error(
          snapshotScope.reason || 'Local físico da operação fiscal não identificado.'
        );
      const recipientCpfCnpj = normalizeRecipientTaxId(
        String(snapshot.emissionRequest.recipientTaxId ?? customer.cpfCnpj ?? '')
      );
      const items = data.items as Array<Record<string, any>>;
      const selections = parseFiscalItemSelections(snapshot.emissionRequest.itemFiscalSelections);
      const composition = composeServiceFiscalValues(items as any);
      if (
        !composition.products.length ||
        Object.keys(selections).length !== composition.products.length
      )
        throw new Error('Campos confirmados não cobrem todos os produtos.');
      for (const item of items) {
        if (
          typeof item.quantity !== 'number' ||
          item.quantity <= 0 ||
          !Number.isFinite(item.quantity)
        )
          throw new Error('Quantidade comercial inválida.');
        money(item.unitPrice, 'Preço comercial', true);
        if (item.unitDiscount !== undefined) money(item.unitDiscount, 'Desconto comercial');
        if (item.unitDiscount && !['fixed', 'percentage'].includes(item.discountType))
          throw new Error('Tipo de desconto ausente ou não suportado.');
        if (
          (item.discountType === 'percentage' && item.unitDiscount > 100) ||
          (item.discountType === 'fixed' && item.unitDiscount > item.unitPrice)
        )
          throw new Error('Desconto excede o preço comercial.');
      }
      const shipping = data.shipping ? obj(data.shipping) : {};
      const freight = money(shipping.value ?? 0, 'Frete comercial');
      const isNonTaxpayerInterstate = snapshotScope.scope === 'interstate' && ieIndicator === '9';
      const expectedCfop =
        snapshotScope.scope === 'internal' ? '5102' : isNonTaxpayerInterstate ? '6108' : '6102';
      const { traces, determinedItems, products, discount, invoice } = determineNormalSaleItems({
        snapshot,
        composition,
        selections,
        expectedCfop,
        snapshotScope,
        contribution,
        modelDecision,
        ruleSetVersion,
        code,
        freight,
      });
      const { payments, payment, billingInstallments } = resolveNormalSalePayments({
        snapshot,
        data,
        shipping,
        modelDecision,
        traces,
        invoice,
      });
      const issuer = snapshot.issuerProfile;
      const issuerAddress: FiscalAddress = {
        street: required(issuer.companyLogradouro, 'Logradouro emitente'),
        number: required(issuer.companyNumero, 'Número emitente'),
        district: required(issuer.companyBairro, 'Bairro emitente'),
        municipalityCode: required(issuer.companyCMun, 'IBGE emitente'),
        municipality: required(issuer.companyXMun, 'Município emitente'),
        uf: required(issuer.companyUF, 'UF emitente'),
        postalCode: required(issuer.companyCEP, 'CEP emitente').replace(/\D/g, ''),
      };

      const isDelivery = shipping.deliveryMethod === 'delivery';
      const deliveryMethod: DeliveryMethod = isDelivery ? 'delivery' : 'pickup';
      const effectiveTransporter = snapshot.emissionRequest.transporter || shipping.transporter;
      const rawResponsible: TransportResponsible | undefined =
        snapshot.emissionRequest.transportResponsible ||
        (snapshot.emissionRequest.deliveryByIssuer === true
          ? 'OWN_COMPANY'
          : snapshot.emissionRequest.deliveryByIssuer === false && effectiveTransporter
            ? 'THIRD_PARTY'
            : undefined);

      const resolvedTransport = resolveTransport({
        fiscalModel: modelDecision.model,
        deliveryMethod,
        hasTransport: snapshot.emissionRequest.hasTransport,
        transportResponsible: rawResponsible,
        freightContractResponsible: snapshot.emissionRequest.freightContractResponsible,
      });

      const resolvedTransporter =
        resolvedTransport.isEmitterTransporter && modelDecision.model === '55'
          ? {
              cnpj: String(issuer.companyCnpj || '').replace(/\D/g, ''),
              name: String(issuer.companyName || ''),
              ie: String(issuer.companyIE || '').replace(/\D/g, ''),
              city: issuerAddress.municipality,
              uf: issuerAddress.uf,
            }
          : resolvedTransport.requiresTransporterData && effectiveTransporter
            ? effectiveTransporter
            : undefined;

      return {
        snapshotHash: hash,
        ruleSetVersion,
        model: modelDecision.model,
        modelDecision,
        environment: snapshot.emissionRequest.environment,
        issuer: {
          cnpj: required(issuer.companyCnpj, 'CNPJ emitente').replace(/\D/g, ''),
          name: required(issuer.companyName, 'Razão social'),
          ie: required(issuer.companyIE, 'IE emitente').replace(/\D/g, ''),
          crt: '1',
          municipalityCode: issuerAddress.municipalityCode,
          address: issuerAddress,
        },
        recipient: {
          name: customer.fullName || 'CONSUMIDOR FINAL',
          cpfCnpj: recipientCpfCnpj,
          ...(personType ? { personType } : {}),
          ieIndicator,
          ...(ieIndicator === '1'
            ? { ie: required(recipientIe, 'IE destinatário').replace(/\D/g, '') }
            : {}),
          address: recipientAddress,
        },
        operation: {
          natureOfOperation: 'VENDA DE MERCADORIA',
          direction: 'outbound',
          purpose: '1',
          destination: snapshotScope.destination || '1',
          presence,
          finalConsumer: modelDecision.finalConsumer ? '1' : '0',
          freightMode: resolvedTransport.modFrete,
          ...(resolvedTransporter ? { transporter: resolvedTransporter } : {}),
        },
        items: determinedItems,
        payments,
        ...(billingInstallments?.length ? { billingInstallments } : {}),
        decisions: traces,
        totals: {
          icmsBase: 0,
          products: products / 100,
          discount: discount / 100,
          freight: freight / 100,
          insurance: 0,
          otherExpenses: composition.vOutroCents / 100,
          icms: 0,
          icmsExempt: 0,
          fcp: 0,
          icmsStBase: 0,
          icmsSt: 0,
          fcpSt: 0,
          fcpStRetained: 0,
          ii: 0,
          ipi: 0,
          ipiReturned: 0,
          pis: 0,
          cofins: 0,
          invoice: invoice / 100,
          payment: payment / 100,
          change: 0,
        },
      };
    },
  };
}

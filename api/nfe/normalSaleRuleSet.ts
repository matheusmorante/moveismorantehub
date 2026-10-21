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
import { normalizeRecipientTaxId } from '../../shared-utils/recipientTaxId';
import type { ApprovedFiscalRuleSet } from './fiscalCore';
import type { FiscalAddress, FiscalDocument, FiscalSnapshotCandidate } from './fiscalSnapshot';
import { NORMAL_SALE_RULESET_VERSION } from './normal-sale/constants';
import {
  resolveInterstateFinalConsumer,
  validateInterstateNormalSaleMatrix,
} from './normal-sale/interstateValidation';
import { determineNormalSaleItems } from './normal-sale/items';
import { resolveNormalSalePayments } from './normal-sale/payments';
import {
  resolveNormalSaleCustomer,
  resolveNormalSaleRecipientAddress,
  resolveRecipientIeContext,
  validateNormalSaleRecipientRequirements,
} from './normal-sale/recipientScope';
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
  const contextData = orderData.fiscalContext ? obj(orderData.fiscalContext) : {};
  const shippingData = orderData.shipping ? obj(orderData.shipping) : {};

  if (!['delivery', 'pickup'].includes(String(shippingData.deliveryMethod || ''))) {
    throw new Error(
      'Modalidade atual do pedido ausente ou inválida; confirme entrega ou retirada.'
    );
  }

  const customer = resolveNormalSaleCustomer(orderData, inputs);
  const { ieIndicator, recipientIe } = resolveRecipientIeContext(facts, customer, contextData);

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

  if (operationScope.destination === null) {
    throw new Error(operationScope.reason || 'Local físico da operação fiscal não identificado.');
  }
  if (operationScope.scope === 'foreign') {
    throw new Error('Operação com exterior exige matriz fiscal específica aprovada.');
  }

  const finalConsumer = resolveInterstateFinalConsumer(
    operationScope,
    contextData,
    facts.emissionRequest.finalConsumer
  );

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
          (ieIndicator === '1' || contextData.otherFiscalRequirement === true)
        )
    )
  ) {
    throw new Error(
      `${modelDecision.reason} Esta operação exige matriz tributária específica aprovada.`
    );
  }

  const persistedDeliveryMethod = shippingData.deliveryMethod as DeliveryMethod;
  // NFC-e without transport represents an effective pickup for this emission,
  // even when the commercial order was originally saved as delivery.
  const deliveryMethod: DeliveryMethod =
    modelDecision.model === '65' && facts.emissionRequest.hasTransport === false
      ? 'pickup'
      : persistedDeliveryMethod;

  validateInterstateNormalSaleMatrix({
    facts,
    operationScope,
    modelDecision,
    initialComposition,
    customer,
    ieIndicator,
    finalConsumer,
    ruleSetVersion,
  });

  const contribution = resolveNormalSaleContribution(inputs, modelDecision.model);
  const issuerCnpj = normalizeRecipientTaxId(String(facts.issuerProfile.companyCnpj || ''));
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(issuerCnpj)) throw new Error('CNPJ do emitente inválido.');
  if (facts.issuerProfile.companyCRT !== '1' || facts.issuerProfile.companyUF !== 'PR') {
    throw new Error('Regra de venda normal exige emitente Simples Nacional no Paraná.');
  }

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

  const { recipientAddress, municipalityCode: code } = await resolveNormalSaleRecipientAddress({
    address,
    requirements,
    issuerProfile: facts.issuerProfile,
  });

  validateNormalSaleRecipientRequirements({
    requirements,
    model: modelDecision.model,
    cpfCnpj,
    personType,
    ieIndicator,
    recipientIe,
    finalConsumer: modelDecision.finalConsumer,
    facts,
    shippingData,
    operationDestination: operationScope.destination,
  });

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
      ) {
        throw new Error('Pedido não elegível para venda normal neste ambiente.');
      }

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

      if (snapshotScope.destination === null) {
        throw new Error(
          snapshotScope.reason || 'Local físico da operação fiscal não identificado.'
        );
      }

      const recipientCpfCnpj = normalizeRecipientTaxId(
        String(snapshot.emissionRequest.recipientTaxId ?? customer.cpfCnpj ?? '')
      );
      const items = data.items as Array<Record<string, any>>;
      const selections = parseFiscalItemSelections(snapshot.emissionRequest.itemFiscalSelections);
      const composition = composeServiceFiscalValues(items as any);

      if (
        !composition.products.length ||
        Object.keys(selections).length !== composition.products.length
      ) {
        throw new Error('Campos confirmados não cobrem todos os produtos.');
      }

      for (const item of items) {
        if (
          typeof item.quantity !== 'number' ||
          item.quantity <= 0 ||
          !Number.isFinite(item.quantity)
        ) {
          throw new Error('Quantidade comercial inválida.');
        }
        money(item.unitPrice, 'Preço comercial', true);
        if (item.unitDiscount !== undefined) money(item.unitDiscount, 'Desconto comercial');
        if (item.unitDiscount && !['fixed', 'percentage'].includes(item.discountType)) {
          throw new Error('Tipo de desconto ausente ou não suportado.');
        }
        if (
          (item.discountType === 'percentage' && item.unitDiscount > 100) ||
          (item.discountType === 'fixed' && item.unitDiscount > item.unitPrice)
        ) {
          throw new Error('Desconto excede o preço comercial.');
        }
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
        isNonTaxpayerInterstate,
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
              cnpj: normalizeRecipientTaxId(String(issuer.companyCnpj || '')),
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
          cnpj: normalizeRecipientTaxId(required(issuer.companyCnpj, 'CNPJ emitente')),
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

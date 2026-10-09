import {
  FiscalXmlAuditError,
  assertFiscalDocumentMatchesCommercialSnapshot,
  assertSignedFiscalXmlMatchesSnapshot,
} from './fiscalXmlAudit';
import { resolveNormalSalePayments } from './normal-sale/payments';
import type {
  DeterminedFiscalItem,
  FiscalDocument,
  FiscalSnapshotCandidate,
} from './fiscalSnapshot';
import type { FiscalXmlAuditMismatch } from './fiscalXmlAudit';

type JsonObject = Record<string, any>;

const objectValue = (value: unknown): JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {};

const normalizeText = (value: unknown) => String(value ?? '').trim();
const normalizeTaxId = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const moneyMatches = (left: unknown, right: unknown) => {
  const a = Number(left);
  const b = Number(right);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 0.005;
};
const sameValue = (left: unknown, right: unknown) => normalizeText(left) === normalizeText(right);

export type AuthorizedFiscalDocumentForEdit = {
  id: string;
  order_id: string;
  emission_request_id: string | null;
  status: string;
  ambiente: number;
  modelo: string;
  numero_nfe: number;
  serie: string;
  chave_acesso: string;
  xml_nfe: string | null;
};

export function projectOrderDataForFiscalEdit(current: JsonObject, submitted: JsonObject): JsonObject {
  const allowed = [
    'items',
    'shipping',
    'payments',
    'paymentsSummary',
    'itemsSummary',
    'customerData',
    'fiscalContext',
    'date',
    'status',
    'orderType',
    'observation',
  ];
  const projected = { ...current };
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(submitted, key)) projected[key] = submitted[key];
  }
  return projected;
}

export function hasPotentialFiscalOrderEdit(current: JsonObject, proposed: JsonObject): boolean {
  const fields = (data: JsonObject) => ({
    items: Array.isArray(data.items)
      ? data.items.map((item: JsonObject) => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          variationId: item.variationId,
          code: item.code,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitDiscount: item.unitDiscount,
          discountType: item.discountType,
          condition: item.condition,
          itemType: item.itemType,
          fiscal: item.fiscal
            ? {
                ncm: item.fiscal.ncm,
                cest: item.fiscal.cest,
                origem: item.fiscal.origem,
                cfop: item.fiscal.cfop,
                cst: item.fiscal.cst,
                pisCst: item.fiscal.pisCst,
                cofinsCst: item.fiscal.cofinsCst,
                icmsPercent: item.fiscal.icmsPercent,
                ipiPercent: item.fiscal.ipiPercent,
                hasSt: item.fiscal.hasSt,
                isSt: item.fiscal.isSt,
                isOwnProduction: item.fiscal.isOwnProduction,
                merchandiseOrigin: item.fiscal.merchandiseOrigin,
              }
            : undefined,
        }))
      : [],
    customerData: {
      fullName: data.customerData?.fullName,
      name: data.customerData?.name,
      cpfCnpj: data.customerData?.cpfCnpj,
      ie: data.customerData?.ie,
      ieIndicator: data.customerData?.ieIndicator,
      fullAddress: data.customerData?.fullAddress,
    },
    shipping: {
      value: data.shipping?.value,
      deliveryMethod: data.shipping?.deliveryMethod,
      useCustomerAddress: data.shipping?.useCustomerAddress,
      deliveryAddress: data.shipping?.deliveryAddress,
      freightMode: data.shipping?.freightMode,
      transporter: data.shipping?.transporter,
    },
    payments: Array.isArray(data.payments)
      ? data.payments.map((payment: JsonObject) => ({
          method: payment.method,
          amount: payment.amount,
          status: payment.status,
          fiscalCard: payment.fiscalCard,
          installments: payment.installments,
          dueDate: payment.dueDate,
          paymentDate: payment.paymentDate,
        }))
      : [],
    paymentsSummary: { totalOrderValue: data.paymentsSummary?.totalOrderValue },
    fiscalContext: {
      operationType: data.fiscalContext?.operationType,
      purpose: data.fiscalContext?.purpose,
      finalConsumer: data.fiscalContext?.finalConsumer,
      presence: data.fiscalContext?.presence,
      acquisitionPurpose: data.fiscalContext?.acquisitionPurpose,
      requiresTaxCredit: data.fiscalContext?.requiresTaxCredit,
      publicAdministrationRequirement: data.fiscalContext?.publicAdministrationRequirement,
      otherFiscalRequirement: data.fiscalContext?.otherFiscalRequirement,
      recipientIeIndicator: data.fiscalContext?.recipientIeIndicator,
    },
  });
  return JSON.stringify(fields(current)) !== JSON.stringify(fields(proposed));
}

export function assertAuthorizedFiscalSnapshot(
  snapshot: FiscalSnapshotCandidate,
  document: AuthorizedFiscalDocumentForEdit
): FiscalDocument {
  if (!document.emission_request_id || !document.xml_nfe)
    throw new Error('A nota autorizada não possui vínculo técnico e XML íntegro para auditoria.');
  if (
    !['55', '65'].includes(String(document.modelo)) ||
    ![1, 2].includes(Number(document.ambiente)) ||
    document.status !== (Number(document.ambiente) === 2 ? 'homologada' : 'autorizada')
  )
    throw new Error('Modelo, ambiente ou autorização da nota não correspondem.');
  if (
    snapshot.order.id !== document.order_id ||
    snapshot.emissionRequest.id !== document.emission_request_id ||
    Number(snapshot.emissionRequest.environment) !== Number(document.ambiente)
  )
    throw new Error('A fotografia fiscal não pertence à nota autorizada consultada.');

  const resolvedDocument = snapshot.resolvedDocument as FiscalDocument | undefined;
  const issuedAt = document.xml_nfe.match(/<dhEmi(?:\s[^>]*)?>([^<]+)<\/dhEmi>/i)?.[1]?.trim();
  if (
    !resolvedDocument ||
    resolvedDocument.model !== String(document.modelo) ||
    Number(resolvedDocument.environment) !== Number(document.ambiente) ||
    !issuedAt
  )
    throw new Error('A fotografia da nota está incompleta; revisão fiscal necessária.');
  assertSignedFiscalXmlMatchesSnapshot(snapshot, resolvedDocument, document.xml_nfe, {
    series: document.serie,
    number: Number(document.numero_nfe),
    accessKey: document.chave_acesso,
    issuedAt,
  });
  return resolvedDocument;
}

function addMismatch(
  changes: FiscalXmlAuditMismatch[],
  field: string,
  expected: unknown,
  actual: unknown
) {
  if (changes.some((change) => change.field === field)) return;
  changes.push({
    field,
    expected: normalizeText(expected) || '(vazio)',
    actual: normalizeText(actual) || '(vazio)',
  });
}

function resolveCustomerAddress(orderData: JsonObject): JsonObject {
  const shipping = objectValue(orderData.shipping);
  if (shipping.useCustomerAddress === false) {
    return objectValue(shipping.deliveryAddress);
  }
  return objectValue(objectValue(orderData.customerData).fullAddress);
}

function compareChangedCustomerFields(
  changes: FiscalXmlAuditMismatch[],
  original: JsonObject,
  proposed: JsonObject,
  document: FiscalDocument
) {
  const before = objectValue(original.customerData);
  const after = objectValue(proposed.customerData);
  const recipient = document.recipient;
  const changed = (key: string) => !sameValue(before[key], after[key]);

  if (changed('cpfCnpj') && normalizeTaxId(after.cpfCnpj) !== normalizeTaxId(recipient.cpfCnpj))
    addMismatch(changes, 'dest.CNPJ/CPF', recipient.cpfCnpj, after.cpfCnpj);
  if (
    (changed('fullName') || changed('name')) &&
    !sameValue(after.fullName || after.name, recipient.name)
  )
    addMismatch(changes, 'dest.xNome', recipient.name, after.fullName || after.name);
  if (changed('ie') && !sameValue(after.ie, recipient.ie))
    addMismatch(changes, 'dest.IE', recipient.ie, after.ie);
  if (
    changed('ieIndicator') &&
    !sameValue(after.ieIndicator, recipient.ieIndicator)
  )
    addMismatch(changes, 'dest.indIEDest', recipient.ieIndicator, after.ieIndicator);

  const oldAddress = resolveCustomerAddress(original);
  const newAddress = resolveCustomerAddress(proposed);
  if (!recipient.address) return;
  const addressFields: Array<[string, string, string]> = [
    ['street', 'street', 'logradouro'],
    ['number', 'number', 'numero'],
    ['neighborhood', 'district', 'bairro'],
    ['city', 'municipality', 'municipio'],
    ['state', 'uf', 'UF'],
    ['cep', 'postalCode', 'CEP'],
  ];
  for (const [sourceKey, fiscalKey, label] of addressFields) {
    if (sameValue(oldAddress[sourceKey], newAddress[sourceKey])) continue;
    if (!sameValue(newAddress[sourceKey], recipient.address[fiscalKey as keyof typeof recipient.address])) {
      addMismatch(
        changes,
        `dest.enderDest.${label}`,
        recipient.address[fiscalKey as keyof typeof recipient.address],
        newAddress[sourceKey]
      );
    }
  }
}

function compareChangedItemClassifications(
  changes: FiscalXmlAuditMismatch[],
  original: JsonObject,
  proposed: JsonObject,
  document: FiscalDocument
) {
  const beforeItems = Array.isArray(original.items) ? original.items : [];
  const afterItems = Array.isArray(proposed.items) ? proposed.items : [];
  const fieldMap: Array<[string, keyof DeterminedFiscalItem['classification'], string]> = [
    ['ncm', 'ncm', 'NCM'],
    ['cest', 'cest', 'CEST'],
    ['origem', 'origin', 'orig'],
    ['cfop', 'cfop', 'CFOP'],
  ];

  afterItems.forEach((item: JsonObject, index: number) => {
    const oldFiscal = objectValue(objectValue(beforeItems[index]).fiscal);
    const newFiscal = objectValue(item.fiscal);
    const actual = document.items[index];
    if (!actual) return;
    for (const [sourceKey, actualKey, label] of fieldMap) {
      if (!Object.hasOwn(newFiscal, sourceKey) || sameValue(oldFiscal[sourceKey], newFiscal[sourceKey]))
        continue;
      const actualValue = actual.classification[actualKey];
      if (!sameValue(newFiscal[sourceKey], actualValue))
        addMismatch(changes, `det[${index + 1}].prod.${label}`, actualValue, newFiscal[sourceKey]);
    }

    if (Object.hasOwn(newFiscal, 'cst') && !sameValue(oldFiscal.cst, newFiscal.cst)) {
      const icms = actual.taxes.find((tax) => tax.group === 'ICMS');
      if (!sameValue(newFiscal.cst, icms?.code))
        addMismatch(changes, `det[${index + 1}].imposto.ICMS.CST_CSOSN`, icms?.code, newFiscal.cst);
    }

    const taxCodeFields: Array<[string, 'PIS' | 'COFINS' | 'IPI', string]> = [
      ['pisCst', 'PIS', 'CST'],
      ['cofinsCst', 'COFINS', 'CST'],
    ];
    for (const [sourceKey, group, tag] of taxCodeFields) {
      if (!Object.hasOwn(newFiscal, sourceKey) || sameValue(oldFiscal[sourceKey], newFiscal[sourceKey]))
        continue;
      const tax = actual.taxes.find((candidate) => candidate.group === group);
      if (!sameValue(newFiscal[sourceKey], tax?.code))
        addMismatch(changes, `det[${index + 1}].imposto.${group}.${tag}`, tax?.code, newFiscal[sourceKey]);
    }

    const taxRates: Array<[string, 'ICMS' | 'IPI', string]> = [
      ['icmsPercent', 'ICMS', 'pICMS'],
      ['ipiPercent', 'IPI', 'pIPI'],
    ];
    for (const [sourceKey, group, rateKey] of taxRates) {
      if (!Object.hasOwn(newFiscal, sourceKey) || sameValue(oldFiscal[sourceKey], newFiscal[sourceKey]))
        continue;
      const tax = actual.taxes.find((candidate) => candidate.group === group);
      const rate = tax?.values[rateKey];
      if (!sameValue(newFiscal[sourceKey], rate))
        addMismatch(changes, `det[${index + 1}].imposto.${group}.${rateKey}`, rate, newFiscal[sourceKey]);
    }
  });
}

function compareChangedShipping(
  changes: FiscalXmlAuditMismatch[],
  original: JsonObject,
  proposed: JsonObject,
  document: FiscalDocument
) {
  const before = objectValue(original.shipping);
  const after = objectValue(proposed.shipping);
  if (
    !sameValue(before.freightMode, after.freightMode) &&
    !sameValue(after.freightMode, document.operation.freightMode)
  )
    addMismatch(changes, 'transp.modFrete', document.operation.freightMode, after.freightMode);

  const beforeTransporter = objectValue(before.transporter);
  const afterTransporter = objectValue(after.transporter);
  const actual = document.operation.transporter;
  const fields: Array<[string, string, string]> = [
    ['cnpj', 'cnpj', 'CNPJ/CPF'],
    ['cpf', 'cpf', 'CNPJ/CPF'],
    ['name', 'name', 'xNome'],
    ['ie', 'ie', 'IE'],
    ['address', 'address', 'xEnder'],
    ['city', 'city', 'xMun'],
    ['uf', 'uf', 'UF'],
  ];
  for (const [sourceKey, actualKey, label] of fields) {
    if (sameValue(beforeTransporter[sourceKey], afterTransporter[sourceKey])) continue;
    const expected = actual?.[actualKey as keyof typeof actual];
    const matches = label === 'CNPJ/CPF'
      ? normalizeTaxId(expected) === normalizeTaxId(afterTransporter[sourceKey])
      : sameValue(expected, afterTransporter[sourceKey]);
    if (!matches)
      addMismatch(changes, `transp.transporta.${label}`, expected, afterTransporter[sourceKey]);
  }
}

function paymentProjection(payment: JsonObject) {
  return {
    methodCode: payment.methodCode,
    amount: Number(payment.amount || 0),
    paymentIndicator: payment.paymentIndicator,
    description: payment.description,
    paymentDate: payment.paymentDate,
    card: payment.card,
  };
}

function compareEditedPayments(
  changes: FiscalXmlAuditMismatch[],
  snapshot: FiscalSnapshotCandidate,
  proposedData: JsonObject,
  document: FiscalDocument
) {
  if (JSON.stringify(snapshot.order.data.payments ?? []) === JSON.stringify(proposedData.payments ?? []))
    return;
  const modelDecision = snapshot.emissionRequest.modelDecision;
  if (!modelDecision || modelDecision.status !== 'ready') {
    addMismatch(changes, 'pag.detPag', 'decisão fiscal original disponível', 'não foi possível recalcular');
    return;
  }

  try {
    const candidate = {
      ...snapshot,
      order: { ...snapshot.order, data: proposedData },
    } as FiscalSnapshotCandidate;
    const resolved = resolveNormalSalePayments({
      snapshot: candidate,
      data: proposedData,
      shipping: objectValue(proposedData.shipping),
      modelDecision,
      traces: [...document.decisions],
      invoice: Math.round(document.totals.invoice * 100),
    });
    const expectedPayments = resolved.payments.map(paymentProjection);
    const actualPayments = document.payments.map(paymentProjection);
    if (JSON.stringify(expectedPayments) !== JSON.stringify(actualPayments)) {
      const length = Math.max(expectedPayments.length, actualPayments.length);
      for (let index = 0; index < length; index += 1) {
        const expected = expectedPayments[index];
        const actual = actualPayments[index];
        if (!expected || !actual) {
          addMismatch(
            changes,
            `pag.detPag[${index + 1}]`,
            expected ? 'presente' : '(ausente)',
            actual ? 'presente' : '(ausente)'
          );
          continue;
        }
        const xmlFieldFor: Record<string, string> = {
          methodCode: 'tPag',
          amount: 'vPag',
          paymentIndicator: 'indPag',
          description: 'xPag',
          paymentDate: 'dPag',
        };
        for (const key of ['methodCode', 'amount', 'paymentIndicator', 'description', 'paymentDate'] as const) {
          const matches = key === 'amount' ? moneyMatches(expected[key], actual[key]) : sameValue(expected[key], actual[key]);
          if (!matches)
            addMismatch(changes, `pag.detPag[${index + 1}].${xmlFieldFor[key]}`, actual[key], expected[key]);
        }
        if (JSON.stringify(expected.card ?? null) !== JSON.stringify(actual.card ?? null))
          addMismatch(changes, `pag.detPag[${index + 1}].card`, 'dados atuais do pedido', 'dados autorizados diferentes');
      }
    }
    if (JSON.stringify(resolved.billingInstallments ?? []) !== JSON.stringify(document.billingInstallments ?? []))
      addMismatch(changes, 'cobr.dup', 'parcelas atuais do pedido', 'parcelas autorizadas diferentes');
  } catch {
    addMismatch(changes, 'pag.detPag', 'dados fiscais recalculáveis', 'não foi possível reconciliar os pagamentos');
  }
}

function compareEditedOperation(changes: FiscalXmlAuditMismatch[], original: JsonObject, proposed: JsonObject, document: FiscalDocument) {
  const before = objectValue(original.fiscalContext);
  const after = objectValue(proposed.fiscalContext);
  const operationFields: Array<[string, keyof FiscalDocument['operation'], string]> = [
    ['purpose', 'purpose', 'ide.finNFe'],
    ['presence', 'presence', 'ide.indPres'],
    ['finalConsumer', 'finalConsumer', 'ide.indFinal'],
  ];
  for (const [sourceKey, fiscalKey, label] of operationFields) {
    if (!Object.hasOwn(after, sourceKey) || sameValue(before[sourceKey], after[sourceKey])) continue;
    const proposedValue = sourceKey === 'finalConsumer' ? (after[sourceKey] ? '1' : '0') : after[sourceKey];
    if (!sameValue(proposedValue, document.operation[fiscalKey]))
      addMismatch(changes, label, document.operation[fiscalKey], proposedValue);
  }
  const fiscalDecisionFields = [
    'acquisitionPurpose',
    'requiresTaxCredit',
    'publicAdministrationRequirement',
    'otherFiscalRequirement',
  ];
  for (const sourceKey of fiscalDecisionFields) {
    if (!Object.hasOwn(after, sourceKey) || sameValue(before[sourceKey], after[sourceKey])) continue;
    addMismatch(
      changes,
      `fiscalContext.${sourceKey}`,
      before[sourceKey] ?? 'escolha fiscal confirmada na emissão',
      after[sourceKey]
    );
  }
  if (
    Object.hasOwn(after, 'recipientIeIndicator') &&
    !sameValue(before.recipientIeIndicator, after.recipientIeIndicator) &&
    !sameValue(after.recipientIeIndicator, document.recipient.ieIndicator)
  )
    addMismatch(
      changes,
      'dest.indIEDest',
      document.recipient.ieIndicator,
      after.recipientIeIndicator
    );
  if (!sameValue(before.operationType, after.operationType)) {
    const isOutboundSale = ['sale', 'showroom'].includes(normalizeText(after.operationType).toLowerCase());
    if (!isOutboundSale || document.operation.direction !== 'outbound')
      addMismatch(changes, 'ide.tpNF', document.operation.direction, after.operationType);
  }
}

/**
 * Finds order-edit changes that would make the effective fiscal document differ
 * from the signed, authorized XML. Operational fields such as agenda, seller,
 * and internal notes are intentionally outside the fiscal projection.
 */
export function findFiscalOrderEditChanges(
  snapshot: FiscalSnapshotCandidate,
  proposedOrderData: JsonObject,
  document: FiscalDocument
): FiscalXmlAuditMismatch[] {
  const changes: FiscalXmlAuditMismatch[] = [];
  const candidate = {
    ...snapshot,
    order: { ...snapshot.order, data: proposedOrderData },
  } as FiscalSnapshotCandidate;

  try {
    assertFiscalDocumentMatchesCommercialSnapshot(candidate, document);
  } catch (error) {
    if (error instanceof FiscalXmlAuditError) {
      changes.push(...error.mismatches.filter((mismatch) => mismatch.field !== 'cliente.id'));
    } else {
      addMismatch(changes, 'auditoria.comercial', 'dados comparáveis', 'não foi possível comparar o pedido');
    }
  }

  compareChangedCustomerFields(changes, snapshot.order.data, proposedOrderData, document);
  compareChangedItemClassifications(changes, snapshot.order.data, proposedOrderData, document);
  compareChangedShipping(changes, snapshot.order.data, proposedOrderData, document);
  compareEditedPayments(changes, snapshot, proposedOrderData, document);
  compareEditedOperation(changes, snapshot.order.data, proposedOrderData, document);

  return changes;
}

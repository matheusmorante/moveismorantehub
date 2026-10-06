import type { SupabaseClient } from '@supabase/supabase-js';
import type { FiscalDatabase } from './fiscalDatabaseTypes';
import type {
  FiscalDocument,
  FiscalJsonValue,
  FiscalSnapshotCandidate,
  FiscalDecisionTrace,
  FiscalAddress,
  DeterminedFiscalItem,
} from './fiscalSnapshot';
import { createHmlTechnicalRuleSet } from './hmlTechnicalRuleSet';
import { resolveItemCsosn, type HmlCsosnConfiguration } from './csosnPolicy';
import { ZERO_OWN_ICMS_CSOSNS } from '../../shared-utils/fiscalIcmsGroups';
import { parseFiscalItemSelections } from '../../shared-utils/fiscalItemSelections';
import { composeServiceFiscalValues } from '../../erp/src/pages/utils/nfe/serviceFiscalComposition';
import {
  resolveOrderFiscalModel,
  getFiscalRecipientAddress,
  fiscalPresence,
  decideFiscalRecipientRequirements,
} from '../../shared-utils/fiscalDocumentModel';
import {
  isValidRecipientTaxId,
  normalizeRecipientTaxId,
  recipientTaxIdMatchesPersonType,
} from '../../shared-utils/recipientTaxId';
import {
  resolveTransport,
  type DeliveryMethod,
  type TransportResponsible,
} from '../../shared-utils/fiscalTransportModel';
import { resolveFiscalCfopOrderScope } from '../../shared-utils/fiscalCfopModel';
import {
  hasApprovedInterstateRoute,
  resolveInterstateFiscalMatrix,
  type InterstateFiscalMatrixFacts,
  type InterstateRecipientIeStatus,
} from './interstateTaxMatrix';

export const HML_NORMAL_SALE_RULESET_VERSION = 'HML_NORMAL_SALE_V2';
const obj = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Fatos fiscais obrigatórios ausentes.');
  return value as Record<string, any>;
};
const required = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} ausente.`);
  return value.trim();
};
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
const municipalitiesByUf = new Map<string, Promise<Array<{ id: number; nome: string }>>>();
async function municipalityCode(city: string, uf = 'PR', existingCode?: string): Promise<string> {
  if (existingCode && /^\d{7}$/.test(String(existingCode))) {
    return String(existingCode);
  }
  const normUf = uf.toUpperCase();
  let promise = municipalitiesByUf.get(normUf);
  if (!promise) {
    promise = fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${normUf}/municipios`,
      { signal: AbortSignal.timeout(10000) }
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(`Consulta oficial IBGE indisponível para UF ${normUf}.`);
        const data = await response.json();
        if (
          !Array.isArray(data) ||
          data.some((item) => !Number.isInteger(item.id) || typeof item.nome !== 'string')
        )
          throw new Error('Resposta oficial IBGE inválida.');
        return data as Array<{ id: number; nome: string }>;
      })
      .catch((error) => {
        municipalitiesByUf.delete(normUf);
        throw error;
      });
    municipalitiesByUf.set(normUf, promise);
  }
  const list = await promise;
  const match = list.find((item) => normalize(item.nome) === normalize(city));
  if (!match)
    throw new Error(`Município do destinatário não encontrado na fonte oficial IBGE de ${normUf}.`);
  return String(match.id);
}
const money = (value: unknown, field: string, positive = false): number => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < (positive ? 0.01 : 0) ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
  )
    throw new Error(`${field} inválido ou fora da precisão de centavos.`);
  return Math.round(value * 100);
};
/** Read-only preflight inputs; the canonical snapshot RPC captures these again under locks. */
export async function loadHmlNormalSaleInputs(
  db: SupabaseClient<FiscalDatabase>,
  facts: FiscalSnapshotCandidate,
  appSettings: Record<string, unknown>
): Promise<void> {
  const items = facts.order.data.items as Array<Record<string, any>>;
  if (!Array.isArray(items)) throw new Error('Itens comerciais ausentes.');
  const ids = Array.from(
    new Set(
      items
        .map((item) => item.productId)
        .filter(
          (id): id is string =>
            typeof id === 'string' &&
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)
        )
    )
  );
  const customerId = obj(facts.order.data.customerData).id;
  const [catalog, customer, decision] = await Promise.all([
    ids.length
      ? db.from('products').select('id,fiscal').in('id', ids)
      : Promise.resolve({ data: [], error: null }),
    db
      .from('people')
      .select('id,full_name,cpf_cnpj,address,rg_ie,person_type_pf_pj,deleted')
      .eq('id', String(customerId || ''))
      .maybeSingle(),
    db
      .from('settings')
      .select('data')
      .eq('id', 'fiscal_decision_simples_nfe55_normal_sale_v1')
      .maybeSingle(),
  ]);
  if (catalog.error || customer.error || decision.error || !customer.data || customer.data.deleted)
    throw new Error('Cadastro real do destinatário ou fatos fiscais indisponíveis.');
  facts.fiscalInputs = {
    products: Object.fromEntries(
      (catalog.data || []).map((row) => [row.id, row.fiscal])
    ) as FiscalJsonValue,
    customer: {
      id: customer.data.id,
      fullName: customer.data.full_name,
      cpfCnpj: customer.data.cpf_cnpj,
      address: customer.data.address,
      ie: customer.data.rg_ie,
      personType: customer.data.person_type_pf_pj,
    },
    contributionDecision: (decision.data?.data || null) as FiscalJsonValue,
    fiscalDefaults: (appSettings.fiscalDefaults || null) as FiscalJsonValue,
  };
  const selections = parseFiscalItemSelections(facts.emissionRequest.itemFiscalSelections);
  const codes = [...new Set(Object.values(selections).map((selected) => selected.ncm))];
  if (!codes.length) throw new Error('Confirme os campos fiscais de todos os itens no modal.');
  const ncms = await db
    .from('ncms')
    .select('code,active,is_active,start_date,end_date')
    .in('code', codes);
  const date = facts.capturedAt.slice(0, 10);
  const products = obj(facts.fiscalInputs.products);
  const invalidSelection = Object.entries(selections).some(([itemNumber, selection]) => {
    const item = items.filter((candidate) => candidate.itemType !== 'service')[
      Number(itemNumber) - 1
    ];
    const savedItemFiscal = item?.fiscal && typeof item.fiscal === 'object' ? item.fiscal : {};
    const savedProductFiscal =
      item?.productId && products[item.productId] && typeof products[item.productId] === 'object'
        ? (products[item.productId] as Record<string, unknown>)
        : {};
    const originalNcm = String(savedItemFiscal.ncm || savedProductFiscal.ncm || '').replace(
      /\D/g,
      ''
    );
    return !ncms.data?.some(
      (ncm) =>
        ncm.code === selection.ncm &&
        ncm.active &&
        (!ncm.start_date || ncm.start_date <= date) &&
        (!ncm.end_date || ncm.end_date >= date) &&
        (ncm.is_active || originalNcm === selection.ncm)
    );
  });
  if (ncms.error || invalidSelection)
    throw new Error(
      'NCM escolhido está oficialmente inválido ou desativado para novas seleções da loja.'
    );
}

/** Limited HML matrix: internal sale, CRT1, supported zero own-ICMS groups. */
export async function createHmlNormalSaleRuleSet(
  facts: FiscalSnapshotCandidate,
  configuration: HmlCsosnConfiguration
) {
  const inputs = obj(facts.fiscalInputs);
  const customer = obj(inputs.customer);
  const orderData = facts.order.data;
  const contextData = orderData.fiscalContext ? obj(orderData.fiscalContext) : {};
  const shippingData = orderData.shipping ? obj(orderData.shipping) : {};
  if (!['delivery', 'pickup'].includes(String(shippingData.deliveryMethod || '')))
    throw new Error('Modalidade atual do pedido ausente ou inválida; confirme entrega ou retirada.');
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

  const initialComposition = composeServiceFiscalValues(orderData.items as any);
  const modelTotal =
    initialComposition.products.reduce((sum, item) => sum + item.vProdCents - item.vDescCents, 0) +
    initialComposition.vOutroCents +
    money(
      shippingData.value ?? 0,
      'Frete comercial'
    );
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
    finalConsumer: facts.emissionRequest.finalConsumer,
    recipientAddress: address,
  });
  if (modelDecision.status !== 'ready') throw new Error(modelDecision.reason);
  if (
    modelDecision.reasons.some(
      (reason) =>
        !['RETAIL_FINAL_CONSUMER_IN_STATE', 'INTERSTATE_OPERATION', 'RESALE', 'VALUE_LIMIT'].includes(
          reason
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
      operationType: 'sale' as const,
    };
    if (!hasApprovedInterstateRoute(routeFacts))
      throw new Error(
        'Operação interestadual não está coberta pela matriz HML_NORMAL_SALE_V2 (HML_INTERSTATE_MATRIX_NOT_APPROVED). Os cenários PR→SC permanecem em DRAFT; CFOP candidato não define CSOSN, ICMS, ST, DIFAL ou FCP.'
      );
    const selections = parseFiscalItemSelections(facts.emissionRequest.itemFiscalSelections);
    const productCatalog = obj(inputs.products);
    const ieIndicator = contextData.recipientIeIndicator;
    const recipientIeStatus: InterstateRecipientIeStatus | undefined =
      ieIndicator === '1'
        ? 'taxpayer'
        : ieIndicator === '2'
          ? 'exempt'
          : ieIndicator === '9'
            ? 'non_taxpayer'
            : undefined;
    const explicitBoolean = (...values: unknown[]): boolean | undefined =>
      values.find((value): value is boolean => typeof value === 'boolean');
    const merchandiseOrigin = (item: Record<string, any>, fiscal: Record<string, any>) => {
      const source = item.merchandiseOrigin ?? fiscal.merchandiseOrigin;
      if (source === 'third_party' || source === 'own_production') return source;
      const isOwnProduction = explicitBoolean(item.isOwnProduction, fiscal.isOwnProduction);
      return isOwnProduction === undefined ? undefined : isOwnProduction ? 'own_production' : 'third_party';
    };
    const matrixResults = initialComposition.products.map(({ item }, index) => {
      const selected = selections[String(index + 1)];
      const itemRecord = item as Record<string, any>;
      const itemFiscal = itemRecord.fiscal && typeof itemRecord.fiscal === 'object'
        ? itemRecord.fiscal as Record<string, any>
        : {};
      const productFiscalRaw = itemRecord.productId ? productCatalog[itemRecord.productId] : undefined;
      const productFiscal = productFiscalRaw && typeof productFiscalRaw === 'object'
        ? productFiscalRaw as Record<string, any>
        : {};
      const matrixFacts: Partial<InterstateFiscalMatrixFacts> = {
        environment: facts.emissionRequest.environment,
        model: modelDecision.model,
        issuerRegime: String(facts.issuerProfile.companyCRT || ''),
        issuerUf: operationScope.issuerUf || '',
        destinationUf: operationScope.operationUf || '',
        operationType: 'sale',
        recipientPersonType:
          customer.personType === 'PF' || customer.personType === 'PJ'
            ? customer.personType
            : undefined,
        recipientIeStatus,
        finalConsumer:
          typeof facts.emissionRequest.finalConsumer === 'boolean'
            ? facts.emissionRequest.finalConsumer
            : undefined,
        merchandiseOrigin: merchandiseOrigin(itemRecord, productFiscal),
        productOrigin: selected?.origem,
        ncm: selected?.ncm,
        cest: selected?.cest,
        hasSt: explicitBoolean(itemFiscal.hasSt, itemFiscal.isSt, productFiscal.hasSt, productFiscal.isSt),
        effectiveAt: facts.capturedAt,
      };
      return resolveInterstateFiscalMatrix(matrixFacts);
    });
    if (!matrixResults.length || matrixResults.some((result) => result.status !== 'approved'))
      throw new Error(
        `Operação interestadual não está coberta pela matriz HML_NORMAL_SALE_V2 (HML_INTERSTATE_MATRIX_NOT_APPROVED). Os cenários PR→SC permanecem em DRAFT; CFOP candidato não define CSOSN, ICMS, ST, DIFAL ou FCP.`
      );
    // Approval data alone cannot activate transmission until this ruleset maps every tax field
    // into the NF-e document and its serializer with focused coverage.
    throw new Error(
      'Operação interestadual não está coberta pela matriz executável HML_NORMAL_SALE_V2 (HML_INTERSTATE_MATRIX_EXECUTION_NOT_READY). A reserva de número permanece bloqueada.'
    );
  }

  // Share the existing issuer/CRT/environment/contribution approval gates after the
  // operation location has been resolved and every interstate path has failed closed.
  const contribution = obj(inputs.contributionDecision);
  const context = createHmlTechnicalRuleSet(facts, contribution, configuration);
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
  const ieIndicator = contextData.recipientIeIndicator || '9';
  if (!['1', '2', '9'].includes(ieIndicator) || (ieIndicator === '1' && !customer.ie))
    throw new Error('Condição de contribuinte e IE do destinatário precisam ser preenchidas.');
  if (modelDecision.model === '65' && ieIndicator !== '9')
    throw new Error(
      'NFC-e exige destinatário não contribuinte; revise a condição fiscal da operação.'
    );
  const effectiveTransporter = facts.emissionRequest.transporter || shippingData.transporter;
  if (facts.emissionRequest.transportResponsible === 'THIRD_PARTY' && !effectiveTransporter)
    throw new Error('Identifique o transportador terceirizado.');

  return {
    ...context,
    version: HML_NORMAL_SALE_RULESET_VERSION,
    approvedBy: 'operator_instruction_real_orders_hml_only',
    determine: (snapshot: FiscalSnapshotCandidate, hash: string): FiscalDocument => {
      if (
        snapshot.emissionRequest.environment !== 2 ||
        snapshot.order.deleted ||
        snapshot.order.id.startsWith('TEST_AUT_') ||
        snapshot.order.type !== 'sale' ||
        ['draft', 'cancelled', 'cancelado'].includes(snapshot.order.status.toLowerCase())
      )
        throw new Error('Pedido real não elegível para homologação.');
      const data = snapshot.order.data;
      const snapshotShipping = data.shipping ? obj(data.shipping) : {};
      const snapshotCustomer = data.customerData ? obj(data.customerData) : {};
      const snapshotScope = resolveFiscalCfopOrderScope({
        issuerUf: String(snapshot.issuerProfile.companyUF || ''),
        deliveryMethod: String(snapshotShipping.deliveryMethod || ''),
        shipping: snapshotShipping,
        customerAddress:
          snapshotCustomer.fullAddress || snapshotCustomer.address || undefined,
      });
      if (snapshotScope.destination === null)
        throw new Error(snapshotScope.reason || 'Local físico da operação fiscal não identificado.');
      if (snapshotScope.scope !== 'internal')
        throw new Error(
          'Operação interestadual não está coberta pela matriz HML_NORMAL_SALE_V2. O CFOP 6102 identifica a operação, mas não define a tributação; é necessária uma matriz interestadual aprovada.'
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
      const persistedInputs = obj(snapshot.fiscalInputs);
      const catalog = obj(persistedInputs.products);
      const expectedCfop = '5102';
      const allowedSavedCfops = ['5102'];
      const traces: FiscalDecisionTrace[] = composition.products.map(({ item }, index) => {
        const selected = selections[String(index + 1)];
        const saved = (item as any).fiscal || {};
        const productFiscal = catalog[item.productId || ''] || {};
        for (const fiscal of [saved, productFiscal]) {
          if (
            (fiscal.cfop && !allowedSavedCfops.includes(fiscal.cfop)) ||
            ['icmsPercent', 'pisPercent', 'cofinsPercent', 'ipiPercent'].some(
              (field) => Number(fiscal[field] || 0) !== 0
            )
          )
            throw new Error(
              'Exceção tributária do pedido/cadastro exige matriz específica; os dados não foram substituídos.'
            );
        }
        const csosn = resolveItemCsosn({
          configuration,
          environment: 2,
          issuerCrt: '1',
          manual: snapshot.emissionRequest.itemCsosnOverrides?.[String(index + 1)],
          catalog: productFiscal.cst,
        });
        if (selected.csosn !== csosn.csosn)
          throw new Error('CSOSN confirmado diverge da escolha fiscal preparada.');
        if (selected.cfop === '6933' || selected.cfop === '5933')
          throw new Error(
            `CFOP ${selected.cfop} pertence a prestação de serviço (ISSQN) e não pode ser aplicado a venda de mercadoria.`
          );
        if (!ZERO_OWN_ICMS_CSOSNS.includes(csosn.csosn) || selected.cfop !== expectedCfop)
          throw new Error(
            `CSOSN ou CFOP escolhido exige matriz fiscal específica (esperado CFOP ${expectedCfop} para operação interna); nenhuma escolha foi substituída.`
          );
        const isSupportedContributionCst = (cst?: string) =>
          !cst || cst === contribution.pis.cst || cst === '49' || cst === '99';
        if (
          !isSupportedContributionCst(saved.pisCst) ||
          !isSupportedContributionCst(saved.cofinsCst) ||
          !isSupportedContributionCst(productFiscal.pisCst) ||
          !isSupportedContributionCst(productFiscal.cofinsCst)
        )
          throw new Error('Exceção de PIS/COFINS exige regra específica.');
        return {
          decisionId: `hml-real-item-${index + 1}`,
          ruleSetVersion: HML_NORMAL_SALE_RULESET_VERSION,
          effectiveAt: contribution.confirmedAt,
          inputFacts: {
            orderId: snapshot.order.id,
            itemNumber: index + 1,
            environment: 2,
            issuerCrt: '1',
            recipientMunicipalitySource: 'IBGE',
            recipientMunicipalityCode: code,
          },
          result: {
            ...selected,
            csosnSource: csosn.source,
            configurationVersion: configuration.version,
            pisCst: contribution.pis.cst,
            cofinsCst: contribution.cofins.cst,
            modelDecision,
          },
          reason: modelDecision.reason,
          approver: 'operator_instruction_real_orders_hml_only',
        };
      });
      const determinedItems = composition.products.map(
        ({ item, vProdCents, vDescCents }, index): DeterminedFiscalItem => {
          const selected = selections[String(index + 1)];
          return {
            itemNumber: index + 1,
            product: {
              code: String(item.productId || item.orderItemId || `ITEM-${index + 1}`).slice(0, 60),
              description: required(item.description, 'Descrição comercial'),
              gtin: 'SEM GTIN',
              quantity: item.quantity,
              unitValue: vProdCents / 100 / item.quantity,
              gross: vProdCents / 100,
              discount: vDescCents / 100,
              freight: index === 0 ? freight / 100 : 0,
              insurance: 0,
              otherExpenses: index === 0 ? composition.vOutroCents / 100 : 0,
            },
            classification: {
              ncm: selected.ncm,
              cfop: selected.cfop,
              origin: selected.origem,
              cest: selected.cest || undefined,
              unit: 'UN',
            },
            taxes: [
              {
                group: 'ICMS' as const,
                codeSystem: 'CSOSN' as const,
                code: selected.csosn,
                values: { vICMS: 0 },
                decisionId: traces[index].decisionId,
              },
              {
                group: 'PIS' as const,
                codeSystem: 'CST' as const,
                code: contribution.pis.cst,
                values: {
                  vBC: contribution.pis.base,
                  pPIS: contribution.pis.rate,
                  vPIS: contribution.pis.value,
                },
                decisionId: traces[index].decisionId,
              },
              {
                group: 'COFINS' as const,
                codeSystem: 'CST' as const,
                code: contribution.cofins.cst,
                values: {
                  vBC: contribution.cofins.base,
                  pCOFINS: contribution.cofins.rate,
                  vCOFINS: contribution.cofins.value,
                },
                decisionId: traces[index].decisionId,
              },
            ],
            decisions: [traces[index]],
          };
        }
      );
      const products = composition.products.reduce((sum, item) => sum + item.vProdCents, 0);
      const discount = composition.products.reduce((sum, item) => sum + item.vDescCents, 0);
      const invoice = products - discount + freight + composition.vOutroCents;
      if (!Array.isArray(data.payments) || !data.payments.length)
        throw new Error('Pagamentos comerciais ausentes.');
      const payments = data.payments.map((raw) => {
        const payment = obj(raw);
        const method = normalize(required(payment.method, 'Meio de pagamento'));
        const code = method.includes('PIX')
          ? '17'
          : method.includes('CREDITO') || method.includes('CREDIT')
            ? '03'
            : method.includes('DEBITO') || method.includes('DEBIT')
              ? '04'
              : method.includes('DINHEIRO') || method.includes('CASH')
                ? '01'
                : method.includes('BOLETO')
                  ? '15'
                  : undefined;
        if (!code) throw new Error('Meio de pagamento exige mapeamento fiscal específico.');
        const card =
          payment.fiscalCard ||
          ((snapshot.emissionRequest.cardNotIntegrated || (modelDecision.model === '65' && code === '17')) &&
          ['03', '04', '17'].includes(code)
            ? { integrationType: '2' }
            : undefined);
        if (
          modelDecision.model === '65' &&
          ['03', '04', '17'].includes(code) &&
          (!card ||
            !['1', '2'].includes(card.integrationType) ||
            (card.integrationType === '1' &&
              ['03', '04'].includes(code) &&
              (!/^\d{14}$/.test(card.acquirerCnpj || '') || !card.authorization)))
        )
          throw new Error(
            'Informe a integração e os dados fiscais reais do pagamento com cartão/PIX para NFC-e.'
          );
        return {
          methodCode: code,
          amount: money(payment.amount, 'Pagamento real', true) / 100,
          ...(card ? { card } : {}),
          decision: traces[0],
        };
      });
      const payment = payments.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
      if (payment !== invoice)
        throw new Error(
          'Pagamentos reais não reconciliam com produtos, descontos, serviços e frete.'
        );
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
        ruleSetVersion: HML_NORMAL_SALE_RULESET_VERSION,
        model: modelDecision.model,
        modelDecision,
        environment: 2,
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
            ? { ie: required(customer.ie, 'IE destinatário').replace(/\D/g, '') }
            : {}),
          address: recipientAddress,
        },
        operation: {
          natureOfOperation: 'VENDA DE MERCADORIA',
          direction: 'outbound',
          purpose: '1',
          destination: '1',
          presence,
          finalConsumer: modelDecision.finalConsumer ? '1' : '0',
          freightMode: resolvedTransport.modFrete,
          ...(resolvedTransporter ? { transporter: resolvedTransporter } : {}),
        },
        items: determinedItems,
        payments,
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

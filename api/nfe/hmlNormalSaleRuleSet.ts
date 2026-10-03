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
import { isValidRecipientTaxId, normalizeRecipientTaxId } from '../../shared-utils/recipientTaxId';

export const HML_NORMAL_SALE_RULESET_VERSION = 'HML_NORMAL_SALE_V1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isExplicitHmlTestOrder(orderId: string, data: Record<string, any>): boolean {
  return (
    UUID.test(orderId) &&
    data.is_test === true &&
    data.test_environment === 'homologation' &&
    data.testRunId === orderId &&
    data.test_run_id === `TEST_AUT_${orderId}`
  );
}
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
let municipalities: Promise<Array<{ id: number; nome: string }>> | undefined;
async function municipalityCode(city: string): Promise<string> {
  municipalities ||= fetch(
    'https://servicodados.ibge.gov.br/api/v1/localidades/estados/41/municipios',
    { signal: AbortSignal.timeout(10000) }
  )
    .then(async (response) => {
      if (!response.ok) throw new Error('Consulta oficial IBGE indisponível.');
      const data = await response.json();
      if (
        !Array.isArray(data) ||
        data.some((item) => !Number.isInteger(item.id) || typeof item.nome !== 'string')
      )
        throw new Error('Resposta oficial IBGE inválida.');
      return data as Array<{ id: number; nome: string }>;
    })
    .catch((error) => {
      municipalities = undefined;
      throw error;
    });
  const match = (await municipalities!).find((item) => normalize(item.nome) === normalize(city));
  if (!match)
    throw new Error('Município do destinatário não encontrado na fonte oficial IBGE do PR.');
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
  const ids = [
    ...new Set(
      items.map((item) => item.productId).filter((id): id is string => typeof id === 'string')
    ),
  ];
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

/** Limited HML matrix: real internal resale, CRT1, supported zero own-ICMS groups. */
export async function createHmlNormalSaleRuleSet(
  facts: FiscalSnapshotCandidate,
  configuration: HmlCsosnConfiguration
) {
  const inputs = obj(facts.fiscalInputs);
  const contribution = obj(inputs.contributionDecision);
  // Share the existing issuer/CRT/environment/contribution approval gates.
  const context = createHmlTechnicalRuleSet(facts, contribution, configuration);
  const customer = obj(inputs.customer);
  const rawAddress = facts.order.data.shipping && obj(facts.order.data.shipping).deliveryAddress;
  const parsedAddress =
    typeof customer.address === 'string' ? JSON.parse(customer.address) : customer.address;
  const address = obj(rawAddress && typeof rawAddress === 'object' ? rawAddress : parsedAddress);
  const city = required(address.city, 'Município real do destinatário');
  const uf = required(address.state || address.uf, 'UF real do destinatário');
  if (uf !== 'PR') throw new Error('Operação interestadual exige matriz fiscal específica.');
  const code = await municipalityCode(city);
  const recipientAddress: FiscalAddress = {
    street: required(address.street, 'Logradouro real'),
    number: required(String(address.number || ''), 'Número real'),
    district: required(address.neighborhood || address.bairro, 'Bairro real'),
    municipality: city,
    municipalityCode: code,
    uf,
    postalCode: required(address.zipCode || address.cep || address.postalCode, 'CEP real').replace(
      /[-.]/g,
      ''
    ),
  };
  if (!/^\d{8}$/.test(recipientAddress.postalCode)) throw new Error('CEP real inválido.');
  const cpfCnpj = required(
    customer.cpfCnpj,
    'CPF/CNPJ do destinatário é obrigatório para emitir NF-e modelo 55.'
  );
  if (!isValidRecipientTaxId(cpfCnpj))
    throw new Error('CPF/CNPJ do destinatário inválido para emitir NF-e modelo 55.');
  if (normalizeRecipientTaxId(cpfCnpj).length !== 11)
    throw new Error(
      'Destinatário PJ exige condição de contribuinte revisada; este cenário cobre pessoa física.'
    );

  return {
    ...context,
    version: HML_NORMAL_SALE_RULESET_VERSION,
    approvedBy: 'operator_instruction_real_orders_hml_only',
    determine: (snapshot: FiscalSnapshotCandidate, hash: string): FiscalDocument => {
      const data = snapshot.order.data;
      const hasTestMarker =
        data.is_test !== undefined ||
        data.test_environment !== undefined ||
        data.testRunId !== undefined ||
        data.test_run_id !== undefined;
      const isTestOrder = isExplicitHmlTestOrder(snapshot.order.id, data);
      if (
        snapshot.emissionRequest.environment !== 2 ||
        snapshot.order.deleted ||
        (hasTestMarker && !isTestOrder) ||
        snapshot.order.type !== 'sale' ||
        ['draft', 'cancelled', 'cancelado'].includes(snapshot.order.status.toLowerCase())
      )
        throw new Error('Pedido real não elegível para homologação.');
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
      const traces: FiscalDecisionTrace[] = composition.products.map(({ item }, index) => {
        const selected = selections[String(index + 1)];
        const saved = (item as any).fiscal || {};
        const productFiscal = catalog[item.productId || ''] || {};
        for (const fiscal of [saved, productFiscal]) {
          if (
            (fiscal.cfop && fiscal.cfop !== '5102') ||
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
          saved: saved.cst,
          catalog: productFiscal.cst,
        });
        if (selected.csosn !== csosn.csosn)
          throw new Error('CSOSN confirmado diverge da escolha fiscal preparada.');
        if (!ZERO_OWN_ICMS_CSOSNS.includes(csosn.csosn) || selected.cfop !== '5102')
          throw new Error(
            'CSOSN ou CFOP escolhido exige matriz fiscal específica; nenhuma escolha foi substituída.'
          );
        if (
          (saved.pisCst && saved.pisCst !== contribution.pis.cst) ||
          (saved.cofinsCst && saved.cofinsCst !== contribution.cofins.cst) ||
          (productFiscal.pisCst && productFiscal.pisCst !== contribution.pis.cst) ||
          (productFiscal.cofinsCst && productFiscal.cofinsCst !== contribution.cofins.cst)
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
          },
          reason:
            'Pedido real, venda interna a consumidor pessoa física em homologação; campos confirmados preservados.',
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
        return {
          methodCode: code,
          amount: money(payment.amount, 'Pagamento real', true) / 100,
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
      return {
        snapshotHash: hash,
        ruleSetVersion: HML_NORMAL_SALE_RULESET_VERSION,
        model: '55',
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
          name: required(customer.fullName, 'Nome real'),
          cpfCnpj: normalizeRecipientTaxId(cpfCnpj),
          ieIndicator: '9',
          address: recipientAddress,
        },
        operation: {
          natureOfOperation: 'VENDA DE MERCADORIA',
          direction: 'outbound',
          purpose: '1',
          destination: '1',
          presence: '1',
          finalConsumer: '1',
          freightMode: freight ? '0' : '9',
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

import type { SupabaseClient } from '@supabase/supabase-js';
import { parseFiscalItemSelections } from '../../../shared-utils/fiscalItemSelections';
import type { FiscalDatabase } from '../fiscalDatabaseTypes';
import type { FiscalJsonValue, FiscalSnapshotCandidate } from '../fiscalSnapshot';
import { obj } from './values';
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

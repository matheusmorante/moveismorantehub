import type { Item } from '../../types/items.type.js';

const toCents = (value: number) => Math.round((Number(value) || 0) * 100);
const fromCents = (value: number) => value / 100;
const normalizeLabel = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim();
const formatBrl = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(cents / 100)
    .replace(/\u00a0/g, ' ');
const normalizeInfCplText = (value: string) =>
  value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\u0009\u000a\u000d\u0020-\u00ff]/g, '');

export const getItemNetCents = (item: Item) => {
  const unitPrice = Number(item.unitPrice) || 0;
  const quantity = Number(item.quantity) || 1;
  const unitDiscount = Number(item.unitDiscount) || 0;
  const fixedDiscount =
    item.discountType === 'fixed' ? unitDiscount : (unitPrice * unitDiscount) / 100;
  return toCents(Math.max(0, unitPrice - fixedDiscount) * quantity);
};

export interface FiscalServiceLine {
  item: Item;
  amountCents: number;
  reason: 'missing_product_link' | 'invalid_product_quantity';
}

export interface FiscalProductItem {
  item: Item;
  itemIndex: number;
  vProdCents: number;
  vDescCents: number;
  incorporatedServices: Array<{
    description: string;
    allocatedCents: number;
    totalServiceCents: number;
  }>;
}

export interface ServiceFiscalComposition {
  products: FiscalProductItem[];
  /** Service values are included in linked products; they never go to vOutro. */
  vOutroCents: number;
  pendingServices: FiscalServiceLine[];
  additionalInformation?: string;
  incorporatedServiceCents: number;
}

export type ServiceFiscalCompositionMode = '55' | '65';

type ProductTarget = { item: Item; quantity: number };

function allocateCentsByQuantity(amountCents: number, targets: ProductTarget[]): number[] {
  const totalQuantity = targets.reduce((sum, target) => sum + target.quantity, 0);
  const exactShares = targets.map((target) => (amountCents * target.quantity) / totalQuantity);
  const shares = exactShares.map(Math.floor);
  let remainingCents = amountCents - shares.reduce((sum, share) => sum + share, 0);

  const byLargestRemainder = exactShares
    .map((exact, index) => ({ index, remainder: exact - shares[index] }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index);

  for (let index = 0; index < remainingCents; index += 1) {
    shares[byLargestRemainder[index % byLargestRemainder.length].index] += 1;
  }

  return shares;
}

function linkedProductIds(service: Item): { ids: string[]; malformed: boolean } {
  const configuredIds =
    Array.isArray(service.linkedProductOrderItemIds) && service.linkedProductOrderItemIds.length
      ? service.linkedProductOrderItemIds
      : service.linkedProductOrderItemId
        ? [service.linkedProductOrderItemId]
        : [];
  const ids = configuredIds
    .filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
    .map((id) => id.trim());
  return { ids: [...new Set(ids)], malformed: ids.length !== configuredIds.length };
}

export function servicesMissingProductLinksMessage(
  composition: Pick<ServiceFiscalComposition, 'pendingServices'>
): string {
  if (!composition.pendingServices.length) return '';
  const issues = composition.pendingServices.map(({ item, amountCents, reason }) => {
    const name = normalizeLabel(item.description) || 'Serviço sem descrição';
    const amount = formatBrl(amountCents);
    return reason === 'invalid_product_quantity'
      ? `“${name}” (${amount}) está vinculado a um produto com quantidade inválida.`
      : `“${name}” (${amount}) precisa estar vinculado a pelo menos um produto do pedido.`;
  });
  return `A nota fiscal não pode ser preparada enquanto houver serviços sem produto válido vinculado: ${issues.join(' ')}`;
}

export function assertServiceFiscalCompositionReady(
  composition: ServiceFiscalComposition
): void {
  const missingProductLinksMessage = servicesMissingProductLinksMessage(composition);
  if (missingProductLinksMessage) throw new Error(missingProductLinksMessage);
}

/**
 * Creates a fiscal-only view of the order. Each service is distributed across
 * every linked product line in proportion to its quantity, with cent remainders
 * assigned deterministically. Commercial item prices are never modified.
 */
export function composeServiceFiscalValues(
  items: Item[] = [],
  mode: ServiceFiscalCompositionMode = '55'
): ServiceFiscalComposition {
  const products = items
    .map((item, itemIndex) => ({ item, itemIndex }))
    .filter(({ item }) => item.itemType !== 'service');
  const services = items.filter((item) => item.itemType === 'service');
  const linkedServiceCents = new Map<string, number>();
  const linkedServiceLines = new Map<string, FiscalProductItem['incorporatedServices']>();
  const pendingServices: FiscalServiceLine[] = [];
  let incorporatedServiceCents = 0;

  for (const service of services) {
    const netCents = getItemNetCents(service);
    if (netCents <= 0) continue;

    const { ids, malformed } = linkedProductIds(service);
    const targets = ids
      .map((id) => products.find(({ item }) => item.orderItemId === id)?.item)
      .filter((item): item is Item => Boolean(item))
      .sort(
        (left, right) =>
          products.findIndex(({ item }) => item === left) -
          products.findIndex(({ item }) => item === right)
      );

    if (!ids.length || malformed || targets.length !== ids.length) {
      pendingServices.push({ item: service, amountCents: netCents, reason: 'missing_product_link' });
      continue;
    }

    const targetsWithQuantity = targets.map((item) => ({ item, quantity: Number(item.quantity) }));
    if (
      targetsWithQuantity.some(
        ({ quantity }) => !Number.isFinite(quantity) || quantity <= 0
      )
    ) {
      pendingServices.push({ item: service, amountCents: netCents, reason: 'invalid_product_quantity' });
      continue;
    }

    const allocations = allocateCentsByQuantity(netCents, targetsWithQuantity);
    targetsWithQuantity.forEach(({ item }, index) => {
      const productId = item.orderItemId!;
      const allocatedCents = allocations[index];
      if (allocatedCents <= 0) return;

      linkedServiceCents.set(
        productId,
        (linkedServiceCents.get(productId) || 0) + allocatedCents
      );
      const lines = linkedServiceLines.get(productId) || [];
      lines.push({
        description: normalizeLabel(service.description),
        allocatedCents,
        totalServiceCents: netCents,
      });
      linkedServiceLines.set(productId, lines);
    });
    incorporatedServiceCents += netCents;
  }

  const fiscalProducts = products.map(({ item, itemIndex }) => {
    const quantity = Number(item.quantity) || 1;
    const grossCents = toCents((Number(item.unitPrice) || 0) * quantity);
    const netCents = getItemNetCents(item);
    const incorporatedServices = item.orderItemId
      ? linkedServiceLines.get(item.orderItemId) || []
      : [];
    return {
      item,
      itemIndex,
      vProdCents:
        grossCents + (item.orderItemId ? linkedServiceCents.get(item.orderItemId) || 0 : 0),
      vDescCents: Math.max(0, grossCents - netCents),
      incorporatedServices,
    };
  });

  const invoiceModel = mode === '65' ? 'NFC-e' : 'NF-e';
  const additionalInformation = fiscalProducts
    .flatMap(({ item, incorporatedServices }) =>
      incorporatedServices.map(({ description, allocatedCents, totalServiceCents }) =>
        normalizeInfCplText(
          `O valor fiscal do item "${normalizeLabel(item.description)}" inclui ${formatBrl(allocatedCents)} do rateio do serviço "${description || 'Serviço sem descrição'}" (valor total do serviço no pedido: ${formatBrl(totalServiceCents)}). O rateio considera as quantidades dos produtos vinculados e é matemático; não afirma que o serviço foi executado em cada unidade. O serviço não é cobrado novamente em separado na ${invoiceModel}.`
        )
      )
    )
    .join('; ');
  if (additionalInformation.length > 5000)
    throw new Error('O detalhamento dos serviços incorporados excede o limite de informações adicionais da nota fiscal.');

  return {
    products: fiscalProducts,
    vOutroCents: 0,
    pendingServices,
    ...(additionalInformation ? { additionalInformation } : {}),
    incorporatedServiceCents,
  };
}

export const fiscalMoneyFromCents = fromCents;

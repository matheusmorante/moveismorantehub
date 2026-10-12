export const CUSTOMER_ORDER_PAGE_SIZE = 500;

export type CustomerOrderCountRow = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
};

export type CustomerReference = {
  id?: string;
  fullName?: string;
};

export function buildCustomerOrderMatchFilter(customers: CustomerReference[]): string | null {
  const customerIds = customers
    .map((customer) => customer.id)
    .filter((id): id is string => Boolean(id));
  const names = new Map<string, string>();
  customers.forEach((customer) => {
    const fullName = customer.fullName?.trim();
    if (fullName) names.set(fullName.toLowerCase(), fullName);
  });

  const escapeLikeValue = (value: string) =>
    value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  const customerFilters = [
    ...(customerIds.length ? [`customer_id.in.(${customerIds.join(',')})`] : []),
    ...Array.from(names.values()).map(
      (name) => `customer_name.ilike."${escapeLikeValue(name)}"`
    ),
  ];

  if (!customerFilters.length) return null;
  return `and(or(deleted.is.null,deleted.eq.false),or(${customerFilters.join(',')}))`;
}

export async function fetchPaginatedRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: unknown | null;
  }>,
  pageSize = CUSTOMER_ORDER_PAGE_SIZE,
  shouldContinue: () => boolean = () => true
): Promise<T[] | null> {
  const rows: T[] = [];
  for (let from = 0; shouldContinue(); from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error || !data) return null;
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
  return null;
}

export function calculateCustomerOrderCounts(
  customers: CustomerReference[],
  rows: CustomerOrderCountRow[]
): Record<string, number> {
  const personById = new Map<string, string>();
  const personByName = new Map<string, string>();
  customers.forEach((customer) => {
    if (customer.id) personById.set(String(customer.id), String(customer.id));
    if (customer.id && customer.fullName) {
      personByName.set(customer.fullName.trim().toLowerCase(), String(customer.id));
    }
  });

  const counts: Record<string, number> = {};
  rows.forEach((row) => {
    const customerId = row.customer_id ? String(row.customer_id) : undefined;
    const customerName = row.customer_name?.trim().toLowerCase();
    const matchedId =
      customerId && personById.has(customerId)
        ? customerId
        : customerName
          ? personByName.get(customerName)
          : undefined;

    if (matchedId) counts[matchedId] = (counts[matchedId] || 0) + 1;
  });
  return counts;
}

import type { ScopeSupplier } from '../hooks/useInventoryScopeBuilder';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export const filterScopeSuppliers = (suppliers: readonly ScopeSupplier[], search: string): ScopeSupplier[] => {
  const query = normalize(search.trim());
  return query ? suppliers.filter(supplier => normalize(supplier.full_name).includes(query)) : [...suppliers];
};

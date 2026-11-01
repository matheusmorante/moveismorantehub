import { useState, useMemo } from 'react';
import type { AuditItem } from './useInventoryAuditWorkflow';
import { matchesSearchText } from '../../../../../../shared-utils/searchText';

export type InventoryFilter = 'all' | 'uncounted' | 'counted' | 'divergent';
export type OperationFilter = InventoryFilter;

export const useInventoryOperation = (items: readonly AuditItem[]) => {
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === 'uncounted' && item.physicalCount !== null) return false;
      if (filter === 'counted' && item.physicalCount === null) return false;
      if (
        filter === 'divergent' &&
        (item.physicalCount === null || item.physicalCount === item.systemStock)
      )
        return false;
      if (search) {
        return matchesSearchText(item.name, search) || matchesSearchText(item.supplierNames, search);
      }
      return true;
    });
  }, [items, filter, search]);

  return {
    filter,
    setFilter,
    search,
    setSearch,
    filteredItems,
  };
};

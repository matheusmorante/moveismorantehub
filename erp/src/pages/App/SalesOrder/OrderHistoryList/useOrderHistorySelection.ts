import { useState } from 'react';
import type Order from '../../../types/order.type';

export const useOrderHistorySelection = () => {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedOrders((previous) =>
      previous.includes(id)
        ? previous.filter((selectedId) => selectedId !== id)
        : [...previous, id]
    );
  };

  const selectAll = (orders: Order[]) => {
    const allIdsOnPage = orders.map((order) => order.id!).filter(Boolean);
    const allSelected = allIdsOnPage.every((id) => selectedOrders.includes(id));
    if (allSelected) {
      setSelectedOrders((previous) => previous.filter((id) => !allIdsOnPage.includes(id)));
    } else {
      const newSelections = allIdsOnPage.filter((id) => !selectedOrders.includes(id));
      setSelectedOrders((previous) => [...previous, ...newSelections]);
    }
  };

  const clearSelection = () => setSelectedOrders([]);

  return { selectedOrders, setSelectedOrders, toggleSelection, selectAll, clearSelection };
};

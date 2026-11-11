import { useState, useEffect, useCallback, useRef } from 'react';
import type Product from '@/pages/types/product.type';
import type Person from '@/pages/types/person.type';
import {
  searchInventoryAuditEmployees,
  syncMissingEmployeesFromProfiles,
} from '@/pages/utils/personService';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import {
  ensureOfflineInventoryCatalogSynced,
  getOfflineInventoryCatalogProducts,
  getOfflineInventorySuppliers,
} from '../services/offlineInventoryCatalog';
import { groupOfflineInventoryProducts } from '../services/groupOfflineInventoryProducts';

export const useInventoryAuditData = (isOpen: boolean) => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Person[]>([]);
  const [employees, setEmployees] = useState<Person[]>([]);
  const [catalogSyncedAt, setCatalogSyncedAt] = useState<string | null>(null);
  const employeeSyncPromise = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setEmployees([]);
    employeeSyncPromise.current = withTimeout(
      syncMissingEmployeesFromProfiles(),
      15_000,
      false,
      'inventario:sincronizar-responsaveis'
    ).catch((error: unknown) => {
      if (active) console.warn('Não foi possível atualizar responsáveis do inventário:', error);
    });
    void (async () => {
      const loadIndex = async () => {
        const [catalogProducts, catalogSuppliers] = await Promise.all([
          getOfflineInventoryCatalogProducts(),
          getOfflineInventorySuppliers(),
        ]);
        if (active) {
          setAllProducts(groupOfflineInventoryProducts(catalogProducts));
          setSuppliers(catalogSuppliers as Person[]);
        }
      };
      await loadIndex();
      const syncResult = await ensureOfflineInventoryCatalogSynced();
      if (active) setCatalogSyncedAt(syncResult.syncedAt);
      if (syncResult.success) await loadIndex();
    })().catch((error) => console.warn('[Inventory catalog] Cache local indisponível:', error));
    return () => {
      active = false;
    };
  }, [isOpen]);

  const searchEmployees = useCallback(
    async (search: string, signal: AbortSignal) => {
      await employeeSyncPromise.current;
      if (signal.aborted) return [];
      return searchInventoryAuditEmployees(search, signal);
    },
    []
  );

  const rememberEmployee = useCallback((employee: Person) => {
    setEmployees((current) => {
      const existingIndex = current.findIndex((item) => String(item.id) === String(employee.id));
      if (existingIndex < 0) return [...current, employee];
      return current.map((item, index) => index === existingIndex ? employee : item);
    });
  }, []);

  const getSupplierNames = useCallback(
    (product: Product) => {
      const supplierIds = [
        product.mainSupplierId,
        product.supplierId,
        ...(product.supplierIds || []),
      ]
        .filter(Boolean)
        .map(String);

      const names = supplierIds
        .map((supplierId) => {
          const supplier = suppliers.find((person) => String(person.id) === supplierId);
          return supplier?.tradeName || supplier?.fullName || supplier?.nickname;
        })
        .filter(Boolean) as string[];

      return [...new Set(names)].join(' / ') || 'Fábrica não informada';
    },
    [suppliers]
  );

  return {
    allProducts,
    suppliers,
    employees,
    getSupplierNames,
    catalogSyncedAt,
    searchEmployees,
    rememberEmployee,
  };
};

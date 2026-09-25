import { useState, useEffect, useCallback } from "react";
import type Product from "@/pages/types/product.type";
import type Person from "@/pages/types/person.type";
import { subscribeToProducts } from '@/pages/utils/productService';
import { fetchPersons } from '@/pages/utils/personService';
import { ensureOfflineInventoryCatalogSynced, getOfflineInventoryCatalogProducts, getOfflineInventorySuppliers } from '../services/offlineInventoryCatalog';

export const useInventoryAuditData = (isOpen: boolean) => {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [employees, setEmployees] = useState<Person[]>([]);
    const [catalogSyncedAt, setCatalogSyncedAt] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const unsubscribe = subscribeToProducts((data) => {
            const fresh = data.filter((product) => product.itemType === 'product' && !product.deleted);
            setAllProducts(previous => {
                const byId = new Map(fresh.map(product => [String(product.id), product]));
                for (const cached of previous) {
                    const current = byId.get(String(cached.id));
                    if (!current) { byId.set(String(cached.id), cached); continue; }
                    const variations = new Map((current.variations || []).map(variation => [String(variation.id), variation]));
                    for (const variation of cached.variations || []) if (!variations.has(String(variation.id))) variations.set(String(variation.id), variation);
                    byId.set(String(current.id), { ...current, variations: [...variations.values()] });
                }
                return [...byId.values()];
            });
        }, true);
        Promise.all([fetchPersons('suppliers'), fetchPersons('employees')])
            .then(([supplierList, employeeList]) => {
                setSuppliers(supplierList);
                setEmployees(employeeList);
            })
            .catch((err: unknown) => {
                console.error("Erro ao carregar pessoas para inventário:", err);
            });
        void (async () => {
            const syncResult = await ensureOfflineInventoryCatalogSynced();
            setCatalogSyncedAt(syncResult.syncedAt);
            const [catalogProducts, catalogSuppliers] = await Promise.all([
                getOfflineInventoryCatalogProducts(), getOfflineInventorySuppliers(),
            ]);
            setAllProducts(current => {
                const byId = new Map(current.map(product => [String(product.id), product]));
                for (const cached of catalogProducts) {
                    const existing = byId.get(String(cached.id));
                    if (!existing) {
                        byId.set(String(cached.id), cached as Product);
                        continue;
                    }
                    const variations = new Map((existing.variations || []).map(variation => [String(variation.id), variation]));
                    for (const incoming of cached.variations || []) {
                        const previous = variations.get(String(incoming.id));
                        variations.set(String(incoming.id), previous ? { ...previous, ...incoming } : incoming);
                    }
                    byId.set(String(cached.id), {
                        ...existing,
                        active: cached.active,
                        code: cached.code || existing.code,
                        unit: cached.unit || existing.unit,
                        mainSupplierId: cached.mainSupplierId || existing.mainSupplierId,
                        supplierId: cached.supplierId || existing.supplierId,
                        supplierIds: cached.supplierIds || existing.supplierIds,
                        variations: [...variations.values()],
                    });
                }
                return [...byId.values()];
            });
            setSuppliers(current => {
                const byId = new Map(current.map(person => [String(person.id), person]));
                for (const cached of catalogSuppliers) if (!byId.has(String(cached.id))) byId.set(String(cached.id), cached as Person);
                return [...byId.values()];
            });
        })().catch(error => console.warn('[Inventory catalog] Cache local indisponível:', error));
        return () => unsubscribe();
    }, [isOpen]);

    const getSupplierNames = useCallback((product: Product) => {
        const supplierIds = [
            product.mainSupplierId,
            product.supplierId,
            ...(product.supplierIds || []),
        ].filter(Boolean).map(String);
        
        const names = supplierIds.map((supplierId) => {
            const supplier = suppliers.find((person) => String(person.id) === supplierId);
            return supplier?.tradeName || supplier?.fullName || supplier?.nickname;
        }).filter(Boolean) as string[];

        return [...new Set(names)].join(' / ') || 'Fábrica não informada';
    }, [suppliers]);

    return { allProducts, suppliers, employees, getSupplierNames, catalogSyncedAt };
};

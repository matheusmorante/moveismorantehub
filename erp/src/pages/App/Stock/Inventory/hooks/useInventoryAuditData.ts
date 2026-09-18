import { useState, useEffect, useCallback } from "react";
import type Product from "@/pages/types/product.type";
import type Person from "@/pages/types/person.type";
import { subscribeToProducts } from '@/pages/utils/productService';
import { fetchPersons } from '@/pages/utils/personService';

export const useInventoryAuditData = (isOpen: boolean) => {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [employees, setEmployees] = useState<Person[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        const unsubscribe = subscribeToProducts((data) => {
            setAllProducts(data.filter((product) => product.itemType === 'product' && !product.deleted));
        }, true);
        Promise.all([fetchPersons('suppliers'), fetchPersons('employees')])
            .then(([supplierList, employeeList]) => {
                setSuppliers(supplierList);
                setEmployees(employeeList);
            })
            .catch((err: unknown) => {
                console.error("Erro ao carregar pessoas para inventário:", err);
            });
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

    return { allProducts, suppliers, employees, getSupplierNames };
};

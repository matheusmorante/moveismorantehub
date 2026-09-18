import React from 'react';
import type Person from "@/pages/types/person.type";
import SupplierAutocomplete from "@/components/SupplierAutocomplete";
import InventoryResponsibleSelect from "../components/InventoryResponsibleSelect";
import type { InventoryScopeType } from '../modals/InventoryScopeModal';


interface InventoryScopeConfigFormProps {
    readonly scopeType: InventoryScopeType | null;
    readonly inventoryName: string;
    readonly setInventoryName: (val: string) => void;
    readonly blindCount: boolean;
    readonly setBlindCount: (val: boolean) => void;
    readonly selectedSupplierId: string;
    readonly setSelectedSupplierId: (val: string) => void;
    readonly selectedResponsibleId: string;
    readonly setSelectedResponsibleId: (val: string) => void;
    readonly responsibleError: boolean;
    readonly setResponsibleError: (val: boolean) => void;
    readonly suppliers: readonly Person[];
    readonly employees: readonly Person[];
}

export const InventoryScopeConfigForm: React.FC<InventoryScopeConfigFormProps> = ({
    scopeType,
    inventoryName,
    setInventoryName,
    blindCount,
    setBlindCount,
    selectedSupplierId,
    setSelectedSupplierId,
    selectedResponsibleId,
    setSelectedResponsibleId,
    responsibleError,
    setResponsibleError,
    suppliers,
    employees,
}) => {

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-5 shadow-sm">
                {scopeType === 'supplier' && (
                    <div className="space-y-4 relative z-20">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Fornecedor
                            </label>
                            <SupplierAutocomplete
                                suppliers={suppliers as Person[]}
                                selectedSupplierId={selectedSupplierId}
                                onSelect={(id) => {
                                    setSelectedSupplierId(id);
                                    const s = suppliers.find(x => String(x.id) === id);
                                    if (s) setInventoryName(`Inventário ${s.tradeName || s.fullName}`);
                                }}
                                placeholder="Buscar fornecedor..."
                                hideLabel
                            />
                        </div>
                    </div>
                )}



                
                <div className="relative z-10 pt-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Responsável pelo Inventário
                    </label>
                    <InventoryResponsibleSelect
                        employees={employees}
                        value={selectedResponsibleId}
                        hasError={responsibleError}
                        onChange={(val) => { setSelectedResponsibleId(val); setResponsibleError(false); }}
                    />
                </div>


            </div>
        </div>
    );
};

import { useState, useCallback, useRef } from 'react';
import { supabase } from '../../../../services/supabaseClient';
import { Alert } from 'react-native';
import type { ScopeConfiguration } from './useInventoryScopeBuilder';

export interface AuditItem {
    id: string;
    key: string;
    productId: string;
    variationId?: string;
    name: string;
    supplierNames: string;
    systemStock: number;
    physicalCount: number | null;
    unit: string;
}

export const useInventoryAuditWorkflow = (
    userProfile: { id: string; full_name?: string } | null,
    onClose: () => void
) => {
    const [view, setView] = useState<'scope' | 'operation' | 'review'>('scope');
    const [items, setItems] = useState<AuditItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [scopeConfig, setScopeConfig] = useState<{ name: string, blindCount: boolean, responsibleId: string } | null>(null);
    
    const draftRef = useRef<{ id?: string; code?: string; markerMoveId?: string; date?: string }>({});

    const createItemId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

    const handleConfirmScope = async (config: ScopeConfiguration) => {
        const initialItems = config.itemsSnapshot.map(snapshot => ({
            id: createItemId(),
            key: `${snapshot.productId}-${snapshot.variationId || 'main'}`,
            productId: snapshot.productId,
            variationId: snapshot.variationId,
            name: snapshot.name,
            supplierNames: snapshot.supplierNames,
            systemStock: snapshot.systemStock,
            physicalCount: null,
            unit: snapshot.unit,
        }));

        setItems(initialItems);
        setScopeConfig({
            name: config.name,
            blindCount: config.blindCount,
            responsibleId: config.responsibleId,
        });
        
        draftRef.current.code = `${Date.now()}`;
        draftRef.current.date = new Date().toISOString();
        
        setView('operation');
    };

    const handleFinalize = async (itemsWithAdjustment: Array<AuditItem & { reconciledExpected: number, difference: number }>) => {
        if (!scopeConfig || !userProfile) {
            Alert.alert('Atenção', 'Sessão ou usuário inválidos.');
            return;
        }

        setIsSaving(true);
        try {
            const auditId = draftRef.current.id || Math.random().toString(36).slice(2);
            const code = draftRef.current.code || `${Date.now()}`;
            const completionDate = new Date().toISOString();
            
            const auditObservation = JSON.stringify({
                inventoryAudit: true,
                inventoryCode: code,
                status: 'completed',
                name: scopeConfig.name,
                blindCount: scopeConfig.blindCount,
                responsibleId: scopeConfig.responsibleId,
                responsibleName: userProfile.full_name || 'Usuário Logado',
                items: items.map(({ productId, variationId, name, systemStock, physicalCount }) => ({ productId, variationId, name, systemStock, physicalCount })),
            });

            // Insere o Marker inicial que representa a conclusão
            await supabase.from('inventory_moves').insert({
                product_id: items[0]?.productId,
                type: 'adjustment',
                quantity: 0,
                date: completionDate,
                label: `Inventário #${code}`,
                observation: auditObservation,
                related_entity_id: auditId,
            });

            // Lança os ajustes individuais
            const movesToInsert = itemsWithAdjustment.map(item => ({
                product_id: item.productId,
                product_description: item.name,
                type: 'adjustment',
                quantity: 0, // Como no ERP, ajustes reais acontecem no trigger ou usando targetStock
                date: completionDate,
                label: `Ajuste lançado pelo inventário #${code}`,
                observation: JSON.stringify({ 
                    note: `Saldo definido pelo inventário #${code}`, 
                    targetStock: item.physicalCount, 
                    source: 'inventory_audit' 
                }),
                related_entity_id: auditId,
            }));

            if (movesToInsert.length > 0) {
                const { error } = await supabase.from('inventory_moves').insert(movesToInsert);
                if (error) throw error;
            }

            Alert.alert('Sucesso', `Inventário #${code} finalizado! ${items.length} produto(s) contados e ${itemsWithAdjustment.length} ajuste(s) lançados no estoque. ✨`, [
                { text: 'OK', onPress: onClose }
            ]);
        } catch (error: any) {
            console.error("Erro ao salvar inventário:", error);
            Alert.alert('Erro', 'Não foi possível processar o inventário. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    return {
        view,
        setView,
        items,
        setItems,
        scopeConfig,
        draftRef,
        isSaving,
        handleConfirmScope,
        handleFinalize,
    };
};

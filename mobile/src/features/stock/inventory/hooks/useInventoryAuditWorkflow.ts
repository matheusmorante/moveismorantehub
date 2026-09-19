import { useState, useCallback, useRef } from 'react';
import { getNextInventoryCode, saveInventoryMove, updateInventoryMove } from '../../../../services/stockService';
import { supabase } from '../../../../services/supabaseClient';
import { Alert, Platform } from 'react-native';
import type { ScopeConfiguration } from './useInventoryScopeBuilder';

export interface AuditItem {
    id: string;
    key: string;
    productId: string;
    variationId?: string;
    name: string;
    supplierNames: string;
    assignedSupplier: string;
    systemStock: number;
    physicalCount: number | null;
    unit: string;
}

export const useInventoryAuditWorkflow = (
    userProfile: { id: string; full_name?: string; fullName?: string } | null,
    onClose: () => void
) => {
    const [view, setView] = useState<'scope' | 'operation' | 'review'>('scope');
    const [items, setItems] = useState<AuditItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [scopeConfig, setScopeConfig] = useState<{ name: string, blindCount: boolean, hasStages: boolean, responsibleId: string, scopeType?: string } | null>(null);
    
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
            assignedSupplier: snapshot.supplierNames.split(' / ')[0] || 'Sem fornecedor',
            systemStock: snapshot.systemStock,
            physicalCount: null,
            unit: snapshot.unit,
        }));

        setItems(initialItems);
        setScopeConfig({
            name: config.name,
            blindCount: config.blindCount,
            hasStages: config.hasStages ?? false,
            responsibleId: config.responsibleId,
            scopeType: config.type,
        });

        
        const code = await getNextInventoryCode();
        draftRef.current.code = code;
        draftRef.current.date = new Date().toISOString();
        
        setView('operation');
    };

    const handleFinalize = async (itemsWithAdjustment: Array<AuditItem & { reconciledExpected: number, difference: number }>) => {
        console.log('UI LOG: handleFinalize called!');
        if (!scopeConfig || !userProfile) {
            Alert.alert('Atenção', 'Sessão ou usuário inválidos.', [{ text: 'OK', onPress: onClose }]);
            return;
        }

        setIsSaving(true);
        try {
            const auditId = draftRef.current.id || Math.random().toString(36).slice(2);
            const code = draftRef.current.code || await getNextInventoryCode();
            const completionDate = new Date().toISOString();
            
            const auditObservation = JSON.stringify({
                inventoryAudit: true,
                inventoryCode: code,
                status: 'completed',
                name: scopeConfig.name,
                blindCount: scopeConfig.blindCount,
                hasStages: scopeConfig.hasStages,
                responsibleId: scopeConfig.responsibleId,
                responsibleName: userProfile.fullName || userProfile.full_name || userProfile.name || (userProfile.email ? userProfile.email.split('@')[0] : 'Usuário Desconhecido'),
                items: items.map(({ productId, variationId, name, systemStock, physicalCount, assignedSupplier }) => ({ productId, variationId, name, systemStock, physicalCount, assignedSupplier })),
            });

            // Insere o Marker inicial que representa a conclusão
            console.log('UI LOG: Inserting marker...');
            const markerRes = await supabase.from('inventory_moves').insert({
                product_id: items[0]?.productId,
                type: 'adjustment',
                quantity: 0,
                date: completionDate,
                label: `Inventário #${code}`,
                observation: auditObservation,
            });
            if (markerRes.error) throw markerRes.error;

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
            }));

            if (movesToInsert.length > 0) {
                console.log('UI LOG: Inserting moves...', movesToInsert.length);
                const { error } = await supabase.from('inventory_moves').insert(movesToInsert);
                if (error) throw error;
            }

            console.log('UI LOG: Calling Alert.alert Success');
            if (Platform.OS === 'web') {
                // Em ambiente Web/E2E, o Alert.alert não possui suporte nativo confiável para disparar callbacks em todas as versões do react-native-web.
                // Forçamos o fechamento.
                Alert.alert('Sucesso', `Inventário #${code} finalizado!`);
                onClose();
            } else {
                Alert.alert('Sucesso', `Inventário #${code} finalizado! ${items.length} produto(s) contados e ${itemsWithAdjustment.length} ajuste(s) lançados no estoque. ✨`, [
                    { text: 'OK', onPress: onClose }
                ]);
            }
            console.log('UI LOG: Alert.alert called');
        } catch (error: any) {
            console.error("Erro ao salvar inventário:", error);
            console.log('UI LOG: Calling Alert.alert Error');
            Alert.alert('Erro', 'Não foi possível processar o inventário. Tente novamente.', [{ text: 'OK', onPress: onClose }]);
        } finally {
            console.log('UI LOG: finally block');
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

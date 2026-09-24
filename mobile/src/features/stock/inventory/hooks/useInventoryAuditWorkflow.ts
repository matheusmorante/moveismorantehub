import { useState, useCallback, useRef, useEffect } from 'react';
import { getNextInventoryCode, fetchInventorySessionDetails, saveInventoryDraft, deleteInventoryDraft } from '../../../../services/stockService';
import { supabase } from '../../../../services/supabaseClient';
import { Alert, Platform } from 'react-native';
import type { ScopeConfiguration } from './useInventoryScopeBuilder';
import type { InventorySession } from '../../types/stock.types';

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
    onClose: () => void,
    initialSession?: InventorySession | null,
    copiedItems?: any[] | null
) => {
    const [view, setView] = useState<'scope' | 'operation' | 'review'>('scope');
    const [items, setItems] = useState<AuditItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [scopeConfig, setScopeConfig] = useState<{ name: string, blindCount: boolean, hasStages: boolean, responsibleId: string, scopeType?: string } | null>(null);
    
    const draftRef = useRef<{ id?: string; code?: string; markerMoveId?: string; date?: string }>({});

    const createItemId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

    // Inicialização ao continuar inventário existente ou duplicar
    useEffect(() => {
        let isMounted = true;

        const initializeFlow = async () => {
            if (initialSession) {
                setIsSaving(true);
                try {
                    const details = await fetchInventorySessionDetails(initialSession.id);
                    if (!isMounted) return;

                    const code = initialSession.inventoryCode || initialSession.id.split('-')[0];
                    draftRef.current = {
                        id: initialSession.id,
                        code,
                        markerMoveId: initialSession.id,
                        date: initialSession.created_at,
                    };

                    const restoredItems: AuditItem[] = (details?.items || []).map((it: any) => ({
                        id: createItemId(),
                        key: `${it.productId}-${it.variationId || 'main'}`,
                        productId: it.productId,
                        variationId: it.variationId,
                        name: it.name,
                        supplierNames: it.assignedSupplier || 'Fábrica não informada',
                        assignedSupplier: it.assignedSupplier || 'Sem fornecedor',
                        systemStock: it.systemStock || 0,
                        physicalCount: it.physicalCount !== undefined ? it.physicalCount : null,
                        unit: it.unit || 'UN',
                    }));

                    setItems(restoredItems);
                    setScopeConfig({
                        name: details?.name || `Inventário #${code}`,
                        blindCount: Boolean(details?.blindCount),
                        hasStages: Boolean(details?.hasStages),
                        responsibleId: details?.responsibleId || userProfile?.id || '',
                        scopeType: details?.scopeType || 'custom',
                    });
                    setView('operation');
                } catch (error) {
                    console.error('Erro ao restaurar inventário em andamento:', error);
                    Alert.alert('Erro', 'Não foi possível carregar os dados do inventário.');
                } finally {
                    if (isMounted) setIsSaving(false);
                }
            } else if (copiedItems && copiedItems.length > 0) {
                setIsSaving(true);
                try {
                    const code = await getNextInventoryCode();
                    if (!isMounted) return;

                    draftRef.current = {
                        id: require('uuid').v4 ? require('uuid').v4() : Math.random().toString(36).slice(2),
                        code,
                        date: new Date().toISOString(),
                    };

                    const duplicatedItems: AuditItem[] = copiedItems.map((it: any) => ({
                        id: createItemId(),
                        key: `${it.productId}-${it.variationId || 'main'}`,
                        productId: it.productId,
                        variationId: it.variationId,
                        name: it.name,
                        supplierNames: it.assignedSupplier || it.supplierNames || 'Fábrica não informada',
                        assignedSupplier: it.assignedSupplier || 'Sem fornecedor',
                        systemStock: it.systemStock || 0,
                        physicalCount: null, // Zerado para nova contagem
                        unit: it.unit || 'UN',
                    }));

                    setItems(duplicatedItems);
                    setScopeConfig({
                        name: `Inventário #${code} (Cópia)`,
                        blindCount: false,
                        hasStages: false,
                        responsibleId: userProfile?.id || '',
                        scopeType: 'custom',
                    });
                    setView('operation');
                } catch (error) {
                    console.error('Erro ao duplicar inventário:', error);
                } finally {
                    if (isMounted) setIsSaving(false);
                }
            }
        };

        void initializeFlow();

        return () => {
            isMounted = false;
        };
    }, [initialSession, copiedItems, userProfile?.id]);

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

    const handleSaveDraft = useCallback(async (closeAfterSave = false) => {
        if (!items.length) {
            if (closeAfterSave) onClose();
            return;
        }

        setIsSaving(true);
        try {
            const auditId = draftRef.current.id || (require('uuid').v4 ? require('uuid').v4() : Math.random().toString(36).slice(2));
            const code = draftRef.current.code || await getNextInventoryCode();
            const auditDate = draftRef.current.date || new Date().toISOString();

            const auditObservation = {
                inventoryAudit: true,
                inventoryCode: code,
                status: 'in_progress',
                name: scopeConfig?.name || `Inventário #${code}`,
                blindCount: scopeConfig?.blindCount ?? false,
                hasStages: scopeConfig?.hasStages ?? false,
                responsibleId: scopeConfig?.responsibleId || userProfile?.id,
                responsibleName: userProfile?.fullName || userProfile?.full_name || 'Usuário',
                items: items.map(({ productId, variationId, name, systemStock, physicalCount, assignedSupplier }) => ({
                    productId,
                    variationId,
                    name,
                    systemStock,
                    physicalCount,
                    assignedSupplier
                })),
            };

            const markerId = await saveInventoryDraft({
                markerMoveId: draftRef.current.markerMoveId,
                code,
                auditId,
                observation: auditObservation,
                date: auditDate,
            });

            draftRef.current.markerMoveId = markerId;
            draftRef.current.id = auditId;
            draftRef.current.code = code;

            if (closeAfterSave) {
                Alert.alert('Rascunho salvo', `Inventário #${code} salvo como rascunho.`);
                onClose();
            } else {
                Alert.alert('Rascunho salvo', `Progresso do Inventário #${code} salvo com sucesso!`);
            }
        } catch (error) {
            console.error('Erro ao salvar rascunho de inventário:', error);
            Alert.alert('Erro', 'Não foi possível salvar o rascunho.');
        } finally {
            setIsSaving(false);
        }
    }, [items, scopeConfig, userProfile, onClose]);

    const handleFinalize = async (itemsWithAdjustment: Array<AuditItem & { reconciledExpected: number, difference: number }>) => {
        console.log('UI LOG: handleFinalize called!');
        if (!scopeConfig || !userProfile) {
            Alert.alert('Atenção', 'Sessão ou usuário inválidos.', [{ text: 'OK', onPress: onClose }]);
            return;
        }

        setIsSaving(true);
        try {
            const auditId = draftRef.current.id || require('uuid').v4();
            const code = draftRef.current.code || await getNextInventoryCode();
            
            const auditObservation = JSON.stringify({
                inventoryAudit: true,
                inventoryCode: code,
                status: 'completed',
                name: scopeConfig.name,
                blindCount: scopeConfig.blindCount,
                hasStages: scopeConfig.hasStages,
                responsibleId: scopeConfig.responsibleId,
                responsibleName: userProfile.fullName || userProfile.full_name || 'Usuário',
                items: items.map(({ productId, variationId, name, systemStock, physicalCount, assignedSupplier }) => ({ productId, variationId, name, systemStock, physicalCount, assignedSupplier })),
            });

            if (draftRef.current.markerMoveId) {
                try {
                    await deleteInventoryDraft(draftRef.current.markerMoveId);
                } catch (e) {
                    console.warn('Rascunho anterior já não existe ou foi removido:', e);
                }
            }

            const { error } = await supabase.rpc('finalize_inventory_transaction', {
                p_audit_id: auditId,
                p_code: code,
                p_observation: JSON.parse(auditObservation),
                p_items: itemsWithAdjustment.map(({ productId, variationId, name, physicalCount }) => ({
                    productId,
                    variationId: variationId || null,
                    name,
                    physicalCount,
                })),
                p_responsible_name: userProfile.fullName || userProfile.full_name || 'Usuário',
            });
            if (error) throw error;

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
        handleSaveDraft,
        handleFinalize,
    };
};

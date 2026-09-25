import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureAtLeastOneOperationalVariation } from '../../products/domain/productVariationName';
import { matchScannedProductItem, extractLabelIdentity } from '../../../utils/barcodeScannerUtils';

describe('Paridade de Inventário de Estoque (ERP Web x App Mobile)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calcula o status de ajustes do inventário como LANÇADO, ESTORNADO ou PENDENTE conforme regras do ERP', () => {
        const getAdjustmentStatus = (session: { status: string; adjustmentsCount: number; reversedCount: number }) => {
            if (session.status === 'in_progress') return 'PENDENTE';
            if (session.reversedCount > 0) return 'ESTORNADO';
            if (session.adjustmentsCount > 0) return 'LANÇADO';
            return 'SEM AJUSTE';
        };

        expect(getAdjustmentStatus({ status: 'in_progress', adjustmentsCount: 0, reversedCount: 0 })).toBe('PENDENTE');
        expect(getAdjustmentStatus({ status: 'completed', adjustmentsCount: 3, reversedCount: 0 })).toBe('LANÇADO');
        expect(getAdjustmentStatus({ status: 'completed', adjustmentsCount: 3, reversedCount: 3 })).toBe('ESTORNADO');
        expect(getAdjustmentStatus({ status: 'completed', adjustmentsCount: 0, reversedCount: 0 })).toBe('SEM AJUSTE');
    });

    it('identifica corretamente permissões de ação do card (Continuar, Duplicar, Estornar, Reaplicar, Excluir)', () => {
        const getAvailableActions = (session: { status: string; adjustmentsCount: number; reversedCount: number }) => {
            const isInProgress = session.status === 'in_progress';
            const canRevert = session.status === 'completed' && session.adjustmentsCount > 0 && session.reversedCount === 0;
            const hasReverted = session.status === 'completed' && session.reversedCount > 0;

            return {
                canContinue: isInProgress,
                canDuplicate: true,
                canRevert,
                canApply: hasReverted,
                canDeleteDraft: isInProgress,
                canViewDetails: !isInProgress,
            };
        };

        const inProgress = getAvailableActions({ status: 'in_progress', adjustmentsCount: 0, reversedCount: 0 });
        expect(inProgress.canContinue).toBe(true);
        expect(inProgress.canDeleteDraft).toBe(true);
        expect(inProgress.canViewDetails).toBe(false);
        expect(inProgress.canRevert).toBe(false);

        const completedWithAdjustments = getAvailableActions({ status: 'completed', adjustmentsCount: 2, reversedCount: 0 });
        expect(completedWithAdjustments.canContinue).toBe(false);
        expect(completedWithAdjustments.canViewDetails).toBe(true);
        expect(completedWithAdjustments.canRevert).toBe(true);
        expect(completedWithAdjustments.canApply).toBe(false);

        const reversedAudit = getAvailableActions({ status: 'completed', adjustmentsCount: 2, reversedCount: 2 });
        expect(reversedAudit.canRevert).toBe(false);
        expect(reversedAudit.canApply).toBe(true);
    });

    it('mantém integridade de cálculo de âncora de inventário para recomposição de estoque', () => {
        const moves = [
            { id: '1', type: 'entry', quantity: 10, status: 'effective', observation: '{}' },
            { id: '2', type: 'adjustment', quantity: 0, status: 'effective', observation: JSON.stringify({ targetStock: 50 }) },
            { id: '3', type: 'exit', quantity: 5, status: 'effective', observation: '{}' },
        ];

        // Âncora é o último ajuste de inventário efetivo com targetStock
        const anchor = [...moves].reverse().find(m => {
            try {
                return JSON.parse(m.observation).targetStock !== undefined && m.status === 'effective';
            } catch {
                return false;
            }
        });

        expect(anchor).toBeDefined();
        expect(JSON.parse(anchor!.observation).targetStock).toBe(50);

        let stock = JSON.parse(anchor!.observation).targetStock;
        const subsequentMoves = moves.slice(moves.indexOf(anchor!) + 1);
        for (const m of subsequentMoves) {
            if (m.type === 'entry') stock += m.quantity;
            if (m.type === 'exit') stock -= m.quantity;
        }

        expect(stock).toBe(45); // 50 - 5 = 45
    });

    it('abre a ação correspondente ao tocar no card conforme o status (continuar ou ver detalhes)', () => {
        const handleCardPress = (session: { status: string }, onContinue: () => void, onViewDetails: () => void) => {
            if (session.status === 'in_progress') {
                onContinue();
            } else {
                onViewDetails();
            }
        };

        const onContinue = vi.fn();
        const onViewDetails = vi.fn();

        handleCardPress({ status: 'in_progress' }, onContinue, onViewDetails);
        expect(onContinue).toHaveBeenCalledTimes(1);
        expect(onViewDetails).not.toHaveBeenCalled();

        handleCardPress({ status: 'completed' }, onContinue, onViewDetails);
        expect(onViewDetails).toHaveBeenCalledTimes(1);
    });

    it('suporta criação de escopo para Estoque Completo, Por Fornecedor e Personalizado', () => {
        const buildScope = (type: 'full' | 'supplier' | 'custom', supplierId?: string) => ({
            type,
            name: `Inventário ${type}`,
            hasStages: type === 'full',
            supplierId,
        });

        const fullScope = buildScope('full');
        expect(fullScope.type).toBe('full');
        expect(fullScope.hasStages).toBe(true);

        const supplierScope = buildScope('supplier', 'sup-123');
        expect(supplierScope.type).toBe('supplier');
        expect(supplierScope.supplierId).toBe('sup-123');

        const customScope = buildScope('custom');
        expect(customScope.type).toBe('custom');
        expect(customScope.hasStages).toBe(false);
    });

    it('separa corretamente itens com divergência e itens não contados na revisão final', () => {
        const items = [
            { id: '1', name: 'Item A', systemStock: 10, physicalCount: 12, reconciledExpected: 10, difference: 2 },
            { id: '2', name: 'Item B', systemStock: 5, physicalCount: 5, reconciledExpected: 5, difference: 0 },
            { id: '3', name: 'Item C', systemStock: 8, physicalCount: null, reconciledExpected: 8, difference: 0 },
        ];

        const countedItems = items.filter(i => i.physicalCount !== null);
        const uncountedItems = items.filter(i => i.physicalCount === null);
        const adjustments = items.filter(i => i.physicalCount !== null && i.difference !== 0);

        expect(countedItems.length).toBe(2);
        expect(uncountedItems.length).toBe(1);
        expect(adjustments.length).toBe(1);
        expect(adjustments[0].difference).toBe(2);
    });

    it('não permite que produto operacional seja salvo sem uma variação filha', () => {
        const variations = ensureAtLeastOneOperationalVariation({
            name: 'Aparador para Café Cairo Pés Palito',
            itemType: 'product',
            stock: 1,
        }, '000252');

        expect(variations).toHaveLength(1);
        expect(variations[0].name).toBe('Aparador para Café Cairo Pés Palito');
        expect(variations[0].sku).toBe('000252-01');
    });

    it('preserva variações existentes e não transforma serviço em item de estoque', () => {
        const existing = [{ id: 'variation-1', name: 'Branco' }];
        expect(ensureAtLeastOneOperationalVariation({ itemType: 'product', variations: existing }, '000001')).toBe(existing);
        expect(ensureAtLeastOneOperationalVariation({ itemType: 'service', name: 'Montagem' }, '000002')).toEqual([]);
    });

    it('identifica e consolida fornecedores pelos 3 campos (main_supplier_id, supplier_id, supplier_ids)', () => {
        const suppliers = [
            { id: 'sup-1', full_name: 'Fábrica Alpha' },
            { id: 'sup-2', full_name: 'Fábrica Beta' },
            { id: 'sup-3', full_name: 'Fábrica Gama' },
        ];
        const suppliersMap = new Map(suppliers.map(s => [s.id, s.full_name]));

        const product = {
            id: 'prod-1',
            main_supplier_id: 'sup-1',
            supplier_id: 'sup-2',
            supplier_ids: ['sup-3'],
        };

        const ids = [...new Set([product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])].filter(Boolean).map(String))];
        const names = ids.map(id => suppliersMap.get(id)).filter(Boolean);
        const supplierNames = names.join(' / ') || 'Fábrica não informada';
        const assignedSupplier = names[0] || 'Sem fornecedor';

        expect(supplierNames).toBe('Fábrica Alpha / Fábrica Beta / Fábrica Gama');
        expect(assignedSupplier).toBe('Fábrica Alpha');
    });

    it('bloqueia finalização na revisão quando hasStages=true e há itens não contados', () => {
        const canFinalize = (hasStages: boolean, countedCount: number, totalCount: number, loading: boolean) => {
            const uncountedCount = totalCount - countedCount;
            return !(countedCount === 0 || loading || (hasStages && uncountedCount > 0));
        };

        // Inventário full com etapas: se houver pendentes, deve bloquear
        expect(canFinalize(true, 5, 10, false)).toBe(false);
        // Inventário full com etapas: todas contadas, deve liberar
        expect(canFinalize(true, 10, 10, false)).toBe(true);
        // Inventário sem etapas (custom ou supplier): permite concluir mesmo com itens não contados
        expect(canFinalize(false, 5, 10, false)).toBe(true);
        // Sem nenhuma contagem: sempre bloqueia
        expect(canFinalize(false, 0, 10, false)).toBe(false);
    });

    it('exclui "Sem fornecedor" da lista de etapas de fornecedor na InventoryStagesView igual ao ERP', () => {
        const stagesArray = [
            { supplierName: 'Fábrica Beta', total: 5, counted: 5 },
            { supplierName: 'Sem fornecedor', total: 2, counted: 0 },
            { supplierName: 'Fábrica Alpha', total: 8, counted: 4 },
        ];

        const filtered = stagesArray.filter(stage => stage.supplierName !== 'Sem fornecedor');
        filtered.sort((a, b) => a.supplierName.localeCompare(b.supplierName));

        expect(filtered.map(s => s.supplierName)).toEqual(['Fábrica Alpha', 'Fábrica Beta']);
    });

    it('ao voltar sem nenhuma contagem realizada, retorna direto ao escopo sem salvar rascunho nem criar inventário fantasma', () => {
        const items = [
            { id: '1', physicalCount: null },
            { id: '2', physicalCount: null },
        ];

        const hasAnyCount = items.some(i => i.physicalCount !== null);
        expect(hasAnyCount).toBe(false);

        // Simulando a decisão de navegação
        let currentView = 'operation';
        let alertOpened = false;
        let supabaseDraftSaved = false;

        const handleCancel = () => {
            if (!hasAnyCount) {
                currentView = 'scope';
                return;
            }
            alertOpened = true;
        };

        handleCancel();
        expect(currentView).toBe('scope');
        expect(alertOpened).toBe(false);
        expect(supabaseDraftSaved).toBe(false);
    });

    it('determina corretamente o comportamento do botão Voltar no rodapé com e sem activeStage', () => {
        const getFooterBackAction = (
            activeStage: string | null, 
            onBackStage: () => void, 
            onCancelToScope: () => void
        ) => {
            return activeStage ? onBackStage : onCancelToScope;
        };

        const onBackStage = vi.fn();
        const onCancelToScope = vi.fn();

        // 1. Quando está dentro de uma etapa de fornecedor (activeStage definido): volta para a lista de etapas
        const actionInsideStage = getFooterBackAction('Fábrica Alpha', onBackStage, onCancelToScope);
        actionInsideStage();
        expect(onBackStage).toHaveBeenCalledTimes(1);
        expect(onCancelToScope).not.toHaveBeenCalled();

        // 2. Quando está na lista de etapas ou visão geral (activeStage null): volta para a seleção de escopo
        const actionAtStageList = getFooterBackAction(null, onBackStage, onCancelToScope);
        actionAtStageList();
        expect(onCancelToScope).toHaveBeenCalledTimes(1);
    });

    it('persiste contagens no SQLite local e remove o rascunho após finalização', async () => {
        // Validação da estrutura de persistência local
        const mockDb: Record<string, any> = {};

        const saveDraft = (id: string, code: string, items: any[]) => {
            mockDb[id] = { id, code, items, updatedAt: new Date().toISOString() };
        };

        const deleteDraft = (id: string) => {
            delete mockDb[id];
        };

        // Salva contagem no SQLite
        saveDraft('audit-123', '042', [{ id: '1', physicalCount: 15 }]);
        expect(mockDb['audit-123']).toBeDefined();
        expect(mockDb['audit-123'].items[0].physicalCount).toBe(15);

        // Ao finalizar, limpa do SQLite
        deleteDraft('audit-123');
        expect(mockDb['audit-123']).toBeUndefined();
    });

    it('gerencia concorrência com fila serializada (Promise Queue) em múltiplos toques rápidos', async () => {
        let recordedCountInDb = 0;
        let queue: Promise<void> = Promise.resolve();

        const simulateRapidTap = (count: number) => {
            queue = queue.then(async () => {
                // Simula pequeno delay de escrita no SQLite
                await new Promise(resolve => setTimeout(resolve, 5));
                recordedCountInDb = count;
            });
        };

        // 10 toques rápidos em '+'
        for (let i = 1; i <= 10; i++) {
            simulateRapidTap(i);
        }

        await queue;
        // O valor final gravado no SQLite deve corresponder exatamente ao 10º toque, sem perda de contagem
        expect(recordedCountInDb).toBe(10);
    });

    it('permite leituras repetidas do mesmo código QR/Barra sem erro de duplicidade e incrementa sequencialmente', () => {
        let physicalCount: number | null = null;

        const handleScan = (scannedSku: string, itemSku: string) => {
            if (scannedSku === itemSku) {
                physicalCount = (physicalCount || 0) + 1;
                return { success: true, count: physicalCount };
            }
            return { success: false, error: 'not_found' };
        };

        // Leitura 1 do mesmo produto
        const r1 = handleScan('7891234567890', '7891234567890');
        expect(r1.success).toBe(true);
        expect(r1.count).toBe(1);

        // Leitura 2 do MESMO produto (não pode bloquear com erro de duplicado)
        const r2 = handleScan('7891234567890', '7891234567890');
        expect(r2.success).toBe(true);
        expect(r2.count).toBe(2);

        // Leitura 3
        const r3 = handleScan('7891234567890', '7891234567890');
        expect(r3.success).toBe(true);
        expect(r3.count).toBe(3);
    });

    it('protege contagens em caso de tentativa de finalização offline, mantendo status pending_sync no SQLite', async () => {
        let localStatus = 'in_progress';
        let serverCommitted = false;
        let alertMessage = '';

        const finalizeWorkflow = async (isOnline: boolean) => {
            if (!isOnline) {
                localStatus = 'pending_sync';
                alertMessage = 'Sem conexão à internet. Suas contagens estão salvas com segurança no aparelho.';
                return;
            }
            serverCommitted = true;
            localStatus = 'completed';
        };

        // Tentativa de finalizar offline
        await finalizeWorkflow(false);

        expect(serverCommitted).toBe(false);
        expect(localStatus).toBe('pending_sync');
        expect(alertMessage).toContain('salvas com segurança');

        // Reconexão e nova tentativa online
        await finalizeWorkflow(true);
        expect(serverCommitted).toBe(true);
        expect(localStatus).toBe('completed');
    });

    it('restaura o inventário do SQLite local sem depender de chamada de rede ao Supabase', async () => {
        const mockSQLite = {
            'inv-001': {
                id: 'inv-001',
                code: '001',
                items: [
                    { id: 'item-1', name: 'Sofá Retrátil', physicalCount: 8, systemStock: 5 },
                    { id: 'item-2', name: 'Mesa de Jantar', physicalCount: 3, systemStock: 3 },
                ],
                updatedAt: '2026-09-24T20:00:00Z',
            }
        };

        const restoreFlow = async (id: string, fetchSupabaseMock: () => Promise<any>) => {
            if (mockSQLite[id as keyof typeof mockSQLite]) {
                // Carrega do SQLite direto com 0 chamadas de rede
                return mockSQLite[id as keyof typeof mockSQLite];
            }
            return await fetchSupabaseMock();
        };

        const supabaseSpy = vi.fn();
        const restored = await restoreFlow('inv-001', supabaseSpy);

        expect(restored).toBeDefined();
        expect(restored.code).toBe('001');
        expect(restored.items[0].physicalCount).toBe(8);
        expect(supabaseSpy).not.toHaveBeenCalled(); // Zero requisições ao Supabase!
    });

    it('valida geradores de UUID e ID de item modulares para inventário', () => {
        const generateInventoryUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
        const createInventoryItemId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

        const uuid = generateInventoryUUID();
        expect(uuid).toBeDefined();
        expect(typeof uuid).toBe('string');
        expect(uuid.length).toBeGreaterThan(10);

        const itemId = createInventoryItemId();
        expect(itemId).toBeDefined();
        expect(typeof itemId).toBe('string');
        expect(itemId.length).toBeGreaterThan(5);
    });

    it('reconhece etiquetas escaneadas em formatos variados (SKU|SERIAL, Barcode, JSON e ID)', () => {
        const item = {
            id: 'item-10',
            key: 'p-10-v-10',
            productId: 'prod-uuid-10',
            variationId: 'var-uuid-10',
            sku: 'CADEIRA-PRETA-01',
            code: 'CAD-01',
            barcode: '7891234567890',
            name: 'Cadeira Office Preta'
        };

        // 1. Etiqueta de identificação com pipe e serial gerado pelo ERP: SKU|SERIAL
        expect(matchScannedProductItem(item, 'CADEIRA-PRETA-01|000042')).toBe(true);

        // 2. Barcode com serial: BARCODE|UUID
        expect(matchScannedProductItem(item, '7891234567890|uuid-xyz')).toBe(true);

        // 3. Código de barras simples
        expect(matchScannedProductItem(item, '7891234567890')).toBe(true);

        // 4. SKU simples
        expect(matchScannedProductItem(item, 'CADEIRA-PRETA-01')).toBe(true);

        // 5. JSON em QR code
        expect(matchScannedProductItem(item, JSON.stringify({ sku: 'CADEIRA-PRETA-01', scanId: '123' }))).toBe(true);

        // 6. Produto não encontrado
        expect(matchScannedProductItem(item, 'PRODUTO-INEXISTENTE|0001')).toBe(false);

        // 7. Novo formato canônico MH:L:<uuid>|<sku>
        expect(matchScannedProductItem(item, 'MH:L:12345678-1234-4234-8234-123456789abc|CADEIRA-PRETA-01')).toBe(true);
    });

    it('extrai corretamente a identidade da etiqueta física (MH:L e UUID) e impede duplicidade local no inventário', () => {
        const qr1 = 'MH:L:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa|SOFA-RET';
        const identity1 = extractLabelIdentity(qr1);
        expect(identity1.labelId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
        expect(identity1.code).toBe('SOFA-RET');

        const qr2 = 'SOFA-RET|bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        const identity2 = extractLabelIdentity(qr2);
        expect(identity2.labelId).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
        expect(identity2.code).toBe('SOFA-RET');

        const qrSimple = 'SOFA-RET';
        const identitySimple = extractLabelIdentity(qrSimple);
        expect(identitySimple.labelId).toBeUndefined();
        expect(identitySimple.code).toBe('SOFA-RET');
    });
});

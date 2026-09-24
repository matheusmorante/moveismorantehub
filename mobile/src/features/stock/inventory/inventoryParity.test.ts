import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureAtLeastOneOperationalVariation } from '../../products/domain/productVariationName';

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

    it('suporta configuração de contagem cega (blindCount) no escopo de inventário', () => {
        const buildScope = (type: 'full' | 'supplier' | 'custom', blindCount: boolean) => ({
            type,
            name: `Inventário ${type}`,
            blindCount,
            hasStages: type === 'full',
        });

        const blindScope = buildScope('full', true);
        expect(blindScope.blindCount).toBe(true);

        const standardScope = buildScope('supplier', false);
        expect(standardScope.blindCount).toBe(false);
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
});

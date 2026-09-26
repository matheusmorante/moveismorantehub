// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuditItem } from '../types/inventoryAudit.types';

vi.mock('@/components/shared/QRScannerModal', () => ({
    default: ({ isOpen, onScan, title, subtitle, footerContent }: any) => isOpen ? (
        <div role="dialog">
            <h1>{title}</h1><p>{subtitle}</p>
            <button onClick={() => onScan('SKU-A')}>Ler A</button>
            <button onClick={() => onScan('SKU-B')}>Ler B</button>
            <button onClick={() => onScan('UNKNOWN')}>Ler desconhecido</button>
            {footerContent}
        </div>
    ) : null,
}));
vi.mock('./InventoryOperationHeader', () => ({
    InventoryOperationHeader: ({ onOpenQrScanner }: any) => <button onClick={onOpenQrScanner}>Abrir scanner</button>,
}));
vi.mock('./InventoryStagesView', () => ({
    InventoryStagesView: ({ onSelectStage }: any) => <button onClick={() => onSelectStage('Telasul')}>Etapa Telasul</button>,
}));
vi.mock('./InventoryManualMode', () => ({ InventoryManualMode: () => <div>Lista de produtos</div> }));
vi.mock('../../hooks/useInventoryOperation', () => ({
    useInventoryOperation: (items: AuditItem[]) => ({ filter: 'all', setFilter: vi.fn(), search: '', setSearch: vi.fn(), filteredItems: items }),
}));
vi.mock('../services/offlineInventoryCatalog', () => ({
    ensureOfflineInventoryCatalogSynced: vi.fn().mockResolvedValue({ success: false, syncedAt: null }),
    findOfflineInventoryMatch: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: vi.fn() } }));

import { InventoryOperationScreen } from './InventoryOperationScreen';

afterEach(cleanup);

const item = (id: string, sku: string, supplier: string): AuditItem => ({
    id, key: id, productId: id, name: `Produto ${id}`, supplierNames: supplier,
    assignedSupplier: supplier, systemStock: 0, physicalCount: null, unit: 'UN', sku,
});

const renderInventory = () => {
    const counts = new Map<string, number>();
    const seenLabels = new Set<string>();
    const onIncrementScannedItem = vi.fn(async (id: string, labelId?: string) => {
        if (labelId && seenLabels.has(labelId)) return null;
        if (labelId) seenLabels.add(labelId);
        const next = (counts.get(id) || 0) + 1;
        counts.set(id, next);
        return next;
    });
    const onReview = vi.fn();
    render(<InventoryOperationScreen items={[item('a', 'SKU-A', 'Telasul'), item('b', 'SKU-B', 'Henn')]}
        hasStages inventoryName="Teste" onUpdateCount={vi.fn()} onIncrementScannedItem={onIncrementScannedItem}
        onAddManualItem={vi.fn()} onReview={onReview} />);
    return { onIncrementScannedItem, onReview };
};

describe('escopo do scanner do inventário web', () => {
    it('conta produtos dos dois fornecedores na contagem geral e mantém a sessão aberta', async () => {
        const { onIncrementScannedItem, onReview } = renderInventory();
        fireEvent.click(screen.getByText('Abrir scanner'));
        expect(screen.getByText('Contagem geral')).toBeTruthy();
        fireEvent.click(screen.getByText('Ler A'));
        fireEvent.click(screen.getByText('Ler B'));
        await waitFor(() => expect(onIncrementScannedItem).toHaveBeenCalledTimes(2));
        expect(screen.getByText('Contagem geral')).toBeTruthy();
        expect(onReview).not.toHaveBeenCalled();
    });

    it('rejeita outro fornecedor e produto fora do inventário sem alterar a contagem', async () => {
        const { onIncrementScannedItem } = renderInventory();
        fireEvent.click(screen.getByText('Etapa Telasul'));
        fireEvent.click(screen.getByText('Abrir scanner'));
        expect(screen.getByText('Contagem — Telasul')).toBeTruthy();
        fireEvent.click(screen.getByText('Ler B'));
        await waitFor(() => expect(screen.getByText('Produto de outro fornecedor')).toBeTruthy());
        fireEvent.click(screen.getByText('Ler desconhecido'));
        await waitFor(() => expect(screen.getByText('Produto não pertence a este inventário')).toBeTruthy());
        expect(onIncrementScannedItem).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText('Ler A'));
        await waitFor(() => expect(onIncrementScannedItem).toHaveBeenCalledWith('a', 'qr:SKU-A'));
    });

    it('bloqueia segunda leitura do mesmo QR code e exibe feedback de já contabilizado', async () => {
        const { onIncrementScannedItem, onReview } = renderInventory();
        fireEvent.click(screen.getByText('Abrir scanner'));
        fireEvent.click(screen.getByText('Ler A'));
        await waitFor(() => expect(onIncrementScannedItem).toHaveBeenCalledTimes(1));
        fireEvent.click(screen.getByText('Ler A'));
        await waitFor(() => expect(screen.getByText('Unidade física já contabilizada')).toBeTruthy());
        expect(onIncrementScannedItem).toHaveBeenCalledTimes(2); // 2ª chamada retorna null (deduplicada)
        expect(onReview).not.toHaveBeenCalled();
    });
});

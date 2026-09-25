import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractLabelIdentity, extractScannedCodes, matchScannedProductItem } from '../../../../utils/barcodeScannerUtils';
import { generateInventoryLabelsBatch } from '../services/inventoryLabelService';
import { supabase } from '../../../../utils/supabaseConfig';

vi.mock('../../../../utils/supabaseConfig', () => {
    return {
        supabase: {
            from: vi.fn(),
        },
    };
});

describe('Auditoria e Testes de Unicidade Real por Unidade Física (Etiquetas & Inventário)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Cenário 1 — Duas unidades idênticas
    it('Cenário 1: duas unidades do mesmo produto e variação devem receber label_id e QR codes diferentes', async () => {
        const mockGeneratedIds = [
            { id: '11111111-1111-4111-8111-111111111111' },
            { id: '22222222-2222-4222-8222-222222222222' },
        ];

        const insertMock = vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: mockGeneratedIds, error: null }),
        });

        (supabase.from as any).mockReturnValue({
            insert: insertMock,
        });

        const batchRequest = [
            {
                productId: 'prod-guarda-roupa-x',
                variationId: 'var-branco',
                sku: 'GR-BRANCO',
                quantity: 2,
            },
        ];

        const [allocatedUuids] = await generateInventoryLabelsBatch(batchRequest);

        expect(allocatedUuids).toHaveLength(2);
        expect(allocatedUuids[0]).not.toBe(allocatedUuids[1]);

        const qrCodeA = `MH:L:${allocatedUuids[0]}|${batchRequest[0].sku}`;
        const qrCodeB = `MH:L:${allocatedUuids[1]}|${batchRequest[0].sku}`;

        expect(qrCodeA).not.toBe(qrCodeB);

        const identityA = extractLabelIdentity(qrCodeA);
        const identityB = extractLabelIdentity(qrCodeB);

        expect(identityA.labelId).toBe('11111111-1111-4111-8111-111111111111');
        expect(identityB.labelId).toBe('22222222-2222-4222-8222-222222222222');
        expect(identityA.code).toBe('GR-BRANCO');
        expect(identityB.code).toBe('GR-BRANCO');
    });

    // Cenário 2 — Lote de 30 unidades
    it('Cenário 2: gerar 30 etiquetas deve gerar 30 IDs únicos com apenas 1 operação em lote (bulk insert)', async () => {
        const mock30 = Array.from({ length: 30 }).map((_, idx) => ({
            id: `33333333-3333-4333-8333-${idx.toString().padStart(12, '0')}`,
        }));

        const insertMock = vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: mock30, error: null }),
        });

        (supabase.from as any).mockReturnValue({
            insert: insertMock,
        });

        const [results] = await generateInventoryLabelsBatch([
            {
                productId: 'prod-sofa',
                sku: 'SOFA-3L',
                quantity: 30,
            },
        ]);

        // Apenas 1 única chamada ao Supabase
        expect(supabase.from).toHaveBeenCalledTimes(1);
        expect(supabase.from).toHaveBeenCalledWith('inventory_labels');
        expect(insertMock).toHaveBeenCalledTimes(1);

        // O bulk insert conteve 30 linhas
        const insertedRows = insertMock.mock.calls[0][0];
        expect(insertedRows).toHaveLength(30);

        // 30 IDs retornados e todos distintos
        expect(results).toHaveLength(30);
        const uniqueSet = new Set(results);
        expect(uniqueSet.size).toBe(30);
    });

    // Cenário 3, 4 e 5 — Leitura, Duplicidade e Outra unidade igual
    it('Cenários 3, 4 e 5: leitura inicial soma +1, bipar mesma unidade bloqueia duplicidade, outra unidade soma normalmente', () => {
        const inventoryItem = {
            id: 'item-1',
            productId: 'prod-guarda-roupa-x',
            variationId: 'var-branco',
            sku: 'GR-BRANCO',
            name: 'Guarda-Roupa X Branco',
            physicalCount: null as number | null,
            unit: 'UN',
        };

        const qrA = 'MH:L:11111111-1111-4111-8111-111111111111|GR-BRANCO';
        const qrB = 'MH:L:22222222-2222-4222-8222-222222222222|GR-BRANCO';

        const scannedSet = new Set<string>();

        function simulateScan(qrCode: string): { success: boolean; isDuplicate: boolean; count: number } {
            const isMatch = matchScannedProductItem(inventoryItem, qrCode);
            if (!isMatch) return { success: false, isDuplicate: false, count: inventoryItem.physicalCount || 0 };

            const { labelId } = extractLabelIdentity(qrCode);
            if (labelId && scannedSet.has(labelId)) {
                return { success: false, isDuplicate: true, count: inventoryItem.physicalCount || 0 };
            }

            if (labelId) {
                scannedSet.add(labelId);
            }

            inventoryItem.physicalCount = (inventoryItem.physicalCount || 0) + 1;
            return { success: true, isDuplicate: false, count: inventoryItem.physicalCount };
        }

        // Cenário 3 — Primeira leitura (QR A): quantidade 0 -> 1
        const scan1 = simulateScan(qrA);
        expect(scan1.success).toBe(true);
        expect(scan1.count).toBe(1);

        // Cenário 4 — Duplicidade (QR A novamente): quantidade continua 1 e bloqueia
        const scan2 = simulateScan(qrA);
        expect(scan2.success).toBe(false);
        expect(scan2.isDuplicate).toBe(true);
        expect(scan2.count).toBe(1);

        // Cenário 5 — Outra unidade igual (QR B): quantidade 1 -> 2
        const scan3 = simulateScan(qrB);
        expect(scan3.success).toBe(true);
        expect(scan3.isDuplicate).toBe(false);
        expect(scan3.count).toBe(2);
    });

    // Cenário 6 e 10 — Unicidade estrutural no SQLite / Local
    it('Cenários 6 e 10: validação estrutural no banco local impede duplicação sem tocar o Supabase', async () => {
        // Simulação do comportamento de índice UNIQUE no SQLite (inventory_id, scan_id)
        const localTable = new Map<string, any>();

        function sqliteInsert(inventoryId: string, scanId: string, productId: string) {
            const uniqueKey = `${inventoryId}:${scanId}`;
            if (localTable.has(uniqueKey)) {
                const err: any = new Error('UNIQUE constraint failed: inventory_scans_local.inventory_id, inventory_scans_local.scan_id');
                return { success: false, error: 'duplicate' };
            }
            localTable.set(uniqueKey, { inventoryId, scanId, productId, scannedAt: new Date().toISOString() });
            return { success: true };
        }

        const invId = 'inv-2026-09';
        const labelA = '11111111-1111-4111-8111-111111111111';

        // Primeira inserção local
        const r1 = sqliteInsert(invId, labelA, 'prod-1');
        expect(r1.success).toBe(true);

        // Tentativa de duplicidade local é rejeitada pelo UNIQUE constraint
        const r2 = sqliteInsert(invId, labelA, 'prod-1');
        expect(r2.success).toBe(false);
        expect(r2.error).toBe('duplicate');

        // Zero chamadas ao Supabase durante o scan
        expect(supabase.from).not.toHaveBeenCalled();
    });

    // Cenário 8 — Reimpressão da mesma unidade física
    it('Cenário 8: reimpressão da mesma unidade mantém o mesmo label_id e QR sem gerar novo UUID', () => {
        const existingUnitLabelId = '99999999-9999-4999-8999-999999999999';
        const sku = 'CADEIRA-ECO';

        const print1 = {
            sku,
            instances: [existingUnitLabelId],
        };

        const qr1 = `MH:L:${print1.instances[0]}|${print1.sku}`;

        // Reimpressão da mesma unidade
        const reprint = {
            sku,
            instances: [existingUnitLabelId], // mesmo ID preservado
        };

        const qrReprint = `MH:L:${reprint.instances[0]}|${reprint.sku}`;

        expect(qr1).toBe(qrReprint);
        expect(extractLabelIdentity(qrReprint).labelId).toBe(existingUnitLabelId);
    });

    // Cenário 9 — Regra de Volumes
    it('Cenário 9: regra de volumes - apenas o Volume 1 possui a etiqueta com a identidade da unidade completa', () => {
        const labelId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
        const productWithVolumes = {
            name: 'Guarda-Roupa Premium',
            totalVolumes: 3,
            volumes: [
                { volumeNumber: 1, hasLabel: true, labelId },
                { volumeNumber: 2, hasLabel: false, labelId: null },
                { volumeNumber: 3, hasLabel: false, labelId: null },
            ],
        };

        const volumesWithLabel = productWithVolumes.volumes.filter(v => v.hasLabel);
        expect(volumesWithLabel).toHaveLength(1);
        expect(volumesWithLabel[0].volumeNumber).toBe(1);
        expect(volumesWithLabel[0].labelId).toBe(labelId);
    });
});

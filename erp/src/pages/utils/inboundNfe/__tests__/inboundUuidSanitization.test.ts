import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidUuid } from '../../uuidUtils';
import { checkInboundInvoiceKeyExists } from '../inboundInvoicesService';
import { saveProductSupplierCode } from '../../productSupplierCodesService';
import { resolveCanonicalVariationIds } from '../../variationCanonicalService';
import { recordProductResolutionFeedback } from '../productResolutionFeedbackService';
import { supabase } from '../../supabaseConfig';

vi.mock('../../supabaseConfig', () => {
    return {
        supabase: {
            from: vi.fn(),
            rpc: vi.fn(),
        },
    };
});

describe('Sanitização e Proteção contra erros de UUID (22P02 e 400)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('isValidUuid', () => {
        it('deve validar UUIDs canônicos legítimos', () => {
            expect(isValidUuid('13eab361-be48-4e49-be4b-4ad79813b812')).toBe(true);
            expect(isValidUuid('6fe72583-1217-4c49-8949-139883b1c57b')).toBe(true);
        });

        it('deve rejeitar identificadores compostos ou sintéticos de rascunho/virtual', () => {
            expect(isValidUuid('6fe72583-1217-4c49-8949-139883b1c57b_000022-01')).toBe(false);
            expect(isValidUuid('inbound_41260402869763005168550010001298531050758366')).toBe(false);
            expect(isValidUuid('41260402869763005168550010001298531050758366')).toBe(false);
            expect(isValidUuid('')).toBe(false);
            expect(isValidUuid(undefined)).toBe(false);
            expect(isValidUuid(null)).toBe(false);
        });
    });

    describe('checkInboundInvoiceKeyExists', () => {
        it('não deve aplicar query.neq("id", ...) quando currentInvoiceId for ID temporário "inbound_..."', async () => {
            const queryBuilder: any = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                neq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
            (supabase.from as any).mockReturnValue(queryBuilder);

            const nfeKey = '41260402869763005168550010001298531050758366';
            const tempId = `inbound_${nfeKey}`;

            const result = await checkInboundInvoiceKeyExists(nfeKey, tempId);

            expect(result).toBeNull();
            expect(supabase.from).toHaveBeenCalledWith('inbound_invoices');
            expect(queryBuilder.eq).toHaveBeenCalledWith('chave_acesso', nfeKey);
            // NÃO pode chamar neq com ID sintético porque quebraria a coluna UUID
            expect(queryBuilder.neq).not.toHaveBeenCalled();
        });

        it('deve aplicar query.neq("id", currentInvoiceId) quando currentInvoiceId for UUID válido', async () => {
            const validInvoiceId = '13eab361-be48-4e49-be4b-4ad79813b812';
            const queryBuilder: any = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                neq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
            (supabase.from as any).mockReturnValue(queryBuilder);

            const nfeKey = '41260402869763005168550010001298531050758366';
            await checkInboundInvoiceKeyExists(nfeKey, validInvoiceId);

            expect(queryBuilder.neq).toHaveBeenCalledWith('id', validInvoiceId);
        });
    });

    describe('saveProductSupplierCode', () => {
        it('não deve chamar a RPC resolve_canonical_variation_id e deve persistir null quando productVariationId for virtual', async () => {
            const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
            (supabase.from as any).mockReturnValue({ upsert: upsertMock });

            const virtualVariationId = '6fe72583-1217-4c49-8949-139883b1c57b_000022-01';
            const productId = '6fe72583-1217-4c49-8949-139883b1c57b';

            await saveProductSupplierCode({
                supplierId: 'sup-1',
                productId,
                productVariationId: virtualVariationId,
                supplierProductCode: 'FORN-001',
                supplierDescription: 'Item Teste',
            });

            // A RPC de UUID não pode ter sido chamada para evitar HTTP 400
            expect(supabase.rpc).not.toHaveBeenCalled();

            // O upsert deve ter gravado product_variation_id como null
            expect(upsertMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    product_id: productId,
                    product_variation_id: null,
                    supplier_product_code: 'FORN-001',
                }),
                expect.any(Object)
            );
        });
    });

    describe('resolveCanonicalVariationIds', () => {
        it('deve ignorar chamadas à RPC para variações virtuais e retornar o mapa preservado', async () => {
            const virtualId = '6fe72583-1217-4c49-8949-139883b1c57b_000022-01';
            const validId = '13eab361-be48-4e49-be4b-4ad79813b812';

            (supabase.rpc as any).mockResolvedValue({ data: 'canonical-uuid-1', error: null });

            const result = await resolveCanonicalVariationIds([virtualId, validId]);

            // RPC chamada somente para o UUID válido
            expect(supabase.rpc).toHaveBeenCalledTimes(1);
            expect(supabase.rpc).toHaveBeenCalledWith('resolve_canonical_variation_id', {
                p_variation_id: validId,
            });

            expect(result.get(virtualId)).toBe(virtualId);
            expect(result.get(validId)).toBe('canonical-uuid-1');
        });
    });

    describe('recordProductResolutionFeedback', () => {
        it('deve sanitizar final_variation_id não-UUID para null ao inserir feedback', async () => {
            const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
            (supabase.from as any).mockReturnValue({ insert: insertMock });

            const virtualVarId = '6fe72583-1217-4c49-8949-139883b1c57b_000022-01';
            const validProductId = '6fe72583-1217-4c49-8949-139883b1c57b';

            await recordProductResolutionFeedback({
                supplierId: 'sup-1',
                nfItemDescription: 'Item NF',
                userDecision: 'accepted',
                finalProductId: validProductId,
                finalVariationId: virtualVarId,
                relationType: 'existing_variation',
            });

            expect(insertMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    final_product_id: validProductId,
                    final_variation_id: null,
                })
            );
        });
    });
});

import { beforeEach, expect, it, vi } from 'vitest';
import { fetchSupplierProductsForContext } from './inboundSupplierProductContext';
const db = vi.hoisted(() => ({ from: vi.fn(), or: vi.fn(), range: vi.fn() }));
vi.mock('../supabaseConfig', () => ({ supabase: { from: db.from } }));
beforeEach(() => {
    const query = { select: vi.fn(), eq: vi.fn(), not: vi.fn(), or: db.or, order: vi.fn(), range: db.range };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.not.mockReturnValue(query);
    query.or.mockReturnValue(query); query.order.mockReturnValue(query);
    db.from.mockReturnValue(query);
    db.range.mockResolvedValue({ data: [], error: null });
});
it('não busca outros fornecedores quando o selecionado não possui produtos', async () => {
    expect(await fetchSupplierProductsForContext('fornecedor-1')).toEqual([]);
    expect(db.from).toHaveBeenCalledTimes(1);
    expect(db.or).toHaveBeenCalledWith('supplier_id.eq.fornecedor-1,main_supplier_id.eq.fornecedor-1,supplier_ids.cs.{"fornecedor-1"}');
});
it('não consulta produtos sem fornecedor selecionado', async () => {
    expect(await fetchSupplierProductsForContext('')).toEqual([]);
    expect(db.from).not.toHaveBeenCalled();
});

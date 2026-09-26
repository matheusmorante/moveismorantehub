import { beforeEach, expect, it, vi } from 'vitest';
import { deleteProductSupplierCode } from '../../';

const db = vi.hoisted(() => ({ from: vi.fn(), delete: vi.fn(), eq: vi.fn() }));
vi.mock('./supabaseConfig', () => ({ supabase: { from: db.from } }));
beforeEach(() => {
    db.from.mockReturnValue({ delete: db.delete });
    db.delete.mockReturnValue({ eq: db.eq });
    db.eq.mockReturnValueOnce({ eq: db.eq }).mockResolvedValueOnce({ error: null });
});

it('remove somente a associação do fornecedor e código informados', async () => {
    await deleteProductSupplierCode('fornecedor-1', ' cod-123 ');
    expect(db.from).toHaveBeenCalledWith('product_supplier_codes');
    expect(db.eq).toHaveBeenNthCalledWith(1, 'supplier_id', 'fornecedor-1');
    expect(db.eq).toHaveBeenNthCalledWith(2, 'supplier_product_code', 'COD-123');
    expect(db.from).toHaveBeenCalledTimes(1);
});

it('propaga falha do banco para que a interface preserve o vínculo', async () => {
    db.eq.mockReset().mockReturnValueOnce({ eq: db.eq }).mockResolvedValueOnce({ error: new Error('Falha de conexão') });
    await expect(deleteProductSupplierCode('fornecedor-1', 'COD-123')).rejects.toThrow('Falha de conexão');
});

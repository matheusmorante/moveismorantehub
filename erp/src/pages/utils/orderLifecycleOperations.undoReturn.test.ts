import { describe, it, expect, vi, beforeEach } from "vitest";
import Order from "../types/order.type";
import Item from "../types/items.type";

const mockCancelInventoryMovesByRelatedEntity = vi.fn().mockResolvedValue(undefined);
vi.mock("./inventoryService", () => ({
    cancelInventoryMovesByRelatedEntity: (...args: any[]) => mockCancelInventoryMovesByRelatedEntity(...args),
}));

const mockSupabaseSelect = vi.fn();

vi.mock("@/pages/utils/supabaseConfig", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            single: () => mockSupabaseSelect(),
            limit: vi.fn().mockResolvedValue({ data: [{ id: "ret-from-or" }] }),
        })),
    },
}));

vi.mock("./supabaseConfig", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            single: () => mockSupabaseSelect(),
            limit: vi.fn().mockResolvedValue({ data: [{ id: "ret-from-or" }] }),
        })),
    },
}));

import { undoReturn } from "./orderLifecycleOperations";

describe("undoReturn - Desfazer Devolução com Estorno de Estoque", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("deve estornar movimentações de estoque e cancelar devolução atendida vinculada a uma venda", async () => {
        const updateOrderFn = vi.fn().mockResolvedValue(undefined);

        const returnOrder: Order = {
            id: "return-101",
            orderType: "return",
            status: "fulfilled",
            orderIndex: 3001,
            linkedOrderId: "sale-201",
            customerData: { fullName: "João Silva", phone: "11999999999" } as any,
            items: [
                {
                    productId: "prod-1",
                    description: "Cadeira Estofada",
                    quantity: 2,
                    returnedQuantity: 2,
                    unitPrice: 150,
                    returnedUnitPrice: 150,
                    returnedTotalValue: 300,
                    originalUnitPrice: 150,
                    originalTotalValue: 300,
                } as Item,
            ],
            payments: [],
            paymentsSummary: {} as any,
            shipping: {} as any,
            itemsSummary: {} as any,
            seller: "Vendedor 1",
            observation: "",
            date: "2026-09-14",
        };

        const originalSaleRow = {
            id: "sale-201",
            status: "fulfilled",
            order_type: "sale",
            order_index: 2001,
            customer_name: "João Silva",
            order_data: {
                id: "sale-201",
                orderIndex: 2001,
                returnOrderId: "return-101",
                returnKind: "complete",
            },
        };

        mockSupabaseSelect.mockResolvedValueOnce({ data: originalSaleRow, error: null });

        await undoReturn(returnOrder, updateOrderFn);

        // 1. Deve chamar cancelInventoryMovesByRelatedEntity para o ID da devolução
        expect(mockCancelInventoryMovesByRelatedEntity).toHaveBeenCalledTimes(1);
        expect(mockCancelInventoryMovesByRelatedEntity).toHaveBeenCalledWith(
            "return-101",
            "sales_order",
            expect.stringContaining("Estorno de devolução")
        );

        // 2. Deve atualizar a devolução para cancelled com flags de estorno
        expect(updateOrderFn).toHaveBeenCalledWith(
            "return-101",
            {
                status: "cancelled",
                returnStockProcessed: false,
                returnStockReversed: true,
            },
            returnOrder
        );

        // 3. Deve desvincular a devolução na venda original
        expect(updateOrderFn).toHaveBeenCalledWith(
            "sale-201",
            {
                returnOrderId: null,
                returnKind: null,
            },
            expect.objectContaining({ id: "sale-201" })
        );
    });

    it("deve permitir desfazer devolução avulsa/manual (sem pedido vinculado) sem lançar erro", async () => {
        const updateOrderFn = vi.fn().mockResolvedValue(undefined);

        const unlinkedReturn: Order = {
            id: "return-manual-999",
            orderType: "return",
            status: "fulfilled",
            orderIndex: 3002,
            linkedOrderId: undefined,
            customerData: { fullName: "Maria Souza" } as any,
            items: [
                {
                    productId: "prod-2",
                    description: "Mesa de Jantar",
                    quantity: 1,
                    returnedQuantity: 1,
                    unitPrice: 800,
                    returnedUnitPrice: 800,
                    returnedTotalValue: 800,
                    originalUnitPrice: 800,
                    originalTotalValue: 800,
                } as Item,
            ],
            payments: [],
            paymentsSummary: {} as any,
            shipping: {} as any,
            itemsSummary: {} as any,
            seller: "",
            observation: "",
            date: "2026-09-14",
        };

        await undoReturn(unlinkedReturn, updateOrderFn);

        // 1. Deve chamar cancelInventoryMovesByRelatedEntity para a devolução manual
        expect(mockCancelInventoryMovesByRelatedEntity).toHaveBeenCalledWith(
            "return-manual-999",
            "sales_order",
            expect.stringContaining("Estorno de devolução")
        );

        // 2. Deve atualizar apenas a devolução
        expect(updateOrderFn).toHaveBeenCalledTimes(1);
        expect(updateOrderFn).toHaveBeenCalledWith(
            "return-manual-999",
            {
                status: "cancelled",
                returnStockProcessed: false,
                returnStockReversed: true,
            },
            unlinkedReturn
        );
    });

    it("deve validar que os campos de snapshot preservam o valor vendido e o valor devolvido", () => {
        const itemWithSnapshot: Item = {
            productId: "prod-10",
            description: "Poltrona Luxo",
            quantity: 2,
            returnedQuantity: 2,
            unitPrice: 350, // Preço acordado na devolução
            returnedUnitPrice: 350,
            returnedTotalValue: 700,
            originalUnitPrice: 400, // Preço vendido originalmente
            originalTotalValue: 800,
            discountType: "fixed",
            unitDiscount: 0,
            handlingType: "",
        };

        expect(itemWithSnapshot.originalUnitPrice).toBe(400);
        expect(itemWithSnapshot.originalTotalValue).toBe(800);
        expect(itemWithSnapshot.returnedUnitPrice).toBe(350);
        expect(itemWithSnapshot.returnedTotalValue).toBe(700);
        expect(itemWithSnapshot.returnedQuantity).toBe(2);
    });
    it("deve ser idempotente quando a devolução já está cancelada — apenas limpa o vínculo na venda", async () => {
        const updateOrderFn = vi.fn().mockResolvedValue(undefined);

        const alreadyCancelledReturn: Order = {
            id: "return-already-cancelled",
            orderType: "return",
            status: "cancelled", // já estava cancelada
            orderIndex: 3003,
            linkedOrderId: "sale-999",
            customerData: { fullName: "Carlos Lima" } as any,
            items: [],
            payments: [],
            paymentsSummary: {} as any,
            shipping: {} as any,
            itemsSummary: {} as any,
            seller: "",
            observation: "",
            date: "2026-09-14",
        };

        mockSupabaseSelect.mockResolvedValueOnce({ data: {
            id: "sale-999",
            status: "fulfilled",
            order_type: "sale",
            order_index: 999,
            order_data: { id: "sale-999", returnOrderId: "return-already-cancelled" },
        }, error: null });

        await undoReturn(alreadyCancelledReturn, updateOrderFn);

        // Não deve cancelar movimentações de estoque (devolução já estava cancelada)
        expect(mockCancelInventoryMovesByRelatedEntity).not.toHaveBeenCalled();

        // Deve apenas limpar o vínculo na venda original
        expect(updateOrderFn).toHaveBeenCalledTimes(1);
        expect(updateOrderFn).toHaveBeenCalledWith(
            "sale-999",
            { returnOrderId: null, returnKind: null },
            expect.objectContaining({ id: "sale-999" })
        );
    });
});

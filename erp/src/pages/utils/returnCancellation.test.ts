import { describe, expect, it } from "vitest";
import { buildCancelledReturn, clearReturnLink } from "./returnCancellation";

describe("cancelamento de devolucao", () => {
    it("preserva o registro e muda o status para cancelado", () => {
        expect(buildCancelledReturn({ orderType: "return", status: "scheduled", returnStockProcessed: false } as any))
            .toEqual({ status: "cancelled", returnStockProcessed: false });
    });

    it("bloqueia devolucao que ja movimentou o estoque", () => {
        expect(() => buildCancelledReturn({ orderType: "return", status: "fulfilled", returnStockProcessed: true } as any))
            .toThrow("não pode ser cancelada");
    });

    it("remove o vinculo da venda original", () => {
        expect(clearReturnLink()).toHaveProperty("returnOrderId", undefined);
    });
});

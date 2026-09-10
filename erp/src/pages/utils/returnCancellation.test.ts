import { describe, expect, it } from "vitest";
import { buildCancelledReturn, clearReturnLink } from "./returnCancellation";

describe("cancelamento e estorno de devolucao", () => {
    it("preserva o registro e muda o status para cancelado com flags de estorno", () => {
        expect(buildCancelledReturn({ orderType: "return", status: "scheduled", returnStockProcessed: true } as any))
            .toEqual({ status: "cancelled", returnStockProcessed: false, returnStockReversed: true });
    });

    it("permite estornar devolucao atendida e reverte as flags de estoque", () => {
        expect(buildCancelledReturn({ orderType: "return", status: "fulfilled", returnStockProcessed: true } as any))
            .toEqual({ status: "cancelled", returnStockProcessed: false, returnStockReversed: true });
    });

    it("remove o vinculo da venda original", () => {
        expect(clearReturnLink()).toHaveProperty("returnOrderId", undefined);
    });
});

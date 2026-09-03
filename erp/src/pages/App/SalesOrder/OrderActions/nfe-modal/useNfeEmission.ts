import { useState } from "react";
import Order from "@/pages/types/order.type";
import { emitNfeForOrder, NfeEmissionResult, printOrderDanfe } from "@/pages/utils/nfe/nfeService";
import { toast } from "react-toastify";

export function useNfeEmission(order: Order | null, onSuccess?: () => void) {
    const [environment, setEnvironment] = useState<1 | 2>(2); // 2 = Homologação (Testes)
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emissionResult, setEmissionResult] = useState<NfeEmissionResult | null>(null);

    const handleEmit = async () => {
        if (!order) return;
        setIsSubmitting(true);
        try {
            const res = await emitNfeForOrder(order, environment);
            if (!res.success) {
                toast.error(res.error || "Erro ao validar dados para emissão.");
                setEmissionResult(res);
                return;
            }

            setEmissionResult(res);
            toast.success("Nota fiscal de homologação emitida e autorizada com sucesso! 🎉");
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message || "Erro inesperado ao emitir nota fiscal.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrintDanfe = () => {
        if (!order) return;
        if (emissionResult?.danfeData) {
            import("@/pages/utils/nfe/danfeGenerator").then(m => {
                m.openDanfePrintWindow(emissionResult.danfeData!);
            });
        } else if ((order as any).nfeData) {
            printOrderDanfe(order);
        }
    };

    return {
        environment,
        setEnvironment,
        isSubmitting,
        emissionResult,
        handleEmit,
        handlePrintDanfe
    };
}

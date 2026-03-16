import { useState, useEffect } from "react";
import VariationType from "../../types/variation.type";
import { subscribeToVariations, moveToTrash, checkVariationUsage } from "../../utils/variationService";
import { toast } from "react-toastify";

export const useVariations = () => {
    const [variations, setVariations] = useState<VariationType[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshSignal, setRefreshSignal] = useState(0);

    const refresh = () => setRefreshSignal(prev => prev + 1);

    useEffect(() => {
        const unsubscribe = subscribeToVariations((data) => {
            setVariations(data.filter((v) => !v.deleted));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [refreshSignal]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        
        const variation = variations.find(v => v.id === id);
        if (!variation) return;

        if (window.confirm(`Tem certeza que deseja apagar o atributo "${variation.name}"?`)) {
            try {
                // Check if any product is using this attribute
                const isUsed = await checkVariationUsage(variation.name);
                if (isUsed) {
                    toast.warning(`Não é possível excluir o atributo "${variation.name}" pois ele está vinculado a um ou mais produtos.`);
                    return;
                }

                await moveToTrash(id);
                toast.success("Atributo movido para a lixeira.");
            } catch (error) {
                console.error(error);
                toast.error("Erro ao apagar atributo.");
            }
        }
    };

    return { variations, loading, handleDelete, refresh };
};

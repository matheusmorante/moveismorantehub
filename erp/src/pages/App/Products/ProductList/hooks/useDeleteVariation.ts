import { useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { checkVariationIsUsed, physicalDeleteVariation } from '@/pages/utils/productService';

export const useDeleteVariation = (productId: string, onRefresh?: () => void) => {
    const [checkingUsageId, setCheckingUsageId] = useState<string | null>(null);
    const [usageCache, setUsageCache] = useState<Record<string, boolean>>({});

    const handleCheckAndAskDelete = useCallback(async (variationId: string) => {
        if (!variationId) return;
        
        // Se já tivermos o resultado em cache e ele estiver em uso, não permite.
        if (usageCache[variationId] === true) return;

        setCheckingUsageId(variationId);
        try {
            const isUsed = await checkVariationIsUsed(variationId);
            setUsageCache(prev => ({ ...prev, [variationId]: isUsed }));
            
            if (isUsed) {
                // Notifica que não pode ser excluído
                Swal.fire({
                    title: 'Não é possível excluir',
                    text: 'Esta variação possui histórico de movimentação ou pedidos e não pode ser excluída.',
                    icon: 'error',
                });
                return;
            }

            // Exibir modal de confirmação de 5 segundos
            let timerInterval: any;
            const result = await Swal.fire({
                title: 'Excluir Variação?',
                text: 'Esta variação não está sendo usada por nada, então não haverá problema ao excluí-la definitivamente.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Confirmar Exclusão (5s)',
                cancelButtonText: 'Cancelar',
                didOpen: () => {
                    const confirmBtn = Swal.getConfirmButton();
                    if (confirmBtn) {
                        confirmBtn.disabled = true;
                        let timeLeft = 5;
                        timerInterval = setInterval(() => {
                            timeLeft -= 1;
                            if (timeLeft > 0) {
                                confirmBtn.textContent = `Confirmar Exclusão (${timeLeft}s)`;
                            } else {
                                clearInterval(timerInterval);
                                confirmBtn.disabled = false;
                                confirmBtn.textContent = 'Confirmar Exclusão';
                            }
                        }, 1000);
                    }
                },
                willClose: () => {
                    clearInterval(timerInterval);
                }
            });

            if (result.isConfirmed) {
                const res = await physicalDeleteVariation(productId, variationId);
                if (res.success) {
                    if (onRefresh) onRefresh();
                } else {
                    Swal.fire('Erro', res.message || 'Não foi possível excluir.', 'error');
                }
            }
        } finally {
            setCheckingUsageId(null);
        }
    }, [productId, onRefresh, usageCache]);

    return {
        checkingUsageId,
        usageCache,
        handleCheckAndAskDelete
    };
};

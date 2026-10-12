import { useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { physicalDeleteVariation } from '@/pages/utils/productService';

export const useDeleteVariation = (productId: string, onRefresh?: () => void) => {
  const [checkingUsageId, setCheckingUsageId] = useState<string | null>(null);
  const usageCache: Record<string, boolean> = {};

  const handleCheckAndAskDelete = useCallback(
    async (variationId: string) => {
      if (!variationId) return;

      setCheckingUsageId(variationId);
      try {
        let timerInterval: any;
        const result = await Swal.fire({
          title: 'Excluir variação?',
          text: 'O sistema verificará os vínculos antes de excluir. Se for a única variação, o produto também será desativado.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Confirmar Exclusão (3s)',
          cancelButtonText: 'Cancelar',
          didOpen: () => {
            const confirmBtn = Swal.getConfirmButton();
            if (confirmBtn) {
              confirmBtn.disabled = true;
              let timeLeft = 3;
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
          },
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
    },
    [productId, onRefresh]
  );

  return {
    checkingUsageId,
    usageCache,
    handleCheckAndAskDelete,
  };
};

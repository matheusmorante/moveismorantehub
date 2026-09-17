import { useCallback } from 'react';

export const useProductAiActions = (productId: string) => {
    const handleCopyAiInstructions = useCallback(async (e: React.MouseEvent, onComplete?: () => void) => {
        e.stopPropagation();
        if (onComplete) onComplete();
        try {
            const { postShareService } = await import('@/pages/App/Marketing/Posts/services/postShareService');
            const url = await postShareService.getOrCreateShareUrl(productId);
            await navigator.clipboard.writeText(url);
            const { toast } = await import('react-toastify');
            toast.success('Link de instruções para IA copiado com sucesso!');
        } catch {
            const { toast } = await import('react-toastify');
            toast.error('Não foi possível gerar o link para IA.');
        }
    }, [productId]);

    return { handleCopyAiInstructions };
};

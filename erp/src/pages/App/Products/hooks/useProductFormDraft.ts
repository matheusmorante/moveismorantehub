import { useState, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import Product from '../../../types/product.type';
import { saveProduct } from '@/pages/utils/productService';
import { getEnteredProductName, isDraftSaveEligible } from './productDraftRules';

export { getEnteredProductName, isDraftSaveEligible };

export function useProductFormDraft(
    formData: Partial<Product>,
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>,
    _isOpen: boolean,
    _isProductCreation: boolean,
    _editingVariationId: string | null,
    hasChanged: React.MutableRefObject<boolean>
) {
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const isSavingDraftRef = useRef(false);

    const saveDraftManually = useCallback(async (data: Partial<Product>): Promise<boolean> => {
        const draftTitle = getEnteredProductName(data);
        if (!draftTitle) {
            toast.error("Informe o nome do produto para permitir salvar o rascunho.");
            return false;
        }

        if (isSavingDraftRef.current) return false;
        isSavingDraftRef.current = true;
        setIsSavingDraft(true);

        try {
            const normalizedData = {
                ...data,
                name: draftTitle,
                title: data.title || draftTitle,
                isDraft: true,
                active: false,
                status: 'draft'
            } as Product;

            const savedId = await saveProduct(normalizedData);

            setFormData(prev => ({
                ...prev,
                id: savedId,
                name: draftTitle,
                isDraft: true,
                active: false,
                status: 'draft'
            }));

            hasChanged.current = false;
            toast.success("Rascunho salvo com sucesso!");
            return true;
        } catch (error: any) {
            console.error('[Draft] Falha ao salvar rascunho:', error);
            toast.error(`Erro ao salvar rascunho: ${error.message || 'Erro desconhecido'}`);
            return false;
        } finally {
            isSavingDraftRef.current = false;
            setIsSavingDraft(false);
        }
    }, [setFormData, hasChanged]);

    return {
        isSavingDraft,
        isSavingDraftRef,
        saveDraftManually,
        getEnteredProductName,
        canSaveDraft: isDraftSaveEligible(formData)
    };
}


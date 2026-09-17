import { useState } from 'react';
import type Product from '@/pages/types/product.type';
import { getFullProduct } from '@/pages/utils/productService';
import { prepareNewParentWithVariation, prepareExistingParentNewVariation } from '../services/inboundProductPreparationService';
import type { QuickRegisterItem, QuickRegisterSelection } from '../modals/QuickRegisterVariationModal';
import { toast } from 'react-toastify';

export function useInboundInvoiceQuickRegister(supplierId?: string) {
    const [quickRegisterTarget, setQuickRegisterTarget] = useState<{ itemNumber: number; item: QuickRegisterItem } | null>(null);
    const [isPreparingProduct, setIsPreparingProduct] = useState(false);
    const [creatingItemNumber, setCreatingItemNumber] = useState<number | null>(null);
    const [creatingVariationId, setCreatingVariationId] = useState<string | null>(null);
    const [editingParentProduct, setEditingParentProduct] = useState<Product | null>(null);
    const [initialProductData, setInitialProductData] = useState<Partial<Product> | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [suggestedCategory, setSuggestedCategory] = useState<{ id: string; name: string } | null>(null);

    const handleQuickRegisterConfirm = async (selection: QuickRegisterSelection) => {
        if (!quickRegisterTarget) return;
        const { itemNumber, item } = quickRegisterTarget;
        setQuickRegisterTarget(null);

        if (selection.mode === 'EXISTING_PARENT') {
            try {
                setIsPreparingProduct(true);
                const parentProduct = await getFullProduct(selection.parentProductId);
                if (!parentProduct) {
                    setIsPreparingProduct(false);
                    toast.error('Produto pai não encontrado.');
                    return;
                }

                const updatedParentProduct = await prepareExistingParentNewVariation(parentProduct, item);

                setIsPreparingProduct(false);
                setCreatingItemNumber(itemNumber);
                setCreatingVariationId(updatedParentProduct.variations?.[updatedParentProduct.variations.length - 1]?.id || null);
                setEditingParentProduct(updatedParentProduct);
                setIsProductModalOpen(true);
            } catch (err: any) {
                setIsPreparingProduct(false);
                toast.error(err.message || 'Erro ao carregar produto pai.');
            }
        } else {
            try {
                setIsPreparingProduct(true);
                const preparedData = await prepareNewParentWithVariation(item, supplierId);
                setIsPreparingProduct(false);

                setCreatingItemNumber(itemNumber);
                setCreatingVariationId(preparedData.variations?.[0]?.id || null);
                setEditingParentProduct(null);
                setInitialProductData(preparedData);
                setIsProductModalOpen(true);
            } catch (err: any) {
                setIsPreparingProduct(false);
                toast.error(err.message || 'Erro ao preparar formulário de cadastro.');
            }
        }
    };

    const editProduct = async (product: Product) => {
        try {
            setIsPreparingProduct(true);
            const parentProduct = await getFullProduct(product.id as string);
            if (!parentProduct) {
                toast.error('Produto não encontrado.');
                return;
            }
            setCreatingItemNumber(null);
            setEditingParentProduct(parentProduct);
            setInitialProductData(null);
            setIsProductModalOpen(true);
        } catch (error) {
            toast.error('Erro ao abrir edição do produto.');
        } finally {
            setIsPreparingProduct(false);
        }
    };

    const closeProductModal = () => {
        setIsProductModalOpen(false);
        setCreatingItemNumber(null);
        setCreatingVariationId(null);
        setEditingParentProduct(null);
        setInitialProductData(null);
        setSuggestedCategory(null);
    };

    return {
        quickRegisterTarget,
        setQuickRegisterTarget,
        handleQuickRegisterConfirm,
        isPreparingProduct,
        setIsPreparingProduct,
        creatingItemNumber,
        setCreatingItemNumber,
        creatingVariationId,
        setCreatingVariationId,
        editingParentProduct,
        setEditingParentProduct,
        initialProductData,
        setInitialProductData,
        isProductModalOpen,
        setIsProductModalOpen,
        suggestedCategory,
        setSuggestedCategory,
        editProduct,
        closeProductModal
    };
}

import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import { 
    deactivateProduct,
    deleteProduct, 
    bulkMoveToTrash, 
    bulkRestoreProducts 
} from '@/pages/utils/productService';
import Product from '../../../../types/product.type';

/**
 * Executa o descarte definitivo de rascunho de produto
 */
export const discardProductDraft = async (id: string, refresh: () => void): Promise<void> => {
    const confirmed = window.confirm(
        "Deseja descartar este rascunho permanentemente?\n\nEsta ação não poderá ser desfeita."
    );
    if (!confirmed) return;

    const toastId = toast.loading("Descartando rascunho...");
    try {
        await supabase.from('product_variations').delete().eq('product_id', id);
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
            await supabase.from('products').update({ deleted: true, active: false }).eq('id', id);
        }
        refresh();
        toast.update(toastId, { render: "Rascunho descartado com sucesso!", type: "success", isLoading: false, autoClose: 3000 });
    } catch (error: any) {
        toast.update(toastId, { render: error.message || "Erro ao descartar rascunho.", type: "error", isLoading: false, autoClose: 3000 });
    }
};

/**
 * Desativa um produto operacional individual
 */
export const deactivateSingleProduct = async (id: string, refresh: () => void): Promise<void> => {
    const confirmed = window.confirm(
        "Desativar este produto?\n\nEle permanecerá na lista com a etiqueta de 'Desativado'."
    );
    if (!confirmed) return;

    const toastId = toast.loading("Desativando produto...");
    try {
        await deactivateProduct(id);
        refresh();
        toast.update(toastId, { render: "Produto desativado com sucesso.", type: "info", isLoading: false, autoClose: 3500 });
    } catch (error: any) {
        toast.update(toastId, { render: error.message || "Erro ao desativar produto.", type: "error", isLoading: false, autoClose: 3000 });
    }
};

/**
 * Exclui permanentemente um produto do sistema
 */
export const deleteProductPermanently = async (id: string, refresh: () => void): Promise<void> => {
    const toastId = toast.loading("Verificando e excluindo produto...");
    try {
        const result = await deleteProduct(id);
        if (result.success) {
            toast.update(toastId, { render: "Produto excluído com sucesso!", type: "success", isLoading: false, autoClose: 3000 });
            refresh();
        } else {
            toast.update(toastId, { render: result.message || "Não foi possível excluir o produto.", type: "error", isLoading: false, autoClose: 5000 });
        }
    } catch (error: any) {
        toast.update(toastId, { render: error.message || "Erro ao tentar excluir produto.", type: "error", isLoading: false, autoClose: 5000 });
    }
};

/**
 * Desativa múltiplos produtos selecionados em massa
 */
export const executeBulkTrash = async (
    selectedProducts: string[],
    refresh: () => void,
    setSelectedProducts: (ids: string[]) => void,
    setLoading: (loading: boolean) => void
): Promise<void> => {
    if (selectedProducts.length === 0) return;
    const confirmed = window.confirm(
        `Desativar ${selectedProducts.length} produto(s)?`
    );
    if (!confirmed) return;

    const toastId = toast.loading("Desativando itens selecionados...");
    setLoading(true);
    try {
        const realIds = selectedProducts.filter(id => !id.toString().includes('_'));
        const result = await bulkMoveToTrash(realIds);
        refresh();
        
        if (result.successCount > 0) {
            toast.update(toastId, { 
                render: `${result.successCount} produto(s) desativado(s) com sucesso.`,
                type: "info", 
                isLoading: false, 
                autoClose: 3000 
            });
        } else {
            toast.dismiss(toastId);
        }
        
        if (result.errorCount > 0) {
            result.errors.forEach(err => toast.warning(err));
        }
        setSelectedProducts([]);
    } catch (error) {
        toast.update(toastId, { render: "Erro ao desativar produtos em massa.", type: "error", isLoading: false, autoClose: 3000 });
        console.error(error);
    } finally {
        setLoading(false);
    }
};

/**
 * Ativa múltiplos produtos selecionados em massa
 */
export const executeBulkRestore = async (
    selectedProducts: string[],
    refresh: () => void,
    removeRestoredProductsFromTrash: (ids: string[]) => void,
    setSelectedProducts: (ids: string[]) => void,
    setLoading: (loading: boolean) => void
): Promise<void> => {
    if (selectedProducts.length === 0) return;
    setLoading(true);
    try {
        const realIds = selectedProducts.filter(id => !id.toString().includes('_'));
        await bulkRestoreProducts(realIds);
        removeRestoredProductsFromTrash(realIds);
        refresh();
        toast.success(`${realIds.length} produto(s) ativado(s) com sucesso!`);
        setSelectedProducts([]);
    } catch (error) {
        toast.error("Erro ao ativar produtos selecionados.");
    } finally {
        setLoading(false);
    }
};

/**
 * Exclui permanentemente múltiplos produtos selecionados em massa
 */
export const executeBulkPermanentDelete = async (
    selectedProducts: string[],
    refresh: () => void,
    setSelectedProducts: (ids: string[]) => void,
    setLoading: (loading: boolean) => void
): Promise<void> => {
    if (selectedProducts.length === 0) return;
    const toastId = toast.loading("Excluindo produtos selecionados...");
    setLoading(true);
    let successCount = 0;
    let errors: string[] = [];

    try {
        const realIds = selectedProducts.filter(id => !id.toString().includes('_'));
        for (const id of realIds) {
            const res = await deleteProduct(id);
            if (res.success) {
                successCount++;
            } else if (res.message) {
                errors.push(res.message);
            }
        }

        if (successCount > 0) {
            toast.update(toastId, { render: `${successCount} produto(s) excluído(s) permanentemente.`, type: "success", isLoading: false, autoClose: 3000 });
            refresh();
        } else {
            toast.dismiss(toastId);
        }

        if (errors.length > 0) {
            toast.error(errors[0]);
        }
        setSelectedProducts([]);
    } catch (error: any) {
        toast.update(toastId, { render: "Erro ao excluir produtos em massa.", type: "error", isLoading: false, autoClose: 3000 });
    } finally {
        setLoading(false);
    }
};

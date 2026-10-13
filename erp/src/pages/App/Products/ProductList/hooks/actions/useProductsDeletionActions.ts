import { toast } from 'react-toastify';
import {
  deactivateProduct,
  deleteProduct,
  physicalDeleteProduct,
  bulkMoveToTrash,
  bulkRestoreProducts,
} from '@/pages/utils/productService';

/**
 * Executa o descarte definitivo de rascunho de produto
 */
export const discardProductDraft = async (id: string, refresh: () => void): Promise<void> => {
  const confirmed = window.confirm(
    'Deseja descartar este rascunho permanentemente?\n\nEsta ação não poderá ser desfeita.'
  );
  if (!confirmed) return;

  const toastId = toast.loading('Descartando rascunho...');
  try {
    const result = await physicalDeleteProduct(id);
    if (!result.success) {
      toast.update(toastId, {
        render: result.message || 'Não foi possível descartar o rascunho.',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
      return;
    }

    refresh();
    toast.update(toastId, {
      render: result.message || 'Rascunho descartado com sucesso!',
      type: 'success',
      isLoading: false,
      autoClose: 3000,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao descartar rascunho.';
    toast.update(toastId, { render: message, type: 'error', isLoading: false, autoClose: 3000 });
  }
};

/**
 * Desativa um produto operacional individual
 */
export const deactivateSingleProduct = async (id: string): Promise<void> => {
  const confirmed = window.confirm(
    "Desativar este produto?\n\nEle permanecerá na lista com a etiqueta de 'Desativado'."
  );
  if (!confirmed) return;

  const toastId = toast.loading('Desativando produto...');
  try {
    await deactivateProduct(id);
    toast.update(toastId, {
      render: 'Produto desativado com sucesso.',
      type: 'info',
      isLoading: false,
      autoClose: 3500,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao desativar produto.';
    toast.update(toastId, { render: message, type: 'error', isLoading: false, autoClose: 3000 });
  }
};

/** Exclui permanentemente um produto após confirmar a ausência de referências no banco. */
export const deleteProductPermanently = async (id: string, refresh: () => void): Promise<void> => {
  const confirmed = window.confirm(
    'Excluir este produto permanentemente?\n\nA exclusão só será permitida se não houver vínculos, estoque ou histórico. Esta ação não poderá ser desfeita.'
  );
  if (!confirmed) return;

  const toastId = toast.loading('Verificando vínculos e excluindo produto...');
  try {
    const result = await physicalDeleteProduct(id);
    if (result.success) {
      refresh();
      toast.update(toastId, {
        render: result.message || 'Produto excluído com sucesso.',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });
    } else {
      toast.update(toastId, {
        render: result.message || 'Não foi possível excluir o produto.',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao tentar excluir produto.';
    toast.update(toastId, { render: message, type: 'error', isLoading: false, autoClose: 5000 });
  }
};

/**
 * Desativa múltiplos produtos selecionados em massa
 */
export const executeBulkTrash = async (
  selectedProducts: readonly string[],
  setSelectedProducts: (ids: string[]) => void,
  setLoading: (loading: boolean) => void
): Promise<void> => {
  if (selectedProducts.length === 0) return;
  const confirmed = window.confirm(`Desativar ${selectedProducts.length} produto(s)?`);
  if (!confirmed) return;

  const toastId = toast.loading('Desativando itens selecionados...');
  setLoading(true);
  try {
    const realIds = selectedProducts.filter((id) => !id.toString().includes('_'));
    const result = await bulkMoveToTrash(realIds);

    if (result.successCount > 0) {
      toast.update(toastId, {
        render: `${result.successCount} produto(s) desativado(s) com sucesso.`,
        type: 'info',
        isLoading: false,
        autoClose: 3000,
      });
    } else {
      toast.dismiss(toastId);
    }

    if (result.errorCount > 0) {
      result.errors.forEach((err) => toast.warning(err));
    }
    setSelectedProducts([]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao desativar produtos em massa.';
    toast.update(toastId, { render: message, type: 'error', isLoading: false, autoClose: 3000 });
    console.error(error);
  } finally {
    setLoading(false);
  }
};

/**
 * Ativa múltiplos produtos selecionados em massa
 */
export const executeBulkRestore = async (
  selectedProducts: readonly string[],
  removeRestoredProductsFromTrash: (ids: string[]) => void,
  setSelectedProducts: (ids: string[]) => void,
  setLoading: (loading: boolean) => void
): Promise<void> => {
  if (selectedProducts.length === 0) return;
  setLoading(true);
  try {
    const realIds = selectedProducts.filter((id) => !id.toString().includes('_'));
    await bulkRestoreProducts(realIds);
    removeRestoredProductsFromTrash(realIds);
    toast.success(`${realIds.length} produto(s) ativado(s) com sucesso!`);
    setSelectedProducts([]);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro ao ativar produtos selecionados.';
    toast.error(message);
  } finally {
    setLoading(false);
  }
};

/**
 * Exclui permanentemente múltiplos produtos selecionados em massa
 */
export const executeBulkPermanentDelete = async (
  selectedProducts: readonly string[],
  refresh: () => void,
  setSelectedProducts: (ids: string[]) => void,
  setLoading: (loading: boolean) => void
): Promise<void> => {
  if (selectedProducts.length === 0) return;
  const toastId = toast.loading('Excluindo produtos selecionados...');
  setLoading(true);
  let successCount = 0;
  const errors: string[] = [];

  try {
    const realIds = selectedProducts.filter((id) => !id.toString().includes('_'));
    for (const id of realIds) {
      const res = await deleteProduct(id, { deferQueryInvalidation: true });
      if (res.success) {
        successCount++;
      } else if (res.message) {
        errors.push(res.message);
      }
    }

    if (realIds.length > 0) refresh();

    if (successCount > 0) {
      toast.update(toastId, {
        render: `${successCount} produto(s) excluído(s) permanentemente.`,
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });
    } else {
      toast.dismiss(toastId);
    }

    if (errors.length > 0) {
      toast.error(errors[0]);
    }
    setSelectedProducts([]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao excluir produtos em massa.';
    toast.update(toastId, { render: message, type: 'error', isLoading: false, autoClose: 3000 });
  } finally {
    setLoading(false);
  }
};

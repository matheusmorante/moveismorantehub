import React, { useState, useEffect, useRef } from 'react';
import { ProductSaveResultChannels } from './ProductSaveResultChannels';
import Product from '../../../../../types/product.type';
import { saveProduct } from '@/pages/utils/productService';
import { toast } from 'react-toastify';
import { isNonConventionalProduct } from '@/pages/utils/productKindRules';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { savedProductFormSchema } from '../../../../../../../../shared-utils/productDomainValidation';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import {
  checkEcomLegibility,
  type EcomLegibilityResult,
} from '../../../../../../../../shared-utils/catalogPublicationValidation';
import { fetchTechnicalFieldDefinitions } from '../../../services/technicalFieldService';
import { fetchCharacteristicGroups } from '@/pages/utils/characteristicGroupService';

export interface ProductErpChecks {
  readonly origin?: boolean;
  readonly description?: boolean;
  readonly unitPrice?: boolean;
  readonly categories?: boolean;
  readonly supplier?: boolean;
}

export interface ProductEcomChecks {
  readonly marketplaceTitle?: boolean;
  readonly description?: boolean;
  readonly dimensions?: boolean;
  readonly categories?: boolean;
  readonly images?: boolean;
  readonly categoryCharacteristics?: boolean;
}

export interface ProductSaveResult {
  readonly erpLegible: boolean;
  readonly ecomLegible: boolean;
  readonly checksErp: ProductErpChecks;
  readonly checksEcom: ProductEcomChecks;
  readonly product: Product;
}

export interface ProductSaveResultModalProps {
  readonly saveResult: ProductSaveResult | null;
  readonly onCloseModal: () => void;
  readonly onSuccess?: (newProduct: Product) => void | boolean | Promise<void | boolean>;
  readonly onCloseForm: () => void;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly canPublishToCatalog?: boolean;
}

/**
 * Modal exibido após o salvamento de um produto, detalhando prontidão para ERP e Catálogo Digital.
 */
export const ProductSaveResultModal: React.FC<ProductSaveResultModalProps> = ({
  saveResult,
  onCloseModal,
  onSuccess,
  onCloseForm,
  setFormData,
  canPublishToCatalog = true,
}) => {
  const [catalogReadiness, setCatalogReadiness] = useState<{
    productId: string;
    status: 'checking' | 'ready' | 'error';
    result?: EcomLegibilityResult;
  }>({ productId: '', status: 'checking' });
  const [currentProduct, setCurrentProduct] = useState<Product | null>(saveResult?.product ?? null);
  const [updatingErp, setUpdatingErp] = useState(false);
  const [updatingEcom, setUpdatingEcom] = useState(false);
  const [finishing, setFinishing] = useState(false), [finishError, setFinishError] = useState('');
  const [channelUncertain, setChannelUncertain] = useState(false);
  const uncertainProducts = useRef(new Set<string>());
  const finishInFlight = useRef(false), active = useRef(true);
  const currentResult = useRef(saveResult); currentResult.current = saveResult;
  const finishForm = useZodForm(savedProductFormSchema, { ...currentProduct, id: currentProduct?.id || '' });
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  useEffect(() => {
    if (saveResult?.product) {
      setCurrentProduct(saveResult.product);
      setChannelUncertain(uncertainProducts.current.has(saveResult.product.id || ''));
      setFinishError('');
    }
  }, [saveResult]);

  useEffect(() => {
    const product = saveResult?.product;
    if (!product || !canPublishToCatalog) return;
    let cancelled = false;
    const productId = product.id || '';
    setCatalogReadiness({ productId, status: 'checking' });
    void (async () => {
      try {
        const [requirements, groupData] = await Promise.all([
          withTimeout(
            fetchTechnicalFieldDefinitions('product-form', {
              categoryIds: product.categoryIds ?? [],
              forceRefresh: true,
              requireCategoryLinks: true,
            }),
            15000,
            null,
            'produto:verificar-requisitos-do-catalogo'
          ),
          withTimeout(
            fetchCharacteristicGroups(),
            15000,
            null,
            'produto:verificar-grupos-de-características'
          ),
        ]);
        if (!requirements) throw new Error('Requisitos de categoria indisponíveis.');
        if (!groupData) throw new Error('Aplicações dos grupos indisponíveis.');
        const result = checkEcomLegibility(product as any, requirements, {
          characteristicGroups: groupData.groups,
        });
        if (!cancelled) setCatalogReadiness({ productId, status: 'ready', result });
      } catch {
        if (!cancelled) setCatalogReadiness({ productId, status: 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, [saveResult?.product, canPublishToCatalog]);

  useEffect(() => {
    if (!saveResult) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !finishInFlight.current) {
        onCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveResult, onCloseModal]);

  if (!saveResult || !currentProduct) return null;

  const isNonConventional = isNonConventionalProduct(currentProduct);
  const isERPActive = !isNonConventional && currentProduct.active !== false;
  const isCatalogPublished = currentProduct.status === 'published';
  const currentCatalogReadiness =
    catalogReadiness.productId === (currentProduct.id || '')
      ? catalogReadiness
      : { productId: currentProduct.id || '', status: 'checking' as const };
  const catalogCheck = currentCatalogReadiness.status === 'ready'
    ? currentCatalogReadiness.result
    : undefined;
  const canPublishNow = Boolean(catalogCheck?.isLegible);

  const handleToggleErp = async () => {
    if (finishInFlight.current || channelUncertain || isNonConventional) return;
    const newActive = !isERPActive;
    if (newActive && isNonConventionalProduct(currentProduct)) {
      toast.warning('Produtos de origem diferente de Convencional não podem ser ativados no ERP.');
      return;
    }
    finishInFlight.current = true; setFinishError(''); setUpdatingErp(true);
    const submitted = saveResult;
    const updatedData: Product = { ...currentProduct, active: newActive };
    try {
      await finishForm.validateAndRun({ ...updatedData, id: updatedData.id || '' }, async (values) => {
        if (!active.current || currentResult.current !== submitted) return;
        const savedId = await withTimeout(saveProduct(values as Product), 20000, null, 'produto:alterar-ativacao-erp');
        if (!savedId || savedId !== currentProduct.id) uncertainProducts.current.add(currentProduct.id || '');
        if (!active.current || currentResult.current !== submitted) return;
        if (!savedId || savedId !== currentProduct.id) { setChannelUncertain(true); throw new Error('A alteração do ERP não foi confirmada. Confira o cadastro antes de repetir.'); }
        setCurrentProduct(values as Product);
        setFormData((prev) => ({ ...prev, active: newActive }));
        toast.success(newActive ? 'Produto ativado no ERP!' : 'Produto desativado no ERP!');
      }, (errors) => setFinishError(Object.values(flattenFormErrors(errors))[0] || 'Confira o produto.'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      uncertainProducts.current.add(currentProduct.id || '');
      if (active.current && currentResult.current === submitted) setChannelUncertain(true);
      if (active.current && currentResult.current === submitted) { setFinishError(`Erro ao atualizar ERP: ${message}`); toast.error(`Erro ao atualizar ERP: ${message}`); }
    } finally {
      finishInFlight.current = false; if (active.current) setUpdatingErp(false);
    }
  };

  const handleToggleCatalog = async () => {
    if (finishInFlight.current || channelUncertain || !canPublishToCatalog) return;
    const newStatus: 'hidden' | 'published' = isCatalogPublished ? 'hidden' : 'published';

    if (newStatus === 'published' && !canPublishNow) {
      toast.warning(
        currentCatalogReadiness.status === 'error'
          ? 'Não foi possível verificar as características obrigatórias da categoria.'
          : currentCatalogReadiness.status === 'checking'
            ? 'Aguarde a verificação dos requisitos do Catálogo Digital.'
            : 'Complete todos os requisitos pendentes antes de publicar no Catálogo.'
      );
      return;
    }

    finishInFlight.current = true; setFinishError(''); setUpdatingEcom(true);
    const submitted = saveResult;
    const updatedVariations = (currentProduct.variations || []).map((v) => ({
      ...v,
      status: newStatus,
    }));
    const updatedData: Product = {
      ...currentProduct,
      status: newStatus,
      variations: updatedVariations,
    };
    try {
      await finishForm.validateAndRun({ ...updatedData, id: updatedData.id || '' }, async (values) => {
      if (!active.current || currentResult.current !== submitted) return;
      const savedId = await withTimeout(saveProduct(values as Product), 20000, null, 'produto:alterar-publicacao-catalogo');
      if (!savedId || savedId !== currentProduct.id) uncertainProducts.current.add(currentProduct.id || '');
      if (!active.current || currentResult.current !== submitted) return;
      if (!savedId || savedId !== currentProduct.id) { setChannelUncertain(true); throw new Error('A publicação não foi confirmada. Confira o cadastro antes de repetir.'); }
      setCurrentProduct(values as Product);
      setFormData((prev) => ({
        ...prev,
        status: newStatus,
        variations: (prev.variations || []).map((v) => ({
          ...v,
          status: newStatus,
        })),
      }));
      toast.success(
        newStatus === 'published'
          ? 'Produto publicado no Catálogo Digital! 🛍️'
          : 'Produto ocultado do Catálogo Digital!'
      );
      }, (errors) => setFinishError(Object.values(flattenFormErrors(errors))[0] || 'Confira o produto.'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      uncertainProducts.current.add(currentProduct.id || '');
      if (active.current && currentResult.current === submitted) setChannelUncertain(true);
      if (active.current && currentResult.current === submitted) { setFinishError(`Erro ao atualizar Catálogo: ${message}`); toast.error(`Erro ao atualizar Catálogo: ${message}`); }
    } finally {
      finishInFlight.current = false; if (active.current) setUpdatingEcom(false);
    }
  };

  const handleFinish = async () => {
    if (finishInFlight.current || channelUncertain || updatingErp || updatingEcom) return;
    finishInFlight.current = true;
    setFinishing(true); setFinishError('');
    const submitted = saveResult;
    try {
      await finishForm.validateAndRun({ ...currentProduct, id: currentProduct.id || '' }, async (values) => {
        if (!active.current || currentResult.current !== submitted) return;
        const completed = await withTimeout(Promise.resolve(onSuccess?.(values as Product)).then((result) => result !== false), 90000, false, 'produto:concluir-cadastro-salvo');
        if (!active.current || currentResult.current !== submitted) return;
        if (!completed) throw new Error('Produto salvo. Não foi possível concluir a etapa seguinte. Confira os vínculos informados antes de continuar.');
        onCloseModal(); onCloseForm();
      }, (errors) => setFinishError(Object.values(flattenFormErrors(errors))[0] || 'Confira o cadastro salvo.'));
    } catch (error) {
      if (active.current && currentResult.current === submitted) setFinishError(error instanceof Error ? error.message : 'Não foi possível concluir a etapa seguinte.');
    } finally { finishInFlight.current = false; if (active.current) setFinishing(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[1000020] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-save-result-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-transparent cursor-default"
        onClick={onCloseModal}
        disabled={finishing || updatingErp || updatingEcom}
        aria-label="Fechar modal"
      />
      <div className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-xl animate-in zoom-in-95 duration-200 text-center max-h-[90vh] overflow-y-auto">
        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
          <i className="bi bi-check-circle-fill text-2xl" aria-hidden="true" />
        </div>

        <h3
          id="product-save-result-modal-title"
          className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider"
        >
          Produto Cadastrado com Sucesso!
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1 mb-5">
          {canPublishToCatalog
            ? 'Confira os requisitos de cada canal e ajuste o status de ativação:'
            : 'Confira os requisitos do ERP e ajuste o status de ativação:'}
        </p>

        <ProductSaveResultChannels
          saveResult={saveResult}
          isNonConventional={isNonConventional}
          isERPActive={isERPActive}
          isCatalogPublished={isCatalogPublished}
          catalogReadinessStatus={currentCatalogReadiness.status}
          catalogCheck={catalogCheck}
          canPublishToCatalog={canPublishToCatalog}
          canPublishNow={canPublishNow}
          finishing={finishing}
          updatingErp={updatingErp}
          updatingEcom={updatingEcom}
          channelUncertain={channelUncertain}
          onToggleErp={handleToggleErp}
          onToggleCatalog={handleToggleCatalog}
        />

        {finishError && <p role="alert" className="mb-3 text-sm text-rose-700 dark:text-rose-300">{finishError}</p>}
        {(finishing || updatingErp || updatingEcom) && <p role="status" className="mb-3 text-sm text-blue-700 dark:text-blue-300"><i className="bi bi-arrow-repeat animate-spin mr-2" aria-hidden="true" />{finishing ? 'Concluindo as etapas após o cadastro...' : 'Salvando a ativação do produto...'}</p>}
        <button
          type="button"
          onClick={handleFinish}
          disabled={finishing || channelUncertain || updatingErp || updatingEcom}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all"
        >
          Concluir
        </button>
      </div>
    </div>
  );
};

export default ProductSaveResultModal;

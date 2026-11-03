import { useEffect, useState } from 'react';
import { useZodForm } from '../../../../../../hooks/useZodForm';
import {
  inboundInvoiceProductParentSearchFormSchema,
  INBOUND_INVOICE_SEARCH_DEBOUNCE_MS,
  INBOUND_INVOICE_SEARCH_MIN_CHARACTERS,
} from '../../../../../../../../shared-utils/inboundProductLinkFormSchemas';
import * as stockService from '../../../../../../services/stockService';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import { saveMobileProduct } from '../../../../../products/services/mobileProductMutationService';
import { landedUnitCost } from '../inboundCostUtils';
import type { MappingItem, Product } from '../types';

interface UseInboundQuickRegistrationParams {
  supplierId: string;
  linkProduct: (item: MappingItem, product: Product) => Promise<boolean>;
  retryProductSearch: (itemNumber: number) => void;
  setErrorMessage: (message: string) => void;
}

export const useInboundQuickRegistration = ({
  supplierId,
  linkProduct,
  retryProductSearch,
  setErrorMessage,
}: UseInboundQuickRegistrationParams) => {
  const [registrationItem, setRegistrationItem] = useState<MappingItem | null>(null);
  const [registrationDefaults, setRegistrationDefaults] = useState<Record<string, any>>();
  const [registrationParent, setRegistrationParent] = useState<any | null>(null);
  const [registrationFormVisible, setRegistrationFormVisible] = useState(false);
  const [registrationOptionsVisible, setRegistrationOptionsVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editingProductItemNumber, setEditingProductItemNumber] = useState<number | null>(null);
  const [editingProductSaved, setEditingProductSaved] = useState(false);
  const [preparingEditProductId, setPreparingEditProductId] = useState('');
  const [parentSearch, setParentSearch] = useState('');
  const [parentResults, setParentResults] = useState<any[]>([]);
  const [parentSearchError, setParentSearchError] = useState('');
  const [parentSearchLoading, setParentSearchLoading] = useState(false);
  const [parentSearchRetryVersion, setParentSearchRetryVersion] = useState(0);
  const parentSearchForm = useZodForm(inboundInvoiceProductParentSearchFormSchema, {
    query: '',
    supplierId: '',
  });
  const searchParentProducts = (query: string) => {
    setParentSearch(query);
    setParentResults([]);
    setParentSearchError('');
  };

  useEffect(() => {
    if (!registrationOptionsVisible || parentSearch.trim().length < INBOUND_INVOICE_SEARCH_MIN_CHARACTERS) {
      setParentResults([]);
      setParentSearchError('');
      setParentSearchLoading(false);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      setParentSearchLoading(true);
      setParentResults([]);
      void (async () => {
        try {
          const values = await parentSearchForm.validateValues({ query: parentSearch, supplierId });
          if (!active) return;
          if (!values) {
            setParentSearchLoading(false);
            return;
          }
          const rows = await stockService.searchInboundInvoiceProductParents(
            values.query,
            values.supplierId
          );
          if (active) {
            setParentResults(rows);
            setParentSearchError('');
          }
        } catch (error) {
          console.warn('[InboundInvoiceMappings] parent product search failed', error);
          if (active) {
            setParentResults([]);
            setParentSearchError('Não foi possível buscar produtos-pai. Tente novamente.');
          }
        } finally {
          if (active) setParentSearchLoading(false);
        }
      })();
    }, INBOUND_INVOICE_SEARCH_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [registrationOptionsVisible, parentSearch, parentSearchRetryVersion, parentSearchForm.validateValues]);

  const retryParentSearch = () => setParentSearchRetryVersion((current) => current + 1);

  const openQuickRegister = (item: MappingItem) => {
    setRegistrationItem(item);
    setRegistrationOptionsVisible(true);
    setParentSearch('');
    setRegistrationParent(null);
    setRegistrationDefaults({
      name: item.productDescription?.trim() || '',
      description: item.additionalDescription || '',
      itemType: 'product',
      mainSupplierId: supplierId,
      costPrice: String(landedUnitCost(item)),
      unitPrice: '',
      stock: '0',
      hasVariations: false,
      variations: [],
    });
  };

  const startNewProductRegistration = () => {
    setRegistrationParent(null);
    setRegistrationOptionsVisible(false);
    setRegistrationFormVisible(true);
  };

  const startVariationRegistration = (parent: any) => {
    setRegistrationParent({ ...parent, allVariations: parent.product_variations || [] });
    setRegistrationDefaults(undefined);
    setRegistrationOptionsVisible(false);
    setRegistrationFormVisible(true);
  };

  const openExistingProductForEdit = async (product: Product, itemNumber: number) => {
    const productId = String(product.productId || '').trim();
    if (!productId || !supplierId) {
      setErrorMessage('Vincule o fornecedor e selecione um produto válido antes de editar.');
      return;
    }
    setPreparingEditProductId(productId);
    setErrorMessage('');
    try {
      const fullProduct = await withTimeout(
        stockService.fetchInboundInvoiceProductForEdit(productId),
        15_000,
        null,
        'entrada:carregar-produto-para-edicao'
      );
      if (!fullProduct || String(fullProduct.id) !== productId) {
        throw new Error('Não foi possível confirmar o cadastro completo do produto.');
      }
      setEditingProduct({ ...fullProduct, selectedVariationId: product.variationId });
      setEditingProductItemNumber(itemNumber);
      setEditingProductSaved(false);
      setRegistrationItem(null);
      setRegistrationDefaults(undefined);
      setRegistrationParent(null);
      setRegistrationOptionsVisible(false);
      setRegistrationFormVisible(true);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Não foi possível abrir a edição do produto. Tente novamente.');
    } finally {
      setPreparingEditProductId('');
    }
  };

  const saveEditedProduct = async (productData: any) => {
    const expectedId = String(editingProduct?.id || '');
    if (!expectedId || String(productData?.id || '') !== expectedId) {
      throw new Error('O cadastro do produto mudou. Feche e abra a edição novamente.');
    }
    const savedId = await saveMobileProduct(productData);
    if (String(savedId || '') !== expectedId) {
      throw new Error('Não foi possível confirmar que o produto editado foi salvo.');
    }
    setEditingProductSaved(true);
    return expectedId;
  };

  const closeProductForm = () => {
    if (editingProductSaved && editingProductItemNumber !== null) {
      retryProductSearch(editingProductItemNumber);
    }
    setEditingProduct(null);
    setEditingProductItemNumber(null);
    setEditingProductSaved(false);
    setRegistrationItem(null);
    setRegistrationDefaults(undefined);
    setRegistrationParent(null);
    setRegistrationFormVisible(false);
  };

  const saveQuickRegisteredProduct = async (productData: any) => {
    if (!registrationItem) return;
    if (
      registrationParent &&
      (productData.variations || []).length <= (registrationParent.allVariations || []).length
    ) {
      throw new Error(
        'Adicione uma nova variação na aba Variações antes de salvar o produto existente.'
      );
    }
    const productId = await saveMobileProduct(productData);
    if (!productId)
      throw new Error('Produto salvo sem identificador; atualize a busca para vinculá-lo.');
    const newVariationName = productData.variations?.[productData.variations.length - 1]?.name;
    const createdProduct = await stockService.getInboundInvoiceProductById(
      String(productId),
      newVariationName
    );
    const linked = await linkProduct(registrationItem, createdProduct);
    if (!linked)
      throw new Error(
        'Produto cadastrado, mas não foi possível concluir o vínculo com a NF-e. Ele continua disponível na busca de produtos.'
      );
    setRegistrationItem(null);
    setRegistrationDefaults(undefined);
    setRegistrationParent(null);
    setRegistrationFormVisible(false);
    return String(productId);
  };

  return {
    registrationItem,
    setRegistrationItem,
    registrationDefaults,
    setRegistrationDefaults,
    registrationParent,
    setRegistrationParent,
    registrationFormVisible,
    setRegistrationFormVisible,
    registrationOptionsVisible,
    setRegistrationOptionsVisible,
    editingProduct,
    preparingEditProductId,
    parentSearch,
    setParentSearch,
    searchParentProducts,
    parentResults,
    parentSearchError,
    parentSearchLoading,
    retryParentSearch,
    openQuickRegister,
    startNewProductRegistration,
    startVariationRegistration,
    openExistingProductForEdit,
    saveEditedProduct,
    closeProductForm,
    saveQuickRegisteredProduct,
  };
};

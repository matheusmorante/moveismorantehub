import { useEffect, useState } from 'react';
import * as stockService from '../../../../../../services/stockService';
import { saveMobileProduct } from '../../../../../products/services/mobileProductMutationService';
import { landedUnitCost } from '../inboundCostUtils';
import type { MappingItem, Product } from '../types';

interface UseInboundQuickRegistrationParams {
  supplierId: string;
  linkProduct: (item: MappingItem, product: Product) => Promise<boolean>;
}

export const useInboundQuickRegistration = ({
  supplierId,
  linkProduct,
}: UseInboundQuickRegistrationParams) => {
  const [registrationItem, setRegistrationItem] = useState<MappingItem | null>(null);
  const [registrationDefaults, setRegistrationDefaults] = useState<Record<string, any>>();
  const [registrationParent, setRegistrationParent] = useState<any | null>(null);
  const [registrationFormVisible, setRegistrationFormVisible] = useState(false);
  const [registrationOptionsVisible, setRegistrationOptionsVisible] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [parentResults, setParentResults] = useState<any[]>([]);
  const [parentSearchError, setParentSearchError] = useState('');
  const [parentSearchLoading, setParentSearchLoading] = useState(false);

  useEffect(() => {
    if (!registrationOptionsVisible || parentSearch.trim().length < 2) {
      setParentResults([]);
      setParentSearchError('');
      setParentSearchLoading(false);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      setParentSearchLoading(true);
      setParentResults([]);
      void stockService
        .searchInboundInvoiceProductParents(parentSearch)
        .then((rows) => {
          if (active) {
            setParentResults(rows);
            setParentSearchError('');
          }
        })
        .catch((error) => {
          console.warn('[InboundInvoiceMappings] parent product search failed', error);
          if (active) {
            setParentResults([]);
            setParentSearchError('Não foi possível buscar produtos-pai. Tente novamente.');
          }
        })
        .finally(() => {
          if (active) setParentSearchLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [registrationOptionsVisible, parentSearch]);

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
    parentSearch,
    setParentSearch,
    parentResults,
    parentSearchError,
    parentSearchLoading,
    openQuickRegister,
    startNewProductRegistration,
    startVariationRegistration,
    saveQuickRegisteredProduct,
  };
};

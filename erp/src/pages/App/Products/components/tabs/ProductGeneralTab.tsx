import React from 'react';
import { Product } from '@/pages/types/product.type';
import { toTitleCase } from '@/pages/utils/textUtils';
import { keepManualCategorySelection, matchCategoryByRules } from '@/pages/utils/categoryResolutionService';
import { productTitleFieldsFromName } from '../../../../../../../shared-utils/productTitle';
import { useProductOpportunities } from '../../hooks/useProductOpportunities';
import {
  applyProductCategorySelection,
  clearProductValidationField,
  filterProductSelectableCategories,
  type ProductCategoryOption,
} from './sections/productCategoryEnvironment';
import ProductCategoryPicker from './sections/ProductCategoryPicker';
import ProductTypeModeBanner from './sections/ProductTypeModeBanner';
import { ProductKindField, ProductOpportunityField } from './sections/ProductOriginFields';

interface ProductGeneralTabProps {
  readonly onOpenCategorySearch: () => void;
  readonly isService: boolean;
  readonly isStockistOnly?: boolean;
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly onSetHasVariations?: (value: boolean) => void;
  readonly availableCategories: readonly ProductCategoryOption[];
  readonly validationErrors?: Record<string, boolean>;
  readonly setValidationErrors?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  readonly isGeneratingCategory?: boolean;
  readonly onOpenAiFillModal?: (mode?: 'web_search' | 'descriptive_text') => void;
}

const ProductGeneralTab: React.FC<ProductGeneralTabProps> = ({
  isService,
  isStockistOnly = false,
  formData,
  setFormData,
  onSetHasVariations,
  availableCategories,
  validationErrors = {},
  setValidationErrors,
  isGeneratingCategory = false,
}) => {
  const { opportunities } = useProductOpportunities();
  const variationCount = formData.variations?.length || 0;
  const isMultiVariationMode = Boolean(formData.hasVariations) || variationCount > 1;
  const simpleModeBlocked = variationCount > 1;

  const selectableCategories = React.useMemo(
    () => filterProductSelectableCategories([...availableCategories]),
    [availableCategories],
  );
  const autoAppliedNameRef = React.useRef('');

  const tryAutoMatchCategory = React.useCallback((productName: string) => {
    if (formData.categoryIds && formData.categoryIds.length > 0) return;
    const matchedCategory = matchCategoryByRules(productName, selectableCategories as any);
    if (!matchedCategory) return;

    autoAppliedNameRef.current = productName.trim();
    setFormData((prev) => {
      if (prev.categoryIds?.length) return prev;
      return applyProductCategorySelection(
        prev,
        keepManualCategorySelection([], matchedCategory.id),
        availableCategories,
      );
    });
    clearProductValidationField(setValidationErrors, 'categoryIds');
  }, [availableCategories, formData.categoryIds, selectableCategories, setFormData, setValidationErrors]);

  React.useEffect(() => {
    const trimmedName = (formData.name || '').trim();
    if (!trimmedName || trimmedName.length < 3 || autoAppliedNameRef.current === trimmedName) return;
    if (formData.categoryIds && formData.categoryIds.length > 0) return;

    const timer = setTimeout(() => tryAutoMatchCategory(trimmedName), 300);
    return () => clearTimeout(timer);
  }, [formData.name, formData.categoryIds, tryAutoMatchCategory]);

  React.useEffect(() => {
    if (!formData.hasVariations || !formData.variations?.length) return;
    const colorsSet = new Set<string>();
    formData.variations.forEach((variation) => {
      variation.attributes?.forEach((attr) => {
        if ((attr.name?.toUpperCase() || '') === 'COR' && typeof attr.value === 'string' && attr.value) {
          colorsSet.add(attr.value.toUpperCase());
        }
      });
    });

    const detectedColors = Array.from(colorsSet).join(' / ');
    if (detectedColors && detectedColors !== formData.colors) {
      setFormData((prev) => ({ ...prev, colors: detectedColors, noColors: false }));
    }
  }, [formData.colors, formData.hasVariations, formData.variations, setFormData]);

  const handleToggleCategory = React.useCallback((catId: string, isChecked: boolean) => {
    if (isChecked) clearProductValidationField(setValidationErrors, 'categoryIds');
    setFormData((prev) => {
      const ids = prev.categoryIds || [];
      const nextIds = isChecked ? [...ids, catId] : ids.filter((id) => id !== catId);
      return applyProductCategorySelection(prev, nextIds, availableCategories);
    });
  }, [availableCategories, setFormData, setValidationErrors]);

  const handleSelectProductMode = (nextMode: boolean) => {
    if (onSetHasVariations) {
      onSetHasVariations(nextMode);
    } else {
      setFormData((previous) => ({ ...previous, hasVariations: nextMode }));
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-7xl min-w-0 grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {!isService && (
        <ProductTypeModeBanner
          isMultiVariationMode={isMultiVariationMode}
          simpleModeBlocked={simpleModeBlocked}
          onSelectProductMode={handleSelectProductMode}
        />
      )}

      <div className="md:col-span-2 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div
          id="field-product-name"
          className={`flex min-w-0 flex-col gap-1.5 transition-all p-2 rounded-2xl ${isService ? 'sm:col-span-2' : ''}`}
        >
          <div className="flex items-center h-6">
            <label
              className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5 ${validationErrors?.name ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}
            >
              <span>Nome do Produto</span>
              <span className="text-red-500 ml-0.5">*</span>
            </label>
          </div>
          <input
            value={formData.name || ''}
            onChange={(event) => {
              const val = event.target.value;
              setFormData((prev) => ({
                ...prev,
                name: val,
                ...productTitleFieldsFromName(val),
              }));
            }}
            onBlur={() => {
              if (formData.name) {
                const formatted = toTitleCase(formData.name);
                if (formatted !== formData.name) {
                  setFormData((prev) => ({
                    ...prev,
                    name: formatted,
                    ...productTitleFieldsFromName(formatted),
                  }));
                }
                tryAutoMatchCategory(formData.name);
              }
              if ((formData.name || '').trim()) clearProductValidationField(setValidationErrors, 'name');
            }}
            className={`w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 outline-none text-xs font-bold transition-all font-mono ${
              validationErrors?.name
                ? 'border-red-500 text-red-600 focus:border-red-600'
                : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400'
            }`}
            placeholder="Digite o nome do produto (ex: Sofá 3 Lugares)..."
          />
        </div>

        {!isService && (
          <ProductKindField
            formData={formData}
            setFormData={setFormData}
            opportunities={opportunities}
            hasError={Boolean(validationErrors?.productKind)}
          />
        )}
      </div>

      {!isService && (
        <ProductCategoryPicker
          categoryIds={formData.categoryIds}
          availableCategories={availableCategories}
          onToggleCategory={handleToggleCategory}
          hasValidationError={Boolean(validationErrors.categoryIds)}
          isGeneratingCategory={isGeneratingCategory}
        />
      )}

      {!isStockistOnly && (
        <ProductOpportunityField
          isService={isService}
          formData={formData}
          setFormData={setFormData}
          opportunities={opportunities}
          validationError={validationErrors.opportunityId}
          setValidationErrors={setValidationErrors}
        />
      )}

      <div className="md:col-span-2 w-full min-w-0">
        <div className="flex flex-col gap-2.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 h-6">
            <span>Observações Internas</span>
          </label>
          <textarea
            value={formData.observations || ''}
            onChange={(event) => setFormData({ ...formData, observations: event.target.value })}
            placeholder="Digite notas internas sobre este produto, processos ou detalhes específicos..."
            className="w-full h-24 px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold dark:text-slate-200 resize-none focus:border-blue-600 dark:focus:border-blue-400 transition-all"
          />
        </div>
      </div>
    </div>
  );
};

export default ProductGeneralTab;

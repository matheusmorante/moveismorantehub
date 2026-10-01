import React from 'react';
import { Product } from '@/pages/types/product.type';
import { toTitleCase } from '@/pages/utils/textUtils';
import { useProductOpportunities } from '../../hooks/useProductOpportunities';
import {
  filterProductSelectableCategories,
  getProductCategoryRootNames,
  type ProductCategoryOption,
} from './sections/productCategoryEnvironment';
import ProductCategoryPicker from './sections/ProductCategoryPicker';
import {
  keepManualCategorySelection,
  matchCategoryByRules,
  rankCategoryCandidates,
} from '@/pages/utils/categoryResolutionService';
import { isSalvadoProduct } from '@/pages/utils/productKindRules';

interface ProductGeneralTabProps {
  readonly onOpenCategorySearch: () => void;
  readonly isService: boolean;
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly availableCategories: readonly ProductCategoryOption[];
  readonly validationErrors?: Record<string, boolean>;
  readonly setValidationErrors?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  readonly isGeneratingCategory?: boolean;
}

const ProductGeneralTab: React.FC<ProductGeneralTabProps> = ({
  onOpenCategorySearch,
  isService,
  formData,
  setFormData,
  availableCategories,
  validationErrors = {},
  setValidationErrors,
  isGeneratingCategory = false,
}) => {
  const { opportunities } = useProductOpportunities();

  const [diferenciarTitulo, setDiferenciarTitulo] = React.useState<boolean>(
    Boolean(formData.title && formData.title !== formData.name) ||
      Boolean(formData.marketplaceTitle && formData.marketplaceTitle !== formData.name)
  );

  const selectableCategories = React.useMemo(
    () => filterProductSelectableCategories([...availableCategories]),
    [availableCategories]
  );

  const productNameCategoryCandidates = React.useMemo(
    () => rankCategoryCandidates(formData.name || '', selectableCategories),
    [formData.name, selectableCategories]
  );
  const topCategoryCandidate = productNameCategoryCandidates[0];
  const secondCategoryCandidate = productNameCategoryCandidates[1];
  const categorySuggestions =
    !formData.categoryIds?.length && topCategoryCandidate?.score >= 0.7
      ? secondCategoryCandidate &&
        topCategoryCandidate.score - secondCategoryCandidate.score < 0.12
        ? productNameCategoryCandidates.slice(0, 2)
        : [topCategoryCandidate]
      : [];

  const handleToggleCategory = React.useCallback(
    (catId: string, isChecked: boolean) => {
      if (isChecked && setValidationErrors) {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next.categoryIds;
          return next;
        });
      }
      setFormData((prev) => {
        const ids = prev.categoryIds || [];
        const nextIds = isChecked ? [...ids, catId] : ids.filter((id) => id !== catId);

        const next = { ...prev, categoryIds: nextIds };
        const allEnvs = getProductCategoryRootNames(nextIds, [...availableCategories]);
        let detectedEnv = prev.environment;
        if (!detectedEnv || !allEnvs.includes(detectedEnv)) {
          detectedEnv = allEnvs[0] || '';
        }
        next.environment = detectedEnv;
        next.availableEnvironments = allEnvs;
        return next;
      });
    },
    [availableCategories, setFormData, setValidationErrors]
  );

  React.useEffect(() => {
    if (formData.hasVariations && formData.variations?.length) {
      const colorsSet = new Set<string>();
      formData.variations.forEach((v) => {
        v.attributes?.forEach((attr) => {
          const attrName = attr.name?.toUpperCase() || '';
          if (attrName === 'COR' && attr.value) {
            colorsSet.add(attr.value.toUpperCase());
          }
        });
      });

      const detectedColors = Array.from(colorsSet).join(' / ');
      if (detectedColors && detectedColors !== formData.colors) {
        setFormData((prev) => ({ ...prev, colors: detectedColors, noColors: false }));
      }
    }
  }, [formData.variations, formData.hasVariations]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Title Section (Agrupados na mesma linha em 2 colunas) */}
      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {!isService && (
          <div id="field-product-kind" className="flex flex-col gap-1.5 p-2 rounded-2xl">
            <label
              htmlFor="product-kind"
              className={`text-[10px] uppercase font-black tracking-widest ${validationErrors?.productKind ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}
            >
              Origem do estoque <span className="text-red-500">*</span>
            </label>
            <select
              id="product-kind"
              value={formData.productKind ?? ''}
              aria-required="true"
              aria-invalid={Boolean(validationErrors?.productKind)}
              onChange={(event) => {
                const selectedKind = event.target.value as Product['productKind'] | '';
                const productKind = selectedKind || undefined;
                if (!productKind) {
                  setFormData((prev) => ({ ...prev, productKind: undefined, condition: '' }));
                  return;
                }
                const salvadoOpp = opportunities.find((o) =>
                  o.name.toLowerCase().includes('salvado')
                );

                setFormData((prev) => {
                  const next: Partial<Product> = {
                    ...prev,
                    productKind,
                    condition:
                      productKind === 'salvado'
                        ? 'salvado'
                        : productKind === 'usado'
                          ? 'usado'
                          : 'novo',
                  };

                  if (productKind === 'salvado') {
                    next.active = false;
                    next.variations = (prev.variations || []).map((variation) => ({
                      ...variation,
                      active: false,
                    }));
                    if (salvadoOpp) {
                      next.opportunityId = salvadoOpp.id;
                    }
                  } else {
                    if (salvadoOpp && prev.opportunityId === salvadoOpp.id) {
                      next.opportunityId = null;
                    }
                  }
                  return next;
                });
              }}
              className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 ${validationErrors?.productKind ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
            >
              <option value="">Selecione</option>
              <option value="normal">Convencional</option>
              <option value="salvado">Salvados</option>
              <option value="usado">Usados</option>
            </select>
            {validationErrors?.productKind && (
              <span className="text-[10px] text-red-600 dark:text-red-400">
                Selecione a origem do estoque.
              </span>
            )}
            {isSalvadoProduct(formData) && (
              <span className="text-[10px] text-slate-500">
                O produto e suas variações serão desativados no ERP.
              </span>
            )}
          </div>
        )}
        {/* Nome do Produto (ERP) */}
        <div
          id="field-product-name"
          className="flex flex-col gap-1.5 transition-all p-2 rounded-2xl"
        >
          <div className="flex items-center justify-between h-6">
            <label
              className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5 ${validationErrors?.name ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}
            >
              <span>Nome</span>
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                const newValue = !diferenciarTitulo;
                setDiferenciarTitulo(newValue);
                if (!newValue) {
                  setFormData((prev) => ({
                    ...prev,
                    title: prev.name,
                    marketplaceTitle: prev.name,
                  }));
                }
              }}
              className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
                diferenciarTitulo
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 hover:bg-slate-200'
              }`}
            >
              {diferenciarTitulo ? 'Usando Título Diferente' : 'Diferenciar Título no Catálogo'}
            </button>
          </div>
          <input
            value={formData.name || ''}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({
                ...prev,
                name: val,
                ...(!diferenciarTitulo ? { title: val, marketplaceTitle: val } : {}),
              }));
            }}
            onBlur={() => {
              if (formData.name) {
                const formatted = toTitleCase(formData.name);
                if (formatted !== formData.name) {
                  setFormData((prev) => ({
                    ...prev,
                    name: formatted,
                    ...(!diferenciarTitulo
                      ? { title: formatted, marketplaceTitle: formatted }
                      : {}),
                  }));
                }

                // Auto-select category if none is selected
                if (!formData.categoryIds || formData.categoryIds.length === 0) {
                  const matchedCategory = matchCategoryByRules(
                    formData.name,
                    availableCategories as any
                  );
                  if (matchedCategory) {
                    setFormData((prev) => {
                      if (prev.categoryIds?.length) return prev;
                      return {
                        ...prev,
                        categoryIds: keepManualCategorySelection([], matchedCategory.id),
                      };
                    });
                    if (setValidationErrors) {
                      setValidationErrors((prev) => {
                        const next = { ...prev };
                        delete next.categoryIds;
                        return next;
                      });
                    }
                  }
                }
              }
              if ((formData.name || '').trim() && setValidationErrors) {
                setValidationErrors((prev) => {
                  const next = { ...prev };
                  delete next.name;
                  return next;
                });
              }
            }}
            className={`w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 outline-none text-xs font-bold transition-all font-mono ${
              validationErrors?.name
                ? 'border-red-500 text-red-600 focus:border-red-600'
                : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400'
            }`}
            placeholder="Digite o nome interno do produto (ex: SOFA 3 LUG)..."
          />
          {categorySuggestions.length > 0 && (
            <div
              className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400"
              aria-live="polite"
            >
              <span>Confira a sugestão pelo nome:</span>
              {categorySuggestions.map(({ category }) => (
                <button
                  key={category.id}
                  type="button"
                  className="rounded-md border border-blue-200 px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
                  onClick={() => {
                    setFormData((prev) => {
                      if (prev.categoryIds?.length) return prev;
                      return {
                        ...prev,
                        categoryIds: keepManualCategorySelection([], category.id),
                      };
                    });
                    setValidationErrors?.((prev) => {
                      const next = { ...prev };
                      delete next.categoryIds;
                      return next;
                    });
                  }}
                >
                  Usar {category.name || category.category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Catalog / Ecommerce Title Section (Exibido apenas se diferenciarTitulo for true) */}
        {diferenciarTitulo ? (
          <div
            id="field-marketplace-title"
            className="flex flex-col gap-1.5 transition-all p-2 rounded-2xl animate-in slide-in-from-right-2 duration-200"
          >
            <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5 h-6">
              <span>Título no Catálogo</span>
            </label>
            <input
              value={formData.title || formData.marketplaceTitle || ''}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  title: val,
                  marketplaceTitle: val,
                }));
              }}
              onBlur={() => {
                const currentVal = formData.title || formData.marketplaceTitle || '';
                if (currentVal) {
                  const formatted = toTitleCase(currentVal);
                  if (formatted !== currentVal) {
                    setFormData((prev) => ({
                      ...prev,
                      title: formatted,
                      marketplaceTitle: formatted,
                    }));
                  }
                }
              }}
              className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400 transition-all font-mono"
              placeholder="Digite o título no catálogo..."
            />
          </div>
        ) : null}
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
      {/* Oportunidade */}
      <div className="md:col-span-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5 h-6">
            <span>Oportunidade</span>
          </label>
          <select
            value={formData.opportunityId || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, opportunityId: e.target.value || null }))
            }
            className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={formData.productKind === 'salvado'}
          >
            <option value="">Nenhuma (Produto Normal)</option>
            {opportunities
              .filter((opp) => {
                if (formData.productKind === 'normal' || !formData.productKind) {
                  return !opp.name.toLowerCase().includes('salvado');
                }
                return true;
              })
              .map((opp) => (
                <option key={opp.id} value={opp.id}>
                  {opp.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Observations */}
      <div className="md:col-span-2">
        <div className="flex flex-col gap-2.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 h-6">
            <span>Observações Internas</span>
          </label>
          <textarea
            value={formData.observations || ''}
            onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
            placeholder="Digite notas internas sobre este produto, processos ou detalhes específicos..."
            className="w-full h-24 px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold dark:text-slate-200 resize-none focus:border-blue-600 dark:focus:border-blue-400 transition-all"
          />
        </div>
      </div>
    </div>
  );
};

export default ProductGeneralTab;

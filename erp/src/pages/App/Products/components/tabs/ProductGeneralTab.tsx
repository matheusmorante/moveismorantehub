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
} from '@/pages/utils/categoryResolutionService';
import { isNonConventionalProduct } from '@/pages/utils/productKindRules';

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
  onOpenCategorySearch,
  isService,
  isStockistOnly = false,
  formData,
  setFormData,
  onSetHasVariations,
  availableCategories,
  validationErrors = {},
  setValidationErrors,
  isGeneratingCategory = false,
  onOpenAiFillModal,
}) => {
  const [showSimpleModeTooltip, setShowSimpleModeTooltip] = React.useState(false);
  const simpleModeTooltipId = React.useId();
  const { opportunities } = useProductOpportunities();
  const variationCount = formData.variations?.length || 0;
  const isMultiVariationMode = Boolean(formData.hasVariations) || variationCount > 1;
  const simpleModeBlocked = variationCount > 1;

  const selectableCategories = React.useMemo(
    () => filterProductSelectableCategories([...availableCategories]),
    [availableCategories]
  );

  const autoAppliedNameRef = React.useRef<string>('');

  React.useEffect(() => {
    const trimmedName = (formData.name || '').trim();
    if (!trimmedName || trimmedName.length < 3) return;
    if (formData.categoryIds && formData.categoryIds.length > 0) return;
    if (autoAppliedNameRef.current === trimmedName) return;

    const timer = setTimeout(() => {
      if (formData.categoryIds && formData.categoryIds.length > 0) return;
      const matchedCategory = matchCategoryByRules(trimmedName, selectableCategories as any);
      if (matchedCategory) {
        autoAppliedNameRef.current = trimmedName;
        setFormData((prev) => {
          if (prev.categoryIds?.length) return prev;
          const nextIds = keepManualCategorySelection([], matchedCategory.id);
          const allEnvs = getProductCategoryRootNames(nextIds, [...availableCategories]);
          let detectedEnv = prev.environment;
          if (!detectedEnv || !allEnvs.includes(detectedEnv)) {
            detectedEnv = allEnvs[0] || '';
          }
          return {
            ...prev,
            categoryIds: nextIds,
            environment: detectedEnv,
            availableEnvironments: allEnvs,
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
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.name, formData.categoryIds, selectableCategories, availableCategories, setFormData, setValidationErrors]);

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

  const handleSelectProductMode = (nextMode: boolean) => {
    if (!nextMode && isMultiVariationMode && simpleModeBlocked) {
      setShowSimpleModeTooltip(true);
      return;
    }

    setShowSimpleModeTooltip(false);
    if (onSetHasVariations) {
      onSetHasVariations(nextMode);
    } else {
      setFormData((previous) => ({ ...previous, hasVariations: nextMode }));
    }
  };

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
    <div className="mx-auto grid w-full max-w-7xl min-w-0 grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {!isService && (
        <section
          id="product-type-section"
          aria-labelledby="product-type-heading"
          className="md:col-span-2 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 transition-colors dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                isMultiVariationMode
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              }`}
              aria-hidden="true"
            >
              <i className={`bi ${isMultiVariationMode ? 'bi-layers-fill' : 'bi-box-seam'} text-xl`} />
            </div>
            <div>
              <h3 id="product-type-heading" className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Tipo do produto
              </h3>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Produto simples: apenas 1 variação. Produto com variações: 2 ou mais.
              </p>
            </div>
          </div>

          <div className="relative w-full shrink-0 sm:w-auto" onMouseLeave={() => setShowSimpleModeTooltip(false)}>
            <div
              role="group"
              aria-labelledby="product-type-heading"
              className="inline-flex w-full rounded-xl bg-slate-200/70 p-0.5 text-xs font-bold dark:bg-slate-800 sm:w-auto"
            >
              <button
                type="button"
                aria-pressed={!isMultiVariationMode}
                aria-disabled={simpleModeBlocked}
                aria-describedby={showSimpleModeTooltip && simpleModeBlocked ? simpleModeTooltipId : undefined}
                onFocus={() => {
                  if (simpleModeBlocked) setShowSimpleModeTooltip(true);
                }}
                onBlur={() => setShowSimpleModeTooltip(false)}
                onClick={() => handleSelectProductMode(false)}
                className={`flex-1 whitespace-normal rounded-lg px-2 py-1.5 transition-all sm:flex-none sm:px-3 ${
                  !isMultiVariationMode
                    ? 'bg-white font-black text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400'
                    : simpleModeBlocked
                      ? 'cursor-not-allowed text-slate-400 opacity-60 dark:text-slate-500'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Produto Simples
              </button>

              <button
                type="button"
                aria-pressed={isMultiVariationMode}
                onClick={() => handleSelectProductMode(true)}
                className={`flex-1 whitespace-normal rounded-lg px-2 py-1.5 transition-all sm:flex-none sm:px-3 ${
                  isMultiVariationMode
                    ? 'bg-white font-black text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Produto com Variações
              </button>
            </div>
            {showSimpleModeTooltip && isMultiVariationMode && simpleModeBlocked && (
              <span
                id={simpleModeTooltipId}
                role="tooltip"
                className="absolute left-2 top-full z-20 mt-2 max-w-72 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-lg dark:bg-slate-700"
              >
                Este produto se tornará simples automaticamente quando restar apenas 1 variação.
              </span>
            )}
          </div>
        </section>
      )}
      {/* Title Section (Agrupados na mesma linha em 2 colunas) */}
      <div className="md:col-span-2 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {/* Nome do Produto */}
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
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({
                ...prev,
                name: val,
                title: val,
                marketplaceTitle: val,
              }));
            }}
            onBlur={() => {
              if (formData.name) {
                const formatted = toTitleCase(formData.name);
                if (formatted !== formData.name) {
                  setFormData((prev) => ({
                    ...prev,
                    name: formatted,
                    title: formatted,
                    marketplaceTitle: formatted,
                  }));
                }

                // Auto-select category if none is selected
                if (!formData.categoryIds || formData.categoryIds.length === 0) {
                  const matchedCategory = matchCategoryByRules(
                    formData.name,
                    selectableCategories as any
                  );
                  if (matchedCategory) {
                    autoAppliedNameRef.current = formData.name.trim();
                    setFormData((prev) => {
                      if (prev.categoryIds?.length) return prev;
                      const nextIds = keepManualCategorySelection([], matchedCategory.id);
                      const allEnvs = getProductCategoryRootNames(nextIds, [...availableCategories]);
                      let detectedEnv = prev.environment;
                      if (!detectedEnv || !allEnvs.includes(detectedEnv)) {
                        detectedEnv = allEnvs[0] || '';
                      }
                      return {
                        ...prev,
                        categoryIds: nextIds,
                        environment: detectedEnv,
                        availableEnvironments: allEnvs,
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
            placeholder="Digite o nome do produto (ex: Sofá 3 Lugares)..."
          />
        </div>

        {!isService && (
          <div id="field-product-kind" className="flex min-w-0 flex-col gap-1.5 p-2 rounded-2xl">
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
                  setFormData((prev) => ({
                    ...prev,
                    productKind: undefined,
                    condition: '',
                    opportunityId: null,
                  }));
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

                  if (productKind === 'salvado' || productKind === 'usado') {
                    next.active = false;
                    next.variations = (prev.variations || []).map((variation) => ({
                      ...variation,
                      active: false,
                    }));
                    if (productKind === 'salvado' && salvadoOpp) {
                      next.opportunityId = salvadoOpp.id;
                    } else if (salvadoOpp && prev.opportunityId === salvadoOpp.id) {
                      next.opportunityId = null;
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
            {isNonConventionalProduct(formData) && (
              <span className="text-[10px] text-slate-500">
                O produto e suas variações serão desativados no ERP.
              </span>
            )}
          </div>
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
      {/* Oportunidade */}
      {!isStockistOnly && (
        <div id="field-product-opportunity" className="md:col-span-2 w-full min-w-0">
          <div className="flex w-full flex-col gap-1.5">
            <label
              htmlFor="field-product-opportunity-select"
              className="flex w-full h-6 items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500"
            >
              <span>Oportunidade</span>
              {formData.productKind === 'salvado' && <span className="text-red-500">*</span>}
            </label>
            <select
              id="field-product-opportunity-select"
              value={formData.opportunityId || ''}
              aria-required={formData.productKind === 'salvado' ? 'true' : 'false'}
              aria-invalid={Boolean(validationErrors.opportunityId)}
              onChange={(event) => {
                setFormData((prev) => ({ ...prev, opportunityId: event.target.value || null }));
                setValidationErrors?.((prev) => {
                  const next = { ...prev };
                  delete next.opportunityId;
                  return next;
                });
              }}
              className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400 transition-all disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-70 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
              disabled={!isService && (!formData.productKind || formData.productKind === 'salvado')}
            >
              <option value=""></option>
              {opportunities
                .filter((opp) => {
                  if (formData.productKind === 'normal' || !formData.productKind) {
                    return !opp.name.toLowerCase().includes('salvado');
                  }
                  return true;
                })
                .map((opp) => (
                  <option key={opp.id} value={opp.id}>
                    {/últimas?\s+unidades?/i.test(opp.name) && !/mostru[aá]rio/i.test(opp.name)
                      ? 'Mega Liquidação - Última Unidade'
                      : opp.name}
                  </option>
                ))}
            </select>
            {!isService && !formData.productKind && (
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Selecione primeiro a origem do estoque.
              </span>
            )}
            {validationErrors.opportunityId &&
              (isService || formData.productKind === 'salvado') && (
                <span className="text-[10px] text-red-600 dark:text-red-400">
                  {validationErrors.opportunityId}
                </span>
              )}
          </div>
        </div>
      )}

      {/* Observations */}
      <div className="md:col-span-2 w-full min-w-0">
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

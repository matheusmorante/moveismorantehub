import React from 'react';
import type Product from '@/pages/types/product.type';
import { isNonConventionalProduct } from '@/pages/utils/productKindRules';
import { clearProductValidationField } from './productCategoryEnvironment';

interface OpportunityOption {
  readonly id: string;
  readonly name: string;
}

interface ProductKindSelectProps {
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly opportunities: readonly OpportunityOption[];
  readonly hasError: boolean;
}

/**
 * Selects the stock origin (`Convencional`, `Salvados`, `Usados`), applying automatic
 * status deactivation and salvado opportunity rules.
 */
export const ProductKindField: React.FC<ProductKindSelectProps> = ({
  formData,
  setFormData,
  opportunities,
  hasError,
}) => {
  const handleKindChange = (selectedKind: Product['productKind'] | '') => {
    const productKind = selectedKind || undefined;
    if (!productKind) {
      setFormData((prev) => ({ ...prev, productKind: undefined, condition: '', opportunityId: null }));
      return;
    }

    const salvadoOpp = opportunities.find((entry) => entry.name.toLowerCase().includes('salvado'));
    setFormData((prev) => {
      const condition = productKind === 'salvado' ? 'salvado' : productKind === 'usado' ? 'usado' : 'novo';
      const next: Partial<Product> = { ...prev, productKind, condition };
      const shouldClearSalvadoOpp = Boolean(salvadoOpp && prev.opportunityId === salvadoOpp.id);

      if (productKind === 'salvado' || productKind === 'usado') {
        next.active = false;
        next.variations = (prev.variations || []).map((variation) => ({ ...variation, active: false }));
        if (productKind === 'salvado' && salvadoOpp) next.opportunityId = salvadoOpp.id;
        else if (shouldClearSalvadoOpp) next.opportunityId = null;
      } else if (shouldClearSalvadoOpp) {
        next.opportunityId = null;
      }
      return next;
    });
  };

  return (
    <div id="field-product-kind" className="flex min-w-0 flex-col gap-1.5 p-2 rounded-2xl">
      <label
        htmlFor="product-kind"
        className={`text-[10px] uppercase font-black tracking-widest ${hasError ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}
      >
        Origem do estoque <span className="text-red-500">*</span>
      </label>
      <select
        id="product-kind"
        value={formData.productKind ?? ''}
        aria-required="true"
        aria-invalid={hasError}
        onChange={(event) => handleKindChange(event.target.value as Product['productKind'] | '')}
        className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 ${hasError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
      >
        <option value="">Selecione</option>
        <option value="normal">Convencional</option>
        <option value="salvado">Salvados</option>
        <option value="usado">Usados</option>
      </select>
      {hasError && (
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
  );
};

interface ProductOpportunityFieldProps {
  readonly isService: boolean;
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly opportunities: readonly OpportunityOption[];
  readonly validationError?: boolean | string;
  readonly setValidationErrors?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

/**
 * Selects the merchandising opportunity associated with the product or service.
 */
export const ProductOpportunityField: React.FC<ProductOpportunityFieldProps> = ({
  isService,
  formData,
  setFormData,
  opportunities,
  validationError,
  setValidationErrors,
}) => {
  const isSalvado = formData.productKind === 'salvado';
  const filteredOpportunities = opportunities.filter((opp) =>
    formData.productKind === 'normal' || !formData.productKind
      ? !opp.name.toLowerCase().includes('salvado')
      : true,
  );

  return (
    <div id="field-product-opportunity" className="md:col-span-2 w-full min-w-0">
      <div className="flex w-full flex-col gap-1.5">
        <label
          htmlFor="field-product-opportunity-select"
          className="flex w-full h-6 items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500"
        >
          <span>Oportunidade</span>
          {isSalvado && <span className="text-red-500">*</span>}
        </label>
        <select
          id="field-product-opportunity-select"
          value={formData.opportunityId || ''}
          aria-required={isSalvado ? 'true' : 'false'}
          aria-invalid={Boolean(validationError)}
          onChange={(event) => {
            setFormData((prev) => ({ ...prev, opportunityId: event.target.value || null }));
            clearProductValidationField(setValidationErrors, 'opportunityId');
          }}
          className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400 transition-all disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-70 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
          disabled={!isService && (!formData.productKind || isSalvado)}
        >
          <option value="" />
          {filteredOpportunities.map((opp) => (
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
        {validationError && (isService || isSalvado) && (
          <span className="text-[10px] text-red-600 dark:text-red-400">
            {validationError}
          </span>
        )}
      </div>
    </div>
  );
};

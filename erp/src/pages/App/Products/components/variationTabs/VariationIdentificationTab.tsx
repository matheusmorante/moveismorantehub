import React from 'react';
import Product, { Variation } from '../../../../types/product.type';
import {
  buildProductVariationName,
  getVariationAttributeValuesInNameOrder,
  isVariationNamePlaceholderSuffix,
} from '@/pages/utils/productVariationDefaults';
import { toTitleCase } from '@/pages/utils/textUtils';

export interface DbAttributeItem {
  readonly id: string;
  readonly name: string;
  readonly data_type?: 'list' | 'integer' | 'decimal' | 'text' | 'boolean' | 'measure';
  readonly unit?: string;
}

export interface DbAttributeValueItem {
  readonly id: string;
  readonly attribute_id: string;
  readonly value: string;
}

interface VariationIdentificationTabProps {
  readonly formData: Variation;
  readonly setFormData: React.Dispatch<React.SetStateAction<Variation | null>>;
  readonly parentProduct: Product;
  readonly dbAttributes?: readonly DbAttributeItem[];
  readonly dbAttributeValues?: readonly DbAttributeValueItem[];
  readonly setIsManageAttributesOpen?: (open: boolean) => void;
  readonly getDefaultVariationName?: (attributes?: Variation['attributes']) => string;
  readonly getDefaultVariationTitle?: (attributes?: Variation['attributes']) => string;
  readonly fetchDbAttributes?: () => Promise<void>;
  readonly isSingleVariation?: boolean;
  readonly validationErrors?: Record<string, string>;
  readonly onClearValidationError?: (fieldKey: string) => void;
}

export const VariationIdentificationTab: React.FC<VariationIdentificationTabProps> = ({
  formData,
  setFormData,
  parentProduct,
  isSingleVariation = false,
  validationErrors = {},
  onClearValidationError,
}) => {
  const nameError = validationErrors.name;
  return (
    <div className="space-y-6 animate-in fade-in duration-350 min-w-0">
      {/* Nome da Variação */}
      <div className="grid grid-cols-1 gap-4 min-w-0">
        {/* Nome da Variação (ERP e Catálogo Digital) */}
        <div className="space-y-1.5 min-w-0">
          <label
            htmlFor="variation-name-suffix-input"
            className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5 h-6 ${nameError ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <span>Nome da variação</span>
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          {(() => {
            const parentPrefix = (parentProduct.name || parentProduct.description || '').trim();
            const parentPrefixLabel = parentPrefix || 'Nome do pai (ainda vazio)';
            const currentFullName = formData.name || '';
            const rawSuffix = currentFullName
              .toLowerCase()
              .startsWith(parentPrefix.toLowerCase())
              ? currentFullName.slice(parentPrefix.length).replace(/^[\s\-_:]+/, '')
              : currentFullName;
            const currentSuffix = isVariationNamePlaceholderSuffix(rawSuffix)
              ? getVariationAttributeValuesInNameOrder(formData.attributes).join(' ')
              : rawSuffix;

            const handleSuffixChange = (newSuffix: string) => {
              const trimmedSuffix = newSuffix.trimStart();
              const newFullName = buildProductVariationName(parentPrefix, trimmedSuffix);
              setFormData((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  name: newFullName,
                  title: newFullName,
                  marketplaceTitle: newFullName,
                };
              });
            };

            return (
              <div
                className={`w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 border-b-2 ${nameError ? 'border-red-500 focus-within:border-red-600' : 'border-slate-200 dark:border-slate-800 focus-within:border-blue-600 dark:focus-within:border-blue-400'} transition-colors py-1.5 min-w-0`}
                title="O nome do produto pai é imutável no início. Você pode editar livremente o que vem após o nome do pai."
              >
                <span
                  title={parentPrefixLabel}
                  className="self-start sm:self-auto inline-flex items-center max-w-full sm:max-w-[60%] px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold font-mono shrink-0 select-none border border-slate-200 dark:border-slate-700 min-w-0"
                >
                  <span className="truncate">{parentPrefixLabel}</span>
                </span>
                <input
                  id="variation-name-suffix-input"
                  type="text"
                  placeholder="Ex.: Branco 6 Portas"
                  value={currentSuffix}
                  onChange={(e) => {
                    onClearValidationError?.('name');
                    handleSuffixChange(e.target.value);
                  }}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? 'variation-name-error' : undefined}
                  className={`w-full min-w-0 flex-1 bg-transparent border-none outline-none text-xs font-bold font-mono focus:ring-0 p-0 disabled:cursor-not-allowed disabled:opacity-70 ${nameError ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}
                  aria-label="Nome da variação"
                />
              </div>
            );
          })()}
          {nameError && (
            <p id="variation-name-error" role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
              {nameError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  filterProductSelectableCategories,
  searchProductCategories,
  type ProductCategoryOption,
} from './productCategoryEnvironment';

const EMPTY_CATEGORY_IDS: readonly string[] = [];

interface ProductCategoryPickerProps {
  readonly categoryIds?: readonly string[];
  readonly availableCategories: readonly ProductCategoryOption[];
  readonly onToggleCategory: (categoryId: string, isChecked: boolean) => void;
  readonly hasValidationError?: boolean;
  readonly isGeneratingCategory?: boolean;
}

const ProductCategoryPicker: React.FC<ProductCategoryPickerProps> = ({
  categoryIds,
  availableCategories,
  onToggleCategory,
  hasValidationError = false,
  isGeneratingCategory = false,
}) => {
  const selectedCategoryIds = categoryIds ?? EMPTY_CATEGORY_IDS;
  const [categorySearch, setCategorySearch] = React.useState('');
  const selectableCategories = React.useMemo(
    () => filterProductSelectableCategories([...availableCategories]),
    [availableCategories]
  );
  const selectedCategories = React.useMemo(
    () => selectableCategories.filter((category) => selectedCategoryIds.includes(category.id)),
    [selectableCategories, selectedCategoryIds]
  );
  const suggestedCategories = React.useMemo(
    () => searchProductCategories(selectableCategories, [...availableCategories], categorySearch),
    [selectableCategories, availableCategories, categorySearch]
  );

  const getParentNames = (category: ProductCategoryOption) =>
    (category.parents || [])
      .map((parentId) => availableCategories.find((item) => item.id === parentId)?.name)
      .filter(Boolean)
      .join(', ');

  return (
    <div
      id="field-product-categories"
      className="md:col-span-2 flex w-full min-w-0 flex-col gap-3 transition-all p-2 rounded-2xl"
    >
      <div className="flex w-full min-w-0 flex-col gap-2">
        <div className="flex min-h-6 w-full flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <label
              htmlFor="input-search-product-categories"
              className={`shrink-0 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${hasValidationError ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}
            >
              <span>Categoria(s)</span>
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                const newWindow = window.open('/registrations/product-categories', '_blank');
                if (newWindow) {
                  newWindow.blur();
                  window.focus();
                }
              }}
              className="ml-1.5 inline-flex shrink-0 items-center rounded-lg px-1.5 py-0.5 text-[10px] font-black normal-case tracking-normal text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40"
              title="Gerenciar Categorias"
              aria-label="Gerenciar Categorias de Produtos"
            >
              Gerenciar
            </button>
            {isGeneratingCategory && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-955/80 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300/80 dark:border-amber-700/80 animate-pulse select-none">
                <i className="bi bi-stars text-amber-500 animate-spin text-[10px]" />
                <span>Analisando o nome do produto...</span>
              </span>
            )}
          </div>

          {selectedCategories.length > 0 && (
            <span className="max-w-full shrink-0 whitespace-nowrap text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
              {selectedCategories.length} selecionada{selectedCategories.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div
          className={`flex flex-wrap items-center gap-1.5 w-full px-1 py-2 border-b-2 transition-colors ${
            hasValidationError && selectedCategories.length === 0
              ? 'border-red-500 focus-within:border-red-600'
              : 'border-slate-200 dark:border-slate-800 focus-within:border-blue-600 dark:focus-within:border-blue-400'
          }`}
        >
          {selectedCategories.length > 0 && (
            <div className="contents">
              {selectedCategories.map((category) => {
                const parentNames = getParentNames(category);

                return (
                  <span
                    key={category.id}
                    className="inline-flex max-w-full min-w-0 flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <i className="bi bi-check2 text-blue-600 dark:text-blue-400 font-bold" />
                    <span className="min-w-0 break-words">{category.name}</span>
                    {parentNames && (
                      <span className="min-w-0 break-words text-[10px] font-normal text-slate-400 dark:text-slate-500">
                        ({parentNames})
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleCategory(category.id, false)}
                      className="ml-1 shrink-0 text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded focus:outline-none"
                      title={`Remover ${category.name}`}
                      aria-label={`Remover categoria ${category.name}`}
                    >
                      <i className="bi bi-x text-sm leading-none" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="relative flex basis-full min-w-0 flex-1 items-center sm:basis-[180px] sm:min-w-[180px]">
            <i className="bi bi-search absolute left-3 text-slate-400 text-xs pointer-events-none" />
            <input
              id="input-search-product-categories"
              type="text"
              value={categorySearch}
              onChange={(event) => setCategorySearch(event.target.value)}
              placeholder="Pesquisar categorias..."
              aria-label="Pesquisar categorias"
              className={`w-full pl-8 pr-8 py-0.5 text-xs font-semibold rounded-none bg-transparent border-0 outline-none focus:ring-0 transition-all ${
                hasValidationError && selectedCategories.length === 0
                  ? 'text-red-600'
                  : 'text-slate-800 dark:text-slate-100'
              }`}
            />
            {categorySearch && (
              <button
                type="button"
                onClick={() => setCategorySearch('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
                title="Limpar busca"
                aria-label="Limpar termo de busca"
              >
                <i className="bi bi-x-circle-fill text-xs" />
              </button>
            )}
          </div>
        </div>

        {categorySearch.trim().length >= 2 && (
          <div
            className={`overflow-y-auto custom-scrollbar w-full border rounded-xl p-2 transition-all ${
              isGeneratingCategory
                ? 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/20 ring-2 ring-amber-400/40 animate-pulse'
                : hasValidationError && selectedCategories.length === 0
                  ? 'border-red-500/80 bg-red-50/10 dark:bg-red-950/5'
                  : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30'
            }`}
          >
            {suggestedCategories.length === 0 ? (
              <div className="py-5 px-3 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-1">
                <i className="bi bi-inbox text-base opacity-40 mb-0.5" />
                <span>
                  Nenhuma categoria encontrada para &ldquo;
                  <strong className="text-slate-600 dark:text-slate-300">{categorySearch}</strong>
                  &rdquo;.
                </span>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-1">
                  Sugestões encontradas ({suggestedCategories.length}):
                </div>
                {suggestedCategories.map((category) => {
                  const isChecked = selectedCategoryIds.includes(category.id);
                  const parentNames = getParentNames(category);

                  return (
                    <label
                      key={category.id}
                      className={`flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer select-none ${
                        isChecked
                          ? 'bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50'
                          : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(event) => {
                          onToggleCategory(category.id, event.target.checked);
                          setCategorySearch('');
                        }}
                        className="mt-1 h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span
                          className={`text-xs font-bold ${
                            isChecked
                              ? 'text-blue-700 dark:text-blue-300'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {category.name}
                        </span>
                        {parentNames && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            Ambientes: {parentNames}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCategoryPicker;

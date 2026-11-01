import React, { useMemo, useState } from 'react';
import type Person from '@/pages/types/person.type';
import type Product from '@/pages/types/product.type';
import InventoryResponsibleSelect from '../components/InventoryResponsibleSelect';
import type { InventoryScopeType } from '../types/inventoryScope.types';
import { matchesSearchText } from '@/pages/utils/textUtils';

interface InventoryScopeConfigFormProps {
  readonly scopeType: InventoryScopeType | null;
  readonly productParents: readonly Product[];
  readonly selectedProductId: string;
  readonly onSelectProductId: (id: string) => void;
  readonly selectedResponsibleId: string;
  readonly setSelectedResponsibleId: (val: string) => void;
  readonly responsibleError: boolean;
  readonly setResponsibleError: (val: boolean) => void;
  readonly employees: readonly Person[];
}

export const InventoryScopeConfigForm: React.FC<InventoryScopeConfigFormProps> = ({
  scopeType,
  productParents,
  selectedProductId,
  onSelectProductId,
  selectedResponsibleId,
  setSelectedResponsibleId,
  responsibleError,
  setResponsibleError,
  employees,
}) => {
  const [productSearch, setProductSearch] = useState('');
  const selectedProduct = productParents.find((product) => String(product.id) === selectedProductId);
  const matchingProductParents = useMemo(() => {
    const query = productSearch.trim();
    if (query.length < 2) return [];
    return productParents
      .filter((product) => matchesSearchText(
        `${product.description || ''} ${product.name || ''} ${product.sku || ''} ${product.code || ''}`,
        query
      ))
      .slice(0, 10);
  }, [productParents, productSearch]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="space-y-5">
        <div className="relative z-10">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Responsável pelo Inventário
          </label>
          <InventoryResponsibleSelect
            employees={employees}
            value={selectedResponsibleId}
            hasError={responsibleError}
            onChange={(val) => {
              setSelectedResponsibleId(val);
              setResponsibleError(false);
            }}
          />
        </div>

        {scopeType === 'product' && (
          <section className="space-y-3" aria-labelledby="inventory-parent-product-label">
            <label id="inventory-parent-product-label" htmlFor="inventory-parent-product-search" className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              Produto pai ativo
            </label>
            <input
              id="inventory-parent-product-search"
              type="search"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              disabled={Boolean(selectedProduct)}
              placeholder="Buscar por nome, SKU ou código..."
              className="w-full rounded-none border-x-0 border-t-0 border-b border-slate-300 bg-white px-2 py-3 text-sm text-slate-800 outline-none focus:border-b-violet-500 focus:ring-0 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
            />
            {selectedProduct && (
              <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm dark:border-violet-900/60 dark:bg-violet-950/30">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-violet-900 dark:text-violet-200">
                    {selectedProduct.description || selectedProduct.name}
                  </p>
                  <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
                    {selectedProduct.variations?.filter((variation) =>
                      variation.active === true &&
                      !variation.mergedToVariationId &&
                      !['hidden', 'draft'].includes(String(variation.status || '').toLowerCase())
                    ).length || 0}{' '}
                    variações ativas selecionadas
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Desselecionar ${selectedProduct.description || selectedProduct.name || 'produto'}`}
                  title="Desselecionar produto"
                  onClick={() => {
                    onSelectProductId('');
                    setProductSearch('');
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-violet-700 hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-violet-900/50"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>
            )}
            {!selectedProduct && (productSearch.trim().length < 2 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Digite pelo menos duas letras para localizar um produto com variações ativas.
              </p>
            ) : matchingProductParents.length > 0 ? (
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl">
                {matchingProductParents.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    aria-pressed={String(product.id) === selectedProductId}
                    onClick={() => {
                      onSelectProductId(String(product.id));
                      setProductSearch('');
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${String(product.id) === selectedProductId ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30' : 'border-slate-200 bg-white hover:border-violet-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-700'}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                        {product.description || product.name}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                        {product.sku || product.code ? `SKU/código: ${product.sku || product.code} · ` : ''}
                        {product.variations?.filter((variation) =>
                          variation.active === true &&
                          !variation.mergedToVariationId &&
                          !['hidden', 'draft'].includes(String(variation.status || '').toLowerCase())
                        ).length || 0}{' '}
                        variações ativas
                      </span>
                    </span>
                    {String(product.id) === selectedProductId && (
                      <i className="bi bi-check-circle-fill shrink-0 text-violet-600" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Nenhum produto pai ativo com variações corresponde à busca.
              </p>
            ))}
            {productParents.length === 0 && (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Não há produtos ativos com variações disponíveis para contar.
              </p>
            )}
          </section>
        )}

        {scopeType === 'supplier' && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            Depois de iniciar, escolha um fornecedor nos cartões para abrir a contagem dos itens dele.
          </p>
        )}

      </div>
    </div>
  );
};

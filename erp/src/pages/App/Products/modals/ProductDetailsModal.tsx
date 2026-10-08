import React from 'react';
import Product, { Variation } from '@/pages/types/product.type';
import { formatCurrency } from '@/pages/utils/formatters';
import { normalizeProductVariationName } from '@/pages/utils/productVariationDefaults';

type ProductDetailsData = Product & {
  allVariations?: Variation[];
  attributes?: Variation['attributes'];
};

interface ProductDetailsModalProps {
  product: ProductDetailsData;
  onClose: () => void;
}

const detailRows = (product: ProductDetailsData) =>
  [
    ['Código', product.code || product.sku],
    ['Categoria', product.category],
    ['Marca', product.brand],
    ['Linha', product.line],
    ['Cor', product.colors],
    ['Material', product.material],
    ['Largura', product.width ? `${product.width} cm` : undefined],
    ['Altura', product.height ? `${product.height} cm` : undefined],
    ['Profundidade', product.depth ? `${product.depth} cm` : undefined],
    ['Peso', product.weight ? `${product.weight} kg` : undefined],
  ].filter((row): row is [string, string] => Boolean(row[1]));

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose }) => {
  const title = product.name || product.title || product.description.split('\n')[0] || 'Produto';
  const variations = product.allVariations || product.variations || [];
  const hasPromo =
    Number(product.promoPrice) > 0 && Number(product.promoPrice) < Number(product.unitPrice);
  const price = Number(hasPromo ? product.promoPrice : product.unitPrice || 0);
  const attributes = product.attributes || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-details-title"
      className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <section
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 px-5 py-4 sm:px-7 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
              Detalhes do produto
            </p>
            <h2
              id="product-details-title"
              className="mt-1 text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 truncate"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do produto"
            className="w-9 h-9 shrink-0 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <i className="bi bi-x-lg" />
          </button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5">
            <div className="aspect-square rounded-2xl bg-slate-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-700">
              {product.images?.[0] ? (
                <img src={product.images[0]} alt={title} className="w-full h-full object-contain" />
              ) : (
                <i className="bi bi-image text-4xl text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {formatCurrency(price)}
                </span>
                {hasPromo && (
                  <span className="text-sm font-bold text-slate-400 line-through">
                    {formatCurrency(Number(product.unitPrice))}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Estoque: {product.stock ?? 0}
                </span>
                <span
                  className={`px-3 py-1.5 rounded-full ${product.active === false ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'}`}
                >
                  {product.active === false ? 'Inativo' : 'Ativo'}
                </span>
              </div>
              {product.description && (
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                  {product.description}
                </p>
              )}
              {detailRows(product).length > 0 && (
                <dl className="grid grid-cols-2 gap-x-5 gap-y-3 pt-2">
                  {detailRows(product).map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                        {label}
                      </dt>
                      <dd className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200 break-words">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>

          {attributes.length > 0 && (
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Características
              </h3>
              <div className="flex flex-wrap gap-2">
                {attributes.map((attribute, index) => (
                  <span
                    key={`${attribute.name}-${index}`}
                    className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 text-xs font-semibold"
                  >
                    {attribute.showName === false ? attribute.value : `${attribute.name}: ${attribute.value}`}
                  </span>
                ))}
              </div>
            </section>
          )}

          {variations.length > 0 && (
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Variações
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-[9px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Variação</th>
                      <th className="px-3 py-2">Código</th>
                      <th className="px-3 py-2 text-right">Preço</th>
                      <th className="px-3 py-2 text-right">Estoque</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {variations.map((variation, index) => (
                      <tr key={variation.id || index}>
                        <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                          {(variation.name && normalizeProductVariationName(title, variation.name)) ||
                            variation.attributes?.map((item) => item.value).join(' / ') ||
                            `Variação ${index + 1}`}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500">{variation.sku || '-'}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-200">
                          {formatCurrency(Number(variation.promoPrice || variation.unitPrice || product.unitPrice || 0))}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                          {variation.stock ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProductDetailsModal;

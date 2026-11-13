import { useCallback, useEffect, useRef, useState } from 'react';
import DropdownPortal from '@/components/shared/DropdownPortal';
import { PREVIEW_PRODUCT_PAGE_SIZE } from './productPreviewService';
import { imageTemplateError } from './imageTemplateService';
import {
  countPreviewSearchChars,
  hasNextPreviewProductPage,
  useTemplateProductPreview,
} from './hooks/useTemplateProductPreview';
import { PRODUCT_LIST_SEARCH_MIN_LENGTH } from '../../../../../../shared-utils/productListSearch';

export { useTemplateProductPreview };

type Preview = ReturnType<typeof useTemplateProductPreview>;

function resolveSelectedOption(
  productId: string | undefined,
  rows: Preview['rows'],
  detail: Preview['detail'],
  initialProducts: Preview['initialProducts'],
) {
  const optionRows = rows.map((row) => ({ id: row.id, name: row.name, code: row.code }));
  if (productId && !optionRows.some((row) => row.id === productId)) {
    const selectedDetails = detail.data?.id === productId ? detail.data : null;
    const retainedRow = initialProducts.data?.rows.find((row) => row.id === productId);
    if (selectedDetails) {
      optionRows.push({ id: selectedDetails.id, name: selectedDetails.name, code: selectedDetails.code });
    } else if (retainedRow) {
      optionRows.push({ id: retainedRow.id, name: retainedRow.name, code: retainedRow.code });
    } else {
      optionRows.push({ id: productId, name: 'Produto selecionado', code: '' });
    }
  }
  return optionRows.find((row) => row.id === productId);
}

/**
 * Interactive toolbar controls for choosing the category filter, searching a preview product,
 * and stepping between adjacent products in the image template studio.
 */
export function TemplateProductPreview({
  preview,
  disabled,
  onProductIntent,
}: {
  preview: Preview;
  disabled: boolean;
  onProductIntent?: (id: string) => void;
}) {
  const { products, groups, detail, rows, position, productId, categoryId, page, initialProducts, product } = preview;
  const setSearchInput = preview.setSearchInput;
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const pickerAnchorRef = useRef<HTMLDivElement>(null);
  const pickerSearchRef = useRef<HTMLInputElement>(null);

  const failure = products.isError ? products : detail.isError ? detail : null;
  const hasNext = hasNextPreviewProductPage(position, rows.length, page, products.data?.total ?? 0);
  const searchLength = countPreviewSearchChars(preview.searchInput);
  const selectedProduct = resolveSelectedOption(productId, rows, detail, initialProducts);
  const menuRows = rows.slice(0, PREVIEW_PRODUCT_PAGE_SIZE);

  const closeProductPicker = useCallback(() => {
    setProductPickerOpen(false);
    setSearchInput('');
  }, [setSearchInput]);

  useEffect(() => {
    if (!productPickerOpen) return;
    const frame = window.requestAnimationFrame(() => pickerSearchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [productPickerOpen]);

  useEffect(() => {
    if (disabled) closeProductPicker();
  }, [closeProductPicker, disabled]);

  function openProductPicker() {
    if (disabled) return;
    setSearchInput('');
    setProductPickerOpen(true);
  }

  function chooseProduct(id: string) {
    preview.selectProduct(id);
    closeProductPicker();
  }

  function intentHandlers(targetId: string | undefined) {
    if (!targetId || !onProductIntent) return undefined;
    return {
      onMouseEnter: () => onProductIntent(targetId),
      onFocus: () => onProductIntent(targetId),
    };
  }

  return (
    <section className="ct-preview-controls" aria-label="Prévia do produto">
      <fieldset className="ct-preview-fields" disabled={disabled}>
        <label className="ct-field ct-preview-group">
          <span>Conjunto de produtos</span>
          <select value={categoryId} onChange={(event) => preview.selectCategory(event.target.value)}>
            <option value="">Todos os produtos</option>
            {(groups.data ?? []).map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </label>
        <div ref={pickerAnchorRef} className="ct-field ct-preview-product">
          <span id="ct-preview-product-label">Produto do preview</span>
          <button
            type="button"
            className="ct-button ct-preview-product-trigger"
            aria-labelledby="ct-preview-product-label ct-preview-product-selected"
            aria-haspopup="listbox"
            aria-expanded={productPickerOpen}
            aria-controls="ct-preview-product-options"
            disabled={disabled}
            onClick={productPickerOpen ? closeProductPicker : openProductPicker}
          >
            <span id="ct-preview-product-selected">{selectedProduct?.name || 'Produto de exemplo'}</span>
            <i className={`bi ${productPickerOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" />
          </button>
          <DropdownPortal anchorRef={pickerAnchorRef} isOpen={productPickerOpen} placement="top" onClose={closeProductPicker}>
            <div className="ct-preview-picker ct-surface">
              <label className="ct-preview-picker-search">
                <span>Buscar produto</span>
                <input
                  ref={pickerSearchRef}
                  type="search"
                  maxLength={120}
                  value={preview.searchInput}
                  placeholder="Nome ou código (mín. 3 caracteres)"
                  disabled={disabled}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </label>
              <div id="ct-preview-product-options" className="ct-preview-picker-options" role="listbox" aria-label="Produtos">
                {!preview.searchReady ? (
                  <p className="ct-preview-picker-status">
                    {searchLength < PRODUCT_LIST_SEARCH_MIN_LENGTH
                      ? 'Digite pelo menos três letras ou números para pesquisar.'
                      : 'Aguarde a busca…'}
                  </p>
                ) : products.isFetching ? (
                  <p className="ct-preview-picker-status" role="status">Buscando produtos…</p>
                ) : !menuRows.length ? (
                  <p className="ct-preview-picker-status">Nenhum produto encontrado.</p>
                ) : (
                  menuRows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      role="option"
                      aria-selected={row.id === productId}
                      className="ct-preview-picker-option"
                      disabled={disabled}
                      {...intentHandlers(row.id)}
                      onClick={() => chooseProduct(row.id)}
                    >
                      <span>{row.name}</span>
                      <small>{row.code || 'Sem código'}</small>
                    </button>
                  ))
                )}
              </div>
            </div>
          </DropdownPortal>
        </div>
        <div className="ct-arrows">
          <button
            className="ct-button"
            type="button"
            aria-label="Produto anterior"
            disabled={products.isFetching || (position < 1 && page === 1)}
            {...intentHandlers(rows[position - 1]?.id)}
            onClick={() => preview.stepProduct(-1)}
          >
            <i className="bi bi-arrow-left" aria-hidden="true" />
          </button>
          <button
            className="ct-button"
            type="button"
            aria-label="Próximo produto"
            disabled={products.isFetching || !hasNext}
            {...intentHandlers(rows[position + 1]?.id)}
            onClick={() => preview.stepProduct(1)}
          >
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </fieldset>
      {groups.isError && (
        <p className="ct-preview-message" role="alert">
          Não foi possível carregar as categorias do ERP.{' '}
          <button className="ct-link" type="button" disabled={disabled} onClick={() => void groups.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      {failure && (
        <p className="ct-preview-message" role="alert">
          {imageTemplateError(failure.error)}{' '}
          <button className="ct-link" type="button" disabled={disabled} onClick={() => void failure.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      {!failure && !product && (detail.isFetching || (!productId && initialProducts.isFetching)) && (
        <p className="ct-preview-message" role="status">Carregando a prévia do produto…</p>
      )}
      {!failure && !products.isFetching && !rows.length && !productId && (
        <p className="ct-preview-message">
          Nenhum produto encontrado. A tela mostra uma imagem de exemplo.
        </p>
      )}
    </section>
  );
}

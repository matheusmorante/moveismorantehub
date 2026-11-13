import React from 'react';
import type { WhatsAppMessage } from '../../../../types';
import {
  getCatalogMessageCaption,
  getCatalogProductNameHints,
  getCatalogProductCardIds,
  getCatalogProductSnapshot,
  getCatalogRetailerIds,
  type CatalogInteractiveProductCard,
} from '../../../../catalogInteractiveProducts';

interface InteractiveMessageMediaProps {
  message: WhatsAppMessage;
  catalogProductCards?: Record<string, CatalogInteractiveProductCard>;
  loadingCatalogRetailerIds?: ReadonlySet<string>;
}

const formatPrice = (value: number, currency = 'BRL'): string => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency,
}).format(value);

export const InteractiveMessageMedia: React.FC<InteractiveMessageMediaProps> = ({
  message,
  catalogProductCards = {},
  loadingCatalogRetailerIds = new Set<string>(),
}) => {
  const reactionEmoji =
    typeof message.rawPayload?.reaction?.emoji === 'string'
      ? message.rawPayload.reaction.emoji
      : message.textContent?.match(/^Reação (.+) a uma mensagem$/u)?.[1] || '';
  const isReaction =
    message.rawPayload?.provider_message_type === 'reaction' ||
    Boolean(reactionEmoji) ||
    message.textContent === 'Reação removida de uma mensagem';

  if (isReaction) {
    return (
      <p className="mb-1 flex items-center gap-2 rounded-full bg-black/5 px-2 py-1 text-[12px] dark:bg-white/10">
        <span className="text-lg" aria-hidden="true">
          {reactionEmoji || '↩️'}
        </span>
        <span>{reactionEmoji ? 'Reação à mensagem citada' : 'Reação removida da mensagem'}</span>
      </p>
    );
  }

  const retailerIds = getCatalogRetailerIds(message);
  const snapshot = getCatalogProductSnapshot(message);
  const cardIds = getCatalogProductCardIds(message);
  if (cardIds.length > 0) {
    const nameHints = getCatalogProductNameHints(message);
    const caption = getCatalogMessageCaption(message);

    return (
      <div className="mb-1 min-w-0 max-w-full">
        {caption && (
          <p className="mb-2 w-fit max-w-full whitespace-pre-wrap break-words rounded-xl bg-white px-3 py-2 text-[13px] font-normal text-slate-800 shadow-sm dark:bg-[#202c33] dark:text-slate-100">
            {caption}
          </p>
        )}
        {cardIds.length > 1 && (
          <p className="mb-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            {cardIds.length} produtos <span aria-hidden="true">· Deslize para ver →</span>
          </p>
        )}
        <div
          className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          role={cardIds.length > 1 ? 'region' : undefined}
          aria-label={cardIds.length > 1 ? 'Produtos do catálogo' : undefined}
          tabIndex={cardIds.length > 1 ? 0 : undefined}
        >
          {cardIds.map((retailerId) => {
            const variationKey = snapshot?.retailerId === retailerId && snapshot.variationId
              ? `variation:${snapshot.variationId}`
              : '';
            const savedProduct = catalogProductCards[retailerId] || (variationKey ? catalogProductCards[variationKey] : undefined);
            const isLoading = loadingCatalogRetailerIds.has(retailerId) || Boolean(variationKey && loadingCatalogRetailerIds.has(variationKey));
            const product = savedProduct || (snapshot &&
              (snapshot.retailerId === retailerId || (!snapshot.retailerId && !retailerIds.length))
              ? snapshot : undefined);
            const hint = nameHints.get(retailerId);
            const name = product?.name || hint || (isLoading
              ? 'Carregando produto…'
              : 'Produto do catálogo');
            const price = product?.promoPrice && product.salesPrice && product.promoPrice < product.salesPrice
              ? product.promoPrice
              : product?.salesPrice;

            return (
              <article
                key={retailerId}
                className="w-40 max-w-full shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-[#202c33] dark:text-slate-100 sm:w-44"
              >
                {product?.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={name}
                    loading="lazy"
                    className="aspect-square w-full bg-white object-contain dark:bg-[#202c33]"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-white text-3xl text-slate-300 dark:bg-[#202c33] dark:text-slate-600">
                    {isLoading
                      ? <span className="h-8 w-8 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
                      : <i className="bi bi-image" aria-hidden="true" />}
                  </div>
                )}
                <div className="p-2.5">
                  <h4 className="line-clamp-3 min-h-9 break-words text-xs font-semibold leading-4">{name}</h4>
                  {price ? (
                    <div className="mt-1">
                      {product?.promoPrice && product.salesPrice && product.promoPrice < product.salesPrice && (
                        <p className="text-[10px] text-slate-400 line-through">{formatPrice(product.salesPrice, product.currencyCode)}</p>
                      )}
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatPrice(price, product?.currencyCode)}</p>
                      {!savedProduct && snapshot && <p className="text-[10px] text-slate-400">Valor na mensagem</p>}
                    </div>
                  ) : (
                    !retailerId.startsWith('snapshot:') && !retailerId.startsWith('variation:') &&
                    <p className="mt-1 truncate text-[10px] text-slate-400">{retailerId}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-1 whitespace-pre-wrap break-words p-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 font-medium">
      {message.textContent}
    </div>
  );
};

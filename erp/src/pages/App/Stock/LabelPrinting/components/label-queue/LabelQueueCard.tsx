import React from 'react';
import labelMdf from '../../../../../../assets/label_mdf.png';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import type { Product, Variation } from '@/pages/types/product.type';
import ProductSearchInput from '../ProductSearchInput';

interface LabelQueueCardProps {
  item: any;
  idx: number;
  isPriceQueue: boolean;
  shouldShowThumbnail: boolean;
  labelPhysicalSize: { widthMm: number; heightMm: number };
  selectedCategory?: string | null;
  imageBusy: boolean;
  dragOverIdx: number | null;
  products?: any[];
  onSelectProduct?: (index: number, product: any) => void;
  onReplaceProduct?: (index: number, product: Product, variation?: Variation) => void;
  updateItem: (idx: number, updates: any) => void;
  removeItem: (idx: number) => void;
  handleImageChange: (event: React.ChangeEvent<HTMLInputElement>, index: number, blank?: boolean) => void;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, targetIndex: number) => void;
}

export const LabelQueueCard: React.FC<LabelQueueCardProps> = ({
  item,
  idx,
  isPriceQueue,
  shouldShowThumbnail,
  labelPhysicalSize,
  selectedCategory,
  imageBusy,
  dragOverIdx,
  products = [],
  onSelectProduct,
  onReplaceProduct,
  updateItem,
  removeItem,
  handleImageChange,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
}) => {
  return (
    <div
      draggable={true}
      onDragStart={(e) => handleDragStart(e, idx)}
      onDragOver={(e) => handleDragOver(e, idx)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, idx)}
      className={`group relative w-full ${isPriceQueue ? 'max-w-none min-h-[132px] flex items-center' : 'max-w-2xl flex items-center'} bg-white dark:bg-slate-900 rounded-[1.75rem] p-3 transition-all duration-300 gap-3 cursor-grab active:cursor-grabbing ${
        dragOverIdx === idx
          ? 'border-2 border-dashed border-blue-500 bg-blue-500/5 scale-[1.01] z-10'
          : ''
      }`}
    >
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-slate-350 dark:text-slate-650 hover:text-slate-450 px-1 py-2 flex items-center justify-center pointer-events-none select-none">
          <i className="bi bi-grip-vertical text-base opacity-60" />
        </div>
        {isPriceQueue && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[7px] font-black uppercase tracking-wider text-slate-400">
              Imagem / Produto
            </span>
            <button
              type="button"
              onClick={() =>
                updateItem(
                  idx,
                  item.printingMode === 'advanced'
                    ? {
                        printingMode: 'simple',
                        image: '',
                        isBlank: true,
                        name: '',
                        price: '',
                        promoPrice: '',
                        sku: '',
                      }
                    : {
                        printingMode: 'advanced',
                        image: '',
                        isBlank: true,
                        name: '',
                        price: '',
                        promoPrice: '',
                        sku: '',
                      }
                )
              }
              aria-pressed={item.printingMode === 'advanced'}
              className={`relative h-5 w-10 shrink-0 overflow-hidden rounded-full p-0.5 transition-colors ${item.printingMode === 'advanced' ? 'bg-emerald-500' : 'bg-blue-600'}`}
              title={item.printingMode === 'advanced' ? 'Modo produto' : 'Modo imagem'}
            >
              <span
                className={`absolute inset-y-0.5 left-0.5 w-4 rounded-full bg-white shadow-sm transition-transform ${item.printingMode === 'advanced' ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Miniatura Interativa */}
      {shouldShowThumbnail && (
        <div className="flex flex-col gap-2 items-center">
          <div
            className={`relative shrink-0 rounded-xl flex items-center justify-center overflow-hidden group/thumb ${isPriceQueue ? 'w-32 sm:w-36' : 'w-16 h-16'}`}
            style={
              isPriceQueue
                ? {
                    aspectRatio: `${labelPhysicalSize.widthMm} / ${labelPhysicalSize.heightMm}`,
                  }
                : undefined
            }
          >
            {item.isBlank && !item.image ? (
              <div className="w-full h-full rounded-lg flex items-center justify-center bg-blue-600" />
            ) : (
              <img
                src={item.image || labelMdf}
                style={{
                  transform: `scale(${item.scale || 1}) rotate(${item.rotation || 0}deg)`,
                  objectFit: item.imageFit || 'contain',
                }}
                className="w-full h-full rounded-xl transition-all duration-500"
                alt=""
              />
            )}
            {item.isBlank ? (
              <div className="absolute inset-0 bg-blue-600/90 backdrop-blur-sm flex items-center justify-center p-2">
                <label className="w-full h-full flex items-center justify-center text-white rounded-xl cursor-pointer hover:bg-blue-500/40 active:scale-95 transition-all">
                  <i className="bi bi-image text-xl" aria-label="Selecionar imagem" />
                  <input
                    type="file"
                    accept="image/*"
                    aria-label={`Imagem da etiqueta ${idx + 1}`}
                    disabled={imageBusy}
                    className="hidden"
                    onChange={(event) => handleImageChange(event, idx, true)}
                  />
                </label>
              </div>
            ) : (
              <div className="absolute inset-0 bg-blue-600/90 backdrop-blur-sm opacity-0 group-hover/thumb:opacity-100 flex flex-col items-center justify-center gap-2 transition-all p-2">
                <label className="w-full text-center py-1.5 bg-white text-blue-600 rounded-xl text-[8px] font-black uppercase cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg">
                  Trocar Imagem
                  <input
                    type="file"
                    accept="image/*"
                    aria-label={`Imagem da etiqueta ${idx + 1}`}
                    disabled={imageBusy}
                    className="hidden"
                    onChange={(event) => handleImageChange(event, idx)}
                  />
                </label>
              </div>
            )}
          </div>

          {!isPriceQueue &&
            !item.isBlank &&
            (item.productImages?.length > 0 || item.parentImages?.length > 0) &&
            (() => {
              const allImages = [...(item.productImages || []), ...(item.parentImages || [])];
              if (allImages.length <= 1) return null;
              const currentIndex = item.currentImageIndex || 0;
              return (
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1 py-0.5 shadow-sm mt-[-4px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newIndex =
                        (currentIndex - 1 + allImages.length) % allImages.length;
                      updateItem(idx, {
                        currentImageIndex: newIndex,
                        image: allImages[newIndex].image_url,
                      });
                    }}
                    className="text-slate-400 hover:text-blue-500 p-0.5"
                  >
                    <i className="bi bi-chevron-left text-[10px]" />
                  </button>
                  <span className="text-[9px] font-bold text-slate-500 select-none min-w-[20px] text-center">
                    {currentIndex + 1}/{allImages.length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newIndex = (currentIndex + 1) % allImages.length;
                      updateItem(idx, {
                        currentImageIndex: newIndex,
                        image: allImages[newIndex].image_url,
                      });
                    }}
                    className="text-slate-400 hover:text-blue-500 p-0.5"
                  >
                    <i className="bi bi-chevron-right text-[10px]" />
                  </button>
                </div>
              );
            })()}
        </div>
      )}

      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* CABEÇALHO DO ITEM (Produto / SKU) e AÇÕES (Qtd / Lixeira) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Nome e SKU */}
          <div className="min-w-0 flex-1">
            {selectedCategory === 'identificacao' ? (
              <ProductAutocomplete
                value={item.isBlank ? '' : item.name || ''}
                onSelect={(product, variation) => onReplaceProduct?.(idx, product, variation)}
                allowedProductKinds={['normal']}
                variationsOnly
                excludeCombos
                maxSuggestions={5}
                placeholder={item.isBlank ? 'Buscar produto convencional...' : 'Alterar produto da etiqueta...'}
                inputClassName="w-full border-b-2 border-slate-200 bg-transparent px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 dark:border-slate-800 dark:text-slate-100"
              />
            ) : item.isBlank ? (
              selectedCategory === 'precos' && item.printingMode === 'advanced' ? (
                <ProductSearchInput
                  products={products}
                  selectedProduct={null}
                  onSelectProduct={(product) => product && onSelectProduct?.(idx, product)}
                  placeholder="Buscar produto ou SKU..."
                  hideIcon
                />
              ) : selectedCategory === 'precos' ? null : (
                <>
                  <label className="text-[8px] font-black uppercase text-slate-400 mb-0.5 block tracking-widest">
                    Espaçador
                  </label>
                  <h4 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate tracking-tighter">
                    Etiqueta Em Branco
                  </h4>
                </>
              )
            ) : (
              <>
                <h4
                  className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase truncate"
                  title={item.name || 'Produto sem nome'}
                >
                  {item.name || 'Produto sem nome'}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  {selectedCategory !== 'precos' && (item.sku || item.code) && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                        SKU
                      </span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold truncate uppercase tracking-wide bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {item.sku || item.code}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Quantidade e Lixeira */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <div className="flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 shrink-0">
              <button
                type="button"
                onClick={() =>
                  updateItem(idx, { quantity: Math.max(1, (item.quantity || 1) - 1) })
                }
                aria-label="Diminuir quantidade de etiquetas"
                className="text-slate-500 hover:text-blue-500 w-8 h-8 shrink-0 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
              >
                <i className="bi bi-dash text-base" />
              </button>
              <input
                type="number"
                value={Number.isFinite(item.quantity) ? item.quantity : ''}
                min={1}
                onChange={(e) =>
                  updateItem(idx, { quantity: e.target.value === '' ? Number.NaN : Number(e.target.value) })
                }
                aria-label="Quantidade de etiquetas"
                className="w-10 shrink-0 appearance-none bg-transparent text-center text-sm font-black tabular-nums outline-none text-slate-700 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={() => updateItem(idx, { quantity: (item.quantity || 1) + 1 })}
                aria-label="Aumentar quantidade de etiquetas"
                className="text-slate-500 hover:text-blue-500 w-8 h-8 shrink-0 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
              >
                <i className="bi bi-plus text-base" />
              </button>
            </div>

            <button
              onClick={() => removeItem(idx)}
              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center border border-slate-200 dark:border-slate-800 shrink-0 shadow-sm"
              title="Remover item"
            >
              <i className="bi bi-trash3-fill text-sm" />
            </button>
          </div>
        </div>

        {/* OPÇÕES DE LOGO / IMAGEM LIVRE (Zoom) */}
        {selectedCategory === 'logos' && !item.isBlank && item.printingMode === 'simple' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">
            <div className="flex items-center gap-2 w-max bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg px-1.5 py-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mr-1 hidden md:inline">
                Escala
              </span>
              <button
                onClick={() =>
                  updateItem(idx, {
                    scale: Math.max(0.1, parseFloat(((item.scale || 1) - 0.05).toFixed(2))),
                  })
                }
                className="w-5 h-5 rounded bg-white dark:bg-slate-900 border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-blue-500"
              >
                <i className="bi bi-dash text-xs" />
              </button>
              <input
                type="number"
                step="5"
                min="10"
                max="2000"
                value={Math.round((item.scale || 1) * 100)}
                onChange={(e) =>
                  updateItem(idx, {
                    scale: Math.max(
                      0.1,
                      Math.min(20, (parseFloat(e.target.value) || 100) / 100)
                    ),
                  })
                }
                className="w-10 bg-transparent text-[10px] font-black outline-none text-center"
              />
              <span className="text-[9px] font-black text-slate-400">%</span>
              <button
                onClick={() =>
                  updateItem(idx, {
                    scale: Math.min(20, parseFloat(((item.scale || 1) + 0.05).toFixed(2))),
                  })
                }
                className="w-5 h-5 rounded bg-white dark:bg-slate-900 border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-blue-500"
              >
                <i className="bi bi-plus text-xs" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  searchProductsForLabel,
  PriceLabelCatalogProduct
} from '../../services/priceLabelCatalogService';

export interface PriceLabelDataFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyProductTitle: (prodName: string) => void;
  title: string;
  setTitle: (val: string) => void;
  normalPrice: string;
  setNormalPrice: (val: string) => void;
  promoPrice: string;
  setPromoPrice: (val: string) => void;
  centsText: string;
  setCentsText: (val: string) => void;
  currencySymbol: string;
  setCurrencySymbol: (val: string) => void;
  installments: string;
  setInstallments: (val: string) => void;
}

export const PriceLabelDataFillModal: React.FC<PriceLabelDataFillModalProps> = ({
  isOpen,
  onClose,
  onApplyProductTitle,
  title,
  setTitle,
  normalPrice,
  setNormalPrice,
  promoPrice,
  setPromoPrice,
  centsText,
  setCentsText,
  currencySymbol,
  setCurrencySymbol,
  installments,
  setInstallments,
}) => {
  const [dataFillTab, setDataFillTab] = useState<'search' | 'manual'>('search');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PriceLabelCatalogProduct[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  useEffect(() => {
    if (!isOpen || dataFillTab !== 'search') return;

    let isCurrent = true;
    const timer = setTimeout(async () => {
      setIsSearchingProducts(true);
      try {
        const results = await searchProductsForLabel(productSearchTerm);
        if (isCurrent) {
          setSearchResults(Array.isArray(results) ? results : []);
        }
      } finally {
        if (isCurrent) setIsSearchingProducts(false);
      }
    }, 150);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [isOpen, dataFillTab, productSearchTerm]);

  if (!isOpen) return null;

  return (
    <div
      style={{ zIndex: 9999 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Topo do Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg font-black">
              <i className="bi bi-pencil-square" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                Produto Modelo & Dados
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                Preencha manualmente os campos ou selecione um produto do catálogo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center cursor-pointer transition"
          >
            <i className="bi bi-x-lg text-sm" />
          </button>
        </div>

        {/* Navegação por Abas do Modal */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl mb-4 shrink-0 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setDataFillTab('search')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer ${
              dataFillTab === 'search'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <i className="bi bi-search text-sm" />
            <span>Puxar Produto da Lista</span>
          </button>
          <button
            type="button"
            onClick={() => setDataFillTab('manual')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer ${
              dataFillTab === 'manual'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <i className="bi bi-sliders text-sm" />
            <span>Preenchimento Manual</span>
          </button>
        </div>

        {/* Conteúdo Aba 1: Puxar Produto da Lista */}
        {dataFillTab === 'search' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-3">
            {/* Campo de Busca */}
            <div className="relative shrink-0">
              <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                placeholder="Digite o nome, código ou SKU do produto..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
              />
              {isSearchingProducts && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Lista de Resultados */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 min-h-[220px]">
              {(searchResults || []).length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <i className="bi bi-box-seam text-3xl mb-2 block text-slate-300 dark:text-slate-700" />
                  <p className="text-xs font-bold">Nenhum produto encontrado</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Digite um termo no campo acima para pesquisar no catálogo do ERP
                  </p>
                </div>
              ) : (
                (searchResults || []).map(prod => {
                  const hasPromo = Number(prod.promo_price || 0) > 0;
                  const mainImage = Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : null;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => onApplyProductTitle(prod.name)}
                      className="p-3 bg-slate-50 dark:bg-slate-950 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-2xl flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                          {mainImage ? (
                            <img src={mainImage} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <i className="bi bi-image text-slate-300 text-lg" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-800 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase">
                            {prod.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            {prod.code && (
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-md uppercase">
                                CÓD: {prod.code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          {hasPromo ? (
                            <>
                              <span className="text-[10px] text-slate-400 line-through block font-bold">
                                R$ {Number(prod.unit_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block">
                                R$ {Number(prod.promo_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-black text-slate-800 dark:text-white block">
                              R$ {Number(prod.unit_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider group-hover:bg-emerald-700 shadow-sm transition"
                        >
                          Puxar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Conteúdo Aba 2: Preenchimento Manual */}
        {dataFillTab === 'manual' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 min-h-[220px]">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">Nome / Título do Produto</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.toUpperCase())}
                placeholder="Ex: COLCHÃO DE ESPUMA D28..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Preço Normal (DE:)</label>
                <input
                  type="text"
                  value={normalPrice}
                  onChange={(e) => setNormalPrice(e.target.value)}
                  placeholder="Ex: 499,00"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Preço Principal Reais (POR:)</label>
                <input
                  type="text"
                  value={promoPrice}
                  onChange={(e) => setPromoPrice(e.target.value)}
                  placeholder="Ex: 299"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Centavos</label>
                <input
                  type="text"
                  value={centsText}
                  onChange={(e) => setCentsText(e.target.value)}
                  placeholder="Ex: ,00"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Símbolo da Moeda</label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="Ex: R$"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">Frase de Parcelamento</label>
              <input
                type="text"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                placeholder="Ex: Em até 10x sem juros no cartão"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                toast.success('Campos atualizados na etiqueta!');
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md mt-2 cursor-pointer"
            >
              Aplicar na Etiqueta
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

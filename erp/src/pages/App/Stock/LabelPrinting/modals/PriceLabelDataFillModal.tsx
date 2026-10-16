import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { labelManualDataFormSchema, labelDataFillProductFormSchema, labelCatalogSearchFormSchema, labelCatalogProductsSchema, type LabelManualData } from '../../../../../../../shared-utils/labelDataFillFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import {
  searchProductsForLabelResult,
  PriceLabelCatalogProduct,
} from '../services/priceLabelCatalogService';

export interface PriceLabelDataFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyProductTitle: (prodName: string, stillCurrent?: () => boolean) => boolean | Promise<boolean>;
  onApplyData: (values: LabelManualData, stillCurrent?: () => boolean) => boolean | Promise<boolean>;
  ownerKey?: string;
  title: string;
  normalPrice: string;
  promoPrice: string;
  centsText: string;
  currencySymbol: string;
  installments: string;
}

const PriceLabelDataFillDialog: React.FC<PriceLabelDataFillModalProps> = (props) => {
  const { onClose, onApplyProductTitle, onApplyData } = props;
  const [draft, setDraft] = useState<LabelManualData>(() => ({ title: props.title, normalPrice: props.normalPrice, promoPrice: props.promoPrice, centsText: props.centsText, currencySymbol: props.currencySymbol, installments: props.installments }));
  const { title, normalPrice, promoPrice, centsText, currencySymbol, installments } = draft;
  const setTitle = (value: string) => setDraft((previous) => ({ ...previous, title: value }));
  const setNormalPrice = (value: string) => setDraft((previous) => ({ ...previous, normalPrice: value }));
  const setPromoPrice = (value: string) => setDraft((previous) => ({ ...previous, promoPrice: value }));
  const setCentsText = (value: string) => setDraft((previous) => ({ ...previous, centsText: value }));
  const setCurrencySymbol = (value: string) => setDraft((previous) => ({ ...previous, currencySymbol: value }));
  const setInstallments = (value: string) => setDraft((previous) => ({ ...previous, installments: value }));
  const [dataFillTab, setDataFillTab] = useState<'search' | 'manual'>('search');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PriceLabelCatalogProduct[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [searchRevision, setSearchRevision] = useState(0);
  const form = useZodForm(labelManualDataFormSchema, draft);
  const productForm = useZodForm(labelDataFillProductFormSchema, { id: '', title: '' });
  const { validateValues: validateSearch } = useZodForm(labelCatalogSearchFormSchema, { searchTerm: productSearchTerm });
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [queryError, setQueryError] = useState(''), [blocked, setBlocked] = useState(false);
  const mounted = useRef(false), locked = useRef(false), closed = useRef(false), replayBlocked = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const close = () => { if (mounted.current && !locked.current && !closed.current) { closed.current = true; onClose(); } };
  const apply = async (product?: PriceLabelCatalogProduct) => {
    if (!mounted.current || locked.current || closed.current || replayBlocked.current) return;
    locked.current = true; setPending(true); setError(''); let active = true;
    const current = () => active && mounted.current && !closed.current;
    const fail = (message: string) => { if (current()) { setError(message); toast.error(message); } };
    const confirm = async (operation: () => boolean | Promise<boolean>) => {
      if (!current()) return;
      const result = await withTimeout(Promise.resolve(operation()).then((confirmed) => ({ confirmed })), 15_000, null, 'etiquetas:aplicar-dados');
      if (!current()) return;
      if (!result) { replayBlocked.current = true; setBlocked(true); throw new Error('A aplicação não foi confirmada. Confira o editor antes de repetir.'); }
      if (result.confirmed !== true) throw new Error('Não foi possível aplicar os dados. Confira os campos e tente novamente.');
      closed.current = true; onClose(); toast.success(product ? 'Nome do produto aplicado na etiqueta!' : 'Campos atualizados na etiqueta!');
    };
    try {
      const invalid = (errors: Parameters<typeof flattenFormErrors>[0]) => fail(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados da etiqueta.');
      if (product) await productForm.validateAndRun({ id: product.id, title: product.name }, (values) => confirm(() => onApplyProductTitle(values.title, current)), invalid);
      else await form.validateAndRun(draft, (values) => confirm(() => onApplyData(values, current)), invalid);
    } catch (cause) { fail(cause instanceof Error ? cause.message : 'Não foi possível aplicar os dados.'); }
    finally { active = false; locked.current = false; if (mounted.current) setPending(false); }
  };

  useEffect(() => {
    setIsSearchingProducts(false); setSearchResults([]); setQueryError('');
    if (dataFillTab !== 'search') return;

    let isCurrent = true;
    const timer = setTimeout(async () => {
      setIsSearchingProducts(true);
      try {
        const values = await validateSearch({ searchTerm: productSearchTerm }, (errors) => { if (isCurrent) setQueryError(Object.values(flattenFormErrors(errors))[0] || 'Confira a busca.'); });
        if (!values || !isCurrent) return;
        const results = await withTimeout(searchProductsForLabelResult(values.searchTerm), 16_000, null, 'etiquetas:buscar-produto');
        if (isCurrent) {
          const parsed = labelCatalogProductsSchema.safeParse(results?.data);
          setSearchResults(parsed.success ? parsed.data : []);
          if (!results || results.error || !parsed.success) setQueryError('Não foi possível confirmar a consulta na nuvem. Confira os resultados locais ou tente novamente.');
        }
      } catch {
        if (isCurrent) { setSearchResults([]); setQueryError('Não foi possível consultar os produtos. Tente novamente.'); }
      } finally {
        if (isCurrent) setIsSearchingProducts(false);
      }
    }, 150);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [dataFillTab, productSearchTerm, searchRevision, validateSearch]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Dados da etiqueta de preço"
      aria-busy={pending}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}
      style={{ zIndex: 9999 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <fieldset disabled={pending} className="m-0 min-w-0 bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
        {(error || queryError) && <p role="alert" className="text-sm text-red-700">{error || queryError}</p>}
        {pending && <p role="status" className="flex items-center gap-2 text-sm text-blue-700"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />Validando e aplicando dados…</p>}
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
            onClick={close}
            aria-label="Fechar dados da etiqueta"
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
                aria-label="Buscar produto para etiqueta"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                placeholder="Digite o nome, código ou SKU do produto..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
              />
              {isSearchingProducts && (
                <div role="status" aria-label="Consultando produtos" className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              )}
            </div>
            {queryError && <button type="button" disabled={pending || isSearchingProducts} onClick={() => setSearchRevision((value) => value + 1)} className="text-sm font-bold text-emerald-700">Tentar consulta novamente</button>}

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
                (searchResults || []).map((prod) => {
                  const hasPromo = Number(prod.promo_price || 0) > 0;
                  const mainImage =
                    Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : null;

                  return (
                    <button
                      type="button"
                      key={prod.id}
                      onClick={() => { void apply(prod); }}
                      disabled={pending || blocked}
                      aria-label={`Aplicar nome de ${prod.name}`}
                      className="p-3 bg-slate-50 dark:bg-slate-950 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-2xl flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                          {mainImage ? (
                            <img
                              src={mainImage}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
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
                                R${' '}
                                {Number(prod.unit_price || 0).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block">
                                R${' '}
                                {Number(prod.promo_price || 0).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-black text-slate-800 dark:text-white block">
                              R${' '}
                              {Number(prod.unit_price || 0).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          )}
                        </div>

                        <span
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider group-hover:bg-emerald-700 shadow-sm transition"
                        >
                          Puxar
                        </span>
                      </div>
                    </button>
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
              <label className="text-[10px] font-black text-slate-500 uppercase">
                Nome / Título do Produto
              </label>
              <input
                type="text"
                aria-label="Título da etiqueta"
                value={title}
                onChange={(e) => setTitle(e.target.value.toUpperCase())}
                placeholder="Ex: COLCHÃO DE ESPUMA D28..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  Preço Normal (DE:)
                </label>
                <input
                  type="text"
                  aria-label="Preço normal da etiqueta"
                  value={normalPrice}
                  onChange={(e) => setNormalPrice(e.target.value)}
                  placeholder="Ex: 499,00"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  Preço Principal Reais (POR:)
                </label>
                <input
                  type="text"
                  aria-label="Preço principal da etiqueta"
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
                  aria-label="Centavos da etiqueta"
                  value={centsText}
                  onChange={(e) => setCentsText(e.target.value)}
                  placeholder="Ex: ,00"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  Símbolo da Moeda
                </label>
                <input
                  type="text"
                  aria-label="Símbolo da moeda da etiqueta"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="Ex: R$"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">
                Frase de Parcelamento
              </label>
              <input
                type="text"
                aria-label="Parcelamento da etiqueta"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                placeholder="Ex: Em até 10x sem juros no cartão"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => { void apply(); }}
              disabled={pending || blocked}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md mt-2 cursor-pointer"
            >
              Aplicar na Etiqueta
            </button>
          </div>
        )}
      </fieldset>
    </div>
  );
};

export const PriceLabelDataFillModal: React.FC<PriceLabelDataFillModalProps> = (props) => props.isOpen
  ? <PriceLabelDataFillDialog key={props.ownerKey || 'data-fill'} {...props} /> : null;

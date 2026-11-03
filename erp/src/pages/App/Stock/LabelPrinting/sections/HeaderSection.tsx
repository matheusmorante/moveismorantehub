import React, { useState, useRef, useEffect } from 'react';
import { HeaderSectionProps } from '../types/LabelPrintingSections.types';

export const HeaderSection: React.FC<HeaderSectionProps> = ({
  selectedCategory,
  config,
  setGridModalOpen,
  setIsModelManagerModalOpen,
  setIsPriceLabelArtEditorOpen,
  DEFAULT_LAYOUT_MODELS,
  customLayouts,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMenuOpen(false);
    }
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const activeModel =
    selectedCategory && selectedCategory !== 'posts'
      ? [...DEFAULT_LAYOUT_MODELS, ...(customLayouts || [])].find(
          (m) => m.id === config?.layoutId
        ) ||
        DEFAULT_LAYOUT_MODELS.find((m) => m.category === selectedCategory) ||
        DEFAULT_LAYOUT_MODELS[0]
      : null;

  return (
    <header className="relative mb-2 min-w-0 animate-slide-in">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm transition-all sm:mt-0 ${
              selectedCategory === 'identificacao'
                ? 'bg-slate-900 shadow-slate-900/20'
                : selectedCategory === 'precos'
                  ? 'bg-amber-500 shadow-amber-500/20'
                  : selectedCategory === 'logos'
                    ? 'bg-purple-600 shadow-purple-600/20'
                    : selectedCategory === 'posts'
                      ? 'bg-pink-600 shadow-pink-600/20'
                      : 'bg-blue-600 shadow-blue-500/20'
            }`}
          >
            <i
              className={`bi ${
                selectedCategory === 'identificacao'
                  ? 'bi-qr-code-scan'
                  : selectedCategory === 'precos'
                    ? 'bi-tag-fill'
                    : selectedCategory === 'logos'
                      ? 'bi-palette-fill'
                      : selectedCategory === 'posts'
                        ? 'bi-instagram'
                        : 'bi-printer-fill'
              } text-white text-sm`}
            />
          </div>
          <div className="flex min-w-0 flex-col justify-center">
            <h1 className="mb-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 break-words text-xs font-black uppercase leading-tight tracking-tight text-slate-800 dark:text-white sm:text-sm">
              {selectedCategory === 'identificacao'
                ? 'Etiquetas de Identificação'
                : selectedCategory === 'precos'
                  ? 'Etiquetas de Preço'
                  : selectedCategory === 'logos'
                    ? 'Etiquetas de Logotipo e Rótulo'
                    : selectedCategory === 'posts'
                      ? 'Posts para Redes Sociais'
                      : 'Gerador de Etiquetas'}
            </h1>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[8px] font-bold uppercase leading-relaxed tracking-wide text-slate-400 sm:text-[9px] sm:tracking-widest">
              {activeModel ? (
                <>
                  <span>Modelo: {activeModel.name || 'Personalizado'}</span>
                  <span>•</span>
                  <span>Folha {activeModel.paperSize || 'A4'}</span>
                </>
              ) : (
                <span>{selectedCategory === 'posts' ? 'Marketing Digital' : 'Morante Móveis'}</span>
              )}
            </div>
          </div>
        </div>

        {/* 3 PONTINHOS NO LADO DIREITO COM OPÇÕES */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex h-10 w-10 items-center justify-center text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <i className="bi bi-three-dots-vertical text-base" />
            </button>

            {isMenuOpen && (
              <>
                {/* Backdrop for mobile bottom sheet */}
                <div
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 sm:hidden animate-fade-in"
                  onClick={() => setIsMenuOpen(false)}
                />

                <div className="fixed inset-x-0 bottom-0 sm:absolute sm:top-12 sm:right-0 sm:bottom-auto sm:inset-x-auto z-50 bg-white dark:bg-slate-900 sm:rounded-2xl rounded-t-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:min-w-[320px] sm:max-w-[320px] animate-slide-up sm:animate-fade-in flex flex-col">
                  {/* Handle mobile */}
                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
                    Configuração de Impressão
                  </div>

                  {/* Modelo em Uso */}
                  {selectedCategory &&
                    selectedCategory !== 'posts' &&
                    (() => {
                      const activeModel =
                        [...DEFAULT_LAYOUT_MODELS, ...customLayouts].find(
                          (m) => m.id === config.layoutId
                        ) ||
                        DEFAULT_LAYOUT_MODELS.find((m) => m.category === selectedCategory) ||
                        DEFAULT_LAYOUT_MODELS[0];

                      return (
                        <div className="mb-2 mt-2">
                          <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                            Modelo de Impressão
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsModelManagerModalOpen(true);
                              setIsMenuOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors text-left group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                <i className={`bi ${activeModel?.icon || 'bi-grid-1x2'} text-lg`} />
                              </div>
                              <div className="flex flex-col">
                                <strong className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                  {activeModel?.name || '10 etiquetas (2x5)'}
                                </strong>
                                <span className="text-xs text-slate-500">
                                  Folha {activeModel?.paperSize || 'A4'}
                                </span>
                              </div>
                            </div>
                            <i className="bi bi-chevron-right text-slate-300 dark:text-slate-600 text-sm group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors"></i>
                          </button>
                        </div>
                      );
                    })()}

                  {/* Ações extras */}
                  {(selectedCategory === 'precos' ||
                    selectedCategory === 'identificacao' ||
                    selectedCategory === 'logos') && (
                    <>
                      <hr className="border-slate-100 dark:border-slate-800 my-3" />
                      <div className="flex flex-col">
                        {selectedCategory === 'precos' && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMenuOpen(false);
                              if (window.location.pathname === '/mobile/etiquetas') {
                                setIsPriceLabelArtEditorOpen?.(true);
                              } else {
                                window.open('/templates/price-label', '_blank');
                              }
                            }}
                            className="w-full flex items-center gap-3 py-2 px-1 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-semibold group"
                          >
                            <i className="bi bi-palette text-lg text-slate-400 group-hover:text-blue-500" />
                            <span>Template de preço</span>
                            <i className="bi bi-chevron-right text-slate-300 dark:text-slate-600 text-[10px] ml-auto"></i>
                          </button>
                        )}

                        {(selectedCategory === 'identificacao' || selectedCategory === 'logos') && (
                          <button
                            type="button"
                            onClick={() => {
                              setGridModalOpen(true);
                              setIsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 py-2 px-1 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-semibold group"
                          >
                            <i className="bi bi-palette text-lg text-slate-400 group-hover:text-blue-500" />
                            <span>Alterar arte do modelo</span>
                            <i className="bi bi-chevron-right text-slate-300 dark:text-slate-600 text-[10px] ml-auto"></i>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

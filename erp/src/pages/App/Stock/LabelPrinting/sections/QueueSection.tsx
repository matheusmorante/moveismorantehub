import React from 'react';
import { QueueSectionProps } from '../types/LabelPrintingSections.types';
import ProductSearchInput from '../components/ProductSearchInput';
import LabelQueue from '../components/LabelQueue';

export const QueueSection: React.FC<QueueSectionProps> = (props) => {
    const { 
        selectedCategory, printingMode, products, selectedProductToAdd, 
        setSelectedProductToAdd, productAddQty, setProductAddQty, 
        handleProductSelect, labelItems, setLabelItems, logoItems, 
        setLogoItems, isDownloading, handleAddBlankLabel, cellInputRef, handleLogoUpload, setIsAssetManagerModalOpen
    } = props;

    const activeItems = selectedCategory === 'logos' ? logoItems : labelItems;
    const totalLabels = activeItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
    const totalProducts = activeItems.length;

    return (
        <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col transition-all lg:basis-[45%] xl:basis-[42%] shrink-0">
            <div className="flex flex-col gap-5 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                {/* TOPO: TÍTULO E BOTÕES GERAIS */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                            {selectedCategory === 'logos' ? 'Gerenciar Etiquetas' : 'Etiquetas a Imprimir'}
                        </h3>
                        {selectedCategory === 'logos' ? (
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Organize e configure seus ativos para impressão</p>
                        ) : (
                            <p className="text-[10px] font-bold text-slate-500">{totalLabels} etiquetas • {totalProducts} itens</p>
                        )}
                    </div>

                    {selectedCategory === 'precos' && printingMode === 'advanced' && (
                        <div className="flex-1 min-w-[240px] max-w-xl flex items-center gap-2">
                            <ProductSearchInput
                                products={products}
                                selectedProduct={null}
                                onSelectProduct={(p) => { if (p) handleProductSelect(p, 1); }}
                                placeholder="Buscar produto, variação ou SKU para adicionar..."
                            />
                            {handleAddBlankLabel && (
                                <button
                                    type="button"
                                    onClick={() => handleAddBlankLabel(1)}
                                    className="shrink-0 p-2.5 px-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border border-slate-100 dark:border-slate-700 shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                                    title="Adicionar etiqueta em branco"
                                >
                                    <i className="bi bi-plus-lg" /> Em branco
                                </button>
                            )}
                        </div>
                    )}
                    
                    <div className="flex items-center gap-2 shrink-0">
                        {printingMode === 'simple' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => cellInputRef?.current?.click()}
                                    className="p-2.5 px-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2 border border-blue-100 dark:border-blue-900/40 shadow-sm cursor-pointer"
                                >
                                    {selectedCategory === 'precos' ? 'Adicionar' : <><i className="bi bi-cloud-arrow-up-fill" /> Imagem</>}
                                </button>
                                <input
                                    type="file"
                                    ref={cellInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                />
                            </>
                        )}
                        {selectedCategory === 'logos' && (
                            <button 
                                onClick={() => setIsAssetManagerModalOpen?.(true)}
                                className="p-2.5 px-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2 border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer"
                            >
                                <i className="bi bi-grid-fill" /> Biblioteca
                            </button>
                        )}
                        
                        {selectedCategory === 'identificacao' && handleAddBlankLabel && (
                            <button 
                                type="button"
                                onClick={() => handleAddBlankLabel(1)}
                                className="p-2.5 px-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border border-slate-100 dark:border-slate-700 shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="Adicionar etiqueta em branco"
                            >
                                <i className="bi bi-plus-lg" /> Em branco
                            </button>
                        )}

                        {selectedCategory !== 'precos' && activeItems.length > 0 && (
                            <button 
                                onClick={() => {
                                    if (window.confirm('Deseja limpar todos os itens da fila?')) {
                                        if (selectedCategory === 'logos') setLogoItems([]);
                                        else setLabelItems([]);
                                    }
                                }}
                                className="p-2.5 px-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 transition-all font-black text-[9px] uppercase tracking-widest border border-red-100 dark:border-red-900/30 cursor-pointer"
                                title="Limpar Fila"
                            >
                                <i className="bi bi-trash3-fill" />
                            </button>
                        )}
                    </div>
                </div>

                {/* BUSCA DE PRODUTOS AUTOMÁTICA */}
                {selectedCategory === 'identificacao' && (
                    <div className="w-full">
                        <ProductSearchInput 
                            products={products}
                            selectedProduct={null}
                            onSelectProduct={(p) => { if (p) handleProductSelect(p, 1); }}
                            placeholder="Buscar produto, variação ou SKU para adicionar..."
                        />
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-6">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[300px]">
                    <div className="space-y-4">
                        {selectedCategory === 'logos' ? (
                            <LabelQueue 
                                labelItems={logoItems} 
                                setLabelItems={setLogoItems} 
                                printingMode="simple" 
                                selectedCategory={selectedCategory}
                            />
                        ) : (
                            <LabelQueue 
                                labelItems={labelItems} 
                                setLabelItems={setLabelItems} 
                                printingMode={printingMode} 
                                selectedCategory={selectedCategory}
                            />
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

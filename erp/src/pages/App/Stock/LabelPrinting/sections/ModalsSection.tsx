
import { supabase } from '@/pages/utils/supabaseConfig';
import { GridModel } from '../modals/LabelGridModelModal';
import { DEFAULT_LAYOUT_MODELS } from '../utils/LabelConstants';
import { mapModelToDb, mapDbToModel, calculateLabelDimensions } from '../utils/LabelUtils';
import { toast } from 'react-toastify';
import React from 'react';
import { ModalsSectionProps } from '../types/LabelPrintingSections.types';
import LabelGridModelModal from '../modals/LabelGridModelModal';
import LabelImageModal from '../modals/LabelImageModal';
import PriceLabelArtEditorModal from '../modals/PriceLabelArtEditorModal';
import LabelModelCreationModal from '../modals/LabelModelCreationModal';

export const ModalsSection: React.FC<ModalsSectionProps> = (props) => {
    const { 
        gridModalOpen, setGridModalOpen, layoutModels, customLayouts, config, 
        setConfig, applyPresetWithConfig, isModelManagerModalOpen, 
        setIsModelManagerModalOpen, setCustomLabels, currentModel, 
        isImageModalOpen, setIsImageModalOpen, editingLabel, setEditingLabel, 
        labelFormName, setLabelFormName, labelFormImage, setLabelFormImage, 
        handleSaveCustomLabel, isPriceLabelArtEditorOpen, 
        setIsPriceLabelArtEditorOpen, setSavedArtConfigs, savedArtConfigs, 
        artVersion, setArtVersion, isAssetManagerModalOpen, 
        setIsAssetManagerModalOpen, selectedCategory, logoItems, setLogoItems, 
        isNewLogoModalOpen, setIsNewLogoModalOpen, newLogoName, setNewLogoName, 
        newLogoImage, setNewLogoImage, handleSaveNewLogo 
    ,
  editingGridModel, setEditingGridModel, selectedImage, setCustomLayouts, selectLayout, isCopyModalOpen, setIsCopyModalOpen, modelToCopy, handleCopyToCategory, modelToDelete, setModelToDelete, confirmDeleteLayout, logoInputRef,
  handleLogoUpload, handleConfirmNewLogo, availableLogos, handleAddLogoToQueue, handleDeleteAvailableLogo, isLabelModalOpen, setIsLabelModalOpen, handleDeleteLayout, setSelectedImage, publishPriceLabelTemplateUpdate, selectedProductToAdd
} = props;

    return (
        <>
                                    alt="Preview" 
                                    className="w-full h-full object-contain transition-transform group-hover:scale-110" 
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-2">Nome do Ativo</label>
                                <input 
                                    type="text"
                                    value={newLogoName}
                                    onChange={e => setNewLogoName(e.target.value.toUpperCase())}
                                    placeholder="EX: LOGO MORANTE PRINCIPAL"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={() => setIsNewLogoModalOpen(false)}
                                    className="flex-1 px-6 py-4 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleConfirmNewLogo}
                                    className="flex-[1.5] px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all text-center"
                                >
                                    Salvar na Biblioteca
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Gerenciamento do Banco de Ativos (Biblioteca) */}
            {isAssetManagerModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
                        onClick={() => setIsAssetManagerModalOpen(false)}
                    />
                    <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 lg:p-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/20">
                                    <i className="bi bi-images text-2xl" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Biblioteca de Logotipos / Rótulos</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Gerencie seus ativos visuais para etiquetas</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAssetManagerModalOpen(false)} className="w-12 h-12 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
                                <i className="bi bi-x-lg text-lg" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ativos Disponíveis ({availableLogos.length})</h4>
                                    <button 
                                        onClick={() => logoInputRef.current?.click()}
                                        className="px-5 py-3 bg-indigo-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                    >
                                        <i className="bi bi-cloud-arrow-up-fill" />Subir Novo Logotipo/Rótulo
                                    </button>
                                </div>
                                
                                {availableLogos.length === 0 ? (
                                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-950/20 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                                        <i className="bi bi-image text-4xl text-slate-200 mb-4 block" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Sua biblioteca está vazia</p>
                                        <button onClick={() => logoInputRef.current?.click()} className="mt-4 text-[9px] font-black uppercase text-indigo-600 hover:underline">Carregar meu primeiro ativo</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                        {availableLogos.map(logo => (
                                            <div key={logo.id} className="group relative bg-white dark:bg-slate-800 rounded-[2rem] p-4 border border-slate-100 dark:border-slate-700 hover:border-indigo-500 hover:shadow-xl transition-all">
                                                <div className="aspect-square rounded-[1.5rem] overflow-hidden bg-slate-50 dark:bg-slate-900 mb-3 relative">
                                                    <img src={logo.image} alt="" className="w-full h-full object-contain p-2" />
                                                    <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleAddLogoToQueue(logo); }}
                                                            className="px-4 py-2 rounded-xl bg-white text-indigo-600 text-[9px] font-black uppercase hover:scale-110 active:scale-95 transition-all shadow-lg"
                                                        >
                                                            Selecionar
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteAvailableLogo(logo.id); }}
                                                            className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
                                                            title="Deletar permanentemente"
                                                        >
                                                            <i className="bi bi-trash3-fill" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="px-1 truncate">
                                                    <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">{logo.name || 'SEM NOME'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 text-center">
                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Os ativos selecionados serão adicionados à fila de impressão principal</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de CRUD de Rótulo Customizado */}
            {isLabelModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
                        onClick={() => setIsLabelModalOpen(false)}
                    />
                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 lg:p-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <i className="bi bi-bookmark-plus-fill text-xl" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">
                                        {editingLabel ? 'Editar Rótulo' : 'Criar Novo Rótulo'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Vincule uma imagem ao seu banco de rótulos prontos</p>
                                </div>
                            </div>
                            <button onClick={() => setIsLabelModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400">
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-2">Nome do Rótulo</label>
                                        <input 
                                            type="text"
                                            value={labelFormName}
                                            onChange={e => setLabelFormName(e.target.value)}
                                            placeholder="EX: RÓTULO VINHO TINTO 750ML"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-outfit"
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-2">Visualização Atual</label>
                                        <div className="aspect-square w-full rounded-[2.5rem] bg-slate-50 dark:bg-slate-950/40 border-2 border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-center p-6 group">
                                            {labelFormImage ? (
                                                <img src={labelFormImage} alt="" className="max-w-full max-h-full object-contain transition-transform group-hover:scale-110" />
                                            ) : (
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Confirmar Exclusão</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                Tem certeza que deseja remover este modelo de etiqueta? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => setModelToDelete(null)}
                                    className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={confirmDeleteLayout}
                                    className="flex-1 py-2 px-4 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Sim, Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal de Criação de Logotipo Oportunista */}
            {isNewLogoModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up border border-slate-200 dark:border-slate-800">
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-white">Criar Nova Arte/Logo</h3>
                            <button onClick={() => setIsNewLogoModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Nome de Identificação</label>
                                <input 
                                    type="text" 
                                    value={newLogoName} 
                                    onChange={e => setNewLogoName(e.target.value)} 
                                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                    placeholder="Ex: Cartão de Visita, Selo Promocional..."
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">Imagem da Arte (Fundo Transparente Recomendado)</label>
                                {newLogoImage ? (
                                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                                        <img src={newLogoImage} alt="Preview" className="max-w-full max-h-full object-contain p-2" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button 
                                                onClick={() => setNewLogoImage(null)}
                                                className="px-4 py-2 bg-red-500 text-white font-bold text-xs rounded-lg shadow-lg hover:bg-red-600"
                                            >
                                                Remover
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => logoInputRef.current?.click()}
                                        className="h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                            <i className="bi bi-cloud-arrow-up-fill text-xl"></i>
                                        </div>
                                        <span className="text-sm font-medium">Clique para fazer upload</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/50">
                            <button 
                                onClick={() => setIsNewLogoModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirmNewLogo}
                                disabled={!newLogoName.trim() || !newLogoImage}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20"
                            >
                                Salvar e Utilizar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Cópia entre Categorias */}
            {isCopyModalOpen && modelToCopy && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-scale-up">
                        <div className="p-5 flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400">
                                <i className="bi bi-files text-xl" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Copiar Modelo</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                Para qual categoria deseja copiar o modelo <br/><strong className="text-slate-700 dark:text-slate-200">{modelToCopy.name}</strong>?
                            </p>
                            <div className="flex flex-col gap-2 w-full mb-6">
                                {selectedCategory !== 'precos' && (
                                    <button 
                                        onClick={() => handleCopyToCategory('precos')}
                                        className="w-full py-2.5 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-900/20 dark:hover:border-purple-800 transition-all flex items-center justify-center gap-2"
                                    >
                                        <i className="bi bi-tag-fill text-purple-500" /> Etiquetas de Preço
                                    </button>
                                )}
                                {selectedCategory !== 'identificacao' && (
                                    <button 
                                        onClick={() => handleCopyToCategory('identificacao')}
                                        className="w-full py-2.5 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-900/20 dark:hover:border-purple-800 transition-all flex items-center justify-center gap-2"
                                    >
                                        <i className="bi bi-box-seam-fill text-purple-500" /> Etiquetas de Identificação
                                    </button>
                                )}
                                {selectedCategory !== 'logos' && (
                                    <button 
                                        onClick={() => handleCopyToCategory('logos')}
                                        className="w-full py-2.5 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-900/20 dark:hover:border-purple-800 transition-all flex items-center justify-center gap-2"
                                    >
                                        <i className="bi bi-images text-purple-500" /> Logotipos e Artes
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => { setIsCopyModalOpen(false); }}
                                    className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {isModelManagerModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-950 w-full h-full md:w-[95vw] md:h-[92vh] rounded-none md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border-0 md:border border-white/20 dark:border-slate-800/50">
                        {/* Header do Modal */}
                        <div className="px-6 py-5 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <i className="bi bi-grid-3x3-gap-fill text-xl" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base md:text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                            Gerenciar Modelos de Etiqueta
                                        </h2>
                                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-black uppercase rounded-full">
                                            {selectedCategory === 'precos' ? 'Etiquetas de Preço' : selectedCategory === 'identificacao' ? 'Etiquetas de Identificação' : 'Logotipos e Artes'}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400">
                                        Escolha um modelo de grade, crie novos formatos customizados ou edite as especificações da folha
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingGridModel(null);
                                        setGridModalOpen(true);
                                    }}
                                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                                >
                                    <i className="bi bi-plus-lg text-sm" />
                                    <span>Novo Modelo</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsModelManagerModalOpen(false)}
                                    className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                    <i className="bi bi-x-lg text-base" />
                                </button>
                            </div>
                        </div>

                        {/* Conteúdo / Lista de Modelos em Grid */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {layoutModels.map(model => {
                                    const dims = calculateLabelDimensions(model);
                                    const isActive = config.layoutId === model.id;
                                    const isCustom = customLayouts.some(c => c.id === model.id);
                                    
                                    return (
                                        <div 
                                            key={model.id}
                                            className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between gap-4 bg-white dark:bg-slate-900 ${
                                                isActive 
                                                    ? 'border-blue-500 shadow-xl shadow-blue-500/10 ring-4 ring-blue-500/10 dark:ring-blue-500/20' 
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 hover:shadow-lg'
                                            }`}
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                            <i className={`bi ${model.icon || 'bi-grid-1x2-fill'} text-lg`} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-tight">
                                                                {model.name}
                                                            </h4>
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                {model.paperSize} &bull; {dims.width} x {dims.height} mm
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {isActive && (
                                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[9px] font-black uppercase rounded-lg flex items-center gap-1">
                                                            <i className="bi bi-check-circle-fill text-[10px]" /> Ativo
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                                    <div className="flex justify-between">
                                                        <span>Capacidade:</span>
                                                        <strong className="text-slate-700 dark:text-slate-200">{model.columns * model.rows} etiquetas/folha</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Grade:</span>
                                                        <strong className="text-slate-700 dark:text-slate-200">{model.columns} colunas x {model.rows} linhas</strong>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Margens T/B/L/R:</span>
                                                        <span className="text-slate-600 dark:text-slate-300">{model.marginT}/{model.marginB}/{model.marginL}/{model.marginR} mm</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        selectLayout(model);
                                                        setIsModelManagerModalOpen(false);
                                                        toast.success(`Modelo "${model.name}" selecionado!`);
                                                    }}
                                                    className={`flex-1 py-2.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                                        isActive 
                                                            ? 'bg-emerald-600 text-white shadow-md' 
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95'
                                                    }`}
                                                >
                                                    <i className={`bi ${isActive ? 'bi-check-lg' : 'bi-check2-circle'}`} />
                                                    {isActive ? 'Selecionado' : 'Usar Modelo'}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingGridModel(model);
                                                        setGridModalOpen(true);
                                                    }}
                                                    className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-2xl transition-colors cursor-pointer"
                                                    title="Editar Especificações"
                                                >
                                                    <i className="bi bi-pencil-fill text-xs" />
                                                </button>

                                                {isCustom && (
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            if (window.confirm(`Excluir modelo "${model.name}"?`)) {
                                                                await handleDeleteLayout(model.id);
                                                            }
                                                        }}
                                                        className="p-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 rounded-2xl transition-colors cursor-pointer"
                                                        title="Excluir Modelo"
                                                    >
                                                        <i className="bi bi-trash3-fill text-xs" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

             <LabelImageModal 
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                currentCategory={selectedCategory}
                onSelect={(image) => {
                    if (selectedCategory === 'logos') {
                        setLogoItems((prev: any) => [...prev, { image, quantity: 1, imageFit: config.imageFit || 'contain', name: 'DA BIBLIOTECA' }]);
                    } else {
                        setSelectedImage(image);
                    }
                    setIsImageModalOpen(false);
                    toast.success('Imagem selecionada da biblioteca!');
                }}
             />

             <PriceLabelArtEditorModal 
                isOpen={isPriceLabelArtEditorOpen}
                onClose={() => {
                    setIsPriceLabelArtEditorOpen(false);
                    setArtVersion((prev: any) => prev + 1);
                    if (location.pathname === '/templates/price-label' && window.opener) window.close();
                }}
                config={{
                    ...config,
                    artConfig: savedArtConfigs[String(config.layoutId || 'preco_2x5_restored')] || savedArtConfigs['preco_2x5_restored'] || config.artConfig
                }}
                onArtConfigLoaded={(loadedArtConfig: any) => {
                    const layoutId = String(config.layoutId || 'preco_2x5_restored');
                    setSavedArtConfigs((prev: any) => ({
                        ...prev,
                        [layoutId]: loadedArtConfig,
                        'preco_2x5_restored': loadedArtConfig,
                    }));
                    setConfig((prev: any) => ({ ...prev, artConfig: loadedArtConfig }));
                    setArtVersion((prev: any) => prev + 1);
                }}
                onSaveConfig={async (updated: any) => {
                    const layoutId = String(config.layoutId || 'preco_2x5_restored');
                    const groupPos = updated.dePricePorGroupPos;
                    if (layoutId && updated.artConfig) {
                        const { error } = await supabase.from('label_art_configs').upsert({
                            layout_id: layoutId,
                            category: selectedCategory || 'precos',
                            art_config: updated.artConfig,
                            updated_at: new Date().toISOString(),
                        }, { onConflict: 'layout_id' });
                        if (error) throw error;
                    }
                    if (layoutId && (groupPos || updated.artConfig) && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(layoutId))) {
                        const { error } = await supabase
                            .from('label_layouts')
                            .update({
                                ...(groupPos ? {
                                    de_price_por_group_pos_x: groupPos.x,
                                    de_price_por_group_pos_y: groupPos.y,
                                    de_price_por_group_rotation: updated.dePricePorGroupRotation ?? 0,
                                    de_price_por_group_gap: updated.dePricePorGroupGap ?? 10,
                                } : {}),
                                ...(updated.artConfig ? { art_config: updated.artConfig } : {}),
                            })
                            .eq('id', layoutId);
                        if (error) throw error;
                    }

                    if (updated.artConfig) {
                        setSavedArtConfigs((prev: any) => ({
                            ...prev,
                            [layoutId]: updated.artConfig,
                            'preco_2x5_restored': updated.artConfig,
                        }));
                        publishPriceLabelTemplateUpdate({
                            layoutId,
                            artConfig: updated.artConfig,
                        });
                    }
                    setConfig((prev: any) => ({
                        ...prev,
                        ...updated,
                        artConfig: updated.artConfig || prev.artConfig,
                    }));
                    setArtVersion((prev: any) => prev + 1);
                }}
                initialProduct={selectedProductToAdd ? {
                    name: selectedProductToAdd.description,
                    price: String(selectedProductToAdd.unitPrice || (selectedProductToAdd as any).price || ''),
                    promoPrice: (selectedProductToAdd as any).promoPrice || '',
                    sku: selectedProductToAdd.sku || selectedProductToAdd.code || ''
                } : undefined}
             />

        </>
    );
};

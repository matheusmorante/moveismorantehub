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
        newLogoImage, setNewLogoImage, handleSaveNewLogo,
        editingGridModel, setEditingGridModel, selectedImage, setCustomLayouts, 
        selectLayout, isCopyModalOpen, setIsCopyModalOpen, modelToCopy, 
        handleCopyToCategory, modelToDelete, setModelToDelete, confirmDeleteLayout, 
        logoInputRef, handleLogoUpload, handleConfirmNewLogo, availableLogos, 
        handleAddLogoToQueue, handleDeleteAvailableLogo, isLabelModalOpen, 
        setIsLabelModalOpen, handleDeleteLayout, setSelectedImage, 
        publishPriceLabelTemplateUpdate, selectedProductToAdd
    } = props;

    return (
        <>
            <LabelGridModelModal 
                isOpen={gridModalOpen} 
                onClose={() => { setGridModalOpen(false); setEditingGridModel(null); }} 
                editingModel={editingGridModel}
                currentCategory={selectedCategory}
                existingModels={[...DEFAULT_LAYOUT_MODELS, ...customLayouts]}
                previewImage={selectedImage}
                onSave={async (newModel) => {
                    // 1. Determinar quem ├® o alvo da atualiza├º├úo (targetId)
                    const isSystemDefault = editingGridModel ? DEFAULT_LAYOUT_MODELS.some(m => m.id === editingGridModel.id) : false;
                    const existingOverride = isSystemDefault 
                        ? customLayouts.find(c => c.baseModelId === editingGridModel!.id)
                        : null;

                    const targetId = existingOverride?.id || (isSystemDefault ? null : editingGridModel?.id);
                    const isUpdateAction = !!targetId;

                    // 2. Verificar se j├í existe um modelo ID├èNTICO (mesmas dimens├Áes) que n├úo seja este mesmo que estou editando
                    const isIdentical = (m1: GridModel, m2: GridModel) => {
                        const fieldsToCompare: (keyof GridModel)[] = [
                            'columns', 'rows', 'marginT', 'marginB', 'marginL', 'marginR', 
                            'gapH', 'gapV', 'paperSize', 'type', 'category'
                        ];
                        return fieldsToCompare.every(field => m1[field] === m2[field]);
                    };

                    const identicalLayout = customLayouts.find(m => 
                        m.id !== targetId && // N├úo ser o override atual
                        m.id !== (editingGridModel?.id || '') && // N├úo ser o padr├úo original
                        isIdentical(m, newModel)
                    );

                    if (identicalLayout) {
                        toast.info(`Este modelo de etiqueta j├í existe (como "${identicalLayout.name}").`);
                        setGridModalOpen(false);
                        setEditingGridModel(null);
                        return;
                    }

                    // 3. Preparar e Salvar
                    const isDbWriteable = isUpdateAction && !String(targetId).startsWith('custom_');
                    const modelToSave = { 
                        ...newModel, 
                        category: selectedCategory as any,
                        baseModelId: (isSystemDefault ? editingGridModel!.id : (editingGridModel?.baseModelId || undefined)) as string | undefined
                    };
                    const dbModel = mapModelToDb(modelToSave);

                    let finalModel: GridModel | null = null;
                    let savedToDb = false;
                    let resultError: any = null;

                    try {
                        if (isDbWriteable) {
                            const { data, error } = await supabase.from('label_layouts').update(dbModel).eq('id', targetId).select().single();
                            if (data && !error) { finalModel = mapDbToModel(data); savedToDb = true; } else { resultError = error; }
                        } else if (!isUpdateAction) {
                            const { data, error } = await supabase.from('label_layouts').insert([dbModel]).select().single();
                            if (data && !error) { finalModel = mapDbToModel(data); savedToDb = true; } else { resultError = error; }
                        }
                    } catch (e) {
                        console.error('Erro no Supabase:', e);
                        resultError = e;
                    }

                    // 4. Conting├¬ncia Local
                    if (!finalModel) {
                        const localId = targetId || `custom_${Date.now()}`;
                        finalModel = { ...modelToSave, id: localId as any } as GridModel;
                    }

                    // 5. Atualizar Estado (Substitui├º├úo por Origem e ID)
                    setCustomLayouts((prev: any) => {
                        const targetBaseId = finalModel!.baseModelId;
                        const targetId = finalModel!.id;

                        const filtered = prev.filter((m: any) => {
                            const isOldId = String(m.id) === String(targetId);
                            const isOldOverride = targetBaseId && m.baseModelId === targetBaseId;
                            
                            // Se for o mesmo ID ou for um override da mesma etiqueta base, removemos o antigo
                            return !isOldId && !isOldOverride;
                        });

                        const newList = [...filtered, finalModel!];
                        localStorage.setItem('custom_label_layouts', JSON.stringify(newList));
                        return newList;
                    });
                        
                    if (finalModel && (editingGridModel?.id === config.layoutId || config.layoutId === finalModel.id)) {
                        selectLayout(finalModel);
                    }

                    // Notificar usu├írio
                    if (savedToDb) {
                        toast.success('Modelo atualizado no banco!');
                    } else {
                        const quota = resultError?.message?.includes('quota') || resultError?.status === 402;
                        toast.warning(
                            <div className="flex flex-col gap-1">
                                <p className="font-bold text-[10px] uppercase tracking-widest text-slate-800">Salvo Localmente</p>
                                <p className="text-[9px] opacity-70">
                                    {quota ? 'Limite de dados (Quota) atingido. ' : 'Falha na rede. '}
                                    As altera├º├Áes foram salvas neste computador.
                                </p>
                            </div>, { autoClose: 9000 }
                        );
                    }
                    setGridModalOpen(false);
                    setEditingGridModel(null);
                }}
            />

            {/* Modal de C├│pia de Layout para outra Categoria */}
            {isCopyModalOpen && modelToCopy && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-all duration-300" onClick={() => setIsCopyModalOpen(false)} />
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in fade-in duration-300">
                        <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 mx-auto mb-4">
                                <i className="bi bi-files-alternate text-2xl" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none mb-2">Enviar C├│pia</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Selecione a categoria de destino</p>
                        </div>
                        
                        <div className="p-10 space-y-3">
                            {(['identificacao', 'precos', 'logos', 'posts'] as const)
                                .filter(c => c !== selectedCategory)
                                .filter(c => {
                                    // Etiquetas redondas s├│ s├úo compat├¡veis com a categoria 'logos'
                                    if (modelToCopy.type === 'round') {
                                        return c === 'logos';
                                    }
                                    return true;
                                })
                                .map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => {
                                        handleCopyToCategory(modelToCopy!, cat);
                                        setIsCopyModalOpen(false);
                                    }}
                                    className="w-full p-6 bg-slate-50 dark:bg-slate-800 hover:bg-blue-600 text-slate-600 dark:text-slate-300 hover:text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between group active:scale-95 shadow-sm hover:shadow-xl hover:shadow-blue-500/20"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-xl bg-white/50 dark:bg-slate-700/50 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                                            <i className={`bi bi-${cat === 'identificacao' ? 'qr-code-scan' : cat === 'precos' ? 'tag-fill' : cat === 'logos' ? 'palette-fill' : 'instagram'}`} />
                                        </div>
                                        <span>
                                            {cat === 'identificacao' ? 'Identifica├º├úo / ID' : 
                                             cat === 'precos' ? 'Pre├ºos de Venda' : 
                                             cat === 'logos' ? 'Logos e R├│tulos' : 'Marketing / Posts'}
                                        </span>
                                    </div>
                                    <i className="bi bi-chevron-right text-xs group-hover:translate-x-1 transition-transform" />
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={() => setIsCopyModalOpen(false)}
                            className="bg-slate-100 dark:bg-slate-800 p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
            {/* Modal de Confirma├º├úo de Exclus├úo */}
            {modelToDelete && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setModelToDelete(null)} />
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
                        <div className="px-10 py-10 text-center">
                            <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 mx-auto mb-6">
                                <i className="bi bi-trash3-fill text-3xl" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-tight mb-3">Excluir Modelo?</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold leading-relaxed px-4">
                                {DEFAULT_LAYOUT_MODELS.some(m => m.id === modelToDelete) 
                                    ? 'Este modelo ├® padr├úo. Deseja apenas ocult├í-lo da sua lista?' 
                                    : 'Esta a├º├úo n├úo pode ser desfeita. O layout ser├í removido permanentemente.'}
                            </p>
                        </div>
                        
                        <div className="flex border-t border-slate-50 dark:border-slate-800">
                            <button 
                                onClick={() => setModelToDelete(null)}
                                className="flex-1 p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmDeleteLayout}
                                className="flex-1 p-6 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border-l border-slate-50 dark:border-slate-800"
                            >
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
             {/* Input Global oculto para upload de imagens de marca e r├│tulos */}
            <input 
                type="file" 
                ref={logoInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleLogoUpload} 
            />

            {/* Modal de Novo Asset (Upload de Imagem) - Z-INDEX 400 para ficar sobre a biblioteca */}
            {isNewLogoModalOpen && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-fade-in"
                        onClick={() => setIsNewLogoModalOpen(false)}
                    />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                                <i className="bi bi-image text-xl" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Confirmar Novo Ativo</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">D├¬ um nome para este logotipo / r├│tulo</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="aspect-square w-full rounded-[2rem] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden p-4 group">
                                <img 
                                    src={newLogoImage || ""} 
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
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Biblioteca de Logotipos / R├│tulos</h3>
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
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ativos Dispon├¡veis ({availableLogos.length})</h4>
                                    <button 
                                        onClick={() => logoInputRef.current?.click()}
                                        className="px-5 py-3 bg-indigo-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                    >
                                        <i className="bi bi-cloud-arrow-up-fill" />Subir Novo Logotipo/R├│tulo
                                    </button>
                                </div>
                                
                                {availableLogos.length === 0 ? (
                                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-950/20 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                                        <i className="bi bi-image text-4xl text-slate-200 mb-4 block" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Sua biblioteca est├í vazia</p>
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
                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Os ativos selecionados ser├úo adicionados ├á fila de impress├úo principal</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de CRUD de R├│tulo Customizado */}
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
                                        {editingLabel ? 'Editar R├│tulo' : 'Criar Novo R├│tulo'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Vincule uma imagem ao seu banco de r├│tulos prontos</p>
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
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-2">Nome do R├│tulo</label>
                                        <input 
                                            type="text"
                                            value={labelFormName}
                                            onChange={e => setLabelFormName(e.target.value)}
                                            placeholder="EX: R├ôTULO VINHO TINTO 750ML"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-outfit"
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-2">Visualiza├º├úo Atual</label>
                                        <div className="aspect-square w-full rounded-[2.5rem] bg-slate-50 dark:bg-slate-950/40 border-2 border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-center p-6 group">
                                            {labelFormImage ? (
                                                <img src={labelFormImage} alt="" className="max-w-full max-h-full object-contain transition-transform group-hover:scale-110" />
                                            ) : (
                                                <div className="text-center">
                                                    <i className="bi bi-image text-4xl text-slate-200 mb-2 block" />
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Nenhuma imagem selecionada</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block px-2">Selecione uma Imagem da Biblioteca</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {availableLogos.length === 0 ? (
                                            <div className="col-span-3 py-10 text-center bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed">Sua biblioteca de imagens est├í vazia.<br/>Suba imagens primeiro.</p>
                                            </div>
                                        ) : (
                                            availableLogos.map(logo => (
                                                <button 
                                                    key={logo.id}
                                                    onClick={() => {
                                                        setLabelFormImage(logo.image);
                                                        if (!labelFormName) setLabelFormName(logo.name);
                                                    }}
                                                    className={`aspect-square rounded-2xl border-2 p-2 relative overflow-hidden transition-all ${labelFormImage === logo.image ? 'border-blue-500 bg-blue-50' : 'border-slate-50 dark:border-slate-800 hover:border-slate-200'}`}
                                                >
                                                    <img src={logo.image} alt="" className="w-full h-full object-contain" />
                                                    {labelFormImage === logo.image && (
                                                        <div className="absolute top-1 right-1 bg-blue-500 text-white w-4 h-4 rounded-full flex items-center justify-center">
                                                            <i className="bi bi-check text-[10px]" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-8 shrink-0">
                            <button 
                                onClick={() => setIsLabelModalOpen(false)}
                                className="flex-1 px-8 py-5 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveCustomLabel}
                                className="flex-[1.5] px-8 py-5 bg-blue-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all text-center"
                            >
                                {editingLabel ? 'Salvar Altera├º├Áes' : 'Criar R├│tulo Definido'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isModelManagerModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in">
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
                                            Gerenciador de Modelos de Etiqueta
                                        </h2>
                                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-black uppercase rounded-full">
                                            {selectedCategory === 'precos' ? 'Etiquetas de Pre├ºo' : selectedCategory === 'identificacao' ? 'Etiquetas de Identifica├º├úo' : 'Logotipos e Artes'}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400">
                                        Escolha um modelo de grade, crie novos formatos customizados ou edite as especifica├º├Áes da folha
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

                        {/* Conte├║do / Lista de Modelos em Grid */}
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
                                                    title="Editar Especifica├º├Áes"
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
                        setLogoItems(prev => [...prev, { image, quantity: 1, imageFit: config.imageFit || 'contain', name: 'DA BIBLIOTECA' }]);
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
                    setArtVersion(prev => prev + 1);
                    if (location.pathname === '/templates/price-label' && window.opener) window.close();
                }}
                config={{
                    ...config,
                    artConfig: savedArtConfigs[String(config.layoutId || 'preco_2x5_restored')] || savedArtConfigs['preco_2x5_restored'] || config.artConfig
                }}
                onArtConfigLoaded={(loadedArtConfig: any) => {
                    const layoutId = String(config.layoutId || 'preco_2x5_restored');
                    setSavedArtConfigs(prev => ({
                        ...prev,
                        [layoutId]: loadedArtConfig,
                        'preco_2x5_restored': loadedArtConfig,
                    }));
                    setConfig(prev => ({ ...prev, artConfig: loadedArtConfig }));
                    setArtVersion(prev => prev + 1);
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
                        setSavedArtConfigs(prev => ({
                            ...prev,
                            [layoutId]: updated.artConfig,
                            'preco_2x5_restored': updated.artConfig,
                        }));
                        publishPriceLabelTemplateUpdate({
                            layoutId,
                            artConfig: updated.artConfig,
                        });
                    }
                    setConfig(prev => ({
                        ...prev,
                        ...updated,
                        artConfig: updated.artConfig || prev.artConfig,
                    }));
                    setArtVersion(prev => prev + 1);
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

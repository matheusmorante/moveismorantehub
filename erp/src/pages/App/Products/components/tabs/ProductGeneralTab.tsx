import React from 'react';
import { Product } from '@/pages/types/product.type';
import SmartInput from '@/components/SmartInput';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { calculateDIM, checkLTLRequirement } from '../../../../utils/calculations';
import CategoryAutocomplete from '../../../../../components/CategoryAutocomplete';
import { toast } from 'react-toastify';
import { generateProductCode } from '../../../../utils/formatters';
import { supabase } from '@/pages/utils/supabaseConfig';

interface ProductGeneralTabProps {
    onOpenCategorySearch: () => void;
    suppliers: any[];
    isService: boolean;
    productTypes: { id: string, name: string }[];
    onOpenProductTypeModal: () => void;
    generateAutoTitle: (currentData: Partial<Product>) => string;
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    availableCategories: any[];
    handleGenerateComboName: () => void;
    isGeneratingComboName: boolean;
}

const ProductGeneralTab: React.FC<ProductGeneralTabProps> = ({
    onOpenCategorySearch,
    suppliers,
    isService,
    productTypes,
    onOpenProductTypeModal,
    generateAutoTitle,
    formData,
    setFormData,
    availableCategories,
    handleGenerateComboName,
    isGeneratingComboName
}) => {

    const [availableMaterials, setAvailableMaterials] = React.useState<{id: string, name: string}[]>([]);

    const fetchMaterials = async () => {
        const { data } = await supabase.from('product_materials').select('*').order('name');
        if (data) setAvailableMaterials(data);
    };

    React.useEffect(() => {
        fetchMaterials();
        
        // Refresh materials when window regains focus (e.g. after adding one in settings tab)
        const onFocus = () => fetchMaterials();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

    // Sincronizar ambientes disponíveis ao carregar o produto ou mudar categorias externamente
    React.useEffect(() => {
        if (formData.categoryIds?.length && availableCategories.length) {
            const roots = new Set<string>();
            const visited = new Set<string>();
            const find = (catId: string) => {
                if (visited.has(catId)) return;
                visited.add(catId);
                const c = availableCategories.find(item => item.id === catId);
                if (!c) return;
                if (!c.parents || c.parents.length === 0) {
                    roots.add(c.name);
                } else {
                    c.parents.forEach((pid: string) => find(pid));
                }
            };
            formData.categoryIds.forEach(find);
            const allEnvs = Array.from(roots);
            
            setFormData(prev => {
                const next = { ...prev };
                let changed = false;
                
                // 1. Sincronizar ambientes disponíveis
                if (allEnvs.length > 0 && JSON.stringify(prev.availableEnvironments) !== JSON.stringify(allEnvs)) {
                    next.availableEnvironments = allEnvs;
                    changed = true;
                }
                
                // 2. Definir ambiente padrão se vazio
                if (!prev.environment && allEnvs.length > 0) {
                    next.environment = allEnvs[0];
                    changed = true;
                }
                
                // 3. Definir nome de tipo básico se vazio (para produtos legados)
                if (!prev.productTypeName && prev.categoryIds && prev.categoryIds.length > 0) {
                    const firstNonRoot = prev.categoryIds.find(id => {
                        const c = availableCategories.find(item => item.id === id);
                        return c && c.parents && c.parents.length > 0;
                    });
                    const targetId = firstNonRoot || prev.categoryIds[0];
                    const cat = availableCategories.find(c => c.id === targetId);
                    if (cat) {
                        next.productTypeName = cat.name.toUpperCase();
                        changed = true;
                    }
                }

                if (changed) {
                    next.description = generateAutoTitle(next);
                    return next;
                }
                return prev;
            });
        }
    }, [formData.categoryIds, availableCategories]);

    // [NOVO] Sincronizar campo CORES baseado nas variações
    React.useEffect(() => {
        if (formData.hasVariations && formData.variations?.length) {
            const colorsSet = new Set<string>();
            formData.variations.forEach(v => {
                v.attributes?.forEach(attr => {
                    const attrName = attr.name?.toUpperCase() || '';
                    if (attrName === 'COR' && attr.value) {
                        colorsSet.add(attr.value.toUpperCase());
                    }
                });
            });

            const detectedColors = Array.from(colorsSet).join(' / ');
            if (detectedColors && detectedColors !== formData.colors) {
                setFormData(prev => ({ ...prev, colors: detectedColors, noColors: false }));
            }
        }
    }, [formData.variations, formData.hasVariations]);

    const titleOrder = (formData.titleOrder || ["type", "environment", "line", "brand", "complement"]).filter((k: string) => k !== 'supplierRef' && k !== 'type');
    
    // Só mostrar o bloco 'complement' se ele tiver conteúdo ou se for explicitamente desmarcado pelo usuário (embora automático seja melhor)
    const draggableParts = titleOrder.filter(k => {
        if (k === 'complement' && !formData.titleComplement) return false;
        // Se for um campo extra, verificar se existe e tem valor
        if (k.startsWith('extra_')) {
            const field = formData.extraFields?.find(f => f.id === k);
            return !!field && !!field.value;
        }
        return true;
    }) as string[];

    const isPartIncluded = (key: string) => {
        if (key === 'line') return formData.includeLine !== false;
        if (key === 'brand') return formData.includeBrand !== false;
        if (key === 'complement') return formData.includeComplement !== false;
        if (key === 'type') return formData.includeType !== false;
        if (key === 'environment') return formData.includeEnvironment !== false;
        if (key.startsWith('extra_')) {
            const field = formData.extraFields?.find(f => f.id === key);
            return field?.includeInTitle !== false;
        }
        return true;
    };

    const handleToggleTitlePart = (key: string) => {
        setFormData((prev: Partial<Product>) => {
            const next = { ...prev };
            const isIncluded = isPartIncluded(key);
            
            if (key === "line") next.includeLine = !isIncluded;
            else if (key === "brand") next.includeBrand = !isIncluded;
            else if (key === "complement") next.includeComplement = !isIncluded;
            else if (key === "type") next.includeType = !isIncluded;
            else if (key === "environment") next.includeEnvironment = !isIncluded;
            else if (key === "supplierRef") next.includeSupplierRef = !isIncluded;
            else if (key.startsWith('extra_')) {
                next.extraFields = prev.extraFields?.map(f => f.id === key ? { ...f, includeInTitle: !isIncluded } : f);
            }
            
            next.description = generateAutoTitle(next);
            return next;
        });
    };

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        
        const newDraggableParts = Array.from(draggableParts);
        const [reorderedItem] = newDraggableParts.splice(result.source.index, 1);
        newDraggableParts.splice(result.destination.index, 0, reorderedItem);
        
        // RECONSTRUIR A ORDEM SEM PERDER OS BLOCOS OCULTOS
        // Pegamos a ordem base original e reordenamos apenas os que estão visíveis
        setFormData(prev => {
            const currentFullOrder = prev.titleOrder || ["type", "environment", "line", "brand", "complement"];
            
            // Filtra os que não estavam no draggableParts (visíveis)
            const visibleKeys = new Set(newDraggableParts);
            const hiddenKeys = currentFullOrder.filter(k => k !== 'type' && !visibleKeys.has(k));
            
            // Nova ordem: Type (sempre primeiro) + Novos Visíveis + Escondidos no final
            const newFullOrder = ["type", ...newDraggableParts, ...hiddenKeys];
            
            const next = { ...prev, titleOrder: newFullOrder as string[] };
            next.description = generateAutoTitle(next);
            return next;
        });
    };

    const getPartLabel = (key: string) => {
        if (key.startsWith('extra_')) {
            const field = formData.extraFields?.find(f => f.id === key);
            return field ? `${field.label}: ${field.value}` : key;
        }
        switch(key) {
            case 'type': return 'Tipo';
            case 'environment': return 'Ambiente';
            case 'line': return 'Linha';
            case 'brand': return 'Marca';
            case 'complement': return formData.titleComplement || 'Bloco Adicional';
            default: return key;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Title Section */}
            {!isService && (
                <div className="md:col-span-2 bg-slate-50/30 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">
                            Título do Produto (Montagem Automática) <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                            {formData.isCombo && (
                                <button
                                    type="button"
                                    onClick={handleGenerateComboName}
                                    disabled={isGeneratingComboName}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter bg-purple-100 text-purple-600 hover:bg-purple-200 transition-all shadow-sm"
                                >
                                    {isGeneratingComboName ? (
                                        <span className="flex items-center gap-1"><i className="bi bi-hourglass-split animate-spin"></i> Gerando...</span>
                                    ) : (
                                        <span className="flex items-center gap-1"><i className="bi bi-magic"></i> Sugerir com IA</span>
                                    )}
                                </button>
                            )}
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-800">PREVIEW</span>
                        </div>
                    </div>
                    
                    <input
                        readOnly
                        value={formData.description || ''}
                        className="w-full px-6 py-5 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl outline-none text-xl font-black text-slate-800 dark:text-slate-100 shadow-sm"
                        placeholder="Título será gerado automaticamente..."
                    />

                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="title-parts" direction="horizontal">
                            {(provided) => (
                                <div 
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="flex items-center gap-2 mt-2 flex-wrap"
                                >
                                    {/* Fixed Type Block */}
                                    <div className={`flex items-center border p-1 rounded-2xl gap-2 shrink-0 shadow-sm transition-all duration-300 ${formData.productTypeName ? 'bg-blue-600 border-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 opacity-80'}`}>
                                        <div className={`flex items-center justify-center w-6 h-6 ${formData.productTypeName ? 'text-white/80' : 'text-blue-400'}`}>
                                            <i className="bi bi-pin-fill text-xs"></i>
                                        </div>
                                        <div className="flex flex-col min-w-[70px]">
                                            <span className={`text-[7px] font-black uppercase leading-none mb-0.5 ${formData.productTypeName ? 'text-blue-100' : 'text-blue-400'}`}>Fixo {formData.productTypeName ? '(OK)' : '(1)'}</span>
                                            <span className={`text-[9px] font-black uppercase tracking-tighter truncate max-w-[100px] ${formData.productTypeName ? 'text-white' : 'text-blue-700 dark:text-blue-300'}`}>
                                                {formData.productTypeName || 'Tipo'}
                                            </span>
                                        </div>
                                        <div className={`w-7 h-7 flex items-center justify-center rounded-xl ${formData.productTypeName ? 'bg-white/20 text-white' : 'text-blue-600 bg-blue-100 dark:bg-blue-800'}`}>
                                            <i className={`bi ${formData.productTypeName ? 'bi-check-all text-sm' : 'bi-lock-fill text-[10px]'}`}></i>
                                        </div>
                                    </div>

                                    {draggableParts.map((key: string, idx: number) => (
                                        <Draggable key={key} draggableId={key} index={idx}>
                                            {(provided, snapshot) => (
                                                <div 
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`flex items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1 rounded-2xl gap-2 shrink-0 group/part shadow-sm transition-shadow ${snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-500/50 scale-105 z-50' : ''} ${key === 'environment' && formData.availableEnvironments && formData.availableEnvironments.length > 1 ? 'cursor-pointer' : ''}`}
                                                    onClick={(e) => {
                                                        if (key === 'environment' && formData.availableEnvironments && formData.availableEnvironments.length > 1) {
                                                            // Logic to rotate or show selector
                                                            const currentIdx = formData.availableEnvironments.indexOf(formData.environment || '');
                                                            const nextIdx = (currentIdx + 1) % formData.availableEnvironments.length;
                                                            const nextEnv = formData.availableEnvironments[nextIdx];
                                                            
                                                            setFormData(prev => {
                                                                const next = { ...prev, environment: nextEnv };
                                                                next.description = generateAutoTitle(next);
                                                                return next;
                                                            });
                                                            toast.info(`Ambiente alterado para: ${nextEnv}`);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center justify-center w-6 h-6 text-slate-300 group-hover/part:text-blue-500 transition-colors">
                                                        {key === 'environment' && formData.availableEnvironments && formData.availableEnvironments.length > 1 ? (
                                                            <i className="bi bi-arrow-repeat text-lg text-blue-500 animate-pulse"></i>
                                                        ) : (
                                                            <i className="bi bi-grip-vertical text-lg"></i>
                                                        )}
                                                    </div>
                                                     <div className="flex flex-col min-w-[70px]">
                                                         <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5">Bloco {idx + 1} {key === 'environment' && formData.availableEnvironments && formData.availableEnvironments.length > 1 && '(Trocar)'}</span>
                                                         <span className="text-[9px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter">
                                                             {key === 'environment' ? (formData.environment || 'Ambiente') : getPartLabel(key)}
                                                         </span>
                                                     </div>
                                                     <button 
                                                         type="button" 
                                                         onClick={(e) => {
                                                             e.stopPropagation();
                                                             handleToggleTitlePart(key);
                                                         }}
                                                         className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${isPartIncluded(key) ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-300'}`}
                                                     >
                                                         <i className={`bi ${isPartIncluded(key) ? 'bi-check-lg' : 'bi-dash-lg'}`}></i>
                                                     </button>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            )}

            {isService && (
                <div className="md:col-span-2 flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">
                        Nome do Serviço <span className="text-red-500">*</span>
                    </label>
                    <input
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value.toUpperCase() })}
                        className="w-full px-6 py-5 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl outline-none text-xl font-black text-slate-800 dark:text-slate-100 shadow-sm"
                        placeholder="Ex: MONTAGEM DE COZINHA"
                    />
                </div>
            )}

            {/* Selection Row */}
            {!isService && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-6 gap-6">
                    <div className="flex flex-col gap-2 md:col-span-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Móvel <span className="text-red-500">*</span></label>
                            <button type="button" onClick={onOpenProductTypeModal} className="text-[9px] text-blue-600 font-bold hover:underline">Novo Tipo</button>
                        </div>
                        <CategoryAutocomplete
                            selectedIds={formData.categoryIds || []}
                            onSelect={(cat) => {
                                setFormData(prev => {
                                    const ids = prev.categoryIds || [];
                                    if (ids.includes(cat.id)) return prev;
                                    
                                    let nextIds = [...ids, cat.id];
                                    const next = { ...prev, categoryIds: nextIds };
                                    // Auto-detect environments (root categories) for ALL selected Categories
                                    const getAllRoots = (ids: string[]): string[] => {
                                        const roots = new Set<string>();
                                        const visited = new Set<string>();
                                        const find = (catId: string) => {
                                            if (visited.has(catId)) return;
                                            visited.add(catId);
                                            const c = availableCategories.find(item => item.id === catId);
                                            if (!c) return;
                                            if (!c.parents || c.parents.length === 0) {
                                                roots.add(c.name);
                                            } else {
                                                c.parents.forEach((pid: string) => find(pid));
                                            }
                                        };
                                        ids.forEach(find);
                                        return Array.from(roots);
                                    };

                                    const allEnvs = getAllRoots(nextIds);
                                    let detectedEnv = prev.environment;
                                    
                                    // Se não tem ambiente ou o ambiente atual não está na árvore das categorias selecionadas
                                    if (!detectedEnv || !allEnvs.includes(detectedEnv)) {
                                        detectedEnv = allEnvs[0] || '';
                                    }
                                    
                                    // Definir o nome do tipo baseado na categoria selecionada para o título
                                    next.productTypeName = cat.name.toUpperCase();
                                    
                                    // IMPORTANTE: Não podemos usar cat.id como productTypeId pois existe uma FK para a tabela product_types.
                                    // Vamos tentar encontrar se existe um tipo com o mesmo nome.
                                    const matchingType = productTypes.find(t => t.name.toUpperCase() === cat.name.toUpperCase());
                                    if (matchingType) {
                                        next.productTypeId = matchingType.id;
                                    } else {
                                        next.productTypeId = undefined;
                                    }
                                    
                                    next.environment = detectedEnv;
                                    next.availableEnvironments = allEnvs;
                                    next.includeEnvironment = true;
                                    next.description = generateAutoTitle(next);
                                    return next;
                                });
                            }}
                            onRemove={(id) => {
                                setFormData(prev => {
                                    const nextIds = prev.categoryIds?.filter(i => i !== id) || [];
                                    const next = { ...prev, categoryIds: nextIds };
                                    
                                    const nextCat = availableCategories.find(c => c.id === id);
                                    
                                    // Recalcular todos os ambientes disponíveis das categorias restantes
                                    const getAllRoots = (ids: string[]): string[] => {
                                        const roots = new Set<string>();
                                        const visited = new Set<string>();
                                        const find = (catId: string) => {
                                            if (visited.has(catId)) return;
                                            visited.add(catId);
                                            const c = availableCategories.find(item => item.id === catId);
                                            if (!c) return;
                                            if (!c.parents || c.parents.length === 0) {
                                                roots.add(c.name);
                                            } else {
                                                c.parents.forEach((pid: string) => find(pid));
                                            }
                                        };
                                        ids.forEach(find);
                                        return Array.from(roots);
                                    };

                                    const allEnvs = getAllRoots(nextIds);
                                    next.availableEnvironments = allEnvs;
                                    
                                    // Se o ambiente atual não está mais na lista, pegar o primeiro disponível
                                    if (allEnvs.length > 0 && (!next.environment || !allEnvs.includes(next.environment))) {
                                        next.environment = allEnvs[0];
                                    } else if (allEnvs.length === 0) {
                                        next.environment = '';
                                    }

                                    // Se removeu a categoria que estava servindo de nome de tipo
                                    if (prev.productTypeName === nextCat?.name.toUpperCase()) {
                                        if (nextIds.length > 0) {
                                            const firstCat = availableCategories.find(c => c.id === nextIds[0]);
                                            next.productTypeName = firstCat?.name.toUpperCase() || '';
                                            
                                            const matchingType = productTypes.find(t => t.name.toUpperCase() === next.productTypeName);
                                            next.productTypeId = matchingType?.id;
                                        } else {
                                            next.productTypeId = undefined;
                                            next.productTypeName = '';
                                        }
                                    }
                                    
                                    next.description = generateAutoTitle(next);
                                    return next;
                                });
                            }}
                            onSearch={onOpenCategorySearch}
                        />

                        {(formData.categoryIds?.length || 0) > 1 && (
                            <div className="mt-2 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl animate-in slide-in-from-top-1 duration-300">
                                <label className="text-[8px] font-black uppercase tracking-widest text-blue-600 mb-2 block">Definir como Principal p/ Título (Categoria):</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableCategories.filter(c => formData.categoryIds?.includes(c.id)).map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setFormData(prev => {
                                                const next = { ...prev, productTypeName: cat.name.toUpperCase() };
                                                const matchingType = productTypes.find(t => t.name.toUpperCase() === cat.name.toUpperCase());
                                                next.productTypeId = matchingType?.id;
                                                next.description = generateAutoTitle(next);
                                                return next;
                                            })}
                                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${formData.productTypeName === cat.name.toUpperCase() ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-blue-300'}`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 md:col-span-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Linha / Modelo <span className="text-red-500">*</span></label>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ 
                                    ...prev, 
                                    hasNoLine: !prev.hasNoLine, 
                                    line: !prev.hasNoLine ? '' : prev.line,
                                    includeLine: prev.hasNoLine 
                                }))}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${formData.hasNoLine ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                <i className={`bi ${formData.hasNoLine ? 'bi-check-circle-fill' : 'bi-circle'}`}></i> Sem Modelo
                            </button>
                        </div>
                        <SmartInput
                            value={formData.line || ""}
                            onValueChange={(val) => setFormData(prev => {
                                const next = { ...prev, line: val.toUpperCase() };
                                next.description = generateAutoTitle(next);
                                return next;
                            })}
                            disabled={formData.hasNoLine}
                            tableName="products"
                            columnName="line"
                            placeholder={formData.hasNoLine ? "NÃO APLICÁVEL" : "EX: JK, POP, COPA"}
                            icon="bi-layout-text-window-reverse"
                        />
                    </div>

                    <div className="flex flex-col gap-2 md:col-span-1">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Marca <span className="text-red-500">*</span></label>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, noBrand: !prev.noBrand }))}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${formData.noBrand ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                <i className={`bi ${formData.noBrand ? 'bi-check-circle-fill' : 'bi-circle'}`}></i> {formData.noBrand ? 'Sim' : 'Não'}
                            </button>
                        </div>
                        <SmartInput
                            value={formData.brand || ""}
                            onValueChange={(val) => setFormData(prev => {
                                const next = { ...prev, brand: val.toUpperCase() };
                                next.description = generateAutoTitle(next);
                                return next;
                            })}
                            tableName="products"
                            columnName="brand"
                            placeholder="Marca"
                            icon="bi-award"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-2 md:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bloco Adicional</label>
                        <SmartInput
                            value={formData.titleComplement || ""}
                            onValueChange={(val) => setFormData(prev => {
                                const next = { ...prev, titleComplement: val.toUpperCase() };
                                next.description = generateAutoTitle(next);
                                return next;
                            })}
                            tableName="products"
                            columnName="title_complement"
                            placeholder="EX: C/ LED"
                            icon="bi-plus-circle"
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-6 md:col-span-2">
                <div className="flex flex-col gap-2 invisible h-0 overflow-hidden">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Código (SKU Principal) <span className="text-red-500">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                if (!formData.description) return toast.warning("Digite o título para gerar o SKU");
                                const newPrefix = generateProductCode(formData.description || '', formData.productTypeName, formData.line);
                                setFormData({ ...formData, code: newPrefix });
                                toast.info(`Prefixo SKU Sugerido: ${newPrefix}. O n�mero final ser� gerado ao salvar.`);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-all"
                            title="Regerar SKU baseado no título"
                        >
                            <i className="bi bi-magic"></i> Sugerir SKU
                        </button>
                    </div>
                    {formData.hasVariations ? (
                        <div className="flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl">
                            <i className="bi bi-info-circle-fill text-blue-600"></i>
                            <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 leading-tight">
                                Este produto possui variações. O SKU é definido individualmente em cada variação na aba "Variações".
                            </p>
                        </div>
                    ) : (
                        <SmartInput
                            value={formData.code || ''}
                            onValueChange={(val) => {
                                const newCode = val.toUpperCase();
                                if (newCode.length <= 6) {
                                    setFormData({ ...formData, code: newPrefix });
                                } else {
                                    toast.warning("O SKU não pode ter mais que 6 caracteres.");
                                }
                            }}
                            tableName="products"
                            columnName="code"
                            placeholder="Ex: P-001 (Máx 6. char)"
                            icon="bi-upc-scan"
                        />
                    )}
                </div>
                {!isService && (
                    <SmartInput
                        label="Unidade Comercial"
                        value={formData.unit || "UN"}
                        onValueChange={(val) => setFormData({ ...formData, unit: val.toUpperCase() })}
                        patterns={["UN", "KG", "M", "CX", "PC", "PAR", "L"]}
                        tableName="products"
                        columnName="unit"
                        placeholder="Ex: UN, KG, M..."
                        icon="bi-box-seam"
                    />
                )}
                {/* Condition removed from here if it was redundant, but checking code above */}

                {/* Condition */}
                {formData.itemType === 'product' && (
                    <div className="flex flex-col gap-2 md:col-span-2 mt-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Condição do Produto <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                            {[
                                { value: 'novo', label: 'Novo', icon: 'bi-box-seam' },
                                { value: 'usado', label: 'Usado', icon: 'bi-recycle' },
                                { value: 'salvado', label: 'Salvado (Avariado)', icon: 'bi-exclamation-triangle' }
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, condition: opt.value as any }))}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl border font-bold text-sm transition-all ${formData.condition === opt.value ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                                >
                                    <i className={`bi ${opt.icon}`}></i> {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Price */}
            <div className="flex flex-col gap-2 md:col-span-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Preço de Venda (R$)</label>
                    {formData.isCombo && (
                        <button
                            type="button"
                            onClick={() => {
                                const total = formData.comboItems?.reduce((acc: number, item) => acc + ((item.unitPrice || 0) * item.quantity), 0) || 0;
                                setFormData({ ...formData, unitPrice: Number(total.toFixed(2)) });
                                toast.info(`Preço calculado: R$ ${total.toFixed(2)}`);
                            }}
                            className="text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                        >
                            <i className="bi bi-calculator"></i> Somar Itens do Combo
                        </button>
                    )}
                </div>
                <input
                    type="number"
                    step="0.01"
                    value={(formData.unitPrice === null || formData.unitPrice === undefined || isNaN(formData.unitPrice as number)) ? '' : formData.unitPrice}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({ ...formData, unitPrice: isNaN(val) ? 0 : val });
                    }}
                    className="w-full px-4 py-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg font-black text-blue-600 dark:text-blue-400"
                />
            </div>
            {formData.itemType === 'product' && (
                <div className="md:col-span-2 mt-4 bg-slate-50/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <i className="bi bi-rulers text-blue-600"></i> Detalhes Técnicos / Dimensões
                        </h4>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Essas informações enriquecem a descrição gerada pela IA</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Material */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Material do Móvel</label>
                                <button
                                    type="button"
                                    onClick={() => window.open('/app/configuracoes#materiais', '_blank')}
                                    className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1"
                                    title="Configurar opções de materiais nas preferências do sistema"
                                >
                                    <i className="bi bi-gear-fill text-[8px]"></i> Configurar Materiais
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {availableMaterials.map(mat => (
                                    <button
                                        key={mat.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, material: mat.name.toUpperCase() })}
                                        className={"px-3 py-2 rounded-xl text-[10px] font-bold border transition-all " + (formData.material === mat.name.toUpperCase() ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-blue-300')}
                                    >
                                        {mat.name}
                                    </button>
                                ))}
                                {availableMaterials.length === 0 && (
                                    <p className="text-[9px] text-slate-400 font-bold uppercase italic">Nenhum material cadastrado.</p>
                                )}
                            </div>
                            <input
                                value={formData.material || ''}
                                onChange={(e) => setFormData({ ...formData, material: e.target.value.toUpperCase() })}
                                placeholder="Material (Auto-detectado ou Manual)..."
                                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold uppercase"
                            />
                        </div>



                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="md:col-span-2">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-4 flex items-center gap-2">
                                    <i className="bi bi-magic"></i> Refinamento para IA (Estilo Magalu)
                                </h5>
                            </div>
                            <div className="flex flex-col gap-2 invisible h-0 overflow-hidden">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Referência Fornecedor (Interno)</label>
                                <input
                                    value={formData.supplierRef || ''}
                                    onChange={(e) => setFormData({ ...formData, supplierRef: e.target.value.toUpperCase() })}
                                    placeholder="Ex: 12345-A"
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold uppercase"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Diferencial Principal (Copy)</label>
                                <input
                                    value={formData.mainDifferential || ''}
                                    onChange={(e) => setFormData({ ...formData, mainDifferential: e.target.value })}
                                    placeholder="Ex: Dobradiças com amortecimento"
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cores Disponíveis <span className="text-red-500">*</span></label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, noColors: !prev.noColors, colors: !prev.noColors ? '' : prev.colors }))}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${formData.noColors ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        <i className={`bi ${formData.noColors ? 'bi-eye-slash-fill' : 'bi-eye'}`}></i> {formData.noColors ? 'Informar Cor' : 'Não Informar'}
                                    </button>
                                </div>
                                                                <input
                                    readOnly
                                    value={formData.noColors ? 'NÃO INFORMADO' : (formData.colors || '')}
                                    placeholder={formData.noColors ? "NÃO APLICÁVEL" : "Auto-detectado das variações..."}
                                    className={"w-full px-4 py-3 border rounded-xl text-xs font-black transition-all " + (formData.noColors ? 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed italic' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-blue-600 dark:text-blue-400')}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">O que NÃO acompanha</label>
                                <input
                                    value={formData.notIncluded || ''}
                                    onChange={(e) => setFormData({ ...formData, notIncluded: e.target.value })}
                                    placeholder="Ex: Tampo, pia e eletros"
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold"
                                />
                            </div>
                        </div>

                        {/* Dimensions */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dimensões Totais (cm)</label>
                                {formData.width && formData.height && formData.depth && (
                                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg uppercase tracking-tighter">
                                        Peso Cubado: {calculateDIM(formData.height, formData.width, formData.depth).toFixed(2)}kg
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {/* Largura */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Largura {!formData.noWidth && <span className="text-red-500">*</span>}</span>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, noWidth: !prev.noWidth, width: !prev.noWidth ? 0 : prev.width }))}
                                            className={`p-1 rounded-md transition-all ${formData.noWidth ? 'text-amber-600 bg-amber-50' : 'text-slate-300 hover:text-slate-500'}`}
                                            title={formData.noWidth ? 'Ocultar' : 'Mostrar'}
                                        >
                                            <i className={`bi ${formData.noWidth ? 'bi-eye-slash-fill' : 'bi-eye'}`}></i>
                                        </button>
                                    </div>
                                    {!formData.noWidth ? (
                                        <input
                                            type="number"
                                            value={(!formData.width || isNaN(formData.width as number)) ? '' : formData.width}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setFormData({ ...formData, width: isNaN(val) ? 0 : val });
                                            }}
                                            placeholder="L"
                                            required
                                            className="w-full px-3 py-3 rounded-xl text-xs font-bold text-center border bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    ) : (
                                        <div className="w-full px-3 py-3 rounded-xl text-[9px] font-black text-center bg-slate-100 dark:bg-slate-800 text-slate-400 uppercase tracking-tighter">Oculto</div>
                                    )}
                                </div>

                                {/* Altura */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Altura {!formData.noHeight && <span className="text-red-500">*</span>}</span>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, noHeight: !prev.noHeight, height: !prev.noHeight ? 0 : prev.height }))}
                                            className={`p-1 rounded-md transition-all ${formData.noHeight ? 'text-amber-600 bg-amber-50' : 'text-slate-300 hover:text-slate-500'}`}
                                            title={formData.noHeight ? 'Ocultar' : 'Mostrar'}
                                        >
                                            <i className={`bi ${formData.noHeight ? 'bi-eye-slash-fill' : 'bi-eye'}`}></i>
                                        </button>
                                    </div>
                                    {!formData.noHeight ? (
                                        <input
                                            type="number"
                                            value={(!formData.height || isNaN(formData.height as number)) ? '' : formData.height}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setFormData({ ...formData, height: isNaN(val) ? 0 : val });
                                            }}
                                            placeholder="A"
                                            required
                                            className="w-full px-3 py-3 rounded-xl text-xs font-bold text-center border bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    ) : (
                                        <div className="w-full px-3 py-3 rounded-xl text-[9px] font-black text-center bg-slate-100 dark:bg-slate-800 text-slate-400 uppercase tracking-tighter">Oculto</div>
                                    )}
                                </div>

                                {/* Profundidade */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Profund. {!formData.noDepth && <span className="text-red-500">*</span>}</span>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, noDepth: !prev.noDepth, depth: !prev.noDepth ? 0 : prev.depth }))}
                                            className={`p-1 rounded-md transition-all ${formData.noDepth ? 'text-amber-600 bg-amber-50' : 'text-slate-300 hover:text-slate-500'}`}
                                            title={formData.noDepth ? 'Ocultar' : 'Mostrar'}
                                        >
                                            <i className={`bi ${formData.noDepth ? 'bi-eye-slash-fill' : 'bi-eye'}`}></i>
                                        </button>
                                    </div>
                                    {!formData.noDepth ? (
                                        <input
                                            type="number"
                                            value={(!formData.depth || isNaN(formData.depth as number)) ? '' : formData.depth}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setFormData({ ...formData, depth: isNaN(val) ? 0 : val });
                                            }}
                                            placeholder="P"
                                            required
                                            className="w-full px-3 py-3 rounded-xl text-xs font-bold text-center border bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    ) : (
                                        <div className="w-full px-3 py-3 rounded-xl text-[9px] font-black text-center bg-slate-100 dark:bg-slate-800 text-slate-400 uppercase tracking-tighter">Oculto</div>
                                    )}
                                </div>
                            </div>

                            {/* Dimensions Preview */}
                            <div className="mt-2 p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Visualização do Resultado Final</label>
                                <div className="flex items-center gap-2">
                                    <div className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-[11px] font-black text-slate-700 dark:text-slate-200 tracking-tight flex-1">
                                        {[
                                            !formData.noWidth && formData.width ? `L ${formData.width}CM` : null,
                                            !formData.noHeight && formData.height ? `A ${formData.height}CM` : null,
                                            !formData.noDepth && formData.depth ? `P ${formData.depth}CM` : null
                                        ].filter(Boolean).join(' X ') || <span className="text-slate-300 dark:text-slate-600 font-bold italic">DIMENSÕES NÃO INFORMADAS</span>}
                                    </div>
                                    <i className="bi bi-eye-fill text-slate-300 dark:text-slate-700 text-lg"></i>
                                </div>
                            </div>

                            {/* LTL Alert */}
                            {(() => {
                                const ltl = checkLTLRequirement({
                                    height: formData.height,
                                    width: formData.width,
                                    depth: formData.depth,
                                    weight: formData.weight
                                });
                                if (ltl.required) {
                                    return (
                                        <div className="mt-2 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl animate-in slide-in-from-top-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <i className="bi bi-truck text-orange-600"></i>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Alerta de Carga Pesada (LTL)</span>
                                            </div>
                                            <ul className="text-[9px] font-bold text-orange-700/70 dark:text-orange-400 list-disc list-inside">
                                                {ltl.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                            </ul>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        {/* Extra Dimensions */}
                        <div className="flex flex-col gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medições Adicionais (Máx. 10)</label>
                                    <p className="text-[9px] text-slate-400 italic">Ex: "Altura até o assento", "80cm"</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const current = formData.extraDimensions || [];
                                        if (current.length < 10) {
                                            setFormData({ ...formData, extraDimensions: [...current, { label: '', value: '' }] });
                                        }
                                    }}
                                    className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-xl hover:bg-blue-100 transition-all"
                                >
                                    <i className="bi bi-plus-lg"></i>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formData.extraDimensions?.map((dim, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input
                                            value={dim.label || ''}
                                            onChange={(e) => {
                                                const next = [...(formData.extraDimensions || [])];
                                                next[idx].label = e.target.value;
                                                setFormData({ ...formData, extraDimensions: next });
                                            }}
                                            placeholder="Label"
                                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs"
                                        />
                                        <input
                                            value={dim.value || ''}
                                            onChange={(e) => {
                                                const next = [...(formData.extraDimensions || [])];
                                                next[idx].value = e.target.value;
                                                setFormData({ ...formData, extraDimensions: next });
                                            }}
                                            placeholder="Valor"
                                            className="w-24 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = formData.extraDimensions?.filter((_, i) => i !== idx);
                                                setFormData({ ...formData, extraDimensions: next });
                                            }}
                                            className="text-red-400 hover:text-red-600 p-1"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Extra Fields (Dynamic Blocks for Title) */}
            <div className="md:col-span-2">
                <div className="bg-blue-50/20 dark:bg-blue-900/5 p-8 rounded-[2.5rem] border border-blue-100/30 dark:border-blue-900/20 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                <i className="bi bi-plus-square-fill"></i> Campos Adicionais (Blocos de Título)
                            </h4>
                            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Estes campos podem ser usados como blocos no título e aparecem na descrição</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const current = formData.extraFields || [];
                                const newId = `extra_${Date.now()}`;
                                const newField = { id: newId, label: 'Novo Campo', value: '', includeInTitle: true };
                                
                                setFormData(prev => {
                                    const next = { 
                                        ...prev, 
                                        extraFields: [...current, newField],
                                        titleOrder: [...(prev.titleOrder || ["type", "environment", "line", "brand", "complement"]), newId]
                                    };
                                    next.description = generateAutoTitle(next);
                                    return next;
                                });
                            }}
                            className="bg-blue-600 text-white p-2 px-4 rounded-xl hover:bg-blue-700 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
                        >
                            + Adicionar Bloco
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formData.extraFields?.map((field, idx) => (
                            <div key={field.id} className="flex gap-2 items-end bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in zoom-in-95">
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Nome do Bloco</label>
                                    <input
                                        value={field.label}
                                        onChange={(e) => {
                                            const nextFields = [...(formData.extraFields || [])];
                                            nextFields[idx] = { ...nextFields[idx], label: e.target.value };
                                            setFormData(prev => {
                                                const next = { ...prev, extraFields: nextFields };
                                                next.description = generateAutoTitle(next);
                                                return next;
                                            });
                                        }}
                                        placeholder="Ex: Material..."
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold"
                                    />
                                </div>
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Valor</label>
                                    <input
                                        value={field.value}
                                        onChange={(e) => {
                                            const nextFields = [...(formData.extraFields || [])];
                                            nextFields[idx] = { ...nextFields[idx], value: e.target.value };
                                            setFormData(prev => {
                                                const next = { ...prev, extraFields: nextFields };
                                                next.description = generateAutoTitle(next);
                                                return next;
                                            });
                                        }}
                                        placeholder="Ex: Vidro..."
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => {
                                            const nextFields = (prev.extraFields || []).filter(f => f.id !== field.id);
                                            const nextOrder = (prev.titleOrder || []).filter(k => k !== field.id);
                                            const next = { ...prev, extraFields: nextFields, titleOrder: nextOrder };
                                            next.description = generateAutoTitle(next);
                                            return next;
                                        });
                                    }}
                                    className="h-10 w-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                >
                                    <i className="bi bi-trash"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Observations */}
            <div className="md:col-span-2">
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Observações Internas (Não visível no marketplace)
                    </label>
                    <textarea
                        value={formData.observations || ''}
                        onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                        placeholder="Digite notas internas sobre este produto, processos ou detalhes específicos..."
                        className="w-full h-32 px-4 py-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-medium dark:text-slate-200 resize-none"
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductGeneralTab;

import React from "react";
import { AppSettings, HandlingOption } from '@/pages/utils/settingsService';
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Props {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

export default function HandlingSection({ settings, onChange }: Props): any {
    const onDragEnd = (result: DropResult, options: HandlingOption[], path: string) => {
        if (!result.destination) return;
        
        const next = Array.from(options);
        const [removed] = next.splice(result.source.index, 1);
        next.splice(result.destination.index, 0, removed);
        
        onChange(path, next);
    };

    const renderOptionList = (title: string, options: HandlingOption[], path: string) => (
        <div className="p-4 md:p-6 lg:p-8">
            <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200 mb-6 block border-l-4 border-blue-600 pl-4">{title}</h5>
            
            <DragDropContext onDragEnd={(res) => onDragEnd(res, options, path)}>
                <Droppable droppableId={path}>
                    {(provided) => (
                        <div 
                            {...provided.droppableProps} 
                            ref={provided.innerRef} 
                            className="flex flex-col gap-3"
                        >
                            {(options || []).map((opt, idx) => (
                                <Draggable key={`${path}-${idx}`} draggableId={`${path}-${idx}`} index={idx}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className="flex flex-col gap-2 group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    {...provided.dragHandleProps}
                                                    className={`cursor-grab active:cursor-grabbing p-2 text-slate-300 hover:text-blue-500 transition-colors ${snapshot.isDragging ? 'text-blue-600' : ''}`}
                                                >
                                                    <i className="bi bi-grip-vertical text-lg" />
                                                </div>
                                                
                                                <div className={`flex-1 bg-white dark:bg-slate-900 border-2 rounded-2xl p-4 transition-all flex flex-col gap-3 shadow-sm group/card ${snapshot.isDragging ? 'border-blue-500 shadow-xl scale-[1.02] z-50' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}>
                                                    <div className="flex items-center gap-3 w-full">
                                                        <i className="bi bi-tag-fill text-slate-300 dark:text-slate-600 text-[10px] shrink-0" style={{ color: opt.color || undefined }} />
                                                        <textarea
                                                            value={opt.label || ''}
                                                            onChange={(e) => {
                                                                const next = [...options];
                                                                next[idx] = { ...next[idx], label: e.target.value };
                                                                onChange(path, next);
                                                            }}
                                                            rows={2}
                                                            className="flex-1 bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none transition-all placeholder:text-slate-300 p-0 resize-none leading-relaxed"
                                                            placeholder="Ex: Montagem, Na Caixa..."
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800/50">
                                                        <div className="flex items-center gap-6">
                                                            {/* Assembly Toggle */}
                                                            <div className="flex flex-col items-center gap-1 group/toggle">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const next = [...options];
                                                                        next[idx] = { ...next[idx], includeInAssemblySchedule: !opt.includeInAssemblySchedule };
                                                                        onChange(path, next);
                                                                    }}
                                                                    className={`w-8 h-4 rounded-full transition-all relative border-2 ${opt.includeInAssemblySchedule ? 'bg-blue-600 border-blue-600' : 'bg-slate-200 border-slate-200 dark:bg-slate-700 dark:border-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all shadow-sm ${opt.includeInAssemblySchedule ? 'left-4.5' : 'left-0.5'}`} />
                                                                </button>
                                                                <span className={`text-[7px] font-black uppercase tracking-tighter leading-none ${opt.includeInAssemblySchedule ? 'text-blue-600' : 'text-slate-400'}`}>
                                                                    {opt.includeInAssemblySchedule ? 'Agendar' : 'S/ Agend.'}
                                                                </span>
                                                            </div>

                                                            {/* Color Picker */}
                                                            <div className="flex flex-col items-center gap-1 relative group/color">
                                                                <div 
                                                                    className="w-6 h-6 rounded-lg border-2 border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:scale-110 active:scale-95 transition-all overflow-hidden relative"
                                                                    style={{ backgroundColor: opt.color || 'transparent' }}
                                                                >
                                                                    {!opt.color && <i className="bi bi-palette text-slate-300 absolute inset-0 flex items-center justify-center text-[9px]" />}
                                                                    <input 
                                                                        type="color"
                                                                        value={opt.color || '#3b82f6'}
                                                                        onChange={(e) => {
                                                                            const next = [...options];
                                                                            next[idx] = { ...next[idx], color: e.target.value };
                                                                            onChange(path, next);
                                                                        }}
                                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                                                                    />
                                                                </div>
                                                                <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400 leading-none">
                                                                    Cor
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <button 
                                                            onClick={() => {
                                                                const next = [...options];
                                                                next.splice(idx, 1);
                                                                onChange(path, next);
                                                            }}
                                                            className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all ml-auto"
                                                        >
                                                            <i className="bi bi-trash3 text-sm" />
                                                        </button>
                                                    </div>
                                                </div>

                                            </div>


                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>


            <button 
                onClick={() => {
                    onChange(path, [...(options || []), { label: "Nova Opção", includeInAssemblySchedule: false }]);
                }}
                className="w-full mt-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all flex items-center justify-center gap-2"
            >
                <i className="bi bi-plus-circle-fill text-[10px]" />
                Adicionar Opção
            </button>
        </div>
    );

    return (
        <div className="flex flex-col">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider mb-2">Manuseio Padrão (Entrega)</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 leading-relaxed">Qual manuseio será selecionado por padrão em pedidos de entrega.</p>
                        <select
                            value={settings.defaultDeliveryHandling}
                            onChange={(e) => onChange('defaultDeliveryHandling', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 transition-all font-bold"
                        >
                            <option value="">Selecione...</option>
                            {(settings.deliveryHandlingOptions || []).map(opt => (
                                <option key={opt.label} value={opt.label}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider mb-2">Manuseio Padrão (Retirada)</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 leading-relaxed">Qual manuseio será selecionado por padrão em pedidos de retirada.</p>
                        <select
                            value={settings.defaultPickupHandling}
                            onChange={(e) => onChange('defaultPickupHandling', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 transition-all font-bold"
                        >
                            <option value="">Selecione...</option>
                            {(settings.pickupHandlingOptions || []).map(opt => (
                                <option key={opt.label} value={opt.label}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-50 dark:divide-slate-800/50">
                {renderOptionList(
                    "Opções para Entrega", 
                    settings.deliveryHandlingOptions, 
                    "deliveryHandlingOptions"
                )}
                {renderOptionList(
                    "Opções para Retirada", 
                    settings.pickupHandlingOptions, 
                    "pickupHandlingOptions"
                )}
            </div>
        </div>
    );
}

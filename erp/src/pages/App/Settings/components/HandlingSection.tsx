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
        <div className="p-3 md:p-3.5">
            <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200 mb-3 block border-l-2 border-blue-600 pl-3">{title}</h5>
            
            <DragDropContext onDragEnd={(res) => onDragEnd(res, options, path)}>
                <Droppable droppableId={path}>
                    {(provided) => (
                        <div 
                            {...provided.droppableProps} 
                            ref={provided.innerRef} 
                            className="flex flex-col gap-2"
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
                                                    className={`cursor-grab active:cursor-grabbing p-1.5 text-slate-300 hover:text-blue-500 transition-colors ${snapshot.isDragging ? 'text-blue-600' : ''}`}
                                                >
                                                    <i className="bi bi-grip-vertical text-base" />
                                                </div>
                                                
                                                <div className={`flex-1 bg-white dark:bg-slate-900 border-2 rounded-2xl p-3 transition-all flex flex-col gap-2 shadow-sm group/card ${snapshot.isDragging ? 'border-blue-500 shadow-xl scale-[1.02] z-50' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}>
                                                    <div className="flex items-center gap-3 w-full">
                                                        <i className="bi bi-tag-fill text-slate-300 dark:text-slate-600 text-[10px] shrink-0" style={{ color: opt.color || undefined }} />
                                                        <textarea
                                                            value={opt.label || ''}
                                                            onChange={(e) => {
                                                                const next = [...options];
                                                                next[idx] = { ...next[idx], label: e.target.value };
                                                                onChange(path, next);
                                                            }}
                                                            rows={1}
                                                            className="flex-1 bg-transparent border-none text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none transition-all placeholder:text-slate-300 p-0 resize-none leading-tight"
                                                            placeholder="Ex: Montagem, Na Caixa..."
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800/50">
                                                        <div className="flex items-center gap-4">
                                                            {/* Assembly Toggle */}
                                                            <div className="flex flex-col items-center gap-0.5 group/toggle">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const next = [...options];
                                                                        next[idx] = { ...next[idx], includeInAssemblySchedule: !opt.includeInAssemblySchedule };
                                                                        onChange(path, next);
                                                                    }}
                                                                    className={`w-7 h-3.5 rounded-full transition-all relative border-2 ${opt.includeInAssemblySchedule ? 'bg-blue-600 border-blue-600' : 'bg-slate-200 border-slate-200 dark:bg-slate-700 dark:border-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-0 w-2 h-2 bg-white rounded-full transition-all shadow-sm ${opt.includeInAssemblySchedule ? 'left-3.5' : 'left-0.5'}`} />
                                                                </button>
                                                                <span className={`text-[7px] font-black uppercase tracking-tighter leading-tight ${opt.includeInAssemblySchedule ? 'text-blue-600' : 'text-slate-400'} text-center w-12`}>
                                                                    {opt.includeInAssemblySchedule ? 'Agendar Montagem' : 'Sem Agend.'}
                                                                </span>
                                                            </div>

                                                            {/* Is Local Assembly Toggle */}
                                                            <div className="flex flex-col items-center gap-0.5 group/toggle">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const next = [...options];
                                                                        next[idx] = { ...next[idx], isAssemblyAtDelivery: !opt.isAssemblyAtDelivery };
                                                                        onChange(path, next);
                                                                    }}
                                                                    className={`w-7 h-3.5 rounded-full transition-all relative border-2 ${opt.isAssemblyAtDelivery ? 'bg-emerald-600 border-emerald-600' : 'bg-slate-200 border-slate-200 dark:bg-slate-700 dark:border-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-0 w-2 h-2 bg-white rounded-full transition-all shadow-sm ${opt.isAssemblyAtDelivery ? 'left-3.5' : 'left-0.5'}`} />
                                                                </button>
                                                                <span className={`text-[7px] font-black uppercase tracking-tighter leading-tight ${opt.isAssemblyAtDelivery ? 'text-emerald-600' : 'text-slate-400'} text-center w-12`}>
                                                                    {opt.isAssemblyAtDelivery ? 'Montagem no Local' : 'Montagem Fora'}
                                                                </span>
                                                            </div>

                                                            {/* Color Picker */}
                                                            <div className="flex flex-col items-center gap-0.5 relative group/color">
                                                                <div 
                                                                    className="w-5 h-5 rounded-md border-2 border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:scale-110 active:scale-95 transition-all overflow-hidden relative"
                                                                    style={{ backgroundColor: opt.color || 'transparent' }}
                                                                >
                                                                    {!opt.color && <i className="bi bi-palette text-slate-300 absolute inset-0 flex items-center justify-center text-[8px]" />}
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
                                                                <span className="text-[6px] font-black uppercase tracking-tighter text-slate-400 leading-none">
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
                                                            className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all ml-auto"
                                                        >
                                                            <i className="bi bi-trash3 text-[11px]" />
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
                    onChange(path, [...(options || []), { label: "Nova Opção", includeInAssemblySchedule: false, isAssemblyAtDelivery: false }]);
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

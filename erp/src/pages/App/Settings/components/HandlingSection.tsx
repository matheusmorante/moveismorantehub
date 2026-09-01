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
                                                            className="flex-1 bg-transparent border-none text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none transition-all placeholder:text-slate-300 p-0 resize-none leading-tight min-h-[32px] py-1 overflow-hidden"
                                                            placeholder="Ex: Montagem, Na Caixa..."
                                                            onInput={(e) => {
                                                                const target = e.target as HTMLTextAreaElement;
                                                                target.style.height = 'auto';
                                                                target.style.height = target.scrollHeight + 'px';
                                                            }}
                                                            ref={(el) => {
                                                                if (el) {
                                                                    el.style.height = 'auto';
                                                                    el.style.height = el.scrollHeight + 'px';
                                                                }
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800/50">
                                                        <div className="flex items-center gap-3">
                                                            {/* Radio Group de Montagem (Exclusivo: Nenhuma | Depósito | Fora) */}
                                                            <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1 rounded-xl border border-slate-100 dark:border-slate-800/60 flex-wrap">
                                                                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 mr-0.5">Montagem:</span>
                                                                
                                                                {/* Nenhuma */}
                                                                <label className="flex items-center gap-1 cursor-pointer text-[8px] font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400">
                                                                    <input
                                                                        type="radio"
                                                                        name={`assembly-type-${path}-${idx}`}
                                                                        checked={!opt.includeInAssemblySchedule && !opt.isAssemblyOutside}
                                                                        onChange={() => {
                                                                            const next = [...options];
                                                                            next[idx] = { 
                                                                                ...next[idx], 
                                                                                includeInAssemblySchedule: false,
                                                                                isAssemblyOutside: false
                                                                            };
                                                                            onChange(path, next);
                                                                        }}
                                                                        className="w-3 h-3 accent-slate-500 cursor-pointer"
                                                                    />
                                                                    <span>Nenhuma</span>
                                                                </label>

                                                                {/* No Depósito */}
                                                                <label className="flex items-center gap-1 cursor-pointer text-[8px] font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">
                                                                    <input
                                                                        type="radio"
                                                                        name={`assembly-type-${path}-${idx}`}
                                                                        checked={!!opt.includeInAssemblySchedule && !opt.isAssemblyOutside}
                                                                        onChange={() => {
                                                                            const next = [...options];
                                                                            next[idx] = { 
                                                                                ...next[idx], 
                                                                                includeInAssemblySchedule: true,
                                                                                isAssemblyOutside: false
                                                                            };
                                                                            onChange(path, next);
                                                                        }}
                                                                        className="w-3 h-3 accent-blue-600 cursor-pointer"
                                                                    />
                                                                    <span>No Depósito</span>
                                                                </label>

                                                                {/* Montagem Fora */}
                                                                <label className="flex items-center gap-1 cursor-pointer text-[8px] font-black uppercase tracking-tight text-rose-600 dark:text-rose-400">
                                                                    <input
                                                                        type="radio"
                                                                        name={`assembly-type-${path}-${idx}`}
                                                                        checked={!opt.includeInAssemblySchedule && !!opt.isAssemblyOutside}
                                                                        onChange={() => {
                                                                            const next = [...options];
                                                                            next[idx] = { 
                                                                                ...next[idx], 
                                                                                includeInAssemblySchedule: false,
                                                                                isAssemblyOutside: true
                                                                            };
                                                                            onChange(path, next);
                                                                        }}
                                                                        className="w-3 h-3 accent-rose-600 cursor-pointer"
                                                                    />
                                                                    <span>Montagem Fora</span>
                                                                </label>
                                                            </div>
                                                            {/* Color Palette Picker */}
                                                            <div className="flex flex-col items-center gap-0.5 relative group/color">
                                                                <button
                                                                    type="button"
                                                                    className="w-5 h-5 rounded-md border-2 border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                                                                    style={{ backgroundColor: opt.color || '#3b82f6' }}
                                                                    title="Escolher cor da paleta"
                                                                >
                                                                    {!opt.color && <i className="bi bi-palette text-white text-[8px]" />}
                                                                </button>

                                                                {/* Dropdown de Paleta (Abre para cima para não cortar no rodapé) */}
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] hidden group-hover/color:grid grid-cols-5 gap-2 w-44">
                                                                    {[
                                                                        '#0a95ff', '#0684f9', '#3b82f6', '#6366f1', '#8b5cf6',
                                                                        '#10b981', '#11d452', '#0ebe2c', '#3bd411', '#84cc16',
                                                                        '#f59e0b', '#f97316', '#ef4444', '#f00018', '#e10909',
                                                                        '#ec4899', '#e2084a', '#06b6d4', '#14b8a6', '#64748b',
                                                                    ].map((hex) => (
                                                                        <button
                                                                            key={hex}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const next = [...options];
                                                                                next[idx] = { ...next[idx], color: hex };
                                                                                onChange(path, next);
                                                                            }}
                                                                            className={`w-6 h-6 rounded-lg transition-transform hover:scale-125 cursor-pointer ${opt.color === hex ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-900' : ''}`}
                                                                            style={{ backgroundColor: hex }}
                                                                        />
                                                                    ))}
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

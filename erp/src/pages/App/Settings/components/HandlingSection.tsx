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
        <div className="p-8">
            <h5 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200 mb-6 block border-l-4 border-blue-600 pl-4">{title}</h5>
            
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
                                                
                                                <div className={`flex-1 bg-white dark:bg-slate-900 border-2 rounded-2xl px-5 py-2.5 transition-all flex items-center justify-between shadow-sm ${snapshot.isDragging ? 'border-blue-500 shadow-xl scale-[1.02] z-50' : 'border-slate-100 dark:border-slate-800'}`}>
                                                    <input
                                                        type="text"
                                                        value={opt.label || ''}
                                                        onChange={(e) => {
                                                            const next = [...options];
                                                            next[idx] = { ...next[idx], label: e.target.value };
                                                            onChange(path, next);
                                                        }}
                                                        className="flex-1 bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-0 outline-none transition-all placeholder:text-slate-300"
                                                        placeholder="Nome da opção"
                                                    />
                                                     <div className="flex items-center gap-2 ml-2">
                                                        <div className="flex flex-col items-center gap-1 mr-2 group/toggle">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const next = [...options];
                                                                    next[idx] = { ...next[idx], includeInAssemblySchedule: !opt.includeInAssemblySchedule };
                                                                    onChange(path, next);
                                                                }}
                                                                className={`w-10 h-5 rounded-full transition-all relative border-2 ${opt.includeInAssemblySchedule ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-200 border-slate-200 dark:bg-slate-800 dark:border-slate-800'}`}
                                                                title={opt.includeInAssemblySchedule ? "Enviar p/ Lista de Montagem (ON)" : "Enviar p/ Lista de Montagem (OFF)"}
                                                            >
                                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${opt.includeInAssemblySchedule ? 'left-6' : 'left-0.5'}`} />
                                                            </button>
                                                            <span className={`text-[8px] font-black uppercase tracking-widest ${opt.includeInAssemblySchedule ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                                {opt.includeInAssemblySchedule ? 'Montar' : 'S/ Mont.'}
                                                            </span>
                                                        </div>

                                                        <button 
                                                            onClick={() => {
                                                                const next = [...options];
                                                                next.splice(idx, 1);
                                                                onChange(path, next);
                                                            }}
                                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-xl transition-all"
                                                            title="Remover opção"
                                                        >
                                                            <i className="bi bi-trash3" />
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
                className="w-full mt-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all flex items-center justify-center gap-2"
            >
                <i className="bi bi-plus-circle-fill" />
                Adicionar Nova Opção
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-0 divide-y md:divide-y-0 md:divide-x divide-slate-50 dark:divide-slate-800/50">
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

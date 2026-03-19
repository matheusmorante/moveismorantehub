/** @jsxImportSource react */
import React from "react";
import { AppSettings } from '@/pages/utils/settingsService';
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Props {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

export default function HandlingSection({ settings, onChange }: Props): any {
    const onDragEnd = (result: DropResult, options: string[], path: string) => {
        if (!result.destination) return;
        
        const next = Array.from(options);
        const [removed] = next.splice(result.source.index, 1);
        next.splice(result.destination.index, 0, removed);
        
        onChange(path, next);
    };

    const renderOptionList = (title: string, options: string[], path: string) => (
        <div className="p-8">
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-6 block">{title}</h5>
            
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
                                            className="flex items-center gap-3 group"
                                        >
                                            <div 
                                                {...provided.dragHandleProps}
                                                className={`cursor-grab active:cursor-grabbing p-2 text-slate-300 hover:text-blue-500 transition-colors ${snapshot.isDragging ? 'text-blue-600' : ''}`}
                                            >
                                                <i className="bi bi-grip-vertical text-lg" />
                                            </div>
                                            
                                            <div className={`flex-1 bg-white dark:bg-slate-900 border-2 rounded-2xl px-5 py-2.5 transition-all flex items-center justify-between shadow-sm ${snapshot.isDragging ? 'border-blue-500 shadow-xl scale-[1.02] z-50' : 'border-slate-100 dark:border-slate-800'}`}>
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => {
                                                        const next = [...options];
                                                        next[idx] = e.target.value;
                                                        onChange(path, next);
                                                    }}
                                                    className="flex-1 bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-0 outline-none transition-all placeholder:text-slate-300"
                                                    placeholder="Nome da opção"
                                                />
                                                <div className="flex items-center gap-2 ml-2">
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
                    onChange(path, [...(options || []), "Nova Opção"]);
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
                                <option key={opt} value={opt}>{opt}</option>
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
                                <option key={opt} value={opt}>{opt}</option>
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

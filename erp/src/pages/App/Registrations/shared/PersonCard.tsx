import React from "react";
import Person from "../../../types/person.type";

interface PersonCardProps {
    person: Person;
    onEdit: (person: Person) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    onToggleActive: (id: string, currentStatus: boolean) => void;
    showTrash?: boolean;
    isSelected?: boolean;
    onToggleSelection?: () => void;
    onViewPurchaseHistory?: (person: Person) => void;
}

const PersonCard = ({
    person,
    onEdit,
    onDelete,
    onRestore,
    onPermanentDelete,
    onToggleActive,
    showTrash,
    isSelected,
    onToggleSelection,
    onViewPurchaseHistory
}: PersonCardProps) => {
    return (
        <div 
            className={`bg-white dark:bg-slate-900 border ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-100 dark:border-slate-800'} rounded-xl p-3 shadow-sm active:scale-[0.98] transition-all`}
            onClick={() => onEdit(person)}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                            e.stopPropagation();
                            onToggleSelection?.();
                        }}
                        className="w-5 h-5 text-blue-600 bg-white border-slate-300 rounded-md focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-900 focus:ring-2 dark:bg-slate-800 dark:border-slate-700 cursor-pointer"
                    />
                    <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                        {person.id?.substring(0, 8) || "NO-ID"}
                    </span>
                </div>
                
                <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${person.active ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'}`}>
                    {person.active ? 'Ativo' : 'Inativo'}
                </span>
            </div>

            <div className="mb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {person.fullName}
                </h3>
                {person.personType === 'PF' && person.socialName && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        {person.socialName}
                    </p>
                )}
                {person.personType === 'PJ' && person.tradeName && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        {person.tradeName}
                    </p>
                )}
                {person.cpfCnpj && (
                    <p className="text-[9px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest mt-2 bg-slate-50 dark:bg-slate-950/50 w-fit px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                        {person.cpfCnpj}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 gap-1.5 border-t border-slate-50 dark:border-slate-800/50 pt-2.5">
                {person.email && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                        <i className="bi bi-envelope text-slate-400" />
                        <span className="truncate">{person.email}</span>
                    </div>
                )}
                {person.phone && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                        <i className="bi bi-telephone text-slate-400" />
                        <span>{person.phone}</span>
                    </div>
                )}
                {person.fullAddress?.street && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-500">
                        <i className="bi bi-geo-alt text-slate-400" />
                        <span className="truncate">
                            {person.fullAddress.street}, {person.fullAddress.number || 'S/N'} - {person.fullAddress.city}
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 mt-3" onClick={(e) => e.stopPropagation()}>
                {showTrash ? (
                    <>
                        <button
                            onClick={() => onRestore(person.id!)}
                            className="flex flex-col items-center justify-center gap-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"
                        >
                            <i className="bi bi-arrow-counterclockwise text-base" />
                            <span className="text-[8px] font-black uppercase">Restaurar</span>
                        </button>
                        <button
                            onClick={() => onPermanentDelete(person.id!)}
                            className="flex flex-col items-center justify-center gap-1 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg col-span-2"
                        >
                            <i className="bi bi-trash3-fill text-base" />
                            <span className="text-[8px] font-black uppercase tracking-tighter">Excluir Permanente</span>
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => onToggleActive(person.id!, person.active)}
                            className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg border focus:outline-none transition-all ${person.active 
                                ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                        >
                            <i className={`bi ${person.active ? 'bi-toggle-on' : 'bi-toggle-off'} text-base`} />
                            <span className="text-[8px] font-black uppercase">{person.active ? 'Ativo' : 'Inativo'}</span>
                        </button>

                        <button
                            onClick={() => onEdit(person)}
                            className="flex flex-col items-center justify-center gap-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"
                        >
                            <i className="bi bi-pencil-fill text-base" />
                            <span className="text-[8px] font-black uppercase">Editar</span>
                        </button>

                        <button
                            onClick={() => onDelete(person.id!)}
                            className="flex flex-col items-center justify-center gap-1 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg"
                        >
                            <i className="bi bi-trash-fill text-base" />
                            <span className="text-[8px] font-black uppercase">Excluir</span>
                        </button>

                        <button
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                import('../../../utils/whatsapp').then(({ sendDirectPersonGroupInviteMessage }) => {
                                    sendDirectPersonGroupInviteMessage(person);
                                });
                            }}
                            className="flex flex-col items-center justify-center gap-1 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg col-span-3 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <i className="bi bi-person-lines-fill text-sm" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Enviar Convite VIP</span>
                            </div>
                        </button>

                            {onViewPurchaseHistory && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewPurchaseHistory(person); }}
                                    className="flex flex-col items-center justify-center gap-1 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg col-span-3 mt-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <i className="bi bi-clock-history text-sm" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Ver Histórico de Pedidos</span>
                                    </div>
                                </button>
                            )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PersonCard;

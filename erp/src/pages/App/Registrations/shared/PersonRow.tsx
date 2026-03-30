import React from "react";
import Person, { PersonVisibilitySettings } from "../../../types/person.type";

interface PersonRowProps {
    person: Person;
    onEdit: (person: Person) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    onToggleActive: (id: string, currentStatus: boolean) => void;
    visibilitySettings: PersonVisibilitySettings;
    showTrash?: boolean;
    orderedColumnKeys?: string[];
    isSelected?: boolean;
    onToggleSelection?: () => void;
    onViewPurchaseHistory?: (person: Person) => void;
}

const PersonRow = ({
    person,
    onEdit,
    onDelete,
    onRestore,
    onPermanentDelete,
    onToggleActive,
    visibilitySettings,
    showTrash,
    orderedColumnKeys,
    isSelected,
    onToggleSelection,
    onViewPurchaseHistory
}: PersonRowProps) => {

    const renderCell = (key: string) => {
        if (!visibilitySettings[key as keyof PersonVisibilitySettings]) return null;

        switch (key) {
            case 'id':
                return (
                    <td key="id" className="px-3 py-1.5 text-left">
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                            {person.id || "-"}
                        </span>
                    </td>
                );
            case 'fullName':
                return (
                    <td key="fullName" className="px-3 py-1.5 text-left">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {person.fullName}
                                    {person.personType === 'PF' && person.socialName && (
                                        <span className="text-slate-400 dark:text-slate-500 font-medium ml-2">({person.socialName})</span>
                                    )}
                                    {person.personType === 'PJ' && person.tradeName && (
                                        <span className="text-slate-400 dark:text-slate-500 font-medium ml-2">({person.tradeName})</span>
                                    )}
                                </span>
                                {person.type === 'suppliers' && (
                                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30">
                                        Fornecedor
                                    </span>
                                )}
                            </div>
                            {person.cpfCnpj && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                    {person.cpfCnpj}
                                </span>
                            )}
                        </div>
                    </td>
                );
            case 'cpfCnpj':
                return (
                    <td key="cpfCnpj" className="px-3 py-1.5 text-left">
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                            {person.cpfCnpj || "-"}
                        </span>
                    </td>
                );
            case 'email':
                return (
                    <td key="email" className="px-3 py-1.5 text-left">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{person.email || "-"}</span>
                    </td>
                );
            case 'phone':
                return (
                    <td key="phone" className="px-3 py-1.5 text-left">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{person.phone || "-"}</span>
                    </td>
                );
            case 'address':
                return (
                    <td key="address" className="px-3 py-1.5 text-left">
                        {person.noAddress ? (
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic flex items-center gap-1">
                                <i className="bi bi-geo-alt-fill text-slate-300"></i>
                                Não informado
                            </span>
                        ) : (
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                    {person.fullAddress?.street
                                        ? `${person.fullAddress.street}, ${person.fullAddress.number || 'S/N'}`
                                        : "-"}
                                </span>
                                {(person.fullAddress?.city || person.fullAddress?.state) && (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                        {person.fullAddress.city}{person.fullAddress.state ? ` / ${person.fullAddress.state}` : ""}
                                    </span>
                                )}
                            </div>
                        )}
                    </td>
                );
            case 'actions':
                return (
                    <td key="actions" className="px-3 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                            {showTrash ? (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRestore(person.id!); }}
                                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                                        title="Restaurar"
                                    >
                                        <i className="bi bi-arrow-counterclockwise text-sm" />
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); onPermanentDelete(person.id!); }}
                                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                                        title="Excluir Permanentemente"
                                    >
                                        <i className="bi bi-trash3-fill text-sm" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onToggleActive(person.id!, person.active); }}
                                        className={`p-2 rounded-xl transition-all shadow-sm border ${person.active
                                            ? 'text-emerald-500 hover:text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'
                                            : 'text-slate-400 hover:text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}
                                        title={person.active ? "Desativar" : "Ativar"}
                                    >
                                        <i className={`bi ${person.active ? 'bi-toggle-on' : 'bi-toggle-off'} text-lg`} />
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(person); }}
                                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                                        title="Editar"
                                    >
                                        <i className="bi bi-pencil-fill text-sm" />
                                    </button>

                                        {onViewPurchaseHistory && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onViewPurchaseHistory(person); }}
                                                className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                                                title="Ver Histórico de Pedidos"
                                            >
                                                <i className="bi bi-bag-check-fill text-sm" />
                                            </button>
                                        )}

                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(person.id!); }}
                                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                                        title="Mover para Lixeira"
                                    >
                                        <i className="bi bi-trash-fill text-sm" />
                                    </button>
                                </>
                            )}
                        </div>
                    </td>
                );
            default:
                return null;
        }
    };

    return (
        <tr
            className={`transition-colors group cursor-pointer bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/50`}
            onClick={() => onEdit(person)}
        >
            <td className="p-0 w-12 text-center">
                <label
                    className="flex items-center justify-center w-full h-full cursor-pointer py-1.5 px-3"
                    onClick={(e) => e.stopPropagation()}
                >
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelection?.()}
                        className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-900 focus:ring-2 dark:bg-slate-800 dark:border-slate-700 cursor-pointer"
                    />
                </label>
            </td>

            {orderedColumnKeys ? orderedColumnKeys.map(key => renderCell(key)) : (
                <>
                    {renderCell('fullName')}
                    {renderCell('email')}
                    {renderCell('phone')}
                    {renderCell('actions')}
                </>
            )}
        </tr>
    );
};

export default PersonRow;

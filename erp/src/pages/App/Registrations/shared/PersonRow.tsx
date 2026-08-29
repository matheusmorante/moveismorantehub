import React from "react";
import Person, { PersonVisibilitySettings } from "../../../types/person.type";
import DropdownPortal from "../../../../components/shared/DropdownPortal";

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
    productCount?: number;
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
    onViewPurchaseHistory, productCount = 0
}: PersonRowProps) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const menuAnchorRef = React.useRef<HTMLButtonElement>(null);

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
            case 'products':
                return <td key="products" className="px-3 py-1.5 text-center"><span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-blue-50 px-2 py-1 text-xs font-black text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">{productCount}</span></td>;
            case 'actions':
                return (
                    <td key="actions" className="px-3 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                            <div className="relative">
                                <button
                                    ref={menuAnchorRef}
                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                                    className={`p-2 rounded-xl transition-all shadow-sm border bg-white dark:bg-slate-955 hover:bg-slate-50 dark:hover:bg-slate-900 ${
                                        isMenuOpen ? 'border-blue-200 text-blue-600 ring-4 ring-blue-50 dark:ring-blue-900/10' : 'text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800'
                                    }`}
                                    title="Mais Ações"
                                >
                                    <i className="bi bi-three-dots-vertical text-sm" />
                                </button>

                                <DropdownPortal
                                    isOpen={isMenuOpen}
                                    onClose={() => setIsMenuOpen(false)}
                                    anchorRef={menuAnchorRef}
                                    className="min-w-[190px]"
                                >
                                    <div 
                                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-2 flex flex-col z-[9999] animate-slide-up"
                                        onMouseLeave={() => setIsMenuOpen(false)}
                                    >
                                        {showTrash ? (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsMenuOpen(false);
                                                        onRestore(person.id!);
                                                    }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-955 transition-colors text-left group"
                                                >
                                                    <i className="bi bi-arrow-counterclockwise text-emerald-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Restaurar</span>
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsMenuOpen(false);
                                                        onPermanentDelete(person.id!);
                                                    }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-955/20 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50"
                                                >
                                                    <i className="bi bi-trash3-fill text-red-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Excluir Permanentemente</span>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsMenuOpen(false);
                                                        onEdit(person);
                                                    }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-955 transition-colors text-left group"
                                                >
                                                    <i className="bi bi-pencil-fill text-blue-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Editar</span>
                                                </button>

                                                {onViewPurchaseHistory && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsMenuOpen(false);
                                                            onViewPurchaseHistory(person);
                                                        }}
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-955 transition-colors text-left group"
                                                    >
                                                        <i className="bi bi-bag-check-fill text-amber-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Histórico de Pedidos</span>
                                                    </button>
                                                )}

                                                <button
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setIsMenuOpen(false);
                                                        import('../../../utils/whatsapp').then(({ sendDirectPersonGroupInviteMessage }) => {
                                                            sendDirectPersonGroupInviteMessage(person);
                                                        });
                                                    }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-left group"
                                                >
                                                    <i className="bi bi-person-lines-fill text-indigo-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">Enviar Convite VIP</span>
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsMenuOpen(false);
                                                        onDelete(person.id!);
                                                    }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-955/20 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50"
                                                >
                                                    <i className={`bi ${person.type === 'suppliers' ? 'bi-person-dash-fill text-amber-500' : 'bi-trash-fill text-red-500'}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">{person.type === 'suppliers' ? 'Desativar' : 'Mover para Lixeira'}</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </DropdownPortal>
                            </div>
                        </div>
                    </td>
                );
            default:
                return null;
        }
    };

    return (
        <tr
            className={`transition-colors group cursor-pointer bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 ${person.type === 'suppliers' && !person.active ? 'grayscale opacity-55 hover:opacity-70' : ''}`}
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

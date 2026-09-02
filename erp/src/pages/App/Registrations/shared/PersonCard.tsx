import React from "react";
import Person from "../../../types/person.type";
import DropdownPortal from "../../../../components/shared/DropdownPortal";

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
    productCount?: number;
    allowsSelection?: boolean;
}

const getRoleBadge = (role?: string) => {
    switch (role) {
        case 'administrator':
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800"><i className="bi bi-shield-shaded" />Administrador</span>;
        case 'manager':
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"><i className="bi bi-briefcase-fill" />Gestor</span>;
        case 'seller':
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><i className="bi bi-tag-fill" />Vendedor</span>;
        case 'deliverer':
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800"><i className="bi bi-truck" />Entregador / Montador</span>;
        case 'accountant':
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"><i className="bi bi-calculator-fill" />Contador</span>;
        case 'pending':
            return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"><i className="bi bi-slash-circle" />Sem Acesso</span>;
        default:
            return null;
    }
};

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
    onViewPurchaseHistory, productCount = 0,
    allowsSelection = true
}: PersonCardProps) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const menuAnchorRef = React.useRef<HTMLButtonElement>(null);
    const canSelect = allowsSelection && person.type !== 'employees';

    const hasActions = showTrash || person.type !== 'employees' || Boolean(onViewPurchaseHistory);

    return (
        <div 
            className={`bg-white dark:bg-slate-900 border ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-100 dark:border-slate-800'} rounded-xl p-3 shadow-sm ${person.type !== 'employees' ? 'active:scale-[0.98] cursor-pointer' : ''} transition-all`}
            onClick={() => {
                if (person.type !== 'employees') {
                    onEdit(person);
                }
            }}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                    {canSelect && (
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                                e.stopPropagation();
                                onToggleSelection?.();
                            }}
                            className="w-5 h-5 text-blue-600 bg-white border-slate-300 rounded-md focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-900 focus:ring-2 dark:bg-slate-800 dark:border-slate-700 cursor-pointer"
                        />
                    )}
                    {person.type === 'employees' && person.employeeCode !== undefined && (
                        <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                            {person.employeeCode}
                        </span>
                    )}
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${person.active ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'}`}>
                        {person.active ? 'Ativo' : 'Inativo'}
                    </span>
                    {person.type === 'employees' && (
                        (person.roles && person.roles.length > 0 ? person.roles : (person.role ? [person.role] : [])).map((r) => (
                            <React.Fragment key={r}>{getRoleBadge(r)}</React.Fragment>
                        ))
                    )}
                </div>
                
                {hasActions && (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                            ref={menuAnchorRef}
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border shrink-0 ${isMenuOpen ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 text-indigo-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                            title="Mais Ações"
                        >
                            <i className="bi bi-three-dots text-xs" />
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
                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onRestore(person.id!); }}
                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                        >
                                            <i className="bi bi-arrow-counterclockwise text-emerald-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Restaurar</span>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onPermanentDelete(person.id!); }}
                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50"
                                        >
                                            <i className="bi bi-trash3-fill text-red-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Excluir Permanentemente</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {person.type !== 'employees' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onEdit(person); }}
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                            >
                                                <i className="bi bi-pencil-fill text-blue-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Editar</span>
                                            </button>
                                        )}

                                        {onViewPurchaseHistory && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onViewPurchaseHistory(person); }}
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                            >
                                                <i className="bi bi-bag-check-fill text-amber-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Histórico de Pedidos</span>
                                            </button>
                                        )}

                                        {person.type !== 'employees' && (
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
                                        )}

                                        {person.type !== 'employees' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDelete(person.id!); }}
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50"
                                            >
                                                <i className="bi bi-trash-fill text-red-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Mover para Lixeira</span>
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </DropdownPortal>
                    </div>
                )}
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
                {person.type === 'suppliers' ? (
                    <div className="flex items-center gap-2 text-[11px] font-black text-blue-600 dark:text-blue-400"><i className="bi bi-box-seam" /><span>{productCount} produto(s) vinculado(s)</span></div>
                ) : <>
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
                </>}
            </div>
        </div>
    );
};

export default PersonCard;

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PersonPageHeaderProps {
    title: string;
    subtitle: string;
    newLabel: string;
    newIcon: string;
    collectionName: string;
    canImport: boolean;
    isSupplier: boolean;
    isCustomer: boolean;
    isEmployee: boolean;
    onOpenAdd: () => void;
    onOpenTrash: () => void;
    onOpenImport: () => void;
}

const PersonPageHeader: React.FC<PersonPageHeaderProps> = ({
    title,
    subtitle,
    newLabel,
    newIcon,
    collectionName,
    canImport,
    isSupplier,
    isCustomer,
    isEmployee,
    onOpenAdd,
    onOpenTrash,
    onOpenImport,
}) => {
    const navigate = useNavigate();

    return (
        <div className={isSupplier || isCustomer ? "flex flex-col gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between" : "flex flex-col xl:flex-row justify-between xl:items-center mb-6 md:mb-10 gap-4 xl:gap-0"}>
            <div className="flex items-center gap-3">
                <h1 className={`${isSupplier || isCustomer ? 'text-lg md:text-xl' : 'text-2xl xl:text-4xl'} font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors`}>
                    {title}
                </h1>
                {Boolean(subtitle) && !isCustomer && (
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm xl:text-lg hidden sm:block">
                        {subtitle}
                    </p>
                )}
            </div>
            <div className={isSupplier || isCustomer ? "flex flex-row items-center gap-2" : "flex flex-col sm:flex-row gap-3"}>
                {isCustomer && (
                    <button
                        onClick={onOpenTrash}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-500 hover:border-red-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        title="Ver Clientes na Lixeira"
                    >
                        <i className="bi bi-trash3 text-xs" />
                        <span className="hidden sm:inline">Lixeira</span>
                    </button>
                )}
                {!isSupplier && !isCustomer && (
                    <button
                        onClick={() => navigate('/app/configuracoes')}
                        className="flex items-center justify-center p-3 xl:p-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all w-full sm:w-auto mt-2 xl:mt-0"
                        title="Configurar Campos Obrigatórios"
                    >
                        <i className="bi bi-gear-fill text-lg xl:text-xl" />
                    </button>
                )}
                {canImport && !isCustomer && (
                    <button
                        onClick={onOpenImport}
                        className={isSupplier ? "flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all active:scale-95 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" : "flex items-center justify-center gap-2 xl:gap-3 bg-white hover:bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 px-4 py-3 xl:px-8 xl:py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-sm shadow-slate-200 dark:shadow-none transition-all active:scale-95 w-full sm:w-auto mt-2 xl:mt-0"}
                    >
                        <i className="bi bi-cloud-arrow-up-fill text-lg xl:text-xl" />
                        Importar
                    </button>
                )}
                {!isEmployee && (
                    <button
                        onClick={onOpenAdd}
                        className={isSupplier || isCustomer ? "flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-xs transition-all active:scale-95 hover:bg-blue-700 dark:shadow-none cursor-pointer" : "flex items-center justify-center gap-2 xl:gap-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 xl:px-8 xl:py-4 rounded-xl xl:rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 w-full sm:w-auto mt-2 xl:mt-0"}
                    >
                        <i className={`${newIcon} ${isSupplier || isCustomer ? 'text-xs' : 'text-lg xl:text-xl'}`} />
                        {newLabel}
                    </button>
                )}
            </div>
        </div>
    );
};

export default PersonPageHeader;

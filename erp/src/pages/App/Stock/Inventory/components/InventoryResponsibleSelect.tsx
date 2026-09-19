import React, { useState, useRef, useEffect } from 'react';
import Person from "@/pages/types/person.type";

export interface InventoryResponsibleSelectProps {
    readonly employees: readonly Person[];
    readonly value: string;
    readonly hasError?: boolean;
    readonly onChange: (value: string) => void;
}

/**
 * Obtém o nome de exibição preferencial do funcionário responsável (nome completo, social ou apelido).
 */
export const getEmployeeDisplayName = (employee?: Person): string =>
    employee?.fullName || employee?.socialName || employee?.nickname || 'Responsável não informado';

/**
 * Componente seletor para definir o colaborador responsável pela sessão de contagem do inventário.
 */
export const InventoryResponsibleSelect: React.FC<InventoryResponsibleSelectProps> = ({
    employees,
    value,
    onChange,
    hasError = false,
}) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const validEmployees = React.useMemo(() => employees.filter((employee) => {
        if (employee.type && employee.type !== 'employees') return false;
        const hasValidSystemRole = !!employee.role && employee.role !== 'pending';
        const hasValidPosition = !!employee.position && employee.position.trim().length > 0 && employee.position.trim() !== 'Sem Acesso';
        return hasValidSystemRole || hasValidPosition;
    }), [employees]);

    useEffect(() => {
        const selected = validEmployees.find(e => String(e.id) === value);
        if (selected && !isOpen) {
            setQuery(getEmployeeDisplayName(selected));
        } else if (!value && !isOpen) {
            setQuery('');
        }
    }, [value, validEmployees, isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                const selected = validEmployees.find(e => String(e.id) === value);
                if (selected) {
                    setQuery(getEmployeeDisplayName(selected));
                } else {
                    setQuery('');
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, validEmployees]);

    const filtered = validEmployees.filter(e => 
        getEmployeeDisplayName(e).toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                        if (value && e.target.value === '') {
                            onChange('');
                        }
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Buscar responsável (digite 2+ letras)"
                    className={`w-full bg-white dark:bg-slate-900 border-0 border-b-2 p-2 outline-none text-sm font-bold transition-all focus:ring-0 rounded-none ${
                        hasError 
                            ? 'border-rose-400 focus:border-rose-500 text-rose-900 dark:text-rose-100' 
                            : value 
                                ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100 focus:border-blue-600'
                                : 'border-slate-200 dark:border-slate-700 focus:border-blue-600 text-slate-700 dark:text-slate-200'
                    }`}
                />
                {value && (
                    <button
                        type="button"
                        onClick={() => {
                            onChange('');
                            setQuery('');
                            setIsOpen(true);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center"
                    >
                        <i className="bi bi-x-lg text-xs" />
                    </button>
                )}
            </div>

            {isOpen && query.length >= 2 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto overflow-x-hidden">
                    {filtered.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                            Nenhum responsável encontrado
                        </div>
                    ) : (
                        <ul className="py-2">
                            {filtered.map(emp => {
                                const isSelected = String(emp.id) === value;
                                return (
                                    <li key={emp.id}>
                                        <button
                                            type="button"
                                            className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                                                isSelected 
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' 
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                            onClick={() => {
                                                onChange(String(emp.id));
                                                setQuery(getEmployeeDisplayName(emp));
                                                setIsOpen(false);
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span>{getEmployeeDisplayName(emp)}</span>
                                                {isSelected && <i className="bi bi-check2 text-emerald-500 text-lg" />}
                                            </div>
                                            {(emp.position || emp.role) && (
                                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                    {emp.position || emp.role}
                                                </div>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default InventoryResponsibleSelect;

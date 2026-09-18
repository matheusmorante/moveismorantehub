import React from 'react';
import Person from '../../../types/person.type';

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
}) => (
    <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-8 min-w-56 rounded-lg border bg-white px-2 text-xs font-bold text-slate-700 outline-none transition-colors focus:ring-2 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 ${
            hasError
                ? 'border-rose-400 ring-2 ring-rose-200 focus:ring-rose-200 dark:border-rose-500'
                : 'border-white/30 focus:ring-emerald-200 dark:focus:ring-emerald-900/40'
        }`}
        aria-label="Responsável pelo inventário"
    >
        <option value="">Selecione um responsável</option>
        {employees
            .filter((employee) => !!employee.position || (employee.role && employee.role !== 'pending'))
            .map((employee) => (
                <option key={employee.id} value={employee.id}>
                    {getEmployeeDisplayName(employee)}
                </option>
            ))}
    </select>
);

export default InventoryResponsibleSelect;

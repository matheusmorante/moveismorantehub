import Person from '../../../types/person.type';

interface InventoryResponsibleSelectProps {
    employees: Person[];
    value: string;
    hasError?: boolean;
    onChange: (value: string) => void;
}

export const getEmployeeDisplayName = (employee?: Person) =>
    employee?.fullName || employee?.socialName || employee?.nickname || 'Responsável não informado';

const InventoryResponsibleSelect = ({ employees, value, onChange, hasError = false }: InventoryResponsibleSelectProps) => (
    <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-8 min-w-56 rounded-lg border bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 ${hasError ? 'border-rose-400 ring-2 ring-rose-200 focus:ring-rose-200' : 'border-white/30 focus:ring-emerald-200'}`}
        aria-label="Responsável pelo inventário"
    >
        <option value="">Selecione um responsável</option>
        {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>{getEmployeeDisplayName(employee)}</option>
        ))}
    </select>
);

export default InventoryResponsibleSelect;

import React from "react";
import Person from "@/pages/types/person.type";
import SmartInput from "@/components/SmartInput";
import { UserRole } from "@/context/AuthContext";
import { EMPLOYEE_ROLES } from "./usePersonForm";

interface PersonEmployeeRolesSectionProps {
    formData: Partial<Person>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Person>>>;
    toggleEmployeeRole: (roleValue: UserRole) => void;
    settings: any;
}

export const PersonEmployeeRolesSection: React.FC<PersonEmployeeRolesSectionProps> = ({
    formData,
    setFormData,
    toggleEmployeeRole,
    settings,
}) => {
    return (
        <div className="md:col-span-2 flex flex-col gap-4 bg-slate-50/80 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <i className="bi bi-shield-lock-fill text-blue-600" />
                        Perfis de Acesso de Usuário (Selecione um ou mais) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                        {(formData.roles || []).length} perfil(is) selecionado(s)
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {EMPLOYEE_ROLES.map((r) => {
                        const isSelected = (formData.roles || [formData.role || 'seller']).includes(r.value);
                        return (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => toggleEmployeeRole(r.value)}
                                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer relative group ${
                                    isSelected
                                        ? 'border-blue-500 bg-blue-50/90 dark:bg-blue-900/40 ring-2 ring-blue-500/20 shadow-sm'
                                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    <i className={`bi ${isSelected ? 'bi-check-lg text-sm font-black' : r.icon + ' text-xs'}`} />
                                </div>
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                        {r.label}
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                                        {r.description}
                                    </div>
                                </div>
                                <div className="absolute top-3 right-3">
                                    <i className={`bi ${isSelected ? 'bi-check-circle-fill text-blue-600 dark:text-blue-400' : 'bi-circle text-slate-300 dark:text-slate-700'} text-xs`} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-1">
                <SmartInput
                    label={`Cargo Principal do Colaborador ${settings.requiredFields.customer?.position ? '*' : ''}`}
                    value={formData.position || ""}
                    onValueChange={(val) => setFormData({ ...formData, position: val })}
                    patterns={['Vendedor', 'Gerente', 'Entregador', 'Montador', 'Auxiliar Administrativo', 'Administrador', 'Financeiro', 'Estoquista']}
                    tableName="people"
                    columnName="position"
                    placeholder="Ex: Vendedor, Gerente Comercial, Montador, Auxiliar..."
                    icon="bi-person-badge"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    <i className="bi bi-info-circle mr-1 text-blue-500"></i>
                    O Cargo Principal define a função profissional do colaborador na empresa (ex: Vendedor, Montador), independente dos Perfis de Acesso ao sistema (onde ele pode ter permissão de Administrador sem problemas).
                </p>
            </div>
        </div>
    );
};

import React, { useState } from "react";
import { PersonVisibilitySettings } from "../../../../types/person.type";

interface PersonTableSettingsProps {
    visibilitySettings: PersonVisibilitySettings;
    toggleVisibility: (column: keyof PersonVisibilitySettings) => void;
    collectionName: string;
    isEmployee: boolean;
}

export const PersonTableSettings: React.FC<PersonTableSettingsProps> = ({
    visibilitySettings,
    toggleVisibility,
    collectionName,
    isEmployee,
}) => {
    const [showSettings, setShowSettings] = useState(false);

    const COLUMN_OPTIONS: { key: keyof PersonVisibilitySettings; label: string }[] = isEmployee
        ? [
              { key: "id", label: isEmployee ? "Código" : "ID" },
              { key: "fullName", label: isEmployee ? "Nome" : "Nome / Razão Social" },
              { key: "cpfCnpj", label: isEmployee ? "CPF" : "CPF/CNPJ" },
              { key: "email", label: "E-mail" },
              { key: "phone", label: "Telefone" },
              { key: "address", label: "Endereço" },
          ]
        : collectionName === "suppliers"
        ? [
              { key: "id", label: "ID" },
              { key: "fullName", label: "Nome / Razão Social" },
              { key: "cpfCnpj", label: "CPF/CNPJ" },
              { key: "products", label: "Produtos" },
          ]
        : [
              { key: "id", label: "ID" },
              { key: "fullName", label: "Nome / Razão Social" },
              { key: "cpfCnpj", label: "CPF/CNPJ" },
              { key: "email", label: "E-mail" },
              { key: "phone", label: "Telefone" },
              { key: "address", label: "Endereço" },
          ];

    const settingsBtnClass = `flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest ${
        showSettings
            ? "border-blue-200 text-blue-600 dark:border-blue-800"
            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
    }`;

    return (
        <div className="relative">
            <button onClick={() => setShowSettings(!showSettings)} className={settingsBtnClass}>
                <i className={`bi ${showSettings ? "bi-eye-slash-fill" : "bi-eye-fill"}`} />
                Visualização
            </button>

            {showSettings && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                    <div className="absolute top-[calc(100%+8px)] right-0 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-2xl p-4 flex flex-col gap-3 z-50 animate-slide-up">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                            Colunas da Tabela
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                            {COLUMN_OPTIONS.map((col) => (
                                <button
                                    key={col.key}
                                    onClick={() => toggleVisibility(col.key)}
                                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 transition-all outline-none"
                                >
                                    <span
                                        className={`text-[11px] font-bold ${
                                            visibilitySettings[col.key]
                                                ? "text-slate-700 dark:text-slate-200"
                                                : "text-slate-300 dark:text-slate-700"
                                        }`}
                                    >
                                        {col.label}
                                    </span>
                                    <div
                                        className={`w-8 h-4 rounded-full p-0.5 transition-colors ${
                                            visibilitySettings[col.key]
                                                ? "bg-blue-600 dark:bg-blue-500"
                                                : "bg-slate-200 dark:bg-slate-800"
                                        }`}
                                    >
                                        <div
                                            className={`w-3 h-3 bg-white dark:bg-slate-300 rounded-full transition-transform ${
                                                visibilitySettings[col.key] ? "translate-x-4" : "translate-x-0"
                                            }`}
                                        />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

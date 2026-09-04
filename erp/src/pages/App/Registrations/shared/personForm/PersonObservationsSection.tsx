import React from "react";
import Person from "@/pages/types/person.type";

interface PersonObservationsSectionProps {
    formData: Partial<Person>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Person>>>;
    collectionName: string;
}

export const PersonObservationsSection: React.FC<PersonObservationsSectionProps> = ({
    formData,
    setFormData,
    collectionName,
}) => {
    if (collectionName === 'employees') {
        return null;
    }

    return (
        <div className="md:col-span-3 mt-4 flex flex-col gap-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-300 border-b border-slate-50 dark:border-slate-800 pb-2 flex items-center gap-2">
                <i className="bi bi-journal-text text-blue-600"></i>
                Observações Importantes
            </h4>
            <textarea
                value={formData.observations || ""}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                rows={4}
                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100 placeholder:font-normal"
                placeholder="Descreva aqui informações extras sobre este cliente, detalhes sobre os contatos de referência ou outras especificações relevantes..."
            />
        </div>
    );
};

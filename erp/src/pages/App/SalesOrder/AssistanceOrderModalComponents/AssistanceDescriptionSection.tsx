import React from "react";
import SmartInput from "../../../../components/SmartInput";
import NoticeInput from "../../../../components/NoticeInput";

interface AssistanceDescriptionSectionProps {
    description: string;
    setDescription: (val: string) => void;
    observation: string;
    setObservation: (val: string) => void;
    assistanceServiceValue: number;
    setAssistanceServiceValue: (val: number) => void;
    assistanceCost: number;
    setAssistanceCost: (val: number) => void;
    errors: Record<string, string>;
}

const AssistanceDescriptionSection = ({
    description,
    setDescription,
    observation,
    setObservation,
    assistanceServiceValue,
    setAssistanceServiceValue,
    assistanceCost,
    setAssistanceCost,
    errors
}: AssistanceDescriptionSectionProps) => (
    <div className="flex flex-col gap-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <i className="bi bi-clipboard-fill text-amber-500" />
            Detalhes da Assistência
        </h3>
        <div className="flex flex-col gap-2 relative group/field">
            <SmartInput
                 label="Descrição do Serviço *"
                 required
                 value={description}
                 onValueChange={(val: string) => setDescription(val)}
                 tableName="orders"
                 columnName="assistanceDescription"
                 placeholder="Descreva o problema ou solicitação..."
                 icon="bi-wrench"
                 error={!!errors.assistanceDescription}
            />
            {errors.assistanceDescription && (
                <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
                    {errors.assistanceDescription}
                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                </div>
            )}
        </div>
        <div className="flex flex-col gap-2 mt-4 px-1">
            <NoticeInput
                label="Avisos Importantes / Alertas"
                value={observation}
                onChange={setObservation}
                placeholder="Alertas de entrega, observações críticas ou raridade..."
            />
        </div>

    </div>
);

export default AssistanceDescriptionSection;

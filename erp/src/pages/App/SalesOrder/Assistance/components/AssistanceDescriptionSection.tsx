import React from 'react';
import SmartInput from '@/components/SmartInput';
import NoticeInput from '@/components/NoticeInput';

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

const AssistanceDescriptionSection: React.FC<AssistanceDescriptionSectionProps> = ({
  description,
  setDescription,
  observation,
  setObservation,
  assistanceServiceValue,
  setAssistanceServiceValue,
  assistanceCost,
  setAssistanceCost,
  errors,
}) => (
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

    <div className="flex flex-col gap-2 mt-1">
      <NoticeInput
        label="Observações Importantes"
        value={observation}
        onChange={setObservation}
        placeholder="Digite uma observação e pressione Enter..."
      />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Valor Cobrado do Serviço (R$)
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 select-none">
            R$
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={assistanceServiceValue || ''}
            onChange={(e) => setAssistanceServiceValue(Math.max(0, parseFloat(e.target.value) || 0))}
            placeholder="0,00"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Custo Interno da Assistência (R$)
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 select-none">
            R$
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={assistanceCost || ''}
            onChange={(e) => setAssistanceCost(Math.max(0, parseFloat(e.target.value) || 0))}
            placeholder="0,00"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>
    </div>
  </div>
);

export default AssistanceDescriptionSection;

import React from 'react';

interface AssemblyResponsibleSelectProps {
  value?: string;
  error?: string;
  selectClassName: string;
  labelClassName?: string;
  errorClassName?: string;
  onChange: (value: string) => void;
}

export const AssemblyResponsibleSelect: React.FC<AssemblyResponsibleSelectProps> = ({
  value,
  error,
  selectClassName,
  labelClassName = 'mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400',
  errorClassName = 'mt-1 block text-[9px] text-red-600 dark:text-red-400',
  onChange,
}) => (
  <>
    <label className={labelClassName}>
      Responsável pela montagem <span className="text-red-500">*</span>
    </label>
    <select
      aria-label="Responsável pela montagem"
      aria-required="true"
      aria-invalid={Boolean(error)}
      required
      className={selectClassName}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Selecione</option>
      <option value="Nossa equipe">Nossa equipe</option>
      <option value="Montador terceirizado">Montador terceirizado</option>
    </select>
    {error && <span className={errorClassName}>{error}</span>}
  </>
);

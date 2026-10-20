import React from 'react';

interface ChoiceDropdownProps {
  options: readonly { id?: string; value: string }[];
  value: string | string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

export const ChoiceDropdown: React.FC<ChoiceDropdownProps> = ({
  options,
  value,
  disabled,
  onChange,
}) => {
  const selectedValue = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');

  return (
    <select
      value={selectedValue}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100"
    >
      <option value="">Selecione uma opção</option>
      {options.map((option) => (
        <option key={option.id || option.value} value={option.value}>
          {option.value}
        </option>
      ))}
    </select>
  );
};

import React from 'react';
import type { ThirdPartyTransporterForm } from './NfeTransportSection';

interface ThirdPartyTransporterFormFieldsProps {
  thirdPartyTransporter: ThirdPartyTransporterForm;
  onThirdPartyTransporterChange: (
    updater: (prev: ThirdPartyTransporterForm) => ThirdPartyTransporterForm
  ) => void;
  disabled?: boolean;
}

const maskCnpjCpf = (value: string, personType: 'PJ' | 'PF'): string => {
  const digits = value.replace(/\D/g, '').slice(0, personType === 'PJ' ? 14 : 11);
  if (personType === 'PJ') {
    if (digits.length > 12)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    if (digits.length > 8)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    if (digits.length > 5) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length > 2) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return digits;
  }
  if (digits.length > 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length > 6) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  return digits;
};

export const ThirdPartyTransporterFormFields: React.FC<ThirdPartyTransporterFormFieldsProps> = ({
  thirdPartyTransporter,
  onThirdPartyTransporterChange,
  disabled = false,
}) => {
  return (
    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
      <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
        Dados do Transportador
      </h5>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Tipo de Pessoa */}
        <div className="sm:col-span-2 flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
            <input
              type="radio"
              name="transporter-person-type"
              value="PJ"
              disabled={disabled}
              checked={thirdPartyTransporter.personType === 'PJ'}
              onChange={() =>
                onThirdPartyTransporterChange((prev) => ({
                  ...prev,
                  personType: 'PJ',
                  cnpjCpf: '',
                }))
              }
              className="accent-blue-600"
            />
            Pessoa Jurídica (CNPJ)
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
            <input
              type="radio"
              name="transporter-person-type"
              value="PF"
              disabled={disabled}
              checked={thirdPartyTransporter.personType === 'PF'}
              onChange={() =>
                onThirdPartyTransporterChange((prev) => ({
                  ...prev,
                  personType: 'PF',
                  cnpjCpf: '',
                }))
              }
              className="accent-blue-600"
            />
            Pessoa Física (CPF)
          </label>
        </div>

        {/* CPF / CNPJ */}
        <div>
          <label
            htmlFor="transporter-cnpj-cpf"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
          >
            {thirdPartyTransporter.personType === 'PJ' ? 'CNPJ' : 'CPF'} *
          </label>
          <input
            id="transporter-cnpj-cpf"
            type="text"
            disabled={disabled}
            value={thirdPartyTransporter.cnpjCpf}
            onChange={(e) =>
              onThirdPartyTransporterChange((prev) => ({
                ...prev,
                cnpjCpf: maskCnpjCpf(e.target.value, prev.personType),
              }))
            }
            placeholder={
              thirdPartyTransporter.personType === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'
            }
            className="w-full rounded-none border-0 border-b-2 border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500"
          />
        </div>

        {/* Nome / Razão Social */}
        <div>
          <label
            htmlFor="transporter-name"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
          >
            Nome / Razão Social *
          </label>
          <input
            id="transporter-name"
            type="text"
            disabled={disabled}
            value={thirdPartyTransporter.name}
            onChange={(e) =>
              onThirdPartyTransporterChange((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            placeholder="Ex: Transportadora Rápida Ltda"
            className="w-full rounded-none border-0 border-b-2 border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500"
          />
        </div>

        {/* Inscrição Estadual */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="transporter-ie"
              className="text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Inscrição Estadual
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                disabled={disabled}
                checked={thirdPartyTransporter.isIeExempt || false}
                onChange={(e) =>
                  onThirdPartyTransporterChange((prev) => ({
                    ...prev,
                    isIeExempt: e.target.checked,
                    ie: e.target.checked ? '' : prev.ie,
                  }))
                }
                className="accent-blue-600"
              />
              Isento
            </label>
          </div>
          <input
            id="transporter-ie"
            type="text"
            disabled={disabled || thirdPartyTransporter.isIeExempt}
            value={thirdPartyTransporter.ie || ''}
            onChange={(e) =>
              onThirdPartyTransporterChange((prev) => ({
                ...prev,
                ie: e.target.value.replace(/\D/g, ''),
              }))
            }
            placeholder={thirdPartyTransporter.isIeExempt ? 'Isento de IE' : 'Somente números'}
            className="w-full rounded-none border-0 border-b-2 border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:border-slate-200"
          />
        </div>

        {/* Endereço */}
        <div>
          <label
            htmlFor="transporter-address"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
          >
            Endereço Completo
          </label>
          <input
            id="transporter-address"
            type="text"
            disabled={disabled}
            value={thirdPartyTransporter.address || ''}
            onChange={(e) =>
              onThirdPartyTransporterChange((prev) => ({
                ...prev,
                address: e.target.value,
              }))
            }
            placeholder="Logradouro, número, bairro"
            className="w-full rounded-none border-0 border-b-2 border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500"
          />
        </div>

        {/* Município */}
        <div>
          <label
            htmlFor="transporter-city"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
          >
            Município
          </label>
          <input
            id="transporter-city"
            type="text"
            disabled={disabled}
            value={thirdPartyTransporter.city || ''}
            onChange={(e) =>
              onThirdPartyTransporterChange((prev) => ({
                ...prev,
                city: e.target.value,
              }))
            }
            placeholder="Ex: Curitiba"
            className="w-full rounded-none border-0 border-b-2 border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500"
          />
        </div>

        {/* UF */}
        <div>
          <label
            htmlFor="transporter-uf"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
          >
            UF
          </label>
          <input
            id="transporter-uf"
            type="text"
            maxLength={2}
            disabled={disabled}
            value={thirdPartyTransporter.uf || ''}
            onChange={(e) =>
              onThirdPartyTransporterChange((prev) => ({
                ...prev,
                uf: e.target.value.toUpperCase(),
              }))
            }
            placeholder="PR"
            className="w-full rounded-none border-0 border-b-2 border-slate-200 bg-white px-3 py-2 text-xs font-mono uppercase outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

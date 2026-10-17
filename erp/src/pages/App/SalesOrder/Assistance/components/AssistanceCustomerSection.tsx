import React from 'react';
import { changeAddressField } from '@/../../shared-utils/addressSelection';
import { PatternFormat as PatternFormatBase } from 'react-number-format';
const PatternFormat = PatternFormatBase as any;

import CustomerData from '@/pages/types/customerData.type';
import { AddressAutocompleteInput } from '@/components/shared/AddressAutocompleteInput';
import SmartInput from '@/components/SmartInput';

interface AssistanceCustomerSectionProps {
  customerData: CustomerData;
  setCustomerData: React.Dispatch<React.SetStateAction<CustomerData>>;
  onOpenSearch?: () => void;
  errors: Record<string, string>;
  isLinked?: boolean;
}

const AssistanceCustomerSection: React.FC<AssistanceCustomerSectionProps> = ({
  customerData,
  setCustomerData,
  errors,
  isLinked,
}) => {
  const updateCustomer = (field: string, value: any) => {
    setCustomerData((current) => ({ ...current, [field]: value }));
  };

  const updateAddress = (field: string, value: any) => {
    setCustomerData((current) => ({
      ...current,
      fullAddress: changeAddressField(current.fullAddress, field, value),
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
        <i className="bi bi-person-fill text-amber-500" />
        Dados do Cliente
      </h3>

      <div className="flex flex-col gap-2 relative group/field">
        <SmartInput
          label="Nome Completo *"
          required
          value={customerData.fullName}
          onValueChange={(val: string) => updateCustomer('fullName', val)}
          tableName="customers"
          columnName="name"
          placeholder="Nome do cliente solicitante..."
          icon="bi-person"
          error={!!errors.customer_fullName}
        />
        {errors.customer_fullName && (
          <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
            {errors.customer_fullName}
            <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 relative group/field">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Telefone / WhatsApp {!customerData.noPhone && <span className="text-red-500">*</span>}
          </label>
          <button
            type="button"
            onClick={() => {
              const newVal = !customerData.noPhone;
              setCustomerData({
                ...customerData,
                noPhone: newVal,
                phone: newVal ? '' : customerData.phone,
              });
            }}
            className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all ${
              customerData.noPhone
                ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {customerData.noPhone ? (
              <>
                <i className="bi bi-phone-mute mr-1" /> S/ Telefone
              </>
            ) : (
              'Não possui?'
            )}
          </button>
        </div>
        <div className="flex gap-2">
          <PatternFormat
            format="(##) #####-####"
            type="tel"
            value={customerData.phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateCustomer('phone', e.target.value)
            }
            placeholder={customerData.noPhone ? 'NÃO POSSUI TELEFONE' : '(00) 00000-0000'}
            disabled={customerData.noPhone}
            className={`w-full border-b-2 bg-transparent py-2 px-1 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none transition-all ${
              errors.customer_phone && !customerData.noPhone
                ? 'border-red-500'
                : 'border-slate-200 dark:border-slate-800 focus:border-amber-400'
            } ${customerData.noPhone ? 'opacity-50 grayscale' : ''}`}
          />
          <button
            type="button"
            onClick={() => {
              if (!customerData.phone || customerData.noPhone) return;
              const cleanPhone = customerData.phone.replace(/\D/g, '');
              const finalPhone =
                cleanPhone.length >= 10 && cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
              window.open(`https://wa.me/${finalPhone}`, '_blank');
            }}
            disabled={customerData.noPhone}
            title="Verificar WhatsApp"
            className={`shrink-0 w-12 flex items-center justify-center bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl transition-all shadow-sm shadow-[#25D366]/30 active:scale-95 ${
              customerData.noPhone ? 'opacity-50 grayscale pointer-events-none' : ''
            }`}
          >
            <i className="bi bi-whatsapp text-lg" />
          </button>
        </div>
      </div>

      <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Endereço da Assistência
          </span>
          <span className="text-[9px] font-bold text-slate-400">
            Local onde será realizado o serviço
          </span>
        </div>

        <AddressAutocompleteInput
          label="Buscar Endereço / CEP"
          onSelectAddress={(data) => {
            setCustomerData((prev) => ({
              ...prev,
              fullAddress: {
                ...prev.fullAddress,
                cep: data.cep || prev.fullAddress?.cep || '',
                street: data.street || prev.fullAddress?.street || '',
                neighborhood: data.neighborhood || prev.fullAddress?.neighborhood || '',
                city: data.city || prev.fullAddress?.city || '',
                state: data.state || prev.fullAddress?.state || '',
              },
            }));
          }}
          placeholder="Digite a rua ou CEP para autocompletar..."
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <SmartInput
              label="Logradouro"
              value={customerData.fullAddress?.street || ''}
              onValueChange={(val: string) => updateAddress('street', val)}
              tableName="customers"
              columnName="street"
              placeholder="Rua / Avenida..."
            />
          </div>
          <div>
            <SmartInput
              label="Número"
              value={customerData.fullAddress?.number || ''}
              onValueChange={(val: string) => updateAddress('number', val)}
              tableName="customers"
              columnName="number"
              placeholder="Nº..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <SmartInput
              label="Bairro"
              value={customerData.fullAddress?.neighborhood || ''}
              onValueChange={(val: string) => updateAddress('neighborhood', val)}
              tableName="customers"
              columnName="neighborhood"
              placeholder="Bairro..."
            />
          </div>
          <div>
            <SmartInput
              label="Cidade"
              value={customerData.fullAddress?.city || ''}
              onValueChange={(val: string) => updateAddress('city', val)}
              tableName="customers"
              columnName="city"
              placeholder="Cidade..."
            />
          </div>
          <div>
            <SmartInput
              label="Complemento"
              value={customerData.fullAddress?.complement || ''}
              onValueChange={(val: string) => updateAddress('complement', val)}
              tableName="customers"
              columnName="complement"
              placeholder="Apto / Bloco..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistanceCustomerSection;

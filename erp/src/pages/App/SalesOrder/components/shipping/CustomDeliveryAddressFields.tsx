import React from 'react';
import { PatternFormat as PatternFormatBase } from 'react-number-format';
import { AddressAutocompleteInput } from '@/components/shared/AddressAutocompleteInput';
import SmartInput from '@/components/SmartInput';
import Shipping from '@/pages/types/Shipping.type';
import { ValidationErrors } from '@/pages/utils/validations';
import { getAddressByCep } from '@/pages/utils/maps';
import { mergeAddressSelection, changeAddressField } from '../../../../../../../shared-utils/addressSelection';
import AddressVerificationMap from '../AddressVerificationMap';

const PatternFormat = PatternFormatBase as any;

export interface CustomDeliveryAddressFieldsProps {
  shipping: Shipping;
  setShipping: React.Dispatch<React.SetStateAction<Shipping>>;
  errors: ValidationErrors;
}

export const CustomDeliveryAddressFields: React.FC<CustomDeliveryAddressFieldsProps> = ({
  shipping,
  setShipping,
  errors,
}) => {
  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cepValue = e.target.value.replace(/\D/g, '');
    if (cepValue.length === 8) {
      try {
        const data = await getAddressByCep(cepValue);
        if (data && !(data as any).error) {
          setShipping((prev) => ({
            ...prev,
            deliveryAddress: {
              ...prev.deliveryAddress!,
              street: data.street || prev.deliveryAddress?.street || '',
              neighborhood: data.neighborhood || prev.deliveryAddress?.neighborhood || '',
              city: data.city || prev.deliveryAddress?.city || '',
              state: (data.state || prev.deliveryAddress?.state || 'PR').toUpperCase(),
            },
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP', error);
      }
    }
  };

  const updateDeliveryAddress = (
    field: keyof NonNullable<Shipping['deliveryAddress']>,
    value: string
  ) => {
    setShipping((prev) => ({
      ...prev,
      deliveryAddress: changeAddressField(prev.deliveryAddress!, field, value),
    }));
  };

  return (
    <div className="mt-0 flex flex-col gap-4 animate-slide-up">
      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
        Endereço de Entrega Alternativo
      </h4>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-[1]">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">
            CEP (opcional)
          </label>
          <PatternFormat
            format="#####-###"
            className="w-full border-b-2 border-slate-200 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors focus:border-blue-600 dark:border-slate-800 dark:text-slate-300 dark:focus:border-blue-500"
            placeholder="00000-000"
            value={shipping.deliveryAddress?.cep || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateDeliveryAddress('cep', e.target.value)
            }
            onBlur={handleCepBlur}
          />
        </div>
        <AddressAutocompleteInput
          value={shipping.deliveryAddress?.street || ''}
          onChange={(val) => updateDeliveryAddress('street', val)}
          addressValue={shipping.deliveryAddress}
          onSelectAddress={(data, baseline) => {
            setShipping((prev) => ({
              ...prev,
              deliveryAddress: mergeAddressSelection(
                prev.deliveryAddress || {
                  street: '',
                  number: '',
                  neighborhood: '',
                  city: '',
                  state: 'PR',
                  cep: '',
                  complement: '',
                  observation: '',
                },
                data,
                baseline
              ),
            }));
          }}
          cityHint={shipping.deliveryAddress?.city}
          stateHint={shipping.deliveryAddress?.state || 'PR'}
          variant="underline"
          hasError={!!errors['deliveryAddress_street']}
          label="Rua/Avenida"
          placeholder="Nome da rua"
          required
          className="flex-[3] relative group/field"
        />
        <div className="flex-[1] relative group/field">
          <label
            className={`text-[10px] font-black uppercase tracking-widest mb-1 ml-1 block ${
              errors['deliveryAddress_number'] ? 'text-red-600 dark:text-red-400' : 'text-slate-400'
            }`}
          >
            Número <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className={`w-full border-b-2 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors dark:text-slate-300 ${
              errors['deliveryAddress_number']
                ? 'border-red-500 focus:border-red-500'
                : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'
            }`}
            placeholder="Ex: 123"
            value={shipping.deliveryAddress?.number || ''}
            onChange={(e) => updateDeliveryAddress('number', e.target.value.replace(/\D/g, ''))}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">
            Complemento
          </label>
          <input
            type="text"
            className="w-full border-b-2 border-slate-200 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors focus:border-blue-600 dark:border-slate-800 dark:text-slate-300 dark:focus:border-blue-500"
            placeholder="Apto, Bloco, etc"
            value={shipping.deliveryAddress?.complement || ''}
            onChange={(e) => updateDeliveryAddress('complement', e.target.value)}
          />
        </div>
        <div className="flex-1 relative group/field">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">
            Bairro
          </label>
          <input
            type="text"
            className={`w-full border-b-2 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors dark:text-slate-300 ${
              errors['deliveryAddress_neighborhood']
                ? 'border-red-500 focus:border-red-500'
                : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'
            }`}
            placeholder="Seu bairro"
            value={shipping.deliveryAddress?.neighborhood || ''}
            onChange={(e) => updateDeliveryAddress('neighborhood', e.target.value)}
          />
        </div>
        <div className="flex-[1.5] relative group/field">
          <label
            className={`text-[10px] font-black uppercase tracking-widest mb-1 ml-1 block ${
              errors['deliveryAddress_city'] ? 'text-red-600 dark:text-red-400' : 'text-slate-400'
            }`}
          >
            Cidade <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`w-full border-b-2 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors dark:text-slate-300 ${
              errors['deliveryAddress_city']
                ? 'border-red-500 focus:border-red-500'
                : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'
            }`}
            placeholder="Nome da cidade"
            value={shipping.deliveryAddress?.city || ''}
            onChange={(e) => updateDeliveryAddress('city', e.target.value)}
          />
        </div>
        <div className="flex-[0.6] relative group/field">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">
            UF
          </label>
          <input
            type="text"
            maxLength={2}
            className="w-full border-b-2 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors dark:text-slate-300 border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500 text-center"
            placeholder="PR"
            value={shipping.deliveryAddress?.state || 'PR'}
            onChange={(e) => updateDeliveryAddress('state', e.target.value.toUpperCase())}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group/field">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block">
            Tipo de Moradia
          </label>
          <select
            className={`w-full border-b-2 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors dark:text-slate-300 ${
              errors['deliveryAddress_housingType']
                ? 'border-red-500 focus:border-red-500'
                : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'
            }`}
            value={shipping.deliveryAddress?.housingType || ''}
            onChange={(e) => updateDeliveryAddress('housingType', e.target.value)}
          >
            <option value="" disabled>
              Selecione o tipo...
            </option>
            <option value="Casa">Casa</option>
            <option value="Apartamento">Apartamento</option>
            <option value="Condomínio Residencial">Condomínio Residencial</option>
            <option value="Kitnet">Kitnet</option>
            <option value="Estabelecimento Comercial">Estabelecimento Comercial</option>
            <option value="Chácara">Chácara</option>
          </select>
        </div>
        <div className="flex-[2]">
          <SmartInput
            label="Ponto de Referência / Observação de Entrega"
            value={shipping.deliveryAddress?.observation || ''}
            onValueChange={(val) => updateDeliveryAddress('observation', val)}
            placeholder="Ex: Casa verde em frente a padaria..."
            icon="bi-geo-alt"
            className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mt-2">
        <div className="flex-1 relative group/field">
          <div className="flex items-center justify-between mb-1 ml-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <i className="bi bi-geo-alt-fill text-red-500" />
              URL manual das coordenadas (se não localizar o endereço)
            </label>
            {shipping.deliveryAddress?.mapsUrl && (
              <a
                href={shipping.deliveryAddress.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <i className="bi bi-box-arrow-up-right" /> Testar Link
              </a>
            )}
          </div>
          <input
            type="url"
            className="w-full border-b-2 border-slate-200 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors focus:border-blue-600 dark:border-slate-800 dark:text-slate-300 dark:focus:border-blue-500 placeholder:font-normal"
            placeholder="Cole o link do ponto com as coordenadas"
            value={shipping.deliveryAddress?.mapsUrl || ''}
            onChange={(e) => updateDeliveryAddress('mapsUrl', e.target.value)}
          />
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            Use somente se a busca não localizar o endereço. No Google Maps, copie o link do ponto marcado pelas coordenadas.
          </p>
        </div>
      </div>

      {/* Address Verification Map for custom address */}
      <div className="mt-2 animate-fade-in">
        <AddressVerificationMap
          address={{
            street: shipping.deliveryAddress?.street || '',
            number: shipping.deliveryAddress?.number || '',
            neighborhood: shipping.deliveryAddress?.neighborhood || '',
            city: shipping.deliveryAddress?.city || '',
          }}
          coords={shipping.deliveryAddress?.coords || shipping.destinationCoords}
          placeId={shipping.deliveryAddress?.placeId}
        />
      </div>
    </div>
  );
};

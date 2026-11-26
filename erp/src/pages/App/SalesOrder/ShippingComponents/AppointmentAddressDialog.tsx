import React from 'react';
import { createPortal } from 'react-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import { PatternFormat } from 'react-number-format';
import { z } from 'zod';
import { AddressAutocompleteInput } from '@/components/shared/AddressAutocompleteInput';
import type FullAddress from '@/pages/types/fullAddress.type';
import { BRAZILIAN_UF_CODES } from '@/pages/utils/shared/brazilianUfCodes';
import { operationDeliveryAddressFormSchema as addressSchema } from '../../../../../../shared-utils/routeFormSchemas';

type AddressFormValues = z.input<typeof addressSchema>;
type AddressFormOutput = z.output<typeof addressSchema>;

const emptyAddress = (): AddressFormValues => ({
  cep: '', street: '', number: '', complement: '', observation: '', neighborhood: '', city: '',
  state: 'PR', housingType: '', mapsUrl: '', googleMapsUrl: '', mapsLink: '', placeId: '',
  formattedAddress: '',
});

const toAddressFormValues = (address?: FullAddress): AddressFormValues => ({
  ...emptyAddress(),
  ...address,
  state: address?.state || 'PR',
});

interface AddressEditorProps {
  title: string;
  initialAddress?: FullAddress;
  onClose: () => void;
  onSave: (address: FullAddress) => void;
}

const AddressEditor: React.FC<AddressEditorProps> = ({ title, initialAddress, onClose, onSave }) => {
  const {
    control,
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<AddressFormValues, unknown, AddressFormOutput>({
    defaultValues: toAddressFormValues(initialAddress),
    resolver: zodResolver(addressSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const address = watch();
  const fieldClass = (invalid: boolean) =>
    `w-full border-b-2 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors dark:text-slate-300 ${invalid ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-500'}`;
  const labelClass = (invalid: boolean) =>
    `mb-1 ml-1 block text-[10px] font-black uppercase tracking-widest ${invalid ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`;
  const updateAddressFromSuggestion = (data: { street: string; number?: string; neighborhood?: string; city?: string; state?: string; cep?: string; placeId?: string; coords?: [number, number]; formattedAddress?: string }) => {
    setValue('street', data.street, { shouldDirty: true, shouldValidate: isSubmitted });
    setValue('number', data.number || '', { shouldDirty: true, shouldValidate: isSubmitted });
    setValue('neighborhood', data.neighborhood || '', { shouldDirty: true });
    setValue('city', data.city || '', { shouldDirty: true, shouldValidate: isSubmitted });
    setValue('state', (data.state || address.state || 'PR').slice(0, 2).toUpperCase(), { shouldDirty: true });
    setValue('cep', data.cep || address.cep || '', { shouldDirty: true });
    setValue('placeId', data.placeId || '', { shouldDirty: true });
    setValue('coords', data.coords, { shouldDirty: true });
    setValue('formattedAddress', data.formattedAddress || '', { shouldDirty: true });
  };

  React.useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', closeOnEscape, true);
    return () => window.removeEventListener('keydown', closeOnEscape, true);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000001] flex items-stretch justify-center bg-slate-950/65 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-address-title"
        data-appointment-address-dialog
        className="flex h-full w-full flex-col overflow-hidden bg-white text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-3xl sm:rounded-2xl sm:border sm:border-slate-200 dark:sm:border-slate-700"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-800">
          <h3 id="appointment-address-title" className="text-base font-bold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar endereço" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </header>

        <form noValidate onSubmit={handleSubmit((values) => onSave(values as FullAddress))} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <label className={labelClass(false)}>CEP</label>
                <Controller
                  control={control}
                  name="cep"
                  render={({ field }) => (
                    <PatternFormat
                      format="#####-###"
                      value={field.value}
                      onValueChange={({ value }: { value: string }) => field.onChange(value)}
                      onBlur={field.onBlur}
                      inputMode="numeric"
                      aria-label="CEP"
                      className={fieldClass(false)}
                      placeholder="00000-000"
                    />
                  )}
                />
              </div>
              <AddressAutocompleteInput
                value={address.street || ''}
                addressValue={address}
                onChange={(value) => setValue('street', value, { shouldDirty: true, shouldValidate: isSubmitted })}
                onSelectAddress={updateAddressFromSuggestion}
                cityHint={address.city}
                stateHint={address.state || 'PR'}
                variant="underline"
                label="Rua/Avenida"
                placeholder="Nome da rua"
                required
                hasError={Boolean(errors.street)}
                validationError={errors.street?.message}
                className="flex flex-col gap-2 sm:col-span-7"
              />
              <div className="sm:col-span-2">
                <label className={labelClass(Boolean(errors.number))}>Número <span className="text-red-500">*</span></label>
                <input {...register('number')} inputMode="numeric" aria-invalid={Boolean(errors.number)} title={errors.number?.message} className={fieldClass(Boolean(errors.number))} placeholder="Ex: 123" />
              </div>
              <div className="sm:col-span-4">
                <label className={labelClass(false)}>Complemento</label>
                <input {...register('complement')} className={fieldClass(false)} placeholder="Apto, bloco, etc." />
              </div>
              <div className="sm:col-span-4">
                <label className={labelClass(false)}>Bairro</label>
                <input {...register('neighborhood')} className={fieldClass(false)} placeholder="Seu bairro" />
              </div>
              <div className="sm:col-span-3">
                <label className={labelClass(Boolean(errors.city))}>Cidade <span className="text-red-500">*</span></label>
                <input {...register('city')} aria-invalid={Boolean(errors.city)} title={errors.city?.message} className={fieldClass(Boolean(errors.city))} placeholder="Nome da cidade" />
              </div>
              <div className="sm:col-span-1">
                <label className={labelClass(false)}>UF</label>
                <select {...register('state')} aria-label="UF" className={`${fieldClass(false)} text-center`}>
                  {BRAZILIAN_UF_CODES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div className="sm:col-span-4">
                <label className={labelClass(false)}>Tipo de moradia</label>
                <select {...register('housingType')} className={fieldClass(false)}>
                  <option value="">Selecione o tipo...</option>
                  <option value="Casa">Casa</option>
                  <option value="Apartamento">Apartamento</option>
                  <option value="Condomínio Residencial">Condomínio Residencial</option>
                  <option value="Kitnet">Kitnet</option>
                  <option value="Estabelecimento Comercial">Estabelecimento Comercial</option>
                  <option value="Chácara">Chácara</option>
                </select>
              </div>
              <div className="sm:col-span-8">
                <label className={labelClass(false)}>Ponto de referência / observação de entrega</label>
                <input {...register('observation')} className={fieldClass(false)} placeholder="Ex: casa verde em frente à padaria" />
              </div>
              <div className="sm:col-span-12">
                <label className={labelClass(false)}>URL manual das coordenadas (opcional)</label>
                <input {...register('mapsUrl')} type="url" className={fieldClass(false)} placeholder="Cole o link do ponto no Google Maps" />
              </div>
            </div>
          </div>
          <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-800">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
            <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700">{initialAddress ? 'Salvar endereço' : 'Adicionar'}</button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
};

interface Props {
  appointmentId: string;
  hideSectionHeader?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  useCustomerAddress?: boolean;
  customerAddress?: FullAddress;
  deliveryAddress?: FullAddress;
  addressError?: string;
  children: React.ReactNode;
  onUseCustomerAddress: (useCustomerAddress: boolean) => void;
  onSaveAddress: (address: FullAddress) => void;
  onRemoveAddress: () => void;
}

export const AppointmentAddressDialog: React.FC<Props> = ({
  appointmentId, hideSectionHeader = false, isExpanded: controlledIsExpanded, onToggleExpanded,
  useCustomerAddress = true, customerAddress, deliveryAddress, children,
  addressError, onUseCustomerAddress, onSaveAddress, onRemoveAddress,
}) => {
  const [editor, setEditor] = React.useState<'add' | 'edit' | null>(null);
  const [localIsExpanded, setLocalIsExpanded] = React.useState(true);
  const isExpanded = controlledIsExpanded ?? localIsExpanded;
  const addressLines = deliveryAddress && [
    [deliveryAddress.street, deliveryAddress.number].filter(Boolean).join(', '),
    deliveryAddress.complement,
    deliveryAddress.neighborhood,
    [deliveryAddress.city, deliveryAddress.state].filter(Boolean).join(' - '),
    deliveryAddress.cep,
  ].filter(Boolean);

  return (
    <section
      aria-labelledby={!hideSectionHeader ? `operation-address-heading-${appointmentId}` : undefined}
      aria-label={hideSectionHeader ? 'Endereço e frete' : undefined}
      className="min-w-0"
    >
      {!hideSectionHeader && (
        <button
          id={`operation-address-heading-${appointmentId}`}
          type="button"
          aria-expanded={isExpanded}
          aria-controls={`operation-address-content-${appointmentId}`}
          onClick={onToggleExpanded ?? (() => setLocalIsExpanded((current) => !current))}
          className="flex min-h-10 w-full items-center justify-between gap-3 border-b border-slate-200 py-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:text-white"
        >
          <span>Endereço e frete</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      )}
      <div
        id={`operation-address-content-${appointmentId}`}
        role="group"
        aria-labelledby={!hideSectionHeader ? `operation-address-heading-${appointmentId}` : undefined}
        aria-label={hideSectionHeader ? 'Endereço e frete' : undefined}
        className={`min-w-0 flex flex-col gap-3 ${isExpanded ? (hideSectionHeader ? '' : 'mt-4 ml-4 sm:ml-6') : 'hidden'}`}
        hidden={!isExpanded}
      >
      <fieldset className="min-w-0">
        <legend
          title={addressError || undefined}
          aria-invalid={Boolean(addressError)}
          className={`mb-2 text-[13px] font-medium ${addressError ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}
        >Endereço</legend>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label
            title={addressError && useCustomerAddress ? addressError : undefined}
            className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${addressError && useCustomerAddress ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}
          >
            <input type="radio" name={`operation-address-${appointmentId}`} checked={useCustomerAddress} onChange={() => onUseCustomerAddress(true)} className="accent-blue-600" />
            Usar o mesmo endereço do cliente
          </label>
          <label
            title={addressError && !useCustomerAddress ? addressError : undefined}
            className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${addressError && !useCustomerAddress ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}
          >
            <input type="radio" name={`operation-address-${appointmentId}`} checked={!useCustomerAddress} onChange={() => onUseCustomerAddress(false)} className="accent-blue-600" />
            Usar endereço diferente
          </label>
        </div>
      </fieldset>

      {useCustomerAddress && customerAddress?.street && (
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Endereço: {[customerAddress.street, customerAddress.number, customerAddress.city, customerAddress.state].filter(Boolean).join(', ')}
        </p>
      )}

      {!useCustomerAddress && (
        <div>
          {deliveryAddress && addressLines?.length ? (
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex min-w-0 gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <div className="min-w-0 text-sm">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Endereço da operação</p>
                  <p className="mt-1 break-words text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{addressLines.join(' · ')}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => setEditor('edit')} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"><Pencil className="h-3.5 w-3.5" /> Editar</button>
                <button type="button" onClick={onRemoveAddress} aria-label="Remover endereço da operação" className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              aria-invalid={Boolean(addressError)}
              title={addressError || undefined}
              onClick={() => setEditor('add')}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-950/30 ${addressError ? 'text-red-600 dark:text-red-400' : 'text-blue-700 dark:text-blue-300'}`}
            >
              <Plus className="h-4 w-4" /> Adicionar endereço
            </button>
          )}
        </div>
      )}

      <div className="border-t border-slate-200 pt-3 dark:border-slate-700">{children}</div>
      </div>
      {editor && <AddressEditor
        key={`${appointmentId}-${editor}`}
        title={editor === 'add' ? 'Adicionar endereço' : 'Editar endereço'}
        initialAddress={editor === 'edit' ? deliveryAddress : undefined}
        onClose={() => setEditor(null)}
        onSave={(address) => { onSaveAddress(address); setEditor(null); }}
      />}
    </section>
  );
};

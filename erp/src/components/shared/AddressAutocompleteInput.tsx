import React, { useState, useRef, useEffect, useId } from 'react';
import { DropdownPortal } from './DropdownPortal';
import { AddressSuggestionsMenu } from './AddressSuggestionsMenu';
import { searchAddressSuggestions, fetchPlaceDetails, normalizeUf } from '@/pages/utils/maps';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import { addressPlaceLookupFormSchema, addressSelectionFormSchema, addressSuggestionsFormSchema, createAddressChoiceFormSchema, routeAddressFormSchema, routeAddressSearchFormSchema } from '../../../../shared-utils/routeFormSchemas';
import { addressSelectionKey, addressStateKey, getSuggestedAddress, mergeAddressSelection, type AddressSelectionBaseline, type AddressSuggestion, type SelectedAddress } from '../../../../shared-utils/addressSelection';
import type { FieldErrors } from 'react-hook-form';

export type AddressSelectedData = SelectedAddress;
interface Props {
  value: string;
  addressValue?: AddressSelectionBaseline;
  onChange: (street: string) => void;
  onSelectAddress: (data: AddressSelectedData, baseline?: AddressSelectionBaseline) => void;
  cityHint?: string; stateHint?: string; label?: string; placeholder?: string;
  required?: boolean; routeUrl?: string; disabled?: boolean; className?: string;
  inputClassName?: string; showLabel?: boolean; variant?: 'default' | 'underline';
  hasError?: boolean; onBlur?: () => void;
}

export const AddressAutocompleteInput: React.FC<Props> = ({
  value, addressValue, onChange, onSelectAddress, cityHint, stateHint = 'PR', label = 'Logradouro',
  placeholder = 'Ex: Rua das Flores, Avenida Brasil, Travessa, Marginal...', required = false,
  routeUrl, disabled = false, className = 'flex flex-col gap-2', inputClassName, showLabel = true,
  variant = 'default', hasError = false, onBlur,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRevision = useRef(0);
  const selectionRevision = useRef(0);
  const mounted = useRef(true);
  const available = useRef<AddressSuggestion[]>([]);
  const activeSelection = useRef<{ baseline: AddressSelectionBaseline; previous: AddressSelectionBaseline } | null>(null);
  const selectedKey = useRef<string | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const inputId = useId();
  const currentAddress = { ...addressValue, street: addressValue?.street ?? value, city: addressValue?.city ?? cityHint, state: addressValue?.state ?? stateHint };
  const latest = useRef({ onChange, onSelectAddress, address: currentAddress, disabled });
  latest.current = { onChange, onSelectAddress, address: currentAddress, disabled };
  const contextKey = JSON.stringify([value, cityHint, stateHint]);
  const searchContext = useRef(contextKey);
  const addressKey = addressStateKey(currentAddress);
  const searchForm = useZodForm(routeAddressSearchFormSchema, { search: value, city: cityHint, state: stateHint });
  const choiceForm = useZodForm(createAddressChoiceFormSchema(suggestions.map(addressSelectionKey)), { choice: '' });
  const selectionForm = useZodForm(addressSelectionFormSchema, { street: value });
  const placeForm = useZodForm(addressPlaceLookupFormSchema, { placeId: '' });
  const clearTimer = () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); searchTimerRef.current = null; };
  const clearSuggestions = () => { available.current = []; setSuggestions([]); setIsOpen(false); };
  const validationMessage = (errors: FieldErrors) => Object.values(flattenFormErrors(errors))[0] || 'Confira o endereço informado.';

  useEffect(() => {
    if (searchContext.current !== contextKey || disabled) {
      searchContext.current = contextKey; searchRevision.current += 1; clearTimer(); clearSuggestions(); setLoading(false);
    }
    const active = activeSelection.current;
    if (disabled || (active && addressKey !== addressStateKey(active.baseline) && addressKey !== addressStateKey(active.previous))) {
      selectionRevision.current += 1; activeSelection.current = null; selectedKey.current = null; setEnriching(false);
    }
  }, [contextKey, addressKey, disabled]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimer(); searchRevision.current += 1; selectionRevision.current += 1; };
  }, []);

  const scheduleSearch = (text: string) => {
    clearTimer(); const revision = ++searchRevision.current;
    searchContext.current = JSON.stringify([text, cityHint, stateHint]);
    clearSuggestions(); setLookupError(null);
    if (latest.current.disabled || text.trim().length < 3) { setLoading(false); return; }
    setLoading(true); setIsOpen(true);
    searchTimerRef.current = setTimeout(async () => {
      searchTimerRef.current = null;
      try {
        const parsed = await searchForm.validateValues({ search: text, city: cityHint, state: stateHint }, (errors) => {
          if (mounted.current && revision === searchRevision.current) setLookupError(validationMessage(errors));
        });
        if (!parsed || !mounted.current || revision !== searchRevision.current || latest.current.disabled) return;
        const response = await withTimeout<unknown[] | null>(searchAddressSuggestions(parsed.search, parsed.city, parsed.state), 15_000, null, 'endereco:buscar');
        if (!mounted.current || revision !== searchRevision.current) return;
        const result = addressSuggestionsFormSchema.safeParse(response);
        if (!result.success) {
          clearSuggestions(); setLookupError('Não foi possível obter sugestões válidas. Informe o endereço manualmente ou tente novamente.'); return;
        }
        available.current = result.data; setSuggestions(result.data); setIsOpen(true);
      } catch {
        if (mounted.current && revision === searchRevision.current) { clearSuggestions(); setLookupError('Não foi possível pesquisar o endereço. Informe os dados manualmente ou tente novamente.'); }
      } finally {
        if (mounted.current && revision === searchRevision.current) setLoading(false);
      }
    }, 600);
  };
  const handleInputChange = (text: string) => {
    if (latest.current.disabled) return;
    selectionRevision.current += 1; activeSelection.current = null; selectedKey.current = null; setEnriching(false);
    scheduleSearch(text); latest.current.onChange(text);
  };

  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    if (latest.current.disabled) return;
    const key = addressSelectionKey(suggestion);
    if (selectedKey.current === key) return;
    selectedKey.current = key;
    const revision = ++selectionRevision.current;
    const previous = { ...latest.current.address };
    const showSelectionError = (errors: FieldErrors) => {
      if (mounted.current && revision === selectionRevision.current) setLookupError(validationMessage(errors));
    };
    searchRevision.current += 1; clearTimer(); setLoading(false); setIsOpen(false); setLookupError(null);
    try {
      const choice = await choiceForm.validateValues({ choice: key }, showSelectionError);
      if (!choice || !mounted.current || revision !== selectionRevision.current) return;
      const chosen = available.current.find((option) => addressSelectionKey(option) === choice.choice);
      if (!chosen) { setLookupError('Selecione um endereço da busca atual.'); return; }
      const candidate = getSuggestedAddress(chosen, cityHint, stateHint);
      const base = await selectionForm.validateValues({ ...candidate, state: normalizeUf(candidate.state) }, showSelectionError);
      if (!base || !mounted.current || revision !== selectionRevision.current) return;
      if (addressStateKey(latest.current.address) !== addressStateKey(previous)) return;
      const baseline = mergeAddressSelection(previous, base);
      activeSelection.current = { previous, baseline };
      clearSuggestions(); latest.current.onChange(base.street); latest.current.onSelectAddress(base);
      if (!base.placeId) return;
      const lookup = await placeForm.validateValues({ placeId: base.placeId }, showSelectionError);
      if (!lookup || !mounted.current || revision !== selectionRevision.current) return;
      setEnriching(true);
      const response = await withTimeout(fetchPlaceDetails(lookup.placeId), 15_000, null, 'endereco:detalhes');
      if (!mounted.current || revision !== selectionRevision.current) return;
      const details = routeAddressFormSchema.safeParse(response);
      if (!details.success || (details.data.placeId && details.data.placeId !== lookup.placeId)) {
        setLookupError('Não foi possível completar o endereço. Os dados selecionados foram mantidos; confira número e CEP.'); return;
      }
      const data = details.data;
      const refined = await selectionForm.validateValues({
        street: data.street || base.street, number: data.number || base.number,
        neighborhood: data.neighborhood || base.neighborhood, city: data.city || base.city,
        state: normalizeUf(data.state || base.state), cep: data.cep || base.cep,
        coords: data.coords || base.coords, placeId: base.placeId,
        formattedAddress: data.formattedAddress || base.formattedAddress,
      }, showSelectionError);
      if (!refined || !mounted.current || revision !== selectionRevision.current) return;
      const currentKey = addressStateKey(latest.current.address);
      if (currentKey !== addressStateKey(baseline) && currentKey !== addressStateKey(previous)) return;
      activeSelection.current = null;
      latest.current.onSelectAddress(refined, baseline);
    } catch {
      if (mounted.current && revision === selectionRevision.current) setLookupError('Não foi possível aplicar o endereço. Confira os dados informados.');
    } finally {
      if (mounted.current && revision === selectionRevision.current) { activeSelection.current = null; selectedKey.current = null; setEnriching(false); }
    }
  };

  const resolvedInputClass =
    inputClassName ||
    (variant === 'underline'
      ? `w-full border-b-2 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors dark:text-slate-300 ${hasError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`
      : `w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border ${hasError ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-blue-500'} rounded-2xl outline-none transition-all text-sm font-bold dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:font-normal disabled:opacity-60`);

  return (
    <div className={className} ref={wrapperRef}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className={
              variant === 'underline'
                ? 'text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block'
                : 'text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500'
            }
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {routeUrl && (
            <a
              href={routeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[9px] font-black uppercase leading-none tracking-wider text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              title="Ver rota no Google Maps"
            >
              <i className="bi bi-geo-alt-fill" />
              <span>Rota</span>
            </a>
          )}
        </div>
      )}

      <div className="relative w-full">
        <input
          id={inputId}
          aria-label={showLabel ? undefined : label}
          aria-invalid={hasError}
          aria-describedby={lookupError ? inputId + '-error' : undefined}
          aria-required={required}
          type="text"
          value={value || ''}
          disabled={disabled}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true); else if (!disabled && value.trim().length >= 3) scheduleSearch(value);
          }}
          onBlur={onBlur}
          placeholder={placeholder}
          className={resolvedInputClass}
        />

        {(loading || enriching) && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {enriching && <p role="status" className="text-xs text-slate-500">Completando endereço...</p>}
      {lookupError && <p id={inputId + '-error'} role="alert" className="text-xs text-red-600 dark:text-red-400">{lookupError}</p>}
      <DropdownPortal anchorRef={wrapperRef} isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <AddressSuggestionsMenu
          suggestions={suggestions}
          loading={loading}
          onSelect={(s) => void handleSelectSuggestion(s)}
        />
      </DropdownPortal>
    </div>
  );
};

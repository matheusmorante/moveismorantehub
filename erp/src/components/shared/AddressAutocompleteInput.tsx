import React, { useState, useRef, useEffect } from 'react';
import { DropdownPortal } from './DropdownPortal';
import { AddressSuggestionsMenu } from './AddressSuggestionsMenu';
import { searchAddressSuggestions, fetchPlaceDetails } from '@/pages/utils/maps';

export interface AddressSelectedData {
    street: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
    placeId?: string;
    coords?: [number, number];
    mapsUrl?: string;
    formattedAddress?: string;
}

interface Props {
    value: string;
    onChange: (street: string) => void;
    onSelectAddress: (data: AddressSelectedData) => void;
    cityHint?: string;
    stateHint?: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
    routeUrl?: string;
    disabled?: boolean;
    className?: string;
    inputClassName?: string;
    showLabel?: boolean;
    variant?: 'default' | 'underline';
    hasError?: boolean;
    onBlur?: () => void;
}

export const AddressAutocompleteInput: React.FC<Props> = ({
    value,
    onChange,
    onSelectAddress,
    cityHint,
    stateHint = 'PR',
    label = 'Logradouro',
    placeholder = 'Ex: Rua das Flores, Avenida Brasil...',
    required = false,
    routeUrl,
    disabled = false,
    className = 'flex flex-col gap-2',
    inputClassName,
    showLabel = true,
    variant = 'default',
    hasError = false,
    onBlur,
}) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchTimerRef = useRef<any>(null);
    const lastSearchValRef = useRef<string>('');

    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (val: string) => {
        onChange(val);
        lastSearchValRef.current = val;

        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }

        if (val.trim().length >= 2) {
            setLoading(true);
            setIsOpen(true);

            searchTimerRef.current = setTimeout(async () => {
                try {
                    const results = await searchAddressSuggestions(val, cityHint, stateHint);
                    if (lastSearchValRef.current === val) {
                        setSuggestions(results);
                        setIsOpen(results.length > 0);
                    }
                } catch {
                    if (lastSearchValRef.current === val) {
                        setSuggestions([]);
                        setIsOpen(false);
                    }
                } finally {
                    if (lastSearchValRef.current === val) {
                        setLoading(false);
                    }
                }
            }, 300);
        } else {
            setSuggestions([]);
            setIsOpen(false);
            setLoading(false);
        }
    };

    const handleSelectSuggestion = async (suggestion: any) => {
        setIsOpen(false);

        let streetName = suggestion.address?.road || suggestion.display_name.split(',')[0];
        let neighborhood = suggestion.address?.suburb || suggestion.address?.neighbourhood || '';
        let city = suggestion.address?.city || cityHint || 'Colombo';
        let state = suggestion.address?.state || stateHint || 'PR';
        let cep = suggestion.address?.postcode || '';
        let number = '';
        let coords: [number, number] | undefined = undefined;

        if (suggestion.place_id) {
            try {
                const details = await fetchPlaceDetails(suggestion.place_id);
                if (details) {
                    if (details.street) streetName = details.street;
                    if (details.neighborhood) neighborhood = details.neighborhood;
                    if (details.city) city = details.city;
                    if (details.state) state = details.state;
                    if (details.cep) cep = details.cep;
                    if (details.number) number = details.number;
                    if (details.coords) coords = details.coords;
                }
            } catch (e) {
                console.warn("AddressAutocompleteInput: erro ao buscar detalhes Places API:", e);
            }
        }

        // Garante que o estado seja preenchido e formatado em maiúsculas (padrão PR)
        state = (state || stateHint || 'PR').trim().toUpperCase();

        const mapsQuery = encodeURIComponent(`${streetName}${number ? ', ' + number : ''}, ${neighborhood}, ${city} - ${state}`);
        const generatedMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

        onChange(streetName);

        onSelectAddress({
            street: streetName,
            number,
            neighborhood,
            city,
            state,
            cep,
            placeId: suggestion.place_id,
            coords,
            mapsUrl: generatedMapsUrl,
            formattedAddress: suggestion.display_name,
        });
    };

    const resolvedInputClass = inputClassName || (
        variant === 'underline'
            ? `w-full border-b-2 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors dark:text-slate-300 ${hasError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`
            : `w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border ${hasError ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-blue-500'} rounded-2xl outline-none transition-all text-sm font-bold dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:font-normal disabled:opacity-60`
    );

    return (
        <div className={className} ref={wrapperRef}>
            {showLabel && (
                <div className="flex items-center justify-between">
                    <label className={variant === 'underline' ? 'text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 block' : 'text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500'}>
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
                    type="text"
                    value={value || ''}
                    disabled={disabled}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => {
                        if (suggestions.length > 0) setIsOpen(true);
                    }}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    className={resolvedInputClass}
                />

                {loading && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            <DropdownPortal anchorRef={wrapperRef} isOpen={isOpen}>
                <AddressSuggestionsMenu
                    suggestions={suggestions}
                    loading={loading}
                    onSelect={(s) => void handleSelectSuggestion(s)}
                />
            </DropdownPortal>
        </div>
    );
};

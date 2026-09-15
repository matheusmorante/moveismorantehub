import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { saveAttributeValue } from '@/pages/utils/variationService';
import type { DbAttributeValueItem } from './VariationIdentificationTab';

interface VariationAttributeValueInputProps {
    readonly attributeId?: string;
    readonly attributeName?: string;
    readonly value: string;
    readonly registeredValues: readonly DbAttributeValueItem[];
    readonly onChange: (newValue: string) => void;
    readonly onValueRegistered?: (created: DbAttributeValueItem) => void;
}

export const VariationAttributeValueInput: React.FC<VariationAttributeValueInputProps> = ({
    attributeId,
    attributeName,
    value,
    registeredValues,
    onChange,
    onValueRegistered
}) => {
    const [isOpenSuggestions, setIsOpenSuggestions] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const trimmedValue = (value || '').trim();

    // Verifica se o valor coincide com algum valor cadastrado para este atributo
    const isRegisteredValue = Boolean(
        trimmedValue &&
        registeredValues.some(
            (v) => v.value.trim().toLocaleLowerCase('pt-BR') === trimmedValue.toLocaleLowerCase('pt-BR')
        )
    );

    // Valor digitado mas ainda não existente no catálogo deste atributo
    const isUnregisteredValue = Boolean(trimmedValue && attributeId && !isRegisteredValue);

    // Fechar sugestões ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpenSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRegisterNewValue = async () => {
        if (!attributeId || !trimmedValue || isSaving) return;

        setIsSaving(true);
        try {
            const saved = await saveAttributeValue(attributeId, trimmedValue);
            onChange(saved.value);
            onValueRegistered?.(saved);
            setIsOpenSuggestions(false);
            toast.success(`Valor "${saved.value}" cadastrado com sucesso!`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erro ao cadastrar valor';
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (isUnregisteredValue) {
                void handleRegisterNewValue();
            } else {
                setIsOpenSuggestions(false);
            }
        } else if (e.key === 'Escape') {
            setIsOpenSuggestions(false);
        }
    };

    const term = trimmedValue.toLocaleLowerCase('pt-BR');
    const suggestions = registeredValues.filter((option) =>
        option.value.toLocaleLowerCase('pt-BR').includes(term)
    );

    return (
        <div ref={containerRef} className="relative flex-1 space-y-1">
            <label className="text-[9px] text-slate-400 font-bold uppercase block">Valor</label>

            <div className="relative flex items-center">
                <input
                    type="text"
                    placeholder={attributeName ? `Valor de ${attributeName}...` : "Pesquise ou informe um valor..."}
                    value={value}
                    onFocus={() => setIsOpenSuggestions(true)}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setIsOpenSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    className={`w-full bg-transparent border-b-2 border-t-0 border-x-0 outline-none px-1 py-2 pr-8 text-xs font-bold transition-all ${
                        isRegisteredValue
                            ? 'border-emerald-500 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 focus:border-emerald-600 dark:focus:border-emerald-300'
                            : isUnregisteredValue
                            ? 'border-amber-400 dark:border-amber-500/80 text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-400'
                    }`}
                />

                {/* Ícone de check verde quando o valor é confirmado/cadastrado */}
                {isRegisteredValue && (
                    <span
                        className="absolute right-1 bottom-2.5 flex items-center justify-center text-emerald-600 dark:text-emerald-400 pointer-events-none animate-in fade-in"
                        title="Valor cadastrado e selecionado"
                        data-testid="attribute-registered-check"
                    >
                        <i className="bi bi-check-lg text-base font-black" />
                    </span>
                )}

                {/* Botão de check para cadastrar valor quando não existe */}
                {isUnregisteredValue && (
                    <button
                        type="button"
                        onClick={() => void handleRegisterNewValue()}
                        disabled={isSaving}
                        className="absolute right-1 bottom-2 p-1 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-50"
                        title="Cadastrar este valor"
                        aria-label="Cadastrar este valor"
                        data-testid="attribute-register-button"
                    >
                        {isSaving ? (
                            <i className="bi bi-arrow-repeat animate-spin text-xs" />
                        ) : (
                            <i className="bi bi-check-lg text-xs font-black" />
                        )}
                    </button>
                )}
            </div>

            {/* Aviso embaixo do input quando o valor não está cadastrado */}
            {isUnregisteredValue && (
                <p
                    className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1 animate-in fade-in"
                    data-testid="attribute-unregistered-notice"
                >
                    <i className="bi bi-exclamation-circle text-[10px] shrink-0" />
                    <span>Esse valor não está cadastrado. Deseja cadastrar?</span>
                </p>
            )}

            {/* Lista suspensa de sugestões existentes */}
            {isOpenSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-30 mt-1 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in">
                    {suggestions.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpenSuggestions(false);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 transition-colors flex items-center justify-between"
                        >
                            <span>{option.value}</span>
                            {trimmedValue.toLocaleLowerCase('pt-BR') === option.value.toLocaleLowerCase('pt-BR') && (
                                <i className="bi bi-check-lg text-emerald-600 dark:text-emerald-400 text-xs font-black" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

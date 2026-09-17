import React from 'react';
import { Attribute } from './utils';

interface AttributeConflictResolverProps {
    readonly hasConflict: boolean;
    readonly attributes: Attribute[];
    readonly onAddAttribute: () => void;
    readonly onUpdateAttribute: (index: number, field: 'name' | 'value', value: string) => void;
}

export const AttributeConflictResolver: React.FC<AttributeConflictResolverProps> = ({
    hasConflict,
    attributes,
    onAddAttribute,
    onUpdateAttribute
}) => {
    if (!hasConflict) return null;

    return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
            <p className="text-xs font-bold text-red-800 dark:text-red-200">
                Já existe uma variação neste produto pai com esta mesma combinação de atributos.
            </p>
            <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                Escolha um novo atributo ou valor antes de continuar.
            </p>
            <div className="mt-3 space-y-2">
                {attributes.length === 0 ? (
                    <button
                        type="button"
                        onClick={onAddAttribute}
                        className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 cursor-pointer"
                    >
                        <i className="bi bi-plus-lg mr-1" /> Adicionar atributo
                    </button>
                ) : (
                    attributes.map((attribute, index) => (
                        <div className="grid grid-cols-2 gap-2" key={`${attribute.name}-${index}`}>
                            <input
                                value={attribute.name}
                                onChange={(event) => onUpdateAttribute(index, 'name', event.target.value)}
                                placeholder="Atributo (Ex: Cor)"
                                className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs dark:border-red-900 dark:bg-slate-900 focus:outline-none focus:border-red-400"
                            />
                            <input
                                value={attribute.value}
                                onChange={(event) => onUpdateAttribute(index, 'value', event.target.value)}
                                placeholder="Valor (Ex: Azul)"
                                className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs dark:border-red-900 dark:bg-slate-900 focus:outline-none focus:border-red-400"
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

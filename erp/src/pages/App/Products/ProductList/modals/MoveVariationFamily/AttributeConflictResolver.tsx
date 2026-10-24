import React from 'react';
import { canAddVariationFamilyAttribute, type Attribute } from './utils';

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
  onUpdateAttribute,
}) => {
  const canAddAttribute = canAddVariationFamilyAttribute(attributes);

  return (
    <div className={`rounded-2xl border p-4 ${hasConflict ? 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'}`}>
      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
        {hasConflict ? 'Já existe uma variação neste produto pai com esta mesma combinação de características.' : 'Características da variação'}
      </p>
      <p className="mt-1 text-xs text-red-700 dark:text-red-300">
        {hasConflict ? 'Escolha uma nova característica ou valor antes de continuar.' : 'Informe ao menos uma característica completa para identificar a variação no novo produto pai.'}
      </p>
      <div className="mt-3 space-y-2">
        {canAddAttribute ? (
          <button
            type="button"
            onClick={onAddAttribute}
            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 cursor-pointer"
          >
            <i className="bi bi-plus-lg mr-1" /> Adicionar característica
          </button>
        ) : (
          attributes.map((attribute, index) => (
            <div className="grid grid-cols-2 gap-2" key={index}>
              <input
                value={attribute.name}
                aria-label={`Nome da característica ${index + 1}`}
                onChange={(event) => onUpdateAttribute(index, 'name', event.target.value)}
                placeholder="Característica (Ex: Cor)"
                className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs dark:border-red-900 dark:bg-slate-900 focus:outline-none focus:border-red-400"
              />
              <input
                value={attribute.value}
                aria-label={`Valor da característica ${index + 1}`}
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

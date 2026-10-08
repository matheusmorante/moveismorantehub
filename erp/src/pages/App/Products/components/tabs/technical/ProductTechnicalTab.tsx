import React, { useEffect, useState } from 'react';
import { Product } from '../../../../../types/product.type';
import { syncVariationsWithParent } from '../../../domain/variationParentSync';
import {
  TechnicalFieldDefinition,
  getApplicableTechnicalFields,
  groupTechnicalFields,
} from '@/pages/utils/technicalValuesService';
import { buildProductVariationName } from '@/pages/utils/productVariationDefaults';
import { toTitleCase } from '@/pages/utils/textUtils';
import { fetchTechnicalFieldDefinitions } from '../../../services/technicalFieldService';
import { TechnicalFieldInput } from './TechnicalFieldInput';
import { AttributeManagementModal } from '../../modals/attributes/AttributeManagementModal';

interface ProductTechnicalTabProps {
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly handleImproveDescriptionWithAI?: () => void;
  readonly isImprovingDescription?: boolean;
  readonly requiredFieldsOnly?: boolean;
  readonly validationErrors?: Record<string, boolean>;
}

type VariationNameState = {
  name?: string;
  title?: string;
  marketplaceTitle?: string;
  attributes?: Array<{ name?: string; value?: unknown; showName?: boolean }>;
  technicalValues?: Record<string, unknown>;
};

const normalizeTechnicalName = (value: string): string =>
  value.trim().toLocaleLowerCase('pt-BR');

const normalizeSearchTerm = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

const getCharacteristicText = (value: unknown): string => {
  const rawValue =
    value && typeof value === 'object'
      ? ((value as { value?: unknown; val?: unknown }).value ??
        (value as { val?: unknown }).val ??
        '')
      : value;
  return String(rawValue ?? '').trim();
};

const getTechnicalCharacteristicText = (
  values: Record<string, unknown> | undefined,
  characteristicName: string
): string => {
  const entry = Object.entries(values || {}).find(
    ([name]) => normalizeTechnicalName(name) === normalizeTechnicalName(characteristicName)
  );
  return getCharacteristicText(entry?.[1]);
};

const getVariationCharacteristicText = (
  variation: VariationNameState,
  characteristicName: string,
  fallbackValue: string
): string => {
  const attribute = (variation.attributes || []).find(
    ({ name }) => normalizeTechnicalName(name || '') === normalizeTechnicalName(characteristicName)
  );
  return (
    getCharacteristicText(attribute?.value) ||
    getTechnicalCharacteristicText(variation.technicalValues, characteristicName) ||
    fallbackValue
  );
};

const getVariationNameComplement = (variationName: string, parentName: string): string => {
  if (
    !parentName ||
    !variationName.toLocaleLowerCase('pt-BR').startsWith(parentName.toLocaleLowerCase('pt-BR'))
  ) {
    return variationName.trim();
  }
  return variationName.slice(parentName.length).replace(/^[\s\-–—_:]+/u, '').trim();
};

const ProductTechnicalTab: React.FC<ProductTechnicalTabProps> = ({
  formData,
  setFormData,
  handleImproveDescriptionWithAI,
  isImprovingDescription,
  requiredFieldsOnly = false,
  validationErrors,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [allTechnicalFields, setAllTechnicalFields] = useState<TechnicalFieldDefinition[]>([]);
  const [manualFieldNames, setManualFieldNames] = useState<string[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [characteristicSearchTerm, setCharacteristicSearchTerm] = useState('');
  const [debouncedCharacteristicSearchTerm, setDebouncedCharacteristicSearchTerm] = useState('');

  // Campos clássicos que as variações podem herdar do pai
  const SYNCED_FIELDS = new Set<keyof Product>([
    'description',
    'width',
    'height',
    'depth',
    'weight',
  ]);

  const handleFieldChange = <K extends keyof Product>(field: K, value: Product[K]) => {
    setFormData((prev) => {
      const next: Partial<Product> = { ...prev, [field]: value };
      if (SYNCED_FIELDS.has(field) && next.variations?.length) {
        next.variations = syncVariationsWithParent(next.variations, {
          description: next.description,
          width: next.width,
          height: next.height,
          depth: next.depth,
          weight: next.weight,
        });
      }
      return next;
    });
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedCharacteristicSearchTerm(characteristicSearchTerm),
      300
    );
    return () => window.clearTimeout(timeoutId);
  }, [characteristicSearchTerm]);

  // Carregar Informações Técnicas cadastradas e seus vínculos de categoria
  useEffect(() => {
    let isMounted = true;

    const loadFields = async () => {
      setLoadingFields(true);
      try {
        const mapped = await fetchTechnicalFieldDefinitions('product-form');
        if (!isMounted) return;

        setAllTechnicalFields(mapped);
        setFormData((prev) => {
          const technicalValues = { ...(prev.technicalValues || {}) };
          let changed = false;
          mapped
            .filter((field) => field.isRequired && field.active !== false)
            .forEach((field) => {
              if (!Object.prototype.hasOwnProperty.call(technicalValues, field.name)) {
                technicalValues[field.name] = '';
                changed = true;
              }
            });
          return changed ? { ...prev, technicalValues } : prev;
        });
      } catch (err) {
        console.error('Erro ao carregar Características:', err);
      } finally {
        if (isMounted) setLoadingFields(false);
      }
    };

    loadFields();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Exibe características vinculadas às categorias selecionadas, preservando dados existentes.
  const applicableFields = getApplicableTechnicalFields(
    allTechnicalFields,
    formData.categoryIds || [],
    formData.technicalValues || {},
    manualFieldNames
  );
  const visibleFields = requiredFieldsOnly
    ? applicableFields.filter((field) => field.isRequired)
    : applicableFields;
  const requiredFieldGroups = groupTechnicalFields(
    visibleFields.filter((field) => field.isRequired)
  );
  const optionalFields = visibleFields.filter((field) => !field.isRequired);
  const normalizedSearchTerm = normalizeSearchTerm(characteristicSearchTerm);
  const normalizedDebouncedSearchTerm = normalizeSearchTerm(debouncedCharacteristicSearchTerm);
  const matchingOptionalFields =
    !requiredFieldsOnly &&
    normalizedSearchTerm.length >= 3 &&
    normalizedSearchTerm === normalizedDebouncedSearchTerm
      ? optionalFields
          .filter((field) => normalizeSearchTerm(field.name).includes(normalizedDebouncedSearchTerm))
          .slice(0, 3)
      : [];
  const fieldGroups = [
    ...requiredFieldGroups,
    ...(matchingOptionalFields.length > 0
      ? [{ title: 'Resultados da busca', fields: matchingOptionalFields }]
      : []),
  ];

  const handleTechnicalValueChange = (fieldName: string, value: any) => {
    setFormData((prev) => {
      const currentTech = { ...(prev.technicalValues || {}) };
      if (value === undefined || value === null) {
        delete currentTech[fieldName];
      } else {
        currentTech[fieldName] = value;
      }
      const next: Partial<Product> = {
        ...prev,
        technicalValues: currentTech,
      };
      if (/^marca$/i.test(fieldName.trim())) {
        next.brand = typeof value === 'string' ? value : String(value || '');
      }
      return next;
    });
  };

  const handleAddManualField = (field: TechnicalFieldDefinition) => {
    setManualFieldNames((prev) => Array.from(new Set([...prev, field.name])));
    handleTechnicalValueChange(field.name, '');
    setCharacteristicSearchTerm('');
  };

  const handleRemoveManualField = (fieldName: string) => {
    setManualFieldNames((prev) => prev.filter((name) => name !== fieldName));
    handleTechnicalValueChange(fieldName, undefined);
  };

  const handleToggleDepthLength = (currentField: TechnicalFieldDefinition) => {
    const isProfundidade = currentField.name.toLowerCase() === 'profundidade';
    const newName = isProfundidade ? 'Comprimento' : 'Profundidade';
    const oldName = currentField.name;

    const newFieldDef = allTechnicalFields.find(
      (f) => f.name.toLowerCase() === newName.toLowerCase()
    );
    if (!newFieldDef) {
      console.warn(`Campo '${newName}' não encontrado no cadastro global de características.`);
      return;
    }
    const actualNewName = newFieldDef.name;

    const currentValue = formData.technicalValues?.[oldName];

    setFormData((prev) => {
      const tv = { ...(prev.technicalValues || {}) };
      if (currentValue !== undefined) {
        tv[actualNewName] = currentValue;
      } else {
        tv[actualNewName] = '';
      }
      delete tv[oldName];
      return { ...prev, technicalValues: tv };
    });

    setManualFieldNames((prev) => {
      const filtered = prev.filter((n) => n !== oldName && n !== actualNewName);
      return [...filtered, actualNewName];
    });
  };

  const handleUseCharacteristicInVariationName = (
    characteristicName: string,
    selectedValue: unknown
  ) => {
    const fallbackValue = getCharacteristicText(selectedValue);
    setFormData((previous) => {
      const parentName = previous.name || previous.description || '';
      const variations = previous.variations || [];
      let changed = false;

      const nextVariations = variations.map((variation) => {
        const attributes = [...(variation.attributes || [])];
        const normalizedName = normalizeTechnicalName(characteristicName);
        const attributeIndex = attributes.findIndex(
          ({ name }) => normalizeTechnicalName(name || '') === normalizedName
        );
        const existingAttribute = attributeIndex >= 0 ? attributes[attributeIndex] : undefined;
        const value =
          getCharacteristicText(existingAttribute?.value) ||
          getTechnicalCharacteristicText(variation.technicalValues, characteristicName) ||
          fallbackValue;
        if (!value) return variation;

        const nextAttribute = {
          name: existingAttribute?.name || toTitleCase(characteristicName),
          value,
          showName: true,
        };
        if (attributeIndex >= 0) {
          attributes[attributeIndex] = nextAttribute;
        } else {
          attributes.push(nextAttribute);
        }

        const currentName = variation.name || '';
        const currentComplement = getVariationNameComplement(currentName, parentName);
        const colorAlreadyIncluded = normalizeSearchTerm(currentComplement).includes(
          normalizeSearchTerm(value)
        );
        const nextComplement = colorAlreadyIncluded
          ? currentComplement
          : [currentComplement, value].filter(Boolean).join(' ');
        const nextName = buildProductVariationName(parentName, nextComplement);
        const attributeChanged =
          !existingAttribute ||
          existingAttribute.value !== value ||
          existingAttribute.showName === false;
        const nameChanged = nextName !== currentName;
        if (!attributeChanged && !nameChanged) return variation;

        changed = true;
        return {
          ...variation,
          attributes,
          name: nextName,
          ...(variation.title === currentName ? { title: nextName } : {}),
          ...(variation.marketplaceTitle === currentName ? { marketplaceTitle: nextName } : {}),
        };
      });

      return changed ? { ...previous, variations: nextVariations } : previous;
    });
  };

  const characteristicSearchControl = !requiredFieldsOnly ? (
    <div className="w-full max-w-xl space-y-1.5">
      <label
        htmlFor="technical-characteristic-search"
        className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400"
      >
        Pesquisar característica
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
        <i className="bi bi-search text-slate-400" aria-hidden="true" />
        <input
          id="technical-characteristic-search"
          type="search"
          value={characteristicSearchTerm}
          onChange={(event) => setCharacteristicSearchTerm(event.target.value)}
          placeholder="Digite pelo menos 3 caracteres"
          aria-describedby="technical-characteristic-search-hint"
          className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
      </div>
      <p
        id="technical-characteristic-search-hint"
        className="text-[10px] text-slate-400 dark:text-slate-500"
        aria-live="polite"
      >
        {normalizedSearchTerm.length < 3
          ? 'Digite pelo menos 3 caracteres para pesquisar.'
          : normalizedSearchTerm !== normalizedDebouncedSearchTerm
            ? 'Buscando características...'
            : matchingOptionalFields.length === 0
              ? 'Nenhuma característica encontrada.'
              : 'Exibindo até 3 características correspondentes.'}
      </p>
    </div>
  ) : null;

  const hasCategory = (formData.categoryIds || []).length > 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Características */}
      <div className="flex flex-col gap-4">
        {loadingFields ? (
          <div className="py-8 text-center text-slate-400 text-xs font-bold animate-pulse">
            <i className="bi bi-arrow-clockwise animate-spin mr-2" />
            Carregando especificações técnicas...
          </div>
        ) : visibleFields.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2">
            <i className="bi bi-info-circle text-lg text-slate-400" />
            <span>Nenhuma especificação técnica cadastrada no sistema.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pt-2">
            {fieldGroups.map((group, index) => (
              <React.Fragment key={group.title}>
                {index === requiredFieldGroups.length && characteristicSearchControl}
                <section
                  aria-labelledby={`technical-group-${group.title}`}
                  className="flex flex-col gap-3"
                >
                <h4
                  id={`technical-group-${group.title}`}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2"
                >
                  {group.title}
                </h4>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,280px))] gap-x-5 gap-y-4">
                  {group.fields.map((field) => {
                    const rawValue =
                      formData.technicalValues?.[field.name] ??
                      (/^marca$/i.test(field.name.trim()) ? formData.brand : undefined);
                    const hasConfiguredValue =
                      (formData.technicalValues?.[field.name] !== undefined &&
                        formData.technicalValues?.[field.name] !== null) ||
                      (/^marca$/i.test(field.name.trim()) && Boolean(formData.brand));
                    const hasSelectedValue =
                      rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '';
                    const isManual = manualFieldNames.includes(field.name);
                    const isNotApplicable = rawValue === 'Não se aplica';
                    const isAlwaysApplicable = field.isRequired;
                    const isApplicable =
                      isAlwaysApplicable ||
                      (hasConfiguredValue && !isNotApplicable);
                    const isFieldInvalid =
                      isApplicable && !hasSelectedValue && validationErrors?.technicalValues;
                    const isColorField = normalizeTechnicalName(field.name) === 'cor';
                    const variations = formData.variations || [];
                    const parentName = formData.name || formData.description || '';
                    const parentCharacteristicValue = getCharacteristicText(rawValue);
                    const canUseInVariationName =
                      variations.length > 0 &&
                      variations.some((variation) =>
                        Boolean(
                          getVariationCharacteristicText(
                            variation,
                            field.name,
                            parentCharacteristicValue
                          )
                        )
                      );
                    const isIncludedInVariationName =
                      variations.length > 0 &&
                      variations.every((variation) => {
                        const value = getVariationCharacteristicText(
                          variation,
                          field.name,
                          parentCharacteristicValue
                        );
                        const complement = getVariationNameComplement(
                          variation.name || '',
                          parentName
                        );
                        return (
                          Boolean(value) &&
                          normalizeSearchTerm(complement).includes(normalizeSearchTerm(value))
                        );
                      });

                    return (
                      <div
                        key={field.id}
                        id={`technical-field-${field.name}`}
                        className="flex w-[280px] max-w-full flex-col gap-1.5 p-1 transition-all"
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <label
                            className={`min-w-0 flex-1 text-[10px] font-black uppercase tracking-widest truncate flex items-center gap-1.5 transition-colors ${
                              isFieldInvalid
                                ? 'text-red-600 dark:text-red-400'
                                : isNotApplicable
                                  ? 'text-slate-400 dark:text-slate-500'
                                  : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <span>
                              {field.name}
                              {field.unit ? ` (${field.unit})` : ''}
                            </span>
                            {isApplicable && (
                              <span className="text-red-500" aria-label="Obrigatório">
                                *
                              </span>
                            )}
                            {isManual && (
                              <span className="text-[8px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1 py-0.2 rounded border border-blue-200/50">
                                Manual
                              </span>
                            )}
                          </label>
                          <div className="flex items-center gap-1.5">
                            {isColorField && (
                              <>
                                <span className="inline-flex shrink-0 rounded-lg border border-blue-200 bg-blue-50 p-0.5 dark:border-blue-900 dark:bg-blue-950/40">
                                  <button
                                    type="button"
                                    title="Gerenciar cores"
                                    aria-label="Gerenciar cores"
                                    onClick={() => setIsAttributeModalOpen(true)}
                                    className="inline-flex items-center rounded-md px-1.5 py-1 text-[9px] font-black normal-case tracking-normal text-blue-700 transition-colors hover:bg-white dark:text-blue-300 dark:hover:bg-blue-900/60"
                                  >
                                    Gerenciar
                                  </button>
                                </span>
                                <span
                                  className={`inline-flex shrink-0 rounded-lg border p-0.5 transition-colors ${
                                    isIncludedInVariationName
                                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40'
                                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    title={
                                      canUseInVariationName
                                        ? 'Adicionar a cor ao complemento do nome das variações'
                                        : 'Selecione a cor e crie ao menos uma variação'
                                    }
                                    aria-label="Usar cor no nome da variação"
                                    disabled={!canUseInVariationName}
                                    onClick={() =>
                                      handleUseCharacteristicInVariationName(field.name, rawValue)
                                    }
                                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-black normal-case tracking-normal transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                      isIncludedInVariationName
                                        ? 'text-emerald-700 dark:text-emerald-300'
                                        : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    {isIncludedInVariationName && (
                                      <i className="bi bi-check2" aria-hidden="true" />
                                    )}
                                    Usar no nome
                                  </button>
                                </span>
                              </>
                            )}
                            {(normalizeTechnicalName(field.name) === 'profundidade' ||
                              normalizeTechnicalName(field.name) === 'comprimento') && (
                              <button
                                type="button"
                                title={`Alternar para ${normalizeTechnicalName(field.name) === 'profundidade' ? 'Comprimento' : 'Profundidade'}`}
                                onClick={() => handleToggleDepthLength(field)}
                                className="text-slate-400 hover:text-blue-600 transition-colors ml-1"
                              >
                                <i className="bi bi-arrow-left-right" />
                              </button>
                            )}
                            {/* Campos opcionais começam desligados; valor vazio explícito significa que se aplica. */}
                            {!field.isRequired && (
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isApplicable}
                                onClick={() => {
                                  // Se estava aplicável, ao desligar vira 'Não se aplica'
                                  // Se estava desligado ('Não se aplica'), ao ligar volta a ser vazio/editável
                                  handleTechnicalValueChange(
                                    field.name,
                                    isApplicable ? 'Não se aplica' : ''
                                  );
                                }}
                                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  isApplicable
                                    ? 'bg-blue-600 dark:bg-blue-500'
                                    : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                                title="Se aplica?"
                              >
                                <span
                                  aria-hidden="true"
                                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                    isApplicable ? 'translate-x-3' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            )}

                            {isManual && (
                              <button
                                type="button"
                                onClick={() => handleRemoveManualField(field.name)}
                                title={`Remover ${field.name}`}
                                aria-label={`Remover campo ${field.name}`}
                                className="text-slate-400 hover:text-red-500 p-0.5 text-xs transition-colors ml-1"
                              >
                                <i className="bi bi-trash3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <TechnicalFieldInput
                          field={field}
                          value={rawValue !== undefined && rawValue !== null ? rawValue : ''}
                          isInvalid={Boolean(isFieldInvalid)}
                          disabled={
                            !isAlwaysApplicable &&
                            (rawValue === 'Não se aplica' || rawValue === 'N/A')
                          }
                          onChange={(selectedVal) =>
                            handleTechnicalValueChange(field.name, selectedVal)
                          }
                        />
                      </div>
                    );
                  })}
                </div>
                </section>
              </React.Fragment>
            ))}
            {fieldGroups.length === requiredFieldGroups.length && characteristicSearchControl}
          </div>
        )}
      </div>

      <AttributeManagementModal
        isOpen={isAttributeModalOpen}
        focusAttributeName="Cor"
        onClose={() => {
          setIsAttributeModalOpen(false);
          setRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
};

export default ProductTechnicalTab;

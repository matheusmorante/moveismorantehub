import { useState } from 'react';
import CurrencyInput from '@/components/CurrencyInput';
import {
  CONDITION_OPERATORS, isPercentageField, isPriceField, MAX_CONDITION_VALUE_LENGTH, MAX_CONDITION_VALUES,
  parseCatalogPrice, parseConditionValues, serializeConditionValues,
  type LayerCondition, type TemplateField, type TemplatePreviewProduct,
} from '../../../../../../../shared-utils/catalogImageTemplate';
import { LayerSwitch } from './TemplateLayerSwitch';
import { optionsFor } from './templateMessageTokens';

function RuleValuesField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState('');
  const values = parseConditionValues(value);
  const addValue = () => {
    const next = draft.trim().replace(/\s+/g, ' ');
    if (!next || values.length >= MAX_CONDITION_VALUES || next.length > MAX_CONDITION_VALUE_LENGTH) return;
    const updated = serializeConditionValues([...values, next]);
    if (updated !== value) onChange(updated);
    setDraft('');
  };
  const removeValue = (index: number) =>
    onChange(serializeConditionValues(values.filter((_, valueIndex) => valueIndex !== index)));

  return <>
    <div className="ct-rule-token-field">
      {values.map((entry, index) => <span className="ct-rule-token" key={`${entry}-${index}`}>
        <span>{entry}</span><button type="button" className="ct-rule-token-remove" aria-label={`Remover valor ${entry}`}
          onClick={() => removeValue(index)}>×</button>
      </span>)}
      <input aria-label="Valor da regra" value={draft} maxLength={MAX_CONDITION_VALUE_LENGTH}
        placeholder={values.length ? 'Adicionar outro valor' : 'Digite um valor'}
        disabled={values.length >= MAX_CONDITION_VALUES}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); addValue(); }
          if (event.key === 'Backspace' && !draft && values.length) removeValue(values.length - 1);
        }} />
    </div>
    <small className="ct-muted">Pressione Enter para criar cada etiqueta. A regra considera qualquer valor adicionado.</small>
  </>;
}

export function LayerRule({ condition, visible, product, onChange, subject = 'esta camada' }: {
  condition: LayerCondition | null; visible: boolean;
  product: TemplatePreviewProduct | null; onChange: (rule: LayerCondition | null) => void; subject?: string;
}) {
  const isPrice = !!condition && isPriceField(condition.field);
  const isPercent = !!condition && (isPercentageField(condition.field) || (condition.field as string) === 'discount');
  const numeric = isPrice || isPercent;
  const operators = Object.entries(CONDITION_OPERATORS).filter(([operator]) => (numeric
    ? operator !== 'contains' && operator !== 'notContains'
    : !['gt', 'gte', 'lt', 'lte'].includes(operator)));

  return <div className="ct-panel-group">
    <h3>Apresentação condicional</h3>
    <LayerSwitch label={`Mostrar apenas ${subject}`} description="quando a regra for atendida."
      checked={!!condition} onChange={(checked) =>
        onChange(checked ? { field: 'price', operator: 'exists', value: '' } : null)} />
    {condition && <>
      <label className="ct-field"><span>Campo da regra</span><select value={condition.field} onChange={(event) =>
        onChange({ field: event.target.value as TemplateField, operator: 'exists', value: '' })}>
        {optionsFor(condition.field, product).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select></label>
      <label className="ct-field"><span>Condição</span><select value={condition.operator} onChange={(event) =>
        onChange({ ...condition, operator: event.target.value as LayerCondition['operator'] })}>
        {operators.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select></label>
      {condition.operator !== 'exists' && condition.operator !== 'empty' && (isPrice || isPercent
        ? <label className="ct-field"><span>Valor da regra</span>
          {isPrice ? <CurrencyInput showBadge={false} value={parseCatalogPrice(condition.value)}
            onChange={(value) => onChange({ ...condition, value: String(value) })} />
            : <input type="number" min={0} max={100} value={condition.value.replace(/%/g, '')}
              onChange={(event) => onChange({ ...condition, value: event.target.value })} />}</label>
        : <div className="ct-field"><span>Valor da regra</span><RuleValuesField value={condition.value}
          onChange={(value) => onChange({ ...condition, value })} /></div>)}
      <small className="ct-muted">{visible ? 'Visível para este produto.' : 'Oculta para este produto.'}</small>
    </>}
  </div>;
}

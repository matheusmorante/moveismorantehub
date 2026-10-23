export interface ProductDescriptionModelFields {
  model: string;
  line: string;
  modelOrLine: string;
}

export interface ProductDescriptionModelSummaryRow {
  label: 'Modelo' | 'Linha' | 'Modelo / Linha';
  value: string;
}

export const buildProductDescriptionModelSummary = ({
  model,
  line,
  modelOrLine,
}: ProductDescriptionModelFields): ProductDescriptionModelSummaryRow[] => {
  const modelValue = model.trim();
  const lineValue = line.trim();

  if (modelValue && lineValue) {
    return [
      { label: 'Modelo', value: modelValue },
      { label: 'Linha', value: lineValue },
    ];
  }

  return [{
    label: 'Modelo / Linha',
    value: modelOrLine.trim() || modelValue || lineValue,
  }];
};

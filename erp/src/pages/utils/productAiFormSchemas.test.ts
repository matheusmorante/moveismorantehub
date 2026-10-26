import { describe, expect, it } from 'vitest';
import {
  productAiSuggestedCharacteristicsSchema,
  productDescriptionAiFormSchema,
} from '../../../../shared-utils/productAiFormSchemas';

describe('product AI form schemas', () => {
  it('accepts structured technical values in the description form', () => {
    const technicalValues = {
      color: { value: 'Carvalho', confidence: 'alta' },
      dimensions: [{ label: 'Largura', value: 90 }],
      assembled: true,
      weight: 24.5,
      notes: null,
    };

    const result = productDescriptionAiFormSchema.parse({
      title: 'Mesa lateral',
      currentDescription: '',
      technicalValues,
    });

    expect(result.technicalValues).toEqual(technicalValues);
  });

  it('accepts structured technical values from an AI characteristics response', () => {
    const technicalValues = {
      color: { name: 'Carvalho', code: 'CAR' },
      dimensions: ['90 cm', '45 cm'],
    };

    const result = productAiSuggestedCharacteristicsSchema.parse({
      technicalValues,
    });

    expect(result.technicalValues).toEqual(technicalValues);
  });
});

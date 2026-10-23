import { describe, expect, it } from 'vitest';
import {
  whatsappConnectionFormSchema,
  whatsappTemplateTestCommandSchema,
  whatsappTemplatesQueryFormSchema,
} from '../../../../../shared-utils/messagingFormSchemas';

describe('Meta integration forms', () => {
  it('strips legacy access tokens from every submitted config', () => {
    expect(whatsappConnectionFormSchema.parse({ phoneNumberId: '1234567890', accessToken: 'legacy-secret' }))
      .toEqual({ phoneNumberId: '1234567890' });
    expect(whatsappTemplatesQueryFormSchema.parse({ wabaId: '2345678901', accessToken: 'legacy-secret' }))
      .toEqual({ wabaId: '2345678901' });
    expect(whatsappTemplateTestCommandSchema.parse({
      phone: '41999998888',
      template: 'order_template',
      language: 'pt_BR',
      variableCount: 0,
      config: { phoneNumberId: '1234567890', templateLanguage: 'pt_BR', accessToken: 'legacy-secret' },
    })).toEqual({
      phone: '41999998888',
      template: 'order_template',
      language: 'pt_BR',
      variableCount: 0,
      config: { phoneNumberId: '1234567890', templateLanguage: 'pt_BR' },
    });
  });
});

import { beforeEach, expect, it, vi } from 'vitest';

const { callGeminiDirect } = vi.hoisted(() => ({ callGeminiDirect: vi.fn() }));
vi.mock('./aiDirectClient', () => ({ callGeminiDirect }));

import { aiFiscalClassificationService } from './aiFiscalClassificationService';

beforeEach(() => {
  callGeminiDirect.mockResolvedValue(
    JSON.stringify({ cest: null, cfop: '5102', cst: '102', origem: '0' })
  );
});

it('não pede classificação de NCM à IA no preenchimento fiscal', async () => {
  const result = await aiFiscalClassificationService.generateFiscalData({
    title: 'Mesa de madeira',
    description: 'Mesa para sala',
  });

  const prompt = callGeminiDirect.mock.calls[0][0] as string;
  expect(prompt).toContain('Não escolha, sugira ou altere o NCM');
  expect(prompt).not.toContain('suggestedNcm');
  expect(result.ncm).toBe('');
  expect(result.ncmDescription).toBe('');
});

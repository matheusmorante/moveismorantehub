import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('../../../services/supabaseClient', () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));

import {
  extractMobileProductCharacteristicsFromText,
  extractMobileProductCharacteristicsWithAI,
  generateMobileProductDescriptionFromText,
  getMobileProductCharacteristicsQuota,
  improveMobileProductDescription,
  sanitizeMobileProductDescription,
} from './mobileProductAiService';

describe('mobileProductAiService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usa o proxy autenticado e remove a cor do texto enviado à IA', async () => {
    mocks.invoke.mockResolvedValue({
      data: { candidates: [{ content: { parts: [{ text: 'Mesa em madeira.\nCor: Azul\nModelo/Linha: Paris' }] } }] },
      error: null,
    });

    await expect(improveMobileProductDescription({
      title: 'Mesa Paris',
      currentDescription: 'Mesa de madeira',
      technicalValues: { Cor: 'Azul', Material: 'Madeira' },
    })).resolves.toBe('Mesa em madeira.\nModelo: Paris');

    expect(mocks.invoke).toHaveBeenCalledWith('mobile-gemini-proxy', expect.objectContaining({
      body: expect.objectContaining({
        tools: [],
        descriptionMode: 'characteristics',
        contents: [expect.objectContaining({ parts: [expect.objectContaining({ text: expect.not.stringContaining('"Cor":"Azul"') })] })],
      }),
    }));
  });

  it('remove blocos markdown e linhas de cor mesmo em respostas sem JSON', () => {
    expect(sanitizeMobileProductDescription('```text\nProduto.\n- Cor: Verde\n```')).toBe('Produto.');
  });

  it('rejeita resposta que fica vazia depois de remover a única linha de Cor', async () => {
    mocks.invoke.mockResolvedValue({
      data: { candidates: [{ content: { parts: [{ text: 'Cor: Azul' }] } }] },
      error: null,
    });

    await expect(improveMobileProductDescription({
      title: 'Mesa Azul',
      currentDescription: 'Descrição anterior',
    })).rejects.toThrow('A IA retornou uma descrição vazia ou inválida. Tente novamente.');
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('não chama o proxy com dados inválidos', async () => {
    await expect(improveMobileProductDescription({ title: '', currentDescription: '' })).rejects.toThrow();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('gera descrição comercial a partir do texto informativo usando o proxy autenticado', async () => {
    mocks.invoke.mockResolvedValue({
      data: { candidates: [{ content: { parts: [{ text: 'Mesa Oslo em madeira com 120 cm de largura.' }] } }] },
      error: null,
    });

    await expect(generateMobileProductDescriptionFromText({
      informativeText: 'Mesa Oslo em madeira, 120 cm de largura.',
      productName: 'Mesa Oslo',
      brand: 'Morante',
      model: 'Oslo',
      categoryName: 'Sala de jantar',
    })).resolves.toBe('Mesa Oslo em madeira com 120 cm de largura.');

    const body = mocks.invoke.mock.calls[0][1].body;
    const submittedValues = JSON.parse(body.contents[0].parts[0].text);
    expect(body.operation).toBe('mobile_product_description');
    expect(body.descriptionMode).toBe('informative_text');
    expect(submittedValues).toMatchObject({
      title: 'Mesa Oslo',
      currentDescription: 'Mesa Oslo em madeira, 120 cm de largura.',
      brand: 'Morante',
      model: 'Oslo',
      categoryName: 'Sala de jantar',
    });
  });

  it('valida o texto informativo antes de acessar o proxy', async () => {
    await expect(generateMobileProductDescriptionFromText({
      informativeText: 'abc',
      productName: '',
    })).rejects.toThrow('mínimo 5 caracteres');
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('pesquisa características no web search com atributos permitidos e valida a resposta', async () => {
    mocks.invoke.mockResolvedValue({
      data: { candidates: [{ content: { parts: [{ text: JSON.stringify({
        identifiedProduct: { name: 'Mesa Oslo', brand: 'Morante', confidence: 'alta', sources: [{ title: 'Fabricante', uri: 'https://example.com' }] },
        technicalValues: { Material: 'MDF' },
        itemConfidence: { Material: 'alta' },
        height: 75,
      }) }] } }] },
      error: null,
    });

    const result = await extractMobileProductCharacteristicsWithAI({
      productName: 'Mesa Oslo',
      availableAttributes: [{ id: 'material', name: 'Material', dataType: 'text', options: [] }],
    });

    expect(result.technicalValues).toEqual({ Material: 'MDF' });
    expect(mocks.invoke).toHaveBeenCalledWith('mobile-gemini-proxy', expect.objectContaining({
      body: expect.objectContaining({
        operation: 'catalog_extract_technical_specs',
        mode: 'web_search',
        contents: [expect.objectContaining({ parts: [expect.objectContaining({ text: expect.stringContaining('Material') })] })],
      }),
    }));
  });

  it('extrai características de ficha técnica sem exigir nome atual', async () => {
    mocks.invoke.mockResolvedValue({
      data: { candidates: [{ content: { parts: [{ text: '{"technicalValues":{"Material":"MDF"},"description":"Mesa em MDF"}' }] } }] },
      error: null,
    });

    const result = await extractMobileProductCharacteristicsFromText({
      descriptiveText: 'Mesa em MDF, 120 cm de largura.',
      currentName: '',
    });

    expect(result.description).toBe('Mesa em MDF');
    expect(mocks.invoke).toHaveBeenCalledWith('mobile-gemini-proxy', expect.objectContaining({
      body: expect.objectContaining({ operation: 'catalog_extract_technical_specs', mode: 'descriptive_text' }),
    }));
  });

  it('consulta os limites da extração de características no proxy', async () => {
    mocks.invoke.mockResolvedValue({ data: { quota: {
      usedMinute: 1, limitMinute: 2, usedHour: 3, limitHour: 20, usedToday: 4, limitToday: 80,
    } }, error: null });
    await expect(getMobileProductCharacteristicsQuota()).resolves.toMatchObject({ usedMinute: 1, limitMinute: 2, usedHour: 3, limitHour: 20, usedToday: 4, limitToday: 80 });
    expect(mocks.invoke).toHaveBeenCalledWith('mobile-gemini-proxy', {
      body: { action: 'quota', operation: 'catalog_extract_technical_specs' },
    });
  });

  it('aceita resposta técnica sem o envelope e não mistura metadados com características', async () => {
    mocks.invoke.mockResolvedValue({
      data: { candidates: [{ content: { parts: [{ text: '{"Material":"MDF","width":120,"reasoning":"Catálogo oficial"}' }] } }] },
      error: null,
    });
    const result = await extractMobileProductCharacteristicsWithAI({ productName: 'Mesa Oslo' });
    expect(result.technicalValues).toEqual({ Material: 'MDF' });
    expect(result.width).toBe(120);
    expect(result.identifiedProduct?.name).toBe('Mesa Oslo');
    expect(result.itemConfidence?.Material).toBe('alta');
  });

  it('bloqueia resposta de cota malformada', async () => {
    mocks.invoke.mockResolvedValue({ data: { quota: {} }, error: null });
    await expect(getMobileProductCharacteristicsQuota()).rejects.toThrow();
  });
});

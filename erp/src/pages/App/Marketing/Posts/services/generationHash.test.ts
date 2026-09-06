import { describe, expect, it } from 'vitest';
import { createGenerationHash, modelGenerationInput } from './generationHash';

describe('generation hash', () => {
  it('permanece estável quando a entrada visual não mudou', async () => {
    const model = { prompt: 'Splash vermelho', referenceFiles: [{ fileUrl: 'a.png' }], generationVersion: 1 };
    await expect(createGenerationHash(modelGenerationInput(model, 'Regra A'))).resolves.toBe(await createGenerationHash(modelGenerationInput(model, 'Regra A')));
  });

  it('muda ao alterar prompt, referência ou diretriz', async () => {
    const base = await createGenerationHash(modelGenerationInput({ prompt: 'A', referenceFiles: [{ fileUrl: 'a.png' }], generationVersion: 1 }, 'X'));
    const changed = await createGenerationHash(modelGenerationInput({ prompt: 'B', referenceFiles: [{ fileUrl: 'a.png' }], generationVersion: 1 }, 'X'));
    const guidelineChanged = await createGenerationHash(modelGenerationInput({ prompt: 'A', referenceFiles: [{ fileUrl: 'a.png' }], generationVersion: 1 }, 'Y'));
    expect(changed).not.toBe(base); expect(guidelineChanged).not.toBe(base);
  });
});

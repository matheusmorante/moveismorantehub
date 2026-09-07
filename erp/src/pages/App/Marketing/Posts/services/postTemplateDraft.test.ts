import { describe, expect, it } from 'vitest';
import { buildPostTemplateDraft } from './postTemplateDraft';

describe('buildPostTemplateDraft', () => {
  it('cria o modelo novo com padrões de feed', () => {
    const draft = buildPostTemplateDraft({ name: 'Oferta', description: '', prompt: 'Produto', format: '4:5', assets: [], extras: [], now: '2026-09-07T00:00:00.000Z' });
    expect(draft).toMatchObject({ id: 'new', width: 1080, height: 1350, status: 'ACTIVE', category: 'Promoção', createdAt: '2026-09-07T00:00:00.000Z' });
  });

  it('cria o formato story com a altura correta', () => {
    const draft = buildPostTemplateDraft({ name: 'Story', description: '', prompt: '', format: '9:16', assets: [], extras: [], now: '2026-09-07T00:00:00.000Z' });
    expect(draft).toMatchObject({ aspectRatio: '9:16', height: 1920 });
  });
});

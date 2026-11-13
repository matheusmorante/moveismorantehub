import { describe, expect, it } from 'vitest';
import { buildTurnContinuityInstructions } from './turnPromptBuilder.js';

describe('contexto comercial do atendimento WhatsApp', () => {
  it('preserva o item literal e usa o histórico para resolver a troca de categoria', () => {
    const instructions = buildTurnContinuityInstructions(false);

    expect(instructions).toContain('"pia" pede a categoria Pias');
    expect(instructions).toContain('"balcão para pia" pede a categoria Balcões para Pia');
    expect(instructions).toContain('"e o balcão dela?"');
    expect(instructions).toContain('mantendo medidas, cor, material ou orçamento');
    expect(instructions).toContain('A categoria sempre restringe a busca');
  });
});

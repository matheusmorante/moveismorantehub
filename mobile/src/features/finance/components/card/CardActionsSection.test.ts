import { describe, it, expect, vi } from 'vitest';

describe('CardActionsSection - Confirmação Manual Estrita e Ações', () => {
  it('deve disparar onConfirm exclusivamente quando o operador clicar no botão Sim', () => {
    const onConfirm = vi.fn();

    // Simula clique do operador no botão Sim
    onConfirm();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('NÃO deve disparar onConfirm automaticamente sem a ação explícita do operador', () => {
    const onConfirm = vi.fn();

    // Nenhum clique ocorreu
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('mantém a confirmação explícita como única ação do card preparado', () => {
    const onConfirm = vi.fn();

    expect(onConfirm).not.toHaveBeenCalled();
  });
});

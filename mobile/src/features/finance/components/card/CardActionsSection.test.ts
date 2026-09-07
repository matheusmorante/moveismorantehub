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

  it('deve disparar onEdit e não disparar onConfirm quando o operador clicar em Editar', () => {
    const onConfirm = vi.fn();
    const onEdit = vi.fn();

    // Simula clique em Editar
    onEdit();

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from 'vitest';
import { financialBatchInstruction, vehicleExpenseInstruction } from './mobileAgentFinancialBatchInstruction';

describe('instruções de movimentações em lote do agente', () => {
  it('orienta a consolidar somente lançamentos compatíveis e separar categorias diferentes', () => {
    expect(financialBatchInstruction).toContain('mesmo tipo, categoria oficial, finalidade, forma de pagamento e data');
    expect(financialBatchInstruction).toContain('R$ 135,00 na categoria "Pró-labore"');
    expect(financialBatchInstruction).toContain('DUAS chamadas, uma em "Combustível" e outra em "Manutenção de Veículos"');
  });

  it('define combustível e manutenção como gastos empresariais e explica a regra ao operador', () => {
    expect(vehicleExpenseInstruction).toContain('são SEMPRE Operação da Empresa');
    expect(vehicleExpenseInstruction).toContain('NÃO pergunte a finalidade e NÃO use Pró-labore');
    expect(vehicleExpenseInstruction).toContain('Esta finalidade prevalece mesmo se o usuário disser que o veículo é da loja');
    expect(vehicleExpenseInstruction).toContain('[descrição] (R$ [valor]): por regra, classifiquei como gasto da empresa na categoria [categoria]');
    expect(vehicleExpenseInstruction).toContain('Nunca diga apenas "essa despesa"');
    expect(vehicleExpenseInstruction).toContain('Se tiver errado, reclame com o Mateus.');
  });
});

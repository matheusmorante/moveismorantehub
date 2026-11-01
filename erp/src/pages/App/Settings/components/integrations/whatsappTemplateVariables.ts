export const WHATSAPP_TEMPLATE_VARIABLE_OPTIONS = [
  { value: 0, label: '0 variáveis — Apenas texto fixo sem {{1}}' },
  { value: 1, label: '1 variável — {{1}} Nome do Cliente' },
  { value: 2, label: '2 variáveis — {{1}} Nome, {{2}} Data/Prazo' },
  { value: 3, label: '3 variáveis — {{1}} Nome, {{2}} Produtos, {{3}} Valor Total' },
  { value: 4, label: '4 variáveis — {{1}} Nome, {{2}} Data, {{3}} Produtos, {{4}} Total' },
  {
    value: 5,
    label: '5 variáveis — {{1}} Nome, {{2}} Data, {{3}} Endereço, {{4}} Produtos, {{5}} Total',
  },
  {
    value: 6,
    label:
      '6 variáveis — {{1}} Nome, {{2}} Data, {{3}} Endereço, {{4}} Produtos, {{5}} Total, {{6}} Pagamento',
  },
  {
    value: 7,
    label: '7 variáveis — Completo (Nome, Data, Hora, Endereço, Produtos, Total, Pagamento)',
  },
  {
    value: 8,
    label:
      '8 variáveis — Completo com Tipo (Nome, Tipo Entrega/Retirada, Data, Hora, Endereço, Produtos, Total, Pagamento)',
  },
];

export function getWhatsAppTemplateSampleVariables(variableCount: number): string[] {
  const sampleList = variableCount >= 8
    ? ['Cliente Teste', 'entrega', '26/08/2026', 'Manhã', 'Rua Cascavel, 306, Guaraituba - Colombo/PR', '1x Guarda Roupa Casal 6 Portas', '949,00', 'Pix | R$ 949,00 | Status: Pendente']
    : ['Cliente Teste', '26/08/2026', 'Manhã', 'Rua Cascavel, 306, Guaraituba - Colombo/PR', '1x Guarda Roupa Casal 6 Portas', '949,00', 'Pix'];

  return sampleList.slice(0, variableCount);
}

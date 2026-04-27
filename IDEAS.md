# Ideias e Planos Pendentes

## Logística e Agendamento
- [x] Implementar agendamento por período (Data e Hora) para Entrega e Retirada.
- [x] Padronizar nomenclatura para "Fixo" e "Período".
- [x] Sincronizar lógica de agendamento em Assistências.
- [x] Integrar períodos de agendamento nos templates de impressão (Pedido, Recibo, OS).
- [x] Integrar períodos de agendamento nas mensagens automáticas do WhatsApp.
- [x] Botão "Não informar endereço" para Entregas/Retiradas de Consumidor Final ou simplificadas.
- [ ] **Validação de Retroatividade**: Adicionar aviso se o usuário agendar uma data no passado (opcionalmente bloqueável via configurações).
- [ ] **Múltiplos Períodos**: Estudar a possibilidade de agendar janelas múltiplas de horário (ex: "Manhã ou Final da Tarde") para um mesmo pedido.

## Interface e UX
- [x] Cronograma Logístico ocupando 100% da largura da tela.
- [x] Zoom dinâmico no cronograma para ajuste automático à tela.
- [ ] **Filtro de Status no Cronograma**: Adicionar opção rápida para ocultar pedidos "Atendidos" no modo tabela para limpar a visão.
- [ ] **Indicadores de Atraso**: Adicionar badge visual (ex: ícone de relógio vermelho) piscando nas listas de histórico para pedidos cuja data de entrega já passou e não foram finalizados.

## Infraestrutura e Backend
- [ ] **Separação de Configurações Dev/Prod**: Criar um arquivo `.env.example` robusto e garantir que o `supabaseConfig.ts` use variáveis de ambiente de forma estrita, sem fallbacks que possam misturar dados.
- [ ] **Logs de Alterações de Frete**: Registrar no histórico de status quando o valor do frete foi alterado manualmente vs. calculado automaticamente.

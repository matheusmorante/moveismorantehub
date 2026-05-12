# Ideias e Planos Pendentes

## Concluído recentemente:
- [x] Corrigido salvamento de informações do cliente (Telefone e Origem de Marketing) no formulário de pedidos.
- [x] Adicionado seletor de "Tráfego Pago" (Origem de Marketing) na aba de Dados do Cliente do Pedido de Venda.
- [x] Liberada edição do campo de telefone para clientes já cadastrados diretamente no formulário de pedido.
- [x] Implementada sincronização automática: ao salvar um pedido, o telefone e a origem de marketing são atualizados no cadastro do cliente (CRM) se houver um vínculo.
- [x] Padronizados os valores de marketing para 'paid' e 'organic' para consistência entre Pedidos e CRM.

## Ideias Pendentes / Melhorias Futuras:
- [ ] **Sincronização de Endereço**: Avaliar se mudanças de endereço no pedido também devem atualizar o cadastro principal do cliente (atualmente é manual via botão "Editar").
- [ ] **Histórico de Marketing**: Criar um log de mudanças na origem de marketing do cliente para entender mudanças de comportamento.
- [ ] **Validação de Telefone**: Implementar uma validação mais rigorosa de formato de telefone antes da sincronização com o CRM.
- [ ] **Feedback de Sync**: Adicionar um pequeno indicador visual ou toast informando que o cadastro do cliente foi atualizado com sucesso ao salvar o pedido.

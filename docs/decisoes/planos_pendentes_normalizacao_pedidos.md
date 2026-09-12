# Planos e Ideias Pendentes - Normalização de Pedidos Morante Hub

Documento de rastreabilidade para acompanhamento de melhorias arquiteturais, desligamento planejado de legados e otimizações.

---

## 1. Concluído na Auditoria Operacional
- [x] Criação das tabelas normalizadas `orders` (colunas físicas), `order_items` e `order_payments`.
- [x] Migração dos 1.508 itens e 949 pagamentos históricos do banco.
- [x] RPC `save_order_transaction` atômica no PostgreSQL com rollback total e flag `morante.in_order_transaction`.
- [x] Trigger de fallback independente para itens e pagamentos com telemetria leve (`order_fallback_telemetry`).
- [x] Migração de leituras em `orderMapper`, `fetchOrderById` (sem `select *`), Agenda, Relatórios e Assistente IA.
- [x] Bateria de auditoria E2E ponta a ponta com 8 cenários executados com sucesso (100% de aprovação).

---

## 2. Próximas Etapas e Ideias Pendentes (Futuro Planejado)

### Fase 1: Período de Observação da Telemetria (Staging / Staging-Dev)
- [ ] Monitorar a tabela `public.order_fallback_telemetry` por 7 a 14 dias em ambiente de desenvolvimento/homologação.
- [ ] Verificar se novas vendas ou operações mobile/ERP incrementam `execution_count`. A meta é ZERO incremento para operações modernas.

### Fase 2: Transição Segura para Produção
- [ ] Conforme diretriz do usuário: manter produção lendo do legado e escrevendo em dual-write (RPC atômica).
- [ ] Em ambiente DEV: ativar leitura 100% das tabelas normalizadas com dual-write na escrita.
- [ ] Validar operação de PDV e emissão de notas fiscais sob o modelo dual.

### Fase 3: Desligamento Definitivo do Legado (Somente após Validação Estendida)
- [ ] Remover coluna `orders.items` (array JSONB redundante) e manter apenas `order_items`.
- [ ] Desativar trigger `sync_order_items_fallback`.
- [ ] Desativar telemetria `order_fallback_telemetry`.
- [ ] Transformar `order_data` exclusivamente em snapshot de dados imutáveis do cliente/endereço no momento da venda.

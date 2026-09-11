# ADR-001: Preservação de Fatos Históricos via Snapshots Imutáveis nos Pedidos

* **Status**: Aceito e Em Vigor
* **Data**: 2026-09-10
* **Domínio**: Vendas, Clientes, Produtos e Fiscal

---

##  Contexto e Problema

Em sistemas ERP tradicionais com modelo relacional simples sem snapshot, quando o nome ou endereço de um cliente é alterado no cadastro, ou quando o preço comercial de um produto muda, consultas e impressões em pedidos históricos acabam exibindo os dados novos alterados.

Isso viola normas fiscais (uma DANFE ou recibo passado não pode mudar de texto), desalinha relatórios de faturamento e destrói a auditoria de vendas passadas.

---

## 💡 Decisão Arquitetural

Adotamos a **Preservação de Fatos Históricos via Snapshots Imutáveis** no Morante Hub:

1. Quando um pedido de venda ou devolução é salvo, as informações descritivas do cliente (`fullName`, `phone`, `fullAddress`) e dos itens (`description`, `unitPrice`, `costPrice`) são gravadas em formato **snapshot congelado** no JSON `order_data` do pedido.
2. Alterar o cliente no cadastro geral de clientes (`people`) ou o preço do produto no cadastro de produtos (`products`) **NÃO** altera retroativamente vendas já salvas.
3. Se o usuário desejar atualizar os dados do cliente no pedido, ele deve abrir o pedido no formulário e re-selecionar a pessoa explicitamente no dropdown de busca.

---

## ⚖️ Consequências

- **Positivas**:
  - Garantia de 100% de conformidade fiscal e jurídica em recibos e DANFEs.
  - Relatórios de DRE e histórico comercial imutáveis.
  - Proteção contra edições acidentais em cadastros gerais.
- **Negativas**:
  - Requer maior atenção na sincronização de colunas de busca rápida (`customer_name`) no PostgreSQL através da helper `buildOrderPersistencePayload()`.

---

## 🔗 Mapeamento no Código

- **Resolver Snapshot**: `[orderSnapshotResolution.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/orderSnapshotResolution.ts)`
- **Payload de Persistência**: `[orderHistoryService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/orderHistoryService.ts)`

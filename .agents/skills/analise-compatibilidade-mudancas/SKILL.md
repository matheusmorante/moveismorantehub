---
name: analise-compatibilidade-mudancas
description: Analise riscos de compatibilidade com dados existentes, histórico, retrocompatibilidade e quebra de exibição antes e durante a implementação de novidades ou refatorações no ERP e Mobile, solicitando direcionamento ao usuário quando houver ambiguidade.
---

# Análise de Compatibilidade e Retrocompatibilidade de Mudanças

Use esta skill sempre que for:
1. **Adicionar novos campos ou entidades** (ex: snapshots, novos status, novas propriedades em `order_data`, `customerData`, `items`, etc.).
2. **Alterar estruturas existentes** (mudar formato de objetos, renomear chaves, mover propriedades entre tabelas/JSONs).
3. **Refatorar componentes de exibição** (ERP ou Mobile) que dependem de dados salvos no banco.

---

## 1. Princípio da Retrocompatibilidade Estrita

Os bancos de dados contêm registros históricos criados sob diferentes versões do sistema.
- **Novos campos nunca nascem preenchidos no passado**: Se um campo novo for criado (ex: `snapshot` de endereço, novo identificador ou flag), registros antigos não o terão preenchido imediatamente.
- **Telas e relatórios nunca podem quebrar ou exibir dados vazios**: Componentes de leitura devem sempre prever fallbacks robustos para estruturas legadas.
- **Compatibilidade Bidirecional**: O sistema deve funcionar tanto com registros criados hoje quanto com registros criados há meses/anos.

---

## 2. Checklist Obrigatório de Análise Pré-Implementação

Antes de escrever código para uma nova funcionalidade ou alteração estrutural, execute as 4 etapas:

### Etapa 1: Impacto nos Dados Históricos
- *A nova funcionalidade depende de um campo novo no banco ou no JSON (`order_data`, etc.)?*
- *Como os registros criados no passado se comportarão ao serem carregados por essa nova funcionalidade?*
- *Há risco de exibir campos em branco, `undefined`, `null` ou travar a renderização?*

### Etapa 2: Fallbacks de Leitura / Resiliência
- Nos componentes de renderização (modais, tabelas, cards, prints, app mobile), garanta que haja encadeamento de fallback:
  ```ts
  // Exemplo de fallback seguro para snapshot vs legado
  const address = order.shipping?.deliveryAddress 
    || order.customerData?.fullAddress 
    || order.customerData?.address 
    || legacyCustomerAddress;
  ```

### Etapa 3: Identificação de Ambiguidade e Decisão de Migração
Se a mudança exigir adaptação de dados antigos, avalie se:
1. **Apenas fallbacks no código bastam** (sem alterar o banco).
2. **É necessário um backfill / script de migração** para preencher registros antigos no banco.
3. **Há ambiguidade de regra de negócio** sobre como tratar dados legados incompatíveis.

### Etapa 4: Alinhamento Obrigatório com o Usuário
Sempre que houver dúvida, risco de incompatibilidade ou necessidade de escolha de adaptação, **pergunte explicitamente ao usuário** antes ou durante a implementação:
- Explique claramente o impacto da mudança nos dados antigos.
- Apresente as alternativas de adaptação (ex: fallback dinâmico em tempo de execução vs script de migração em lote).
- Solicite a confirmação da preferência do usuário.

---

## 3. Exemplos Práticos de Atenção

| Cenário | Risco de Incompatibilidade | Solução Padrão Obrigatória |
|---|---|---|
| **Criação de Snapshot** (ex: endereço/cliente no pedido) | Pedidos antigos ficam com snapshot vazio pois foram salvos antes da regra existir | Ler snapshot se existir; se não existir, ler a fonte original (ou executar backfill seguro sob aprovação) |
| **Novos Status / Rótulos** | Registros antigos possuem strings legadas não mapeadas | Manter mapa de tradução / normalização tolerante a maiúsculas, minúsculas e variações |
| **Novas Chaves em JSONs** | O código tenta acessar `obj.sub.chave` causando crash em dados antigos | Usar optional chaining (`obj?.sub?.chave`) e valores default estruturados |
| **Cores / Configurações Dinâmicas** | Se o item do pedido tiver label customizada antiga que não está mais no settings | Usar cor cadastrada correspondente com fallback neutro do tema |

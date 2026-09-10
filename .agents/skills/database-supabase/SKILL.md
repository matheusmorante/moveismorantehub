---
name: database-supabase
description: Diretrizes obrigatórias de banco de dados, Supabase, PostgreSQL, migrations, integridade referencial, consultas eficientes, prevenção de egress e paginação server-side com suporte a busca e filtros sem perda de dados na interface.
---

# Skill: Banco de Dados, Supabase, PostgreSQL e Eficiência de Dados

## Quando aplicar esta Skill
Aplicar quando a tarefa envolver:
- Consultas ao Supabase (`supabase.from(...)`), RPCs e Edge Functions;
- Criação ou alteração de tabelas, colunas, chaves estrangeiras (`FK`) e índices;
- Migrations (`erp/scripts/migration/` ou migrations SQL do Supabase);
- Políticas RLS (`Row Level Security`);
- Listagens de dados, paginação, filtros, pesquisa server-side e ordenação;
- Otimização de Egress e prevenção de transferência de payloads excessivos.

## Quando NÃO aplicar
- Para regras de negócio de estoque, vendas e CMPM (consultar `regras-de-negocio-erp`);
- Para persistência local offline no mobile (consultar `mobile-offline-first`).

---

## 1. Princípio Central: Eficiência com Preservação Total da Interface

> [!IMPORTANT]
> **TRANSFERIR APENAS OS DADOS NECESSÁRIOS, PRESERVANDO 100% DA INTERFACE DO USUÁRIO.**  
> Nenhuma otimização de consulta ou Egress pode esconder informações, remover colunas, eliminar filtros ou degradar a experiência do usuário.

A otimização deve ocorrer na arquitetura de consulta (paginação, índices, projeção de colunas necessárias), e nunca cortando funcionalidades.

---

## 2. Diretrizes de Consultas e Prevenção de Egress

1. **Paginação Server-Side Mandatória**:
   - Listagens que podem crescer (pedidos, produtos, movimentações, transações) devem utilizar paginação com `.range(from, to)` (tamanho padrão: 30 itens).
   - Proibido carregar milhares de linhas na memória do navegador apenas para paginar ou filtrar no client-side.
2. **Projeção Consciente de Colunas**:
   - Evite `select('*')` indiscriminado em tabelas que contêm JSONs pesados (`order_data`, logs, metadados).
   - Especifique as colunas necessárias para a visualização atual (ex: `select('id, created_at, status, order_number')`).
3. **Lazy Loading de Dados Detalhados**:
   - Campos pesados (ex: JSONs completos de snapshot, XMLs de notas fiscais, histórico detalhado) devem ser carregados sob demanda quando o usuário abrir o modal de detalhes ou edição.

---

## 3. Integridade Referencial, Schemas e Migrations

- **Identidade Técnica Imutável (`id` / UUID)**:
  - Chaves primárias e relacionais utilizam UUIDs imutáveis. O SKU é código comercial e nunca deve ser chave estrangeira interna quando existir UUID.
- **Migrations Compatíveis (Zero Downtime)**:
  - Migrações de schema devem ser aditivas (adicionar colunas com valores default seguros).
  - Nunca renomeie ou remova colunas que estejam em uso ativo por versões do ERP ou App Mobile em produção.
- **Índices Estratégicos**:
  - Toda coluna frequentemente utilizada em `where`, `order by` ou joins (ex: `product_id`, `created_at`, `status`, `deleted`) deve possuir índice no PostgreSQL para garantir buscas em milissegundos.

---

## 4. Políticas RLS (Row Level Security)

- Políticas RLS devem ser desenhadas para proteger dados sem causar rejeições silenciosas no ERP ou no App Mobile.
- Para operações do aplicativo e rotinas internas autenticadas, garanta que as permissões de `SELECT`, `INSERT`, `UPDATE` e `DELETE` estejam ativas e testadas contra erros de RLS.

---

## 5. Checklist de Banco de Dados

Antes de concluir qualquer alteração de banco:
- [ ] A consulta está paginada no servidor?
- [ ] Evitei `select('*')` em tabelas com colunas JSON pesadas?
- [ ] As buscas por texto utilizam índices ou busca sem acento?
- [ ] As novas colunas possuem defaults seguros que não quebram registros legados?
- [ ] A migration foi testada localmente ou em script seguro?

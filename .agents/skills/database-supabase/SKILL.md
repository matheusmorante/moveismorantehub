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
- Busca textual livre e aproximada (`pg_trgm`, `unaccent`);
- Otimização de Egress e prevenção de transferência de payloads excessivos.

## Quando NÃO aplicar
- Para regras de negócio de estoque, vendas e CMPM (consultar `regras-de-negocio-erp`);
- Para persistência local offline no mobile (consultar `mobile-offline-first`).

---

## Acesso ao Supabase pelo navegador integrado

- Se o plugin do Supabase ou o CLI/token falhar ou não estiver disponível, use a sessão já autenticada do navegador integrado em supabase.com. O usuário autorizou acessar o Dashboard da conta Movesmorante/Morante Hub e executar SQL na aba **SQL Editor** para a tarefa solicitada, sem pedir nova autorização apenas por essa troca de ferramenta.
- Antes da primeira consulta/escrita de uma execução, confirme que o projeto/ref selecionado corresponde ao configurado no aplicativo. Reutilize essa confirmação enquanto a sessão, projeto e configuração não mudarem; revalide somente com nova evidência de divergência ou troca de alvo. Revise cada consulta antes de executar, limite projeções e volume de resultados, e mantenha alterações de schema também em migrations versionadas no repositório.
- Não exponha credenciais, dados pessoais ou resultados sensíveis em logs e relatórios. As restrições de produção, testes isolados, escrita destrutiva, atomicidade e validação desta skill e de `testes-seguros-erp` continuam valendo no SQL Editor.

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
- Para operações do aplicativo e rotinas internas autenticadas, valide permissões de `SELECT`, `INSERT`, `UPDATE` e `DELETE` com usuários/roles apropriados. A estratégia de evidência, PostgreSQL real, RPCs, constraints e testes negativos é centralizada em `testes-seguros-erp`; esta skill não duplica seu checklist.

---

## 5. Busca Textual Aproximada no PostgreSQL (`pg_trgm` e `unaccent`)

O PostgreSQL dispõe das extensões `pg_trgm` (trigramas) e `unaccent` para aceleração de buscas textuais livres e tolerância a pequenos erros de digitação.

### Quando Usar `pg_trgm`:
- O usuário digita texto humano em linguagem natural (nomes, descrições, termos de pesquisa);
- Erros leves de digitação, omissão de caracteres ou pequenas diferenças de grafia devem ser tolerados;
- Busca por nomes de produtos, variações, descrições de NCM, razão social / nome de fornecedores e clientes;
- O volume de dados justifica busca server-side e existe índice GIN/GiST trigram adequado (`gin_trgm_ops`).

### Quando NÃO Usar `pg_trgm`:
- **Chaves e Identificadores Técnicos**: UUIDs, IDs numéricos;
- **Códigos Comerciais Exatos**: SKU exato, código de barras (EAN), QR Code;
- **Documentos Fiscais e Pessoais**: Chave de acesso de NF-e (44 dígitos), CPF, CNPJ, telefone, número do pedido, número de nota fiscal (devem usar normalização de dígitos + igualdade/prefixo com índice B-tree);
- **Campos Estruturados**: Enums, status, booleans, datas, categorias estruturadas;
- **Persistência Local no Mobile**: O SQLite do app mobile (telas offline de entregas, montagens e cronograma) **NÃO suporta `pg_trgm`**. A busca local no SQLite utiliza `LIKE` ou normalização local em memória sobre os dados já cacheados; nunca crie dependência de Supabase/pg_trgm para fluxos offline-first.

### Requisitos Mandatórios de Implementação:
1. **Índices GIN Trigram Estritamente Justificados**:
   - Nunca execute `WHERE similarity(...)` ou `ILIKE '%...%'` em tabelas médias/grandes sem índice `USING gin (coluna gin_trgm_ops)`.
   - Para buscas insensíveis a acentos, utilize a função imutável `public.immutable_unaccent(coluna)` no índice e na query: `USING gin (public.immutable_unaccent(coluna) gin_trgm_ops)`.
   - **Nota sobre Seq Scan e Volume de Dados**: O planejador de custos do PostgreSQL pode escolher legitimamente `Seq Scan` em tabelas pequenas (poucas centenas de linhas ou poucas páginas de disco) onde o custo de ler diretamente os blocos é menor do que percorrer o bitmap de índices. Portanto, `Seq Scan` não é um erro em si; deve-se investigar apenas `Seq Scan` inesperado em consultas críticas ou tabelas relevantes com alto custo de buffers/tempo.
   - Em tabelas menores (`products`, `product_variations`), o valor de `pg_trgm` reside principalmente em tolerância a erros de digitação, qualidade de UX e prevenção arquitetural contra filtros em massa no frontend. Para tabelas atualmente vazias (`compositions`, `ncm_aliases`), índices servem de preparação para o fluxo futuro e seu ganho prático só poderá ser medido com massa real de dados. A evidência de ganho drástico de performance manifesta-se prioritariamente em tabelas mais volumosas (ex: `ncms` com mais de 10.000 linhas).
2. **Normalização Prévia**:
   - Normalize espaços duplicados, trim e lowercase antes da query.
   - Trigram mede semelhança sintática de caracteres; **não resolve sinônimos** ("roupeiro" x "guarda-roupa"). Sinônimos exigem dicionário/aliases determinísticos combinados com a busca.
3. **Paginação, Projeção e Controle de Egress**:
   - Toda busca textual remota deve conter `LIMIT` explícito. No MoranteHub, adota-se como diretriz de produto e UX de 15 a 30 registros por página para conforto visual e redução significativa de Egress (trata-se de uma diretriz de aplicação/UX, não de uma restrição interna do trigram).
   - Projeção seletiva de colunas é mandatória: evite `select('*')` em tabelas com metadados ou JSONs.
   - **Proibido** realizar downloads de centenas de registros (`while(true)` ou fallbacks de 500 itens) para filtrar via `.filter()` no React.
   - *Nota de governança*: os fluxos auditados tiveram seus principais riscos de egress corrigidos; o consumo global da plataforma continua dependendo dos demais módulos e do uso real.
4. **Debounce e Quantidade Mínima de Caracteres**:
   - Controlar a digitação com debounce apropriado ao fluxo, normalmente na ordem de algumas centenas de milissegundos, calibrado conforme a experiência do usuário e o custo da consulta.
   - Exigir mínimo de 2 ou 3 caracteres antes de disparar consultas remotas caras.
5. **Ranking de Relevância**:
   - Priorizar: correspondência exata > prefixo determinístico > maior similaridade trigram.

---

## 6. Testes de Banco e Migrações

- Para estado de gates, repetição de preflight e retomada após bloqueio, siga `Gates e continuidade da execução` em `testes-seguros-erp`; esta skill define apenas evidências específicas do banco. Uma migration, RPC, RLS, permissão ou conjunto de Advisors já aprovado não deve ser revalidado sem mudança relevante posterior.
- Ao alterar schema, RLS, funções, triggers ou RPCs, aplique a matriz canônica de `testes-seguros-erp` quando houver comportamento relevante no banco: PostgreSQL real isolado, estado final, constraints, permissões, atomicidade, rollback, concorrência e idempotência conforme aplicável.
- Use a matriz canônica de ambiente e isolamento de `testes-seguros-erp`; ela define quando Supabase Local é necessário, quais operações são proibidas no remoto e a exceção fiscal HML `tpAmb=2`. Não duplique essa matriz nesta skill.
- Mocks, inspeção SQL ou resposta de API isolada não provam integração/atomicidade. Se uma prova perigosa exigir ambiente local indisponível, bloqueie somente essa prova e continue validações independentes permitidas.
- Para uma migration alterada, teste em banco novo e em upgrade representativo conforme o risco e preserve compatibilidade/dados legados conforme `migration`; confira somente os objetos afetados. Não repita essas provas depois de aprovadas enquanto migration, baseline e ambiente continuarem iguais.

---

## 7. Checklist de Banco de Dados

Antes de concluir qualquer alteração de banco:
- [ ] A consulta está paginada no servidor (`limit` / `.range`)?
- [ ] Evitei `select('*')` em tabelas com colunas JSON pesadas?
- [ ] A busca textual utiliza o índice correto (`gin_trgm_ops` para texto livre vs B-tree para SKU/CPF/chaves)?
- [ ] O mobile offline (SQLite) não depende de extensões do PostgreSQL?
- [ ] As novas colunas possuem defaults seguros que não quebram registros legados?
- [ ] A migration foi testada e é idempotente (`IF NOT EXISTS`)?

## Referências e Fonte Canônica de Documentação

- Continuidade de gates e matriz de testes: `.agents/skills/testes-seguros-erp/SKILL.md`.
- Transições de schema e compatibilidade: `.agents/skills/migration/SKILL.md`.
- Normas de emissão fiscal e HML: `.agents/skills/fiscal-nfe-nfce-official-docs/SKILL.md`.

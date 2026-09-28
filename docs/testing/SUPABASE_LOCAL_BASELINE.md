# Critérios de Baseline Autoritativa — Supabase Local

## Decisão atual

**Baseline completa selecionada: nenhuma.** Não existe artefato local que prove, com proveniência suficiente, o schema completo do ERP em um ponto conhecido e compatível com todas as migrations posteriores. Portanto, o repositório continua em `INCONCLUSIVO`; não gere dump ou snapshot novo para preencher essa lacuna.

## Inventário de candidatas auditado

Auditoria estática do repositório e das refs locais em 28/09/2026, no commit `365c0e23`. Não houve acesso a banco, fetch de refs ou leitura de payloads de backup.

| Candidata | Origem, versão e escopo | Lacunas / incompatibilidades | Decisão |
|---|---|---|---|
| `supabase/migrations` | 189 migrations rastreadas na branch `main` (`origin/main`), da `202604022000_create_label_layouts.sql` até `rename_category_jogo_cozinha.sql`; cobrem alterações incrementais do ERP. `supabase/config.toml` é a única configuração local ativa encontrada. | A cadeia começa assumindo schema existente; não localizei criação base de `public.products`. O config aponta para `supabase/seed.sql`, que não existe no checkout. Portanto, reset limpo e seed completo não estão demonstrados. | Não é baseline inicial completa. |
| `supabase/test/schema-base.sql` | Dump SQL histórico rastreado desde `177f24fb` (02/09/2026), modificado posteriormente até `365c0e23`. Inclui declarações para cerca de 30 tabelas, 9 funções, 2 triggers, 65 policies e 44 constraints. | Não há provenance ligando-o a commit/migration cutoff de um banco conhecido. Contém divergências de tipo em relação à cadeia posterior; por exemplo, `orders.id` é `text`, enquanto há contratos posteriores que esperam UUID. Não permite provar um upgrade reproduzível. | Rejeitado como baseline autoritativa. |
| `supabase/tests/local-indisponibilidades/baseline` | Snapshot com origem no commit `177f24fb` (02/09/2026), usado pelo runner local específico de Indisponibilidades. Declara cerca de 40 tabelas, 13 funções, 7 triggers, 88 policies, 16 índices e 68 constraints. | O README delimita o escopo e adiciona fixtures locais para `suppliers` e colunas de status de movimentação ausentes. Não representa a cadeia completa do ERP; contém contratos/tipos que divergem de migrations posteriores. | Válido somente para o recorte documentado; rejeitado para certificação global. |
| `digital-catalog/supabase/migrations` | 31 arquivos de evolução do Catálogo Digital, de 2024 a 2026. | `20240101000000_initial_schema.sql` está vazio (0 bytes); as migrations encontradas são incrementais e focadas no catálogo. Não existe `config.toml` próprio nesse diretório. | Não reconstroem o schema completo desde banco vazio. |
| `erp/supabase/migrations` | Dois arquivos, ambos de setembro de 2026, sobre etiquetas/incremento de sequência de variações. | Escopo pontual; não contêm o schema base nem formam a configuração local ativa. | Não é baseline. |
| `erp/scratch/schema_audit.json` e `erp/src/scratch/full_schema_results.json` | Relatórios locais de introspecção: um enumera 15 tabelas; o outro resume 13 áreas/tabelas. | Não informam ref/projeto, timestamp, commit/cutoff ou hashes; não são DDL completo de constraints, triggers, grants, RLS e Storage. O segundo contém indicadores de amostras; os valores não foram inspecionados nem usados. | Evidência parcial sem provenance; não é baseline. |
| `temp_schema.sql` | Arquivo rastreado no Git. | Está vazio (0 bytes). | Sem conteúdo utilizável. |
| `supabase/backups/legacy_jsonb_backup_20260912/*.json` | Arquivos de backup de payloads JSONB legados. | São dados, não um snapshot estrutural do schema; não foi inspecionado o conteúdo e não devem ser usados como baseline ou fonte de dados de teste. | Excluídos. |

As refs locais incluem `main`/`origin/main`, `origin/dev` e `feature/cadastro-rapido-categoria`; não há tags. A busca no histórico disponível não encontrou uma migration base completa de `public.products`; as ocorrências de criação encontradas pertencem a snapshots/fixtures. Nenhum commit/tag encontrado foi promovido automaticamente. A migration `supabase/migrations/20260928000000_atomic_nfe_outbound_reservation.sql` está fora do Git e fora desta auditoria, conforme instrução explícita; não foi alterada nem incorporada.

## Opções se não houver baseline histórica válida

| Opção | Confiança | Custo | Risco | O que a certificação provaria |
|---|---|---|---|---|
| **A — escolher um commit histórico** | Baixa com as fontes atuais; subiria somente se aparecer um checkpoint completo com provenance e cadeia posterior íntegra. | Médio para localizar e validar a fonte; alto se for preciso reconstruir lacunas. | Declarar um snapshot parcial como histórico ou atribuir ao commit um estado que ele não representa. | Upgrades apenas a partir do checkpoint histórico escolhido; no estado atual, nenhuma fonte atende ao critério. |
| **B — instituir baseline estrutural nova em versão conhecida** | Média inicialmente; alta após identificar a origem, correlacionar o histórico de migrations e fazer revisão independente. | Alto: obter schema-only autorizado, criar fixtures sintéticas/assertions, hashes, manifesto e prova operacional. | Capturar drift ou estado manual sem vínculo com o código; mitigado por provenance e comparação independente. | Upgrades somente a partir do cutoff formalizado; o histórico anterior permanece não comprovado. |
| **C — certificar somente banco vazio** | Não viável com a cadeia atual; potencialmente alta para novas instalações após uma cadeia completa ser criada e validada. | Muito alto no estado atual: exige tornar a cadeia desde zero completa e reproduzível. | Alterar uma sequência histórica extensa pode introduzir incompatibilidades; não prova preservação de dados antigos. | Instalação limpa a partir da nova cadeia; upgrades anteriores continuariam explicitamente não comprovados. |

**Recomendação, sem promoção automática:** preparar a Opção B como próximo caminho, condicionada a uma fonte conhecida e autorizada (schema-only, sem linhas operacionais) e a um cutoff ligado a uma versão/commit do ERP. O responsável pelo banco ainda precisa identificar/aprovar essa fonte e versão. Se não houver fonte assim, manter `INCONCLUSIVO`; não substituir por snapshot aproximado. A Opção C só passa a ser viável depois de uma decisão e trabalho separados para completar a cadeia desde zero.

## Requisitos de aceitação

Uma baseline só pode ser promovida quando todos os itens abaixo estiverem preenchidos e revisados:

1. **Origem** — cadeia integral e versionada do projeto desde a criação do schema; ou captura `schema-only` de um ambiente conhecido como correto, autorizada em modo somente leitura e identificada por ref do projeto, sem linhas operacionais. Snapshot parcial, local ad hoc, schema inferido de tipos da aplicação ou dump editado para passar no teste não são fontes válidas.
2. **Versão** — commit Git imutável e migration version máxima já representada. Para captura de banco, registrar data/hora/fuso, `project_id`/ref não secreto, versões de PostgreSQL/Supabase CLI/pg_dump, histórico de migrations do ambiente e SHA-256 dos artefatos.
3. **Schema representado** — schema completo do ERP necessário ao perfil: tabelas/colunas/tipos/defaults/nulabilidade; PK/FK/índices/constraints; extensões/tipos; funções/RPCs; triggers; grants; RLS/policies; objetos e policies de Storage; seeds estruturais. Incluir contratos Auth usados pelo ERP, sem copiar usuários ou segredos reais.
4. **Dados legados** — arquivo separado, sintético e versionado, com somente as linhas mínimas necessárias para provar transformação e preservação durante upgrade. Cada registro deve ter namespace `TEST_AUT_<uuid>`, fixtures pequenas e assertions explícitas antes/depois; sem PII, tokens, anexos reais ou dados de produção.
5. **Fidelidade** — manifesto gerado de uma fonte aprovada e revisado por comparação independente. A baseline deve passar pelas constraints/policies do próprio schema; migrations posteriores devem produzir o snapshot esperado e satisfazer assertions de dados. Nenhum passo manual pode ser pré-requisito oculto.
6. **Reprodutibilidade** — `schema.sql`, `legacy-data.sql`, `legacy-assertions.sql`, metadados e hash ficam versionados juntos. O runner verifica caminhos/hash, aplica a baseline em stack isolado, injeta os dados sintéticos antes das migrations posteriores, aplica as migrations até HEAD, compara o schema final e executa assertions. O stack temporário é identificado por `project_id` exclusivo e removido por esse ID.

## Formato do artefato aprovado

```text
supabase/tests/certification/baseline/
  provenance.json                 # origem, commit, checkpoint, versões, timestamp e hashes
  schema.sql                      # somente DDL, sem dados
  legacy-data.sql                 # fixtures sintéticas do ponto antigo
  pre-upgrade-assertions.sql      # invariantes no checkpoint antigo
  post-upgrade-assertions.sql     # preservação/transformação após migrations
```

O runner usa o DDL e as linhas legadas como migration sintética no checkpoint, valida as assertions pré-upgrade, reaplica a cadeia posterior até HEAD, roda assertions pós-upgrade e compara o schema final com o snapshot esperado. O `schema.expected.json` do perfil contém o snapshot final completo e aponta para a provenance aprovada e os hashes dos arquivos. Até que `provenance.json` seja confirmado, `schema.expected.json` deve continuar `incomplete`; não se deve preencher o snapshot esperado com o resultado do próprio teste candidato.

## Etapa para escolher a fonte

1. Procurar um commit/tag conhecido no qual o DDL inicial completo e o histórico incremental estejam preservados.
2. Se o repositório não tiver esse início, identificar um ambiente Supabase conhecido como correto e obter somente DDL + histórico/versionamento por leitura autorizada; revisão deve confirmar que o checkpoint corresponde ao commit escolhido.
3. Se nenhuma fonte puder ser ligada a um estado conhecido e íntegro do ERP, manter a baseline não selecionada e pedir ao responsável do banco a origem/versionamento corretos. Não tentar reconstruir por aproximação.

Esta definição não declara nenhum dos candidatos atuais autoritativo e não altera a classificação.

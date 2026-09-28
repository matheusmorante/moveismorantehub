# Critérios de Baseline Autoritativa — Supabase Local

## Decisão atual

**Baseline completa selecionada: nenhuma.** Não existe artefato local que prove, com proveniência suficiente, o schema completo do ERP em um ponto conhecido e compatível com todas as migrations posteriores. Portanto, o repositório continua em `INCONCLUSIVO`; não gere dump ou snapshot novo para preencher essa lacuna.

As seguintes fontes foram avaliadas e rejeitadas para certificação global:

- `supabase/tests/local-indisponibilidades/baseline`: snapshot focado, com fixtures para dependências ausentes; serve somente ao recorte indicado pelo README.
- `supabase/test/schema-base.sql`: dump histórico versionado, mas com divergências de tipos já observadas ao tentar aplicá-lo à cadeia atual. Não corresponde a um checkpoint comprovado das migrations.
- `supabase/migrations`: as 185 migrations versionadas não incluem a criação autoritativa inicial de `public.products`; iniciar o histórico atual em banco vazio não reconstrói o schema necessário.

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

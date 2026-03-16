# 📂 Regras de Organização de Scripts e Migrations

Para manter a raiz do projeto limpa e organizada, todos os scripts e arquivos de banco de dados devem seguir esta estrutura:

## 1. Migrações de Banco de Dados (SQL)
**Caminho:** `apps/erp/infrastructure/supabase/`
- Todos os arquivos `.sql` (patches, setups, correções) devem ser salvos aqui.
- Use nomes descritivos em CAIXA_ALTA: `PATCH_CORRECAO_X.sql`.

## 2. Scripts de Migração de Dados (TS/JS)
**Caminho:** `apps/erp/scripts/migration/`
- Scripts usados para importar dados de planilhas, Bling ou outros sistemas.
- Scripts que realizam transformações em massa no banco de dados.

## 3. Scripts de Debug e Utilitários Temporários
**Caminho:** `apps/erp/scripts/debug/`
- Scripts criados para testar uma funcionalidade específica, verificar colunas ou debugar erros.
- Arquivos de log temporários (`.txt`) gerados por esses scripts.

## 4. Scripts de Manutenção Constante
**Caminho:** `apps/erp/scripts/` (na raiz da pasta scripts)
- Scripts que são executados com frequência via CRON ou manualmente para manutenção regular.


---

## 5. Regras Globais do Usuário (AGENTIC RULES)

- **Código Limpo:** Siga sempre os princípios de código limpo e modularizado.
- **Transparência de Ideias:** Salve sempre ideias e planos pendentes em um arquivo (como `task.md` ou similar) para posterior consulta.
- **Custo e Eficiência:** Economize o máximo de cota do plano de assinatura.
- **Ambientes (Dev/Prod):** Sempre considere os ambientes de desenvolvimento e produção ao configurar rotas, variáveis de ambiente e dados ambíguos.
- **Relato de Bugs:** Relate imediatamente qualquer bug que esteja impedindo o progresso.
- **Confirmação:** Pergunte em caso de dúvida sobre ambiguidade ou entendimento.
- **Persistência de Regras:** Salve estas regras sempre em um arquivo do projeto (este arquivo).
- **Idioma:** Fale apenas em Português Brasileiro.

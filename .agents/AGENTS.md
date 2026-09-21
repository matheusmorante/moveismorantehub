# Morante Hub — Mapa Operacional e Roteador

Documento canônico enxuto. O agente consulta apenas o módulo específico sob demanda conforme a tarefa.

---

## Roteador de Módulos Operacionais

Consulte o arquivo correspondente conforme o contexto:

1. **Princípios e Regras Invioláveis**: [.agents/rules/principios-inviolaveis.md](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/.agents/rules/principios-inviolaveis.md)
   * Investigação prévia, causa raiz, menor alteração, identificador único de testes (`testRunId`), proibições e modo caveman.
2. **Matriz e Roteador de Skills**: [.agents/rules/roteador-skills.md](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/.agents/rules/roteador-skills.md)
   * Tabela de decisão e gatilhos para acionar skills técnicas (`database-supabase`, `testes-seguros-erp`, `nfe-sefaz-direto`, etc.).
3. **Documentação Oficial e Regras de Negócio**: [.agents/rules/indice-documentacao.md](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/.agents/rules/indice-documentacao.md)
   * Links para diagramas, ADRs, módulos de estoque, vendas, fiscal e financeiro em `docs/`.
4. **Code Context Router (Obrigatório antes de buscas)**: [docs/code-context-router.yaml](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/docs/code-context-router.yaml)
   * Mapa determinístico de arquivos-chave por domínio. O agente DEVE abrir inicialmente apenas esses arquivos antes de qualquer busca global.

---

## Pre-Flight Rápido (3 Níveis)

Antes de qualquer edição (`replace_file_content` / `write_to_file`):
* **Nível 1 (Global)**: Causa raiz identificada? Menor alteração necessária? Sem refatoração paralela?
* **Nível 2 (Técnico)**: Consultou a skill especializada em `.agents/rules/roteador-skills.md`?
* **Nível 3 (Domínio)**: Verificou conformidade com a documentação oficial em `docs/`?

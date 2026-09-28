# Morante Hub — Guia Operacional Direto

Diretrizes para foco, velocidade e economia máxima de contexto e tokens.

---

## Regras de Execução Direta (Sem Burocracia & Antidesperdício)

1. **Foco no Escopo Solicitado**: Se o arquivo ou componente já foi identificado pelo usuário ou pela tarefa, vá direto a ele. **NÃO** faça exploração preventiva ampla nem leia índices, diagramas ou roteadores.
2. **Proibido Reler Trechos Já Obtidos**: **NUNCA** faça chamadas repetidas de leitura (`view_file`) no mesmo arquivo ou nos mesmos blocos de linhas quando o conteúdo já foi trazido nesta conversa. Reutilize o contexto já retornado.
3. **Expansão Sob Demanda Concreta**: Abra novos arquivos apenas quando houver dependência técnica real e indispensável para concluir a alteração.
4. **Menor Alteração Necessária**: Altere apenas o estritamente necessário. Sem refatorações colaterais, sem limpezas automáticas não pedidas.
5. **Causa Raiz & Resolução Segura**: Entenda o ponto exato da alteração antes de editar.
6. **Sem Git Push Automático**: Aguarde comando explícito do usuário.
7. **Idioma**: Apenas português brasileiro.
8. **Estilo Conciso**: Respostas objetivas, sem preâmbulos, sem desperdício de tokens.

---


## Ferramentas Oficiais e Risco de Validação
* Validação proporcional ao risco: Vitest (Baixo), RTL (Médio), Playwright (Alto), k6/pgTAP/ZAP e Supabase CLI (Crítico/Concorrente).
* Testes destrutivos, concorrência e injeção de segurança devem rodar exclusivamente em Supabase Local reproduzível (`supabase db reset`), somente na janela definida em `.agents/skills/testes-seguros-erp/SKILL.md`, **nunca em produção**.
* Qualidade e Segurança Estática: Biome (Lint/Format Rápido), Knip (Código Morto), Supabase Advisors (RLS/Índices), React Compiler (Otimização Reativa), Gitleaks (Detecção de Segredos), Trivy (CVEs/SBOM) e OpenTelemetry (Tracing com Sanitização PII).
* Para buscas estruturais complexas e auditorias/migrações globais solicitadas, use ast-grep e as regras existentes; mudanças pequenas não exigem a ferramenta. Critérios em `.agents/skills/governanca-skills/SKILL.md`.
* Para rastrear callers/callees, caminhos entre módulos e impacto de mudanças, use CALM quando disponível; use `rg` para busca textual simples. CALM informa relações do código e não substitui skills, documentação de domínio ou testes. Configuração: `.codex/config.toml`; índice local ignorado: `.calm/`.

## Consultas Opcionais (Apenas Sob Demanda Específica)
Consulte apenas se a tarefa envolver o tema correspondente:
* Princípios detalhados: [.agents/rules/principios-inviolaveis.md](file:///c:/Users/Rosilene/Desktop/morantehub/.agents/rules/principios-inviolaveis.md)
* Regras de negócio profundas (SEFAZ, Supabase, etc.): consulte as skills e docs específicos **somente sob demanda expressa**.


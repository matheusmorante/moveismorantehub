---
name: relatorios-pos-tarefa
description: Padroniza relatórios finais de agentes após concluir, interromper ou bloquear uma tarefa no MoranteHub, com resultado, validações, pendências e impacto operacional claros.
---

# Relatórios pós-tarefa

Use esta skill automaticamente ao encerrar ou interromper qualquer tarefa deste projeto e apresentar o relatório final. Ela orienta apenas a comunicação; não autoriza nem altera ações, políticas de segurança ou validações.

Comece pelo resultado, usando um destes status:

- ✅ **Concluído** — objetivo cumprido com evidências suficientes.
- ⚠️ **Parcial** — parte do objetivo foi cumprida e há pendências.
- ❌ **Bloqueado** — o objetivo principal não pôde ser executado ou concluído.

Logo abaixo, resuma o resultado em até três frases. Organize o restante em seções Markdown, nesta ordem quando houver conteúdo relevante:

1. **O que foi feito** — mudanças agrupadas por assunto, em frases curtas, sem cronologia irrelevante.
2. **Testes e validações** — resultados observados, quantidades quando disponíveis, verificações não executadas e motivo, e limitações. Diferencie validações locais, simulações, integração remota e E2E real.
3. **Problemas e pendências** — falhas, riscos, limitações e bloqueios ainda existentes.
4. **Impacto operacional** — quando aplicável, informe separadamente o que foi executado, apenas analisado e continua pendente quanto a banco/dados, migrations, deployments, integrações externas e efeitos colaterais.
5. **Próximo passo** — ação recomendada, se houver; identifique ações que dependam de autorização explícita.
6. **Arquivos modificados** — links dos principais arquivos no final, agrupados quando fizer sentido.

Omitir seções sem informação relevante e não repetir fatos em várias seções. Priorizar leitura rápida, espaçamento, títulos e listas; usar negrito com parcimônia e emojis discretamente. Evitar tabelas desnecessárias. Buscar até 250 palavras em tarefas comuns, ampliando quando a complexidade ou o risco exigir. Usar Markdown compatível com o ambiente.

Seja factual: não declare sucesso sem evidência, não trate etapas essenciais pendentes como concluídas, não oculte falhas ou riscos e não apresente simulações como validações reais. Autorização de leitura não significa autorização de gravação; recomendações não são ações autorizadas. Preserve todas as políticas existentes de Supabase, segurança, migrations, testes e homologação fiscal.

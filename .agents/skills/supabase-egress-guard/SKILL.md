---
name: supabase-egress-guard
description: Guardião obrigatório de Egress e limites do Free Tier do Supabase. Consulte sempre que criar ou alterar integrações, hooks, realtimes, setIntervals ou selects pesados para prevenir cobranças acidentais e estourar o limite de 5GB/mês ou 100k conexões.
---

# Skill: Supabase Egress & Free Tier Guard (`supabase-egress-guard`)

## Quando aplicar esta Skill

Use ao criar ou alterar consultas volumosas, polling, Realtime, sincronização ou transferências automáticas de Storage.

## Quando NÃO aplicar

Não use para consultas pontuais de baixo volume nem como gate de autorização para alterações Supabase comuns. Para acesso, ambiente e persistência, use `database-supabase` e `testes-seguros-erp`.

## OBJETIVO
Proteger os limites do **Plano Grátis (Free Tier) do Supabase** (5GB Egress/mês, 100k Realtime concurrent, 2GB database) contra códigos não otimizados, loops infinitos, "efeito metralhadora" de WebSockets e requisições pesadas no ERP e Mobile.

> [!IMPORTANT]
> **REGRA FUNDAMENTAL**: avalie o volume, frequência, paginação, projeção e cache das chamadas ao Supabase. Um uso comum ou controlado não exige interromper o trabalho nem pedir autorização. Se restar risco concreto e material de cobrança/limite que não possa ser mitigado no escopo autorizado, apresente a estimativa e peça decisão antes de introduzir esse custo.

---

## 1. Gatilho Obrigatório de Consulta (Quando Ativar)

Consulte esta skill ao implementar ou alterar:
- Criação de novos canais `Realtime` (`supabase.channel().subscribe()`).
- Inserção de `setInterval` ou `setTimeout` que faça chamadas de API ou banco de dados.
- Consultas amplas como `.select('*')` em tabelas centrais (`orders`, `products`, `team_locations`).
- Funcionalidades de "Sync", "Refresh" ou "Dashboard" que puxem dados múltiplos.
- Upload e Download de mídias (Storage) que rodem automaticamente.

---

## 2. Tratamento de Risco Material de Egress

Quando houver risco concreto de Egress, primeiro estime-o com os dados disponíveis e aplique paginação, projeção, filtros, debounce ou cache proporcionais. Reaproveite evidência atual de volume/limites. Peça decisão somente se a solução ainda implicar custo material recorrente ou exceder a autorização da tarefa; não bloqueie o trabalho por risco hipotético já mitigado.

---

## 3. Diretrizes Técnicas OBRIGATÓRIAS (Padrões de Aceitação)

Se você for escrever código Supabase, aplique preventivamente as seguintes travas de segurança:

### A. Realtime e WebSockets
- **Debounce é Lei:** Nunca crie um `postgres_changes` que atualize a interface ou re-consulte o banco imediatamente a cada evento. Use um `setTimeout` de no mínimo 2000ms a 5000ms (Debounce) para agrupar as requisições, evitando o "Efeito Metralhadora".
- **Filtros Locais vs Servidor:** Se possível, filtre eventos no próprio canal (`filter: 'eq(...)'`).

### B. Polling (`setInterval`)
- O polling tradicional (`setInterval` batendo no Supabase) é terminantemente proibido para tabelas grandes se houver suporte a Realtime.
- Se for estritamente necessário, o tempo mínimo de intervalo deve ser de **5 minutos (300000ms)**, exceto se expressamente autorizado pelo usuário.

### C. Supabase Storage e Mídias
- **Não baixe arquivos publicamente repetidas vezes:** Confie no cache do navegador ou use URIs locais após o download (no React Native / Expo FileSystem).
- Reduza resolução de imagens antes do upload (compressão client-side).

### D. Buscas Pesadas
- **Proibido `.select('*')` sem `.limit()` ou `.range()`** em tabelas que podem crescer, como Pedidos e Produtos.
- Use paginação obrigatoriamente.
- Se precisar de uma soma ou contagem global, prefira usar `count: 'exact'` e buscar `.limit(1)` em vez de baixar todas as linhas para contar `.length` no JavaScript.

## Referências e Fonte Canônica de Documentação

- Acesso, schema e ambiente Supabase: `.agents/skills/database-supabase/SKILL.md`.
- Gates e continuidade de testes: `.agents/skills/testes-seguros-erp/SKILL.md`.

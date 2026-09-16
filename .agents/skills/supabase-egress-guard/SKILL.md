---
name: supabase-egress-guard
description: Guardião obrigatório de Egress e limites do Free Tier do Supabase. Consulte sempre que criar ou alterar integrações, hooks, realtimes, setIntervals ou selects pesados para prevenir cobranças acidentais e estourar o limite de 5GB/mês ou 100k conexões.
---

# Skill: Supabase Egress & Free Tier Guard (`supabase-egress-guard`)

## OBJETIVO
Proteger os limites do **Plano Grátis (Free Tier) do Supabase** (5GB Egress/mês, 100k Realtime concurrent, 2GB database) contra códigos não otimizados, loops infinitos, "efeito metralhadora" de WebSockets e requisições pesadas no ERP e Mobile.

> [!IMPORTANT]
> **REGRA FUNDAMENTAL**: SEMPRE que o agente (você) for implementar, alterar ou sugerir qualquer código que envolva chamadas ao Supabase (`.select()`, `setInterval`, `.subscribe()`, `postgres_changes`, `Edge Functions`), você DEVE OBRIGATORIAMENTE interromper a ação e perguntar ao usuário se ele aceita a implementação sob a ótica de consumo de Egress.

---

## 1. Gatilho Obrigatório de Consulta (Quando Ativar)

Consulte esta skill ANTES de escrever o código se a tarefa envolver:
- Criação de novos canais `Realtime` (`supabase.channel().subscribe()`).
- Inserção de `setInterval` ou `setTimeout` que faça chamadas de API ou banco de dados.
- Consultas amplas como `.select('*')` em tabelas centrais (`orders`, `products`, `team_locations`).
- Funcionalidades de "Sync", "Refresh" ou "Dashboard" que puxem dados múltiplos.
- Upload e Download de mídias (Storage) que rodem automaticamente.

---

## 2. Protocolo de Autorização (Alerta ao Usuário)

Quando você identificar um potencial risco de Egress ou excesso de requisições:
1. **Pare imediatamente.**
2. Gere o alerta para o usuário usando formatação destacada (`> [!WARNING]`).
3. Explique qual é o impacto estimado (ex: "Isso pode gerar 5.000 requisições por hora se o app ficar aberto").
4. **Pergunte explicitamente:** "Você autoriza essa implementação ou prefere que eu crie uma alternativa mais econômica (ex: paginação, debounce, aumentar o intervalo)?"
5. **NÃO PROSSIGA** com a gravação de arquivos que contenham o risco de Egress até que o usuário responda "sim, eu aceito".

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

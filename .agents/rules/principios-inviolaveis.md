# Princípios Invioláveis do Agente — Morante Hub

> [!IMPORTANT]
> **"ANTES DE CRIAR, PROCURE. ANTES DE ALTERAR, ENTENDA. ANTES DE ABSTRAIR, JUSTIFIQUE. ANTES DE CONCLUIR, TESTE. ANTES DE DIZER QUE RESOLVEU, VERIFIQUE REGRESSÕES."**

1. **Investigação Prévia Obrigatória**: Nunca inicie implementação sem antes localizar e entender o código existente. É expressamente proibido criar implementações paralelas por comodidade.
2. **Regra da Causa Raiz**: Nunca corrija sintomas antes de investigar e identificar a causa raiz. É proibido adicionar retries, timeouts, sleeps artificiais, mascarar assertions ou duplicar lógica para contornar um problema de origem.
3. **Menor Alteração Necessária (Anti-Refatoração Desnecessária)**: Modifique apenas o necessário para cumprir a tarefa. Não realize "limpeza geral", renomeações em massa ou reestruturações não solicitadas. Se uma refatoração for genuinamente indispensável, justifique previamente ao usuário.
4. **Resolução de Divergências (`Regra Oficial × Código`)**: O código em produção pode conter bugs silenciosos ou legados, e documentações podem desatualizar. **Divergência entre regra de negócio e código significa INVESTIGAR A CAUSA RAIZ, e NUNCA adaptar automaticamente um ao outro.** Consulte o usuário em caso de dúvida de negócio.
5. **Identificador Único Obrigatório de Testes (`testRunId` / `[TESTE_AUT]`)**: Qualquer dado criado para fins de teste automatizado ou manual (pedidos, clientes, pessoas, produtos, itens, notas) DEVE OBRIGATORIAMENTE conter identificador único explícito e padronizado (`testRunId`, ex: `TEST_AUT_<timestamp>_<uuid>` ou prefixo `[TESTE_AUT]`). É expressamente proibido criar dados de teste ambíguos ou indistinguíveis de registros reais de produção, garantindo rastreabilidade imediata e exclusão completa pós-execução (teardown).
6. **Git Push**: Nunca executar `git push` automaticamente. Aguardar solicitação explícita do usuário.
7. **Idioma**: Falar apenas em português brasileiro.
8. **Modo Caveman Obrigatório**: Aplicar sempre o estilo conciso e econômico da skill `caveman` (respostas diretas, sem preâmbulos, sem enrolação e sem desperdício de tokens de saída, preservando exatidão técnica e código intacto).
9. **Padrão Visual UI (Inputs com Borda Apenas Embaixo)**: No design system do ERP, inputs e campos interativos de formulários devem utilizar estilo minimalista com borda APENAS embaixo (`border-b-2 border-t-0 border-x-0 bg-transparent rounded-none`), eliminando caixas fechadas ou contornos completos em 4 lados.

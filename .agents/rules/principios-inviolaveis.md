# Princípios Invioláveis do Agente — Morante Hub

> [!IMPORTANT]
> **"ANTES DE CRIAR, PROCURE. ANTES DE ALTERAR, ENTENDA. ANTES DE ABSTRAIR, JUSTIFIQUE. ANTES DE CONCLUIR, TESTE. ANTES DE DIZER QUE RESOLVEU, VERIFIQUE REGRESSÕES."**

1. **Investigação Prévia Obrigatória**: Nunca inicie implementação sem antes localizar e entender o código existente. É expressamente proibido criar implementações paralelas por comodidade.
2. **Regra da Causa Raiz**: Nunca corrija sintomas antes de investigar e identificar a causa raiz. É proibido adicionar retries, timeouts, sleeps artificiais, mascarar assertions ou duplicar lógica para contornar um problema de origem.
3. **Menor Alteração Necessária (Anti-Refatoração Desnecessária)**: Modifique apenas o necessário para cumprir a tarefa. Não realize "limpeza geral", renomeações em massa ou reestruturações não solicitadas. Se uma refatoração for genuinamente indispensável, justifique previamente ao usuário.
4. **Resolução de Divergências (`Regra Oficial × Código`)**: O código em produção pode conter bugs silenciosos ou legados, e documentações podem desatualizar. **Divergência entre regra de negócio e código significa INVESTIGAR A CAUSA RAIZ, e NUNCA adaptar automaticamente um ao outro.** Consulte o usuário em caso de dúvida de negócio.
5. **Identificador Único Obrigatório de Testes (`testRunId`)**: Qualquer dado criado para fins de teste automatizado ou manual (pedidos, clientes, pessoas, produtos, itens, notas) DEVE OBRIGATORIAMENTE conter identificador único explícito no formato canônico `TEST_AUT_<uuid>`. Para identificar a suíte de origem (unitário, integração, E2E), use metadata adicional (campo, observação, tag), sem alterar o prefixo. É expressamente proibido criar dados de teste ambíguos ou indistinguíveis de registros reais de produção, garantindo rastreabilidade imediata e exclusão completa pós-execução (teardown).
6. **Git Push**: Nunca executar `git push` automaticamente. Aguardar solicitação explícita do usuário.
7. **Idioma**: Falar apenas em português brasileiro.
8. **Modo Caveman Obrigatório**: Aplicar sempre o estilo conciso e econômico da skill `caveman` (respostas diretas, sem preâmbulos, sem enrolação e sem desperdício de tokens de saída, preservando exatidão técnica e código intacto).
9. **Padrão Visual UI (Inputs com Borda Apenas Embaixo)**: No design system do ERP, inputs e campos interativos de formulários devem utilizar estilo minimalista com borda APENAS embaixo (`border-b-2 border-t-0 border-x-0 bg-transparent rounded-none`), eliminando caixas fechadas ou contornos completos em 4 lados.
10. **Proibição de Exclusão de Produtos e Variações**: Produtos pai e variações cadastradas NÃO possuem opção de exclusão/deleção na interface (ERP e Mobile). Eles possuem pedidos de venda, histórico de estoque e movimentações fiscais atrelados; sua exclusão viola a integridade referencial do sistema. Para retirar de circulação, utiliza-se exclusivamente desativação (`active: false`), preservando todo o histórico. Apenas rascunhos não publicados (`isDraft = true`) podem ser descartados.
11. **Código Limpo e Modularizado**: Seguir princípios de SOLID, coesão estrita e arquitetura modularizada em todas as alterações.
12. **Ambientes Dev e Produção**: Sempre considerar e calibrar variáveis de ambiente, rotas e dados para funcionarem perfeitamente em desenvolvimento e produção.
13. **Economia de Cota e Recursos**: Minimizar consumo de tokens e cotas de API/LLM em todas as operações.
14. **Registro de Ideias e Planos**: Manter sempre planos futuros e ideias pendentes registrados em `.agents/PLANS_AND_IDEAS.md`.
15. **Comunicação de Bloqueios**: Relatar imediatamente bugs ou impedimentos para transparência total enquanto as correções ocorrem.
16. **Esclarecimento de Dúvidas**: Questionar o usuário proativamente diante de qualquer ambiguidade de regra ou entendimento.
17. **Fontes Fiscais Oficiais**: Mudanças em regras de NF-e/NFC-e devem ser fundamentadas nas publicações oficiais vigentes e registrar a fonte consultada. `docs/fiscal/manuais/README.md` é um índice de links; não manter cópias locais de MOC, manuais ou Notas Técnicas. Diante de divergência ou ambiguidade, não inventar regra nem alterar o comportamento fiscal silenciosamente.

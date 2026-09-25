---
name: erp-web-to-mobile-replication
description: Replica telas, abas, componentes e módulos existentes do ERP Web no App Mobile em React Native, preservando fidelidade visual, comportamento, regras e fluxos com máxima reutilização da lógica de negócio e adaptação responsiva.
---

# Replicação ERP Web → App Mobile

## Quando aplicar esta Skill

Use obrigatoriamente ao replicar, portar ou adaptar qualquer tela, aba, componente ou módulo existente do ERP Web para React Native.

## Princípio Fundamental: Reutilização da Lógica de Negócio

> **Reutilizar primeiro. Adaptar somente o necessário. Duplicar somente quando houver justificativa técnica real.**

Ao replicar um módulo, tela, funcionalidade ou alteração do ERP para o aplicativo, **nunca recrie a lógica de negócio desnecessariamente**. O maior risco arquitetural é a divergência silenciosa: ERP e App funcionarem iguais hoje, mas terem duas implementações independentes da mesma regra que começam a divergir no primeiro ajuste futuro.

---

## Separação: Lógica de Negócio vs. Implementação de Plataforma

Identifique claramente o que é lógica pura e o que é específico de plataforma antes de codificar.

### 1. Priorizar Compartilhamento (Lógica Pura JS/TS)
Tudo o que for independente da interface e do ambiente de execução deve ser compartilhado ou manter a mesma fonte de verdade:
- Regras de negócio, cálculos fiscais/financeiros e matrizes de estado;
- Validações de formulários, campos obrigatórios e invariantes de domínio;
- Transformações de dados, filtros, agrupamentos e ordenações;
- Formatação de moedas, documentos, telefones e datas;
- Tipos, interfaces TypeScript, schemas (Zod/Yup) e constantes/enums;
- Regras de transição de status e matriz de permissões;
- Preparação de payloads para mutação e sanitização de inputs;
- Interpretação de respostas do backend e mapeamento de DTOs;
- Funções relacionadas a queries/mutations do Supabase que não dependam de DOM;
- Hooks ou services puros (quando desacoplados de elementos visuais);
- Demais funções JavaScript/TypeScript puras.

### 2. Específico de Plataforma (Adaptar Mantendo Equivalência)
Não tentar compartilhar à força o que depende intrinsecamente do runtime:
- **ERP / Web:** HTML, elementos DOM (`window`, `document`), CSS/Tailwind Web, APIs do navegador (LocalStorage, impressão direta via browser/Windows), componentes exclusivamente Web.
- **React Native / App:** Primitivas nativas (`View`, `Text`, `Pressable`, `ScrollView`), StyleSheet nativo, navegação mobile (stacks/tabs), câmera, SQLite/local-first, permissões Android/iOS, notificações push, APIs nativas do Expo/RN, comportamento offline pragmático.

Nesses casos, adapte a implementação mantendo **a mesma regra funcional e exatamente o mesmo resultado esperado**.

---

## Regra Obrigatória Antes de Criar Qualquer Código

Antes de escrever uma função, hook, service, validação ou regra nova no aplicativo:

1. **Localizar no ERP:** Inspecione a implementação correspondente no ERP Web (`erp/`).
2. **Localizar Módulos Compartilhados:** Verifique se a lógica já existe em módulos compartilhados (`shared/`, pacotes comuns ou pastas de domínio compartilháveis).
3. **Localizar no App:** Inspecione a implementação atual no aplicativo (`mobile/`).
4. **Comparar as três:** Analise contratos, entradas, saídas e efeitos colaterais.
5. **Determinar Reutilização:** Verifique se é possível reutilizar diretamente o código existente.
6. **Extrair Lógica Pura (se viável e seguro):** Se a lógica no ERP estiver acoplada a coisas simples de Web mas for pura, avalie se a regra pura pode ser extraída para um módulo compartilhado sem risco de quebra.
7. **Implementar Específico Somente Sob Demanda:** Apenas crie implementação específica para React Native se houver dependência técnica real de plataforma ou risco comprovado de acoplamento.

**Proibição explícita:** Nunca crie automaticamente pares duplicados como:
```text
ERP:  calcularComissaoVendedor()
App:  calcularComissaoVendedorMobile()
```
Se ambas executam a mesma regra, a regra deve ser única e centralizada.

### Política Antirrefatoração Indiscriminada
- Se uma lógica já estiver compartilhada corretamente, reutilize sem mexer na estrutura.
- Se estiver separada, mas a extração exigir refatoração ampla, invasiva ou de alto risco no ERP, preserve o código existente e crie a menor adaptação segura, documentando o ponto de convergência futura.
- A diretriz é: **menor alteração segura + máxima reutilização + mesmo comportamento**. Nunca faça grandes refatorações apenas por purismo conceitual.

---

## Fontes de Verdade e Paridade ERP → Shared → App

- **Código do ERP:** Referência canônica de comportamento, estados, regras, validações e fluxos consolidados.
- **Navegador (ERP Web e Expo Web):** Referência de validação visual e interativa automatizada via Playwright. O layout mobile no browser não comprova comportamento nativo.
- Não implemente de memória. Mapeie a paridade ponta a ponta:

```text
O que é regra de negócio?
        ↓
Pode ser compartilhado / reutilizado?
        ↓
SIM → reutilizar diretamente ou extrair lógica pura
NÃO → adaptar para React Native com mesmo contrato
        ↓
Resultado final DEVE permanecer estritamente equivalente
```

Para cada tela, estado ou ação, confira a cadeia de paridade:
1. Entrada de dados e validações;
2. Regra executada e cálculos;
3. Chamada ao backend / Supabase e payload enviado;
4. Resposta tratada e mudanças de estado local;
5. Estados de interface: loading, vazio, sucesso, erro, bloqueio por permissão;
6. Efeitos colaterais e feedback visual ao usuário.

---

## Processo de Execução: Uma Aba e um Estado por Vez

### Validação no navegador e entrega para validação nativa

Use Playwright como única automação de interface: valide o ERP Web e, quando suportado, a aplicação em Expo Web no navegador. Use viewport mobile para avaliar layout responsivo, deixando explícito que isso valida o browser, não o runtime nativo.

Não instale/configure/inicie Maestro, ADB, Expo MCP, emulador/AVD nem automatize aparelho físico. Câmera, permissões, lifecycle, SQLite nativo e demais integrações exclusivas do React Native não são comprovadas por Playwright. Faça as validações focadas e estáticas possíveis; quando a mudança exigir confirmação nativa, prepare um APK para o usuário testar manualmente, sem instalar ou executar o APK.

Trabalhe em uma aba de cada vez e, dentro dela, em um estado por vez. Não replique o módulo inteiro antes de comparar.

### 1. Inspecionar o ERP Original
- Identifique abas, componentes, estados e interações: carregamento, vazio, erro, dados, seleção, expansão, filtros, busca, paginação, menus, modais, formulários, confirmações e feedback.
- Identifique os services, queries e helpers chamados pelo ERP nessa aba.

### 2. Mapear Reutilização e Equivalências
- Liste o que será reutilizado diretamente vs. o que será adaptado para mobile:
```text
Lógica de Negócio (Compartilhada/Reutilizada): [services, validações, tipos]
Adaptação de Plataforma Mobile: [UI nativa, scroll, modais touch, feedback]
Justificativa técnica de qualquer duplicação (se estritamente inevitável): [motivo]
```

### 3. Replicar e Comparar o Estado Principal
- Implemente primeiro o estado principal da aba conectando a lógica pura mapeada.
- Preserve a identidade visual — cores, hierarquia, tipografia, ícones equivalentes (Lucide RN), bordas, espaçamentos, badges e estados — adaptando dimensões e área de toque para celular.
- Compare visualmente e funcionalmente com o ERP usando Playwright no navegador, incluindo Expo Web quando suportado; registre limitações de paridade nativa.

### 4. Percorrer Estados Alternativos
- Valide na mesma aba: vazio, carregando, erro, sem resultados de busca, formulário inválido, modal aberto, seleção múltipla e confirmação de exclusão.
- Assegure que as mensagens de validação e bloqueios de regra sejam idênticos aos do ERP.

### 5. Validar com Menor Custo
- Execute primeiro testes focados do módulo alterado.
- Execute verificação estática de tipos (TypeScript) no mobile/ERP sem rodar suítes pesadas desnecessariamente.
- Use Playwright para os fluxos de interface disponíveis no navegador. Integrações exclusivamente nativas ficam para validação manual do usuário no APK.

---

## Governança Contra Divergências Futuras

Quando qualquer funcionalidade do ERP for alterada futuramente:
1. **Alteração em código compartilhado:** Verificar se o aplicativo móvel já consome a mudança e se precisa de ajustes na UI.
2. **Alteração na implementação Web:** Avaliar se houve mudança de regra funcional que deva ser refletida no app.
3. **Mudança de Regra de Negócio:** Atualizar preferencialmente a fonte compartilhada/central da regra.
4. **Mudança puramente cosmética/Web:** Não alterar código mobile desnecessariamente.
5. **Divergência Detectada:** Registrar imediatamente para alinhamento funcional.

---

## Checklist de Conclusão por Aba

**Lógica e Regras**
- [ ] Regras de negócio, cálculos e validações reutilizadas ou estritamente equivalentes ao ERP.
- [ ] Tipos TypeScript, payloads e chamadas ao Supabase unificados sem desvios de regra.
- [ ] Bloqueios de integridade (ex: exclusão bloqueada com itens vinculados) preservados com a mesma mensagem e condição.

**Visual e Interação**
- [ ] Elementos, ordem, hierarquia e labels equivalentes ao ERP.
- [ ] Cores, ícones Lucide equivalentes, tipografia e badges alinhados.
- [ ] Estados de carregamento, vazio, busca sem resultados e erro comparados.
- [ ] Layout responsivo sem overflow, cortes ou problemas com teclado móvel.

**Plataforma Mobile**
- [ ] Área de toque adequada (mínimo 44x44px em botões críticos).
- [ ] Feedback nativo (Alert, haptics, modais, RefreshControl) está implementado e coberto por validações focadas possíveis; comportamento real será conferido pelo usuário no APK.

---

## Critério de Conclusão

A implementação está pronta para validação quando a lógica e os fluxos suportados pelo navegador tiverem paridade comprovada via Playwright e as verificações focadas passarem. Comportamentos exclusivamente nativos devem ser identificados como pendentes de validação manual do usuário no APK; não declarar equivalência nativa com base em Expo Web.

## Referências e Fonte Canônica de Documentação

- Playwright — emulação de viewports e dispositivos no navegador: https://playwright.dev/docs/emulation
- Contratos e regras de negócio: código ERP e módulos compartilhados atuais; esta Skill define o processo de paridade, não substitui a fonte canônica do domínio.

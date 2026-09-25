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
- **Navegador e App Mobile:** Referência de validação visual e interativa.
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

### Verificação com Expo MCP (quando disponível)

No projeto `mobile/`, use o Expo MCP local para observar e interagir com o app real sempre que a tarefa alterar uma tela ou fluxo e houver dispositivo/emulador compatível:

1. Inicie o Metro com `EXPO_UNSTABLE_MCP_SERVER=1` (PowerShell: `$env:EXPO_UNSTABLE_MCP_SERVER='1'; npm start`) e conecte/reinicie a sessão MCP se o servidor Expo acabou de iniciar.
2. Prefira `testID` estável para localizar e tocar controles; evite coordenadas quando houver identificadores acessíveis.
3. Capture screenshot do estado relevante e confira loading, vazio, erro, sucesso/modal e resultado da interação conforme o escopo alterado.
4. Colete logs apenas numa janela curta e para investigar erro concreto; nunca registre ou compartilhe tokens, cookies, chaves ou payloads pessoais.
5. Trate screenshot/interação MCP como evidência complementar, não substituta dos testes focados nem da comparação ERP × Mobile.

As capacidades locais requerem Expo SDK 54+ e `expo-mcp` instalado como dependência de desenvolvimento. No Windows, priorize Android, mas faça um smoke test de descoberta do emulador e captura antes de depender das ferramentas: há um relato aberto de falhas com Windows 11 + Git Bash + emulador Android. Automação de iOS Simulator exige host macOS. Se dispositivo, emulador, conta ou conexão não estiverem disponíveis, registre a limitação e continue com testes focados sem alegar validação visual.

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
- Compare visualmente e funcionalmente com o ERP.

### 4. Percorrer Estados Alternativos
- Valide na mesma aba: vazio, carregando, erro, sem resultados de busca, formulário inválido, modal aberto, seleção múltipla e confirmação de exclusão.
- Assegure que as mensagens de validação e bloqueios de regra sejam idênticos aos do ERP.

### 5. Validar com Menor Custo
- Execute primeiro testes focados do módulo alterado.
- Execute verificação estática de tipos (TypeScript) no mobile/ERP sem rodar suítes pesadas desnecessariamente.

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
- [ ] Feedback tátil/nativos (Alert.alert, modais fluidos, RefreshControl).

---

## Critério de Conclusão

A replicação só é considerada concluída quando a lógica de negócio do ERP estiver preservada e reutilizada com o menor índice possível de duplicação, os estados e fluxos estiverem equivalentes e o App Mobile oferecer a mesma confiabilidade operacional do ERP Web.

## Referências e Fonte Canônica de Documentação

- Expo MCP, configuração e capacidades: https://docs.expo.dev/mcp/
- Relato de compatibilidade Windows para automação local: https://github.com/expo/expo-mcp/issues/17
- Contratos e regras de negócio: código ERP e módulos compartilhados atuais; esta Skill define o processo de paridade, não substitui a fonte canônica do domínio.

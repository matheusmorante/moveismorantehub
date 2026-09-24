---
name: erp-web-to-mobile-replication
description: Replica telas, abas, componentes e módulos existentes do ERP Web no App Mobile em React Native, preservando fidelidade visual, comportamento, regras e fluxos com adaptação responsiva. Use sempre que portar ou adaptar uma experiência do ERP Web para mobile.
---

# Replicação ERP Web → App Mobile

## Quando aplicar esta Skill

Use obrigatoriamente ao replicar, portar ou adaptar qualquer tela, aba, componente ou módulo existente do ERP Web para React Native.

## Quando NÃO aplicar

Não use para funcionalidades mobile novas sem equivalente no ERP Web, nem para mudanças exclusivamente no ERP Web. Para essas tarefas, use as skills específicas do domínio.

## Fontes de verdade

- **Navegador e screenshots do ERP:** referência visual.
- **Código do ERP:** referência de comportamento, estados, regras, validações e fluxos.
- Não implemente de memória depois de uma única inspeção. Registre o inventário e compare os estados equivalentes durante o trabalho.

## Processo obrigatório: uma aba e um estado por vez

Trabalhe em uma aba de cada vez e, dentro dela, em um estado por vez. Não replique o módulo inteiro antes de comparar. Não avance para a próxima aba enquanto a atual tiver diferenças conhecidas, salvo dependência técnica que exija outra ordem; registre essa dependência e retome a pendência.

### 1. Inspecionar o ERP original

Antes de codificar:

1. Abra no navegador a tela original e percorra as áreas relevantes.
2. Identifique abas, componentes, estados e interações: carregamento, vazio, erro, dados, seleção, expansão, filtros, busca, paginação, menus, modais, formulários, confirmações e feedback de ações, conforme existirem.
3. Observe labels, ícones, cores, hierarquia, dimensões, espaçamento, estados ativos/desabilitados e comportamento de cada ação.
4. Consulte o código ERP para confirmar contratos e semântica que não podem ser inferidos visualmente.
5. Capture screenshots dos estados de referência necessários.

### 2. Criar checklist e mapear equivalências

Para a aba escolhida, liste componentes, estados, interações e regras em um checklist. Mapeie a função de cada componente Web para seu equivalente React Native antes de implementar.

Preserve a semântica. Não troque sem justificativa real pesquisa por select, pesquisa com modal por dropdown simples, paginação por scroll infinito, botão por item de menu, tabs por select ou filtro múltiplo por filtro único. Se uma adaptação for necessária por limitação técnica ou de tela, registre:

```text
Original:
Limitação técnica ou mobile:
Adaptação:
Comportamento preservado:
```

### 3. Replicar e comparar o estado principal

Implemente primeiro apenas o estado principal da aba. Preserve identidade visual — cores, tipografia, ícones equivalentes, hierarquia, bordas, espaçamentos, labels, badges e estados — adaptando dimensões, quebras de linha, organização vertical, área de toque e modal para as necessidades do celular.

Obtenha screenshots do ERP e do estado equivalente no App Mobile e compare lado a lado. Confira presença e ordem dos elementos, cores, ícones, tipografia, espaçamento, alinhamento, labels, botões e hierarquia. Corrija diferenças conhecidas antes de prosseguir.

### 4. Percorrer estados e interações alternativos

Na mesma aba, examine e reproduza os estados que existirem: vazio, carregando, erro, sem resultados, selecionado, desabilitado, formulário inválido/válido, confirmação, cancelamento, sucesso e permissão negada. Abra filtros, modais, accordions e detalhes; exercite busca, limpeza, seleção, salvamento, edição, paginação e retorno quando aplicável.

Compare cada estado e ação equivalente entre Web e Mobile. O resultado e a sequência do fluxo devem permanecer equivalentes.

### 5. Conectar a lógica da aba

Somente depois de estabelecer a estrutura visual e mapear os estados, conecte dados, busca, filtros, ações, persistência, Supabase e regras de negócio daquela aba. Preserve validações, permissões, ordenação, paginação, tipos de interação e sequência do fluxo do ERP.

### 6. Validar e avançar

Após implementar a aba, aplique a política geral de validação do projeto: rode primeiro o teste focado do módulo alterado; se passar, execute TypeScript/compilação e lint aplicáveis. Avance para integração quando houver persistência ou comunicação entre serviços. Use E2E somente no fluxo afetado e quando agregar cobertura. Nesta skill, navegador e screenshots são justificados para comparar fidelidade visual e interação; não os substitua por memória.

Conclua o checklist da aba, corrija diferenças conhecidas e só então passe à próxima. Não rode a suíte completa por padrão; ela fica preferencialmente para CI no push/PR.

## Checklist de conclusão por aba

**Visual**

- [ ] Elementos, ordem e labels equivalentes.
- [ ] Cores, ícones, tipografia, hierarquia, bordas e espaçamento equivalentes.
- [ ] Estados principais e alternativos comparados por screenshot.
- [ ] Layout responsivo, sem overflow ou conteúdo cortado.

**Comportamento**

- [ ] Busca, filtros, seleção, paginação e ações mantêm semântica e resultado.
- [ ] Modais mantêm finalidade, campos, opções e confirmação/cancelamento.
- [ ] Validações, permissões, estados e regras de negócio preservados.

**Mobile**

- [ ] Área de toque adequada e scroll correto.
- [ ] Teclado não bloqueia campos ou ações necessários.
- [ ] Modal/tela adaptada e conferida em larguras relevantes.

## Critério de conclusão

A replicação só está concluída quando todas as abas e estados incluídos no escopo tiverem checklist atendido, diferenças visuais conhecidas resolvidas ou documentadas por limitação técnica, e funcionalidades, semântica, regras e fluxos do ERP estiverem preservados com as adaptações necessárias para celular.

## Referências e Fonte Canônica de Documentação

- `AGENTS.md`: gatilho obrigatório e princípios gerais de replicação ERP Web → App Mobile.
- Skill `testes-seguros-erp`: isolamento de dados e política incremental de validação para ERP e App Mobile.
- Código do ERP Web: fonte de verdade para comportamento e regras do módulo replicado.
- Ao posicionar ou dimensionar uma logo, aplique também `morante-responsive-logo-usage` para escolher a variante pela área disponível.

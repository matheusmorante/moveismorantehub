# Orientação de contexto do projeto

## Uso de skills

- Carregue somente a skill diretamente relacionada à tarefa atual.
- Não leia nem liste todas as skills antes de escolher uma.
- Para tarefas simples (`git`, execução local, inspeção pontual), não carregue skill especializada.
- Se mais de uma skill parecer aplicável, use a menor combinação que cubra a tarefa.
- Leia referências adicionais de uma skill somente quando a tarefa exigir.
- Ao escolher, inserir, trocar ou adaptar responsivamente logos, favicons ou splash screens, siga obrigatoriamente `morante-responsive-logo-usage`.

## Saída e investigação

- Prefira comandos com saída limitada e direcionada.
- Não repita leituras do mesmo arquivo ou status sem mudança observável.
- Preserve alterações existentes e faça mudanças pequenas, verificáveis e reversíveis.

## Política de validação de código

- Ao alterar código, identifique pelo `git diff` os arquivos, módulo e dependências afetados; execute primeiro somente a validação focada mais barata para esse módulo, antes do commit.
- Se o teste focado passar, rode apenas as verificações estáticas aplicáveis (TypeScript/compilação e lint nos arquivos alterados). Para mudanças exclusivamente de texto ou CSS, limite-se ao mínimo aplicável e faça validação visual somente se ela agregar evidência.
- Só avance para integração, Playwright/E2E ou navegador depois que as etapas focadas anteriores passarem e quando o escopo exigir. Integração é indicada para persistência, API, autenticação, banco, sincronização ou contratos entre serviços; E2E deve cobrir apenas o fluxo afetado.
- Sempre que uma tarefa replicar, portar ou adaptar uma tela, aba, componente ou módulo existente do ERP Web para o App Mobile, siga obrigatoriamente a skill `erp-web-to-mobile-replication`. Inspecione a implementação original, mapeie estados e interações, preserve semântica, regras e fluxos, e compare visualmente Web × Mobile. Adapte layout para telas menores sem mudar comportamento, salvo limitação técnica real ou solicitação explícita.
- Mudanças na replicação/sincronização ERP ↔ App Mobile exigem teste focado do módulo de sync e, se envolverem persistência ou comunicação real entre serviços, integração isolada. E2E cobre somente o fluxo afetado quando agregar cobertura que testes focados não dão.
- Não rode a suíte completa repetidamente durante o desenvolvimento; deixe-a preferencialmente para o CI no push/PR. Só execute localmente quando a mudança for transversal, houver risco concreto de regressão ampla ou o usuário solicitar.
- Se uma camada falhar, corrija antes de escalar. Não repita validações aprovadas sem mudança relevante e mantenha logs resumidos.

## Roteamento rápido

- Código/arquitetura: `design-patterns`, `principios-de-programacao`, `modelagem-negocio-arquitetura`.
- Banco/Supabase: `database-supabase`, `supabase-egress-guard`.
- ERP/regras fiscais: `regras-de-negocio-erp`, `testes-seguros-erp`, `nfe-sefaz-direto`.
- Testes/triagem: `rtk-tdd`, `testes-seguros-erp`, `issue-triage`.
- Refatoração/limpeza: `safe-refactor`, `surgical-patch`, `limpeza-projeto-segura`.
- Deploy/release: `release`, `mobile-eas-publicacao`.
- Git/PR: `caveman-commit`, `pr-triage`.
- Identidade visual responsiva: `morante-responsive-logo-usage`.

## Acesso ao Supabase

- Quando o acesso por CLI/token não estiver disponível, o usuário autorizou usar a sessão já autenticada do navegador para tarefas do Supabase solicitadas nesta conversa.
- Antes de qualquer alteração remota, confirme que o projeto/ref corresponde ao configurado no app e limite a operação ao escopo autorizado.
- Nunca exponha tokens, senhas ou outras credenciais; prefira ferramentas oficiais/API quando disponíveis e registre evidência sem dados sensíveis.


# Regras e Comportamentos do Sistema - Morante Hub

Este documento registra regras específicas e lógicas de funcionamento do Morante Hub para evitar regressões nas modificações do agente.

## 1. Cadastro de Variações de Produtos

- **Herança de Informações Técnicas e Preços**: 
  - Ao criar uma nova variação de produto (Modal de Criação / Edição), os campos de **Informações Técnicas** (Descrição, Largura, Altura, Profundidade e Peso) e **Precificação** (Preço de Venda, Promocional, etc.) devem vir marcados para **Herdar do Pai** por padrão (`syncDescription: true`, `syncWidth: true`, `syncHeight: true`, `syncDepth: true`, `syncWeight: true`).
- **Nomenclatura de Botões na Aba de Identificação**:
  - O botão para adicionar um novo atributo à variação (vínculo de atributo) deve se chamar **"Adicionar"** (e não "+ Vínculo").
  - O botão para abrir o modal de gerenciamento/criação global de atributos deve se chamar **"Gerenciar Atributos"** (e não "+ Criar Atributo").

## 2. Sincronização do Catálogo Meta (Facebook / Instagram / WhatsApp)

- **Fluxo do Feed CSV**: 
  - Ao criar ou editar um produto/variação no ERP, não é realizada chamada síncrona à API da Meta. O Meta Commerce Manager lê e atualiza os produtos automaticamente através do arquivo de **Feed CSV (`/api/facebook-catalog.csv`)**, que é gerado dinamicamente a partir dos produtos gravados no Supabase.

## 3. Controle de Git Push

- **Permissão de Push**: Não execute `git push` automaticamente nas alterações efetuadas. Realize apenas as modificações necessárias no código e aguarde a solicitação explícita do usuário para enviar as alterações para o repositório remoto.

## 4. Modularização e Código Limpo (Limite de 200 Linhas por Arquivo)

- **Regra de Ouro de Modularização e Responsabilidade unica**:
  - Sempre que criar ou editar um arquivo de código no projeto, se o arquivo ultrapassar **500 linhas ou ter mais de uma responsabilidade**, ele deve ser modularizado (dividido em arquivos menores, sub-componentes ou helpers em pastas dedicadas).
  - Após concluir qualquer tarefa, verifique os arquivos modificados e aplique a refatoração necessária para manter o código limpo, legível, com responsabilidade unica, fácil de depurar e bem organizado.

## 5. Terminologia de Produtos: ERP vs Catálogo Digital

- **No ERP (Gestão de Produtos, Listagens e Pedidos)**:
  - Os termos corretos para o ciclo de vida do produto no sistema são **"Produtos Ativos"** (`active: true`) e **"Produtos Desativados"** (`active: false`).
  - As ações no ERP são **"Desativar Produto"** e **"Ativar / Reativar Produto"**.
- **No Catálogo Digital (E-commerce / Catálogo Online)**:
  - O status para o catálogo público é **"Publicado no Catálogo"** (`status: 'published'`) e **"Ocultado do Catálogo"** (`status: 'hidden'`).

## 6. Versionamento Semântico do Aplicativo Mobile (Expo / EAS)

- **Regra de Versionamento Automático (`MAJOR.MINOR.PATCH`)**:
  - Sempre que uma nova atualização, build ou modificação for efetuada no projeto `mobile`:
    - **PATCH (`x.x.+1`)**: Incrementar para correções de bugs, ajustes de layout, refinamentos de UI/UX ou pequenas melhorias de estabilidade.
    - **MINOR (`x.+1.0`)**: Incrementar para adição de novas telas, novos módulos, novas integrações de destaque ou novas funcionalidades.
    - **MAJOR (`+1.0.0`)**: Incrementar para grandes reestruturações do app ou breaking changes de arquitetura.
  - Ao incrementar a versão no arquivo `mobile/app.json`, o agente deve sincronizar automaticamente:
    - `"version"` (ex: `"1.0.1"`, `"1.0.2"`...)
    - `"runtimeVersion"` (ex: `"1.0.1"`, `"1.0.2"`...)
    - `"versionCode"` em `android` (incrementar número inteiro de versão: `1`, `2`, `3`...)

## 7. Ciclo de Vida e Estados Exclusivos de Produtos no ERP

- **3 Estados Mutuamente Exclusivos**:
  - Todo produto no ERP pertence a **EXATAMENTE UM** dos três estados a seguir:
    1. **Produto Ativo**: Cadastro 100% concluído (`is_draft: false`, `status != 'draft'`), habilitado para vendas e operações (`active: true`, `deleted: false`).
    2. **Produto Desativado**: Cadastro 100% concluído (`is_draft: false`, `status != 'draft'`), mas inativado pelo usuário (`active: false`, `deleted: false`).
    3. **Rascunho de Produto**: Cadastro em andamento / incompleto (`is_draft: true` ou `status == 'draft'`).
- **Regras de Criação de Rascunho**:
  - Para um produto virar rascunho, é obrigatório:
    - O formulário ter sido aberto para cadastro (novo produto ou rascunho em edição).
    - Ter preenchido **pelo menos o nome do produto**.
    - **NÃO ter finalizado o cadastro** (salvando silenciosamente via auto-save ou fechando o modal).
  - Se o usuário abrir o modal de cadastro e fechar sem preencher o nome, **nenhum rascunho é criado**.
- **Imutabilidade Pós-Cadastro (Produto Concluído NUNCA volta a ser rascunho)**:
  - Uma vez que o produto teve seu cadastro concluído (`is_draft: false`), ele transita apenas entre **Ativo** e **Desativado**.
  - **NÃO pode virar rascunho de volta**.
  - Ao editar um produto existente já cadastrado, o auto-save de rascunho é desativado e o produto nunca tem seu status rebaixado para rascunho.
- **Regras de Isolamento**:
  - **Rascunhos NUNCA devem aparecer na lista de Produtos Desativados** nem na lista de **Produtos Ativos**.
  - Rascunhos só aparecem na visão / filtro dedicado de **"Rascunhos"**.
  - Um produto desativado só aparece na lista de **"Produtos Desativados"**.
  - Um produto ativo só aparece na lista principal de **"Produtos Ativos"**.




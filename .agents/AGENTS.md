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
  - As ações e badges relacionadas à visibilidade na loja são **"Publicar no Catálogo"** e **"Ocultar do Catálogo"**.


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


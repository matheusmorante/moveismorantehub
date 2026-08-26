# 📜 Diretrizes e Regras do Projeto (Móveis Morante Hub)

Este arquivo consolida as regras de ouro e diretrizes de desenvolvimento para o projeto, em conformidade com as exigências do usuário.

---

## 🛠️ Regras de Desenvolvimento

1. **Código Limpo e Modular**: Sempre siga o princípio de código limpo, legível, manutenível e com forte modularização.
2. **Registro de Planos e Ideias**: Mantenha sempre um registro atualizado de ideias, planos pendentes e roadmap no arquivo [IDEIAS_E_PLANOS.md](file:///c:/Users/Rosilene/Desktop/pdv/IDEIAS_E_PLANOS.md).
3. **Economia de Cota de Assinatura**: Otimize ao máximo o consumo de tokens e cotas do plano de assinatura, evitando chamadas repetitivas ou desnecessárias.
4. **Isolamento de Ambientes (Dev vs Prod)**:
   - Configure de maneira clara e adequada as variáveis de ambiente, rotas de API, conexões do Supabase e quaisquer dados ambíguos.
   - Garanta que as funcionalidades rodem perfeitamente tanto no ambiente de desenvolvimento local quanto no ambiente de produção (Vercel, etc.).
5. **Relato Imediato de Bugs**: Se encontrar algum bug impeditivo que cause lentidão ou bloqueie o progresso, relate-o imediatamente ao usuário.
6. **Comunicação Ativa**: Na presença de ambiguidades ou dúvidas sobre as demandas do usuário, sempre pergunte antes de fazer suposições.
7. **Documentação das Regras**: Este arquivo de regras (`RULES.md`) deve ser mantido sempre na raiz do projeto para referência contínua.
8. **Idioma Oficial**: Toda a comunicação com o usuário e documentações específicas devem ser em **Português Brasileiro**.

---

## 🏷️ Terminologia e Status de Produtos

1. **No ERP (Gestão, Listagem e Pedidos)**:
   - **"Produtos Ativos"** (`active: true`): Produtos operacionais no sistema para movimentações, pedidos e controle.
   - **"Produtos Desativados"** (`active: false`): Produtos desativados no sistema que não devem aparecer nas pesquisas de novos pedidos.
   - Ações: **"Desativar Produto"** e **"Ativar / Reativar Produto"**.
2. **No Catálogo Digital (E-commerce / Catálogo Online)**:
   - **"Publicado no Catálogo"** (`status: 'published'`): Visível e disponível no catálogo digital público.
   - **"Ocultado do Catálogo"** (`status: 'hidden'`): Oculto da vitrine do catálogo digital público.
   - Ações: **"Publicar no Catálogo"** e **"Ocultar do Catálogo"**.

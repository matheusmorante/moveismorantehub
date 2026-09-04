# 📜 Diretrizes e Regras do Projeto (Móveis Morante Hub)

Este arquivo consolida as regras de ouro e diretrizes de desenvolvimento para o projeto, em conformidade com as exigências do usuário.

---

## 🛠️ Regras de Desenvolvimento

1. **Código Limpo e Modular**: Sempre siga o princípio de código limpo, legível, manutenível e com forte modularização.
2. **Registro de Planos e Ideias**: Mantenha sempre um registro atualizado de ideias, planos pendentes e roadmap no arquivo [IDEIAS_E_PLANOS.md](file:///c:/Users/Rosilene/Desktop/morantehub/IDEIAS_E_PLANOS.md).
3. **Economia de Cota de Assinatura**: Otimize ao máximo o consumo de tokens e cotas do plano de assinatura, evitando chamadas repetitivas ou desnecessárias.
4. **Isolamento de Ambientes (Dev vs Prod)**:
   - Configure de maneira clara e adequada as variáveis de ambiente, rotas de API, conexões do Supabase e quaisquer dados ambíguos.
   - Garanta que as funcionalidades rodem perfeitamente tanto no ambiente de desenvolvimento local quanto no ambiente de produção (Vercel, etc.).
5. **Relato Imediato de Bugs**: Se encontrar algum bug impeditivo que cause lentidão ou bloqueie o progresso, relate-o imediatamente ao usuário.
6. **Comunicação Ativa**: Na presença de ambiguidades ou dúvidas sobre as demandas do usuário, sempre pergunte antes de fazer suposições.
7. **Documentação das Regras**: Este arquivo de regras (`RULES.md`) e `.agents/AGENTS.md` devem ser mantidos sempre no projeto para referência contínua.
8. **Idioma Oficial**: Toda a comunicação com o usuário e documentações específicas devem ser em **Português Brasileiro**.
9. **Git Push**: Nunca executar `git push` automaticamente sem autorização explícita do usuário.
10. **Consulta Obrigatória de Modularização ao Passar por Arquivos**: Sempre que passar, analisar ou editar um arquivo no projeto (especialmente aqueles com mais de 150 linhas ou com acúmulo de responsabilidades), **perguntar explicitamente ao usuário no final da resposta** se ele deseja que seja implementado código limpo, responsabilidade única e modularização nele, em estrita conformidade com a skill `modularizacao_codigo` (alvo de 30–100 linhas, aceitável até 150, com estratégia segura: COPIAR → VALIDAR → CONECTAR → TESTAR → SÓ DEPOIS REMOVER).

---

## 🏷️ Terminologia e Status de Produtos

1. **No ERP (Gestão, Listagem e Pedidos)**:
   - **"Produtos Ativos"** (`active: true`): Produtos operacionais no sistema para movimentações, pedidos e controle.
   - **"Produtos Desativados"** (`active: false`): Produtos desativados no sistema que permanecem na listagem normal com selo indicativo (sem tela separada).
   - **"Rascunhos"** (`is_draft: true` ou `status == 'draft'`): Aparecem diretamente na listagem normal de produtos com selo indicativo em âmbar (sem botão segregador no topo).
   - Requisitos de Ativação: Nome do produto, Preço de Venda (produtos simples ou variações), Categoria e Fornecedor. Preço de custo não é pré-requisito de ativação.
   - Ações: Botão interativo `ERP` na coluna "Status de Canais" e nos cards para Ativar / Inativar.
2. **No Catálogo Digital (E-commerce / Catálogo Online)**:
   - **"Publicado no Catálogo"** (`status: 'published'`): Visível e disponível no catálogo digital público.
   - **"Ocultado do Catálogo"** (`status: 'hidden'`): Oculto da vitrine do catálogo digital público.
   - Ações: Botão interativo `Catálogo` na coluna "Status de Canais" e nos cards para Publicar / Ocultar.
3. **Independência Total entre Canais**:
   - Ativar ou desativar no ERP não altera nem despublica do catálogo digital, e vice-versa.

---

## 🛠️ Outras Diretrizes Importantes

1. **Ícone de Montagem (`Drill`)**: Utilizar exclusivamente o ícone de furadeira/parafusadeira preenchido (`DrillIcon`) para montagens.
2. **Código Sequencial do Pedido (`orderIndex`)**: Geração automática de 6 dígitos obrigatória na abertura; nunca permitir pedidos sem código.
3. **Observações por Item**: Anexadas ao nome do produto com `" - "` nos impressos, ordens de serviço, recibos e WhatsApp.
4. **Assinatura Digital de Recibo**: Carimbo digital oficial ICP-Brasil/A1 com QR Code dinâmico determinístico, sem assinatura manual em papel.
5. **Rótulo de Movimentação de Estoque em Pedidos (`InventoryMovementBadge`)**:
   - **Amarelo com ícone `PackageCheck`**: Indica saída/entrada parcial quando apenas parte dos itens do pedido tiveram movimentação no estoque gerada (pedidos mistos com itens sem cadastro/temporários ou serviços, saídas parciais de itens ou devoluções parciais).
   - **Verde com ícone `PackageCheck`**: Saída/entrada completa gerada para todos os itens.
   - **Cinza com ícone `Package`**: Sem movimentação lançada.
   - **Vermelho com ícone `PackageX`**: Movimentação estornada / cancelada.
   - **Detalhamento de Itens no Hover / Modal Flutuante (`InventoryBadgePopover`)**: O popover lista todos os itens da venda com **Nome do Produto**, **Quantidade** e **Status Individual da Movimentação**:
     - *Efetivada*: Saída/movimentação lançada e ativa no estoque.
     - *Estornada*: Saída estornada / cancelada.
     - *Não efetivada*: Produto cadastrado que ainda não teve saída lançada.
     - *Item não cadastrado (sem movimentação)*: Avisa com destaque visual âmbar que itens temporários ou sem cadastro não movimentam estoque.

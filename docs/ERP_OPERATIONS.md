# Documentação de Engenharia e Operação do ERP — Móveis Morante Hub

> **Localização in-app:** Perfil > Documentação do sistema > Para engenharia (e Para usuários).  
> **Propósito:** Definir com rigor os gatilhos, regras de negócio, integrações e efeitos colaterais de cada módulo do ERP.

---

## 1. Gatilhos de Pedidos, Estoque e Cronograma

| Evento / Status | Estoque e Movimentações | Cronograma Logístico |
|---|---|---|
| **Rascunho (`draft`)** | Não gera saída, entrada ou alteração de saldo. Preenchimento editável e auto-salvo. | Aparece apenas para fins de planejamento se possuir data ou pendência preenchida. |
| **Cadastro Válido → Agendado (`scheduled`)** | Cada item real (variação com `productId`) gera saída quando `Agendado` for o status de baixa configurado (padrão do ERP). Itens temporários não geram movimento. | Entra no cronograma de rotas e montagens conforme data, tipo e filtros ativos. |
| **Agendado → Atendido (`fulfilled`)** | Mantém a saída já registrada. Caso ainda não exista, dispara a baixa configurada sem duplicar movimentos existentes. | Sai do cronograma de entregas. Desfazer atendimento devolve o pedido para Agendado. |
| **Agendado → Cancelado (`cancelled`)** | Estorna todos os movimentos vinculados ao pedido, recompõe o saldo físico e redefine `stockProcessed`. Registra motivo do cancelamento na movimentação. | Sai imediatamente do cronograma de rotas. Bloqueia edições posteriores. |
| **Pedido de Devolução Criado (`return`)** | Pode nascer de venda atendida ou ser criado sem vínculo. Não cria entrada ao ser gerado; nasce como Agendado. | Segue o fluxo de agendamento da coleta/retorno da mercadoria. |
| **Pedido de Devolução → Atendido** | Após confirmação com contagem regressiva de segurança de 5 segundos, gera entradas no estoque para os itens e quantidades selecionados. | Sai do cronograma logístico e torna-se definitivo. |

---

## 2. Código Sequencial Único do Pedido (`orderIndex`)

1. **Geração Imediata na Abertura**:
   - Ao abrir o formulário para criar um novo pedido, orçamento ou duplicar um pedido existente, o código sequencial de 6 dígitos (`orderIndex`, ex: `#002485`) é **gerado imediatamente** e exibido no topo.
   - Duplicações de pedido **nunca** herdam o código original; recebem um novo código exclusivo no ato da criação.
2. **Unicidade Estrita e Bloqueio**:
   - Nenhum pedido pode ser salvo com código nulo ou repetido. Se a geração falhar, o auto-save e a finalização são bloqueados com alerta visual.
3. **Blindagem em Atualizações (`updateOrder`)**:
   - Atualizações parciais ou salvamento automático filtram propriedades `undefined`, preservando rigorosamente o `orderIndex` original e a coluna `order_number` da tabela `orders`.

---

## 3. Gestão de Vendedores e Colaboradores

- **Filtro de Vendedores Elegíveis**: Apenas pessoas cadastradas como colaboradores ativos com perfil de acesso válido (`role` ativo) aparecem no seletor de vendedor.
- **Snapshot Imutável no Pedido**: Cada pedido persiste o nome do vendedor (`seller`) e seu identificador único (`sellerId`). Mesmo que o colaborador seja alterado ou desativado no futuro, o histórico do pedido permanece autêntico para comissões e auditoria.

---

## 4. Paginação e Pesquisa Dinâmica na Listagem de Pedidos

- **Barra de Pesquisa Rápida (`OrderCustomerSearchBar`)**: Permite filtrar pedidos instantaneamente pelo nome do cliente tanto na visualização em tabela quanto em cards, com botão de limpeza rápida (`X`).
- **Paginação Fixa de 30 Pedidos**: A listagem exibe estritamente 30 registros por página (`itemsPerPage = 30`), com navegação por reticências inteligentes e scroll automático para o topo ao trocar de página.

---

## 5. Cancelamento de Venda Agendada e Selos de Triagem

- **Cancelamento Seguro (`CancelSaleModal`)**: Pedidos agendados de venda ou mostruário podem ser cancelados via menu de 3 pontos. O modal avisa que a ação é definitiva e que as saídas de estoque serão estornadas.
- **Carimbo CANCELADO**: Pedidos cancelados exibem carimbo em vermelho vívido (`bg-red-600`) com 100% de nitidez sobre um fundo acinzentado atenuado. O botão de editar (lápis) é ocultado em pedidos cancelados e atendidos.
- **Selos de Triagem Clicáveis**:
  - **Etiquetado (`isStockChecked`)**: Verde sólido (`bg-emerald-600`) quando marcado, cinza slate quando desmarcado.
  - **Bling (`isRegisteredInBling`)**: Verde sólido quando integrado, cinza quando pendente.

---

## 6. Auto-Atendimento de Pedidos Vencidos (5 Dias)

- Para pedidos cuja data agendada de entrega já passou e não estão atendidos, rascunho ou cancelados:
  - O botão de ação exibe: **"Pedido Atendido?"** com subtítulo de contagem regressiva (`Atendido em X dias`, `Atendido em 1 dia` ou `Atendido hoje`).
  - Após **5 dias do vencimento da data**, o sistema executa o auto-atendimento automático para `fulfilled`, baixando o estoque e protegendo contra concorrência duplicada.

---

## 7. Itens Temporários e Conciliação Comercial

- Itens temporários são produtos sem cadastro formal no banco (`!item.productId` ou `isTemporaryProduct: true`).
- **Isolamento de Estoque**: Itens temporários **nunca** movimentam estoque nem bloqueiam os itens reais do mesmo pedido.
- **Conciliação Comercial**: Permite ao gestor associar um produto cadastrado ao item temporário posteriormente apenas para métricas de vendas, sem gerar movimentações retroativas de estoque descontroladas.

---

## 8. Independência de Canais (ERP vs Catálogo Digital)

- **Desacoplamento Completo**: O estado no ERP (`active: true/false`) e no Catálogo Meta/Digital (`status: published/hidden`) são 100% independentes. Desativar no ERP não oculta do catálogo e vice-versa.
- **Sem Tela de Desativados**: Produtos desativados permanecem na listagem normal com selo visual indicativo.
- **Botões Bipartidos "Status de Canais"**: Permitem alternar com um clique o estado no ERP e no Catálogo, tanto na tabela desktop quanto nos cards mobile e nas variações filhas.
- **Requisitos de Ativação no ERP**: Exige apenas **Nome**, **Preço de Venda** (no produto simples ou variações), **Categoria** e **Fornecedor**. Preço de custo não é obrigatório para ativação (é preenchido em compras ou saldo inicial).

---

## 9. Observações por Item e Recibos com Assinatura Digital

- **Observação por Item (`observation`)**: Campo livre no final de cada item de pedido. Ao ser preenchido, é concatenado automaticamente na forma `${item.description} - ${item.observation}` em impressões, ordens de serviço e mensagens de WhatsApp.
- **Assinatura Digital ICP-Brasil / A1**: Elimina assinaturas manuais em papel. O recibo de venda traz carimbo oficial com dados da empresa, emissor, data/hora e **QR Code dinâmico determinístico** para consulta e autenticação pública.

---

## 10. Ícone Oficial de Montagem (`DrillIcon`)

- Todos os módulos do sistema (cards de pedido, tabela, cronograma logístico, lista de montagens e relatórios) utilizam exclusivamente o ícone **`Drill`** (`@/components/shared/DrillIcon` - parafusadeira/furadeira preenchida no padrão Filled), substituindo o martelo e ícones lineares.

---

## 11. Riscos Técnicos e Próximos Passos de Engenharia

1. **Migração para RPCs Atômicas:** Encapsular atualização de pedido, lançamento de movimentações e recálculo de saldo em transações atômicas no PostgreSQL.
2. **Vínculo Relacional Obrigatório:** Garantir chaves estrangeiras rígidas entre `inventory_moves` e `orders`, eliminando buscas secundárias por texto.
3. **Abatimento Líquido nos Relatórios:** Aplicar desconto líquido automático de devoluções atendidas nos relatórios analíticos de faturamento e margem bruta.

---

## 12. Rótulo de Movimentação de Estoque em Pedidos (`InventoryMovementBadge`)

- **Selo Amarelo com Ícone `PackageCheck` (`border-amber-600 bg-amber-500 text-white`)**:
  - Exibido quando o pedido teve movimentação de estoque gerada para **apenas parte dos itens** (movimentação parcial).
  - Ocorre em cenários como:
    - Pedido misto composto por produtos cadastrados (que movimentam estoque) e itens temporários/sem cadastro ou serviços (que não movimentam estoque).
    - Pedidos em que as movimentações registradas no banco abrangem apenas alguns dos produtos vendidos.
    - Pedidos de devolução parcial (`order.returnKind === 'partial'`).
  - O tooltip e popover esclarecem que a saída/entrada foi parcial e quais motivos justificam essa condição.
- **Selo Verde com Ícone `PackageCheck` (`bg-emerald-600 text-white`)**:
  - Exibido quando a movimentação de estoque foi gerada de forma completa para todos os itens do pedido.
- **Selo Cinza com Ícone `Package` (`bg-slate-400 dark:bg-slate-600`)**:
  - Exibido quando ainda não há movimentação de estoque registrada para o pedido.
- **Selo Vermelho com Ícone `PackageX` (`bg-red-600 border-red-700 text-white`)**:
  - Exibido quando a movimentação de estoque vinculada foi estornada (ex: cancelamento de pedido de venda).

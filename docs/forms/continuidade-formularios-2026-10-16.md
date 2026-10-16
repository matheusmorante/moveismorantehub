# Continuidade dos formulários — 16/10/2026

## Estado vigente

Migração global em andamento. ERP: **112/131 itens conferidos ou encerrados (85,5%), 19 pendentes**. A contagem inclui retirada de CC-e e bibliotecas retidas sem consumidor; não são 112 formulários ativos migrados. Mobile e catálogo têm inventário próprio de arquivos candidatos, sem denominador global de proprietários comprovado.

**CC-e não é funcionalidade do MoranteHub**, inclusive tela dedicada de histórico. A política vinculante está em `AGENTS.md`, FISCAL-016 e no [registro fiscal](../fiscal/historico-correcoes-2026-10-16.md#política-de-produto--cc-e-ausente-do-sistema). Cancelamento/estorno continuam conforme elegibilidade vigente; critérios de circulação não foram alterados por inferência. Registros antigos de auditoria não autorizam reintroduzir interface ou emissão de CC-e.

Continuação adicional: [CSOSN de homologação conferido](../fiscal/historico-correcoes-2026-10-16.md#csosn-de-homologação--proprietário-conferido), com32 testes e build final ERP em1m33s. A configuração permanece exclusiva de ambiente2/modelo55/CRT1.

Continuação de Settings/WhatsApp: [registro atual](../fiscal/historico-correcoes-2026-10-16.md#whatsapp-nas-configurações--submissões-com-snapshot-parseado),69 testes locais, lint limpo e build ERP final em 1m48s aprovados. Nenhuma mensagem/configuração real alterada.

## Causas e correções desta continuação

| Proprietário | Causa comprovada | Correção e prova |
|---|---|---|
| ReturnConfirmationModal, biblioteca sem consumidor | Confirmação sem resolver, callback tratado como void e fechamento permitido durante espera. Não contém itens. | Schema explícito exige revisão concluída; RHF acompanha callback com prazo de 30s, trava/erro/recusa/resultado incerto. Quatro provas. Mantida como biblioteca, sem reativar nem alegar geração/recebimento de devolução. |
| Lançamento manual móvel | Resolver acabava antes de create/update; payload adicional vinha da closure; callback de refresh descartado e fechamento superior livre. | Schema específico estende financeiro comum; payload parseado, prazo de 20s, create exige ID, update confirma ACK booleano existente. Hook aguarda refresh por até 15s; FinanceHub retorna a promessa sem alterar identidade antes de fechar. Modal bloqueia fechamento/campos e mostra progresso. Quinze provas do hook. |
| Chat financeiro móvel — prova parcial | Reenvio não executava resolver; single anunciava sucesso mesmo com success:false; confirmação aceitava success:true sem recordId; espera/contexto sem proteção. | Prompt/reenvio e contratos de confirmação no resolver até efeito; trava comum, prazos de 45s/20s, rascunho preservado, ID exigido, erro/uncertainty/replay e resposta antiga descartada. Onze provas. Captura/preanálise/voz/live e fila batch composta seguem pendentes; single e confirmação antiga não têm consumidor ativo localizado. Timeline ativo por GlobalAgentScreen → FinancialAiChatView. |
| Produto administrativo do catálogo — prova parcial | Draft/final podiam concorrer, recibos de vínculos/status não eram exigidos. Novo efeito de autosave dependia de array atualizado pelo próprio salvamento, causando outra gravação sem edição. | Fila comum e contratos distintos, resolver até recibo/payload/status, prazo/contexto/cleanup/erro. Assinatura estável do snapshot evita repetir autosave confirmado; UUIDs alocados antes do I/O preservam identidade na fila/retry. Updaters conferem snapshot para não sobrescrever edição posterior. Dezoito provas, incluindo estado React real e edição posterior. Upload iniciado pelo filho ainda não compartilha fila; substituição global tem callback vazio. |
| Categorias/ambientes do catálogo | Resolver acabava antes do I/O, falhas de relações eram ignoradas, exclusão sem resolver/recibo e consultas sem prazo. Troca de tipo limpava só a orientação nova da relação, conservando a antiga. | Criar/editar/excluir aguardam recibo/identidade e callback; erro/progresso, guarda comum/contexto/prazo e retry de falha conhecida. Criação confirmada conserva ID após falha de vínculo. Limpeza de ambas orientações é limitada à identidade editada; teste preserva relações alheias. Dez provas. Query de dados do produto em callback externo ainda tem limite próprio no agregado. |

## Arquivos e linhas

| Arquivo | Região alterada |
|---|---|
| `erp/src/pages/App/SalesOrder/OrderHistoryList/ReturnConfirmationModal.tsx` | 1–61,77,106–123: schema, callback/guardas, feedback e controles. |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/ReturnConfirmationModal.test.tsx` | novo: quatro provas da biblioteca. |
| `mobile/src/features/finance/hooks/useTransactionForm.ts` | 23–40,76–144,283–359,retorno: schema/contexto, persistência/recibo/refresh/fechamento. |
| `mobile/src/features/finance/components/NewTransactionModal.tsx` | 34,60,73,78,119,143,210–218: promessa, fechamento, campos e progresso. |
| `mobile/src/features/finance/screens/FinanceHubScreen.tsx` | callback onSuccess do NewTransactionModal: promessa de loadData retornada; identidade limpa somente no fechamento. |
| `mobile/src/features/finance/hooks/useFinancialAiChat.ts` | 1–53,65–121,170,204–211,251–300,462–584: schemas, guarda/contexto, mensagem/reenvio e confirmações. |
| `erp/tests/mobile-forms/manualTransactionOwner.test.tsx` | novo: quinze provas. |
| `erp/tests/mobile-forms/financialChatOwner.test.tsx` | novo: onze provas. |
| `erp/tests/mobile-forms/owners.test.tsx` | 54–65: fixture de recusa confirmada/retomada, campos finais e ID de recibo. Rejeição de transporte é agora incerta, coberta no proprietário. |
| `digital-catalog/src/features/products/components/admin-modal/hooks/useAdminProductSave.ts` | 19–21,56–82,85–270,274–376: assinatura/UUID, fila, persistência/recibos, contexto/cleanup. |
| `digital-catalog/src/features/categories/components/categories-manager-modal.tsx` | 1–5,43–106,121–224,controles/rodapé/CategoryListTable: consultas, três intenções, feedback/guardas e tipos locais. |
| `erp/tests/catalog-forms/adminProductOwner.test.tsx` | novo: dezoito provas. |
| `erp/tests/catalog-forms/categoriesOwner.test.tsx` | novo: dez provas. |
| `digital-catalog/ideias_planos.md`, inventários, registro fiscal e índice | provas, cobertura parcial e próximos caminhos. |

## Validação e limites

- **65 testes ERP em nove arquivos aprovados**, incluindo retirada de CC-e, etiquetagem, pedido assistido, integração FormHeader e confirmação da biblioteca de devolução: `scratch/rhf-no-cce-final-tests.log`. Build ERP com startup fiscal aprovado em **1m51s**: `rhf-no-cce-final-build.log`. Lint sem erros; dez avisos anteriores de FormHeader. TS ERP mantém **304 diagnósticos globais**, com erro anterior do contrato de salvamento de OrderEditModal fora do callback alterado e fixtures fiscais; sem declaração de TS global aprovado.
- **42 testes móveis em quatro arquivos aprovados**: `scratch/rhf-mobile-chat-final-tests.log`. Lint com config ERP: sem erros, dois avisos de refs no cleanup do chat. TS móvel mantém **30 diagnósticos externos aos quatro arquivos de fonte deste lote**: `rhf-mobile-chat-final-{lint,tsc}.log`. Não há build nativo/dispositivo comprovado.
- **48 testes do catálogo em cinco arquivos aprovados**, TypeScript completo, lint focal e build Next aprovados: `scratch/rhf-catalog-owners-final-{tests,tsc,lint,build}.log`. O teste com estado real reproduziu a gravação redundante antes da correção.
- Serviços, Supabase, IA, Auth, navegação e recursos nativos são simulados nos testes. Não houve envio de mensagem, alteração de conta, gravação comercial remota, migration ou transmissão SEFAZ. Recibos locais não provam RLS, concorrência ou transação entre tabelas no PostgreSQL. Timeout não cancela transporte; travas incertas em geral duram na instância montada.

Aplicada revisão React: dependências primitivas no autosave, cleanup dos timers/listeners, ordem de hooks, controles acessíveis e payloads isolados. Não adicionadas dependências. Os caminhos pendentes continuam nos inventários; a meta global permanece ativa.

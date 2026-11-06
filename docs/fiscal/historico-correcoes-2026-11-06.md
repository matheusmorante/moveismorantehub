# Histórico de correções fiscais — 06/11/2026

## SCE-013 — Interromper características de uma seleção inválida no cadastro rápido

**Autorização:** aceite “pode implentar todos”, no chat da auditoria de consumo. Implementação local; publicação e validação funcional pendentes.

**Problema e causa comprovada:** ao cadastrar uma variação pela Nota Fiscal de Entrada ou pelo Recebimento por NF, o efeito de `QuickRegisterVariationModal` consultava o produto pai e seguia para as características mesmo se a consulta falhasse. Ao fechar o modal ou trocar o pai durante a espera, a marca de seleção obsoleta só impedia mudanças no estado; a segunda busca ainda começava. Uma falha também podia ser substituída por mensagem de erro de características, menos específica.

**Arquivo alterado:** `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx:188`. No tratamento da falha do pai, liberar o indicador técnico da seleção vigente e retornar; o `finally` existente libera o indicador do pai. Antes de iniciar a consulta de características, exigir seleção ainda vigente e componente ativo. Não modificar indicadores de uma seleção posterior nem cancelar requisições que já foram enviadas.

**Consumidores conferidos:** `InboundInvoiceItemsReview` e `Receipts/components/InboundNfeItemsSection` usam o mesmo modal. A contraparte mobile `useInboundQuickRegistration` abre o formulário com o pai já disponível e não usa essa sequência; não recebeu mudança equivalente artificial. O carregador técnico do app tem sua otimização própria SCE-008, separada deste problema.

**Preservação do contrato:** mantidos produto pai ativo e não excluído, tipo produto, rejeição de variação como pai, categorias do pai, validações finais, limites de 15 segundos e mensagens reais de falha. Nenhuma alteração de XML, snapshot, NCM, unidade, cálculos, conciliação, banco ou transmissão fiscal. Foram consultados índice fiscal, invariantes e históricos/revisão vigentes pertinentes. Não houve mudança da operação do estoquista; o guia prático não exige atualização.

**Efeito esperado:** para N continuações inválidas, N invocações da busca técnica deixam de ocorrer. Quantas chamadas remotas isso evita depende do cache e da deduplicação já existentes no serviço. Frequência real, bytes/egress faturável e carga/latência do banco não foram medidos. Não atribuir o incidente remoto de `category_attributes` a esse modal sem evidência de uso e janela.

**Validações:** revisão estática da sequência válida, falha/timeout, fechamento e troca de seleção; TypeScript amplo do ERP sem diagnóstico neste modal. A checagem ampla continua com erros em outros trechos e não passou globalmente. Nenhum teste adicionado ou executado, conforme a guarda da auditoria. Ainda validar em uso a seleção válida, pai indisponível, fechamento/troca durante a espera e conclusão do cadastro. Não houve acesso a dados operacionais, fixtures, migration, commit, deploy ou OTA.

**Rollback:** reverter somente o hunk desta SCE no modal. Não há dados ou schema a desfazer. Registro completo do lote e das limitações no [roadmap de consumo](../auditorias/roadmap-otimizacao-consumo-supabase.md).

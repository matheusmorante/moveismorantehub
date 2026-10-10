# Plano de abas Produção × Homologação — proposta não aplicada

> **Estado reconciliado em 09/10/2026:** a proposta original pedia abas separadas e estado independente de filtros. O código atual mantém uma lista fiscal unificada com filtro de ambiente; a tela abre com `environmentFilter='1'` e permite alternar o filtro. Abas dedicadas, indicadores visuais propostos e estado independente dos demais filtros não foram encontrados na implementação. A proposta não é requisito operacional vigente; veja o [índice fiscal](README.md) e o [status atual](status-testes-homologacao.md).

## Estado observado no código

- A lista de documentos está em `erp/src/pages/App/FiscalDocuments/hooks/useFiscalDocumentsList.ts`.
- A seleção do ambiente está em `erp/src/pages/App/FiscalDocuments/components/FiscalDocumentsFilterBar.tsx` e a consulta adiciona filtro por ambiente em `erp/src/pages/App/FiscalDocuments/services/fiscalDocumentsService.ts`.
- O filtro visual ajuda o operador a navegar. Ele não substitui validação server-side, vínculo documento/pedido por mesmo ambiente ou proteção das operações fiscais.

## Proposta original preservada

A proposta de 2026 sugeria duas abas (“Produção” e “Homologação”), com filtros de busca/modelo/status independentes e aviso visual para HML. Não há evidência de decisão posterior que a tenha tornado obrigatória. Se essa UX voltar ao escopo, implemente-a sobre os serviços atuais e atualize este registro depois da comparação visual e funcional.

As referências antigas a `nfe_documents`, `nfe_sequences`, coluna `ambiente` ou constraints reproduzem uma suposição de schema da época. O snapshot não foi revalidado nesta revisão e não deve ser usado para afirmar o schema remoto atual; consulte o [status central](status-testes-homologacao.md) e a política de banco vigente.

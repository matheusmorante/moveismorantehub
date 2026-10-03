# Correção de série e IE na NF-e 55 de homologação

> **Registro histórico:** preserva a correção e a execução documentadas em 2026-09-30. As regras e o procedimento para novos testes fiscais em homologação foram removidos em 2026-10-03 para redefinição; este relatório não é um roteiro vigente.

Verificado em 30/09/2026: pedido 3474, NF-e 701/série 1, `cStat=100`, documento `b1e4be97-4391-43b9-8d03-bd7e43e3276c`. Chave, protocolo, XML, itens e histórico conferem com a persistência; a interface apresenta status homologada. Produção fiscal permanece bloqueada.

## Regra e decisão

O [MOC 7, Anexo I](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf), B07/B26-10, define séries 0–889 para emissão normal por contribuinte CNPJ; 900 pertence à emissão avulsa pelo Fisco. O padrão HML passou a 1. Configuração explícita incompatível bloqueia antes de reservar número ou transmitir.

A rejeição 209 segue C17-20. Backend e banco verificam formato e os dois dígitos pelo [cálculo oficial do Paraná](https://www.fazenda.pr.gov.br/Pagina/calculo-digito-verificador). Isso não substitui vínculo cadastral/credenciamento. A IE utilizada foi fornecida pela usuária; nenhum substituto foi inventado. Os índices MOC/NTs do Portal Nacional falharam por redirecionamento; esta consulta das fontes específicas não constitui revisão integral das NTs atuais.

## Estados, efeitos e consistência

| Estado/transição | Efeitos obrigatórios | Recuperação |
|---|---|---|
| Preflight inválido | Nenhuma reserva ou chamada SOAP | Corrigir configuração; erro explícito |
| Snapshot reservado | Snapshot, intenção única e número na mesma RPC/transação | Repetição recupera a mesma reserva |
| XML assinado/processando | Documento ligado ao snapshot, XML/chave e lease antes do SOAP | Preservar intenção durante a interação externa |
| Resposta desconhecida/pendente | Preservar tentativa e histórico | Consultar a mesma chave; 217 admite retry explícito do mesmo XML |
| Rejeição confirmada 244/209 | Resposta/histórico fiscal, sem autorização | Nova intenção explícita, vinculada e com o campo causador corrigido |
| Autorização 100 | Protocolo, status homologada, itens e histórico na mesma RPC/transação | Recuperar os fatos sem nova autorização/item |

**Nenhuma transição HML cria ou reverte estoque, reservas comerciais, pagamentos, contas a receber ou transações financeiras.** Esses fatos pertencem ao fluxo comercial e foram comparados antes/depois de cada transmissão e recuperação.

SEFAZ é chamada após o commit da intenção/documento. Resposta desconhecida ou falha ao persistir exige reconciliação da chave original. Não existe fallback de autorização sem itens ou reset de sequência para contornar pendência.

Correção de série exige rejeição 244 e série diferente. Correção de IE exige rejeição 209, IE diferente da do snapshot anterior e IE válida no novo snapshot. Pendência, 217, autorização e outros códigos não liberam outra intenção. O banco deriva os vínculos, preserva os fatos rejeitados e impede dois filhos/reservas simultâneos com lock por pedido e índices únicos. Cancelamento/reversão não apaga rejeições; a RPC de resultado HML recusa status de cancelamento e não reverte fatos comerciais.

## Compatibilidade e validação

- Migrations `20260930214601_nfe_hml_series_correction.sql` e `20260930222310_nfe_hml_issuer_ie_correction.sql` aplicadas e registradas no projeto configurado `hkoxhourxwlddgsfdgws`, após validação local e Advisors.
- Colunas de vínculo opcionais para consumidores; assinaturas das RPCs preservadas. Triggers derivam os vínculos mesmo para chamadas com o contrato anterior.
- Frontend encerra a intenção em rejeição confirmada 244/209. Nova chave somente no próximo clique explícito; resposta pendente conserva a chave. API e banco impõem os gates e a concorrência.
- Rollback da aplicação pode manter o schema aditivo. Não recriar o antigo índice de um único documento por pedido nem remover filhos/colunas para voltar ao schema anterior: isso tornaria o histórico incompatível. Corrigir para frente preservando fatos.
- Vitest focado aprovado: série, IE, preflight, rejeições/recovery, payload do frontend, consultas e consumidor de operação fiscal.
- PostgreSQL local descartável: **31 assertivas pgTAP** e verificações adicionais de upgrade/replay, falha na inserção de documento e itens com rollback, repetição, duas sessões concorrentes, cancelamento inválido e histórico preservado. Massa `TEST_AUT_`; sem testes destrutivos/concorrentes remotos.
- Backend TypeScript, lint focado e build passaram. ERP tem diagnósticos anteriores em dependências fora do escopo; comparação com HEAD demonstrou ausência de novos erros.
- Advisors remotos: 379 alertas existentes, nenhum novo após as migrations.
- SEFAZ real: consulta 217 da primeira chave; transmissão 244, correção de série 209, correção de IE 100. Cinco campos do modal e fatos comerciais preservados.
- Assinatura do XML autorizado verificada independentemente; certificado válido. Recuperação da intenção preservou XML, número, protocolo e histórico, com uma autorização e um item fiscal.
- Playwright autenticado, somente leitura: modal HML e três documentos separados na tela, com status iguais ao banco. Nenhuma emissão ou ação comercial disparada pela auditoria visual.

IDs e publicações estão no [roadmap canônico](roadmap-configuracao-emissao-producao.md). Recuperação de fatos de nota já homologada não deve ser registrada como nova consulta SOAP. Matriz completa de produção, NFC-e e eventos permanece pendente.

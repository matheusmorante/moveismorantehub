# Documentação fiscal: índice e vigência

**Reconciliado com o checkout e publicações oficiais em 09/10/2026.** Use este índice para diferenciar as regras/documentos vigentes dos snapshots históricos. Relatórios datados continuam disponíveis para preservar evidências, mas não substituem o estado atual do código.

## Referências atuais

- [Status dos testes fiscais](status-testes-homologacao.md): implementação, testes, evidência HML, bloqueios e pendências por fluxo.
- [Roadmap de emissão](roadmap-configuracao-emissao-producao.md): arquitetura atual e prontidão para Produção.
- [Invariantes arquiteturais](invariantes-arquiteturais.md): critérios permanentes de revisão do emissor.
- [Matriz de saída interestadual](matriz-saida-interestadual.md), [auditoria de CFOP](auditoria-cfop-nfe-nfce.md) e [determinação de CFOP por produto/pedido](matriz-determinacao-cfop-produto-pedido.md): escopo atual, regras aprovadas e CFOPs candidatos.
- [NF-e de devolução](nfe-devolucao.md): condições, validações e limites do fluxo implementado.
- [Modelo fiscal varejista no Paraná](decisao-modelo-varejo-pr.md) e [decisão PIS/COFINS](decisoes-contribuicoes-venda-normal.md): decisões de negócio delimitadas ao cenário descrito em cada arquivo.
- [Fontes oficiais NF-e/NFC-e](manuais/README.md): links oficiais, registro das versões e verificações realizadas.
- [`api/nfe/schemas/README.md`](../../api/nfe/schemas/README.md): origem, pacote e hash dos XSDs fixados no código.
- [E2E fiscal pela interface](../testing/fiscal-interface-e2e.md): política de segurança, estado do runner e critério para testes de interface.

## Etapa atual da implantação — 09/10/2026

A validação do checkout está na etapa de Homologação, sem liberação de Produção. Há autorização histórica de NF-e 55, mas o XSD oficial ainda reprova os XMLs NFC-e pickup e delivery; a autorização NFC-e 65 não tem protocolo/XML verificável neste checkout. A rodada local focada terminou com 104/106 testes aprovados, sem transmissão SEFAZ.

O deployment do HEAD `fdbfee2be094ae1c9debacecde1cb7b7caa068b0` falhou por exceder 12 funções no plano Hobby; as alterações locais não commitadas também não estão publicadas. Os aliases públicos permanecem no último deployment READY de 07/10 (commit `3dd46b2dadc8721e464e546eb818bccdd8ce613d`); isso não significa indisponibilidade do deployment anterior. A Produção fiscal segue protegida por `productionApproved=false`. Consulte o [status detalhado](status-testes-homologacao.md) e o [roadmap](roadmap-configuracao-emissao-producao.md) antes de retomar.

## Publicações que ainda precisam de análise de aplicabilidade

| Publicação consultada em 09/10/2026 | Estado da revisão do ERP |
|---|---|
| NT 2026.004 v1.01 — CNPJ alfanumérico e chave de acesso | Implantada em homologação e produção em 2026. O schema aceita CNPJ alfanumérico em campos fiscais, mas a auditoria encontrou geração, validação, consulta, cancelamento e importação de chaves ainda restritas a dígitos. Compatibilidade ponta a ponta pendente; ver status central. |
| NT 2025.002 v1.52, NT 2026.007 v1.10 e NT 2026.008 v1.00 | Implantação adiada para 26/10/2026 em HML e 16/11/2026 em Produção ([aviso SVRS/ENCAT](https://dfe-portal.svrs.rs.gov.br/Nfe/Avisos)). Revisar regra, leiaute e cenários antes da nova janela HML. |
| NT 2026.002 v1.11, NT 2026.003 v1.00 e NT 2026.010 v1.00 | Especificações de DANFE Simplificado Tipo 2, contingência relacionada e DANFE NF-e para RTC ainda não comparadas ao renderizador/fluxos atuais. Adoção do produto deve ser decidida separadamente. |
| NT 2026.009 v1.00 | Publica correção em regra de validação. O efeito exato sobre as operações do ERP ainda precisa ser lido no documento específico. |
| Informe Técnico 2023.002 v2.10 (CFOP) | O catálogo local é estático e não foi comparado código a código com a tabela publicada. |
| Informe Técnico 2024.001 v2.40 (NCM) | Vigente desde 01/10/2026. A agenda e a última execução remotas do sync de NCM não foram consultadas. |
| Informe Técnico 2025.002 v1.70 (IBS/CBS) | Tabelas cClassTrib/CST/crédito presumido atualizadas em 01/10. A presença dos elementos no XSD não prova cálculo ou serialização; revisar regime, cronograma e cenários. |

As publicações não são, por si sós, prova de defeito ou de obrigação de implementar todas as opções normativas. A decisão depende de escopo e cronograma oficiais, regime tributário e operação coberta. Consulte [manuais/README.md](manuais/README.md) antes de uma alteração fiscal.

## Relatórios, checkpoints e evidências preservados

Os arquivos abaixo são snapshots de auditorias, decisões ou execuções com data própria. Use o status atual antes de reaproveitar um diagnóstico ou próximo passo:

- [Auditoria de cancelamento, estorno e devolução — 08/10](auditoria-cancelamento-estorno-devolucao-2026-10-08.md)
- [Auditoria de conformidade documental — 29/09](auditoria-conformidade-documental.md)
- [Auditoria do domínio tributário](auditoria-dominio-determinacao-tributaria.md)
- [Auditoria da stack de saída — 29/09](auditoria-stack-fiscal-saida.md)
- [Auditoria do caso contribuinte/consumidor final](auditoria-familia-interestadual-contribuinte-final.md): investigação aberta; não aprova família interestadual.
- [Auditoria histórica PR→SC](auditoria-interestadual-pr-sc.md)
- [Baseline HML de 01/10](baseline-e2e-homologacao-2026-10-01.md): evidência persistida da execução; não é roteiro para retransmissão.
- [Checkpoint da edição fiscal — 09/10](checkpoint-edicao-fiscal-2026-10-09.md)
- [Correção da reserva de numeração HML — 03/10](correcao-reserva-numeracao-hml-2026-10-03.md)
- [Correção de série/IE HML — 30/09](correcao-serie-ie-hml.md)
- [Validação da política de modelo varejista — 03/10](validacao-modelo-varejo-pr-2026-10-03.md)
- [Auditoria TLS SEFAZ-PR — 05/10](../audits/sefaz-tls-audit-2026-10-05.md): snapshot histórico de transporte, não comprova autorização fiscal nem estado atual.
- [Reserva, persistência e reconciliação — atualização 07/10](emissao-normal-reserva-reconciliacao.md): evidência remota histórica, não reconsultada nesta auditoria.
- [Retomada fiscal de 07/10](retomada-2026-10-07.md)
- [Verificação HTTPS/mTLS HML — 05/10](sefaz-hml-tls.md): transporte e bloqueio do certificado não revalidados depois daquela data.
- [Recuperação de consulta 217 — 04/10](recuperacao-217-numero-original.md)
- [Recuperação de tentativa ativa — 04/10](recuperacao-tentativa-ativa.md)

## Planos e snapshots substituídos

- [Emissão direta SEFAZ](nfe_sefaz_direta.md): documento antigo preservado como referência histórica; a arquitetura, persistência e status atuais estão no roadmap e no status central.
- [Plano de abas Produção/Homologação](plano-abas-ambiente-fiscal.md): proposta de abas não implementada; a tela atual usa uma lista com filtro de ambiente.
- [Alerta de erro fiscal no modal](plano-modal-alerta-erro-fiscal.md): a proposta foi implementada; o arquivo registra a decisão e aponta os componentes atuais.
- [Diff declarativo do schema](diff-declarativo-schema-nfe.md) e [plano de reconciliação do schema](plano-reconciliacao-schema-nfe.md): snapshots de 28/09; não comprovam o estado remoto atual nem são migrations executáveis.

Mantenha os registros históricos. Quando uma implementação, regra, fonte oficial ou resultado de teste mudar, atualize primeiro a referência atual correspondente e só depois o índice.

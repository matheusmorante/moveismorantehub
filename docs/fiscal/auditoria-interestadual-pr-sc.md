# Auditoria do cenário interestadual PR → SC

Este documento preserva o exame do destino Santa Catarina no cenário **PR → SC** realizado em 06/10/2026. A matriz principal é a [Matriz de Decisão Fiscal Interestadual de Saída](matriz-saida-interestadual.md). Este arquivo registra uma auditoria de fontes e vetores; não representa um override tributário nem prova, por si só, uma diferença aplicável a toda operação destinada a SC.

**Nenhum tratamento tributário executável específico de SC foi cadastrado ou aprovado.** A auditoria/reconciliação de 07/10/2026 confirmou que o inventário documental registra 20 células DRAFT, quatro BLOCKED e zero APPROVED; o runtime agora tem cinco famílias gerais DRAFT e uma família geral BLOCKED (5 DRAFT/1 BLOCKED/0 APPROVED). As cinco regras antes marcadas APPROVED foram reclassificadas por falta de evidência fiscal rastreável para o tratamento completo e o alcance dos curingas. Os dois gates PR→SC que existiram durante a revisão foram removidos por redundância quando as famílias gerais também viraram DRAFT. O mapeamento das seis famílias gerais às 24 células está na [matriz de saída interestadual](matriz-saida-interestadual.md).

Este arquivo é um registro histórico de fontes e vetores examinados para PR→SC. Os gates temporários descritos em versões anteriores não existem mais no runtime; o cenário é bloqueado pelas mesmas famílias gerais DRAFT usadas para os outros destinos interestaduais. Não há exceção fiscal específica de SC ativa.

## Fontes específicas de destino e de acordos

Os fundamentos nacionais N1–N5 e de origem PR1–PR3 estão classificados na [documentação principal](matriz-saida-interestadual.md#fundamentos-nacionais-e-do-paraná). Os IDs abaixo mantêm a evidência estadual e os acordos históricos da pesquisa anterior.

| ID | Escopo | Fonte consultada | Conclusão delimitada | Vigência/limite |
| --- | --- | --- | --- | --- |
| SC1 | DESTINATION_STATE | [RICMS/SC, Regulamento, texto atual](https://legislacao.sef.sc.gov.br/html/regulamentos/icms/ricms_01_00.htm) | Arts. 3, 7, 26, 53 e 60: destinatário contribuinte, uso/consumo/ativo, cálculo e antecipação | A finalidade e o regime do adquirente afetam o exame; benefício pode alterar o resultado. |
| SC2 | DESTINATION_STATE | [RICMS/SC, Anexo 3, texto atual](https://legislacao.sef.sc.gov.br/html/regulamentos/icms/ricms_01_03.htm) | Arts. 16–20: exceções, substituto, bases e ST-DIFAL | Não aplicar MVA/alíquota sem enquadramento do produto e acordo vigente. |
| SC3 | DESTINATION_STATE | [Lei SC 18.334/2022](https://legislacao.sef.sc.gov.br/html/leis/2022/lei_22_18334.htm) | Arts. 2, 4 e 10: Fundo Social, receitas e contribuição vinculada a benefício | A existência do fundo não prova adicional FCP de uma venda. |
| SC4 | DESTINATION_STATE | [SEF/SC — DIFAL LC 190](https://www.sef.sc.gov.br/saiba-mais/difal-lc-190-22) | Orientações de recolhimento ao destino | Não contém uma matriz completa para remetente CRT 1. |
| SC5 | DESTINATION_STATE | [COPAT SC 41/2022](https://legislacao.sef.sc.gov.br/consulta/views/Publico/DocumentoLegalViewer.ashx?id=D5C124CB-BA8E-418E-8E5E-1C8A891B522A) | Antecipação na aquisição para comercialização/industrialização quando fornecedor também é Simples | Hipótese delimitada; não confundir com DIFAL de uso/ativo nem com não contribuinte. |
| P1 | ORIGIN_DESTINATION_PAIR (acordo) / DESTINATION_STATE (denúncia SC) | [Protocolo ICMS 41/08, consolidado](https://www.confaz.fazenda.gov.br/legislacao/protocolos/2008/pt041_08) e [Decreto SC 479/2020](https://legislacao.sef.sc.gov.br/html/decretos/2020/dec_20_0479.htm) | Autopeças: SC denunciou o protocolo | A denúncia impede usar a lista original de signatários como autorização PR → SC atual. |
| P2 | ORIGIN_DESTINATION_PAIR (acordo) / DESTINATION_STATE (denúncia SC) | [Decreto SC 1.173/2017](https://legislacao.sef.sc.gov.br/html/decretos/2017/dec_17_1173.htm) e [exposição oficial de motivos 080/2017](https://legislacao.sef.sc.gov.br/html/expo_mo/2017/dec_17_1173_alt_3769_em_080.pdf) | Exclusão do regime de eletrônicos/eletrodomésticos associada à denúncia dos Protocolos 192/09 e 106/12 | Efeitos em 01/07/2017; não reaproveitar o protocolo histórico como regra atual. |

SC1–SC5 não sustentam uma regra de destino wildcard. Uma aprovação que use essas fontes deve limitar o destino a SC, além de completar seus fatos, incidências, vigência, implementação XML e testes. P1/P2 são **acordos históricos descartados**, não autorizações atuais PR → SC. Nenhum protocolo vigente foi selecionado para produto operacional.

## Limites concretos das conclusões de SC

- Uso/consumo/ativo por contribuinte requer análise do RICMS/SC, benefício, regime, produto e eventual ST-DIFAL. Isso não é o grupo ICMSUFDest de não contribuinte.
- COPAT 41/2022 trata da hipótese delimitada de antecipação em aquisição para comercialização/industrialização entre optantes do Simples; não elimina DIFAL de uso/ativo nem resolve a venda a não contribuinte.
- A Lei SC 18.334/2022 trata do Fundo Social e receitas/contribuição vinculada a benefício. Ela não comprova uma alíquota FCP de venda. FCP e FCP-ST permanecem unresolved.
- A existência de retenção anterior no PR não prova a manutenção do tratamento em SC nem a responsabilidade pela nova saída. Produto, descrição, NCM/CEST, papel e acordo vigente precisam ser verificados.
- A denúncia dos acordos de autopeças e eletrônicos/eletrodomésticos impede copiar a lista histórica de signatários para aprovar ST atual. Isso também não prova ausência de ST em todos os segmentos.

## Auditoria preservada das dez famílias inicialmente examinadas em PR → SC

Os prefixos antigos `PR-SC-*` foram substituídos por `INTERSTATE-*`. Os sufixos e o conteúdo tributário pendente foram preservados. C/F/S/D0/D1/D9/X referem-se aos ramos da matriz-base; nenhum é tratamento executável.

Todas compartilham: ambiente 2, modelo 55, CRT 1, venda normal, terceiros, PR → SC. `orig` é o código fiscal **0–8 comprovado pelo produto/documentação de entrada**; terceiros não implica origem 0. NCM válido de 8 dígitos é necessário para a mercadoria. CEST é necessário se o produto se enquadrar na lista do N4, inclusive em operação sem retenção ST. CEST vazio exige confirmação de não enquadramento, não apenas ausência no cadastro.

| Linha / sufixo do ID INTERSTATE- | indIEDest / indFinal | CFOP analisado | CSOSN / ICMS XML | ST / papel | DIFAL / responsável | FCP / FCP-ST | Origem / NCM / CEST | Fontes nacionais / PR / SC / protocolo | Vigência executável | Status / motivo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PJ-TAXPAYER-NONFINAL-NO-ST | 1 / 0 | 6102, condicionada à operação sem ST comprovada | C; unresolved | Sem ST alegada; enquadramento ainda não comprovado | D0; antecipação do adquirente a revisar | X / X | Por produto / obrigatório / por enquadramento | N1–N4 / PR1–PR3 / SC1,SC3,SC5 / nenhum confirmado | unresolved | DRAFT: falta regime/crédito/benefício e produto validado |
| PJ-TAXPAYER-NONFINAL-ST | 1 / 0 | 6403 se substituto; 6404 somente retenção anterior válida; exceção exige reclassificação | S; unresolved | Substituto/substituído unresolved | D0; examinar antecipação separadamente | X / X | Por produto / obrigatório / obrigatório se listado | N1–N4 / PR1–PR3 / SC1–SC3 / produto pendente; P1/P2 descartados | unresolved | DRAFT: falta papel, acordo e parâmetros ST |
| PJ-TAXPAYER-FINAL-NO-ST | 1 / 1 | 6102, condicionada à operação sem ST comprovada | F; unresolved | Sem ST alegada; confirmar | D1; destinatário, ressalvadas exceções | X / X | Por produto / obrigatório / por enquadramento | N1–N5 / PR1–PR3 / SC1,SC3 / nenhum confirmado | unresolved | DRAFT: falta tratamento do produto e DIFAL de uso/ativo |
| PJ-TAXPAYER-FINAL-ST | 1 / 1 | 6403/6404 apenas após papel e protocolo; não automático | S; unresolved | Papel e incidência de ST-DIFAL unresolved | D1; destinatário ou remetente por acordo aplicável | X / X | Por produto / obrigatório / por enquadramento | N1–N5 / PR1–PR3 / SC1–SC3 / produto pendente | unresolved | DRAFT: falta responsabilidade ST-DIFAL e cálculo |
| PJ-EXEMPT-FINAL-NO-ST | 2 / 1 | 6102 candidato: isento de IE não é indIEDest=9 | F; unresolved | Sem ST alegada; confirmar | D1; confirmar condição contribuinte/isento em SC e exceções | X / X | Por produto / obrigatório / por enquadramento | N1–N5 / PR1–PR3 / SC1,SC3 / nenhum confirmado | unresolved | DRAFT: falta prova da condição isenta e tratamento |
| PJ-EXEMPT-FINAL-ST | 2 / 1 | unresolved; depende papel e destinação | S; unresolved | Papel/protocolo unresolved | D1; responsável unresolved | X / X | Por produto / obrigatório / por enquadramento | N1–N5 / PR1–PR3 / SC1–SC3 / produto pendente | unresolved | DRAFT: condição isenta não resolve ST nem finalidade |
| PJ-NONTAXPAYER-FINAL-NO-ST | 9 / 1 | 6108 candidato de venda a não contribuinte | F; unresolved | Sem ST alegada; confirmar | D9; tratamento do Simples unresolved | X / X | Por produto / obrigatório / por enquadramento | N1–N5 / PR1–PR3 / SC1,SC3,SC4 / nenhum confirmado | unresolved | DRAFT: produto/benefício e DIFAL CRT 1 não encerrados |
| PJ-NONTAXPAYER-FINAL-ST | 9 / 1 | 6108/6404 em análise; não transplantar consulta de UF de origem diferente | S/F conforme tratamento da saída; unresolved | Retenção anterior no PR ≠ ST devida em SC | D9; unresolved | X / X | Por produto / obrigatório / por enquadramento | N1–N5 / PR1–PR3 / SC1–SC4 / produto pendente | unresolved | DRAFT: falta provar manutenção/ressarcimento/nova incidência |
| PF-NONTAXPAYER-FINAL-NO-ST | 9 / 1 | 6108 candidato | F; unresolved | Sem ST alegada; confirmar | D9; tratamento do Simples unresolved | X / X | Por produto / obrigatório / por enquadramento | N1–N5 / PR1–PR3 / SC1,SC3,SC4 / nenhum confirmado | unresolved | DRAFT: PF não comprova tratamento do produto |
| PF-NONTAXPAYER-FINAL-ST | 9 / 1 | 6108/6404 em análise, pelas mesmas condições da PJ não contribuinte | S/F; unresolved | Retenção anterior/saída PR → SC unresolved | D9; unresolved | X / X | Por produto / obrigatório / por enquadramento | N1–N5 / PR1–PR3 / SC1–SC4 / produto pendente | unresolved | DRAFT: falta tratar retenção, produto e fundos |

A modalidade/base/alíquota de cada linha está na coluna C/F/S acima: são ramos condicionais, nenhum parâmetro executável foi estabelecido. Quando ST/DIFAL exigir alíquota interestadual, PR → SC em regra não se confunde com a rota a 7%; origem/importação e exceções podem exigir exame de 4%. Não aplicar uma alíquota interestadual como destaque de ICMS próprio em ICMSSN102.

## Critério para futura regra específica de destino

Uma regra de destino só deve ser criada no mesmo catálogo da matriz-base quando houver uma diferença fiscal concreta, sustentada por fonte oficial e acionada por critérios correspondentes. Se depender de acordo, deve vincular origem, destino e produto/segmento. Fontes DESTINATION_STATE exigem a UF no critério; ORIGIN_DESTINATION_PAIR exige o par; PRODUCT_SPECIFIC exige o produto/NCM/CEST correspondente.

Não há preenchimento parcial por merge com a regra geral: o resolver seleciona uma regra completa, vigente e sem empate. Hierarquia: produto > NCM > CEST > destino específico > demais dimensões > prioridade. A fixture SC dos testes não é aprovação normativa; SP e RS não usam suas fontes nem seu tratamento.

Vigência tributária executável: **unresolved** para todas as famílias DRAFT desta auditoria. XML de regra SC aprovada: **nenhum**. Resultados dos testes e limites de compilação estão na documentação principal. Não houve nova pesquisa de tratamentos de SP/RS nem transmissão à SEFAZ nesta refatoração.

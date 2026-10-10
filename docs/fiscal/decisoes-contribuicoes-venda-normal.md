# PIS/COFINS na venda normal: escopo compartilhado entre NF-e e NFC-e

Consulta e decisão: **07/10/2026**. Cenário implementado: emitente CRT 1,
venda normal de mercadoria revendida a consumidor final, nos modelos 55 e 65.

> Revisão documental em 09/10/2026: esta decisão cobre PIS/COFINS no cenário delimitado e não afirma conformidade RTC completa. O Informe Técnico 2025.002 v1.70 atualizou tabelas cClassTrib/CST/crédito presumido de IBS/CBS em 01/10; o estado de cálculo/serialização RTC está no [status fiscal atual](status-testes-homologacao.md) e exige análise separada.

## Decisão

PIS e COFINS usam a mesma decisão para NF-e 55 e NFC-e 65:
`fiscal_decision_simples_normal_sale_v1`. O escopo declara explicitamente os
modelos `55` e `65`, operação `normal_sale` e CRT `1`. Para este cenário, a
decisão mantém **CST 99 para PIS e COFINS, com base, alíquota e valor iguais a
zero**.

A configuração anterior `fiscal_decision_simples_nfe55_normal_sale_v1` fica
preservada para leitura de registros históricos, mas não autoriza uma nova
emissão 65 nem serve como fallback. A configuração comum é usada em novas
emissões dos dois modelos. Snapshots congelados mantêm os dados que foram
registrados originalmente; nenhum XML, documento ou snapshot antigo foi
reescrito.

## Por que o modelo não separa a regra de contribuição

O FAQ oficial do Simples e a Orientação de Preenchimento da NF-e indicam CST 99
e valores zerados para PIS/COFINS no exemplo de optante do Simples Nacional. O
MOC descreve os grupos XML correspondentes nos leiautes de NF-e e NFC-e. Na
NFC-e, esses grupos são opcionais no leiaute; essa diferença de serialização não
cria, por si só, outro tratamento material de PIS/COFINS. Assim, o modelo do
documento não é parte da decisão tributária deste cenário.

Esta conclusão não declara que toda mercadoria do Simples tenha sempre o mesmo
tratamento. Regimes específicos, como incidência monofásica ou substituição
tributária de PIS/COFINS, exigem análise própria do produto e da operação. A
classificação NCM do item do pedido, isoladamente, não foi tratada como prova
de inexistência dessas exceções. A decisão comum vale apenas para a venda
normal coberta pelas validações fiscais atuais; outros cenários continuam
sujeitos a regras e bloqueios próprios.

## Fontes oficiais

- [Portal Nacional da NF-e — perguntas frequentes do Simples Nacional](https://www.nfe.fazenda.gov.br/Portal/perguntasFrequentes.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=S%2FEAGUrzRyk%3D): orientação de CST 99 e valores zerados para PIS/COFINS de optante do Simples.
- [Portal Nacional da NF-e — Orientação de Preenchimento v2.02](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=5W9aeeSeghM%3D), página 20/39: exemplo de PISOutr/COFINSOutr CST 99 e valores zerados para ME/EPP optante do Simples.
- [Portal Nacional da NF-e — Nota Técnica 2012.004](https://www.nfe.fazenda.gov.br/Portal/exibirArquivo.aspx?conteudo=cjp9G+N7Xew%3D): especifica que o grupo PIS/COFINS é opcional na NFC-e e obrigatório na NF-e.
- [CONFAZ — MOC 7.0, Anexo I, revisão 7.03](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf): leiaute de NF-e/NFC-e e grupos Q/S de PIS/COFINS. O MOC define estrutura e regras de validação do XML, não o enquadramento completo de cada mercadoria.
- [Paraná — Decreto 5.144/2024, tabela VI](https://www.legislacao.pr.gov.br/legislacao/listarAtosAno.do?action=exibirImpressao&codAto=321819): CSOSN 103 corresponde à isenção por faixa de receita bruta; não é o código genérico de toda empresa do Simples.

## Implementação e garantias

- Uma única chave e uma lista explícita de modelos evitam a separação artificial
  por documento e preservam a exigência de escopo.
- O backend valida modelo 55 ou 65, operação normal, CRT 1, confirmação da
  decisão e os valores PIS/COFINS antes de preparar a tentativa fiscal.
- A função transacional relê e bloqueia a configuração no banco dentro da mesma
  transação que grava snapshot, número, documento e tentativa.
- Decisão ausente, escopo inesperado ou modelo fora da lista bloqueia antes da
  reserva. Uma falha anterior em `CONTRIBUTION_MODEL_SCOPE_REQUIRED` não cria
  esses registros.
- A seleção de PIS/COFINS não cria efeitos comerciais em estoque, financeiro ou
  pedido.

O CSOSN usado em uma fixture técnica de Homologação não foi promovido a padrão
para pedidos comerciais. A regra da fixture `HML_TECHNICAL_V1` permanece isolada.

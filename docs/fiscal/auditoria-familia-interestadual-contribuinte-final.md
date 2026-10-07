# Auditoria de conteúdo — contribuinte ICMS consumidor final

**Estado:** revisão preliminar; a família executável permanece `DRAFT`.
**Família:** `INTERSTATE-TAXPAYER-FINAL-BASE`.
**Escopo atual da regra:** emitente PR, CRT 1, venda interestadual de mercadoria de terceiros, NF-e 55; destinatário contribuinte (`indIEDest=1`) e `indFinal=1`. A regra ainda usa curingas para destino e mercadoria.
**Caso usado para iniciar a revisão:** pedido HML #4268, produto descrito como forno micro-ondas, NCM `85165000`, PR → SC.

## Fatos observados e limites

- O destinatário é PJ em SC, classificado na tela como contribuinte do ICMS, com IE informada.
- O produto está cadastrado como forno micro-ondas, NCM `85165000`, origem `0`, sem CEST registrado.
- Na auditoria inicial, o pedido não persistia a finalidade da compra e o modal assumia `indFinal=true`. Em 07/10/2026, o usuário definiu explicitamente o cenário de teste #4268 como **uso/consumo (`indFinal=1`)**. A decisão está registrada nesta auditoria; o pedido remoto ainda não foi alterado nesta etapa.
- A tela permitia CFOP `6102` e mostrava CSOSN `103`. A classificação de CFOP não decide o tratamento completo de ICMS.
- Não há dado explícito sobre retenção/recolhimento de ICMS-ST na aquisição do produto.

## O que as fontes oficiais sustentam

### CFOP

A tabela oficial do CONFAZ descreve `6102` como venda interestadual de mercadoria adquirida ou recebida de terceiros e `6108` como venda dessa mercadoria a não contribuinte. Isso sustenta `6102` como candidato classificatório para os fatos da tela; não comprova CSOSN, ICMS próprio, ST ou DIFAL.

### Santa Catarina: ST de eletrodomésticos

O Decreto SC nº 104/2019 revogou, com efeitos a partir de 1º de maio de 2019, a Seção XX do Anexo 1-A do RICMS/SC, que tratava dos produtos eletrônicos, eletroeletrônicos e eletrodomésticos. A versão vigente consultada do Anexo 1-A continua marcando essa seção como revogada, e a busca no Anexo 3 vigente não encontrou o NCM `8516.50`. Assim, a antiga listagem de eletrodomésticos não sustenta cobrança de ST em SC para este caso.

Esse achado é restrito ao destino SC e à categoria pesquisada. Não prova ausência de ST para todos os destinos, mercadorias, outras bases legais ou fatos anteriores da cadeia. O CEST ausente e a falta do documento fiscal de aquisição ainda impedem concluir o histórico tributário desta unidade.

### Finalidade e DIFAL em SC

O RICMS/SC, art. 3º, XIV, trata como fato gerador a entrada em SC de mercadoria adquirida por contribuinte de outra UF para uso/consumo ou ativo imobilizado. O art. 9º, VII e § 3º, prevê a diferença entre alíquota interna e interestadual para essa hipótese.

Isso não se aplica automaticamente a mercadoria adquirida para revenda. `indFinal=1` não distingue uso/consumo de ativo imobilizado, e nenhum desses fatos pode ser deduzido apenas do tipo PJ ou da IE do destinatário. A finalidade efetiva precisa ser informada e persistida.

### CSOSN e crédito do Simples Nacional

O usuário definiu `103` como preferência única da matriz interestadual, sem variação por UF de destino. Esse código permanece como candidato comum e não cria override estadual. O MOC da NF-e define `103` como isenção do ICMS no Simples Nacional para faixa de receita bruta. A Resolução CGSN nº 140/2018 exige que a isenção esteja estabelecida pelo Estado/DF competente e abranja a faixa de receita da optante no mês da operação. Portanto, a configuração comum não substitui a comprovação de que o emitente no PR está abrangido; CRT 1, por si só, não fundamenta CSOSN `103`.

O crédito indicado em `CSOSN 101` depende das condições da LC 123/2006 e da Resolução CGSN nº 140/2018; entre outros pontos, não se aplica quando o destinatário não é optante pelo Simples mas adquire a mercadoria para uso/consumo. `CSOSN 102` não substitui o candidato `103`: representa operação tributada pelo Simples sem permissão de crédito e exclui hipóteses próprias como isenção, ST, imunidade e não tributação.

## Registro da finalidade no fluxo

O modal registra `fiscalContext.acquisitionPurpose` no pedido pelo serviço transacional de atualização existente, junto com o `finalConsumer` correspondente. As opções distinguem revenda, uso/consumo e ativo imobilizado. Na operação interestadual, um booleano legado sem essa finalidade explícita não basta para preparar a emissão. O backend lê a finalidade do snapshot persistido e rejeita `indFinal` incompatível antes de consultar a matriz. HML e Produção usam a mesma validação.

Salvar a finalidade não movimenta mercadoria nem cria nova emissão; a atualização mantém o estado comercial e usa a reconciliação transacional existente do pedido. A tela só aceita a nova finalidade após a atualização concluir. Falha de persistência mantém o cenário anterior e não libera a emissão. Nenhuma chamada à SEFAZ faz parte dessa atualização.

## Decisão sobre a família

**Não aprovar nem alterar o tratamento nesta etapa.** As fontes sustentam a classificação candidata de CFOP e algumas regras de enquadramento, mas não fecham a combinação fiscal do pedido nem a família executável ampla.

O cenário #4268 foi definido como compra para uso/consumo e cobre somente uma combinação de destino, produto e finalidade. A família atual alcança todas as UFs e produtos; uma confirmação pontual de SC não sustenta os curingas nacionais. O runtime continua bloqueando corretamente essa família em `DRAFT`.

## Dados ainda necessários para fechar o caso #4268

1. Persistir no pedido a finalidade já definida pelo usuário: uso/consumo, `indFinal=1`.
2. Identificação comercial completa do micro-ondas e capacidade, para confirmar a descrição/classificação do produto.
3. XML/documento de aquisição e ficha fiscal do estoque como evidência de origem, NCM/CEST, eventual retenção anterior e CST/CSOSN de entrada. Esses documentos não determinam sozinhos a tributação da saída: o tratamento da nova operação PR→SC depende da legislação aplicável a ela.
4. Situação do destinatário perante o Simples Nacional e regime de apuração, além da finalidade informada na ordem de compra.
5. Dados fiscais do emitente necessários ao enquadramento da saída, inclusive faixa/receita e percentual aplicável no Simples no período; comprovação legal seria necessária se houver proposta de CSOSN `103`.
6. Para aprovar a família geral: cobertura das combinações de destino e mercadorias que os curingas atuais alcançam, com tratamento de CFOP/CSOSN/ICMS, ST, DIFAL, FCP e respectivas vigências.

## Fontes oficiais

- [Tabela CFOP do CONFAZ](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24)
- [Decreto SC nº 104/2019](https://legislacao.sef.sc.gov.br/html/decretos/2019/dec_19_0104.htm)
- [RICMS/SC — Anexo 1-A](https://legislacao.sef.sc.gov.br/html/regulamentos/icms/ricms_01_01_a.htm)
- [RICMS/SC — Regulamento, arts. 3º e 9º](https://legislacao.sef.sc.gov.br/html/regulamentos/icms/ricms_01_00.htm)
- [RICMS/SC — Anexo 3](https://legislacao.sef.sc.gov.br/html/regulamentos/icms/ricms_01_03.htm)
- [MOC NF-e 7.0, Anexo I](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf)
- [Resolução CGSN nº 140/2018, texto compilado](https://normas.receita.fazenda.gov.br/sijut2consulta/normas.receisulta/link.action?idAto=92278&visao=compilado)
- [LC nº 123/2006](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm)

O catálogo guarda `103` como candidato comum das cinco famílias DRAFT, sem seletor ou override por UF de destino. Esta revisão não aprovou tratamento tributário e não transmitiu documento fiscal.

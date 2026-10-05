# Modelo fiscal das vendas varejistas no Paraná

Política `PR_RETAIL_2026_10`, revisada em 04/10/2026.

## Orientação ao operador

Na emissão do pedido, preencha **Finalidade da compra**, que define o indicador **Consumidor final**:

- **Uso / consumo próprio** → consumidor final **Sim**, inclusive por pessoa jurídica.
- **Revenda** → consumidor final **Não**.

A prévia mostra o modelo e o motivo. Entrega e retirada são modalidades logísticas; nenhuma escolhe o modelo sozinha. CPF ou CNPJ também não define o modelo sozinho.

| Operação | Modelo |
|---|---|
| Consumidor final, venda interna no PR, retirada | NFC-e 65 |
| Consumidor final, venda interna no PR, entrega em domicílio | NFC-e 65 |
| PJ consumidora final, operação interna compatível | NFC-e 65 |
| Revenda ou adquirente que não é consumidor final | NF-e 55 |
| Operação interestadual ou destinatário em outra UF | NF-e 55 |
| Devolução, transferência, remessa, retorno, exportação ou importação | NF-e 55 |
| Crédito fiscal ou exigência fiscal específica, inclusive Administração Pública | NF-e 55 |
| Valor igual ou superior a R$ 200.000 | NF-e 55 |

NFC-e em entrega usa `indPres=4`, identificação e endereço do destinatário. A opção de transporte depende da modalidade efetiva; entrega própria usa `modFrete=3` sem inventar transportadora terceirizada. Para cartão, use os dados fiscais do pagamento; o comando fiscal também aceita a declaração explícita de terminal separado sem TEF. A interface atual coleta a finalidade da compra e não acrescenta esses dois campos ao modal. Não presumir essas condições nem inventar CPF/CNPJ, endereço, transportador ou autorização de cartão.

O CEP do destinatário é opcional no leiaute; se informado, precisa ter oito dígitos. A dispensa do CEP não dispensa os demais dados de endereço quando obrigatórios. Na venda NFC-e presencial (`indPres=1` ou `5`) abaixo de R$ 10.000,00, CPF/CNPJ é opcional; a partir de R$ 10.000,00, é obrigatório. Também é obrigatório em qualquer operação não presencial (`indPres=2`, `3`, `4` ou `9`), com endereço do destinatário. A regra inclui entrega em domicílio mesmo abaixo do limite — por exemplo, NFC-e de R$ 569 — e se aplica a CPF para PF ou CNPJ para PJ. Desde 03/08/2026, a norma cobre todas as operações não presenciais, não apenas entrega em domicílio (Ajuste SINIEF 19/16, cláusula quarta, VII, com redação do Ajuste SINIEF 09/26). Na venda doméstica normal com NF-e 55, exige-se identificação e endereço; operações especiais ou estrangeiras precisam de matriz fiscal própria.

| Modelo e operação | Valor | CPF/CNPJ | Endereço do destinatário |
|---|---:|---|---|
| NFC-e 65 presencial, inclusive retirada presencial | abaixo de R$ 10.000 | Opcional; obrigatório se solicitado pelo adquirente | Não obrigatório por esta regra |
| NFC-e 65 presencial | R$ 10.000 ou mais | Obrigatório | Não obrigatório por esta regra |
| NFC-e 65 não presencial, inclusive entrega em domicílio | qualquer valor | Obrigatório | Obrigatório |
| NF-e 55 em venda doméstica normal suportada | qualquer valor | Obrigatório | Obrigatório |
| Operação especial ou estrangeira | qualquer valor | Matriz específica da operação | Matriz específica da operação |

## Implementação e auditoria

`shared-utils/fiscalDocumentModel.ts` centraliza a decisão. `resolveOrderFiscalModel` adapta os fatos do pedido e `resolveFiscalDocumentModel` retorna modelo, códigos dos motivos, descrição e versão. O backend determina novamente com pedido, destinatário, itens, valores e emitente consultados no servidor. O browser envia a finalidade da compra como indicador de consumidor final; não tem autoridade para enviar modelo, série, chave ou XML.

`decideFiscalRecipientRequirements` centraliza a obrigatoriedade do identificador e do endereço. O modal, o preflight de emissão, a validação do snapshot, o Fiscal Core e os serializers legado/servidor usam essa matriz; o RPC vincula o identificador (inclusive ausência explícita) ao snapshot imutável, sem gravá-lo no cadastro da pessoa. CPF e CNPJ têm dígito verificador; a validação também aceita o formato alfanumérico oficial de CNPJ nos campos de destinatário.

A preferência `settings.requiredFields.customer.cpfCnpj` ainda pode tornar o documento obrigatório no cadastro de cliente ou na entrada comercial, como requisito interno de completude. Ela é independente da obrigatoriedade fiscal da NF-e/NFC-e e não altera a matriz da emissão. A tela de cadastro aceita CNPJ alfanumérico; a importação infere PJ pelo documento compacto de 14 caracteres. O App Mobile consulta dados de fornecedores, mas não contém outro fluxo de emissão nem uma segunda regra fiscal de destinatário.

Motivos: `RETAIL_FINAL_CONSUMER_IN_STATE`, `INTERSTATE_OPERATION`, `RESALE`, `TAX_CREDIT_REQUIRED`, `RETURN`, `TRANSFER`, `SHIPMENT`, `GOODS_RETURN`, `EXPORT`, `IMPORT`, `PUBLIC_ADMINISTRATION`, `OTHER_FISCAL_REQUIREMENT` e `VALUE_LIMIT`. Novas exigências fiscais devem ser acrescentadas à política central, com fonte e teste focado.

```mermaid
flowchart TD
    A[Pedido e fatos fiscais do servidor] --> B{Consumidor final informado?}
    B -->|Não| X[Solicitar informação]
    B -->|Sim| C{Existe razão fiscal para NF-e?}
    C -->|Sim| D[NF-e 55 e motivo registrado]
    C -->|Não| E{Varejo interno no Paraná?}
    E -->|Não confirmado| X
    E -->|Sim| F[NFC-e 65]
    D --> G[Aplicar matriz tributária aprovada]
    F --> G
    G --> H[Validar destinatário, itens e pagamento]
    H --> I[Reservar número e contexto em transação]
    I --> J[Montar, assinar e validar XML oficial]
    J --> K[Reservar documento e tentativa em transação]
    K --> L[Transmitir à SEFAZ após commit]
    L --> M[Persistir resultado e itens em transação]
```

O contexto, o modelo e a justificativa são congelados no snapshot de numeração. A reserva do documento confere chave, ambiente, modelo, consumidor final e trace. Retry consulta/reutiliza o modelo e XML originais; não recalcula a nota usando a logística atual. Proteções contra repetição e concorrência permanecem no banco. Documentos V1 preservam sua identidade.

Essas operações fiscais não movimentam estoque, financeiro ou reservas comerciais. A autorização persiste documento, resposta e itens fiscais na mesma transação. SOAP acontece após o commit; falha ou resposta ambígua fica pendente para reconciliação, sem desfazer fatos comerciais.

### Escopo da emissão existente

`HML_NORMAL_SALE_V2` cobre a matriz já aprovada de venda interna, CRT 1, CFOP 5102 e grupos suportados de ICMS próprio zerado. Escolher 55 por operação interestadual, devolução, crédito ou outra exceção não autoriza reutilizar essa tributação: o fluxo exige a matriz própria da operação. Devoluções/remessas continuam pelos fluxos fiscais específicos. Produção continua exigindo sua aprovação fiscal própria. A alteração do modelo não aprova tributos automaticamente.

O serializer usa NFC-e online com QR Code v3 (`chave|3|tpAmb`), `tpImp=4` e suplemento antes da assinatura. O backend deriva o endpoint HML de autorização/consulta conforme 55 ou 65, sem fallback para Produção. Os builders antigos do frontend permanecem somente como compatibilidade; a emissão usa o Fiscal Core no servidor.

## Fontes oficiais consultadas

- [SEFA/PR — perguntas sobre NFC-e](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/22): questões 1463, 1465, 1466 e 1508, venda interna a consumidor final PF/PJ, entrega e identificação.
- [NPF 100/2014 consolidada](https://sped.fazenda.pr.gov.br/sites/sped/arquivos_restritos/files/migrados/File/NFCE/NPF_100_2014_NFCe_Consolidada_com_NPF036_2015.pdf): itens 1.2 e 1.3.
- [Ajuste SINIEF 19/16 vigente](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2016/AJ_019_16): cláusula quarta, identificação/endereço e limite de valor. O [Ajuste SINIEF 09/26](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2026/AJ009_26) ampliou a identificação obrigatória de entrega em domicílio para todas as operações não presenciais, com efeitos em 03/08/2026; FAQ estadual anterior a essa mudança deve ser lido com o Ajuste vigente.
- [Ajuste SINIEF 12/26](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2026/AJ012_26): revogou o Ajuste 11/25; não aplicar a exigência revogada de 55 apenas por CNPJ.
- [MOC 7, Anexo I](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf): CEP E13, indicadores de presença e regras X02-10/X03-20 de transporte.
- [Portal NF-e — notas técnicas](https://hom.nfe.fazenda.gov.br/portal/listaConteudo.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=04BIflQt1aY%3D): NT 2025.001 v1.03, QR Code v3 online.
- [Receita Federal — CNPJ alfanumérico](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico) e [manual oficial de cálculo do dígito verificador](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf/@@download/file); novos CNPJs alfanuméricos desde julho de 2026.
- [SVRS — documentos técnicos da NFC-e](https://dfe-portal.svrs.rs.gov.br/Nfce/Documentos): NT 2026.004, validação do CNPJ alfanumérico e leiaute atualizado.
- [SEFA/PR — web services NFC-e](https://sped.fazenda.pr.gov.br/NFCe/Pagina/Web-Services-NFC-e): endpoints oficiais por ambiente.

Os testes de XML utilizam o pacote oficial fixado `PL_010f_v1.04`; validação XSD não substitui autorização da SEFAZ nem comprova aprovação tributária.

## Banco e testes

Integração usa o Supabase remoto configurado, conforme [política canônica](../testing/SUPABASE_REMOTE_TEST_POLICY.md), sem Docker Desktop. A migration `20261003222817_retail_fiscal_model_policy.sql` amplia as RPCs e guardas HML para o modelo determinado e congela o contexto na mesma transação da numeração. A migration `20261004233048_nfe_recipient_tax_id_alpha_and_optional_snapshot.sql` aceita CPF/CNPJ no formato fiscal e permite congelar a ausência explícita de identificação nos casos NFC-e opcionais. Ambas alteram apenas funções de snapshot fiscal; não alteram pedidos, cadastro de pessoas, produtos, estoque ou financeiro.


Validação e aplicação remota: [evidências de 03/10/2026](validacao-modelo-varejo-pr-2026-10-03.md).

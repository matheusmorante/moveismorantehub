# Checklist de go-live — NF-e de produção

Produção permanece bloqueada até que cada gate aplicável abaixo tenha evidência e aprovação registradas. A homologação usa `tpAmb=2`; qualquer emissão produtiva usa `tpAmb=1`, endpoint oficial de produção derivado no backend e uma liberação explícita. A flag de produção deve permanecer desligada por padrão. Não habilitar a flag como parte deste checklist.

## Segurança da emissão

- [ ] Confirmar que produção está desabilitada em todos os ambientes e que a ausência da configuração falha fechada.
- [ ] Confirmar em implantação que qualquer solicitação `tpAmb=1` é recusada enquanto a liberação de produção estiver desligada.
- [ ] Designar aprovadores e registrar liberação explícita antes de qualquer habilitação temporária.
- [ ] Confirmar que `tpAmb`, endpoint SEFAZ, numeração e série são definidos e validados no servidor; nenhuma tentativa pode cair de produção para homologação ou vice-versa.
- [ ] Confirmar idempotência de emissão/eventos, consulta `consSitNFe` antes de retry após timeout e trilha de reconciliação para respostas desconhecidas.

## Cadastro e configuração fiscal

- [ ] Validar vigência e cadeia ICP-Brasil do certificado do emitente, titularidade, CNPJ e vencimento; manter certificado e senha somente em segredo do backend.
- [ ] Conferir razão social, CNPJ, IE, CRT, endereço e município do emitente contra o cadastro oficial.
- [ ] Revisar modelo, série e próxima numeração de produção; verificar continuidade e não reutilização de números consumidos.
- [ ] Revisar CSC/CSRT e respectivos identificadores/tokens apenas para os modelos e eventos em que são exigidos; conferir ambiente, titularidade e validade sem copiar valores secretos para o checklist.
- [ ] Revisar NCM, origem, CFOP, CSOSN/CST, benefícios e defaults por operação e produto; validar exceções manualmente, sem ativar NCM em massa.
- [ ] Confirmar que saldo físico não bloqueia a emissão da NF-e; movimento e saldo de estoque seguem o gatilho comercial próprio e não são alterados pela transmissão fiscal.
- [ ] Validar destinatário, endereço, IE/indicador de IE, quantidades, descontos, frete, serviços e totais nos cenários de venda reais previstos.

## Operação e recuperação

- [ ] Confirmar backup recente do banco e evidência de restauração testada.
- [ ] Confirmar logs, alertas de falha/rejeição/timeout, protocolo e correlação entre pedido e documento, com sanitização obrigatória de PII e segredos.
- [ ] Confirmar consulta de situação e recuperação de protocolo após timeout.
- [ ] Confirmar cancelamento apenas antes da circulação e no prazo aplicável; confirmar bloqueio depois de entregue/retirado e fluxo de devolução vinculado.
- [ ] Confirmar devolução parcial e completa, entrada de estoque, limites faturados e ausência de lançamento financeiro indevido por regra de negócio.
- [ ] Confirmar que botões de envio são desabilitados durante submissão e que retry reaproveita a mesma operação/chave quando a SEFAZ pode ter recebido o primeiro envio.

## Acesso e autorização

- [ ] Testar e registrar permissões de `seller`, `manager` e `administrator` para emitir, consultar, cancelar, devolver e reconciliar; negar ações fiscais não autorizadas no backend.
- [ ] Registrar operador responsável, aprovador fiscal, janela de mudança e contato para incidente.
- [ ] Revisar o primeiro documento de produção com o responsável fiscal antes de transmiti-lo e conferir protocolo após autorização.

## Registro de aprovação

- Emissor e ambiente aprovados por: ____________________
- Responsável fiscal: ____________________
- Data da revisão: ____________________
- Evidências / implantação: ____________________
- Liberação explícita para produção: ____________________

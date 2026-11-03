export const REJECTION_COPY: Record<string, string> = {
  '203': 'O emitente não está habilitado para emissão de NF-e na SEFAZ. Verifique o cadastro da Inscrição Estadual.',
  '204': 'Esta nota já foi autorizada na SEFAZ com este mesmo número e chave de acesso.',
  '209': 'A inscrição estadual do emitente foi rejeitada. Confira o cadastro fiscal do emitente.',
  '215': 'O arquivo XML da nota não atende ao padrão oficial exigido pela SEFAZ (falha de schema XML).',
  '225': 'A estrutura do lote da NF-e foi rejeitada pela SEFAZ por falha no schema XML.',
  '232': 'A Inscrição Estadual do destinatário não foi informada. Para cliente contribuinte de ICMS, a IE é obrigatória.',
  '234': 'A Inscrição Estadual informada para o destinatário não confere com o cadastro da SEFAZ na UF de destino.',
  '244': 'A série da nota não foi aceita. Confira a série nas configurações fiscais.',
  '245': 'O CNPJ do emitente não está cadastrado ou ativo na SEFAZ.',
  '382': 'A combinação de CFOP e CST não é permitida para este item.',
  '383': 'O CSOSN informado não é permitido para este item nesta operação.',
  '386': 'A combinação de CFOP e CSOSN não é permitida para este item.',
  '502': 'Erro na formação da chave de acesso da NF-e.',
  '539': 'O número da nota já foi utilizado em outra emissão com chave de acesso diferente.',
  '591': 'O CSOSN informado não é compatível com o regime fiscal do emitente.',
  '600': 'O CSOSN informado não é permitido para esta operação com Não Contribuinte.',
  '696': 'Operação de saída com não contribuinte exige indicação de consumidor final. Revise a finalidade da compra e a situação fiscal do destinatário.',
  '725': 'O CFOP informado não é aceito para esta NFC-e.',
  '777': 'A SEFAZ exige o NCM completo do produto.',
  '778': 'O NCM informado para um dos produtos não existe na tabela aceita pela SEFAZ.',
  '779': 'O NCM informado não é compatível com esta NFC-e.',
  '805': 'A SEFAZ do estado de destino não permite destinatário como Contribuinte Isento de Inscrição Estadual.',
};

export const HML_INTERSTATE_MATRIX_NOT_APPROVED = 'HML_INTERSTATE_MATRIX_NOT_APPROVED';
export const INTERSTATE_RULE_INVALID_COMBINATION = 'INTERSTATE_RULE_INVALID_COMBINATION';
export const INTERSTATE_EXEMPT_IE_NOT_ALLOWED = 'INTERSTATE_EXEMPT_IE_NOT_ALLOWED';
export const INTERSTATE_ST_RULE_NOT_CONFIGURED = 'INTERSTATE_ST_RULE_NOT_CONFIGURED';
export const INTERSTATE_CSOSN_NOT_RESOLVED = 'INTERSTATE_CSOSN_NOT_RESOLVED';
export const INTERSTATE_TAX_PROFILE_INCOMPLETE = 'INTERSTATE_TAX_PROFILE_INCOMPLETE';

export const PREPARATION_ERROR_COPY: Record<string, string> = {
  [HML_INTERSTATE_MATRIX_NOT_APPROVED]:
    'Ainda não existe tratamento fiscal aprovado para esta combinação de operação, UF de destino, destinatário e produtos. Atualizar os dados e tentar novamente não libera a emissão; o tratamento precisa ser revisado e aprovado pelo responsável fiscal.',
  [INTERSTATE_RULE_INVALID_COMBINATION]:
    'A legislação não permite a combinação de destinatário não contribuinte (indIEDest=9) sem indicador de consumidor final (rejeição 696).',
  [INTERSTATE_EXEMPT_IE_NOT_ALLOWED]:
    'A SEFAZ do estado de destino não permite destinatário como contribuinte isento de inscrição estadual (indIEDest=2) em operações interestaduais (rejeição 805).',
  [INTERSTATE_ST_RULE_NOT_CONFIGURED]:
    'Ainda não há regra de Substituição Tributária interestadual parametrizada para este produto entre as UFs de origem e destino.',
  [INTERSTATE_CSOSN_NOT_RESOLVED]:
    'Não foi possível determinar o CSOSN aplicável para esta operação interestadual.',
  [INTERSTATE_TAX_PROFILE_INCOMPLETE]:
    'Faltam dados fiscais obrigatórios para a resolução da regra interestadual.',
};

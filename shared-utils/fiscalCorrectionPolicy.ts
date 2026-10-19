export const ORDER_EDIT_CCE_DISABLED_REASON =
  'O ERP não utiliza CC-e. Para alterar dados fiscais antes da circulação, use cancelamento ou estorno e emita uma nova nota.';

export const FISCAL_CORRECTION_POLICY_NOTICE =
  'Na edição de dados importantes de uma nota fiscal já autorizada, o ERP impede a alteração direta do documento fiscal e não utiliza Carta de Correção Eletrônica (CC-e).';

export const FISCAL_CORRECTION_RULES = {
  NO_CCE:
    'O ERP não utiliza Carta de Correção Eletrônica (CC-e) nem permite edição direta de documentos fiscais autorizados.',
  UNAUTHORIZED:
    'Nota ainda não autorizada: permite corrigir os dados e transmitir normalmente.',
  WITHIN_DEADLINE_NO_CIRCULATION:
    'Nota autorizada, sem circulação da mercadoria e dentro do prazo legal: permite o cancelamento da nota e a emissão de uma nova NF-e com os dados corrigidos.',
  EXPIRED_DEADLINE_NO_CIRCULATION:
    'Nota autorizada com prazo de cancelamento expirado: avaliar a possibilidade de emissão de NF-e de estorno (finalidade 3), exclusivamente quando a operação não tiver ocorrido e os requisitos fiscais forem atendidos. O estorno não é substituto universal da CC-e.',
  GOODS_CIRCULATED_BLOCKED:
    'Mercadoria já entregue ou retirada: não é permitido cancelamento ou estorno como simples mecanismo de correção. Deve-se avaliar devolução fiscal ou outro procedimento legal adequado.',
  IMPORTANT_FIELDS_VALIDATION:
    'Campos fiscais importantes (destinatário, produtos, quantidades, valores, CFOP, NCM, tributação) devem passar por validação prévia antes de qualquer procedimento.',
  TRACEABILITY:
    'A nota original permanece registrada, com XML, protocolo, histórico e vínculo com eventual cancelamento, estorno ou nova emissão.',
  SEFAZ_PR_CONSTRAINTS:
    'Cancelar ou estornar uma NF-e não significa automaticamente que será permitido emitir outra. O procedimento depende da circulação da mercadoria, do prazo legal, do modelo fiscal (55 ou 65) e das regras da SEFAZ do Paraná.',
} as const;

export type BusinessPurposeReply = 'BUSINESS' | 'PERSONAL' | 'PERSONAL_PARTNER';

type PurposeDraft = {
  description?: string | null;
  categoryName?: string | null;
  businessPurpose?: BusinessPurposeReply | 'UNKNOWN' | null;
  missingFields?: string[];
  questionToUser?: string | null;
  questions?: string[];
};

const subjects = [
  /\binternet\b/i,
  /\b(luz|energia|eletricidade)\b/i,
  /\b(água|agua)\b/i,
  /\baluguel\b/i,
  /\b(geladeira|refrigerador)\b/i,
  /\b(televisão|televisao|tv)\b/i,
];

export function inferBusinessPurpose(text: string): BusinessPurposeReply | null {
  const personal = /\b(da minha casa|minha casa|da casa|minha|pessoal|é pessoal|uso pessoal|pra casa|para minha casa|da casa da gerente|gerente|sócio|socio|casa|particular|é particular)\b/i;
  const business = /\b(da loja|do depósito|do deposito|da fábrica|da fabrica|da empresa|do comércio|do comercio|escritório|escritorio|é da loja|para a loja|pra loja|é pra loja|é para a loja|loja|empresa|depósito|deposito|fábrica|fabrica|comércio|comercio|negócio|negocio)\b/i;
  const personalMatches = Array.from(text.matchAll(new RegExp(personal.source, 'gi')));
  const businessMatches = Array.from(text.matchAll(new RegExp(business.source, 'gi')));
  const personalIndex = personalMatches.length ? (personalMatches[personalMatches.length - 1]?.index ?? -1) : -1;
  const businessIndex = businessMatches.length ? (businessMatches[businessMatches.length - 1]?.index ?? -1) : -1;
  if (personalIndex === -1 && businessIndex === -1) return null;
  return personalIndex > businessIndex ? 'PERSONAL' : 'BUSINESS';
}

export function findPurposeDraftTarget(drafts: PurposeDraft[], text: string): number {
  for (const pattern of subjects.filter(subject => subject.test(text))) {
    const index = drafts.findIndex(draft => pattern.test(`${draft.description || ''} ${draft.categoryName || ''}`));
    if (index !== -1) return index;
  }
  return drafts.findIndex(draft =>
    draft.businessPurpose === 'UNKNOWN' ||
    draft.missingFields?.includes('businessPurpose') ||
    draft.questions?.some(question => /businessPurpose|loja|pessoal|casa/i.test(question)) ||
    /loja|pessoal|casa/i.test(draft.questionToUser || '')
  );
}

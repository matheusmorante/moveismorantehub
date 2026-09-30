/** SEFA/PR: módulo 11, pesos 2–7 da direita para a esquerda, dois DVs. */
export function validateParanaIssuerIe(value: unknown): void {
  const supplied = String(value ?? '').trim();
  const ie = supplied.replace(/[.\s-]/g, '');
  const digit = (base: string) => {
    let sum = 0;
    for (let index = base.length - 1, weight = 2; index >= 0; index--, weight = weight === 7 ? 2 : weight + 1)
      sum += Number(base[index]) * weight;
    const result = 11 - sum % 11;
    return String(result >= 10 ? 0 : result);
  };
  if (!/^[\d.\s-]+$/.test(supplied) || !/^\d{10}$/.test(ie) || /^0+$/.test(ie) ||
      ie[8] !== digit(ie.slice(0, 8)) || ie[9] !== digit(ie.slice(0, 9)))
    throw new Error('Inscrição estadual do emitente inválida para o Paraná. Confira o número no cadastro da Receita/PR ou com a contabilidade.');
}

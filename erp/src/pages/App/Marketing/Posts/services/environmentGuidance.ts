type RoomRule = { id: string; match: RegExp; scene: string };
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const rooms: RoomRule[] = [
  { id: 'escritorio', match: /escritorio|escrivaninha|home office|mesa de computador/, scene: 'escritório residencial organizado, com iluminação natural lateral e decoração discreta' },
  { id: 'jantar', match: /jantar|mesa de cozinha|conjunto de mesa/, scene: 'sala de jantar acolhedora, com luminária pendente e circulação livre ao redor da mesa' },
  { id: 'guarda-roupa', match: /guarda.?roupa|roupeiro|closet/, scene: 'quarto aconchegante, com cama e tapete discretos ao fundo, espaço livre diante das portas e espelhos com reflexos coerentes' },
  { id: 'estofados', match: /sofa|poltrona|estofado|chaise|puff/, scene: 'sala de estar acolhedora, com tapete neutro, mesa lateral discreta e espaço de circulação' },
  { id: 'cozinha', match: /cozinha|balcao|aereo|paneleiro/, scene: 'cozinha residencial funcional, com bancada e revestimentos neutros, preservando as proporções de instalação do móvel' },
  { id: 'dormitorio', match: /cama|colchao|cabeceira|comoda|criado|quarto|dormitorio/, scene: 'quarto residencial confortável, com roupa de cama neutra, iluminação suave e decoração sem excesso' },
  { id: 'infantil', match: /berco|infantil|bebe/, scene: 'quarto infantil delicado, com cores suaves, luz natural e decoração apropriada, sem pessoas' },
  { id: 'estar', match: /rack|painel|home theater|sala de estar|living/, scene: 'sala de estar contemporânea, com parede neutra e iluminação indireta, sem esconder o móvel' },
  { id: 'lavanderia', match: /lavanderia|area de servico|multiuso/, scene: 'lavanderia residencial limpa e organizada, com revestimentos claros e acessórios discretos' },
  { id: 'banheiro', match: /banheiro|lavabo|gabinete de pia/, scene: 'banheiro residencial com iluminação suave, revestimentos neutros e escala realista' },
  { id: 'externo', match: /jardim|varanda|extern|gourmet/, scene: 'varanda coberta, com luz natural suave, plantas discretas e espaço de circulação' },
  { id: 'hall', match: /aparador|sapateira|hall/, scene: 'hall residencial acolhedor, com parede neutra e decoração minimalista' },
  { id: 'estante', match: /estante|livreiro|prateleira/, scene: 'sala de leitura organizada, com poucos livros e objetos decorativos, valorizando a estrutura do móvel' },
  { id: 'cadeiras', match: /cadeira|banqueta|banco/, scene: 'ambiente residencial de refeições coerente com a altura e o uso do assento, sem esconder seu desenho' },
];

export function environmentGuidance(category = '', productName = '') {
  const rule = rooms.find(r => r.match.test(normalize(category))) || rooms.find(r => r.match.test(normalize(productName)));
  const scene = rule?.scene || `ambiente residencial adequado à categoria ${category || 'do produto'}, com decoração neutra e uso coerente com o móvel`;
  return {
    key: `${normalize(category) || 'sem-categoria'}/${rule?.id || 'geral'}`,
    category: category || 'Categoria não informada — orientação pelo tipo do produto',
    prompt: `Fotografia publicitária realista em ${scene}.\nPreservar exatamente o móvel da foto: formato, cor, materiais, medidas aparentes, portas e puxadores. Mostrar o produto inteiro, sem cortes, com perspectiva natural e sombras realistas.\nValorizar o produto à esquerda e reservar espaço limpo à direita e na base para os elementos do template. Harmonizar os tons do ambiente com as cores da campanha. Não inserir textos, preços, selos, pessoas ou outros móveis em destaque.`
  };
}

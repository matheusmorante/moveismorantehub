import type {
  WarrantyCompanyInfo,
  WarrantyCoverBadge,
  WarrantySection,
} from './warrantyTypes';

export const WARRANTY_SLOGAN_LINE1 = 'Mais que uma compra,';
export const WARRANTY_SLOGAN_LINE2 = 'uma parceria!';
export const WARRANTY_SLOGAN_FULL = 'Mais que uma compra, é uma parceria!';
export const WARRANTY_SUBTITLE = 'Qualidade, confiança e tranquilidade para você.';

export const DEFAULT_WARRANTY_COMPANY_INFO: WarrantyCompanyInfo = {
  name: 'Móveis Morante Comércio de Móveis Ltda',
  cnpj: '44.512.248.0001/07',
  phone: '(41) 99749-3547',
  telephoneCall: '(41) 99224-4631',
  address: 'R. Cascavel, 306 - Guaraituba, Colombo - PR, 83410-270',
  contactEmail: 'contato@moveismorante.com.br',
  openingHours: 'Seg-Sex: 8h às 18h | Sáb: 8h às 13h',
};

export const WARRANTY_COVER_BADGES: WarrantyCoverBadge[] = [
  {
    id: 'produtos-selecionados',
    titleLine1: 'PRODUTOS',
    titleLine2: 'SELECIONADOS',
    iconType: 'couch',
  },
  {
    id: 'satisfacao-garantida',
    titleLine1: 'SATISFAÇÃO',
    titleLine2: 'GARANTIDA',
    iconType: 'shield',
  },
  {
    id: 'suporte-especializado',
    titleLine1: 'SUPORTE',
    titleLine2: 'ESPECIALIZADO',
    iconType: 'headset',
  },
  {
    id: 'compra-segura',
    titleLine1: 'COMPRA',
    titleLine2: 'SEGURA',
    iconType: 'lock',
  },
];

export const WARRANTY_TOPICS_PAGE_2: WarrantySection[] = [
  {
    number: '1',
    title: 'Objetivo deste Termo e Compromisso de Atendimento (Arts. 6º, III e 50 do CDC)',
    text: 'Em cumprimento aos Arts. 6º, inciso III e 50 da Lei Federal nº 8.078/1990 (Código de Defesa do Consumidor — CDC), este Termo de Garantia padronizado tem como finalidade esclarecer, de forma clara, didática e transparente, as regras de cobertura, os prazos legais, os deveres de conservação e os canais de assistência pós-venda da Móveis Morante. Nosso compromisso é assegurar o pleno respeito aos seus direitos, garantindo segurança jurídica e tranquilidade em sua aquisição.',
  },
  {
    number: '2',
    title: 'Garantia Legal (Art. 26 da Lei Federal nº 8.078/1990 — CDC)',
    paragraphs: [
      {
        subtitle: '• Prazo Legal de 90 Dias para Bens Duráveis (Art. 26, II do CDC):',
        text: 'Tratando-se de produto durável, você tem assegurado o direito à garantia legal de 90 (noventa) dias para reclamar de quaisquer vícios de fabricação ou de montagem. Conforme estipula o Art. 26, § 1º do CDC, a contagem desse prazo inicia-se a partir da data de entrega efetiva do móvel ou da conclusão de sua montagem autorizada.',
      },
      {
        subtitle: '• Tratamento Legal dos Vícios Ocultos (Art. 26, § 3º do CDC):',
        text: 'Caso o móvel apresente falha intrínseca de material ou fabricação não perceptível no ato do recebimento, o Art. 26, § 3º do CDC determina expressamente que o prazo de 90 dias tem início a partir do momento em que o vício for constatado durante o uso regular.',
      },
      {
        subtitle: '• Distinção Legal com Compra Presencial e Arrependimento (Art. 49 do CDC):',
        text: 'O direito de arrependimento imotivado previsto no Art. 49 do CDC aplica-se estritamente a compras realizadas fora do estabelecimento físico (internet ou telefone) em até 7 dias. Para vendas presenciais em loja física, a legislação não prevê desistência imotivada após a entrega perfeita do bem, estando eventuais trocas ou reparos vinculados à existência comprovada de vício de qualidade, na forma do Art. 18 do CDC.',
      },
    ],
  },
  {
    number: '3',
    title: 'O Que a Garantia da Loja Cobre (Arts. 18, 20 e 24 do CDC)',
    text: 'Nos termos dos Arts. 18 (caput) e 24 do CDC, a garantia legal abrange obrigatoriamente todos os vícios de qualidade que tornem o produto impróprio ao uso ou diminuam o seu valor, cobrindo integralmente defeitos comprovados de matéria-prima, estruturas, painéis em MDF/MDP, ferragens, corrediças, dobradiças e puxadores. Abrange igualmente, na forma do Art. 20 do CDC, quaisquer falhas de montagem autorizada, bem como defeitos estruturais e vícios ocultos não informados em produtos da categoria Salvados (Art. 18 do CDC).',
  },
  {
    number: '4',
    title: 'Cuidados Essenciais e Situações Não Cobertas pela Garantia (Arts. 12, § 3º, III e 14, § 3º, II do CDC)',
    alert: {
      title: 'ATENÇÃO PRIMORDIAL — MANUSEIO E MOVIMENTAÇÃO (CULPA EXCLUSIVA DO CONSUMIDOR):',
      text: 'Nos termos dos Arts. 12, § 3º, inciso III e 14, § 3º, inciso II do CDC, o fornecedor não responde por danos decorrentes de culpa exclusiva do consumidor ou de terceiros. Ao mudar o móvel de lugar no ambiente, NUNCA o empurre ou arraste pelo chão. A movimentação da grande maioria dos móveis deve ser feita obrigatoriamente ERGUENDO-O EM 2 OU MAIS PESSOAS. O arrasto provoca torção excessiva na base, empenamentos e quebra dos pés, cantoneiras ou rodapés, além de danificar o piso. Danos causados por arrasto mecânico comprovado constituem mau uso evidente, não sendo cobertos pela garantia legal de fabricação.',
    },
    paragraphs: [
      {
        subtitle: '• Impactos, Quedas e Sobrecarga (Art. 12, § 3º, III do CDC):',
        text: 'Avarias decorrentes de batidas acidentais, excesso de peso além do limite de suporte técnico de gavetas/prateleiras ou subida de pessoas em partes não projetadas para assento.',
      },
      {
        subtitle: '• Umidade Externa e Infiltrações (Art. 12, § 3º, III do CDC):',
        text: 'Lavagem do piso com água diretamente na base do móvel, paredes com mofo ou umidade excessiva, vazamentos hidráulicos ou condensação externa que provoquem estufamento de madeira.',
      },
      {
        subtitle: '• Limpeza Inadequada (Art. 6º, III do CDC):',
        text: 'Uso de álcool puro, solventes, alvejantes, palhas de aço ou químicos abrasivos. Em observância ao dever de informação, a limpeza deve ser feita com pano macio levemente umedecido em água, secando em seguida.',
      },
      {
        subtitle: '• Modificações e Transporte Próprio (Art. 14, § 3º, II do CDC):',
        text: 'Furações não autorizadas, desmontagens, reparos efetuados por terceiros ou danos ocorridos em transporte/frete contratado diretamente pelo cliente sem responsabilidade da loja.',
      },
      {
        subtitle: '• Avarias Pré-Informadas em Salvados (Arts. 6º, III e 31 do CDC):',
        text: 'Avarias e marcas estéticas previamente informadas e aceitas na compra de peças da categoria Salvados não são cobertas pela garantia (regras completas no Tópico 5).',
      },
    ],
  },
];

export const WARRANTY_TOPICS_PAGE_3: WarrantySection[] = [
  {
    number: '5',
    title: 'Produtos de Salvados e Avarias Previamente Informadas (Arts. 6º, III, 18, 26 e 31 do CDC)',
    alert: {
      title: 'REGRA ESPECÍFICA — CATEGORIA SALVADOS E MOSTRUÁRIO (ARTS. 6º, III, 18 E 31 DO CDC):',
      text: 'Produtos comercializados na categoria SALVADOS podem apresentar riscos, arranhões, amassados, pequenas quebras, imperfeições estéticas ou outras avarias, motivo pelo qual são oferecidos com preço reduzido. As avarias e os defeitos claramente informados ao consumidor antes da conclusão da compra (presencialmente ou pela internet) e devidamente descritos no registro da venda são considerados condições conhecidas e aceitas na aquisição do produto.',
    },
    paragraphs: [
      {
        subtitle: '• Exclusão de Cobertura para Avarias Informadas (Art. 18 do CDC):',
        text: 'A garantia não cobre a correção dessas avarias específicas previamente informadas e aceitas, desde que não comprometam a segurança do produto nem contrariem a legislação aplicável.',
      },
      {
        subtitle: '• Vícios Ocultos e Defeitos Não Descritos Sujeitos à Garantia Plena (Arts. 18 e 26 do CDC):',
        text: 'Entretanto, defeitos não informados previamente, defeitos ocultos (vícios ocultos) ou problemas diferentes daqueles descritos na venda continuam integralmente sujeitos à garantia legal de 90 dias e à eventual garantia contratual, conforme o Código de Defesa do Consumidor.',
      },
      {
        subtitle: '• Irrenunciabilidade dos Direitos do Consumidor (Arts. 24 e 51, I do CDC):',
        text: 'A classificação do produto como Salvado e a concessão de desconto não eliminam nem atenuam os direitos legais assegurados ao consumidor.',
      },
    ],
  },
  {
    number: '6',
    title: 'Cuidados Específicos com Móveis em MDF e MDP (Arts. 6º, III e 31 do CDC)',
    text: 'Em estrita atenção ao dever legal de informação ostensiva e preventiva (Arts. 6º, III e 31 do CDC), esclarecemos que painéis em MDF e MDP são fabricados com partículas e fibras de madeira de alta densidade que exigem ambiente arejado. Mantenha um espaçamento mínimo de 5 cm entre o móvel e as paredes para circulação de ar, prevenindo o surgimento de mofo. Evite a exposição solar direta contínua, que pode provocar foto-oxidação e desbotamento dos padrões madeirados, o que não configura vício de fabricação, mas sim desgaste ambiental natural.',
  },
  {
    number: '7',
    title: 'Como Solicitar Assistência Técnica e Suspensão de Prazos (Art. 26, § 2º, I do CDC)',
    text: 'Nos termos do Art. 26, § 2º, inciso I do CDC, a reclamação comprovadamente formulada pelo consumidor perante o fornecedor obsta (suspende) a decadência do prazo de garantia até a resposta conclusiva da loja. Caso observe qualquer inconformidade, acione imediatamente nossa equipe pelo WhatsApp oficial (41) 99749-3547 ou diretamente na loja física, informando o número deste pedido com envio de fotos ou vídeos nítidos do ocorrido para registro imediato e abertura da vistoria técnica.',
  },
  {
    number: '8',
    title: 'Responsabilidade pelos Custos de Coleta, Transporte e Reparo (Arts. 18, 40 e 50 do CDC)',
    text: 'Quando o vício for atribuível a defeito de fabricação ou montagem realizada pela loja, todo o custo de transporte, recolhimento, reparo ou reposição de componentes será de inteira responsabilidade da Móveis Morante, sem qualquer ônus financeiro ao cliente, em respeito ao Art. 18 e Art. 50, parágrafo único do CDC. Em situações em que a vistoria técnica comprovar avaria acidental ou mau uso (culpa exclusiva do consumidor), a loja fornecerá, nos termos do Art. 40 do CDC, orçamento prévio de peças e serviços para aprovação expressa e facultativa do cliente.',
  },
  {
    number: '9',
    title: 'Direitos Assegurados pelo Código de Defesa do Consumidor (Art. 18, § 1º do CDC)',
    text: 'Conforme expressamente assegurado pelo Art. 18, § 1º da Lei nº 8.078/1990 (CDC), a loja dispõe do prazo legal de até 30 (trinta) dias para sanar a falha reclamada. Não sendo o vício sanado nesse prazo, o consumidor tem o direito potestativo de exigir, à sua livre escolha: I — a substituição do produto por outro da mesma espécie em perfeitas condições; II — a restituição imediata da quantia paga, monetariamente atualizada; ou III — o abatimento proporcional do preço.',
  },
];

export const WARRANTY_CONTACT_CARD = {
  headerTitle: 'Canais Oficiais de Atendimento',
  headerBadge: 'Suporte Oficial',
  welcomeText:
    'Nossa equipe está sempre à disposição para orientar, tirar dúvidas e oferecer o melhor suporte para o seu lar. Conte sempre conosco!',
};

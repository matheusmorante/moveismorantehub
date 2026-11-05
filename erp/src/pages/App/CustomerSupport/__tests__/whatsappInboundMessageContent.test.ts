import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractMessageContent } from '@/pages/utils/customerSupport/whatsappWebhookProcessor';

describe('Central de Atendimento WhatsApp — Suíte Completa de Testes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  // 5. Recebimento de texto
  it('5. deve extrair corretamente o corpo de mensagens de texto', () => {
    const textMsg = {
      id: 'wamid.TEXT123',
      type: 'text',
      text: { body: 'Qual é o horário de funcionamento?' },
    };
    const extracted = extractMessageContent(textMsg);
    expect(extracted.type).toBe('text');
    expect(extracted.text).toBe('Qual é o horário de funcionamento?');
  });

  // 6. Recebimento de mídia (imagem, documento, áudio, vídeo)
  it('6. deve extrair metadados e IDs de mídias sem expor URLs privadas', () => {
    const imageMsg = {
      type: 'image',
      image: { id: 'media_img_999', mime_type: 'image/jpeg', caption: 'Comprovante' },
    };
    const docMsg = {
      type: 'document',
      document: { id: 'media_doc_888', mime_type: 'application/pdf', filename: 'contrato.pdf' },
    };
    const audioMsg = {
      type: 'audio',
      audio: { id: 'media_aud_777', mime_type: 'audio/ogg' },
    };
    const videoMsg = {
      type: 'video',
      video: { id: 'media_vid_666', mime_type: 'video/mp4', caption: 'Entrega do produto' },
    };
    const stickerMsg = {
      type: 'sticker',
      sticker: { id: 'media_sticker_555', mime_type: 'image/webp', animated: true },
    };

    const extImg = extractMessageContent(imageMsg);
    expect(extImg.type).toBe('image');
    expect(extImg.mediaId).toBe('media_img_999');
    expect(extImg.text).toBe('Comprovante');

    const extDoc = extractMessageContent(docMsg);
    expect(extDoc.type).toBe('document');
    expect(extDoc.mediaId).toBe('media_doc_888');
    expect(extDoc.mediaFilename).toBe('contrato.pdf');

    const extAud = extractMessageContent(audioMsg);
    expect(extAud.type).toBe('audio');
    expect(extAud.mediaId).toBe('media_aud_777');

    const extVideo = extractMessageContent(videoMsg);
    expect(extVideo).toMatchObject({
      type: 'video',
      text: 'Entrega do produto',
      mediaId: 'media_vid_666',
      mediaMimeType: 'video/mp4',
    });

    const extSticker = extractMessageContent(stickerMsg);
    expect(extSticker).toMatchObject({
      type: 'sticker',
      mediaId: 'media_sticker_555',
      mediaMimeType: 'image/webp',
    });
  });

  it('mostra nome e telefones de cartões de contato compartilhados', () => {
    const extracted = extractMessageContent({
      type: 'contacts',
      contacts: [
        { name: { formatted_name: 'Ana Silva' }, phones: [{ phone: '+55 11 90000-0001' }] },
        { name: { first_name: 'João', last_name: 'Santos' }, phones: [{ wa_id: '5511900000002' }] },
      ],
    });

    expect(extracted).toEqual(expect.objectContaining({
      type: 'contacts',
      text: '👤 Contatos compartilhados:\nAna Silva — +55 11 90000-0001\nJoão Santos — 5511900000002',
    }));
  });

  it('mantém endereço, e-mail, URL e organização dos cartões de contato', () => {
    const extracted = extractMessageContent({
      type: 'contacts',
      contacts: [{
        name: { formatted_name: 'Ana Silva' },
        phones: [{ phone: '+55 11 90000-0001', type: 'CELL' }],
        emails: [{ email: 'ana@example.com', type: 'WORK' }],
        addresses: [{ street: 'Rua A, 10', city: 'São Paulo', state: 'SP', zip: '01000-000', country: 'Brasil', type: 'WORK' }],
        urls: [{ url: 'https://example.com', type: 'WORK' }],
        org: { company: 'Empresa Exemplo', title: 'Gerente' },
      }],
    });

    expect(extracted.text).toContain('CELL: +55 11 90000-0001');
    expect(extracted.text).toContain('E-mail (WORK): ana@example.com');
    expect(extracted.text).toContain('Rua A, 10, São Paulo, SP, 01000-000, Brasil');
    expect(extracted.text).toContain('URL (WORK): https://example.com');
    expect(extracted.text).toContain('Organização: Empresa Exemplo — Gerente');
  });

  it('mantém todos os detalhes úteis da localização recebida', () => {
    const extracted = extractMessageContent({
      type: 'location',
      location: {
        latitude: -23.55,
        longitude: -46.63,
        name: 'Loja Centro',
        address: 'Rua Exemplo, 10',
        url: 'https://maps.example/loja',
      },
    });

    expect(extracted.text).toBe('📍 Loja Centro\n-23.55, -46.63\nRua Exemplo, 10\nLink: https://maps.example/loja');
    expect(extracted.rawPayload?.location).toMatchObject({ latitude: -23.55, longitude: -46.63 });
  });

  it('mantém o rótulo de contato quando o cartão não tem nome nem telefone', () => {
    expect(extractMessageContent({ type: 'contacts', contacts: [{}] }).text).toBe('👤 Contato compartilhado');
  });

  it('exibe reações do WhatsApp e mantém o vínculo com a mensagem reagida', () => {
    expect(extractMessageContent({
      type: 'reaction',
      reaction: { message_id: 'wamid.original', emoji: '❤️' },
    })).toEqual(expect.objectContaining({
      type: 'interactive',
      text: 'Reação ❤️ a uma mensagem',
      replyToWamid: 'wamid.original',
    }));
  });

  it('interpreta respostas de botão e listas com título, descrição e identificador', () => {
    const buttonReply = extractMessageContent({
      type: 'interactive',
      interactive: { type: 'button_reply', button_reply: { id: 'confirm_yes', title: 'Sim' } },
    });
    const listReply = extractMessageContent({
      type: 'interactive',
      interactive: { type: 'list_reply', list_reply: { id: 'item_42', title: 'Produto', description: 'Entrega amanhã' } },
    });

    expect(buttonReply.text).toBe('🔘 Sim\nIdentificador: confirm_yes');
    expect(listReply.text).toBe('🔘 Produto\nEntrega amanhã\nIdentificador: item_42');

    const legacyButton = extractMessageContent({
      type: 'button',
      button: { text: 'Acessar cardápio', payload: 'menu_123' },
    });
    expect(legacyButton.text).toBe('🔘 Acessar cardápio\nIdentificador: menu_123');
  });

  it('preserva o aviso de mensagem encaminhada e encaminhada muitas vezes em qualquer formato', () => {
    expect(extractMessageContent({
      type: 'image',
      image: { id: 'media-forwarded', mime_type: 'image/jpeg' },
      context: { forwarded: true },
    })).toMatchObject({
      type: 'image',
      rawPayload: { provider_message_type: 'image', forwarded: true },
    });

    expect(extractMessageContent({
      type: 'text',
      text: { body: 'Confira esta informação' },
      context: { frequently_forwarded: true },
    })).toMatchObject({
      type: 'text',
      rawPayload: { provider_message_type: 'text', frequently_forwarded: true },
    });
  });

  it('preserva avisos de sistema e pedidos para iniciar conversa', () => {
    expect(extractMessageContent({ type: 'system', system: { type: 'customer_changed_number' } }).text)
      .toBe('Aviso do WhatsApp: customer changed number');
    expect(extractMessageContent({ type: 'request_welcome' })).toEqual(expect.objectContaining({
      type: 'interactive',
      text: '👋 Cliente solicitou iniciar o atendimento',
    }));
  });

  it('exibe respostas do WhatsApp Flow sem persistir ou expor flow_token', () => {
    const extracted = extractMessageContent({
      type: 'interactive',
      interactive: {
        type: 'nfm_reply',
        nfm_reply: {
          name: 'customer_survey',
          response_json: JSON.stringify({
            flow_token: 'private-flow-token',
            customer_name: 'Ana',
            answers: ['Bom', 'Rápido'],
            nested: { flow_token: 'nested-private-token', comment: 'Ótimo' },
          }),
        },
      },
    });

    expect(extracted.text).toContain('Fluxo: customer_survey');
    expect(extracted.text).toContain('customer name: Ana');
    expect(extracted.text).toContain('answers: Bom, Rápido');
    expect(JSON.stringify(extracted.rawPayload)).not.toContain('private-flow-token');
    expect(JSON.stringify(extracted.rawPayload)).not.toContain('nested-private-token');
  });

  it('normaliza template com imagem, corpo, rodapé e ações sem guardar payloads internos dos botões', () => {
    const extracted = extractMessageContent({
      type: 'template',
      template: {
        name: 'atualizacao_almoco',
        components: [
          { type: 'header', format: 'IMAGE', parameters: [{ type: 'image', image: { id: 'template-image', mime_type: 'image/jpeg' } }] },
          { type: 'body', text: 'ATUALIZAÇÃO DO ALMOÇO\n{{1}}', parameters: [{ type: 'text', text: 'Arroz, feijão e salada' }] },
          { type: 'footer', text: 'Consulte o cardápio de hoje.' },
          { type: 'buttons', buttons: [
            { type: 'URL', text: 'Acessar Cardápio', url: 'https://example.com/cardapio' },
            { type: 'QUICK_REPLY', text: 'Desativar mensagens', payload: 'private-opt-out-payload' },
          ] },
        ],
      },
    });

    expect(extracted).toMatchObject({
      type: 'template',
      text: 'Modelo: atualizacao_almoco\n\nATUALIZAÇÃO DO ALMOÇO\nArroz, feijão e salada\n\nConsulte o cardápio de hoje.',
      mediaId: 'template-image',
      mediaMimeType: 'image/jpeg',
      rawPayload: {
        provider_message_type: 'template',
        template_preview: {
          name: 'atualizacao_almoco',
          header: { type: 'image' },
          body: 'ATUALIZAÇÃO DO ALMOÇO\nArroz, feijão e salada',
          footer: 'Consulte o cardápio de hoje.',
          buttons: [
            { type: 'url', text: 'Acessar Cardápio', url: 'https://example.com/cardapio' },
            { type: 'quick_reply', text: 'Desativar mensagens' },
          ],
        },
      },
    });
    expect(JSON.stringify(extracted.rawPayload)).not.toContain('private-opt-out-payload');
  });

  it('inclui contexto de produto e origem de anúncios no texto recebido', () => {
    const extracted = extractMessageContent({
      type: 'text',
      text: { body: 'Tenho interesse' },
      context: { referred_product: { catalog_id: 'catalog-1', product_retailer_id: 'SKU-42' } },
      referral: {
        headline: 'Oferta',
        body: 'Fale conosco',
        source_type: 'ad',
        source_id: 'ad-42',
        source_url: 'https://example.com/ad',
      },
    });

    expect(extracted.text).toContain('Tenho interesse');
    expect(extracted.text).toContain('Produto consultado: SKU-42 (catálogo catalog-1)');
    expect(extracted.text).toContain('Origem: ad');
    expect(extracted.text).toContain('Referência: ad-42');
    expect(extracted.text).toContain('Link de origem: https://example.com/ad');
    expect(extracted.rawPayload?.referral).toMatchObject({ source_id: 'ad-42' });
  });

  it('preserva contexto de anúncio e aviso de segurança junto a mídia sem guardar o hash de identidade', () => {
    const extracted = extractMessageContent({
      type: 'image',
      image: { id: 'media-ad-image', mime_type: 'image/jpeg' },
      context: {
        referred_product: { catalog_id: 'catalog-1', product_retailer_id: 'SKU-42' },
      },
      referral: { headline: 'Oferta', source_type: 'ad', source_id: 'ad-42', image_url: 'https://example.com/ad.jpg' },
      identity: { acknowledged: true, created_timestamp: 1_603_232_300_000, hash: 'identity-private-hash' },
    });

    expect(extracted).toMatchObject({
      type: 'image',
      rawPayload: {
        referred_product: { catalog_id: 'catalog-1', product_retailer_id: 'SKU-42' },
        referral: { headline: 'Oferta', source_id: 'ad-42' },
        identity: { acknowledged: true, created_timestamp: 1_603_232_300_000 },
      },
    });
    expect(JSON.stringify(extracted.rawPayload)).not.toContain('identity-private-hash');
  });

  it('resume pedidos recebidos pelo catálogo com produto, quantidade e preço', () => {
    const extracted = extractMessageContent({
      type: 'order',
      order: {
        catalog_id: 'catalog-1',
        product_items: [{
          product_retailer_id: 'SKU-GUARDA-ROUPA',
          quantity: '2',
          item_price: '1299.00',
          currency: 'BRL',
        }],
        text: 'Pode entregar amanhã?',
      },
    });

    expect(extracted.type).toBe('interactive');
    expect(extracted.text).toContain('Pedido recebido pelo catálogo');
    expect(extracted.text).toContain('Catálogo: catalog-1');
    expect(extracted.text).toContain('2 × SKU-GUARDA-ROUPA');
    expect(extracted.text).toContain('R$ 1.299,00 cada');
    expect(extracted.text).toContain('Pode entregar amanhã?');
  });

  it('mostra o código e o motivo quando a Meta marca a mensagem como unsupported', () => {
    expect(extractMessageContent({
      type: 'unsupported',
      errors: [{ code: 131051, details: 'Message type is not currently supported' }],
    })).toEqual(expect.objectContaining({
      type: 'unsupported',
      text: expect.stringContaining('código 131051'),
    }));
    expect(extractMessageContent({
      type: 'unsupported',
      errors: [{ code: 131051, details: 'Message type is not currently supported' }],
    }).text).toContain('A API do WhatsApp informou que este tipo de mensagem não é suportado.');
    expect(extractMessageContent({
      type: 'unknown',
      errors: [{ code: 131051, title: 'Unsupported message type', details: 'Message type is not currently supported' }],
    })).toEqual(expect.objectContaining({
      type: 'unsupported',
      errorCode: '131051',
      text: expect.stringContaining('código 131051'),
    }));
  });

  it('identifica tipos futuros sem expor payload bruto', () => {
    const extracted = extractMessageContent({ type: 'future_message_type' });
    expect(extracted.type).toBe('unsupported');
    expect(extracted.text).toContain('future_message_type');
    expect(extracted.text).not.toContain('[object Object]');
  });

});

/**
 * Módulo de utilitários e serviços de integração com o WhatsApp.
 * Centraliza e reexporta as operações de mensageria, geração de links (wa.me),
 * sanitização de variáveis para modelos e envio direto via WhatsApp Cloud API (Connect on WhatsApp).
 */

export { isSamePhoneNumber } from './textUtils';

// URLs e links manuais para WhatsApp Web / App (wa.me)
export * from './whatsapp/whatsappUrls';

// Parâmetros e sanitização para modelos de mensagem Meta Cloud API
export * from './whatsapp/metaOrderParams';

// Disparo direto exclusivo via Meta WhatsApp Cloud API (Connect on WhatsApp)
export * from './whatsapp/metaDirectSend';

// Despacho seguro com fallback web/app para rotinas operacionais
export * from './whatsapp/safeSender';

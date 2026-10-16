import {
  metaHttpClient,
  GRAPH_API_VERSION,
  FACEBOOK_GRAPH_URL,
} from './metaService/metaHttpClient';

export { GRAPH_API_VERSION, FACEBOOK_GRAPH_URL };

/**
 * Cliente HTTP legado mantido para compatibilidade regressiva.
 * Delega diretamente para `metaHttpClient`.
 */
export const whatsappHttpClient = metaHttpClient;

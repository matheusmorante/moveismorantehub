export interface WhatsAppProduct {
  id: string;
  retailer_id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  image_url: string;
  url?: string;
  visibility?: string;
  is_hidden?: boolean;
}

export interface MetaProductSet {
  id: string;
  name: string;
  filter: string;
}

export interface MetaBatchSyncResult {
  success: boolean;
  count: number;
  handles?: string[];
}

export interface MetaMessageTemplate {
  name: string;
  status: string;
  language: string;
  category: string;
  components?: any[];
  id?: string;
}

export interface MetaSendResponse {
  messaging_product: string;
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string; message_status?: string }>;
  error?: MetaErrorPayload;
}

export interface MetaErrorPayload {
  message: string;
  type?: string;
  code: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  fbtrace_id?: string;
  error_data?: {
    messaging_product?: string;
    details?: string;
  };
}

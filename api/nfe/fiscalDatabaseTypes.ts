import type { FiscalTables } from './fiscalDatabaseTables';

export type FiscalDatabase = {
  public: {
    Tables: FiscalTables;
    Views: Record<string, never>;
    Functions: {
      is_order_edit_reversal_confirmed: {
        Args: { p_original_document_id: string };
        Returns: boolean;
      };
      finalize_fiscal_order_edit: {
        Args: { p_replacement_id: string };
        Returns: Record<string, unknown>;
      };
      prepare_nfe_operation_attempt: {
        Args: {
          p_draft_id: string;
          p_expected_updated_at: string;
          p_expected_review_data: Record<string, unknown>;
          p_expected_lines: Record<string, unknown>[];
          p_signed_xml: string;
          p_access_key: string;
          p_minimum_number: number;
        };
        Returns: {
          created: boolean;
          draftId: string;
          status: string;
          accessKey: string | null;
          documentId?: string | null;
          number?: number;
          updatedAt?: string;
        };
      };
      peek_nfe_outbound_number: {
        Args: {
          p_issuer_cnpj: string;
          p_model: string;
          p_environment: number;
          p_series: string;
          p_minimum: number;
        };
        Returns: number;
      };
      prepare_nfe_outbound_attempt: {
        Args: {
          p_snapshot: Record<string, unknown>;
          p_signed_xml: string;
          p_access_key: string;
          p_request_command: Record<string, unknown>;
          p_attempt_token: string;
          p_actor_id: string;
          p_minimum_number: number;
        };
        Returns: {
          documentId: string;
          snapshotId: string;
          snapshotHash?: string;
          created: boolean;
        };
      };
      claim_nfe_outbound_attempt: {
        Args: { p_document_id: string; p_attempt_token: string };
        Returns: boolean;
      };
      release_nfe_outbound_attempt: {
        Args: { p_document_id: string; p_attempt_token: string };
        Returns: undefined;
      };
      start_nfe_outbound_transmission: {
        Args: { p_document_id: string; p_attempt_token: string };
        Returns: undefined;
      };
      persist_nfe_outbound_result: {
        Args: {
          p_document_id: string;
          p_attempt_token: string;
          p_state: string;
          p_reason: string;
          p_response_xml: string;
          p_protocol: string | null;
          p_items: Record<string, unknown>[];
        };
        Returns: undefined;
      };
      prepare_nfe_operation_draft: {
        Args: {
          p_kind: string;
          p_original_document_id: string;
          p_return_order_id: string | null;
          p_environment: number;
          p_reason: string | null;
          p_user_id: string;
        };
        Returns: string;
      };
      persist_authorized_nfe_operation_draft: {
        Args: {
          p_draft_id: string;
          p_document_id: string;
          p_number: number;
          p_series: string;
          p_access_key: string;
          p_signed_xml: string;
          p_sefaz_response_xml: string;
          p_protocol_number: string;
          p_protocol_date: string | null;
          p_status: 'autorizada' | 'homologada';
          p_status_reason: string;
          p_items: Array<{
            draft_line_id: string;
            item_number: number;
            product_code: string;
            description: string;
            quantity: number;
            unit_value: number;
            gross_value: number;
            discount_value: number;
            product_xml: string;
            taxes_xml: string;
          }>;
        };
        Returns: string;
      };
      save_nfe_operation_draft_review: {
        Args: {
          p_draft_id: string;
          p_review_data: Record<string, unknown>;
          p_lines: Array<{
            draft_line_id: string;
            cfop: string;
            product_xml: string;
            taxes_xml: string;
          }>;
          p_user_id: string;
        };
        Returns: string;
      };
      reserve_next_nfe_number: {
        Args: {
          p_modelo: string;
          p_serie: string;
          p_ambiente: number;
          p_numero_minimo: number;
        };
        Returns: number;
      };
      prepare_nfe_fiscal_snapshot: {
        Args: {
          p_item_csosn_overrides?: Record<string, string>;
          p_item_fiscal_selections?: import('../../shared-utils/fiscalItemSelections').FiscalItemSelections;
          p_order_id: string;
          p_emission_request_id: string;
          p_modelo: string;
          p_ambiente: number;
          p_serie: string;
          p_numero_minimo: number;
        };
        Returns: Record<string, unknown>;
      };
      prepare_nfe_fiscal_snapshot_with_recipient: {
        Args: {
          p_item_csosn_overrides?: Record<string, string>;
          p_item_fiscal_selections?: import('../../shared-utils/fiscalItemSelections').FiscalItemSelections;
          p_order_id: string;
          p_emission_request_id: string;
          p_modelo: string;
          p_ambiente: number;
          p_serie: string;
          p_numero_minimo: number;
          p_recipient_cpf: string;
        };
        Returns: Record<string, unknown>;
      };
      prepare_nfe_fiscal_snapshot_with_context: {
        Args: FiscalDatabase['public']['Functions']['prepare_nfe_fiscal_snapshot']['Args'] & {
          p_recipient_tax_id: string;
          p_final_consumer: boolean;
          p_delivery_by_issuer: boolean;
          p_card_not_integrated: boolean;
          p_model_decision: unknown;
        };
        Returns: Record<string, unknown>;
      };
      prepare_numbered_nfe_fiscal_snapshot_with_context: {
        Args: FiscalDatabase['public']['Functions']['prepare_numbered_nfe_fiscal_snapshot']['Args'] & {
          p_recipient_tax_id: string;
          p_final_consumer: boolean;
          p_delivery_by_issuer: boolean;
          p_card_not_integrated: boolean;
          p_model_decision: unknown;
        };
        Returns: Record<string, unknown>;
      };
      prepare_numbered_nfe_fiscal_snapshot: {
        Args: {
          p_emission_request_id: string;
          p_item_csosn_overrides: Record<string, string>;
          p_item_fiscal_selections: import('../../shared-utils/fiscalItemSelections').FiscalItemSelections;
          p_modelo: string;
          p_ambiente: number;
          p_numero_minimo: number;
          p_order_id: string;
          p_serie: string;
          p_requested_number: number;
        };
        Returns: Record<string, unknown>;
      };
      reserve_nfe_outbound_emission: {
        Args: {
          p_order_id: string;
          p_modelo: string;
          p_ambiente: number;
          p_emission_request_id: string;
          p_chave_acesso: string;
          p_xml_nfe: string;
          p_numero_nfe: number;
          p_serie: string;
        };
        Returns: string;
      };
      reserve_hml_nfe_outbound: {
        Args: {
          p_attempt_token: string;
          p_order_id: string;
          p_emission_request_id: string;
          p_access_key: string;
          p_signed_xml: string;
          p_number: number;
          p_series: string;
          p_decision_trace: Record<string, unknown>[];
        };
        Returns: string;
      };
      reserve_hml_nfe_outbound_with_replacement: {
        Args: {
          p_attempt_token: string;
          p_order_id: string;
          p_emission_request_id: string;
          p_access_key: string;
          p_signed_xml: string;
          p_number: number;
          p_series: string;
          p_decision_trace: Record<string, unknown>[];
          p_supersedes_document_id: string | null;
        };
        Returns: string;
      };
      abandon_untransmitted_hml_attempt: {
        Args: {
          p_document_id: string;
          p_order_id: string;
          p_emission_request_id: string;
          p_actor_id: string;
        };
        Returns: Record<string, unknown>;
      };
      persist_hml_nfe_result: {
        Args: {
          p_attempt_token: string;
          p_document_id: string;
          p_status: string;
          p_reason: string;
          p_response_xml: string;
          p_protocol: string | null;
          p_items: Record<string, unknown>[];
        };
        Returns: undefined;
      };
      reactivate_hml_nfe_retry: {
        Args: { p_document_id: string; p_attempt_token: string };
        Returns: undefined;
      };
      claim_hml_nfe_attempt: {
        Args: { p_document_id: string; p_attempt_token: string };
        Returns: boolean;
      };
      release_hml_nfe_attempt: {
        Args: { p_document_id: string; p_attempt_token: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
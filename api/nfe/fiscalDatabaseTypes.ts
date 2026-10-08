import type { FiscalSnapshot } from './fiscalSnapshot';

/** Narrow database contract for the fiscal API; replace with generated Supabase types when available. */
type FiscalTable<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

export type FiscalDatabase = {
  public: {
    Tables: {
      orders: FiscalTable<{
        id: string;
        order_type: string;
        status: string;
        deleted: boolean;
        items: unknown;
        order_data: Record<string, unknown> | null;
        order_index: number | null;
        linked_order_id: string | null;
        version: number;
        updated_at: string;
        delivery_status: string | null;
        delivery_started_at: string | null;
        delivery_arrived_at: string | null;
        delivery_finished_at: string | null;
        delivery_method: string | null;
      }>;
      settings: FiscalTable<{
        id: string;
        data: Record<string, unknown> | null;
      }>;
      products: FiscalTable<{ id: string; fiscal: Record<string, unknown> | null }>;
      people: FiscalTable<{
        id: string;
        full_name: string;
        cpf_cnpj: string | null;
        address: string | null;
        rg_ie: string | null;
        person_type_pf_pj: string | null;
        deleted: boolean;
      }>;
      ncms: FiscalTable<{
        code: string;
        active: boolean;
        is_active: boolean;
        start_date: string | null;
        end_date: string | null;
      }>;
      profiles: FiscalTable<{ id: string; role: string | null; roles: string[] | null }>;
      nfe_documents: FiscalTable<
        {
          id: string;
          issuer_cnpj: string | null;
          order_id: string;
          numero_nfe: number;
          serie: string;
          chave_acesso: string;
          modelo: string;
          ambiente: number;
          status: string;
          motivo_status: string | null;
          xml_nfe: string | null;
          xml_protocolo: string | null;
          numero_protocolo: string | null;
          document_type: string;
          original_document_id: string | null;
          related_return_order_id: string | null;
          finalidade: number;
          emission_request_id: string | null;
          fiscal_snapshot_id: string | null;
          fiscal_ruleset_version: string | null;
          fiscal_decision_trace: Record<string, unknown>[] | null;
          hml_attempt_token: string | null;
          hml_attempt_expires_at: string | null;
          hml_response_history: Record<string, unknown>[];
          supersedes_document_id: string | null;
          hml_correction_of_document_id?: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          order_id: string;
          numero_nfe: number;
          serie: string;
          chave_acesso: string;
          modelo: string;
          ambiente: number;
          status: string;
          document_type: string;
          finalidade: number;
          emission_request_id: string;
          motivo_status: string;
          xml_nfe: string;
          created_at: string;
          updated_at: string;
        }
      >;
      nfe_fiscal_snapshots: FiscalTable<{
        id: string;
        issuer_cnpj: string | null;
        emission_request_id: string;
        order_id: string;
        order_version: number;
        order_updated_at: string;
        requested_model: string;
        environment: number;
        series: string;
        reserved_number: number;
        snapshot_data: FiscalSnapshot;
        snapshot_sha256: string;
        captured_at: string;
      }>;
      nfe_document_items: FiscalTable<{
        id: string;
        document_id: string;
        item_number: number;
        product_code: string;
        description: string;
        billed_quantity: number;
        unit_value: number;
        gross_value: number;
        discount_value: number;
        product_xml: string;
        taxes_xml: string;
      }>;
      nfe_outbound_attempts: FiscalTable<{
        id: string;
        emission_request_id: string;
        order_id: string;
        document_id: string;
        snapshot_id: string;
        issuer_cnpj: string;
        model: '55' | '65';
        environment: 1 | 2;
        series: string;
        number: number;
        access_key: string;
        request_command: Record<string, unknown>;
        request_fingerprint: string;
        xml_sha256: string;
        state:
          | 'prepared'
          | 'transmitting'
          | 'reconciling'
          | 'authorized'
          | 'rejected'
          | 'confirmed_not_found';
        actor_id: string | null;
        attempt_token: string | null;
        attempt_expires_at: string | null;
        transmission_started_at: string | null;
        response_history: Record<string, unknown>[];
        created_at: string;
        updated_at: string;
      }>;
      nfe_return_item_allocations: FiscalTable<{
        id: string;
        return_order_id: string;
        return_item_index: number;
        original_document_id: string;
        original_item_number: number;
        quantity: number;
        fiscal_return_document_id: string | null;
        created_at: string;
      }>;
      nfe_operation_drafts: FiscalTable<{
        id: string;
        operation_kind: 'estorno' | 'return';
        original_document_id: string;
        original_access_key: string;
        return_order_id: string | null;
        environment: number;
        finalidade: number;
        status: string;
        reason: string | null;
        nature_of_operation: string | null;
        review_data: Record<string, unknown>;
        generated_xml: string | null;
        signed_xml: string | null;
        sefaz_response_xml: string | null;
        protocol_number: string | null;
        access_key: string | null;
        document_id: string | null;
        created_by: string | null;
        reviewed_by: string | null;
        reviewed_at: string | null;
        transmitted_at: string | null;
        authorized_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      nfe_operation_draft_lines: FiscalTable<{
        id: string;
        draft_id: string;
        original_document_item_id: string;
        fiscal_item_number: number;
        quantity: number;
        gross_value: number;
        discount_value: number;
        reviewed_cfop: string | null;
        reviewed_product_xml: string | null;
        reviewed_taxes_xml: string | null;
      }>;
      nfe_operation_draft_allocations: FiscalTable<{
        id: string;
        draft_line_id: string;
        allocation_id: string;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
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

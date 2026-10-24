BEGIN;

CREATE TABLE public.sefaz_inbound_xml_consult_attempts (
  access_key varchar(44) NOT NULL CHECK (access_key ~ '^[0-9]{44}$'),
  environment smallint NOT NULL CHECK (environment IN (1, 2)),
  result varchar(20) NOT NULL CHECK (result IN ('full_received', 'summary', 'no_document')),
  consulted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (access_key, environment)
);

ALTER TABLE public.sefaz_inbound_xml_consult_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sefaz_inbound_xml_consult_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.sefaz_inbound_xml_consult_attempts TO service_role;

COMMENT ON TABLE public.sefaz_inbound_xml_consult_attempts IS
  'Marca consultas consChNFe automáticas já concluídas sem XML completo, para evitar repetir a mesma chave e permitir avançar a fila.';

COMMIT;

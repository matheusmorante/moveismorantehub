BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- Keep the manual switch independent from edits to the rest of the settings.
-- The function is only installed here; this migration does not change the agent state.
CREATE OR REPLACE FUNCTION public.update_whatsapp_ai_agent_settings(
  p_expected_enabled boolean DEFAULT NULL,
  p_enabled boolean DEFAULT NULL,
  p_configuration jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_settings jsonb;
  v_agent jsonb;
  v_enabled boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_administrator() THEN
    RAISE EXCEPTION 'Somente administradores podem alterar o agente' USING ERRCODE = '42501';
  END IF;

  IF (p_enabled IS NULL) = (p_configuration IS NULL)
     OR (p_enabled IS NOT NULL AND p_expected_enabled IS NULL)
     OR (p_configuration IS NOT NULL AND jsonb_typeof(p_configuration) <> 'object') THEN
    RAISE EXCEPTION 'Solicitação inválida' USING ERRCODE = '22023';
  END IF;

  SELECT data INTO v_settings FROM public.settings WHERE id = 'app' FOR UPDATE;
  IF NOT FOUND OR jsonb_typeof(v_settings) <> 'object' THEN
    RAISE EXCEPTION 'Configurações indisponíveis' USING ERRCODE = 'P0001';
  END IF;

  v_agent := v_settings -> 'whatsappAiAgent';
  IF v_agent IS NULL THEN
    v_agent := '{}'::jsonb;
  ELSIF jsonb_typeof(v_agent) <> 'object' THEN
    RAISE EXCEPTION 'Configuração do agente inválida' USING ERRCODE = 'P0001';
  END IF;

  IF v_agent ? 'enabled' AND jsonb_typeof(v_agent -> 'enabled') <> 'boolean' THEN
    RAISE EXCEPTION 'Estado do agente inválido' USING ERRCODE = 'P0001';
  END IF;
  v_enabled := COALESCE((v_agent ->> 'enabled')::boolean, false);

  IF p_enabled IS NOT NULL THEN
    IF v_enabled IS DISTINCT FROM p_expected_enabled THEN
      RETURN jsonb_build_object('confirmed', false, 'agent', v_agent || jsonb_build_object('enabled', v_enabled));
    END IF;
    v_agent := v_agent || jsonb_build_object('enabled', p_enabled);
  ELSE
    -- Editing instructions, tools or test numbers can never toggle the agent.
    v_agent := v_agent || (p_configuration - 'enabled') || jsonb_build_object('enabled', v_enabled, 'testMode', true);
  END IF;

  UPDATE public.settings
    SET data = jsonb_set(v_settings, '{whatsappAiAgent}', v_agent, true)
    WHERE id = 'app';
  RETURN jsonb_build_object('confirmed', true, 'agent', v_agent);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.update_whatsapp_ai_agent_settings(boolean, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_whatsapp_ai_agent_settings(boolean, boolean, jsonb) TO authenticated;

COMMIT;

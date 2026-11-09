import { supabase } from '../supabaseClient';
import { mobileAgentTools } from './mobileAgentTools';
import {
  FunctionCallDeclaration,
  FunctionResponseDeclaration,
  ExecutedToolRecord,
  ToolExecutionResponse,
} from './mobileAgentTypes';
import {
  AgentPermissionContext,
  checkAgentToolPermission,
  getActiveAgentPermissionContext,
  resolveRuntimeAgentPermissionContext,
  setActiveAgentPermissionContext,
} from '../../../../shared-utils/agentPermissionGuard';

// Despachante seguro e isolado de chamadas de ferramentas no Mobile com verificação de perfil de acesso

export class MobileToolDispatcher {
  public static async execute(
    call: FunctionCallDeclaration,
    permissionContext?: AgentPermissionContext | null
  ): Promise<{
    functionResponse: FunctionResponseDeclaration;
    record: ExecutedToolRecord;
  }> {
    const { name, args } = call;
    let result: ToolExecutionResponse;
    const previousContext = getActiveAgentPermissionContext();

    try {
      const toolFn = (mobileAgentTools as Record<string, any>)[name];
      if (typeof toolFn === 'function') {
        const effectivePermission = await resolveRuntimeAgentPermissionContext(
          supabase,
          permissionContext
        );
        setActiveAgentPermissionContext(effectivePermission);
        const permCheck = checkAgentToolPermission(name, args || {}, effectivePermission);
        if (!permCheck.allowed) {
          result = {
            success: false,
            code: 'PERMISSION_DENIED',
            error:
              permCheck.error ||
              `Seu perfil de acesso não possui permissão para executar "${name}".`,
          };
        } else {
          result = await toolFn(args || {});
        }
      } else {
        result = {
          success: false,
          code: 'TOOL_NOT_FOUND',
          error: `A ferramenta "${name}" nao existe ou nao esta implementada no App Mobile.`,
        };
      }
    } catch (err: any) {
      result = {
        success: false,
        code: 'EXECUTION_ERROR',
        error: err?.message || `Erro inesperado ao executar a ferramenta "${name}".`,
      };
    } finally {
      setActiveAgentPermissionContext(previousContext);
    }

    const record: ExecutedToolRecord = {
      name,
      args: args || {},
      result,
      timestamp: new Date().toISOString(),
    };

    const functionResponse: FunctionResponseDeclaration = {
      name,
      response: {
        name,
        content: result,
      },
    };

    return { functionResponse, record };
  }
}

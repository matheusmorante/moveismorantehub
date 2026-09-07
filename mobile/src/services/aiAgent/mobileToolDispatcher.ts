import { mobileAgentTools } from './mobileAgentTools';
import {
  FunctionCallDeclaration,
  FunctionResponseDeclaration,
  ExecutedToolRecord,
  ToolExecutionResponse,
} from './mobileAgentTypes';

// Despachante seguro e isolado de chamadas de ferramentas no Mobile

export class MobileToolDispatcher {
  public static async execute(call: FunctionCallDeclaration): Promise<{
    functionResponse: FunctionResponseDeclaration;
    record: ExecutedToolRecord;
  }> {
    const { name, args } = call;
    let result: ToolExecutionResponse;

    try {
      const toolFn = (mobileAgentTools as Record<string, any>)[name];
      if (typeof toolFn === 'function') {
        result = await toolFn(args || {});
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

export interface FunctionCallDeclaration {
  name: string;
  args: Record<string, any>;
}

export interface FunctionResponseDeclaration {
  name: string;
  response: {
    name: string;
    content: any;
  };
}

export interface GeminiPart {
  text?: string;
  functionCall?: FunctionCallDeclaration;
  functionResponse?: FunctionResponseDeclaration;
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface ExecutedToolRecord {
  name: string;
  args: Record<string, any>;
  result: any;
  timestamp: string;
}

export interface AgentExecutionResult {
  answer: string;
  executedTools: ExecutedToolRecord[];
}

export interface ToolExecutionResponse {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
  message?: string;
}

// Tipagens oficiais do Gemini v1beta e do Agente Conversacional do ERP

export type GeminiRole = 'user' | 'model';

export type GeminiSchemaType = 'OBJECT' | 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN' | 'ARRAY';

export interface GeminiSchema {
  type: GeminiSchemaType;
  description?: string;
  properties?: Record<string, GeminiSchema>;
  required?: string[];
  enum?: string[];
  items?: GeminiSchema;
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: GeminiSchema;
}

export interface GeminiTool {
  functionDeclarations: GeminiFunctionDeclaration[];
}

export interface GeminiFunctionCall {
  name: string;
  args: Record<string, any>;
}

export interface GeminiFunctionResponse {
  name: string;
  response: Record<string, any>;
}

export interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: GeminiFunctionResponse;
}

export interface GeminiContent {
  role: GeminiRole;
  parts: GeminiPart[];
}

export interface GeminiToolConfig {
  functionCallingConfig?: {
    mode?: 'AUTO' | 'ANY' | 'NONE';
    allowedFunctionNames?: string[];
  };
}

export interface ExecutedToolRecord {
  name: string;
  label: string;
  args: Record<string, any>;
  result: Record<string, any>;
  success: boolean;
  error?: string;
}

export interface AgentExecutionResult {
  answer: string;
  executedTools: ExecutedToolRecord[];
  error?: string;
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  executedTools?: ExecutedToolRecord[];
  isAction?: boolean;
}

export interface AgentPageContext {
  currentModule: string;
  currentPage?: string;
  currentPath?: string;
  title?: string;
}


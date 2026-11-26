type LegacySchema = {
  type?: string;
  description?: string;
  properties?: Record<string, LegacySchema>;
  required?: string[];
  enum?: string[];
  items?: LegacySchema;
};

const schemaTypes: Record<string, string> = {
  OBJECT: 'object',
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
};

function toJsonSchema(schema: LegacySchema): Record<string, unknown> {
  const type = schemaTypes[String(schema.type || '').toUpperCase()] || 'object';
  return {
    type,
    ...(schema.description ? { description: schema.description } : {}),
    ...(schema.enum ? { enum: schema.enum } : {}),
    ...(schema.properties
      ? { properties: Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, toJsonSchema(value)])) }
      : {}),
    ...(schema.required ? { required: schema.required } : {}),
    ...(schema.items ? { items: toJsonSchema(schema.items) } : {}),
  };
}

function toOpenAiTools(tools: any[] = []): Array<Record<string, unknown>> {
  return tools.flatMap((tool) =>
    (tool?.functionDeclarations || []).map((declaration: any) => ({
      type: 'function',
      name: declaration.name,
      description: declaration.description,
      parameters: toJsonSchema(declaration.parameters || { type: 'OBJECT' }),
    }))
  );
}

export function buildOpenAiAgentRequest(payload: any) {
  const input: Array<Record<string, unknown>> = [];
  const pendingCallIds = new Map<string, string[]>();
  let callIndex = 0;

  for (const content of payload?.contents || []) {
    const role = content?.role === 'model' || content?.role === 'assistant' ? 'assistant' : 'user';
    const textParts: string[] = [];
    const functionItems: Array<Record<string, unknown>> = [];

    for (const part of content?.parts || []) {
      if (typeof part?.text === 'string' && part.text) textParts.push(part.text);
      if (part?.functionCall?.name) {
        const name = part.functionCall.name;
        const callId = `history_call_${++callIndex}`;
        const queue = pendingCallIds.get(name) || [];
        queue.push(callId);
        pendingCallIds.set(name, queue);
        functionItems.push({
          type: 'function_call',
          call_id: callId,
          name,
          arguments: JSON.stringify(part.functionCall.args || {}),
        });
      }
      if (part?.functionResponse?.name) {
        const name = part.functionResponse.name;
        const callId = pendingCallIds.get(name)?.shift();
        if (callId) {
          functionItems.push({
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify(part.functionResponse.response || {}),
          });
        }
      }
    }

    if (textParts.length) {
      input.push({
        role,
        content: role === 'assistant' ? textParts.join('\n') : [{ type: 'input_text', text: textParts.join('\n') }],
      });
    }
    input.push(...functionItems);
  }

  const tools = toOpenAiTools(payload?.tools);
  const callMode = payload?.toolConfig?.functionCallingConfig?.mode;
  const allowedNames = payload?.toolConfig?.functionCallingConfig?.allowedFunctionNames;
  let toolChoice: unknown = callMode === 'ANY' ? 'required' : callMode === 'NONE' ? 'none' : 'auto';
  if (Array.isArray(allowedNames) && allowedNames.length && callMode !== 'NONE') {
    toolChoice = {
      type: 'allowed_tools',
      mode: callMode === 'ANY' ? 'required' : 'auto',
      tools: allowedNames.map((name) => ({ type: 'function', name })),
    };
  }

  const instructions = (payload?.systemInstruction?.parts || [])
    .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n');

  return {
    model: 'gpt-6-luna',
    input,
    ...(instructions ? { instructions } : {}),
    ...(tools.length ? { tools, tool_choice: toolChoice } : {}),
    reasoning: { effort: 'low' },
    max_output_tokens: 2048,
  };
}

export function parseOpenAiAgentResponse(response: any) {
  const parts: Array<Record<string, unknown>> = [];
  for (const item of response?.output || []) {
    if (item?.type === 'message') {
      for (const content of item?.content || []) {
        if (content?.type === 'output_text' && typeof content.text === 'string') {
          parts.push({ text: content.text });
        }
      }
    } else if (item?.type === 'function_call' && typeof item.name === 'string') {
      let args: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(item.arguments || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) args = parsed;
      } catch {
        args = {};
      }
      parts.push({ functionCall: { name: item.name, args } });
    }
  }

  return {
    candidates: [
      {
        content: { role: 'model', parts },
        finishReason: parts.some((part) => 'functionCall' in part) ? 'TOOL_CALLS' : 'STOP',
      },
    ],
    usageMetadata: {
      promptTokenCount: Number(response?.usage?.input_tokens || 0),
      candidatesTokenCount: Number(response?.usage?.output_tokens || 0),
      totalTokenCount: Number(response?.usage?.total_tokens || 0),
    },
  };
}

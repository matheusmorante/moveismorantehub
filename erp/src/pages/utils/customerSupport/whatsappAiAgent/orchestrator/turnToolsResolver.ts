import { whatsappAgentToolDeclarations } from '../whatsappAiAgentTools.js';

export function resolveTurnTools(enabledTools?: string[]) {
  const allowedToolIds = new Set(enabledTools || []);
  const activeToolDeclarations = whatsappAgentToolDeclarations.filter((tool) =>
    allowedToolIds.has(tool.name)
  );

  return { activeToolDeclarations };
}

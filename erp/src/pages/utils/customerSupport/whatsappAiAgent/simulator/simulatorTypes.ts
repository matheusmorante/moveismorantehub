export interface SimulationToolCallRecord {
  name: string;
  args: Record<string, any>;
  result: any;
}

export interface SimulationTurnResult {
  executed: boolean;
  userQuery: string;
  situation: {
    key: string;
    name: string;
    action: string;
    priority: number;
  } | null;
  matchedKeywords: string[];
  articlesUsed: Array<{
    id: string;
    title: string;
    category: string;
    priority: number;
  }>;
  workflowApplied: string | null;
  toolsCalled: SimulationToolCallRecord[];
  mandatoryPhrasesEnforced: string[];
  aiResponseText: string;
  executionTimeMs: number;
  nativeCatalogProducts?: Array<{ retailerId: string; name: string }>;
}

export interface SimulationHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

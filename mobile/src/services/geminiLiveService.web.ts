export type Quota = { usedMs: number; remainingMs: number; limitMs: number; active: boolean; usageDate: string };
export type LiveState = 'connecting' | 'active' | 'paused' | 'muted' | 'ended';

export class GeminiLiveSession {
  constructor(_callbacks: {
    onState: (state: LiveState) => void;
    onTranscript: (role: 'user' | 'assistant', text: string) => void;
    onQuota: (quota: Quota) => void;
    onError: (error: Error) => void;
  }) {}
  async start(): Promise<void> { throw new Error('Gemini Live com áudio está disponível no aplicativo móvel.'); }
  async pause(): Promise<void> {}
  async resume(): Promise<void> { await this.start(); }
  async toggleMute(): Promise<void> {}
  async end(): Promise<void> {}
}

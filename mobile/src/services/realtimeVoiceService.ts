import { AppState } from 'react-native';
import { AudioContext, AudioManager, AudioRecorder } from 'react-native-audio-api';
import { mobileAgentTools } from './aiAgent/mobileToolDeclarations';
import { MobileToolDispatcher } from './aiAgent/mobileToolDispatcher';
import { MobileAgentService } from './aiAgent/mobileAgentService';
import { filterAgentToolsByPermission } from '../../../shared-utils/agentPermissionGuard';
import type { ExecutedToolRecord } from './aiAgent/mobileAgentTypes';
import { supabase } from './supabaseClient';
import { withTimeout } from '../../../shared-utils/withTimeout';

export type Quota = {
  usedMs: number;
  remainingMs: number;
  limitMs: number;
  active: boolean;
  usageDate: string;
};
export type LiveState = 'connecting' | 'active' | 'paused' | 'muted' | 'ended';
type ServerAction = 'status' | 'start' | 'pulse' | 'pause';
type VoiceHistoryItem =
  | { type: 'message'; role: 'user' | 'assistant'; text: string }
  | { type: 'function_call'; callId: string; name: string; arguments: string }
  | { type: 'function_call_output'; callId: string; output: string };
type RealtimeToolCall = { call_id: string; name: string; arguments: string };

async function quotaRequest(action: ServerAction, sessionId?: string, isCurrent = () => true) {
  const request = supabase.functions.invoke('gemini-live-token', { body: { action, sessionId } }).then(result => {
    if (action === 'start' && !isCurrent()) void quotaRequest('pause', sessionId).catch(() => undefined);
    return result;
  });
  const result = await withTimeout(request, 10_000, null, 'voz:cota-live');
  if (!result) throw new Error('A validação da cota de voz excedeu o prazo.');
  const { data, error } = result;
  if (error) throw new Error('Não foi possível validar a cota de voz.');
  if (data?.error) throw new Error(data.error);
  return data as { token?: string; model?: string; config?: Record<string, unknown>; quota: Quota };
}

const createId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

const toOpenAiSchema = (value: any): any => {
  if (Array.isArray(value)) return value.map(toOpenAiSchema);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    key === 'type' && typeof entry === 'string'
      ? entry.toLowerCase()
      : toOpenAiSchema(entry),
  ]));
};

const toRealtimeTools = (context?: any) =>
  filterAgentToolsByPermission(mobileAgentTools, context).flatMap((group) =>
    group.functionDeclarations.map((tool: any) => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: toOpenAiSchema(tool.parameters),
    }))
  );

export class OpenAiRealtimeVoiceSession {
  readonly id = createId();
  private socket: WebSocket | null = null;
  private recorder: AudioRecorder | null = null;
  private context: AudioContext | null = null;
  private outputQueue: any = null;
  private pulseTimer: ReturnType<typeof setInterval> | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private history: VoiceHistoryItem[] = [];
  private responseText = new Map<string, { text: string; audioTranscript: string }>();
  private pendingToolCalls = new Map<string, RealtimeToolCall[]>();
  private appSubscription: { remove: () => void } | null = null;
  private closed = false;
  private muted = false;
  private state: LiveState = 'connecting';
  private generation = 0;
  private ending: Promise<void> | null = null;
  // ponytail: replay receipts are scoped to this live session; durable idempotency remains in each backend tool.
  private toolReceipts = new Map<string, { signature: string; operation: ReturnType<typeof MobileToolDispatcher.execute>; publication: Promise<unknown> | null; recorded: boolean }>();
  private assertCurrent(generation: number) { if (this.closed || this.generation !== generation) throw new Error('A chamada foi encerrada ou substituída.'); }

  constructor(
    private callbacks: {
      onState: (state: LiveState) => void;
      onTranscript: (role: 'user' | 'assistant', text: string) => void;
      onQuota: (quota: Quota) => void;
      onError: (error: Error) => void;
      onToolExecuted?: (record: ExecutedToolRecord) => unknown | Promise<unknown>;
      permissionContext?: any;
    }
  ) {}

  private setState(state: LiveState) {
    this.state = state;
    this.callbacks.onState(state);
  }

  async start() {
    if (this.closed) throw new Error('A chamada já foi encerrada.');
    const generation = ++this.generation;
    const permission = await withTimeout(AudioManager.requestRecordingPermissions(), 15_000, null, 'voz:permissao-live');
    this.assertCurrent(generation);
    if (permission !== 'Granted') throw new Error('Permissão de microfone negada.');
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playAndRecord',
      iosMode: 'voiceChat',
      iosOptions: ['allowBluetoothHFP', 'defaultToSpeaker'],
    });
    await AudioManager.setAudioSessionActivity(true);
    this.assertCurrent(generation);
    this.context = new AudioContext({ sampleRate: 24000 });
    this.outputQueue = this.context.createBufferQueueSource();
    this.outputQueue.connect(this.context.destination);
    this.outputQueue.start();
    await this.openSocket(false, generation);
    this.assertCurrent(generation);
    this.appSubscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && !this.closed) void this.end();
    });
  }

  private async openSocket(resume: boolean, generation = ++this.generation) {
    this.assertCurrent(generation);
    this.setState('connecting');
    const session = await quotaRequest('start', this.id, () => !this.closed && this.generation === generation);
    this.assertCurrent(generation);
    if (!session.token || !session.model || !session.config)
      throw new Error('O servidor não retornou uma credencial Realtime válida.');
    this.callbacks.onQuota(session.quota);
    const socket = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(session.model)}`,
      ['realtime', `openai-insecure-api-key.${session.token}`]
    );
    this.socket = socket;
    await new Promise<void>((resolve, reject) => {
      const setupTimeout = setTimeout(() => {
        socket.close(1000, 'setup-timeout');
        reject(new Error('A sessão de voz OpenAI não concluiu a configuração.'));
      }, 15000);
      let setupComplete = false;
      socket.onopen = () => {
        if (this.closed || this.generation !== generation || this.socket !== socket) {
          clearTimeout(setupTimeout); socket.close(1000, 'stale'); reject(new Error('A chamada foi encerrada.')); return;
        }
      };
      socket.onerror = () => {
        if (setupComplete) return;
        clearTimeout(setupTimeout);
        reject(new Error('Falha ao conectar à sessão de voz OpenAI.'));
      };
      socket.onmessage = (event) => {
        if (this.closed || this.generation !== generation || this.socket !== socket) return;
        void this.handleMessage(String(event.data), generation, {
          session,
          resume,
          completeSetup: () => {
            if (setupComplete) return;
            setupComplete = true;
            clearTimeout(setupTimeout);
            resolve();
          },
        });
      };
      socket.onclose = () => {
        clearTimeout(setupTimeout);
        if (!setupComplete) {
          reject(new Error('Conexão OpenAI Realtime encerrada antes da configuração.'));
          return;
        }
        if (!this.closed && this.generation === generation && this.socket === socket && (this.state === 'active' || this.state === 'muted')) {
          const recorder = this.recorder;
          this.recorder = null;
          recorder?.clearOnAudioReady();
          void recorder?.stop();
          void this.openSocket(true).catch((error) => {
            if (this.closed) return;
            this.callbacks.onError(error instanceof Error ? error : new Error('Não foi possível retomar a sessão de voz.'));
            void this.pause();
          });
        }
      };
    });
    this.assertCurrent(generation);
    if (!this.muted) await this.startMicrophone(generation);
    this.assertCurrent(generation);
    this.startQuotaHeartbeat();
    this.armSilenceTimer();
    this.setState(this.muted ? 'muted' : 'active');
  }

  private send(event: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(event));
  }

  private async handleMessage(
    raw: string,
    generation: number,
    setup: { session: { config?: Record<string, unknown> }; resume: boolean; completeSetup: () => void }
  ) {
    if (this.closed || this.generation !== generation || this.state === 'paused') return;
    try {
      const event = JSON.parse(raw);
      if (event.type === 'error') {
        const message = String(event.error?.message || 'A sessão de voz retornou um erro.');
        if (event.error?.client_event_id) this.callbacks.onError(new Error(message));
        else this.callbacks.onError(new Error(message));
        return;
      }
      if (event.type === 'session.created') {
        const tools = toRealtimeTools(this.callbacks.permissionContext);
        const audio = setup.session.config?.audio || {};
        this.send({
          type: 'session.update',
          session: {
            type: 'realtime',
            instructions: MobileAgentService.buildSystemInstruction(undefined, this.callbacks.permissionContext),
            audio,
            tools,
            tool_choice: tools.length ? 'auto' : 'none',
          },
        });
        return;
      }
      if (event.type === 'session.updated') {
        if (setup.resume) this.replayHistory();
        setup.completeSetup();
        return;
      }
      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        const text = String(event.transcript || '').trim();
        if (text) {
          this.callbacks.onTranscript('user', text);
          this.history.push({ type: 'message', role: 'user', text });
          this.armSilenceTimer();
        }
        return;
      }
      if (event.type === 'response.output_audio.delta' && event.delta) {
        this.enqueueAudio(String(event.delta));
        this.armSilenceTimer();
        return;
      }
      if (event.type === 'response.output_audio_transcript.delta' || event.type === 'response.output_text.delta') {
        const responseId = String(event.response_id || 'active');
        const current = this.responseText.get(responseId) || { text: '', audioTranscript: '' };
        if (event.type === 'response.output_audio_transcript.delta') current.audioTranscript += String(event.delta || '');
        else current.text += String(event.delta || '');
        this.responseText.set(responseId, current);
        this.armSilenceTimer();
        return;
      }
      if (event.type === 'response.function_call_arguments.done') {
        const responseId = String(event.response_id || 'active');
        const calls = this.pendingToolCalls.get(responseId) || [];
        calls.push({ call_id: String(event.call_id || ''), name: String(event.name || ''), arguments: String(event.arguments || '{}') });
        this.pendingToolCalls.set(responseId, calls);
        return;
      }
      if (event.type === 'response.done') {
        const responseId = String(event.response?.id || 'active');
        const calls = this.pendingToolCalls.get(responseId) || [];
        if (calls.length) {
          this.pendingToolCalls.delete(responseId);
          for (const call of calls) {
            if (this.closed || this.generation !== generation) return;
            await this.executeTool(call, generation);
          }
          this.send({ type: 'response.create' });
          return;
        }
        const accumulated = this.responseText.get(responseId) || { text: '', audioTranscript: '' };
        const fallbackOutput = (event.response?.output || [])
          .filter((item: any) => item?.type === 'message')
          .flatMap((item: any) => item?.content || [])
          .map((item: any) => String(item?.transcript || item?.text || ''))
          .join('');
        const assistantText = (accumulated.audioTranscript || accumulated.text || fallbackOutput).trim();
        this.responseText.delete(responseId);
        if (assistantText) {
          this.callbacks.onTranscript('assistant', assistantText);
          this.history.push({ type: 'message', role: 'assistant', text: assistantText });
          this.armSilenceTimer();
        }
        return;
      }
      if (event.type === 'input_audio_buffer.speech_started') this.outputQueue?.clearBuffers();
    } catch (error) {
      if (!this.closed && this.generation === generation)
        this.callbacks.onError(error instanceof Error ? error : new Error('Resposta Realtime inválida.'));
    }
  }

  private replayHistory() {
    for (const item of this.history) {
      if (item.type === 'message') {
        this.send({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: item.role,
            content: [{ type: item.role === 'user' ? 'input_text' : 'output_text', text: item.text }],
          },
        });
      } else if (item.type === 'function_call') {
        this.send({ type: 'conversation.item.create', item: { type: 'function_call', call_id: item.callId, name: item.name, arguments: item.arguments } });
      } else {
        this.send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: item.callId, output: item.output } });
      }
    }
  }

  private async startMicrophone(generation: number) {
    this.assertCurrent(generation);
    const recorder = new AudioRecorder();
    this.recorder = recorder;
    recorder.onAudioReady(
      { sampleRate: 24000, bufferLength: 2400, channelCount: 1 },
      ({ buffer, numFrames }) => {
        if (this.closed || this.muted || this.socket?.readyState !== WebSocket.OPEN) return;
        const frames = buffer.getChannelData(0).subarray(0, numFrames);
        const pcm = new Int16Array(frames.length);
        let energy = 0;
        for (let i = 0; i < frames.length; i++) {
          const sample = Math.max(-1, Math.min(1, frames[i]));
          pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          energy += sample * sample;
        }
        if (Math.sqrt(energy / Math.max(1, frames.length)) > 0.012) this.armSilenceTimer();
        this.send({ type: 'input_audio_buffer.append', audio: bytesToBase64(new Uint8Array(pcm.buffer)) });
      }
    );
    const started = await recorder.start();
    this.assertCurrent(generation);
    if (started.status === 'error') throw new Error(started.message || 'Não foi possível iniciar o microfone.');
  }

  private enqueueAudio(base64: string) {
    const binary = atob(base64);
    const samples = new Float32Array(Math.floor(binary.length / 2));
    for (let i = 0; i < samples.length; i++) {
      const value = binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8);
      samples[i] = (value > 32767 ? value - 65536 : value) / 32768;
    }
    const buffer = this.context?.createBuffer(1, samples.length, 24000);
    if (!buffer) return;
    buffer.copyToChannel(samples, 0);
    this.outputQueue?.enqueueBuffer(buffer);
  }

  private async executeTool(call: RealtimeToolCall, generation: number) {
    this.assertCurrent(generation);
    let args: Record<string, any> = {};
    try { args = JSON.parse(call.arguments || '{}'); } catch { args = {}; }
    const signature = JSON.stringify([call.name, args]);
    const existing = call.call_id ? this.toolReceipts.get(call.call_id) : undefined;
    if (existing && existing.signature !== signature)
      throw new Error('A ferramenta repetiu sua identidade com outros dados. Confira a operação antes de continuar.');
    const receipt = existing || { signature, operation: MobileToolDispatcher.execute({ name: call.name, args }, this.callbacks.permissionContext), publication: null as Promise<unknown> | null, recorded: false };
    if (call.call_id) this.toolReceipts.set(call.call_id, receipt);
    const result = await receipt.operation;
    if (this.closed || this.generation !== generation) return;
    if (!receipt.publication) receipt.publication = Promise.resolve().then(() => this.callbacks.onToolExecuted?.(result.record));
    await receipt.publication;
    if (this.closed || this.generation !== generation) return;
    const output = JSON.stringify(result.record.result ?? {});
    if (!receipt.recorded) {
      receipt.recorded = true;
      this.history.push({ type: 'function_call', callId: call.call_id, name: call.name, arguments: JSON.stringify(args) });
      this.history.push({ type: 'function_call_output', callId: call.call_id, output });
    }
    this.send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: call.call_id, output } });
  }

  private startQuotaHeartbeat() {
    if (this.pulseTimer) clearInterval(this.pulseTimer);
    this.pulseTimer = setInterval(() => {
      if (this.closed || this.state === 'paused') return;
      void quotaRequest('pulse', this.id)
        .then((result) => {
          if (this.closed || this.state === 'paused') return;
          this.callbacks.onQuota(result.quota);
          if (result.quota.remainingMs <= 0 || !result.quota.active) void this.pause();
        })
        .catch((error) => {
          if (this.closed) return;
          this.callbacks.onError(error instanceof Error ? error : new Error('Falha ao atualizar a cota.'));
          void this.pause();
        });
    }, 8000);
  }

  private armSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => { void this.pause(); }, 15000);
  }

  async pause() {
    if (this.closed || this.state === 'paused') return;
    const generation = ++this.generation;
    this.stopTimers(); this.setState('paused');
    const recorder = this.recorder; this.recorder = null; recorder?.clearOnAudioReady();
    this.outputQueue?.pause();
    const socket = this.socket; this.socket = null; socket?.close(1000, 'paused');
    const [_, result] = await Promise.all([
      recorder ? withTimeout(recorder.stop().catch(() => undefined), 5000, undefined, 'voz:pausar-microfone') : Promise.resolve(),
      quotaRequest('pause', this.id).catch(() => null),
    ]);
    if (!this.closed && this.generation === generation) { if (result) this.callbacks.onQuota(result.quota); this.setState('paused'); }
  }

  async resume() {
    if (this.closed || this.state !== 'paused') return;
    const generation = ++this.generation;
    await this.context?.resume();
    this.assertCurrent(generation);
    this.outputQueue?.start();
    try {
      await this.openSocket(true, generation);
    } catch (error) {
      await quotaRequest('pause', this.id).catch(() => undefined);
      if (!this.closed && this.generation === generation) this.setState('paused');
      throw error;
    }
  }

  async toggleMute() {
    if (this.closed || this.state === 'paused') return;
    this.muted = !this.muted;
    if (this.muted) {
      this.recorder?.pause(); this.armSilenceTimer(); this.setState('muted');
    } else {
      this.recorder?.resume(); this.armSilenceTimer(); this.setState('active');
    }
  }

  private stopTimers() {
    if (this.pulseTimer) clearInterval(this.pulseTimer);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.pulseTimer = null; this.silenceTimer = null;
  }

  end(): Promise<void> {
    if (this.ending) return this.ending;
    this.closed = true; ++this.generation; this.stopTimers();
    this.appSubscription?.remove(); this.appSubscription = null;
    const recorder = this.recorder; this.recorder = null; recorder?.clearOnAudioReady();
    this.outputQueue?.stop(); this.outputQueue = null;
    const socket = this.socket; this.socket = null; socket?.close(1000, 'ended');
    const context = this.context; this.context = null;
    this.ending = Promise.allSettled([
      recorder ? withTimeout(recorder.stop(), 5000, undefined, 'voz:encerrar-microfone-live') : Promise.resolve(),
      context ? withTimeout(context.close(), 5000, undefined, 'voz:fechar-contexto-audio') : Promise.resolve(),
      withTimeout(AudioManager.setAudioSessionActivity(false), 5000, undefined, 'voz:desativar-audio'),
      quotaRequest('pause', this.id),
    ]).then(() => { this.setState('ended'); });
    return this.ending;
  }
}

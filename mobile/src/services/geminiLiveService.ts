import { AppState } from 'react-native';
import { AudioContext, AudioManager, AudioRecorder } from 'react-native-audio-api';
import { mobileAgentTools } from './aiAgent/mobileToolDeclarations';
import { MobileToolDispatcher } from './aiAgent/mobileToolDispatcher';
import type { GeminiContent, ExecutedToolRecord } from './aiAgent/mobileAgentTypes';
import { supabase } from './supabaseClient';
import { withTimeout } from '../../../shared-utils/withTimeout';

type Quota = {
  usedMs: number;
  remainingMs: number;
  limitMs: number;
  active: boolean;
  usageDate: string;
};
type ServerAction = 'status' | 'start' | 'pulse' | 'pause';
type LiveState = 'connecting' | 'active' | 'paused' | 'muted' | 'ended';

async function quotaRequest(action: ServerAction, sessionId?: string, isCurrent = () => true) {
  const request = supabase.functions.invoke('gemini-live-token', { body: { action, sessionId } }).then(result => {
    if (action === 'start' && !isCurrent()) void quotaRequest('pause', sessionId).catch(() => undefined);
    return result;
  });
  const result = await withTimeout(request, 10_000, null, 'voz:cota-live');
  if (!result) throw new Error('A validação da cota de voz excedeu o prazo.');
  const { data, error } = result;
  if (error) throw new Error('Não foi possível validar a cota do Gemini Live.');
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

export class GeminiLiveSession {
  readonly id = createId();
  private socket: WebSocket | null = null;
  private recorder: AudioRecorder | null = null;
  private context: AudioContext | null = null;
  private outputQueue: any = null;
  private pulseTimer: ReturnType<typeof setInterval> | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private resumptionHandle: string | null = null;
  private history: GeminiContent[] = [];
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
    const hasResumptionHandle = Boolean(this.resumptionHandle);
    this.setState('connecting');
    const session = await quotaRequest('start', this.id, () => !this.closed && this.generation === generation);
    this.assertCurrent(generation);
    if (!session.token || !session.model || !session.config)
      throw new Error('O servidor não retornou uma sessão Gemini Live.');
    this.callbacks.onQuota(session.quota);
    const socket = new WebSocket(
      `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(session.token)}`
    );
    this.socket = socket;
    await new Promise<void>((resolve, reject) => {
      const setupTimeout = setTimeout(() => {
        socket.close(1000, 'setup-timeout');
        reject(new Error('O Gemini Live não concluiu a configuração da sessão.'));
      }, 15000);
      let setupComplete = false;
      socket.onopen = () => {
        if (this.closed || this.generation !== generation || this.socket !== socket) { clearTimeout(setupTimeout); socket.close(1000, 'stale'); reject(new Error('A chamada foi encerrada.')); return; }
        try {
          socket.send(
            JSON.stringify({
              setup: {
                model: session.model,
                generationConfig: session.config,
                systemInstruction: {
                  parts: [
                    {
                      text: 'Você é Lizandro, assistente do Morante Hub. Responda em português do Brasil. Use as ferramentas para consultar ou operar o ERP; nunca invente dados ou IDs. Preserve o contexto da conversa.',
                    },
                  ],
                },
                tools: mobileAgentTools,
                sessionResumption: this.resumptionHandle ? { handle: this.resumptionHandle } : {},
                inputAudioTranscription: {},
                outputAudioTranscription: {},
              },
            })
          );
        } catch {
          clearTimeout(setupTimeout);
          reject(new Error('Não foi possível configurar a sessão Gemini Live.'));
        }
      };
      socket.onerror = () => {
        if (setupComplete) return;
        clearTimeout(setupTimeout);
        reject(new Error('Falha ao conectar ao Gemini Live.'));
      };
      socket.onmessage = (event) => {
        if (this.closed || this.generation !== generation || this.socket !== socket) return;
        const raw = String(event.data);
        try {
          if (JSON.parse(raw).setupComplete) {
            setupComplete = true;
            clearTimeout(setupTimeout);
            resolve();
            return;
          }
        } catch {
          // The normal handler reports malformed content after setup.
        }
        void this.handleMessage(raw, generation);
      };
      socket.onclose = () => {
        clearTimeout(setupTimeout);
        if (!setupComplete) {
          reject(new Error('Conexão Gemini Live encerrada antes da configuração.'));
          return;
        }
        if (!this.closed && this.generation === generation && this.socket === socket && (this.state === 'active' || this.state === 'muted')) {
          const recorder = this.recorder;
          this.recorder = null;
          recorder?.clearOnAudioReady();
          void recorder?.stop();
          void this.openSocket(true).catch((error) => {
            if (this.closed) return;
            this.callbacks.onError(
              error instanceof Error ? error : new Error('Não foi possível retomar a sessão Live.')
            );
            void this.pause();
          });
        }
      };
    });
    this.assertCurrent(generation);
    if (resume && !hasResumptionHandle && this.history.length) {
      socket.send(JSON.stringify({ clientContent: { turns: this.history, turnComplete: false } }));
    }
    if (!this.muted) await this.startMicrophone(generation);
    this.assertCurrent(generation);
    this.startQuotaHeartbeat();
    this.armSilenceTimer();
    this.setState(this.muted ? 'muted' : 'active');
  }

  private async startMicrophone(generation: number) {
    this.assertCurrent(generation);
    const recorder = new AudioRecorder();
    this.recorder = recorder;
    recorder.onAudioReady(
      { sampleRate: 16000, bufferLength: 1600, channelCount: 1 },
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
        this.socket?.send(
          JSON.stringify({
            realtimeInput: {
              audio: {
                data: bytesToBase64(new Uint8Array(pcm.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              },
            },
          })
        );
      }
    );
    const started = await recorder.start();
    this.assertCurrent(generation);
    if (started.status === 'error')
      throw new Error(started.message || 'Não foi possível iniciar o microfone.');
  }

  private async handleMessage(raw: string, generation: number) {
    if (this.closed || this.generation !== generation || this.state === 'paused') return;
    try {
      const data = JSON.parse(raw);
      if (data.setupComplete) return;
      if (data.sessionResumptionUpdate?.newHandle)
        this.resumptionHandle = data.sessionResumptionUpdate.newHandle;
      const userText = data.serverContent?.inputTranscription?.text;
      if (userText) {
        this.callbacks.onTranscript('user', userText);
        this.history.push({ role: 'user', parts: [{ text: userText }] });
        this.armSilenceTimer();
      }
      const modelContent = data.serverContent?.modelTurn;
      const historyParts = (modelContent?.parts || []).filter(
        (part: any) => part.text || part.functionCall
      );
      if (historyParts.length) this.history.push({ role: 'model', parts: historyParts });
      for (const part of modelContent?.parts || []) {
        if (this.closed || this.generation !== generation) return;
        if (part.text) this.callbacks.onTranscript('assistant', part.text);
        if (part.inlineData?.data) {
          this.enqueueAudio(part.inlineData.data);
          this.armSilenceTimer();
        }
        if (part.functionCall) await this.executeTool(part.functionCall, generation);
      }
      if (this.closed || this.generation !== generation) return;
      const outputText = data.serverContent?.outputTranscription?.text;
      if (outputText) {
        this.callbacks.onTranscript('assistant', outputText);
        if (!historyParts.some((part: any) => part.text === outputText))
          this.history.push({ role: 'model', parts: [{ text: outputText }] });
      }
      if (data.serverContent?.interrupted) this.outputQueue?.clearBuffers();
    } catch (error) {
      if (!this.closed && this.generation === generation) this.callbacks.onError(error instanceof Error ? error : new Error('Resposta Live inválida.'));
    }
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

  private async executeTool(call: { id?: string; name: string; args: Record<string, any> }, generation: number) {
    this.assertCurrent(generation);
    const signature = JSON.stringify([call.name, call.args || {}]);
    const existing = call.id ? this.toolReceipts.get(call.id) : undefined;
    if (existing && existing.signature !== signature) throw new Error('A ferramenta repetiu sua identidade com outros dados. Confira a operação antes de continuar.');
    const receipt = existing || { signature, operation: MobileToolDispatcher.execute({ name: call.name, args: call.args || {} }), publication: null as Promise<unknown> | null, recorded: false };
    if (call.id) this.toolReceipts.set(call.id, receipt);
    const result = await receipt.operation;
    if (this.closed || this.generation !== generation) return;
    if (!receipt.publication) receipt.publication = Promise.resolve().then(() => this.callbacks.onToolExecuted?.(result.record));
    await receipt.publication;
    if (this.closed || this.generation !== generation) return;
    const response = { output: result.record.result };
    if (!receipt.recorded) { receipt.recorded = true; this.history.push({ role: 'user', parts: [{ functionResponse: result.functionResponse }] }); }
    this.socket?.send(
      JSON.stringify({
        toolResponse: { functionResponses: [{ id: call.id, name: call.name, response }] },
      })
    );
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
          this.callbacks.onError(
            error instanceof Error ? error : new Error('Falha ao atualizar a cota.')
          );
          void this.pause();
        });
    }, 8000);
  }

  private armSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      void this.pause();
    }, 15000);
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
      this.recorder?.pause();
      this.armSilenceTimer();
      this.setState('muted');
    } else {
      this.recorder?.resume();
      this.armSilenceTimer();
      this.setState('active');
    }
  }

  private stopTimers() {
    if (this.pulseTimer) clearInterval(this.pulseTimer);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.pulseTimer = null;
    this.silenceTimer = null;
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

export type { LiveState, Quota };

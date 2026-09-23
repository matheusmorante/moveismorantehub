import { AppState } from 'react-native';
import { AudioContext, AudioManager, AudioRecorder } from 'react-native-audio-api';
import { mobileAgentTools } from './aiAgent/mobileToolDeclarations';
import { MobileToolDispatcher } from './aiAgent/mobileToolDispatcher';
import type { GeminiContent } from './aiAgent/mobileAgentTypes';
import { supabase } from './supabaseClient';

type Quota = { usedMs: number; remainingMs: number; limitMs: number; active: boolean; usageDate: string };
type ServerAction = 'status' | 'start' | 'pulse' | 'pause';
type LiveState = 'connecting' | 'active' | 'paused' | 'muted' | 'ended';

async function quotaRequest(action: ServerAction, sessionId?: string) {
  const { data, error } = await supabase.functions.invoke('gemini-live-token', { body: { action, sessionId } });
  if (error) throw new Error('Não foi possível validar a cota do Gemini Live.');
  if (data?.error) throw new Error(data.error);
  return data as { token?: string; model?: string; config?: Record<string, unknown>; quota: Quota };
}

const createId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
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

  constructor(private callbacks: {
    onState: (state: LiveState) => void;
    onTranscript: (role: 'user' | 'assistant', text: string) => void;
    onQuota: (quota: Quota) => void;
    onError: (error: Error) => void;
  }) {}

  private setState(state: LiveState) { this.state = state; this.callbacks.onState(state); }

  async start() {
    const permission = await AudioManager.requestRecordingPermissions();
    if (permission !== 'Granted') throw new Error('Permissão de microfone negada.');
    AudioManager.setAudioSessionOptions({ iosCategory: 'playAndRecord', iosMode: 'voiceChat', iosOptions: ['allowBluetoothHFP', 'defaultToSpeaker'] });
    await AudioManager.setAudioSessionActivity(true);
    this.context = new AudioContext({ sampleRate: 24000 });
    this.outputQueue = this.context.createBufferQueueSource();
    this.outputQueue.connect(this.context.destination);
    this.outputQueue.start();
    await this.openSocket(false);
    this.appSubscription = AppState.addEventListener('change', state => {
      if (state !== 'active' && !this.closed) void this.end();
    });
  }

  private async openSocket(resume: boolean) {
    const hasResumptionHandle = Boolean(this.resumptionHandle);
    this.setState('connecting');
    const session = await quotaRequest('start', this.id);
    if (!session.token || !session.model || !session.config) throw new Error('O servidor não retornou uma sessão Gemini Live.');
    this.callbacks.onQuota(session.quota);
    const socket = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(session.token)}`);
    this.socket = socket;
    await new Promise<void>((resolve, reject) => {
      const setupTimeout = setTimeout(() => {
        socket.close(1000, 'setup-timeout');
        reject(new Error('O Gemini Live não concluiu a configuração da sessão.'));
      }, 15000);
      let setupComplete = false;
      socket.onopen = () => {
        try {
          socket.send(JSON.stringify({ setup: {
            model: session.model,
            generationConfig: session.config,
            systemInstruction: { parts: [{ text: 'Você é Lizandro, assistente do Morante Hub. Responda em português do Brasil. Use as ferramentas para consultar ou operar o ERP; nunca invente dados ou IDs. Preserve o contexto da conversa.' }] },
            tools: mobileAgentTools,
            sessionResumption: this.resumptionHandle ? { handle: this.resumptionHandle } : {},
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          } }));
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
      socket.onmessage = event => {
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
        void this.handleMessage(raw);
      };
      socket.onclose = () => {
        clearTimeout(setupTimeout);
        if (!setupComplete) {
          reject(new Error('Conexão Gemini Live encerrada antes da configuração.'));
          return;
        }
        if (!this.closed && (this.state === 'active' || this.state === 'muted')) {
          const recorder = this.recorder;
          this.recorder = null;
          recorder?.clearOnAudioReady();
          void recorder?.stop();
          void this.openSocket(true).catch(error => {
            this.callbacks.onError(error instanceof Error ? error : new Error('Não foi possível retomar a sessão Live.'));
            void this.pause();
          });
        }
      };
    });
    if (resume && !hasResumptionHandle && this.history.length) {
      socket.send(JSON.stringify({ clientContent: { turns: this.history, turnComplete: false } }));
    }
    if (!this.muted) await this.startMicrophone();
    this.startQuotaHeartbeat();
    this.armSilenceTimer();
    this.setState(this.muted ? 'muted' : 'active');
  }

  private async startMicrophone() {
    const recorder = new AudioRecorder();
    this.recorder = recorder;
    recorder.onAudioReady({ sampleRate: 16000, bufferLength: 1600, channelCount: 1 }, ({ buffer, numFrames }) => {
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
      this.socket?.send(JSON.stringify({ realtimeInput: { audio: { data: bytesToBase64(new Uint8Array(pcm.buffer)), mimeType: 'audio/pcm;rate=16000' } } }));
    });
    const started = await recorder.start();
    if (started.status === 'error') throw new Error(started.message || 'Não foi possível iniciar o microfone.');
  }

  private async handleMessage(raw: string) {
    try {
      const data = JSON.parse(raw);
      if (data.setupComplete) return;
      if (data.sessionResumptionUpdate?.newHandle) this.resumptionHandle = data.sessionResumptionUpdate.newHandle;
      const userText = data.serverContent?.inputTranscription?.text;
      if (userText) {
        this.callbacks.onTranscript('user', userText);
        this.history.push({ role: 'user', parts: [{ text: userText }] });
        this.armSilenceTimer();
      }
      const modelContent = data.serverContent?.modelTurn;
      const historyParts = (modelContent?.parts || []).filter((part: any) => part.text || part.functionCall);
      if (historyParts.length) this.history.push({ role: 'model', parts: historyParts });
      for (const part of modelContent?.parts || []) {
        if (part.text) this.callbacks.onTranscript('assistant', part.text);
        if (part.inlineData?.data) { this.enqueueAudio(part.inlineData.data); this.armSilenceTimer(); }
        if (part.functionCall) await this.executeTool(part.functionCall);
      }
      const outputText = data.serverContent?.outputTranscription?.text;
      if (outputText) {
        this.callbacks.onTranscript('assistant', outputText);
        if (!historyParts.some((part: any) => part.text === outputText)) this.history.push({ role: 'model', parts: [{ text: outputText }] });
      }
      if (data.serverContent?.interrupted) this.outputQueue?.clearBuffers();
    } catch (error) { this.callbacks.onError(error instanceof Error ? error : new Error('Resposta Live inválida.')); }
  }

  private enqueueAudio(base64: string) {
    const binary = atob(base64);
    const samples = new Float32Array(Math.floor(binary.length / 2));
    for (let i = 0; i < samples.length; i++) {
      const value = (binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8));
      samples[i] = (value > 32767 ? value - 65536 : value) / 32768;
    }
    const buffer = this.context?.createBuffer(1, samples.length, 24000);
    if (!buffer) return;
    buffer.copyToChannel(samples, 0);
    this.outputQueue?.enqueueBuffer(buffer);
  }

  private async executeTool(call: { id?: string; name: string; args: Record<string, any> }) {
    const result = await MobileToolDispatcher.execute({ name: call.name, args: call.args || {} });
    const response = { output: result.record.result };
    this.history.push({ role: 'user', parts: [{ functionResponse: result.functionResponse }] });
    this.socket?.send(JSON.stringify({ toolResponse: { functionResponses: [{ id: call.id, name: call.name, response }] } }));
  }

  private startQuotaHeartbeat() {
    if (this.pulseTimer) clearInterval(this.pulseTimer);
    this.pulseTimer = setInterval(() => {
      void quotaRequest('pulse', this.id).then(result => {
        this.callbacks.onQuota(result.quota);
        if (result.quota.remainingMs <= 0 || !result.quota.active) void this.pause();
      }).catch(error => {
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
    this.stopTimers();
    this.setState('paused');
    this.recorder?.clearOnAudioReady();
    await this.recorder?.stop().catch(() => undefined);
    this.recorder = null;
    this.outputQueue?.pause();
    this.socket?.close(1000, 'paused');
    this.socket = null;
    const result = await quotaRequest('pause', this.id).catch(() => null);
    if (result) this.callbacks.onQuota(result.quota);
    this.setState('paused');
  }

  async resume() {
    if (this.closed || this.state !== 'paused') return;
    await this.context?.resume();
    this.outputQueue?.start();
    try {
      await this.openSocket(true);
    } catch (error) {
      await quotaRequest('pause', this.id).catch(() => undefined);
      this.setState('paused');
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

  async end() {
    if (this.closed) return;
    this.closed = true;
    this.stopTimers();
    this.appSubscription?.remove();
    this.appSubscription = null;
    this.recorder?.clearOnAudioReady();
    await this.recorder?.stop().catch(() => undefined);
    this.recorder = null;
    this.outputQueue?.stop();
    this.outputQueue = null;
    this.socket?.close(1000, 'ended');
    this.socket = null;
    await quotaRequest('pause', this.id).catch(() => undefined);
    await this.context?.close().catch(() => undefined);
    this.context = null;
    await AudioManager.setAudioSessionActivity(false).catch(() => undefined);
    this.setState('ended');
  }
}

export type { LiveState, Quota };

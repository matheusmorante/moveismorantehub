type ConnectivityListener = (isOnline: boolean) => void;

interface NetInfoLikeState {
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
}

const isTestEnv = (): boolean =>
  typeof process !== 'undefined' &&
  Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');

class ConnectivityService {
  private isOnline = true;
  private listeners = new Set<ConnectivityListener>();
  private webListenersBound = false;

  async initialize(): Promise<void> {
    if (typeof window === 'undefined' && isTestEnv()) {
      return;
    }
    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function' &&
      !this.webListenersBound
    ) {
      this.webListenersBound = true;
      if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
        this.isOnline = navigator.onLine;
      }
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.listeners.forEach((listener) => listener(true));
      });
      window.addEventListener('offline', () => {
        this.apply({ isConnected: false, isInternetReachable: false });
      });
    }
    try {
      const mod = require('@react-native-community/netinfo');
      const NetInfo = mod.default || mod;
      if (NetInfo && typeof NetInfo.fetch === 'function') {
        this.apply(await NetInfo.fetch());
        NetInfo.addEventListener((state: NetInfoLikeState) => this.apply(state));
      }
    } catch {
      // Fallback para ambiente web/node sem módulo nativo
    }
  }

  subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    listener(this.isOnline);
    return () => this.listeners.delete(listener);
  }

  get connected(): boolean {
    return this.isOnline;
  }

  set connected(val: boolean) {
    this.isOnline = Boolean(val);
  }

  private apply(state: NetInfoLikeState): void {
    const next = state.isConnected === true && state.isInternetReachable !== false;
    if (next === this.isOnline) return;
    this.isOnline = next;
    this.listeners.forEach((listener) => listener(next));
  }
}

export const connectivityService = new ConnectivityService();

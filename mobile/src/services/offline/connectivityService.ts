import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type ConnectivityListener = (isOnline: boolean) => void;

class ConnectivityService {
  private isOnline = true;
  private listeners = new Set<ConnectivityListener>();

  async initialize(): Promise<void> {
    this.apply(await NetInfo.fetch());
    NetInfo.addEventListener((state) => this.apply(state));
  }

  subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener); listener(this.isOnline);
    return () => this.listeners.delete(listener);
  }

  get connected(): boolean { return this.isOnline; }

  private apply(state: NetInfoState): void {
    const next = state.isConnected === true && state.isInternetReachable !== false;
    if (next === this.isOnline) return;
    this.isOnline = next;
    this.listeners.forEach((listener) => listener(next));
  }
}

export const connectivityService = new ConnectivityService();

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, RefreshCw } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  isDarkMode?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error | null;
}

export class MapErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MapErrorBoundary] Erro capturado no componente de Mapa:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const isDarkMode = this.props.isDarkMode;
      return (
        <View style={[styles.container, isDarkMode && styles.containerDark]}>
          <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <MapPin size={36} color="#e11d48" style={{ marginBottom: 12 }} />
            <Text style={[styles.title, isDarkMode && styles.textLight]}>
              Não foi possível carregar o Mapa
            </Text>
            <Text style={[styles.subtitle, isDarkMode && styles.textMuted]}>
              O serviço de mapas nativo encontrou uma oscilação. O restante do aplicativo continua funcionando normalmente.
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={this.handleRetry}
              activeOpacity={0.85}
            >
              <RefreshCw size={16} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.retryBtnText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardDark: {
    backgroundColor: '#1e293b',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});

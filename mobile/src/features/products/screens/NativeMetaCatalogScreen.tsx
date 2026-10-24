import { ArrowLeft, Package, RefreshCw, Tags, EyeOff } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import type { MetaCatalogStats } from '../../../../../shared-utils/metaCatalogStats';
import { fetchMobileMetaCatalogStats } from '../services/mobileMetaCatalogStatsService';

interface NativeMetaCatalogScreenProps {
  dark: boolean;
  onBack: () => void;
  onOpenErpPanel: () => void;
}

export function NativeMetaCatalogScreen({
  dark,
  onBack,
  onOpenErpPanel,
}: NativeMetaCatalogScreenProps) {
  const [stats, setStats] = useState<MetaCatalogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  const loadStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const nextStats = await fetchMobileMetaCatalogStats();
      if (mountedRef.current) setStats(nextStats);
    } catch (loadError) {
      if (mountedRef.current) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Não foi possível carregar o resumo do Catálogo Meta.'
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadStats();
    return () => {
      mountedRef.current = false;
    };
  }, [loadStats]);

  const surfaceStyle = dark ? styles.surfaceDark : styles.surface;
  const textStyle = dark ? styles.textDark : styles.text;
  const mutedStyle = dark ? styles.mutedDark : styles.muted;

  return (
    <View style={[styles.container, dark && styles.containerDark]} testID="meta-catalog-screen">
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar ao módulo Produtos"
          style={[styles.backButton, dark && styles.backButtonDark]}
        >
          <ArrowLeft size={19} color={dark ? '#e2e8f0' : '#334155'} />
          <Text style={[styles.backText, textStyle]}>Produtos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void loadStats(true)}
          accessibilityRole="button"
          accessibilityLabel="Atualizar resumo do Catálogo Meta"
          disabled={refreshing || loading}
          style={[styles.refreshButton, dark && styles.refreshButtonDark]}
        >
          <RefreshCw size={17} color={dark ? '#bfdbfe' : '#2563eb'} />
          <Text style={[styles.refreshText, dark && styles.refreshTextDark]}>Atualizar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadStats(true)}
            tintColor={dark ? '#93c5fd' : '#2563eb'}
          />
        }
      >
        <View style={styles.titleBlock}>
          <Text style={[styles.title, textStyle]}>Catálogo Meta</Text>
          <Text style={[styles.subtitle, mutedStyle]}>
            Resumo de produtos e variações publicados no catálogo.
          </Text>
        </View>

        {loading && !stats && (
          <View style={[styles.loadingPanel, surfaceStyle]} accessibilityRole="progressbar">
            <ActivityIndicator size="small" color={dark ? '#93c5fd' : '#2563eb'} />
            <Text style={[styles.muted, mutedStyle]}>Carregando estatísticas...</Text>
          </View>
        )}

        {error && (
          <View style={[styles.errorPanel, dark && styles.errorPanelDark]} accessibilityRole="alert">
            <Text style={[styles.errorText, dark && styles.errorTextDark]}>{error}</Text>
            <TouchableOpacity
              onPress={() => void loadStats()}
              accessibilityRole="button"
              style={[styles.retryButton, dark && styles.retryButtonDark]}
            >
              <Text style={[styles.retryText, dark && styles.retryTextDark]}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsGrid}>
          <StatCard
            dark={dark}
            surfaceStyle={surfaceStyle}
            label="Produtos Simples"
            description="publicados"
            value={stats?.publishedSimple}
            color="#059669"
            Icon={Package}
          />
          <StatCard
            dark={dark}
            surfaceStyle={surfaceStyle}
            label="Variações (Filhos)"
            description="publicados"
            value={stats?.publishedVariations}
            color="#2563eb"
            Icon={Tags}
          />
          <StatCard
            dark={dark}
            surfaceStyle={surfaceStyle}
            label="Não Publicados"
            description="inativos/ocultos"
            value={stats?.notPublished}
            color="#d97706"
            Icon={EyeOff}
          />
        </View>

        <TouchableOpacity
          onPress={onOpenErpPanel}
          accessibilityRole="button"
          style={[styles.erpButton, dark && styles.erpButtonDark]}
        >
          <Text style={styles.erpButtonText}>Abrir painel completo no ERP</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

interface StatCardProps {
  dark: boolean;
  surfaceStyle: StyleProp<ViewStyle>;
  label: string;
  description: string;
  value?: number;
  color: string;
  Icon: typeof Package;
}

function StatCard({ dark, surfaceStyle, label, description, value, color, Icon }: StatCardProps) {
  return (
    <View style={[styles.statCard, surfaceStyle]}>
      <View style={[styles.iconBox, { backgroundColor: dark ? `${color}26` : `${color}14` }]}>
        <Icon size={19} color={color} />
      </View>
      <View style={styles.statCopy}>
        <Text style={[styles.statLabel, dark && styles.textDark]}>{label}</Text>
        <View style={styles.statValueRow}>
          <Text style={[styles.statValue, dark && styles.textDark]}>{value ?? '...'}</Text>
          <Text style={[styles.statDescription, { color }]}>{description}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#020617' },
  header: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  backButtonDark: {},
  backText: { fontSize: 14, fontWeight: '700' },
  refreshButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  refreshButtonDark: { backgroundColor: '#1e293b' },
  refreshText: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  refreshTextDark: { color: '#bfdbfe' },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28, gap: 16 },
  titleBlock: { gap: 5, paddingVertical: 8 },
  title: { fontSize: 23, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { fontSize: 12, lineHeight: 18 },
  loadingPanel: {
    minHeight: 54,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  surface: { backgroundColor: '#ffffff', borderColor: '#e2e8f0' },
  surfaceDark: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  text: { color: '#0f172a' },
  textDark: { color: '#f1f5f9' },
  mutedDark: { color: '#94a3b8' },
  muted: { color: '#64748b', fontSize: 12 },
  errorPanel: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    gap: 10,
  },
  errorPanelDark: { borderColor: '#7f1d1d', backgroundColor: '#450a0a' },
  errorText: { color: '#b91c1c', fontSize: 12, lineHeight: 18 },
  errorTextDark: { color: '#fecaca' },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
  },
  retryButtonDark: { backgroundColor: '#7f1d1d' },
  retryText: { color: '#991b1b', fontSize: 12, fontWeight: '800' },
  retryTextDark: { color: '#fff' },
  statsGrid: { gap: 10 },
  statCard: {
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCopy: { flex: 1, gap: 4 },
  statLabel: { color: '#334155', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  statValue: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  statDescription: { fontSize: 10, fontWeight: '800' },
  erpButton: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  erpButtonDark: { backgroundColor: '#1d4ed8' },
  erpButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
});

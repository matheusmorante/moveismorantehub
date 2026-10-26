import { ArrowLeft, EyeOff, Package, Tags, UploadCloud } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { syncMobileMetaCatalog } from '../services/mobileMetaCatalogSyncService';

interface NativeMetaCatalogScreenProps {
  dark: boolean;
  isAdmin: boolean;
  onBack: () => void;
  onOpenErpPanel: () => void;
}

export function NativeMetaCatalogScreen({
  dark,
  isAdmin,
  onBack,
  onOpenErpPanel,
}: NativeMetaCatalogScreenProps) {
  const [stats, setStats] = useState<MetaCatalogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ processed: 0, total: 0 });
  const [syncError, setSyncError] = useState<string | null>(null);
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

  const syncCatalog = useCallback(async () => {
    if (!isAdmin) {
      Alert.alert(
        'Acesso restrito',
        'Apenas administradores podem iniciar a sincronização via Graph API.'
      );
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ processed: 0, total: 0 });
    setSyncError(null);

    const result = await syncMobileMetaCatalog(isAdmin, (processed, total) => {
      if (mountedRef.current) setSyncProgress({ processed, total });
    });

    if (!mountedRef.current) return;
    setIsSyncing(false);

    if (!result.success) {
      const message = result.error || 'Erro ao sincronizar com a Meta Graph API.';
      setSyncError(message);
      Alert.alert(
        'Falha na sincronização',
        `${message}\n\nA resposta pode não confirmar se o último lote foi aplicado. Confira o catálogo da Meta antes de repetir.`
      );
      return;
    }

    setSyncError(null);
    Alert.alert(
      'Solicitações enviadas',
      result.count > 0
        ? `${result.count} itens foram enviados para processamento pela Meta. O status final pode levar algum tempo.`
        : 'Nenhum item elegível foi encontrado para sincronização.'
    );
    void loadStats(true);
  }, [isAdmin, loadStats]);

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

        <View style={[styles.syncPanel, surfaceStyle]}>
          <View style={styles.syncHeader}>
            <View style={styles.syncCopy}>
              <Text style={[styles.syncTitle, textStyle]}>Sincronização manual via Graph API</Text>
              <Text style={[styles.muted, mutedStyle]}>
                Envia produtos e variações elegíveis para o catálogo da Meta.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => void syncCatalog()}
              accessibilityRole="button"
              accessibilityState={{ disabled: isSyncing || !isAdmin }}
              disabled={isSyncing || !isAdmin}
              style={[styles.syncButton, (!isAdmin || isSyncing) && styles.syncButtonDisabled]}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <UploadCloud size={17} color="#ffffff" />
              )}
              <Text style={styles.syncButtonText}>
                {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
              </Text>
            </TouchableOpacity>
          </View>
          {!isAdmin && (
            <Text style={[styles.muted, mutedStyle]}>
              Apenas administradores podem iniciar esta ação.
            </Text>
          )}
          {isSyncing && (
            <View style={styles.progressBlock} accessibilityRole="progressbar">
              <Text style={[styles.progressLabel, textStyle]}>
                {syncProgress.total > 0
                  ? `${syncProgress.processed} de ${syncProgress.total} itens enviados`
                  : 'Consultando produtos e variações...'}
              </Text>
              <View style={[styles.progressTrack, dark && styles.progressTrackDark]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${syncProgress.total > 0 ? Math.round((syncProgress.processed / syncProgress.total) * 100) : 0}%`,
                    },
                  ]}
                />
              </View>
              {syncProgress.total > 0 && (
                <Text style={[styles.progressPercent, mutedStyle]}>
                  {Math.round((syncProgress.processed / syncProgress.total) * 100)}%
                </Text>
              )}
            </View>
          )}
          {syncError && !isSyncing && (
            <Text style={[styles.syncError, dark && styles.errorTextDark]} accessibilityRole="alert">
              {syncError}
              {!syncError.includes('Confira o catálogo') &&
                ' Confira o catálogo da Meta antes de tentar novamente.'}
              {syncProgress.total > 0 &&
                ` Último progresso informado: ${syncProgress.processed} de ${syncProgress.total} itens enviados.`}
            </Text>
          )}
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

        <View style={[styles.legacyFeedNotice, dark && styles.legacyFeedNoticeDark]}>
          <Text style={[styles.legacyFeedTitle, dark && styles.legacyFeedTitleDark]}>
            Feed CSV legado
          </Text>
          <Text style={[styles.legacyFeedText, dark && styles.legacyFeedTextDark]}>
            Não cadastre o feed CSV como fonte de sincronização. Use a Graph API acima. Para
            confirmar publicação ou remoção, confira o item diretamente no Catálogo Meta pelo
            retailer_id ou SKU; o status do ERP e o CSV não comprovam o resultado externo.
          </Text>
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
  syncPanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  syncHeader: { gap: 12 },
  syncCopy: { gap: 5 },
  syncTitle: { fontSize: 14, fontWeight: '900' },
  syncButton: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  syncButtonDisabled: { backgroundColor: '#64748b' },
  syncButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  progressBlock: { gap: 7 },
  progressLabel: { fontSize: 11, fontWeight: '800' },
  progressTrack: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 20, overflow: 'hidden' },
  progressTrackDark: { backgroundColor: '#334155' },
  progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 20 },
  progressPercent: { fontSize: 10, textAlign: 'right' },
  syncError: { color: '#b91c1c', fontSize: 11, lineHeight: 17 },
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
  legacyFeedNotice: {
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  legacyFeedNoticeDark: { borderColor: '#78350f', backgroundColor: '#451a03' },
  legacyFeedTitle: { color: '#92400e', fontSize: 12, fontWeight: '900' },
  legacyFeedTitleDark: { color: '#fde68a' },
  legacyFeedText: { color: '#78350f', fontSize: 12, lineHeight: 18 },
  legacyFeedTextDark: { color: '#fcd34d' },
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

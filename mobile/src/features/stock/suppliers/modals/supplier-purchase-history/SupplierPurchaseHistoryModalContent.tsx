import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useAuth } from '../../../../../contexts/AuthContext';
import * as stockService from '../../../../../services/stockService';

export interface SupplierPurchaseHistoryModalProps {
  visible: boolean;
  supplier: any;
  isDarkMode: boolean;
  onClose: () => void;
}

export const SupplierPurchaseHistoryModalContent: React.FC<SupplierPurchaseHistoryModalProps> = ({
  visible,
  supplier,
  isDarkMode,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalSpent, setTotalSpent] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const requestGenerationRef = useRef(0);
  const activeRequestsRef = useRef(new Map<string, { controller: AbortController }>());
  const loadedContextRef = useRef<string | null>(null);
  const loadedPageRef = useRef(-1);
  const contextKey = JSON.stringify([
    userProfile?.id ?? null,
    supplier?.id ?? null,
    supplier?.name || supplier?.full_name || '',
    supplier?.phone || '',
    supplier?.email || '',
  ]);
  const currentContextKeyRef = useRef(contextKey);
  const previousContextKeyRef = useRef(contextKey);
  const visibleRef = useRef(visible);
  currentContextKeyRef.current = contextKey;
  visibleRef.current = visible;

  const cancelActiveRequests = useCallback(() => {
    requestGenerationRef.current += 1;
    activeRequestsRef.current.forEach(({ controller }) => controller.abort());
    activeRequestsRef.current.clear();
  }, []);

  const colors = isDarkMode
    ? { bg: '#0f172a', surface: '#1e293b', border: '#334155', text: '#f8fafc', muted: '#94a3b8' }
    : { bg: '#f8fafc', surface: '#fff', border: '#e2e8f0', text: '#0f172a', muted: '#64748b' };

  const load = useCallback(
    async (nextPage = 0) => {
      if (!visible || !supplier?.id) return;

      const requestKey = `${contextKey}:page:${nextPage}`;
      if (activeRequestsRef.current.has(requestKey)) return;
      if (nextPage > 0 && (
        loadedContextRef.current !== contextKey ||
        loadedPageRef.current !== nextPage - 1 ||
        activeRequestsRef.current.has(`${contextKey}:page:0`)
      )) return;

      const generation = requestGenerationRef.current;
      const controller = new AbortController();
      activeRequestsRef.current.set(requestKey, { controller });
      const isCurrent = () => (
        !controller.signal.aborted &&
        requestGenerationRef.current === generation &&
        currentContextKeyRef.current === contextKey &&
        visibleRef.current
      );

      if (nextPage === 0) {
        setLoading(true);
        setLoadingMore(false);
      } else setLoadingMore(true);
      setError(false);
      try {
        const result = await stockService.fetchSupplierPurchaseHistory(
          {
            name: supplier?.name || supplier?.full_name || '',
            phone: supplier?.phone,
            email: supplier?.email,
          },
          nextPage,
          controller.signal
        );
        if (!isCurrent()) return;
        loadedContextRef.current = contextKey;
        loadedPageRef.current = nextPage;
        setItems((current) => (nextPage === 0 ? result.data : [...current, ...result.data]));
        setTotal(result.count);
        if (nextPage === 0) setTotalSpent(result.totalSpent ?? null);
        setPage(nextPage);
      } catch (e) {
        if (!isCurrent()) return;
        console.error('Erro ao carregar histórico de compras do fornecedor:', e);
        setError(true);
      } finally {
        if (activeRequestsRef.current.get(requestKey)?.controller === controller) {
          activeRequestsRef.current.delete(requestKey);
          if (isCurrent()) {
            setLoading(false);
            setLoadingMore(false);
          }
        }
      }
    },
    [
      visible,
      supplier?.id,
      supplier?.name,
      supplier?.full_name,
      supplier?.phone,
      supplier?.email,
      contextKey,
    ]
  );

  const refreshHistory = useCallback(() => {
    cancelActiveRequests();
    loadedContextRef.current = null;
    loadedPageRef.current = -1;
    void load(0);
  }, [cancelActiveRequests, load]);

  useEffect(() => {
    cancelActiveRequests();
    const contextChanged = previousContextKeyRef.current !== contextKey;
    previousContextKeyRef.current = contextKey;
    if (contextChanged) {
      loadedContextRef.current = null;
      loadedPageRef.current = -1;
      setItems([]);
      setTotal(0);
      setTotalSpent(null);
      setPage(0);
      setError(false);
    }
    setLoading(false);
    setLoadingMore(false);

    if (visible && supplier?.id) void load(0);

    return () => {
      cancelActiveRequests();
    };
  }, [visible, supplier?.id, contextKey, load, cancelActiveRequests]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: colors.bg },
          { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View
          style={[
            styles.header,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Histórico de Pedidos</Text>
            <Text numberOfLines={1} style={[styles.subtitle, { color: colors.muted }]}>
              {supplier?.name || supplier?.full_name || 'Fornecedor'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Fechar histórico"
          >
            <X size={22} color={colors.muted} />
          </TouchableOpacity>
        </View>
        <View
          style={[
            styles.summary,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <View>
            <Text style={{ color: colors.muted, fontSize: 9, fontWeight: '800' }}>
              TOTAL DE PEDIDOS
            </Text>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 3 }}>
              {total}
            </Text>
          </View>
          <View>
            <Text style={{ color: colors.muted, fontSize: 9, fontWeight: '800' }}>
              VALOR TOTAL GASTO
            </Text>
            <Text style={{ color: '#2563eb', fontSize: 14, fontWeight: '900', marginTop: 3 }}>
              {totalSpent === null
                ? '—'
                : totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
        </View>
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 14, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={loading && items.length > 0}
              onRefresh={refreshHistory}
              tintColor="#2563eb"
            />
          }
          onEndReached={() => {
            if (!loading && !loadingMore && items.length < total) void load(page + 1);
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            loading ? (
              <View style={styles.state}>
                <ActivityIndicator color="#2563eb" size="large" />
                <Text style={{ color: colors.muted, marginTop: 10 }}>Carregando histórico...</Text>
              </View>
            ) : (
              <View style={styles.state}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  {error
                    ? 'Não foi possível carregar o histórico.'
                    : 'Nenhum pedido encontrado para este fornecedor.'}
                </Text>
                {error ? (
                  <TouchableOpacity
                    onPress={refreshHistory}
                    style={styles.retry}
                  >
                    <Text style={styles.retryText}>Tentar novamente</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.purchase,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.purchaseHeading}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>
                    Pedido #{String(item.id).slice(-6).toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.typeBadge,
                      {
                        color: item.order_type === 'assistance' ? '#c2410c' : '#2563eb',
                        backgroundColor: item.order_type === 'assistance' ? '#ffedd5' : '#dbeafe',
                      },
                    ]}
                  >
                    {item.order_type === 'assistance'
                      ? 'ASSISTÊNCIA'
                      : item.delivery_method === 'pickup'
                      ? 'RETIRADA'
                      : 'ENTREGA'}
                  </Text>
                </View>
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 5 }}>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString('pt-BR')
                    : 'Data não informada'}{' '}
                  · {String(item.status || 'Sem status').toUpperCase()}
                </Text>
                <Text
                  numberOfLines={2}
                  style={{ color: colors.muted, fontSize: 11, fontStyle: 'italic', marginTop: 4 }}
                >
                  {(item.order_items || [])
                    .map((orderItem: any) => orderItem.description)
                    .filter(Boolean)
                    .join(', ') || 'Itens não informados'}
                </Text>
              </View>
              <Text style={{ color: '#2563eb', fontSize: 13, fontWeight: '900' }}>
                {Number(item.payments_total ?? item.total_amount ?? 0).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </Text>
            </View>
          )}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color="#2563eb" style={{ padding: 15 }} /> : null
          }
        />
        <View
          style={[
            styles.footer,
            { borderTopColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <TouchableOpacity style={styles.done} onPress={onClose}>
            <Text style={styles.doneText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 17,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '900' },
  subtitle: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  summary: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  state: { flex: 1, minHeight: 180, justifyContent: 'center', alignItems: 'center', padding: 22 },
  purchase: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 14,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  purchaseHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  typeBadge: {
    overflow: 'hidden',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 8,
    fontWeight: '900',
  },
  retry: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryText: { color: '#fff', fontWeight: '800' },
  footer: { padding: 13, borderTopWidth: 1 },
  done: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 11,
  },
  doneText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});

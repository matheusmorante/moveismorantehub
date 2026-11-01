import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Check, Eye, MoreVertical, Pencil, Play, Plus, RotateCcw, Trash2, X } from 'lucide-react-native';
import { formatPurchaseNumber } from '../../../../../../../shared-utils/purchaseNumber';
import { useAuth } from '../../../../../contexts/AuthContext';
import { usePurchases } from '../../hooks/usePurchases';
import {
  cancelMobilePurchase,
  deleteCancelledMobilePurchase,
  discardMobilePurchaseDraft,
  MobilePurchase,
  PurchaseStatus,
  purchaseStatusLabel,
  updateMobilePurchase,
} from '../../mobilePurchaseService';
import { PurchaseFormModal } from '../../modals/PurchaseFormModal';
import { PurchaseDetailsModal } from '../../modals/PurchaseDetailsModal';
import { PurchaseConfirmationModal } from '../../modals/PurchaseConfirmationModal';
import { styles } from './purchasesScreen.styles';
import { PurchaseCard } from './PurchaseCard';
import { PurchasesListStates } from './PurchasesListStates';
import { PurchasesScreenHeader } from './PurchasesScreenHeader';
import { PurchaseSupplierFilterModal } from './PurchaseSupplierFilterModal';

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: (rightAction?: React.ReactNode) => React.ReactElement;
}

type PurchaseConfirmation = {
  action: 'cancel' | 'delete' | 'discardDraft';
  purchase: MobilePurchase;
} | null;

export const PurchasesScreen: React.FC<Props> = ({ isDarkMode, renderHeader }) => {
  const { canUsePermission } = useAuth();
  const { width } = useWindowDimensions();
  const menuAnchor = useRef<View>(null);
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [supplierName, setSupplierName] = useState('Todos os fornecedores');
  const [supplierModal, setSupplierModal] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selected, setSelected] = useState<MobilePurchase | null>(null);
  const [purchaseConfirmation, setPurchaseConfirmation] = useState<PurchaseConfirmation>(null);
  const [purchaseMenuPurchase, setPurchaseMenuPurchase] = useState<MobilePurchase | null>(null);
  const [statusMenuPurchase, setStatusMenuPurchase] = useState<MobilePurchase | null>(null);
  const [isConfirmingPurchaseAction, setIsConfirmingPurchaseAction] = useState(false);
  const [purchaseConfirmationError, setPurchaseConfirmationError] = useState('');
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [headerMenuPosition, setHeaderMenuPosition] = useState({ top: 0, right: 16 });

  const { purchases, loading, loadingMore, error, hasMore, loadMore, reload } = usePurchases({
    supplierId,
    search,
  });
  const canDeleteCancelled = canUsePermission('deleteStockPurchases', ['manager', 'stockist']);
  const canDiscardDrafts = canDeleteCancelled;
  const canEditPurchase = (purchase: MobilePurchase) =>
    ['pending', 'ordered'].includes(purchase.status) && !purchase.stockProcessed;

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    surface: isDarkMode ? '#1e293b' : '#fff',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    text: isDarkMode ? '#f8fafc' : '#0f172a',
    muted: isDarkMode ? '#94a3b8' : '#64748b',
  };

  const openHeaderMenu = () => {
    menuAnchor.current?.measureInWindow((x, y, anchorWidth, height) => {
      setHeaderMenuPosition({ top: y + height + 4, right: Math.max(8, width - x - anchorWidth) });
      setIsHeaderMenuOpen(true);
    });
  };

  const handleStatusChange = async (
    status: PurchaseStatus,
    target: MobilePurchase | null = selected
  ) => {
    if (!target || status === 'draft') return;
    if (status === 'pending' && target.status !== 'ordered') return;
    if (status === 'cancelled') {
      setPurchaseConfirmationError('');
      setPurchaseConfirmation({ action: 'cancel', purchase: target });
      return;
    }
    try {
      await updateMobilePurchase(target.id, { status });
      setDetailsVisible(false);
      setSelected(null);
      await reload();
    } catch (cause: any) {
      Alert.alert('Não foi possível alterar o status', cause?.message || 'Tente novamente.');
    }
  };

  const closePurchaseConfirmation = () => {
    if (isConfirmingPurchaseAction) return;
    setPurchaseConfirmation(null);
    setPurchaseConfirmationError('');
  };

  const confirmPurchaseAction = async () => {
    const confirmation = purchaseConfirmation;
    if (
      !confirmation ||
      isConfirmingPurchaseAction ||
      (confirmation.action === 'delete' &&
        (confirmation.purchase.status !== 'cancelled' || !canDeleteCancelled)) ||
      (confirmation.action === 'discardDraft' &&
        (confirmation.purchase.status !== 'draft' || !canDiscardDrafts)) ||
      (confirmation.action === 'cancel' && confirmation.purchase.status === 'cancelled')
    ) return;
    setIsConfirmingPurchaseAction(true);
    setPurchaseConfirmationError('');
    try {
      if (confirmation.action === 'discardDraft') {
        await discardMobilePurchaseDraft(confirmation.purchase);
      } else if (confirmation.action === 'delete') {
        await deleteCancelledMobilePurchase(confirmation.purchase);
      } else {
        await cancelMobilePurchase(confirmation.purchase);
      }
      setPurchaseConfirmation(null);
      setDetailsVisible(false);
      setSelected((current) => current?.id === confirmation.purchase.id ? null : current);
      void reload();
    } catch (cause: any) {
      const fallback = confirmation.action === 'discardDraft'
        ? 'Não foi possível descartar o rascunho. Tente novamente.'
        : confirmation.action === 'delete'
          ? 'Não foi possível apagar o pedido. Tente novamente.'
          : 'Não foi possível cancelar o pedido. Tente novamente.';
      setPurchaseConfirmationError(cause?.message || fallback);
    } finally {
      setIsConfirmingPurchaseAction(false);
    }
  };

  const handlePurchaseMenuAction = (
    action: 'resume' | 'discardDraft' | 'edit' | 'returnPending' | 'details' | 'delete'
  ) => {
    const purchase = purchaseMenuPurchase;
    if (!purchase) return;
    setPurchaseMenuPurchase(null);

    if (action === 'resume' && purchase.status === 'draft') {
      setSelected(purchase);
      setDetailsVisible(false);
      setFormVisible(true);
    } else if (action === 'discardDraft' && purchase.status === 'draft' && canDiscardDrafts) {
      setPurchaseConfirmationError('');
      setPurchaseConfirmation({ action: 'discardDraft', purchase });
    } else if (action === 'edit' && canEditPurchase(purchase)) {
      setSelected(purchase);
      setDetailsVisible(false);
      setFormVisible(true);
    } else if (action === 'returnPending' && purchase.status === 'ordered') {
      void handleStatusChange('pending', purchase);
    } else if (action === 'details') {
      setSelected(purchase);
      setDetailsVisible(true);
    } else if (action === 'delete' && purchase.status === 'cancelled' && canDeleteCancelled) {
      setPurchaseConfirmationError('');
      setPurchaseConfirmation({ action: 'delete', purchase });
    }
  };

  const openPurchaseMenu = (purchase: MobilePurchase) => setPurchaseMenuPurchase(purchase);

  const openStatusMenu = (purchase: MobilePurchase) => {
    if (purchase.status === 'draft') return;
    setStatusMenuPurchase(purchase);
  };

  const statusOptions: readonly PurchaseStatus[] = statusMenuPurchase?.status === 'pending'
    ? ['pending', 'ordered', 'fulfilled', 'cancelled']
    : ['ordered', 'fulfilled', 'cancelled'];

  const selectPurchaseStatus = (status: PurchaseStatus) => {
    const target = statusMenuPurchase;
    setStatusMenuPurchase(null);
    if (!target || target.status === status) return;
    void handleStatusChange(status, target);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={purchases}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {renderHeader(
              <View ref={menuAnchor} collapsable={false}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Mais ações de pedidos de compra"
                  accessibilityState={{ expanded: isHeaderMenuOpen }}
                  hitSlop={8}
                  style={styles.headerMenuButton}
                  onPress={openHeaderMenu}
                >
                  <MoreVertical size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
            )}
            <PurchasesScreenHeader
              colors={colors}
              search={search}
              onSearchChange={setSearch}
              supplierId={supplierId}
              supplierName={supplierName}
              onOpenSupplierModal={() => setSupplierModal(true)}
              onClearSupplier={() => {
                setSupplierId(undefined);
                setSupplierName('Todos os fornecedores');
              }}
            />
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={loading && purchases.length > 0}
            onRefresh={() => void reload()}
            tintColor="#2563eb"
          />
        }
        contentContainerStyle={styles.listContent}
        onEndReached={() => {
          if (hasMore) loadMore();
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <PurchasesListStates
            loading={loading}
            error={error}
            hasFilter={Boolean(supplierId || search)}
            colors={colors}
            isDarkMode={isDarkMode}
            onRetry={() => void reload()}
          />
        }
        renderItem={({ item }) => (
          <PurchaseCard
            item={item}
            colors={colors}
            onPress={() => {
              setSelected(item);
              if (item.status === 'draft') {
                setDetailsVisible(false);
                setFormVisible(true);
              } else {
                setDetailsVisible(true);
              }
            }}
            onOpenMenu={() => openPurchaseMenu(item)}
            onOpenStatusMenu={() => openStatusMenu(item)}
          />
        )}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} />
          ) : null
        }
      />
      <Modal
        visible={isHeaderMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsHeaderMenuOpen(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsHeaderMenuOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Fechar menu de pedidos de compra"
          />
          <View
            style={[styles.headerMenu, isDarkMode && styles.headerMenuDark, headerMenuPosition]}
          >
            <TouchableOpacity
              style={styles.headerMenuItem}
              onPress={() => {
                setIsHeaderMenuOpen(false);
                setSelected(null);
                setFormVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Novo pedido"
            >
              <Plus size={17} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
              <Text style={[styles.headerMenuText, isDarkMode && styles.headerMenuTextDark]}>
                Novo pedido
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={Boolean(purchaseMenuPurchase)}
        transparent
        animationType="fade"
        onRequestClose={() => setPurchaseMenuPurchase(null)}
      >
        <View style={styles.purchaseMenuOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPurchaseMenuPurchase(null)}
            accessibilityRole="button"
            accessibilityLabel="Fechar opções do pedido"
          />
          <View style={[styles.purchaseMenuCard, isDarkMode && styles.headerMenuDark]}>
            <View style={styles.purchaseMenuHeader}>
              <Text style={[styles.purchaseMenuTitle, { color: colors.text }]}>
                Pedido #{formatPurchaseNumber(purchaseMenuPurchase?.purchaseNumber) || purchaseMenuPurchase?.id.slice(0, 8).toUpperCase()}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Fechar opções do pedido"
                onPress={() => setPurchaseMenuPurchase(null)}
                style={styles.purchaseMenuClose}
              >
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            {purchaseMenuPurchase?.status === 'draft' ? (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Retomar cadastramento"
                  onPress={() => handlePurchaseMenuAction('resume')}
                  style={styles.purchaseMenuOption}
                >
                  <Play size={17} color="#2563eb" />
                  <Text style={[styles.purchaseMenuOptionText, { color: colors.text }]}>Retomar cadastramento</Text>
                </TouchableOpacity>
                {canDiscardDrafts ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Descartar rascunho"
                    onPress={() => handlePurchaseMenuAction('discardDraft')}
                    style={styles.purchaseMenuOption}
                  >
                    <Trash2 size={17} color="#dc2626" />
                    <Text style={[styles.purchaseMenuOptionText, { color: '#dc2626' }]}>Descartar rascunho</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}
            {purchaseMenuPurchase && canEditPurchase(purchaseMenuPurchase) ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Editar pedido"
                onPress={() => handlePurchaseMenuAction('edit')}
                style={styles.purchaseMenuOption}
              >
                <Pencil size={17} color={colors.muted} />
                <Text style={[styles.purchaseMenuOptionText, { color: colors.text }]}>Editar pedido</Text>
              </TouchableOpacity>
            ) : null}
            {purchaseMenuPurchase?.status === 'ordered' ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Voltar para Pendente"
                onPress={() => handlePurchaseMenuAction('returnPending')}
                style={styles.purchaseMenuOption}
              >
                <RotateCcw size={17} color={colors.muted} />
                <Text style={[styles.purchaseMenuOptionText, { color: colors.text }]}>Voltar para Pendente</Text>
              </TouchableOpacity>
            ) : null}
            {purchaseMenuPurchase?.status !== 'draft' ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Ver detalhes"
                onPress={() => handlePurchaseMenuAction('details')}
                style={styles.purchaseMenuOption}
              >
                <Eye size={17} color={colors.muted} />
                <Text style={[styles.purchaseMenuOptionText, { color: colors.text }]}>Ver detalhes</Text>
              </TouchableOpacity>
            ) : null}
            {purchaseMenuPurchase?.status === 'cancelled' && canDeleteCancelled ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Apagar pedido"
                onPress={() => handlePurchaseMenuAction('delete')}
                style={styles.purchaseMenuOption}
              >
                <Trash2 size={17} color="#dc2626" />
                <Text style={[styles.purchaseMenuOptionText, { color: '#dc2626' }]}>Apagar pedido</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
      <Modal
        visible={Boolean(statusMenuPurchase)}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusMenuPurchase(null)}
      >
        <View style={styles.statusMenuOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setStatusMenuPurchase(null)}
            accessibilityRole="button"
            accessibilityLabel="Fechar opções de status"
          />
          <View style={[styles.statusMenuCard, isDarkMode && styles.headerMenuDark]}>
            <Text style={[styles.statusMenuTitle, isDarkMode && styles.headerMenuTextDark]}>
              Alterar status
            </Text>
            {statusMenuPurchase ? (
              <Text style={[styles.statusMenuSubtitle, { color: colors.muted }]}>
                Pedido #{formatPurchaseNumber(statusMenuPurchase.purchaseNumber) || statusMenuPurchase.id.slice(0, 8).toUpperCase()}
              </Text>
            ) : null}
            {statusOptions.map((status) => {
              const isCurrent = statusMenuPurchase?.status === status;
              return (
                <TouchableOpacity
                  key={status}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isCurrent, disabled: isCurrent }}
                  disabled={isCurrent}
                  onPress={() => selectPurchaseStatus(status)}
                  style={[
                    styles.statusMenuOption,
                    { borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.statusMenuOptionText, { color: colors.text }]}>
                    {purchaseStatusLabel(status)}
                  </Text>
                  {isCurrent ? <Check size={17} color="#2563eb" /> : null}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setStatusMenuPurchase(null)}
              style={styles.statusMenuClose}
            >
              <Text style={[styles.statusMenuCloseText, { color: colors.muted }]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <PurchaseFormModal
        visible={formVisible}
        isDarkMode={isDarkMode}
        purchase={selected}
        onClose={() => setFormVisible(false)}
        onSaved={() => void reload()}
      />
      <PurchaseDetailsModal
        visible={detailsVisible}
        isDarkMode={isDarkMode}
        purchase={selected}
        onClose={() => setDetailsVisible(false)}
        onEdit={() => {
          if (!selected || !canEditPurchase(selected)) return;
          setDetailsVisible(false);
          setFormVisible(true);
        }}
        onStatusChange={(status) => void handleStatusChange(status)}
      />
      <PurchaseSupplierFilterModal
        visible={supplierModal}
        colors={colors}
        onClose={() => setSupplierModal(false)}
        onSelectSupplier={(supplier) => {
          setSupplierId(supplier.id);
          setSupplierName(supplier.name);
          setSupplierModal(false);
        }}
      />
      <PurchaseConfirmationModal
        visible={Boolean(purchaseConfirmation)}
        isDarkMode={isDarkMode}
        title={purchaseConfirmation?.action === 'discardDraft'
          ? 'Descartar rascunho?'
          : purchaseConfirmation?.action === 'delete'
            ? 'Apagar pedido?'
            : 'Cancelar pedido?'}
        eyebrow={purchaseConfirmation?.action !== 'cancel' ? 'Ação permanente' : 'Confirme a ação'}
        description={purchaseConfirmation?.action === 'discardDraft'
          ? 'O pedido em rascunho será apagado.'
          : purchaseConfirmation?.action === 'delete'
            ? 'O pedido cancelado será removido. Os recebimentos já registrados serão mantidos, mas deixarão de ficar vinculados a ele.'
            : 'O pedido será marcado como cancelado. Se o estoque já foi processado, os movimentos vinculados serão estornados antes do cancelamento.'}
        orderReference={purchaseConfirmation
          ? `#${formatPurchaseNumber(purchaseConfirmation.purchase.purchaseNumber) || purchaseConfirmation.purchase.id.slice(0, 8).toUpperCase()}`
          : ''}
        confirmLabel={purchaseConfirmation?.action === 'discardDraft'
          ? 'Descartar rascunho'
          : purchaseConfirmation?.action === 'delete'
            ? 'Apagar pedido'
            : 'Cancelar pedido'}
        loadingLabel={purchaseConfirmation?.action === 'discardDraft'
          ? 'Descartando...'
          : purchaseConfirmation?.action === 'delete'
            ? 'Apagando...'
            : 'Cancelando...'}
        tone={purchaseConfirmation?.action !== 'cancel' ? 'danger' : 'warning'}
        isLoading={isConfirmingPurchaseAction}
        errorMessage={purchaseConfirmationError}
        onCancel={closePurchaseConfirmation}
        onConfirm={() => void confirmPurchaseAction()}
      />
    </View>
  );
};
